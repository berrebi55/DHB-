import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Select, Tabs } from "antd";
import { FileDoneOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useList, type CrudFilter } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, PageHeader, Panel, StatusTag } from "../../components/ui";
import { cleanSearch, dateFR, eur } from "../../lib/format";
import { ENTITES, label, options } from "../../lib/statuts";
import { useDebounced, useUrlState } from "../../lib/hooks";

export interface FactureVue {
  id: string;
  created_at: string;
  numero: string | null;
  entity: string;
  date_facture: string;
  date_echeance: string | null;
  client_id: string | null;
  client_nom: string | null;
  client_email: string | null;
  client_adresse: string | null;
  libelle: string | null;
  quantite: number | null;
  prix_unitaire: number | null;
  lignes: any[] | null;
  tva_taux: number;
  total_ht: number;
  total_ttc: number;
  status: string;
  notes: string | null;
  conditions: string | null;
  paid_at: string | null;
  devis_id: string | null;
  abonnement_id: string | null;
  derniere_relance_le: string | null;
  echeance_effective: string;
  montant_paye: number;
  reste_a_payer: number;
  en_retard: boolean;
}

export function EtatFacture({ f }: { f: Pick<FactureVue, "status" | "en_retard"> }) {
  if (f.en_retard) return <span className="st tone-danger">En retard</span>;
  return <StatusTag kind="facture" value={f.status} />;
}

const KEYS = ["q", "statut", "etat", "entite", "page", "tri", "ordre"] as const;
const PAGE = 20;
const ONGLETS = [
  { key: "", label: "Toutes" },
  { key: "brouillon", label: "Brouillons" },
  { key: "envoyee", label: "À encaisser" },
  { key: "en_retard", label: "En retard" },
  { key: "payee", label: "Payées" },
  { key: "annulee", label: "Annulées" },
];

export function FacturesList() {
  const navigate = useNavigate();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const dq = useDebounced(q, 300);
  const page = Number(f.page) || 1;
  const onglet = f.etat === "en_retard" ? "en_retard" : f.statut;
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (dq !== f.q) setF({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [];
    if (onglet === "en_retard") out.push({ field: "en_retard", operator: "eq", value: true });
    else if (onglet) out.push({ field: "status", operator: "eq", value: onglet });
    if (f.entite) out.push({ field: "entity", operator: "eq", value: f.entite });
    const t = cleanSearch(f.q);
    if (t) out.push({ operator: "or", value: [{ field: "numero", operator: "contains", value: t }, { field: "client_nom", operator: "contains", value: t }] });
    return out;
  }, [onglet, f.entite, f.q]);

  const { data, isLoading } = useList<FactureVue>({
    resource: "factures_vue",
    filters,
    sorters: [{ field: f.tri || "date_facture", order: (f.ordre as "asc" | "desc") || "desc" }, { field: "numero", order: "desc" }],
    pagination: { current: page, pageSize: PAGE, mode: "server" },
  });
  const rows = data?.data ?? [];

  useEffect(() => {
    supabaseClient.from("factures_vue").select("status, en_retard").limit(5000).then(({ data: d }) => {
      const c: Record<string, number> = { "": 0, en_retard: 0 };
      (d ?? []).forEach((r: { status: string; en_retard: boolean }) => { c[""]++; c[r.status] = (c[r.status] ?? 0) + 1; if (r.en_retard) c.en_retard++; });
      setCounts(c);
    });
  }, [data]);

  const filtres = !!(f.q || f.entite);
  const reset = () => { setQ(""); setF({ q: null, entite: null, statut: null, etat: null }); };

  return (
    <>
      <PageHeader
        title="Factures"
        subtitle="Émission, envoi, encaissement et relances."
        crumbs={[{ label: "Facturation" }, { label: "Factures" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/factures/nouvelle")}>Nouvelle facture</Button>}
      />
      <Panel flush>
        <div className="list-tabs">
          <Tabs activeKey={onglet || "_"} onChange={(k) => setF({ statut: k === "_" || k === "en_retard" ? null : k, etat: k === "en_retard" ? "en_retard" : null })}
            items={ONGLETS.map((o) => ({ key: o.key || "_", label: <span>{o.label}<span className="tab-count" style={o.key === "en_retard" && counts.en_retard ? { color: "var(--danger)" } : undefined}>{counts[o.key] ?? 0}</span></span> }))} />
        </div>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#8a93a3" }} />} placeholder="N° de facture ou client…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher une facture" />
          <Select allowClear placeholder="Activité" value={f.entite || undefined} onChange={(v) => setF({ entite: v })} options={options(ENTITES)} />
          {filtres && <Button type="link" onClick={reset}>Réinitialiser</Button>}
        </div>
        <DataList<FactureVue>
          rows={rows}
          loading={isLoading}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE}
          onPage={(p) => setF({ page: String(p) })}
          onSort={(s) => setF({ tri: s.field ?? null, ordre: s.order ?? null })}
          onRowClick={(r) => navigate(`/factures/${r.id}`)}
          empty={filtres || onglet ? (
            <EmptyState icon={<SearchOutlined />} title={onglet === "en_retard" ? "Aucune facture en retard" : "Aucune facture ne correspond"}
              description={onglet === "en_retard" ? "Toutes vos factures envoyées sont dans les délais." : "Modifiez les filtres ou l'onglet sélectionné."}
              action={<Button onClick={reset}>Voir toutes les factures</Button>} />
          ) : (
            <EmptyState icon={<FileDoneOutlined />} title="Vous n'avez encore aucune facture"
              description="Créez une facture directement, ou convertissez un devis accepté en un clic."
              action={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/factures/nouvelle")}>Créer une facture</Button>} />
          )}
          columns={[
            { title: "N°", dataIndex: "numero", sorter: true, render: (v: string) => <span className="cell-main tabular">{v || "—"}</span> },
            { title: "Client", dataIndex: "client_nom", sorter: true, render: (v: string, r: FactureVue) => <div><div className="cell-main">{v || "—"}</div><div className="cell-sub">{label("entite", r.entity)}</div></div> },
            { title: "Date", dataIndex: "date_facture", sorter: true, render: (v: string) => dateFR(v) },
            { title: "Échéance", dataIndex: "echeance_effective", sorter: true, render: (v: string, r: FactureVue) => <span style={{ color: r.en_retard ? "var(--danger)" : undefined, fontWeight: r.en_retard ? 600 : 400 }}>{r.date_echeance ? dateFR(v) : "À réception"}</span> },
            { title: "Montant", dataIndex: "total_ttc", sorter: true, align: "right" as const, render: (v: number) => <b className="tabular">{eur(v)}</b> },
            { title: "Reste à payer", dataIndex: "reste_a_payer", align: "right" as const, render: (v: number, r: FactureVue) => r.status === "envoyee" ? <span className="tabular">{eur(v)}</span> : <span className="faint">—</span> },
            { title: "Statut", dataIndex: "status", render: (_: string, r: FactureVue) => <EtatFacture f={r} /> },
          ]}
          mobileRender={(r) => (
            <>
              <div className="m-row"><span className="m-title">{r.numero} · {r.client_nom}</span><EtatFacture f={r} /></div>
              <div className="m-row"><span className="m-sub">{dateFR(r.date_facture)}</span><b className="tabular">{eur(r.total_ttc)}</b></div>
            </>
          )}
        />
      </Panel>
    </>
  );
}
