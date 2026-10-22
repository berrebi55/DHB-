import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Alert, App, Button, Dropdown, Modal, Progress, Skeleton, Space } from "antd";
import {
  CheckOutlined,
  DownloadOutlined,
  EditOutlined,
  FileDoneOutlined,
  MoreOutlined,
  PrinterOutlined,
  SendOutlined,
  StopOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useList, useOne } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { EmptyState, PageHeader, Panel, StatusTag } from "../../components/ui";
import { NotesPanel } from "../../components/activity/NotesPanel";
import { ActivityFeed } from "../../components/activity/ActivityFeed";
import { PaiementModal } from "../../components/forms/PaiementModal";
import { documentHtml, imprimerDocument } from "../../lib/document";
import { dateFR, eur } from "../../lib/format";
import { label } from "../../lib/statuts";
import { useEntreprise, useRafraichir } from "../../lib/hooks";
import { appelerFonction, messageErreurBase } from "../../lib/functions";
import { EtatFacture, type FactureVue } from "./list";

export function FactureShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { entreprise } = useEntreprise();
  const rafraichir = useRafraichir();
  const { data, isLoading, isError } = useOne<FactureVue>({ resource: "factures_vue", id: id! });
  const f = data?.data;
  const { data: pData } = useList({ resource: "paiements", filters: [{ field: "facture_id", operator: "eq", value: id }], sorters: [{ field: "date_paiement", order: "asc" }], pagination: { mode: "off" }, queryOptions: { enabled: !!id } });
  const paiements = (pData?.data ?? []) as any[];
  const [paiement, setPaiement] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  if (isLoading) return <Panel><Skeleton active paragraph={{ rows: 10 }} /></Panel>;
  if (isError || !f)
    return <Panel><EmptyState icon={<FileDoneOutlined />} title="Facture introuvable" action={<Button onClick={() => navigate("/factures")}>Retour aux factures</Button>} /></Panel>;

  const majStatut = async (status: string, ok: string) => {
    const { error } = await supabaseClient.from("factures").update({ status }).eq("id", f.id);
    if (error) return message.error(messageErreurBase(error));
    rafraichir("factures", "factures_vue", "clients_vue");
    message.success(ok);
  };

  const envoyer = async () => {
    setEnvoi(true);
    const r = await appelerFonction("send-invoice", { facture_id: f.id });
    setEnvoi(false);
    if (r.ok) {
      rafraichir("factures", "factures_vue");
      message.success(`Facture envoyée à ${f.client_email}`);
    } else {
      Modal.warning({ title: "Envoi automatique impossible", content: <><p>{r.message}</p><p>Vous pouvez imprimer la facture en PDF et l'envoyer vous-même, puis la marquer comme envoyée.</p></> });
    }
  };

  const annuler = () => Modal.confirm({
    title: `Annuler la facture ${f.numero} ?`,
    content: "La facture conserve son numéro (la numérotation doit rester continue) mais n'est plus due. Si un avoir est nécessaire, demandez conseil à votre comptable.",
    okText: "Annuler la facture", okButtonProps: { danger: true }, cancelText: "Retour",
    onOk: () => majStatut("annulee", "Facture annulée"),
  });

  const pctPaye = f.total_ttc > 0 ? Math.min(100, Math.round((Number(f.montant_paye) / f.total_ttc) * 100)) : 0;
  const pdf = () => {
    message.info("Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF ».");
    imprimerDocument("FACTURE", f, entreprise);
  };

  const principale =
    f.status === "brouillon" ? <Button type="primary" icon={<SendOutlined />} loading={envoi} onClick={envoyer}>Envoyer au client</Button>
    : f.status === "envoyee" ? <Button type="primary" icon={<WalletOutlined />} onClick={() => setPaiement(true)}>Enregistrer un paiement</Button>
    : null;

  const plus = [
    ...(f.status === "brouillon" ? [
      { key: "edit", icon: <EditOutlined />, label: "Modifier", onClick: () => navigate(`/factures/${f.id}/modifier`) },
      { key: "manuel", icon: <CheckOutlined />, label: "Marquer comme envoyée (envoi manuel)", onClick: () => majStatut("envoyee", "Facture marquée comme envoyée") },
    ] : []),
    ...(f.status === "envoyee" ? [
      { key: "renvoyer", icon: <SendOutlined />, label: "Renvoyer par email", onClick: envoyer },
      { key: "payee", icon: <CheckOutlined />, label: "Marquer comme payée", onClick: () => setPaiement(true) },
    ] : []),
    { key: "pdf", icon: <DownloadOutlined />, label: "Télécharger en PDF", onClick: pdf },
    ...(["brouillon", "envoyee"].includes(f.status) ? [{ type: "divider" as const }, { key: "annuler", icon: <StopOutlined />, danger: true, label: "Annuler la facture", onClick: annuler }] : []),
  ];

  return (
    <>
      <PageHeader
        title={`Facture ${f.numero ?? ""}`}
        subtitle={<Space size={8} wrap><EtatFacture f={f} /><span className="faint">{f.client_nom} · {eur(f.total_ttc)} · émise le {dateFR(f.date_facture)}</span></Space>}
        crumbs={[{ label: "Factures", to: "/factures" }, { label: f.numero ?? "Facture" }]}
        back="/factures"
        actions={
          <>
            <Button icon={<PrinterOutlined />} onClick={() => imprimerDocument("FACTURE", f, entreprise)}>Imprimer</Button>
            {principale}
            <Dropdown menu={{ items: plus }} trigger={["click"]}><Button icon={<MoreOutlined />} aria-label="Plus d'actions" /></Dropdown>
          </>
        }
      />
      {f.en_retard && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} message={`Paiement en retard depuis le ${dateFR(f.echeance_effective)}`}
          description={f.client_email ? "Renvoyez la facture ou utilisez « Lancer les relances » pour un rappel automatique." : "Ajoutez l'email du client pour pouvoir le relancer."} />
      )}
      {f.status === "brouillon" && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Brouillon : relisez la facture puis envoyez-la au client."
          description="Une fois envoyée, une facture ne peut plus être modifiée (règle comptable) : elle peut seulement être annulée." />
      )}
      <div className="detail-grid">
        <div className="section-gap">
          <div className="paper" dangerouslySetInnerHTML={{ __html: documentHtml("FACTURE", f, entreprise) }} />
          <Panel title="Notes internes"><NotesPanel factureId={f.id} placeholder="Note interne sur cette facture…" /></Panel>
        </div>
        <div className="detail-side">
          <Panel title="Règlement">
            <div className="totals">
              <div className="row"><span>Total</span><b className="tabular">{eur(f.total_ttc)}</b></div>
              <div className="row"><span>Déjà payé</span><span className="tabular">{eur(f.montant_paye)}</span></div>
              <div className="row grand" style={{ fontSize: 16 }}><span>Reste à payer</span><span className="tabular">{f.status === "annulee" ? "—" : eur(f.status === "payee" ? 0 : f.reste_a_payer)}</span></div>
            </div>
            {f.status !== "annulee" && <Progress percent={f.status === "payee" ? 100 : pctPaye} showInfo={false} strokeColor="#15803D" style={{ margin: "12px 0 4px" }} />}
            <div className="faint" style={{ fontSize: 13 }}>Échéance : {f.date_echeance ? dateFR(f.date_echeance) : "à réception"}{f.paid_at ? ` · soldée le ${dateFR(f.paid_at)}` : ""}</div>
            {f.status === "envoyee" && <Button block style={{ marginTop: 12 }} icon={<WalletOutlined />} onClick={() => setPaiement(true)}>Enregistrer un paiement</Button>}
            {paiements.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {paiements.map((p) => (
                  <div key={p.id} className="m-row" style={{ padding: "8px 0", borderTop: "1px solid var(--border-soft)", fontSize: 13 }}>
                    <span>{dateFR(p.date_paiement)} · {label("moyen", p.moyen)}{p.reference ? ` · ${p.reference}` : ""}</span>
                    <b className="tabular">{eur(p.montant)}</b>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="Client & origine">
            <dl className="kv">
              <dt>Client</dt><dd>{f.client_id ? <Link to={`/clients/${f.client_id}`}>{f.client_nom}</Link> : f.client_nom}</dd>
              <dt>Email</dt><dd>{f.client_email || <span className="faint">Non renseigné</span>}</dd>
              {f.devis_id && <><dt>Devis</dt><dd><Link to={`/devis/${f.devis_id}`}>Voir le devis d'origine</Link></dd></>}
              {f.abonnement_id && <><dt>Abonnement</dt><dd><Link to={`/abonnements?ouvrir=${f.abonnement_id}`}>Facture d'abonnement</Link></dd></>}
              <dt>Statut</dt><dd><StatusTag kind="facture" value={f.status} /></dd>
            </dl>
          </Panel>
          <Panel title="Historique" flush><ActivityFeed entite="factures" entiteId={f.id} limit={15} /></Panel>
        </div>
      </div>
      <PaiementModal open={paiement} facture={f} onClose={() => setPaiement(false)} />
    </>
  );
}
