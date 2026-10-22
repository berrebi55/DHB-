import { useEffect, useState } from "react";
import { Alert, App, Button, Col, Form, Input, InputNumber, Row, Skeleton } from "antd";
import { BellOutlined, FileDoneOutlined } from "@ant-design/icons";
import { useUpdate } from "@refinedev/core";
import { PageHeader, Panel, ReadOnlyNotice } from "../../components/ui";
import { useEntreprise, useRafraichir, useRole } from "../../lib/hooks";
import { appelerFonction, messageErreurBase } from "../../lib/functions";

/** Informations société imprimées sur les devis et factures + automatisations. */
export function ParametresPage() {
  const { message } = App.useApp();
  const { isAdmin, loading: roleLoading } = useRole();
  const { entreprise, loading } = useEntreprise();
  const rafraichir = useRafraichir();
  const [form] = Form.useForm();
  const { mutate: update, isLoading: saving } = useUpdate();
  const [tache, setTache] = useState<string | null>(null);

  useEffect(() => {
    if (entreprise) form.setFieldsValue(entreprise);
  }, [entreprise, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    update({ resource: "entreprise", id: 1, values: v, successNotification: false, errorNotification: false },
      { onSuccess: () => { rafraichir("entreprise"); message.success("Paramètres enregistrés : ils apparaîtront sur vos prochains documents."); }, onError: (e) => message.error(messageErreurBase(e)) });
  };

  const lancer = async (fn: string, cle: string) => {
    setTache(cle);
    const r = await appelerFonction<any>(fn);
    setTache(null);
    if (!r.ok) return message.error(r.message);
    if (fn === "send-reminders") {
      message.success(r.data?.email_actif ? `${r.data.relancesDevis} devis et ${r.data.relancesFactures} facture(s) relancés` : "Relances non envoyées : l'envoi d'emails n'est pas configuré.");
    } else {
      message.success(r.data?.generees ? `${r.data.generees} facture(s) d'abonnement créée(s) en brouillon` : "Aucune facture d'abonnement à générer aujourd'hui");
    }
  };

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Informations de votre société et automatisations." crumbs={[{ label: "Système" }, { label: "Paramètres" }]}
        actions={isAdmin ? <Button type="primary" loading={saving} onClick={enregistrer}>Enregistrer</Button> : undefined} />
      <ReadOnlyNotice show={!roleLoading && !isAdmin} what="Cette page de paramètres" />
      {!loading && !entreprise && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Informations société indisponibles" description="Exécutez supabase/full-setup.sql dans Supabase pour créer la table « entreprise »." />
      )}
      {loading ? <Panel><Skeleton active paragraph={{ rows: 10 }} /></Panel> : (
        <Form form={form} layout="vertical" disabled={!isAdmin}>
          <div className="section-gap">
            <Alert type="info" showIcon message="Ces informations sont imprimées sur vos devis et factures."
              description="Tout champ laissé vide apparaît sur les documents comme « à compléter » : rien n'est inventé. Faites valider les mentions légales par votre comptable." />
            <Panel title="Identité de la société">
              <Row gutter={16}>
                <Col xs={24} md={12}><Form.Item name="raison_sociale" label="Raison sociale ou nom commercial"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="forme_juridique" label="Forme juridique" extra="Ex. Entrepreneur individuel (micro-entreprise)"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="siret" label="SIRET" rules={[{ pattern: /^[\d\s]{14,17}$/, message: "14 chiffres attendus." }]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="tva_intracom" label="N° TVA intracommunautaire" extra="Uniquement si vous facturez la TVA."><Input /></Form.Item></Col>
              </Row>
            </Panel>
            <Panel title="Coordonnées">
              <Row gutter={16}>
                <Col xs={24}><Form.Item name="adresse" label="Adresse"><Input /></Form.Item></Col>
                <Col xs={10} md={6}><Form.Item name="code_postal" label="Code postal"><Input /></Form.Item></Col>
                <Col xs={14} md={10}><Form.Item name="ville" label="Ville"><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="telephone" label="Téléphone"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email invalide." }]}><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="site_web" label="Site web"><Input /></Form.Item></Col>
              </Row>
            </Panel>
            <Panel title="Facturation">
              <Row gutter={16}>
                <Col xs={24} md={8}><Form.Item name="delai_paiement_jours" label="Échéance par défaut des factures"><InputNumber decimalSeparator="," min={0} max={120} addonAfter="jours" style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="validite_devis_jours" label="Validité par défaut des devis"><InputNumber decimalSeparator="," min={1} max={365} addonAfter="jours" style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} md={8} />
                <Col xs={24} md={12}><Form.Item name="iban" label="IBAN (imprimé sur les factures)"><Input /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="bic" label="BIC"><Input /></Form.Item></Col>
                <Col xs={24}><Form.Item name="conditions_devis" label="Conditions par défaut des devis" extra="Acompte, délais, modalités. Modifiable devis par devis."><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} /></Form.Item></Col>
                <Col xs={24}><Form.Item name="mentions_facture" label="Conditions de paiement des factures" extra="Ex. Paiement à réception par virement."><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} /></Form.Item></Col>
                <Col xs={24}><Form.Item name="penalites_retard" label="Pénalités de retard et indemnité de recouvrement" extra="Mention obligatoire entre professionnels — à faire valider par votre comptable."><Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} /></Form.Item></Col>
              </Row>
              <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>En franchise de TVA, la mention « TVA non applicable, art. 293 B du CGI » est ajoutée automatiquement aux documents à 0 %.</p>
            </Panel>
          </div>
        </Form>
      )}
      <Panel title="Automatisations" style={{ marginTop: 20 }} hint="Exécutées par les fonctions serveur Supabase. Elles peuvent aussi être planifiées chaque jour (voir README).">
        <div className="grid-2">
          <div>
            <b>Factures d'abonnement</b>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>Crée en brouillon la facture du mois de chaque abonnement actif arrivé à son jour de facturation.</p>
            <Button icon={<FileDoneOutlined />} loading={tache === "gen"} onClick={() => lancer("generate-recurring-invoices", "gen")}>Générer maintenant</Button>
          </div>
          <div>
            <b>Relances par email</b>
            <p className="muted" style={{ fontSize: 13, margin: "4px 0 10px" }}>Relance les devis envoyés depuis plus de 7 jours et les factures en retard (une fois par semaine au plus).</p>
            <Button icon={<BellOutlined />} loading={tache === "rel"} onClick={() => lancer("send-reminders", "rel")}>Lancer les relances</Button>
          </div>
        </div>
      </Panel>
    </>
  );
}
