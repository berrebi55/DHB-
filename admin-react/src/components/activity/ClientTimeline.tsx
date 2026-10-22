import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { Segmented, Tooltip } from "antd";
import { CalendarOutlined, HistoryOutlined, MailOutlined, MessageOutlined, PhoneOutlined } from "@ant-design/icons";
import { dateTimeFR, fromNow } from "../../lib/format";
import { label } from "../../lib/statuts";
import { EmptyState, ErrorState, ListSkeleton } from "../ui";
import { ActivityItem, type Activite } from "./ActivityFeed";

interface NoteFil {
  id: string;
  created_at: string;
  author_email: string | null;
  body: string;
  type?: string | null;
}

type Element = { quand: string; cle: string; note?: NoteFil; activite?: Activite };

const FILTRES = [
  { value: "tout", label: "Tout" },
  { value: "echanges", label: "Échanges" },
  { value: "documents", label: "Devis & factures" },
  { value: "paiements", label: "Paiements" },
  { value: "support", label: "Demandes & tickets" },
];
const ENTITES_FILTRE: Record<string, string[]> = {
  documents: ["devis", "factures", "abonnements"],
  paiements: ["paiements"],
  support: ["leads", "tickets", "clients"],
};

const ICONE_NOTE: Record<string, { icon: React.ReactNode; bg: string; fg: string }> = {
  note: { icon: <MessageOutlined />, bg: "#F2F4F7", fg: "#475467" },
  appel: { icon: <PhoneOutlined />, bg: "#ECFDF3", fg: "#15803D" },
  email: { icon: <MailOutlined />, bg: "#EEF3FF", fg: "#1D40AB" },
  rendez_vous: { icon: <CalendarOutlined />, bg: "#F4F3FF", fg: "#6941C6" },
};

/** Fil chronologique complet d'un client : journal automatique + notes, appels, emails, rendez-vous. */
export function ClientTimeline({ clientId }: { clientId: string }) {
  const [filtre, setFiltre] = useState("tout");
  const acts = useList<Activite>({
    resource: "activites",
    filters: [{ field: "client_id", operator: "eq", value: clientId }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: 1, pageSize: 200, mode: "server" },
    queryOptions: { retry: false },
  });
  const notes = useList<NoteFil>({
    resource: "notes",
    filters: [{ field: "client_id", operator: "eq", value: clientId }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: 1, pageSize: 200, mode: "server" },
    queryOptions: { retry: false },
  });

  const elements = useMemo<Element[]>(() => {
    // Les notes sont affichées avec leur texte : on retire leur ligne « Note ajoutée » du journal.
    const a: Element[] = (acts.data?.data ?? []).filter((x) => x.entite !== "notes").map((x) => ({ quand: x.created_at, cle: `a${x.id}`, activite: x }));
    const n: Element[] = (notes.data?.data ?? []).map((x) => ({ quand: x.created_at, cle: `n${x.id}`, note: x }));
    return [...a, ...n]
      .filter((e) => filtre === "tout" || (filtre === "echanges" ? !!e.note : !!e.activite && ENTITES_FILTRE[filtre]?.includes(e.activite.entite)))
      .sort((x, y) => y.quand.localeCompare(x.quand));
  }, [acts.data, notes.data, filtre]);

  if (acts.isLoading || notes.isLoading) return <ListSkeleton rows={4} />;
  if (acts.isError && notes.isError) return <ErrorState compact error={acts.error} onRetry={() => { void acts.refetch(); void notes.refetch(); }} />;

  return (
    <div>
      <div style={{ padding: "4px 18px 12px", overflowX: "auto" }}>
        <Segmented size="small" value={filtre} onChange={(v) => setFiltre(String(v))} options={FILTRES} aria-label="Filtrer l'historique" />
      </div>
      {elements.length === 0 ? (
        <EmptyState compact icon={<HistoryOutlined />} title="Rien à afficher"
          description={filtre === "echanges" ? "Ajoutez une note, un appel, un email ou un rendez-vous depuis l'onglet Notes." : "Les créations, envois, paiements et échanges apparaîtront ici."} />
      ) : (
        <div className="feed">
          {elements.map((e) => e.activite ? <ActivityItem key={e.cle} a={e.activite} /> : <NoteItem key={e.cle} n={e.note!} />)}
        </div>
      )}
    </div>
  );
}

function NoteItem({ n }: { n: NoteFil }) {
  const type = n.type || "note";
  const s = ICONE_NOTE[type] ?? ICONE_NOTE.note;
  return (
    <div className="feed-item">
      <span className="dot-ico" style={{ background: s.bg, color: s.fg }}>{s.icon}</span>
      <div className="body">
        <div className="t"><strong>{label("note", type)}</strong> · <span style={{ whiteSpace: "pre-wrap" }}>{n.body}</span></div>
        <div className="m">
          <Tooltip title={dateTimeFR(n.created_at)}>{fromNow(n.created_at)}</Tooltip>
          {" · "}
          {n.author_email ?? "—"}
        </div>
      </div>
    </div>
  );
}
