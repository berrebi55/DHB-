import { useState } from "react";
import { App, Button } from "antd";
import { FilePdfOutlined } from "@ant-design/icons";
import { telechargerPdf } from "../../lib/functions";

/** Télécharge le PDF produit par le serveur (archivé pour une facture émise). */
export function BoutonPdf(props: { type: "devis" | "facture"; id: string; emise?: boolean; libelle?: string; size?: "small" | "middle" }) {
  const { message } = App.useApp();
  const [encours, setEncours] = useState(false);
  const aide = props.type === "facture"
    ? props.emise ? "PDF archivé de la facture émise (toujours identique)" : "Aperçu PDF du brouillon (non conservé)"
    : "PDF du devis (la dernière version est conservée dans la fiche client)";
  return (
    <Button size={props.size} icon={<FilePdfOutlined />} loading={encours} title={aide} onClick={async () => {
        setEncours(true);
        const r = await telechargerPdf({ type: props.type, id: props.id });
        setEncours(false);
        if (!r.ok) message.error(r.message);
      }}>{props.libelle ?? "PDF"}</Button>
  );
}
