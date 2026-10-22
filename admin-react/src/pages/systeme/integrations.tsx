import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { App, Alert, Button, Form, Input, Space } from "antd";
import { ApiOutlined, CloudSyncOutlined, DisconnectOutlined, GoogleOutlined, LinkOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useInvalidate, useList } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { EmptyState, ListSkeleton, PageHeader, Panel } from "../../components/ui";
import { dateTimeFR, fromNow } from "../../lib/format";
import { useRole } from "../../lib/hooks";
import { appelerFonction, messageErreurBase } from "../../lib/functions";

interface Integration { cle: string; statut: "non_configure" | "connecte" | "erreur"; compte: string | null; details: Record<string, string>; derniere_synchro: string | null; erreur: string | null }
interface Log { id: string; created_at: string; cle: string; action: string; statut: string; message: string | null }
interface Secrets { google: boolean; ga4_conversions: boolean; emails: boolean; emails_mode_test: boolean; emails_mode_test_adresse: string | null; stripe: boolean; stripe_webhook: boolean; planification: boolean; alertes_demandes: boolean; admin_url: boolean }

const RETOURS: Record<string, { type: "success" | "info" | "error"; texte: string }> = {
  connecte: { type: "success", texte: "Compte Google connecté." },
  refuse: { type: "info", texte: "Connexion Google annulée : rien n'a été modifié." },
};
const RAISONS: Record<string, string> = {
  etat_invalide: "la demande de connexion a expiré ou n'est pas valide : recommencez.",
  reserve_admin: "seul un administrateur peut connecter le compte Google.",
  sans_acces_durable: "Google n'a pas donné d'accès durable. Retirez l'accès « DHB » dans votre compte Google (Sécurité → Applications tierces) puis reconnectez.",
  google_non_configure: "les identifiants Google ne sont pas encore définis dans Supabase.",
  enregistrement_impossible: "l'accès n'a pas pu être enregistré. Réessayez.",
  echange_impossible: "Google a refusé la connexion. Réessayez.",
};
const CODES_GOOGLE: Record<string, string> = {
  google_non_connecte: "Aucun compte Google connecté.",
  google_acces_expire: "Accès Google expiré ou retiré : reconnectez le compte.",
  google_non_configure: "Identifiants Google absents dans Supabase.",
  ga4_propriete_manquante: "Renseignez d'abord l'identifiant de propriété GA4.",
};

function Etat({ ok, oui = "Configuré", non = "Non configuré" }: { ok: boolean | undefined; oui?: string; non?: string }) {
  return ok === undefined ? <span className="st tone-neutral">…</span> : ok ? <span className="st tone-success">{oui}</span> : <span className="st tone-warning">{non}</span>;
}
function StatutIntegration({ i }: { i?: Integration }) {
  if (!i) return <span className="st tone-neutral">…</span>;
  return i.statut === "connecte" ? <span className="st tone-success">Connecté</span> : i.statut === "erreur" ? <span className="st tone-danger">Erreur</span> : <span className="st tone-neutral">Non connecté</span>;
}

