import { Alert, Table } from "antd";
import { CloudServerOutlined, ExportOutlined } from "@ant-design/icons";
import { useList } from "@refinedev/core";
import dayjs from "dayjs";
import { EmptyState, ErrorState, Kpi, ListSkeleton, PageHeader, Panel, Pill } from "../../components/ui";
import { dateTimeFR, fromNow, num } from "../../lib/format";
import { useIsMobile } from "../../lib/hooks";

export interface Sauvegarde {
  id: string;
  created_at: string;
  debut: string;
  fin: string | null;
  type: "quotidienne" | "manuelle" | "test";
  statut: "reussie" | "echec";
  taille_octets: number | null;
  fichier: string | null;
  empreinte_sha256: string | null;
  lignes: Record<string, number> | null;
  run_url: string | null;
  erreur: string | null;
}

/** Au-delà de ce délai sans sauvegarde réussie, la page affiche une alerte. */
const SEUIL_HEURES = 36;

const TYPE: Record<string, string> = { quotidienne: "Quotidienne", manuelle: "Manuelle", test: "Test" };

export const taille = (o?: number | null) => {
  if (o == null) return "—";
  if (o < 1024) return `${o} o`;
  if (o < 1024 * 1024) return `${(o / 1024).toFixed(1).replace(".", ",")} Ko`;
  return `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
};
const duree = (s: Sauvegarde) => (s.fin ? `${Math.max(0, dayjs(s.fin).diff(dayjs(s.debut), "second"))} s` : "—");

/** État global affiché en tête de page (calculé uniquement à partir de l'historique réel). */
export function etatSauvegardes(rows: Sauvegarde[], maintenant = dayjs()) {
  const derniere = rows[0] ?? null;
  const derniereReussie = rows.find((r) => r.statut === "reussie") ?? null;
  const ageHeures = derniereReussie ? maintenant.diff(dayjs(derniereReussie.created_at), "hour", true) : null;
  if (!derniere) return { niveau: "aucune" as const, derniere, derniereReussie, ageHeures };
  if (derniere.statut === "echec") return { niveau: "echec" as const, derniere, derniereReussie, ageHeures };
  if (ageHeures !== null && ageHeures > SEUIL_HEURES) return { niveau: "ancienne" as const, derniere, derniereReussie, ageHeures };
  return { niveau: "ok" as const, derniere, derniereReussie, ageHeures };
}

export function SauvegardesPage() {
  const isMobile = useIsMobile();
  const { data, isLoading, isError, error, refetch } = useList<Sauvegarde>({
    resource: "sauvegardes",
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: 1, pageSize: 60, mode: "server" },
  });
  const rows = data?.data ?? [];
  const etat = etatSauvegardes(rows);
  const reussies30j = rows.filter((r) => r.statut === "reussie" && dayjs(r.created_at).isAfter(dayjs().subtract(30, "day"))).length;

  const entete = (
    <PageHeader
      title="Sauvegardes"
      subtitle="Sauvegarde indépendante de Supabase : chaque nuit, la base est exportée, chiffrée et conservée 30 jours hors de Supabase."
      crumbs={[{ label: "Système" }, { label: "Sauvegardes" }]}
    />
  );

  if (isError && rows.length === 0) {
    return <>{entete}<Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel></>;
  }
  if (isLoading) return <>{entete}<Panel><ListSkeleton rows={4} /></Panel></>;

  return (
    <>
      {entete}

      {etat.niveau === "aucune" && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message="Aucune sauvegarde enregistrée pour l'instant"
          description={<>La sauvegarde automatique n'est pas encore configurée ou n'a pas encore tourné. Suivez la procédure de <code>docs/SAUVEGARDE.md</code> (deux secrets à créer dans GitHub), puis lancez une première sauvegarde depuis GitHub → Actions → « Sauvegarde de la base ».</>} />
      )}
      {etat.niveau === "echec" && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }}
          message="La dernière sauvegarde a échoué"
          description={<>{etat.derniere?.erreur ?? "Erreur non précisée."} {etat.derniereReussie ? <>Dernière sauvegarde réussie : {dateTimeFR(etat.derniereReussie.created_at)}.</> : <>Aucune sauvegarde réussie à ce jour.</>}{" "}
            {etat.derniere?.run_url && <a href={etat.derniere.run_url} target="_blank" rel="noreferrer">Voir le détail de l'exécution <ExportOutlined /></a>}</>} />
      )}
      {etat.niveau === "ancienne" && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }}
          message={`Aucune sauvegarde réussie depuis ${Math.floor((etat.ageHeures ?? 0) / 24)} jour(s)`}
          description="La sauvegarde de nuit ne s'est pas exécutée ou n'a pas pu s'enregistrer. Vérifiez GitHub → Actions → « Sauvegarde de la base » (un échec de connexion n'apparaît que là)." />
      )}

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <Kpi label="Dernière sauvegarde réussie" icon={<CloudServerOutlined />}
          value={etat.derniereReussie ? fromNow(etat.derniereReussie.created_at) : "Aucune"}
          empty={!etat.derniereReussie}
          foot={etat.derniereReussie ? dateTimeFR(etat.derniereReussie.created_at) : "En attente de configuration"} />
        <Kpi label="Statut" value={etat.niveau === "ok" ? "À jour" : etat.niveau === "aucune" ? "Non configurée" : etat.niveau === "echec" ? "Échec" : "En retard"}
          foot={`Alerte au-delà de ${SEUIL_HEURES} h sans sauvegarde réussie`} />
        <Kpi label="Taille (dernière réussie)" value={taille(etat.derniereReussie?.taille_octets)} empty={!etat.derniereReussie}
          foot="Fichier chiffré (AES-256)" />
        <Kpi label="Réussies sur 30 jours" value={num(reussies30j)} foot="Durée de conservation des fichiers : 30 jours" />
      </div>

      <Panel title="Historique" flush>
        {rows.length === 0 ? (
          <EmptyState icon={<CloudServerOutlined />} title="Historique vide"
            description="Chaque sauvegarde (réussie ou en échec) apparaîtra ici avec sa date, sa taille et le nombre de lignes exportées." />
        ) : (
          <Table<Sauvegarde>
            rowKey="id"
            size="middle"
            dataSource={rows}
            pagination={false}
            scroll={{ x: "max-content" }}
            columns={[
              { title: "Date", dataIndex: "created_at", render: (v: string) => <div><div className="cell-main">{dateTimeFR(v)}</div><div className="cell-sub">{fromNow(v)}</div></div> },
              { title: "Statut", dataIndex: "statut", render: (v: string) => <Pill tone={v === "reussie" ? "success" : "danger"} dot>{v === "reussie" ? "Réussie" : "Échec"}</Pill> },
              { title: "Type", dataIndex: "type", render: (v: string) => TYPE[v] ?? v },
              ...(!isMobile ? [
                { title: "Taille", dataIndex: "taille_octets", render: (v: number | null) => taille(v) },
                { title: "Durée", key: "duree", render: (_: unknown, r: Sauvegarde) => duree(r) },
                { title: "Contenu", key: "lignes", render: (_: unknown, r: Sauvegarde) => r.lignes
                  ? <span className="cell-sub">{num(r.lignes["public.clients"] ?? 0)} clients · {num(r.lignes["public.factures"] ?? 0)} factures · {num(r.lignes["auth.users"] ?? 0)} comptes</span>
                  : <span className="faint">—</span> },
              ] : []),
              { title: "Détail", key: "detail", render: (_: unknown, r: Sauvegarde) => (
                <div style={{ maxWidth: 360 }}>
                  {r.erreur && <div style={{ color: "var(--danger)", fontSize: 13 }}>{r.erreur}</div>}
                  {r.fichier && <div className="cell-sub" title={r.empreinte_sha256 ?? undefined}>{r.fichier}</div>}
                  {r.run_url && <a href={r.run_url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Exécution GitHub <ExportOutlined /></a>}
                </div>
              ) },
            ]}
          />
        )}
      </Panel>

      <Panel title="Comment restaurer ?" style={{ marginTop: 16 }}>
        <p style={{ marginTop: 0 }}>Les fichiers chiffrés se téléchargent depuis GitHub → Actions → « Sauvegarde de la base » → une exécution → Artifacts. La restauration se fait dans un <b>projet Supabase neuf</b>, avec le script <code>scripts/restaurer.sh</code> et la phrase de chiffrement : la procédure pas à pas est dans <code>docs/SAUVEGARDE.md</code>.</p>
        <p className="muted" style={{ marginBottom: 0 }}>Les sauvegardes ne peuvent pas être lancées depuis le back-office : elles s'exécutent dans GitHub, hors de Supabase, pour rester utilisables même si la base est indisponible.</p>
      </Panel>
    </>
  );
}
