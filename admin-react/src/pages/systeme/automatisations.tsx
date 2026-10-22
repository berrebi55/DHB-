import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { App, Alert, Button, InputNumber, Select, Space, Switch } from "antd";
import { PlayCircleOutlined, ReloadOutlined, RobotOutlined } from "@ant-design/icons";
import { useInvalidate, useList } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Panel } from "../../components/ui";
import { dateTimeFR, fromNow } from "../../lib/format";
import { useRole } from "../../lib/hooks";
import { appelerFonction, messageErreurBase } from "../../lib/functions";

interface Regle { cle: string; nom: string; description: string; declencheur: string; actif: boolean; delai_jours: number; modele_cle: string | null }
interface Modele { cle: string; nom: string }
interface Evenement { id: string; created_at: string; type: string; objet_type: string; objet_id: string; statut: string; tentatives: number; prochaine_tentative: string; erreur: string | null }
interface Run { id: string; created_at: string; automatisation_cle: string; objet_type: string; objet_id: string; statut: string; detail: string | null }

const LIBELLES_EVENEMENT: Record<string, string> = {
  client_cree: "Client créé", lead_cree: "Nouvelle demande", devis_envoye: "Devis envoyé", devis_accepte: "Devis accepté",
  facture_envoyee: "Facture envoyée", facture_payee: "Facture payée", ticket_resolu: "Ticket résolu",
};
const lienFiche = (type: string, id: string) =>
  ({ client: `/clients/${id}`, lead: `/leads/${id}`, devis: `/devis/${id}`, facture: `/factures/${id}`, ticket: `/tickets/${id}` } as Record<string, string>)[type] ?? null;
const TON_RUN: Record<string, string> = { envoye: "tone-success", echec: "tone-danger", ignore: "tone-neutral" };
const LIB_RUN: Record<string, string> = { envoye: "Envoyé", echec: "Échec", ignore: "Ignoré" };

function CarteRegle({ r, modeles, admin, onSaved }: { r: Regle; modeles: Modele[]; admin: boolean; onSaved: () => void }) {
  const { message } = App.useApp();
  const [v, setV] = useState(r);
  const [enCours, setEnCours] = useState(false);
  useEffect(() => setV(r), [r]);
  const modifie = v.actif !== r.actif || v.delai_jours !== r.delai_jours || v.modele_cle !== r.modele_cle;
  const enregistrer = async () => {
    setEnCours(true);
    const { error } = await supabaseClient.from("automatisations").update({ actif: v.actif, delai_jours: v.delai_jours, modele_cle: v.modele_cle }).eq("cle", r.cle);
    setEnCours(false);
    if (error) message.error(messageErreurBase(error));
    else { message.success(`Règle « ${r.nom} » enregistrée`); onSaved(); }
  };
  const quotidien = r.declencheur === "quotidien";
  return (
    <Panel title={r.nom} hint={quotidien ? "Contrôle quotidien" : `Quand : ${LIBELLES_EVENEMENT[r.declencheur] ?? r.declencheur}`}
      extra={<Space size={8}><span className={v.actif ? "st tone-success" : "st tone-neutral"}>{v.actif ? "Active" : "Inactive"}</span>
        <Switch checked={v.actif} disabled={!admin} onChange={(x) => setV({ ...v, actif: x })} aria-label={`Activer : ${r.nom}`} /></Space>}>
      <p className="muted" style={{ marginTop: 0 }}>{r.description}</p>
      <Space wrap size={16} align="end">
        <label className="muted" style={{ fontSize: 13 }}>{quotidien && r.cle === "rappel_facture" ? "Jours après l'échéance" : quotidien ? "Jours après l'envoi" : "Attendre (jours)"}
          <InputNumber min={0} max={90} value={v.delai_jours} disabled={!admin} onChange={(x) => setV({ ...v, delai_jours: Number(x) || 0 })} style={{ display: "block", marginTop: 4, width: 120 }} />
        </label>
        <label className="muted" style={{ fontSize: 13 }}>Modèle d'email
          <Select value={v.modele_cle ?? undefined} disabled={!admin} onChange={(x) => setV({ ...v, modele_cle: x })} style={{ display: "block", marginTop: 4, width: 260 }}
            options={modeles.map((m) => ({ value: m.cle, label: m.nom }))} />
        </label>
        {admin && <Button type="primary" disabled={!modifie} loading={enCours} onClick={enregistrer}>Enregistrer</Button>}
        {v.modele_cle && <Link to="/communication/modeles">Voir le texte du modèle</Link>}
      </Space>
    </Panel>
  );
}

