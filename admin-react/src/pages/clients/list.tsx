import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Segmented, Select, Tooltip } from "antd";
import { PlusOutlined, SearchOutlined, TeamOutlined } from "@ant-design/icons";
import { useList, type CrudFilter } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, PageHeader, Panel, StatusTag } from "../../components/ui";
import { ClientDrawer, type Client } from "../../components/forms/ClientDrawer";
import { cleanSearch, eur0, fromNow, initiales } from "../../lib/format";
import { ENTITES, label, options } from "../../lib/statuts";
import { useDebounced, useUrlState } from "../../lib/hooks";
import { Onglets } from "../../components/ui/Onglets";
import { chargerTout } from "../../lib/chargerTout";

export interface ClientVue extends Client {
  ca_encaisse: number;
  ca_facture: number;
  nb_devis: number;
  nb_factures: number;
  tickets_ouverts: number;
  derniere_activite: string | null;
}

const KEYS = ["q", "statut", "type", "entite", "page", "tri", "ordre", "creer"] as const;
const PAGE = 20;
const ONGLETS = [
  { key: "", label: "Tous" },
  { key: "client", label: "Clients" },
  { key: "prospect", label: "Prospects" },
  { key: "inactif", label: "Inactifs" },
  { key: "archives", label: "Archivés" },
];

