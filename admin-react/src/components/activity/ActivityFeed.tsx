import { Link } from "react-router-dom";
import { useList, type CrudFilter } from "@refinedev/core";
import { Tooltip } from "antd";
import {
  CustomerServiceOutlined,
  DeleteOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  HistoryOutlined,
  InboxOutlined,
  MessageOutlined,
  SyncOutlined,
  TeamOutlined,
  WalletOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { dateTimeFR, fromNow } from "../../lib/format";
import { EmptyState, ListSkeleton } from "../ui";

export interface Activite {
  id: string;
  created_at: string;
  actor_email: string | null;
  action: string;
  entite: string;
  entite_id: string | null;
  client_id: string | null;
  titre: string;
}

const STYLE: Record<string, { icon: React.ReactNode; bg: string; fg: string }> = {
  leads: { icon: <InboxOutlined />, bg: "#EEF3FF", fg: "#1D40AB" },
  clients: { icon: <TeamOutlined />, bg: "#F4F3FF", fg: "#6941C6" },
  devis: { icon: <FileTextOutlined />, bg: "#EFF8FF", fg: "#0369A1" },
  factures: { icon: <FileDoneOutlined />, bg: "#EFF8FF", fg: "#0369A1" },
  paiements: { icon: <WalletOutlined />, bg: "#ECFDF3", fg: "#15803D" },
  abonnements: { icon: <SyncOutlined />, bg: "#ECFDF3", fg: "#15803D" },
  tickets: { icon: <CustomerServiceOutlined />, bg: "#FFF7E8", fg: "#B45309" },
  notes: { icon: <MessageOutlined />, bg: "#F2F4F7", fg: "#475467" },
};

export function lienActivite(a: Activite): string | null {
  if (a.action.endsWith("_supprime") || !a.entite_id) return null;
  switch (a.entite) {
    case "leads": return `/leads/${a.entite_id}`;
    case "clients": return `/clients/${a.entite_id}`;
    case "devis": return `/devis/${a.entite_id}`;
    case "factures": return `/factures/${a.entite_id}`;
    case "tickets": return `/tickets/${a.entite_id}`;
    case "abonnements": return `/abonnements?ouvrir=${a.entite_id}`;
    case "paiements": return `/paiements`;
    case "notes": return a.client_id ? `/clients/${a.client_id}` : null;
    default: return null;
  }
}

export function ActivityItem({ a }: { a: Activite }) {
  const deleted = a.action.endsWith("_supprime");
  const s = deleted
    ? { icon: <DeleteOutlined />, bg: "#FEF1F1", fg: "#C02B2B" }
    : a.action.endsWith("_statut")
      ? { ...(STYLE[a.entite] ?? STYLE.notes), icon: <EditOutlined /> }
      : STYLE[a.entite] ?? STYLE.notes;
  const to = lienActivite(a);
  return (
    <div className="feed-item">
      <span className="dot-ico" style={{ background: s.bg, color: s.fg }}>{s.icon}</span>
      <div className="body">
        <div className="t">{to ? <Link to={to}>{a.titre}</Link> : a.titre}</div>
        <div className="m">
          <Tooltip title={dateTimeFR(a.created_at)}>{fromNow(a.created_at)}</Tooltip>
          {" · "}
          {a.actor_email ?? (a.entite === "leads" ? "Site web" : "Système")}
        </div>
      </div>
    </div>
  );
}

/** Fil d'activité : global (dashboard, journal) ou limité à un client / un élément. */
export function ActivityFeed(props: { clientId?: string; entite?: string; entiteId?: string; limit?: number }) {
  const filters: CrudFilter[] = [];
  if (props.clientId) filters.push({ field: "client_id", operator: "eq", value: props.clientId });
  if (props.entite) filters.push({ field: "entite", operator: "eq", value: props.entite });
  if (props.entiteId) filters.push({ field: "entite_id", operator: "eq", value: props.entiteId });

  const { data, isLoading, isError } = useList<Activite>({
    resource: "activites",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: 1, pageSize: props.limit ?? 12, mode: "server" },
    queryOptions: { retry: false },
  });
  const rows = data?.data ?? [];

  if (isLoading) return <ListSkeleton rows={4} />;
  if (isError)
    return <EmptyState compact icon={<HistoryOutlined />} title="Journal indisponible"
      description="Exécutez supabase/full-setup.sql pour activer le journal d'activité." />;
  if (!rows.length)
    return <EmptyState compact icon={<HistoryOutlined />} title="Aucune activité pour le moment"
      description="Les créations, changements de statut et paiements apparaîtront ici automatiquement." />;
  return (
    <div className="feed">
      {rows.map((a) => <ActivityItem key={a.id} a={a} />)}
    </div>
  );
}
