import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, Checkbox, Input, Select, Tabs, Tooltip, Typography } from "antd";
import { InboxOutlined, PlusOutlined, QuestionCircleOutlined, SearchOutlined } from "@ant-design/icons";
import { useList, useUpdate, type CrudFilter, type CrudSort } from "@refinedev/core";
import dayjs from "dayjs";
import { supabaseClient } from "../../supabaseClient";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, PageHeader, Panel, StatusTag } from "../../components/ui";
import { LeadDrawer, type Lead } from "../../components/forms/LeadDrawer";
import { cleanSearch, dateFR, fromNow } from "../../lib/format";
import { ENTITES, LEAD_OUVERTS, LEAD_STATUTS, PRIORITES, TYPES_CLIENT, label, options } from "../../lib/statuts";
import { useDebounced, useUrlState } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";

const KEYS = ["q", "statut", "priorite", "entite", "type_client", "relance", "page", "tri", "ordre", "creer"] as const;
const PAGE = 20;

type Onglet = { key: string; label: string; statuts: string[] | null };
const ONGLETS_DEVIS: Onglet[] = [
  { key: "", label: "En cours", statuts: LEAD_OUVERTS },
  ...LEAD_STATUTS.map((s) => ({ key: s.value, label: s.label, statuts: [s.value] })),
  { key: "toutes", label: "Toutes", statuts: null },
];
const ONGLETS_QUESTIONS: Onglet[] = [
  { key: "", label: "À traiter", statuts: ["nouveau", "a_contacter"] },
  { key: "nouveau", label: "Nouvelles", statuts: ["nouveau"] },
  { key: "contacte", label: "Répondues", statuts: ["contacte"] },
  { key: "archive", label: "Archivées", statuts: ["archive", "gagne", "perdu"] },
  { key: "toutes", label: "Toutes", statuts: null },
];