export function IntegrationsPage() {
  const { message, modal } = App.useApp();
  const { isAdmin } = useRole();
  const invalider = useInvalidate();
  const [params, setParams] = useSearchParams();
  const [secrets, setSecrets] = useState<Secrets | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [form] = Form.useForm();

  const integ = useList<Integration>({ resource: "integrations", pagination: { mode: "off" }, queryOptions: { retry: false } });
  const logs = useList<Log>({ resource: "integration_logs", sorters: [{ field: "created_at", order: "desc" }], pagination: { current: 1, pageSize: 15, mode: "server" }, queryOptions: { retry: false } });
  const stripe = useList<{ id: string; recu_le: string; type: string; statut: string; resultat: string | null }>({ resource: "stripe_evenements", sorters: [{ field: "recu_le", order: "desc" }], pagination: { current: 1, pageSize: 1, mode: "server" }, queryOptions: { retry: false } });
  const email = useList<{ id: string; created_at: string; statut: string; erreur: string | null }>({ resource: "emails", sorters: [{ field: "created_at", order: "desc" }], pagination: { current: 1, pageSize: 1, mode: "server" }, queryOptions: { retry: false } });
  const google = integ.data?.data.find((i) => i.cle === "google");
  const ga4 = integ.data?.data.find((i) => i.cle === "ga4");
  const recharger = () => ["integrations", "integration_logs"].forEach((r) => invalider({ resource: r, invalidates: ["list"] }));

  useEffect(() => { void appelerFonction<{ secrets: Secrets }>("integration-test").then((r) => { if (r.ok && r.data) setSecrets(r.data.secrets); }); }, []);
  useEffect(() => { if (ga4) form.setFieldsValue({ ga4_property_id: ga4.details?.ga4_property_id ?? "", ga4_measurement_id: ga4.details?.ga4_measurement_id ?? "" }); }, [ga4, form]);

  const retour = params.get("google");
  const bandeau = retour === "erreur"
    ? { type: "error" as const, texte: `Connexion Google impossible : ${RAISONS[params.get("raison") ?? ""] ?? "erreur inconnue."}` }
    : retour ? RETOURS[retour] : null;

  const connecter = async () => {
    setEnCours("connecter");
    const r = await appelerFonction<{ url: string }>("google-oauth", { action: "demarrer" });
    setEnCours(null);
    if (r.ok && r.data?.url) window.location.assign(r.data.url);
    else message.error(r.data && (r.data as { error?: string }).error === "google_non_configure" ? CODES_GOOGLE.google_non_configure : r.message);
  };
  const deconnecter = () => modal.confirm({
    title: "Déconnecter le compte Google ?", content: "La copie des chiffres Google Analytics, la Search Console et Google Drive s'arrêteront jusqu'à une nouvelle connexion.",
    okText: "Déconnecter", okButtonProps: { danger: true }, cancelText: "Annuler",
    onOk: async () => { const r = await appelerFonction("google-oauth", { action: "deconnecter" }); if (r.ok) { message.success("Compte Google déconnecté"); recharger(); } else message.error(r.message); },
  });
  const tester = async () => {
    setEnCours("tester");
    const r = await appelerFonction<{ google: { ok: boolean; code?: string } }>("integration-test", { tester: "google" });
    setEnCours(null);
    const g = r.data?.google;
    if (g?.ok) message.success("Accès Google valide."); else message.error(CODES_GOOGLE[g?.code ?? ""] ?? r.message ?? "Test impossible.");
    recharger();
  };
  const copier = async () => {
    setEnCours("copier");
    const r = await appelerFonction<{ lignes: number; error?: string }>("google-sync");
    setEnCours(null);
    if (r.ok) message.success(`${r.data?.lignes ?? 0} ligne(s) copiée(s) depuis Google Analytics.`);
    else message.error(CODES_GOOGLE[(r.data as { error?: string } | undefined)?.error ?? ""] ?? r.message);
    recharger();
  };
  const enregistrerGa4 = async () => {
    // Formulaire invalide : les messages s'affichent sous les champs, rien n'est envoyé.
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    const details = { ...(ga4?.details ?? {}), ga4_property_id: v.ga4_property_id?.trim() || undefined, ga4_measurement_id: v.ga4_measurement_id?.trim().toUpperCase() || undefined };
    const { error } = await supabaseClient.from("integrations").update({ details: JSON.parse(JSON.stringify(details)) }).eq("cle", "ga4");
    if (error) message.error(/GA4|secret/.test(error.message) ? error.message : messageErreurBase(error));
    else { message.success("Réglages Google Analytics enregistrés"); recharger(); }
  };

  return (
    <>
      <PageHeader title="Intégrations" subtitle="Services connectés à DHB. Une intégration en panne n'empêche jamais d'utiliser le CRM : l'erreur s'affiche ici."
        crumbs={[{ label: "Système" }, { label: "Intégrations" }]} />
      {bandeau && <Alert type={bandeau.type} showIcon closable onClose={() => setParams({})} message={bandeau.texte} style={{ marginBottom: 16 }} />}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <Panel title="Compte Google" hint="Google Analytics, Search Console, Google Drive." extra={<StatutIntegration i={google} />}>
          {integ.isLoading ? <ListSkeleton rows={2} /> : (
            <>
              <dl className="kv">
                <dt>Compte</dt><dd>{google?.compte ?? <span className="faint">—</span>}</dd>
                <dt>Identifiants Google</dt><dd><Etat ok={secrets?.google} oui="Définis dans Supabase" non="À définir dans Supabase" /></dd>
              </dl>
              {google?.erreur && <Alert type="warning" showIcon style={{ marginTop: 12 }} message={google.erreur} />}
              {secrets && !secrets.google && <p className="faint" style={{ fontSize: 13, marginTop: 12 }}>Secrets à créer : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI (voir docs/GOOGLE.md).</p>}
              <Space wrap style={{ marginTop: 14 }}>
                {isAdmin && <Button type="primary" icon={<GoogleOutlined />} loading={enCours === "connecter"} disabled={secrets ? !secrets.google : false} onClick={connecter}>{google?.statut === "non_configure" ? "Connecter Google" : "Reconnecter"}</Button>}
                {google?.statut !== "non_configure" && <Button icon={<SafetyCertificateOutlined />} loading={enCours === "tester"} onClick={tester}>Tester l'accès</Button>}
                {isAdmin && google?.statut !== "non_configure" && <Button danger icon={<DisconnectOutlined />} onClick={deconnecter}>Déconnecter</Button>}
              </Space>
              {!isAdmin && <p className="faint" style={{ fontSize: 13, marginTop: 12 }}>Seul un administrateur peut connecter ou déconnecter le compte Google.</p>}
            </>
          )}
        </Panel>
        <Panel title="Google Analytics 4" hint="Chiffres de visite copiés chaque jour ; conversions envoyées depuis le serveur." extra={<StatutIntegration i={ga4} />}>
          <Form form={form} layout="vertical" disabled={!isAdmin} requiredMark={false}>
            <Space wrap align="start" size={12}>
              <Form.Item name="ga4_property_id" label="Identifiant de propriété" extra="GA4 → Administration → Paramètres de la propriété (chiffres)."
                rules={[{ pattern: /^\d{5,15}$/, message: "Chiffres uniquement" }]} style={{ marginBottom: 8, width: 230 }}><Input /></Form.Item>
              <Form.Item name="ga4_measurement_id" label="Identifiant de mesure" extra="Flux de données → G-XXXXXXXXXX."
                rules={[{ pattern: /^G-[A-Z0-9]{4,15}$/i, message: "Forme G-XXXXXXXXXX" }]} style={{ marginBottom: 8, width: 230 }}><Input /></Form.Item>
            </Space>
            {isAdmin && <Button onClick={enregistrerGa4}>Enregistrer</Button>}
          </Form>
          <dl className="kv" style={{ marginTop: 14 }}>
            <dt>Dernière copie</dt><dd>{ga4?.derniere_synchro ? <span title={dateTimeFR(ga4.derniere_synchro)}>{fromNow(ga4.derniere_synchro)}</span> : <span className="faint">Jamais</span>}</dd>
            <dt>Conversions serveur</dt><dd><Etat ok={secrets?.ga4_conversions} oui="Secret défini" non="Secret GA_API_SECRET à définir" /></dd>
          </dl>
          {ga4?.erreur && <Alert type="warning" showIcon style={{ marginTop: 12 }} message={ga4.erreur} />}
          <Space wrap style={{ marginTop: 14 }}>
            <Button icon={<CloudSyncOutlined />} loading={enCours === "copier"} disabled={google?.statut !== "connecte" || !ga4?.details?.ga4_property_id} onClick={copier}>Copier les chiffres maintenant</Button>
            <Link className="lien" to="/pilotage/acquisition">Voir l'acquisition</Link>
          </Space>
          <p className="faint" style={{ fontSize: 12.5, marginTop: 12, marginBottom: 0 }}>Le même identifiant de mesure doit être renseigné dans les sites (fichier suivi.js, GA_ID) pour la mesure d'audience des visiteurs.</p>
        </Panel>
        <Panel title="Emails (Resend)" extra={<Etat ok={secrets?.emails} />}>
          <dl className="kv">
            <dt>Mode test</dt><dd>{secrets?.emails_mode_test ? <>Actif : tout part vers {secrets.emails_mode_test_adresse}</> : secrets ? "Inactif" : "…"}</dd>
            <dt>Dernier envoi</dt><dd>{email.data?.data[0] ? <>{fromNow(email.data.data[0].created_at)} · {email.data.data[0].statut === "envoye" ? "envoyé" : "échec"}</> : <span className="faint">Aucun</span>}</dd>
            <dt>Alertes de demandes</dt><dd><Etat ok={secrets?.alertes_demandes} /></dd>
          </dl>
          <Link className="lien" to="/communication/emails" style={{ display: "inline-block", marginTop: 12 }}>Historique des emails</Link>
        </Panel>
        <Panel title="Paiements en ligne (Stripe)" extra={<Etat ok={secrets ? secrets.stripe && secrets.stripe_webhook : undefined} />}>
          <dl className="kv">
            <dt>Paiement en ligne</dt><dd><Etat ok={secrets?.stripe} /></dd>
            <dt>Webhook</dt><dd><Etat ok={secrets?.stripe_webhook} /></dd>
            <dt>Dernier événement</dt><dd>{stripe.data?.data[0] ? <>{fromNow(stripe.data.data[0].recu_le)} · {stripe.data.data[0].resultat ?? stripe.data.data[0].statut}</> : <span className="faint">Aucun reçu</span>}</dd>
          </dl>
        </Panel>
        <Panel title="Planification" extra={<Etat ok={secrets?.planification} />}>
          <p className="muted" style={{ marginTop: 0 }}>Robot des automatisations, copie Google Analytics, factures d'abonnement : déclenchés par la planification Supabase (secret CRON_SECRET).</p>
          <Link className="lien" to="/systeme/automatisations">Automatisations</Link>
        </Panel>
        <Panel title="Sauvegardes" extra={<ApiOutlined aria-hidden />}>
          <p className="muted" style={{ marginTop: 0 }}>Sauvegarde chiffrée chaque nuit par GitHub (base et PDF).</p>
          <Link className="lien" to="/systeme/sauvegardes"><LinkOutlined /> Voir les sauvegardes</Link>
        </Panel>
      </div>
      <Panel title="Journal des intégrations" flush>
        {logs.isLoading ? <ListSkeleton rows={3} /> : (logs.data?.data ?? []).length === 0
          ? <EmptyState compact icon={<ApiOutlined />} title="Aucune action pour le moment" description="Connexions, copies de chiffres et conversions apparaîtront ici." />
          : (
            <div className="m-list">
              {(logs.data?.data ?? []).map((l) => (
                <div key={l.id} className="m-item" style={{ cursor: "default" }}>
                  <div className="m-row"><span className="m-title">{l.cle === "google" ? "Google" : l.cle === "ga4" ? "Google Analytics" : l.cle} · {l.action}</span>
                    <span className={`st ${l.statut === "ok" ? "tone-success" : l.statut === "erreur" ? "tone-danger" : "tone-neutral"}`}>{l.statut === "ok" ? "OK" : l.statut === "erreur" ? "Erreur" : "Ignoré"}</span></div>
                  <div className="m-sub" title={dateTimeFR(l.created_at)}>{fromNow(l.created_at)}{l.message ? ` · ${l.message}` : ""}</div>
                </div>
              ))}
            </div>
          )}
      </Panel>
    </>
  );
}