export function ClientsList() {
  const navigate = useNavigate();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const dq = useDebounced(q, 300);
  const page = Number(f.page) || 1;
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (dq !== f.q) setF({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [];
    if (f.statut === "archives") out.push({ field: "archived_at", operator: "nnull", value: null });
    else {
      out.push({ field: "archived_at", operator: "null", value: null });
      if (f.statut) out.push({ field: "statut", operator: "eq", value: f.statut });
    }
    if (f.type) out.push({ field: "type", operator: "eq", value: f.type });
    if (f.entite) out.push({ field: "entity", operator: "eq", value: f.entite });
    const t = cleanSearch(f.q);
    if (t) out.push({ operator: "or", value: ["nom", "entreprise", "email", "telephone", "ville"].map((field) => ({ field, operator: "contains" as const, value: t })) });
    return out;
  }, [f.statut, f.type, f.entite, f.q]);

  const { data, isLoading, isError, error, refetch } = useList<ClientVue>({
    resource: "clients_vue",
    filters,
    sorters: [{ field: f.tri || "created_at", order: (f.ordre as "asc" | "desc") || "desc" }],
    pagination: { current: page, pageSize: PAGE, mode: "server" },
    queryOptions: { keepPreviousData: true },
  });
  const rows = data?.data ?? [];

  useEffect(() => {
    chargerTout((de, a) => supabaseClient.from("clients").select("id, statut, archived_at").order("id").range(de, a)).then(({ data: d }) => {
      const c: Record<string, number> = { "": 0, archives: 0 };
      (d ?? []).forEach((r: { statut: string; archived_at: string | null }) => {
        if (r.archived_at) c.archives++;
        else { c[""]++; c[r.statut] = (c[r.statut] ?? 0) + 1; }
      });
      setCounts(c);
    });
  }, [data]);

  const filtres = !!(f.q || f.type || f.entite);
  const reset = () => { setQ(""); setF({ q: null, type: null, entite: null, statut: null }); };

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Entreprises et particuliers : coordonnées, chiffre d'affaires et activité."
        crumbs={[{ label: "Commercial" }, { label: "Clients" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setF({ creer: "1" })}>Nouveau client</Button>}
      />
      <Panel flush>
        <div className="list-tabs">
          <Onglets label="Filtrer les clients par statut" activeKey={f.statut || "_"} onChange={(k) => setF({ statut: k === "_" ? null : k })}
            items={ONGLETS.map((o) => ({ key: o.key || "_", label: <span>{o.label}<span className="tab-count">{counts[o.key] ?? 0}</span></span> }))} />
        </div>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#667085" }} />} placeholder="Nom, entreprise, email, téléphone, ville…"
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un client" />
          <Segmented value={f.type || ""} onChange={(v) => setF({ type: String(v) || null })}
            options={[{ value: "", label: "Tous" }, { value: "entreprise", label: "Entreprises" }, { value: "particulier", label: "Particuliers" }]} />
          <Select allowClear placeholder="Activité" aria-label="Filtrer : activité" value={f.entite || undefined} onChange={(v) => setF({ entite: v })} options={options(ENTITES)} />
          {filtres && <Button type="link" onClick={reset}>Réinitialiser</Button>}
        </div>
        <DataList<ClientVue>
          rows={rows}
          loading={isLoading}
          error={isError ? error ?? true : undefined}
          onRetry={() => void refetch()}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE}
          onPage={(p) => setF({ page: String(p) })}
          onSort={(s) => setF({ tri: s.field ?? null, ordre: s.order ?? null })}
          onRowClick={(r) => navigate(`/clients/${r.id}`)}
          empty={
            filtres || f.statut ? (
              <EmptyState icon={<SearchOutlined />} title="Aucun client ne correspond" description="Modifiez la recherche ou les filtres." action={<Button onClick={reset}>Réinitialiser les filtres</Button>} />
            ) : (
              <EmptyState icon={<TeamOutlined />} title="Vous n'avez encore aucun client"
                description="Créez votre premier client pour commencer, ou convertissez une demande reçue depuis vos sites."
                action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setF({ creer: "1" })}>Créer un client</Button>} />
            )
          }
          columns={[
            {
              title: "Client", dataIndex: "nom", sorter: true,
              render: (_: unknown, r: ClientVue) => (
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 200 }}>
                  <span className="avatar-lg" style={{ width: 34, height: 34, fontSize: 12.5, borderRadius: 8 }}>{initiales(r.entreprise || r.nom)}</span>
                  <div><div className="cell-main">{r.entreprise || r.nom}</div><div className="cell-sub">{r.entreprise ? r.nom : r.email}</div></div>
                </div>
              ),
            },
            { title: "Type", dataIndex: "type", render: (v: string) => <StatusTag kind="typeClient" value={v} dot={false} /> },
            { title: "Statut", dataIndex: "statut", render: (v: string, r: ClientVue) => r.archived_at ? <span className="st tone-neutral">Archivé</span> : <StatusTag kind="client" value={v} /> },
            { title: "Contact", dataIndex: "email", render: (_: unknown, r: ClientVue) => <div><div style={{ fontSize: 13 }}>{r.telephone || "—"}</div><div className="cell-sub">{r.email}</div></div> },
            { title: "Ville", dataIndex: "ville", sorter: true, render: (v: string) => v || <span className="faint">—</span> },
            { title: "CA encaissé", dataIndex: "ca_encaisse", sorter: true, align: "right" as const, render: (v: number) => <span className="tabular">{Number(v) ? eur0(v) : <span className="faint">—</span>}</span> },
            { title: "Devis", dataIndex: "nb_devis", align: "right" as const, render: (v: number) => <span className="tabular">{v || <span className="faint">0</span>}</span> },
            { title: "Factures", dataIndex: "nb_factures", align: "right" as const, render: (v: number) => <span className="tabular">{v || <span className="faint">0</span>}</span> },
            { title: "Tickets", dataIndex: "tickets_ouverts", align: "right" as const, render: (v: number) => v ? <span className="st tone-warning nodot">{v} ouvert{v > 1 ? "s" : ""}</span> : <span className="faint">—</span> },
            { title: "Dernière activité", dataIndex: "derniere_activite", sorter: true, render: (v: string) => <Tooltip title={v ? new Date(v).toLocaleString("fr-FR") : ""}><span className="cell-sub">{fromNow(v)}</span></Tooltip> },
          ]}
          mobileRender={(r) => (
            <>
              <div className="m-row"><span className="m-title">{r.entreprise || r.nom}</span><StatusTag kind="client" value={r.statut} /></div>
              <div className="m-sub">{[label("typeClient", r.type), r.ville, r.telephone].filter(Boolean).join(" · ")}</div>
              <div className="m-row"><span className="faint" style={{ fontSize: 12.5 }}>Activité {fromNow(r.derniere_activite)}</span><span className="tabular" style={{ fontWeight: 600 }}>{Number(r.ca_encaisse) ? eur0(r.ca_encaisse) : ""}</span></div>
            </>
          )}
        />
      </Panel>
      <ClientDrawer open={f.creer === "1"} onClose={() => setF({ creer: null })} onSaved={(c) => navigate(`/clients/${c.id}`)} />
    </>
  );
}