export function LeadsList({ mode }: { mode: "devis" | "question" }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const dq = useDebounced(q, 300);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const onglets = mode === "devis" ? ONGLETS_DEVIS : ONGLETS_QUESTIONS;
  const onglet = onglets.find((o) => o.key === f.statut) ?? onglets[0];
  const page = Number(f.page) || 1;
  const { mutate: update } = useUpdate();

  useEffect(() => {
    if (dq !== f.q) setF({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [mode === "question" ? { field: "type", operator: "eq", value: "question" } : { field: "type", operator: "ne", value: "question" }];
    if (onglet.statuts) out.push({ field: "status", operator: "in", value: onglet.statuts });
    if (f.priorite) out.push({ field: "priorite", operator: "eq", value: f.priorite });
    if (f.entite) out.push({ field: "entity", operator: "eq", value: f.entite });
    if (f.type_client) out.push({ field: "type_client", operator: "eq", value: f.type_client });
    if (f.relance === "due") {
      out.push({ field: "relance_at", operator: "lte", value: dayjs().format("YYYY-MM-DD") });
      out.push({ field: "status", operator: "in", value: LEAD_OUVERTS });
    }
    const t = cleanSearch(f.q);
    if (t) {
      out.push({
        operator: "or",
        value: ["nom", "entreprise", "email", "telephone", "message"].map((field) => ({ field, operator: "contains" as const, value: t })),
      });
    }
    return out;
  }, [mode, onglet, f.priorite, f.entite, f.type_client, f.relance, f.q]);

  const sorters: CrudSort[] = [{ field: f.tri || "created_at", order: (f.ordre as "asc" | "desc") || "desc" }];
  const { data, isLoading } = useList<Lead>({
    resource: "leads",
    filters,
    sorters,
    pagination: { current: page, pageSize: PAGE, mode: "server" },
    liveMode: "auto",
  });
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  // Compteurs par statut pour les onglets.
  useEffect(() => {
    let req = supabaseClient.from("leads").select("status");
    req = mode === "question" ? req.eq("type", "question") : req.neq("type", "question");
    req.limit(5000).then(({ data: d }) => {
      const c: Record<string, number> = {};
      (d ?? []).forEach((r: { status: string }) => (c[r.status] = (c[r.status] ?? 0) + 1));
      setCounts(c);
    });
  }, [mode, data]);
  const compte = (o: Onglet) => (o.statuts ? o.statuts.reduce((s, x) => s + (counts[x] ?? 0), 0) : Object.values(counts).reduce((a, b) => a + b, 0));

  const changerStatut = (l: Lead, status: string) =>
    update(
      { resource: "leads", id: l.id, values: { status }, successNotification: false, errorNotification: false },
      { onSuccess: () => message.success(`Statut : ${label("lead", status)}`), onError: (e) => message.error(messageErreurBase(e)) },
    );

  const filtresActifs = !!(f.q || f.priorite || f.entite || f.type_client || f.relance);
  const today = dayjs().format("YYYY-MM-DD");
  const isQ = mode === "question";

  return (
    <>
      <PageHeader
        title={isQ ? "Questions reçues" : "Demandes"}
        subtitle={isQ ? "Questions et demandes d'aide envoyées depuis les sites." : "Demandes de devis reçues des sites ou saisies à la main."}
        crumbs={[{ label: isQ ? "Support" : "Commercial" }, { label: isQ ? "Questions reçues" : "Demandes" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setF({ creer: "1" })}>{isQ ? "Saisir une question" : "Nouvelle demande"}</Button>}
      />
      <Panel flush>
        <div className="list-tabs">
          <Tabs
            activeKey={onglet.key || "_"}
            onChange={(k) => setF({ statut: k === "_" ? null : k })}
            items={onglets.map((o) => ({ key: o.key || "_", label: <span>{o.label}<span className="tab-count">{compte(o)}</span></span> }))}
          />
        </div>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#8a93a3" }} />} placeholder="Nom, entreprise, email, téléphone, message…"
            value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
          <Select allowClear placeholder="Priorité" value={f.priorite || undefined} onChange={(v) => setF({ priorite: v })} options={options(PRIORITES)} />
          <Select allowClear placeholder="Site d'origine" value={f.entite || undefined} onChange={(v) => setF({ entite: v })} options={options(ENTITES)} />
          {!isQ && <Select allowClear placeholder="Type de client" value={f.type_client || undefined} onChange={(v) => setF({ type_client: v })} options={options(TYPES_CLIENT)} />}
          {!isQ && <Checkbox checked={f.relance === "due"} onChange={(e) => setF({ relance: e.target.checked ? "due" : null })}>Relance due</Checkbox>}
          {filtresActifs && <Button type="link" onClick={() => { setQ(""); setF({ q: null, priorite: null, entite: null, type_client: null, relance: null }); }}>Réinitialiser</Button>}
        </div>
        <DataList<Lead>
          rows={rows}
          loading={isLoading}
          total={total}
          page={page}
          pageSize={PAGE}
          onPage={(p) => setF({ page: String(p) })}
          onSort={(s) => setF({ tri: s.field ?? null, ordre: s.order ?? null })}
          onRowClick={(r) => navigate(`/leads/${r.id}`)}
          rowClassName={(r) => (r.is_read ? "" : "row-unread")}
          empty={
            filtresActifs || onglet.key ? (
              <EmptyState icon={<SearchOutlined />} title="Aucune demande ne correspond"
                description="Modifiez les filtres ou l'onglet sélectionné."
                action={<Button onClick={() => { setQ(""); setF({ q: null, priorite: null, entite: null, type_client: null, relance: null, statut: null }); }}>Réinitialiser les filtres</Button>} />
            ) : (
              <EmptyState icon={isQ ? <QuestionCircleOutlined /> : <InboxOutlined />}
                title={isQ ? "Aucune question reçue pour le moment" : "Aucune demande pour le moment"}
                description={isQ ? "Les questions posées depuis les formulaires des sites arrivent ici automatiquement." : "Les demandes de devis envoyées depuis vos sites arrivent ici automatiquement. Vous pouvez aussi saisir une demande reçue par téléphone."}
                action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setF({ creer: "1" })}>{isQ ? "Saisir une question" : "Saisir une demande"}</Button>} />
            )
          }
          columns={[
            {
              title: "Reçue", dataIndex: "created_at", sorter: true, width: 110,
              render: (v: string) => <Tooltip title={dateFR(v)}><span className="cell-sub">{fromNow(v)}</span></Tooltip>,
            },
            {
              title: "Contact", dataIndex: "nom", sorter: true,
              render: (_: unknown, r: Lead) => (
                <div style={{ minWidth: 180 }}>
                  <div className="cell-main" style={{ fontWeight: r.is_read ? 550 : 700 }}>{r.nom || r.email || "—"}{!r.is_read && <span className="st tone-primary nodot" style={{ marginLeft: 8, height: 18 }}>Non lue</span>}</div>
                  <div className="cell-sub">{[r.entreprise, r.email].filter(Boolean).join(" · ")}</div>
                </div>
              ),
            },
            {
              title: "Besoin", dataIndex: "message",
              render: (v: string) => <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, maxWidth: 260, minWidth: 180, color: "#5b6576", fontSize: 13 }}>{v || "—"}</Typography.Paragraph>,
            },
            { title: "Origine", dataIndex: "entity", render: (v: string, r: Lead) => <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>{r.source_url === "saisie manuelle" ? "Saisie manuelle" : label("entite", v)}</span> },
            { title: "Priorité", dataIndex: "priorite", sorter: true, render: (v: string) => ["haute", "urgente"].includes(v) ? <StatusTag kind="priorite" value={v} /> : <span className="faint" style={{ fontSize: 13 }}>{label("priorite", v)}</span> },
            {
              title: "Statut", dataIndex: "status", width: 160,
              render: (v: string, r: Lead) => (
                <Select size="small" value={v} style={{ width: 148 }} options={options(LEAD_STATUTS)} onChange={(s) => changerStatut(r, s)} aria-label="Changer le statut" />
              ),
            },
            ...(!isQ ? [{
              title: "Relance", dataIndex: "relance_at", sorter: true,
              render: (v: string | null, r: Lead) => !v ? <span className="faint">—</span> : (
                <span style={{ color: v <= today && LEAD_OUVERTS.includes(r.status) ? "var(--danger)" : undefined, fontWeight: v <= today ? 600 : 400 }}>{dateFR(v)}</span>
              ),
            }] : []),
          ]}
          mobileRender={(r) => (
            <>
              <div className="m-row"><span className="m-title">{r.nom || r.email || "—"}</span><StatusTag kind="lead" value={r.status} /></div>
              <div className="m-sub">{[r.entreprise, label("entite", r.entity)].filter(Boolean).join(" · ")}</div>
              <div className="m-row"><span className="faint" style={{ fontSize: 12.5 }}>{fromNow(r.created_at)}</span>{r.priorite !== "normale" && <StatusTag kind="priorite" value={r.priorite} />}</div>
            </>
          )}
        />
      </Panel>
      <LeadDrawer open={f.creer === "1"} defaultType={isQ ? "question" : "devis"} onClose={() => setF({ creer: null })} onSaved={(l) => navigate(`/leads/${l.id}`)} />
    </>
  );
}
