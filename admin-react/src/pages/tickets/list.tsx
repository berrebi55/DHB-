import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, DatePicker, Input, Select, Tabs, Tooltip } from "antd";
import { CustomerServiceOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useList, useUpdate, type CrudFilter } from "@refinedev/core";
import dayjs, { type Dayjs } from "dayjs";
import { supabaseClient } from "../../supabaseClient";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, PageHeader, Panel, StatusTag } from "../../components/ui";
import { TicketDrawer, useProfils, type Ticket } from "../../components/forms/TicketDrawer";
import { cleanSearch, dateFR, fromNow } from "../../lib/format";
import { PRIORITES, TICKET_STATUTS, label, options } from "../../lib/statuts";
import { useDebounced, useUrlState } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";

const KEYS = ["statut", "priorite", "responsable", "q", "du", "au", "page", "creer"] as const;
const PAGE = 20;
const ONGLETS = [
  { key: "", label: "Ouverts", statuts: ["ouvert", "en_cours"] },
  { key: "ouvert", label: "Nouveaux", statuts: ["ouvert"] },
  { key: "en_cours", label: "En cours", statuts: ["en_cours"] },
  { key: "resolu", label: "Résolus", statuts: ["resolu"] },
  { key: "ferme", label: "Fermés", statuts: ["ferme"] },
  { key: "tous", label: "Tous", statuts: null as string[] | null },
];

