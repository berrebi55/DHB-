import { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Input, Pagination, Select } from "antd";
import { HistoryOutlined, SearchOutlined } from "@ant-design/icons";
import { useList, type CrudFilter } from "@refinedev/core";
import dayjs, { type Dayjs } from "dayjs";
import { EmptyState, ListSkeleton, PageHeader, Panel } from "../../components/ui";
import { ActivityItem, type Activite } from "../../components/activity/ActivityFeed";
import { cleanSearch, dateLongFR } from "../../lib/format";
import { useDebounced, useUrlState } from "../../lib/hooks";

const TYPES = [
  { value: "leads", label: "Demandes" },
  { value: "clients", label: "Clients" },
  { value: "devis", label: "Devis" },
  { value: "factures", label: "Factures" },
  { value: "paiements", label: "Paiements" },
  { value: "abonnements", label: "Abonnements" },
  { value: "tickets", label: "Tickets" },
  { value: "notes", label: "Notes" },
];
const KEYS = ["q", "type", "du", "au", "page"] as const;
const PAGE = 40;

export function JournalPage() {
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const dq = useDebounced(q, 300);
  const page = Number(f.page) || 1;

  useEffect(() => {
    if (dq !== f.q) setF({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [];
    if (f.type) out.push({ field: "entite", operator: "eq", value: f.type });
    if (f.du) out.push({ field: "created_at", operator: "gte", value: f.du });
    if (f.au) out.push({ field: "created_at", operator: "lte", value: `${f.au}T23:59:59` });
    const t = cleanSearch(f.q);
    if (t) out.push({ operator: "or", value: [{ field: "titre", operator: "contains", value: t }, { field: "actor_email", operator: "contains", value: t }] });
    return out;
  }, [f.type, f.du, f.au, f.q]);

  const { data, isLoading, isError } = useList<Activite>({
    resource: "activites", filters, sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: page, pageSize: PAGE, mode: "server" }, queryOptions: { retry: false, keepPreviousData: true },
  });
  const rows = useMemo(() => data?.data ?? [], [data]);
  const total = data?.total ?? 0;

  // Regroupement par jour pour une lecture chronologique.
  const jours = useMemo(() => {
    const g: { jour: string; items: Activite[] }[] = [];
    rows.forEach((a) => {
      const j = dayjs(a.created_at).format("YYYY-MM-DD");
      if (!g.length || g[g.length - 1].jour !== j) g.push({ jour: j, items: [] });
      g[g.length - 1].items.push(a);
    });
    return g;
  }, [rows]);

  const periode: [Dayjs | null, Dayjs | null] = [f.du ? dayjs(f.du) : null, f.au ? dayjs(f.au) : null];
  const filtres = !!(f.q || f.type || f.du || f.au);

  return (
    <>
      <PageHeader title="Journal d'activité" subtitle="Toutes les actions enregistrées automatiquement par la base, par qui et quand." crumbs={[{ label: "Système" }, { label: "Journal d'activité" }]} />
      <Panel flush>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#667085" }} />} placeholder="Rechercher (client, n° de document, utilisateur…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher dans le journal" />
          <Select allowClear placeholder="Type d'élément" aria-label="Filtrer : type d'élément" value={f.type || undefined} onChange={(v) => setF({ type: v })} options={TYPES} />
          <DatePicker.RangePicker format="DD/MM/YYYY" value={periode} allowEmpty={[true, true]}
            onChange={(v) => setF({ du: v?.[0]?.format("YYYY-MM-DD") ?? null, au: v?.[1]?.format("YYYY-MM-DD") ?? null })} />
          {filtres && <Button type="link" onClick={() => { setQ(""); setF({ q: null, type: null, du: null, au: null }); }}>Réinitialiser</Button>}
        </div>
        {isLoading ? <ListSkeleton /> : isError ? (
          <EmptyState icon={<HistoryOutlined />} title="Journal indisponible" description="Exécutez supabase/full-setup.sql dans Supabase pour activer le journal d'activité." />
        ) : rows.length === 0 ? (
          <EmptyState icon={<HistoryOutlined />} title={filtres ? "Aucune activité sur cette sélection" : "Aucune activité pour le moment"}
            description={filtres ? undefined : "Les créations, changements de statut, paiements et suppressions apparaîtront ici automatiquement."} />
        ) : (
          <>
            {jours.map((j) => (
              <div key={j.jour}>
                <div style={{ padding: "12px 18px 4px", fontSize: 12, fontWeight: 600, color: "#667085", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {dayjs(j.jour).isSame(dayjs(), "day") ? "Aujourd'hui" : dayjs(j.jour).isSame(dayjs().subtract(1, "day"), "day") ? "Hier" : dateLongFR(j.jour)}
                </div>
                <div className="feed">{j.items.map((a) => <ActivityItem key={a.id} a={a} />)}</div>
              </div>
            ))}
            <div className="table-foot">
              <span>{total} événement{total > 1 ? "s" : ""}</span>
              {total > PAGE && <Pagination size="small" current={page} pageSize={PAGE} total={total} showSizeChanger={false} onChange={(p) => setF({ page: String(p) })} />}
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
