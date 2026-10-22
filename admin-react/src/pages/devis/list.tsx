import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Checkbox, Input, Select, Tabs, Tooltip } from "antd";
import { CheckCircleFilled, FileTextOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useList, type CrudFilter } from "@refinedev/core";
import dayjs from "dayjs";
import { supabaseClient } from "../../supabaseClient";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, PageHeader, Panel, StatusTag } from "../../components/ui";
import { cleanSearch, dateFR, eur } from "../../lib/format";
import { DEVIS_STATUTS, ENTITES, label, options } from "../../lib/statuts";
import { useDebounced, useUrlState } from "../../lib/hooks";

export interface Devis {
  id: string;
  created_at: string;
  numero: string | null;
  entity: string;
  client_id: string | null;
  client_nom: string | null;
  client_email: string | null;
  client_adresse: string | null;
  date_devis: string;
  validite_jours: number;
  lignes: any[];
  tva_taux: number;
  total_ht: number;
  total_ttc: number;
  statut: string;
  notes: string | null;
  conditions: string | null;
  public_token: string;
  signed_at: string | null;
  signature_nom: string | null;
  envoye_at: string | null;
  derniere_relance_le: string | null;
  lead_id: string | null;
}

export const finValidite = (d: Pick<Devis, "date_devis" | "validite_jours">) => dayjs(d.date_devis).add(d.validite_jours ?? 30, "day");

const KEYS = ["q", "statut", "entite", "relance", "facture", "page", "tri", "ordre"] as const;
const PAGE = 20;

