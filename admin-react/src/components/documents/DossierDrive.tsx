import { useState } from "react";
import { App, Button, Space } from "antd";
import { ExportOutlined, ReloadOutlined } from "@ant-design/icons";
import { useInvalidate, useList } from "@refinedev/core";
import { appelerFonction } from "../../lib/functions";

interface ClientDrive { id: string; drive_folder_url?: string | null; drive_sync_statut?: string | null; drive_erreur?: string | null }

const MESSAGES: Record<string, string> = {
  drive_desactive: "Google Drive n'est pas activé (Système → Intégrations).",
  google_non_connecte: "Aucun compte Google connecté (Système → Intégrations).",
  google_acces_expire: "Accès Google expiré : reconnectez le compte Google.",
};

/** Ligne « Dossier Google Drive » d'une fiche client (affichée seulement si Drive est activé). */
export function DossierDrive({ client }: { client: ClientDrive }) {
  const { message } = App.useApp();
  const invalider = useInvalidate();
  const [enCours, setEnCours] = useState(false);
  const { data } = useList<{ cle: string; details: { actif?: boolean } }>({
    resource: "integrations", filters: [{ field: "cle", operator: "eq", value: "drive" }], pagination: { mode: "off" }, queryOptions: { retry: false },
  });
  if (!data?.data[0]?.details?.actif) return null;

  const synchroniser = async () => {
    setEnCours(true);
    const r = await appelerFonction<{ url?: string; copies?: number; error?: string; message?: string }>("drive-sync", { client_id: client.id });
    setEnCours(false);
    if (r.ok) message.success(`Dossier Drive à jour${r.data?.copies ? ` (${r.data.copies} PDF copié(s))` : ""}.`);
    else message.error(MESSAGES[r.data?.error ?? ""] ?? r.data?.message ?? r.message);
    invalider({ resource: "clients", invalidates: ["detail", "list"], id: client.id });
    invalider({ resource: "clients_vue", invalidates: ["detail", "list"], id: client.id });
  };

  return (
    <>
      <dt>Google Drive</dt>
      <dd>
        <Space size={8} wrap>
          {client.drive_folder_url && client.drive_sync_statut !== "erreur" && (
            <a className="lien" href={client.drive_folder_url} target="_blank" rel="noopener noreferrer">Ouvrir le dossier <ExportOutlined aria-hidden /></a>
          )}
          {client.drive_sync_statut === "erreur" && <span className="st tone-danger" title={client.drive_erreur ?? undefined}>Erreur</span>}
          {!client.drive_folder_url && client.drive_sync_statut !== "erreur" && <span className="faint">Pas encore de dossier</span>}
          <Button size="small" icon={<ReloadOutlined />} loading={enCours} onClick={synchroniser}>
            {client.drive_folder_url ? "Mettre à jour" : client.drive_sync_statut === "erreur" ? "Réessayer" : "Créer le dossier"}
          </Button>
        </Space>
        {client.drive_sync_statut === "erreur" && client.drive_erreur && <div style={{ color: "var(--danger)", fontSize: 12.5, marginTop: 4 }}>{client.drive_erreur}</div>}
      </dd>
    </>
  );
}