export function AutomatisationsPage() {
  const { message } = App.useApp();
  const { isAdmin } = useRole();
  const invalider = useInvalidate();
  const [lancement, setLancement] = useState(false);
  const regles = useList<Regle>({ resource: "automatisations", sorters: [{ field: "nom", order: "asc" }], pagination: { mode: "off" }, queryOptions: { retry: false } });
  const modeles = useList<Modele>({ resource: "email_modeles", filters: [{ field: "actif", operator: "eq", value: true }], sorters: [{ field: "nom", order: "asc" }], pagination: { mode: "off" }, queryOptions: { retry: false } });
  const attente = useList<Evenement>({ resource: "evenements", filters: [{ field: "statut", operator: "in", value: ["en_attente", "erreur"] }], sorters: [{ field: "created_at", order: "desc" }], pagination: { current: 1, pageSize: 50, mode: "server" }, queryOptions: { retry: false } });
  const runs = useList<Run>({ resource: "automatisation_runs", sorters: [{ field: "created_at", order: "desc" }], pagination: { current: 1, pageSize: 30, mode: "server" }, queryOptions: { retry: false } });
  const toutRecharger = () => ["automatisations", "evenements", "automatisation_runs"].forEach((r) => invalider({ resource: r, invalidates: ["list"] }));

  const ev = attente.data?.data ?? [];
  const enErreur = ev.filter((e) => e.statut === "erreur");
  const nomRegle = (cle: string) => (regles.data?.data ?? []).find((r) => r.cle === cle)?.nom ?? cle;

  const lancer = async () => {
    setLancement(true);
    const r = await appelerFonction<{ file: { traites: number; erreurs: number }; quotidien: { relancesDevis: number; relancesFactures: number } }>("worker");
    setLancement(false);
    if (!r.ok) { message.error(r.message); return; }
    const d = r.data!;
    message.success(`Robot exécuté : ${d.file.traites} événement(s) traité(s), ${d.quotidien.relancesDevis} relance(s) de devis, ${d.quotidien.relancesFactures} rappel(s) de facture.`);
    toutRecharger();
  };
  const reessayer = async (id: string) => {
    const { error } = await supabaseClient.rpc("reessayer_evenement", { p_id: id });
    if (error) message.error(messageErreurBase(error));
    else { message.success("Événement remis en file : il sera traité au prochain passage du robot."); toutRecharger(); }
  };

  return (
    <>
      <PageHeader title="Automatisations" subtitle="Règles « SI … ALORS envoyer un email » et suivi du robot qui les applique (toutes les 15 minutes une fois planifié)."
        crumbs={[{ label: "Système" }, { label: "Automatisations" }]}
        actions={<Button icon={<PlayCircleOutlined />} loading={lancement} onClick={lancer}>Lancer maintenant</Button>} />
      {!isAdmin && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Seul un administrateur peut activer ou régler les règles." />}
      {enErreur.length > 0 && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }} message={`${enErreur.length} événement(s) en erreur après plusieurs tentatives`}
          description="L'envoi a échoué 5 fois (service d'email indisponible ou non configuré). Le CRM fonctionne normalement ; corrigez la cause puis cliquez sur « Réessayer »." />
      )}
      <div className="section-gap">
        {regles.isLoading ? <Panel><ListSkeleton rows={3} /></Panel>
          : regles.isError ? <Panel><ErrorState error={regles.error} onRetry={() => void regles.refetch()} /></Panel>
          : <div className="grid-2">{(regles.data?.data ?? []).map((r) => <CarteRegle key={r.cle} r={r} modeles={modeles.data?.data ?? []} admin={isAdmin} onSaved={toutRecharger} />)}</div>}

        <Panel title="File d'attente" hint="Événements en attente d'un prochain passage ou en erreur." flush
          extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => void attente.refetch()} aria-label="Actualiser la file">Actualiser</Button>}>
          {attente.isLoading ? <ListSkeleton rows={2} /> : ev.length === 0
            ? <EmptyState compact icon={<RobotOutlined />} title="Rien en attente" description="Tous les événements ont été traités." />
            : (
              <div className="m-list">
                {ev.map((e) => (
                  <div key={e.id} className="m-item" style={{ cursor: "default" }}>
                    <div className="m-row">
                      <span className="m-title">{LIBELLES_EVENEMENT[e.type] ?? e.type}{lienFiche(e.objet_type, e.objet_id) && <> · <Link to={lienFiche(e.objet_type, e.objet_id)!}>ouvrir la fiche</Link></>}</span>
                      {e.statut === "erreur"
                        ? <Space size={8}><span className="st tone-danger">Erreur</span>{isAdmin && <Button size="small" onClick={() => reessayer(e.id)}>Réessayer</Button>}</Space>
                        : <span className="st tone-info">En attente</span>}
                    </div>
                    <div className="m-sub">
                      {fromNow(e.created_at)} · {e.tentatives} tentative(s){e.statut === "en_attente" ? ` · prochain essai ${fromNow(e.prochaine_tentative)}` : ""}
                      {e.erreur && <div style={{ color: "var(--danger)" }}>{e.erreur}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </Panel>

        <Panel title="Dernières exécutions" flush>
          {runs.isLoading ? <ListSkeleton rows={3} /> : (runs.data?.data ?? []).length === 0
            ? <EmptyState compact icon={<RobotOutlined />} title="Aucune exécution pour le moment" description="Les emails envoyés par les règles apparaîtront ici." />
            : (
              <div className="m-list">
                {(runs.data?.data ?? []).map((x) => (
                  <div key={x.id} className="m-item" style={{ cursor: "default" }}>
                    <div className="m-row">
                      <span className="m-title">{nomRegle(x.automatisation_cle)}{lienFiche(x.objet_type, x.objet_id) && <> · <Link to={lienFiche(x.objet_type, x.objet_id)!}>fiche</Link></>}</span>
                      <span className={`st ${TON_RUN[x.statut] ?? "tone-neutral"}`}>{LIB_RUN[x.statut] ?? x.statut}</span>
                    </div>
                    <div className="m-sub" title={dateTimeFR(x.created_at)}>{fromNow(x.created_at)}{x.detail ? ` · ${x.detail}` : ""}</div>
                  </div>
                ))}
              </div>
            )}
        </Panel>
      </div>
    </>
  );
}
