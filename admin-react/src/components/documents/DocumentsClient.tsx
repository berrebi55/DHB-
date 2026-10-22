import { useState } from "react";
import { useList } from "@refinedev/core";
import { App, Button } from "antd";
import { DownloadOutlined, FilePdfOutlined } from "@ant-design/icons";
import { dateTimeFR } from "../../lib/format";
import { telechargerPdf } from "../../lib/functions";
import { EmptyState, ErrorState, ListSkeleton } from "../ui";

interface Doc {
  id: string;
  created_at: string;
  updated_at: string;
  type: "devis" | "facture";
  numero: string | null;
  nom_fichier: string;
  taille_octets: number | null;
  drive_file_id?: string | null;
  drive_erreur?: string | null;
}

const taille = (n: number | null) => (n == null ? "" : n < 1024 ? `${n} o` : `${Math.round(n / 1024)} Ko`);

/** PDF archivés d'un client (factures émises, dernière version des devis). */
export function DocumentsClient({ clientId }: { clientId: string }) {
  const { message } = App.useApp();
  const [encours, setEncours] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch } = useList<Doc>({
    resource: "documents",
    filters: [{ field: "client_id", operator: "eq", value: clientId }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: 1, pageSize: 100, mode: "server" },
    queryOptions: { retry: false },
  });
  const rows = data?.data ?? [];
  if (isLoading) return <ListSkeleton rows={3} />;
  if (isError) return <ErrorState compact error={error} onRetry={() => void refetch()} />;
  if (!rows.length)
    return <EmptyState compact icon={<FilePdfOutlined />} title="Aucun PDF enregistré"
      description="Le PDF d'une facture est archivé dès son premier téléchargement après envoi ; celui d'un devis à chaque téléchargement." />;
  return (
    <div className="m-list">
      {rows.map((d) => (
        <div key={d.id} className="m-item" style={{ cursor: "default" }}>
          <div className="m-row">
            <span className="m-title"><FilePdfOutlined style={{ marginRight: 6 }} />{d.type === "facture" ? "Facture" : "Devis"} {d.numero ?? ""}</span>
            <Button size="small" icon={<DownloadOutlined />} loading={encours === d.id} aria-label={`Télécharger ${d.nom_fichier}`}
              onClick={async () => {
                setEncours(d.id);
                const r = await telechargerPdf({ document_id: d.id });
                setEncours(null);
                if (!r.ok) message.error(r.message);
              }}>Télécharger</Button>
          </div>
          <div className="m-sub">
            {d.type === "facture" ? `Archivé le ${dateTimeFR(d.created_at)}` : `Version du ${dateTimeFR(d.updated_at)}`}
            {d.taille_octets ? ` · ${taille(d.taille_octets)}` : ""}
            {d.drive_file_id ? " · copié dans Google Drive" : d.drive_erreur ? ` · copie Drive en erreur : ${d.drive_erreur}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
