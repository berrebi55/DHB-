import { useEffect, useRef, useState } from "react";
import { App, Alert, Button, Checkbox, Drawer, Form, Input, Modal, Select, Space, Tag } from "antd";
import { EyeOutlined, SendOutlined } from "@ant-design/icons";
import { useList } from "@refinedev/core";
import { appelerFonction } from "../../lib/functions";

export type CibleEmail = "client" | "lead" | "devis" | "facture" | "ticket";

interface Modele { cle: string; nom: string; cible: string; sujet: string; corps: string; actif: boolean }

// Variables remplies par le serveur (supabase/functions/_shared/modeles.ts).
const VARIABLES: { cle: string; libelle: string; cibles?: CibleEmail[] }[] = [
  { cle: "contact_nom", libelle: "Nom du contact" },
  { cle: "client_nom", libelle: "Client" },
  { cle: "societe", libelle: "Votre société" },
  { cle: "signature", libelle: "Signature" },
  { cle: "date_du_jour", libelle: "Date du jour" },
  { cle: "devis_numero", libelle: "N° de devis", cibles: ["devis"] },
  { cle: "devis_montant", libelle: "Montant du devis", cibles: ["devis"] },
  { cle: "devis_date", libelle: "Date du devis", cibles: ["devis"] },
  { cle: "devis_validite", libelle: "Validité", cibles: ["devis"] },
  { cle: "facture_numero", libelle: "N° de facture", cibles: ["facture"] },
  { cle: "facture_montant", libelle: "Montant", cibles: ["facture"] },
  { cle: "facture_reste", libelle: "Reste à payer", cibles: ["facture"] },
  { cle: "facture_echeance", libelle: "Échéance", cibles: ["facture"] },
  { cle: "ticket_sujet", libelle: "Sujet du ticket", cibles: ["ticket"] },
];

interface Apercu { destinataire: string; sujet: string; html: string; redirection: string | null }

