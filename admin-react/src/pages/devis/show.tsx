import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, App, Button, Dropdown, Input, Modal, Skeleton, Space, Timeline } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  MoreOutlined,
  PrinterOutlined,
  SendOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useDelete, useList, useOne } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { EmptyState, PageHeader, Panel, StatusTag, ErrorState } from "../../components/ui";
import { NotesPanel } from "../../components/activity/NotesPanel";
import { BoutonPdf } from "../../components/documents/BoutonPdf";
import { ActivityFeed } from "../../components/activity/ActivityFeed";
import { documentHtml, imprimerDocument } from "../../lib/document";
import { dateFR, dateTimeFR, eur } from "../../lib/format";
import { label } from "../../lib/statuts";
import { useEntreprise, useRafraichir, useRole } from "../../lib/hooks";
import { appelerFonction, messageErreurBase, estIntrouvable } from "../../lib/functions";
import { finValidite, type Devis } from "./list";

const SIGN_BASE = (import.meta.env.VITE_SIGN_BASE as string | undefined) || "";

export function DevisShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { isAdmin } = useRole();
  const { entreprise } = useEntreprise();
  const rafraichir = useRafraichir();
  const { data, isLoading, isError, error, refetch } = useOne<Devis>({ resource: "devis", id: id! });
  const d = data?.data;
  const { data: facts } = useList({ resource: "factures", filters: [{ field: "devis_id", operator: "eq", value: id }], pagination: { mode: "off" }, queryOptions: { enabled: !!id } });
  const facture = (facts?.data ?? []).find((f: any) => f.status !== "annulee") as any;
  const { mutate: remove } = useDelete();
  const [envoi, setEnvoi] = useState(false);
  const [lienManuel, setLienManuel] = useState<string | null>(null);

  if (isLoading) return <Panel><Skeleton active paragraph={{ rows: 10 }} /></Panel>;
  if (isError && !estIntrouvable(error))
    return <Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel>;
  if (isError || !d)
    return <Panel><EmptyState icon={<FileTextOutlined />} title="Devis introuvable" description="Il a peut-être été supprimé." action={<Button onClick={() => navigate("/devis")}>Retour aux devis</Button>} /></Panel>;

  const lien = SIGN_BASE ? `${SIGN_BASE}?token=${d.public_token}` : null;
  const fin = finValidite(d);
  const expire = fin.isBefore(dayjs(), "day") && ["brouillon", "envoye"].includes(d.statut);
  const modifiable = !d.signed_at && ["brouillon", "envoye"].includes(d.statut);

  const majStatut = async (statut: string, ok: string) => {
    const { error } = await supabaseClient.from("devis").update({ statut, ...(statut === "envoye" && !d.envoye_at ? { envoye_at: new Date().toISOString() } : {}) }).eq("id", d.id);
    if (error) return message.error(messageErreurBase(error));
    // Le parcours commercial suit le devis : demande et fiche client mises à jour.
    if (d.lead_id) {
      if (statut === "envoye") await supabaseClient.from("leads").update({ status: "devis_envoye" }).eq("id", d.lead_id).in("status", ["nouveau", "a_contacter", "contacte", "devis_a_preparer"]);
      if (statut === "accepte") await supabaseClient.from("leads").update({ status: "gagne" }).eq("id", d.lead_id).neq("status", "gagne");
      if (statut === "refuse") await supabaseClient.from("leads").update({ status: "perdu" }).eq("id", d.lead_id).in("status", ["devis_envoye", "devis_a_preparer"]);
    }
    if (statut === "accepte" && d.client_id) await supabaseClient.from("clients").update({ statut: "client" }).eq("id", d.client_id).eq("statut", "prospect");
    rafraichir("devis", "leads", "clients_vue");
    message.success(ok);
  };

  const envoyer = async () => {
    setEnvoi(true);
    const r = await appelerFonction<{ lien?: string }>("send-devis", { devis_id: d.id });
    setEnvoi(false);
    if (r.ok) {
      if (d.lead_id) await supabaseClient.from("leads").update({ status: "devis_envoye" }).eq("id", d.lead_id).in("status", ["nouveau", "a_contacter", "contacte", "devis_a_preparer"]);
      rafraichir("devis", "leads");
      message.success(`Devis envoyé à ${d.client_email}`);
    } else {
      // L'email n'a pas pu partir : on propose l'envoi manuel du lien.
      const l = (r.data as { lien?: string } | undefined)?.lien ?? lien;
      Modal.warning({
        title: "Envoi automatique impossible",
        content: <><p>{r.message}</p>{l && <p>Vous pouvez envoyer ce lien vous-même au client, puis marquer le devis comme envoyé.</p>}</>,
        okText: l ? "Afficher le lien" : "Compris",
        onOk: () => l && setLienManuel(l),
      });
    }
  };

  const copier = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      message.success("Lien copié");
    } catch {
      setLienManuel(txt);
    }
  };

  const actionPrincipale =
    d.statut === "brouillon" ? <Button type="primary" icon={<SendOutlined />} loading={envoi} onClick={envoyer} disabled={expire}>Envoyer au client</Button>
    : d.statut === "envoye" ? <Button type="primary" icon={<CheckOutlined />} onClick={() => majStatut("accepte", "Devis marqué comme accepté")}>Marquer accepté</Button>
    : d.statut === "accepte" ? (facture
        ? <Button type="primary" icon={<FileDoneOutlined />} onClick={() => navigate(`/factures/${facture.id}`)}>Voir la facture</Button>
        : <Button type="primary" icon={<FileDoneOutlined />} onClick={() => navigate(`/factures/nouvelle?devis=${d.id}`)}>Convertir en facture</Button>)
    : null;

  const plus = [
    ...(modifiable ? [{ key: "edit", icon: <EditOutlined />, label: "Modifier", onClick: () => navigate(`/devis/${d.id}/modifier`) }] : []),
    { key: "dup", icon: <CopyOutlined />, label: "Dupliquer", onClick: () => navigate(`/devis/nouveau?dupliquer=${d.id}`) },
    ...(lien ? [{ key: "lien", icon: <CopyOutlined />, label: "Copier le lien de signature", onClick: () => copier(lien) }] : []),
    ...(d.statut === "envoye" ? [
      { key: "relance", icon: <SendOutlined />, label: "Renvoyer au client", onClick: envoyer },
      { key: "refus", icon: <CloseOutlined />, label: "Marquer refusé", onClick: () => majStatut("refuse", "Devis marqué comme refusé") },
    ] : []),
    ...(d.statut === "brouillon" ? [{ key: "envm", label: "Marquer comme envoyé (envoi manuel)", onClick: () => majStatut("envoye", "Devis marqué comme envoyé") }] : []),
    ...(["brouillon", "envoye"].includes(d.statut) ? [{ key: "exp", label: "Marquer expiré", onClick: () => majStatut("expire", "Devis marqué comme expiré") }] : []),
    ...(isAdmin && d.statut === "brouillon" ? [{ type: "divider" as const }, {
      key: "del", icon: <DeleteOutlined />, danger: true, label: "Supprimer le brouillon",
      onClick: () => Modal.confirm({ title: "Supprimer ce brouillon ?", okText: "Supprimer", okButtonProps: { danger: true }, cancelText: "Annuler",
        onOk: () => remove({ resource: "devis", id: d.id, successNotification: false }, { onSuccess: () => { message.success("Devis supprimé"); navigate("/devis"); }, onError: (e) => message.error(messageErreurBase(e)) }) }),
    }] : []),
  ];

  return (
    <>
      <PageHeader
        title={`Devis ${d.numero ?? ""}`}
        subtitle={<Space size={8} wrap><StatusTag kind="devis" value={d.statut} />
          {d.signed_at && <span className="st tone-success">Signé en ligne</span>}
          {expire && <span className="st tone-warning">Validité dépassée</span>}
          <span className="faint">{d.client_nom} · {eur(d.total_ttc)}</span></Space>}
        crumbs={[{ label: "Devis", to: "/devis" }, { label: d.numero ?? "Devis" }]}
        back="/devis"
        actions={
          <>
            <BoutonPdf type="devis" id={d.id} libelle="Télécharger le PDF" />
            <Button icon={<PrinterOutlined />} onClick={() => imprimerDocument("DEVIS", d, entreprise)}>Imprimer</Button>
            {actionPrincipale}
            <Dropdown menu={{ items: plus }} trigger={["click"]}><Button icon={<MoreOutlined />} aria-label="Plus d'actions" /></Dropdown>
          </>
        }
      />
      {expire && d.statut === "envoye" && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={`La validité de ce devis a pris fin le ${fin.format("DD/MM/YYYY")}.`}
          description="Le client ne peut plus le signer en ligne. Dupliquez-le pour envoyer une nouvelle proposition, ou marquez-le comme expiré." />
      )}
      <div className="detail-grid">
        <div className="section-gap">
          <div className="paper" dangerouslySetInnerHTML={{ __html: documentHtml("DEVIS", d, entreprise) }} />
          <Panel title="Notes internes"><NotesPanel devisId={d.id} placeholder="Note interne sur ce devis (négociation, remarques…)" /></Panel>
        </div>
        <div className="detail-side">
          <Panel title="Suivi">
            <Timeline
              items={[
                { color: "gray", children: <>Créé le {dateFR(d.created_at)}</> },
                ...(d.envoye_at ? [{ color: "blue", children: <>Envoyé le {dateTimeFR(d.envoye_at)}</> }] : []),
                ...(d.derniere_relance_le ? [{ color: "orange", children: <>Relancé le {dateFR(d.derniere_relance_le)}</> }] : []),
                ...(d.signed_at ? [{ color: "green", children: <>Signé le {dateTimeFR(d.signed_at)}<br /><span className="faint">par {d.signature_nom}</span></> }] : []),
                ...(["refuse", "expire"].includes(d.statut) ? [{ color: "red", children: label("devis", d.statut) }] : []),
                ...(facture ? [{ color: "green", children: <>Facturé : <Link to={`/factures/${facture.id}`}>{facture.numero}</Link></> }] : []),
              ]}
            />
            <div className="faint" style={{ fontSize: 13 }}>Valable jusqu'au {fin.format("DD/MM/YYYY")}</div>
          </Panel>
          <Panel title="Client">
            <dl className="kv">
              <dt>Client</dt><dd>{d.client_id ? <Link to={`/clients/${d.client_id}`}>{d.client_nom}</Link> : d.client_nom}</dd>
              <dt>Email</dt><dd>{d.client_email || <span className="faint">Non renseigné</span>}</dd>
              {d.lead_id && <><dt>Demande</dt><dd><Link to={`/leads/${d.lead_id}`}>Voir la demande d'origine</Link></dd></>}
            </dl>
          </Panel>
          <Panel title="Signature en ligne">
            {lien ? (
              <>
                <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>Le client consulte et accepte le devis depuis ce lien, sans compte.</p>
                <Button block icon={<CopyOutlined />} onClick={() => copier(lien)}>Copier le lien</Button>
              </>
            ) : (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>Renseignez <code>VITE_SIGN_BASE</code> dans <code>admin-react/.env</code> pour afficher le lien de signature.</p>
            )}
          </Panel>
          <Panel title="Historique" flush><ActivityFeed entite="devis" entiteId={d.id} limit={15} /></Panel>
        </div>
      </div>
      <Modal open={!!lienManuel} onCancel={() => setLienManuel(null)} footer={<Button onClick={() => setLienManuel(null)}>Fermer</Button>} title="Lien de signature du devis">
        <p className="muted">Copiez ce lien et envoyez-le au client :</p>
        <Input.TextArea aria-label="Lien de signature" value={lienManuel ?? ""} readOnly autoSize onFocus={(e) => e.target.select()} />
      </Modal>
    </>
  );
}