export function DevisList() {
  const navigate = useNavigate();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const dq = useDebounced(q, 300);
  const page = Number(f.page) || 1;
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [factures, setFactures] = useState<string[] | null>(null);

  useEffect(() => {
    if (dq !== f.q) setF({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  // Devis déjà facturés (pour le filtre « acceptés non facturés »).
  useEffect(() => {
    if (f.facture !== "aucune") return;
    supabaseClient.from("factures").select("devis_id").not("devis_id", "is", null).neq("status", "annulee").then(({ data }) =>
      setFactures((data ?? []).map((r: { devis_id: string }) => r.devis_id)));
  }, [f.facture]);

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [];
    if (f.statut) out.push({ field: "statut", operator: "eq", value: f.statut });
    if (f.entite) out.push({ field: "entity", operator: "eq", value: f.entite });
    if (f.relance === "due") {
      const x = dayjs().subtract(7, "day").format("YYYY-MM-DD");
      out.push({ field: "statut", operator: "eq", value: "envoye" });
      out.push({ field: "signed_at", operator: "null", value: null });
      out.push({ field: "created_at", operator: "lte", value: x });
      out.push({ operator: "or", value: [{ field: "envoye_at", operator: "null", value: null }, { field: "envoye_at", operator: "lte", value: x }] });
      out.push({ operator: "or", value: [{ field: "derniere_relance_le", operator: "null", value: null }, { field: "derniere_relance_le", operator: "lte", value: x }] });
    }
    if (f.facture === "aucune" && factures?.length) out.push({ field: "id", operator: "nin", value: factures });
    const t = cleanSearch(f.q);
    if (t) out.push({ operator: "or", value: [{ field: "numero", operator: "contains", value: t }, { field: "client_nom", operator: "contains", value: t }] });
    return out;
  }, [f.statut, f.entite, f.relance, f.facture, f.q, factures]);

  const { data, isLoading, isError, error, refetch } = useList<Devis>({
    resource: "devis",
    filters,
    sorters: [{ field: f.tri || "created_at", order: (f.ordre as "asc" | "desc") || "desc" }],
    pagination: { current: page, pageSize: PAGE, mode: "server" },
    queryOptions: { keepPreviousData: true, enabled: f.facture !== "aucune" || factures !== null },
  });
  const rows = data?.data ?? [];

  useEffect(() => {
    supabaseClient.from("devis").select("statut").limit(5000).then(({ data: d }) => {
      const c: Record<string, number> = { "": 0 };
      (d ?? []).forEach((r: { statut: string }) => { c[""]++; c[r.statut] = (c[r.statut] ?? 0) + 1; });
      setCounts(c);
    });
  }, [data]);

  const filtres = !!(f.q || f.entite || f.relance || f.facture);
  const reset = () => { setQ(""); setF({ q: null, entite: null, relance: null, facture: null, statut: null }); };

  return (
    <>
      <PageHeader
        title="Devis"
        subtitle="Préparez, envoyez et faites signer vos propositions en ligne."
        crumbs={[{ label: "Commercial" }, { label: "Devis" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/devis/nouveau")}>Nouveau devis</Button>}
      />
      <Panel flush>
        <div className="list-tabs">
          <Tabs activeKey={f.statut || "_"} onChange={(k) => setF({ statut: k === "_" ? null : k })}
            items={[{ key: "_", label: <span>Tous<span className="tab-count">{counts[""] ?? 0}</span></span> },
              ...DEVIS_STATUTS.map((s) => ({ key: s.value, label: <span>{s.label}<span className="tab-count">{counts[s.value] ?? 0}</span></span> }))]} />
        </div>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#667085" }} />} placeholder="N° de devis ou client…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un devis" />
          <Select allowClear placeholder="Activité" aria-label="Filtrer : activité" value={f.entite || undefined} onChange={(v) => setF({ entite: v })} options={options(ENTITES)} />
          <Checkbox checked={f.relance === "due"} onChange={(e) => setF({ relance: e.target.checked ? "due" : null })}>À relancer</Checkbox>
          <Checkbox checked={f.facture === "aucune"} onChange={(e) => setF({ facture: e.target.checked ? "aucune" : null, statut: e.target.checked ? "accepte" : null })}>Acceptés non facturés</Checkbox>
          {filtres && <Button type="link" onClick={reset}>Réinitialiser</Button>}
        </div>
        <DataList<Devis>
          rows={rows}
          loading={isLoading}
          error={isError ? error ?? true : undefined}
          onRetry={() => void refetch()}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE}
          onPage={(p) => setF({ page: String(p) })}
          onSort={(s) => setF({ tri: s.field ?? null, ordre: s.order ?? null })}
          onRowClick={(r) => navigate(`/devis/${r.id}`)}
          empty={filtres || f.statut ? (
            <EmptyState icon={<SearchOutlined />} title="Aucun devis ne correspond" description="Modifiez les filtres ou l'onglet sélectionné." action={<Button onClick={reset}>Réinitialiser les filtres</Button>} />
          ) : (
            <EmptyState icon={<FileTextOutlined />} title="Vous n'avez encore aucun devis"
              description="Créez votre premier devis : choisissez un client, ajoutez vos prestations, le total se calcule tout seul."
              action={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/devis/nouveau")}>Créer un devis</Button>} />
          )}
          columns={[
            { title: "N°", dataIndex: "numero", sorter: true, render: (v: string) => <span className="cell-main tabular">{v || "—"}</span> },
            { title: "Client", dataIndex: "client_nom", sorter: true, render: (v: string, r: Devis) => <div><div className="cell-main">{v || "—"}</div><div className="cell-sub">{label("entite", r.entity)}</div></div> },
            { title: "Date", dataIndex: "date_devis", sorter: true, render: (v: string) => dateFR(v) },
            {
              title: "Valable jusqu'au", dataIndex: "validite_jours",
              render: (_: unknown, r: Devis) => {
                const fin = finValidite(r);
                const depasse = fin.isBefore(dayjs(), "day") && ["brouillon", "envoye"].includes(r.statut);
                return <span style={{ color: depasse ? "var(--danger)" : undefined }}>{fin.format("DD/MM/YYYY")}{depasse ? " · dépassée" : ""}</span>;
              },
            },
            { title: "Montant", dataIndex: "total_ttc", sorter: true, align: "right" as const, render: (v: number) => <b className="tabular">{eur(v)}</b> },
            {
              title: "Statut", dataIndex: "statut",
              render: (v: string, r: Devis) => <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><StatusTag kind="devis" value={v} />
                {r.signed_at && <Tooltip title={`Signé en ligne par ${r.signature_nom ?? "le client"} le ${dateFR(r.signed_at)}`}><CheckCircleFilled style={{ color: "var(--success)" }} /></Tooltip>}</span>,
            },
          ]}
          mobileRender={(r) => (
            <>
              <div className="m-row"><span className="m-title">{r.numero} · {r.client_nom}</span><StatusTag kind="devis" value={r.statut} /></div>
              <div className="m-row"><span className="m-sub">{dateFR(r.date_devis)}</span><b className="tabular">{eur(r.total_ttc)}</b></div>
            </>
          )}
        />
      </Panel>
    </>
  );
}