/** Rédiger et envoyer un email depuis une fiche ; le destinataire est l'email de la fiche. */
export function EmailDrawer(props: {
  open: boolean;
  onClose: () => void;
  cible: CibleEmail;
  id: string;
  destinataire?: string | null;
  pdf?: boolean;            // proposer de joindre le PDF (devis, facture émise)
  modeleParDefaut?: string;
  onEnvoye?: () => void;
}) {
  const { message } = App.useApp();
  const [modele, setModele] = useState<string | undefined>(props.modeleParDefaut);
  const [sujet, setSujet] = useState("");
  const [corps, setCorps] = useState("");
  const [joindre, setJoindre] = useState(false);
  const [encours, setEncours] = useState<"apercu" | "envoi" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const zone = useRef<HTMLTextAreaElement | null>(null);

  const { data } = useList<Modele>({
    resource: "email_modeles",
    filters: [{ field: "actif", operator: "eq", value: true }],
    sorters: [{ field: "nom", order: "asc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: props.open, retry: false },
  });
  const modeles = (data?.data ?? []).filter((m) => m.cible === "tous" || m.cible === props.cible);

  const appliquer = (cle?: string) => {
    setModele(cle);
    const m = modeles.find((x) => x.cle === cle);
    if (m) { setSujet(m.sujet); setCorps(m.corps); }
  };
  useEffect(() => {
    if (!props.open) return;
    setErreur(null); setApercu(null); setJoindre(false);
    setSujet(""); setCorps("");
    setModele(props.modeleParDefaut);
  }, [props.open, props.modeleParDefaut]);
  // Modèle proposé par défaut : appliqué dès que la liste est chargée.
  useEffect(() => {
    if (props.open && props.modeleParDefaut && !sujet && !corps && modeles.some((m) => m.cle === props.modeleParDefaut)) appliquer(props.modeleParDefaut);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open, data]);

  const inserer = (cle: string) => {
    const t = zone.current;
    const bout = `{{${cle}}}`;
    if (!t) { setCorps((c) => c + bout); return; }
    const debut = t.selectionStart ?? corps.length, fin = t.selectionEnd ?? corps.length;
    setCorps(corps.slice(0, debut) + bout + corps.slice(fin));
    requestAnimationFrame(() => { t.focus(); t.setSelectionRange(debut + bout.length, debut + bout.length); });
  };

  const appeler = async (apercuSeul: boolean) => {
    setErreur(null);
    setEncours(apercuSeul ? "apercu" : "envoi");
    const r = await appelerFonction<Apercu & { variables?: string[]; destinataire?: string }>("email-send", {
      cible: { type: props.cible, id: props.id }, sujet, corps, modele: modele ?? null, joindre_pdf: joindre, apercu: apercuSeul,
    });
    setEncours(null);
    if (!r.ok) {
      setErreur(r.data?.variables?.length
        ? `Informations manquantes sur la fiche pour : ${r.data.variables.map((v) => `{{${v}}}`).join(", ")}. Complétez la fiche ou retirez ces variables.`
        : r.message ?? "Envoi impossible.");
      return;
    }
    if (apercuSeul) { setApercu(r.data as Apercu); return; }
    message.success(`Email envoyé à ${r.data?.destinataire ?? props.destinataire ?? "le client"}`);
    props.onEnvoye?.();
    props.onClose();
  };

  const variables = VARIABLES.filter((v) => !v.cibles || v.cibles.includes(props.cible));
  return (
    <Drawer open={props.open} onClose={props.onClose} width={600} destroyOnClose title="Écrire un email"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={props.onClose}>Annuler</Button>
          <Button icon={<EyeOutlined />} loading={encours === "apercu"} disabled={!sujet.trim() || !corps.trim()} onClick={() => appeler(true)}>Aperçu</Button>
          <Button type="primary" icon={<SendOutlined />} loading={encours === "envoi"} disabled={!sujet.trim() || !corps.trim()} onClick={() => appeler(false)}>Envoyer</Button>
        </div>
      }>
      <Form layout="vertical" component="div">
        <Form.Item label="Destinataire" htmlFor="email-a" extra="Toujours l'adresse enregistrée sur la fiche.">
          <Input id="email-a" value={props.destinataire || "Adresse de la fiche"} readOnly />
        </Form.Item>
        <Form.Item label="Modèle" htmlFor="email-modele">
          <Select id="email-modele" allowClear placeholder="Choisir un modèle (facultatif)" value={modele} onChange={appliquer}
            options={modeles.map((m) => ({ value: m.cle, label: m.nom }))} notFoundContent="Aucun modèle pour ce type de fiche" />
        </Form.Item>
        <Form.Item label="Sujet" htmlFor="email-sujet" required>
          <Input id="email-sujet" value={sujet} onChange={(e) => setSujet(e.target.value)} maxLength={200} />
        </Form.Item>
        <Form.Item label="Message" htmlFor="email-corps" required style={{ marginBottom: 8 }}>
          <Input.TextArea id="email-corps" ref={(r) => { zone.current = r?.resizableTextArea?.textArea ?? null; }} value={corps}
            onChange={(e) => setCorps(e.target.value)} autoSize={{ minRows: 8, maxRows: 18 }} maxLength={10000} />
        </Form.Item>
        <div style={{ marginBottom: 16 }}>
          <div className="faint" style={{ fontSize: 12.5, marginBottom: 6 }}>Insérer une information de la fiche :</div>
          <Space size={[6, 6]} wrap>
            {variables.map((v) => (
              <Tag key={v.cle} style={{ cursor: "pointer" }} onClick={() => inserer(v.cle)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inserer(v.cle); } }}>{v.libelle}</Tag>
            ))}
          </Space>
        </div>
        {props.pdf && <Checkbox checked={joindre} onChange={(e) => setJoindre(e.target.checked)}>Joindre le PDF</Checkbox>}
        {erreur && <Alert type="error" showIcon message={erreur} style={{ marginTop: 16 }} />}
      </Form>
      <Modal open={!!apercu} onCancel={() => setApercu(null)} title="Aperçu de l'email" width={680}
        footer={<Space><Button onClick={() => setApercu(null)}>Modifier</Button><Button type="primary" icon={<SendOutlined />} loading={encours === "envoi"} onClick={() => { setApercu(null); void appeler(false); }}>Envoyer</Button></Space>}>
        {apercu && (
          <>
            {apercu.redirection && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={`Mode test : l'email partira vers ${apercu.redirection} (et non vers ${apercu.destinataire}).`} />}
            <dl className="kv" style={{ marginBottom: 12 }}>
              <dt>À</dt><dd>{apercu.destinataire}</dd>
              <dt>Sujet</dt><dd>{apercu.sujet}</dd>
            </dl>
            <iframe title="Contenu de l'email" sandbox="" srcDoc={apercu.html} style={{ width: "100%", height: 320, border: "1px solid var(--border)", borderRadius: 8, background: "#fff" }} />
          </>
        )}
      </Modal>
    </Drawer>
  );
}