export function TicketsList() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const profils = useProfils();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const dq = useDebounced(q, 300);
  const page = Number(f.page) || 1;
  const onglet = ONGLETS.find((o) => o.key === f.statut) ?? ONGLETS[0];
  const [counts, setCounts] = useState<Record<string, number>>({});
  const { mutate: update } = useUpdate();

  useEffect(() => {
    if (dq !== f.q) setF({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [];
    if (onglet.statuts) out.push({ field: "status", operator: "in", value: onglet.statuts });
    if (f.priorite) out.push({ field: "priorite", operator: "eq", value: f.priorite });
    if (f.responsable === "aucun") out.push({ field: "responsable_id", operator: "null", value: null });
    else if (f.responsable) out.push({ field: "responsable_id", operator: "eq", value: f.responsable });
    if (f.du) out.push({ field: "created_at", operator: "gte", value: f.du });
    if (f.au) out.push({ field: "created_at", operator: "lte", value: `${f.au}T23:59:59` });
    const t = cleanSearch(f.q);
    if (t) out.push({ operator: "or", value: ["sujet", "client_nom", "description"].map((field) => ({ field, operator: "contains" as const, value: t })) });
    return out;
  }, [onglet, f.priorite, f.responsable, f.du, f.au, f.q]);

  const { data, isLoading } = useList<Ticket>({
    resource: "tickets",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: page, pageSize: PAGE, mode: "server" },
    liveMode: "auto",
  });
  const rows = data?.data ?? [];

  useEffect(() => {
    supabaseClient.from("tickets").select("status").limit(5000).then(({ data: d }) => {
      const c: Record<string, number> = { tous: 0 };
      (d ?? []).forEach((r: { status: string }) => { c.tous++; c[r.status] = (c[r.status] ?? 0) + 1; });
      c[""] = (c.ouvert ?? 0) + (c.en_cours ?? 0);
      setCounts(c);
    });
  }, [data]);

  const nomProfil = (id: string | null) => {
    const p = profils.find((x) => x.id === id);
    return p ? p.nom || p.email : null;
  };
  const changer = (t: Ticket, values: Partial<Ticket>, ok: string) =>
    update({ resource: "tickets", id: t.id, values, successNotification: false, errorNotification: false },
      { onSuccess: () => message.success(ok), onError: (e) => message.error(messageErreurBase(e)) });

  const periode: [Dayjs | null, Dayjs | null] = [f.du ? dayjs(f.du) : null, f.au ? dayjs(f.au) : null];
  const filtres = !!(f.q || f.priorite || f.responsable || f.du || f.au);
  const reset = () => { setQ(""); setF({ q: null, priorite: null, responsable: null, du: null, au: null, statut: null }); };

  return (
    <>
      <PageHeader
        title="Tickets"
        subtitle="Demandes de support et interventions à suivre."
        crumbs={[{ label: "Support" }, { label: "Tickets" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setF({ creer: "1" })}>Nouveau ticket</Button>}
      />
      <Panel flush>
        <div className="list-tabs">
          <Tabs activeKey={onglet.key || "_"} onChange={(k) => setF({ statut: k === "_" ? null : k })}
            items={ONGLETS.map((o) => ({ key: o.key || "_", label: <span>{o.label}<span className="tab-count">{counts[o.key] ?? 0}</span></span> }))} />
        </div>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#8a93a3" }} />} placeholder="Sujet, client, description…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un ticket" />
          <Select allowClear placeholder="Priorité" value={f.priorite || undefined} onChange={(v) => setF({ priorite: v })} options={options(PRIORITES)} />
          <Select allowClear placeholder="Responsable" value={f.responsable || undefined} onChange={(v) => setF({ responsable: v })}
            options={[{ value: "aucun", label: "Non attribué" }, ...profils.map((p) => ({ value: p.id, label: p.nom || p.email || "—" }))]} />
          <DatePicker.RangePicker format="DD/MM/YYYY" value={periode} allowEmpty={[true, true]} placeholder={["Ouvert du", "au"]}
            onChange={(v) => setF({ du: v?.[0]?.format("YYYY-MM-DD") ?? null, au: v?.[1]?.format("YYYY-MM-DD") ?? null })} />
          {filtres && <Button type="link" onClick={reset}>Réinitialiser</Button>}
        </div>
        <DataList<Ticket>
          rows={rows}
          loading={isLoading}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE}
          onPage={(p) => setF({ page: String(p) })}
          onRowClick={(r) => navigate(`/tickets/${r.id}`)}
          empty={filtres || onglet.key ? (
            <EmptyState icon={<SearchOutlined />} title={onglet.key === "" && !filtres ? "Aucun ticket ouvert" : "Aucun ticket ne correspond"}
              description={onglet.key === "" && !filtres ? "Tout est traité. Les nouveaux tickets apparaîtront ici." : "Modifiez les filtres ou l'onglet."}
              action={<Button onClick={reset}>Voir tous les tickets ouverts</Button>} />
          ) : (
            <EmptyState icon={<CustomerServiceOutlined />} title="Aucun ticket ouvert"
              description="Tout est traité. Créez un ticket pour suivre une demande de support ou une intervention."
              action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setF({ creer: "1" })}>Créer un ticket</Button>} />
          )}
          columns={[
            { title: "Sujet", dataIndex: "sujet", render: (v: string, r: Ticket) => <div style={{ minWidth: 220 }}><div className="cell-main">{v}</div><div className="cell-sub">{r.client_nom || "Sans client"}</div></div> },
            { title: "Priorité", dataIndex: "priorite", render: (v: string) => <StatusTag kind="priorite" value={v} /> },
            {
              title: "Statut", dataIndex: "status", width: 150,
              render: (v: string, r: Ticket) => <Select size="small" value={v} style={{ width: 130 }} options={options(TICKET_STATUTS)} onChange={(s) => changer(r, { status: s }, `Ticket : ${label("ticket", s)}`)} aria-label="Changer le statut" />,
            },
            { title: "Responsable", dataIndex: "responsable_id", render: (v: string | null) => nomProfil(v) ?? <span className="faint">Non attribué</span> },
            { title: "Ouvert", dataIndex: "created_at", render: (v: string) => <Tooltip title={dateFR(v)}><span className="cell-sub">{fromNow(v)}</span></Tooltip> },
            { title: "Mis à jour", dataIndex: "updated_at", render: (v: string) => <span className="cell-sub">{fromNow(v)}</span> },
          ]}
          mobileRender={(r) => (
            <><div className="m-row"><span className="m-title">{r.sujet}</span><StatusTag kind="ticket" value={r.status} /></div>
              <div className="m-sub">{r.client_nom || "Sans client"} · {fromNow(r.created_at)}</div>
              {r.priorite !== "normale" && <div><StatusTag kind="priorite" value={r.priorite} /></div>}</>
          )}
        />
      </Panel>
      <TicketDrawer open={f.creer === "1"} onClose={() => setF({ creer: null })} onSaved={(t) => navigate(`/tickets/${t.id}`)} />
    </>
  );
}
