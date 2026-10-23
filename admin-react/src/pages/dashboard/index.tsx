import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabaseClient } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { Alert, App, Button } from "antd";
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  EuroOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, Kpi, PageHeader, Panel } from "../../components/ui";
import { ActivityFeed } from "../../components/activity/ActivityFeed";
import { eur, eur0, num, pct, variation } from "../../lib/format";
import { blocsTableau, kpis, serieMensuelle, taches, useDonnees, valeurTaux, type Taux } from "../../lib/metrics";
import { label } from "../../lib/statuts";
import { useIdentite } from "../../lib/hooks";
import { appelerFonction } from "../../lib/functions";
import { COULEURS } from "../../theme";

const TON: Record<string, { bg: string; fg: string }> = {
  primary: { bg: "#EEF3FF", fg: "#1D40AB" },
  info: { bg: "#EFF8FF", fg: "#0369A1" },
  success: { bg: "#ECFDF3", fg: "#15803D" },
  warning: { bg: "#FFF7E8", fg: "#B45309" },
  danger: { bg: "#FEF1F1", fg: "#C02B2B" },
};

export function TooltipEur({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E3E7ED", borderRadius: 8, padding: "8px 12px", boxShadow: "0 8px 24px rgba(16,24,40,.08)", fontSize: 13 }}>
      <div style={{ fontWeight: 600, marginBottom: 4, textTransform: "capitalize" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
          <span style={{ color: "#5B6576" }}><i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: p.color, marginRight: 6 }} />{p.name}</span>
          <b className="tabular">{eur(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

const tauxTxt = (t: Taux) => { const v = valeurTaux(t); return v == null ? "—" : `${Math.round(v)} %`; };

interface LigneBloc { l: string; v: string; sous?: string; delta?: number | null; to: string }

/** Bloc d'indicateurs : chaque ligne ouvre la liste ou l'analyse correspondante. */
function Bloc(props: { titre: string; hint?: string; lignes: LigneBloc[]; loading?: boolean; vide?: string }) {
  const navigate = useNavigate();
  return (
    <Panel title={props.titre} hint={props.hint} flush>
      {props.loading ? (
        <div style={{ padding: 18 }}><div className="skel" style={{ height: 120 }} /></div>
      ) : props.vide ? (
        <p className="faint" style={{ padding: "16px 18px", margin: 0 }}>{props.vide}</p>
      ) : (
        <ul className="bloc-lignes">
          {props.lignes.map((x) => (
            <li key={x.l}>
              <button type="button" className="bloc-ligne" onClick={() => navigate(x.to)}>
                <span className="l">{x.l}{x.sous && <span className="s">{x.sous}</span>}</span>
                <span className="v tabular">
                  {x.v}
                  {x.delta != null && <span className={`delta ${x.delta > 0 ? "up" : x.delta < 0 ? "down" : "flat"}`} title="vs 30 jours précédents">{pct(x.delta, 0)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { data: user } = useIdentite();
  const { data, erreur, loading, recharger } = useDonnees();
  const [generation, setGeneration] = useState(false);

  const k = useMemo(() => (data ? kpis(data) : null), [data]);
  const todo = useMemo(() => (data ? taches(data) : []), [data]);
  const b = useMemo(() => (data ? blocsTableau(data) : null), [data]);
  // Visites des 30 derniers jours (copie Google Analytics, lot 10) : affichées seulement si disponibles.
  const visites = useQuery({
    queryKey: ["dhb", "visites-30j"],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data: v, error } = await supabaseClient.from("analytics_quotidien").select("sessions").gte("jour", dayjs().subtract(30, "day").format("YYYY-MM-DD")).limit(5000);
      if (error || !v?.length) return null;
      return v.reduce((s, x: { sessions: number }) => s + (Number(x.sessions) || 0), 0);
    },
  });
  const serie = useMemo(() => (data ? serieMensuelle(data.factures) : []), [data]);
  const aDuCA = serie.some((s) => s.encaisse > 0);

  const prenom = (user?.name ?? "").split(/[\s@]/)[0];
  const moisNom = dayjs().format("MMMM");

  const generer = async () => {
    setGeneration(true);
    const r = await appelerFonction<{ generees: number }>("generate-recurring-invoices");
    setGeneration(false);
    if (r.ok) {
      message.success(r.data?.generees ? `${r.data.generees} facture(s) créée(s) en brouillon` : "Aucune facture à générer aujourd'hui");
      recharger();
    } else message.error(r.message);
  };

  return (
    <>
      <PageHeader
        title={prenom ? `Bonjour ${prenom}` : "Tableau de bord"}
        subtitle={`Situation au ${dayjs().format("dddd D MMMM YYYY")}`}
      />
      {erreur && <Alert type="warning" showIcon message={erreur} action={<Button size="small" onClick={recharger}>Réessayer</Button>} style={{ marginBottom: 16 }} />}
      {data?.partiel && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Chiffres partiels" description="Une table dépasse 50 000 lignes : seules les 50 000 premières sont prises en compte. Prévenez l'administrateur (calculs à déplacer côté base)." />}

      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <Kpi
          label={`Encaissé en ${moisNom}`}
          icon={<EuroOutlined />}
          loading={loading}
          value={k ? eur0(k.caMois) : "—"}
          delta={k ? variation(k.caMois, k.caMoisPrec) : null}
          foot={k && variation(k.caMois, k.caMoisPrec) == null ? "Pas de comparaison avec le mois dernier" : "vs mois précédent"}
          to="/pilotage/chiffre-affaires"
        />
        <Kpi
          label={`Encaissé en ${dayjs().year()}`}
          icon={<CalendarOutlined />}
          loading={loading}
          value={k ? eur0(k.caAnnee) : "—"}
          delta={k ? variation(k.caAnnee, k.caAnneePrec) : null}
          foot={k && variation(k.caAnnee, k.caAnneePrec) == null ? `Total encaissé : ${eur0(k.caTotal)}` : "vs même période l'an dernier"}
          to="/pilotage/chiffre-affaires"
        />
        <Kpi
          label="Revenu récurrent (MRR)"
          icon={<RiseOutlined />}
          loading={loading}
          value={k ? eur0(k.mrr) : "—"}
          foot={k ? `${num(k.abosActifs)} abonnement${k.abosActifs > 1 ? "s" : ""} actif${k.abosActifs > 1 ? "s" : ""} · ARR ${eur0(k.arr)}` : ""}
          to="/pilotage/recurrent"
        />
        <Kpi
          label="À encaisser"
          icon={<ExclamationCircleOutlined />}
          loading={loading}
          value={k ? eur0(k.impayeesMontant) : "—"}
          foot={k ? (k.impayeesNb === 0 ? "Aucune facture en attente" : `${k.impayeesNb} facture${k.impayeesNb > 1 ? "s" : ""}${k.enRetardNb ? ` · ${k.enRetardNb} en retard` : ""}`) : ""}
          to={k && k.enRetardNb ? "/factures?etat=en_retard" : "/factures?statut=envoyee"}
        />
      </div>

      <div className="split" style={{ marginBottom: 20 }}>
        <Panel title="À faire aujourd'hui" hint="Cliquez sur une ligne pour ouvrir la liste correspondante." flush>
          {loading ? (
            <div style={{ padding: 18 }}><div className="skel" style={{ height: 40, marginBottom: 10 }} /><div className="skel" style={{ height: 40, marginBottom: 10 }} /><div className="skel" style={{ height: 40 }} /></div>
          ) : todo.length === 0 ? (
            <EmptyState icon={<CheckCircleOutlined />} title="Rien d'urgent aujourd'hui"
              description="Aucune demande en attente, aucune facture en retard, aucun ticket urgent. Les nouvelles tâches apparaîtront ici automatiquement." />
          ) : (
            <div className="todo-list">
              {todo.map((t) => (
                <div key={t.cle} className="todo-row">
                  <button type="button" className="todo" onClick={() => navigate(t.to)}>
                    <span className="count" style={{ background: TON[t.ton].bg, color: TON[t.ton].fg }}>{t.nombre}</span>
                    <span className="txt"><b>{t.titre.charAt(0).toUpperCase() + t.titre.slice(1)}</b>{t.detail && <div>{t.detail}</div>}</span>
                    {t.action !== "generer" && <RightOutlined className="chev" />}
                  </button>
                  {t.action === "generer" && (
                    <Button size="small" loading={generation} onClick={generer}>Générer</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Activité récente" extra={<Button type="link" size="small" onClick={() => navigate("/systeme/journal")}>Tout le journal</Button>} flush>
          <ActivityFeed limit={9} />
        </Panel>
      </div>

      <div className="blocs-tableau" style={{ marginBottom: 20 }}>
        <Bloc titre="Commercial" hint="30 derniers jours (taux : 90 jours)" loading={loading} lignes={b ? [
          { l: "Demandes reçues", v: num(b.commercial.demandes30), delta: variation(b.commercial.demandes30, b.commercial.demandes30Prec), to: "/leads?statut=toutes" },
          { l: "Taux de transformation", v: tauxTxt(b.commercial.transformation90), sous: `${b.commercial.transformation90.n} gagnée(s) / ${b.commercial.transformation90.d}`, to: "/pilotage/commercial" },
          { l: "Devis acceptés", v: tauxTxt(b.commercial.acceptation90), sous: `${b.commercial.acceptation90.n} / ${b.commercial.acceptation90.d} envoyé(s)`, to: "/devis?statut=accepte" },
          { l: "Devis en attente", v: eur0(b.commercial.devisAttenteMontant), sous: `${b.commercial.devisAttenteNb} devis`, to: "/devis?statut=envoye" },
          { l: "Devis à relancer", v: num(b.commercial.devisARelancer), to: "/devis?statut=envoye&relance=due" },
          { l: "Relances de prospects dues", v: num(b.commercial.relancesDues), to: "/leads?relance=due" },
        ] : []} />
        <Bloc titre="Clients" loading={loading} lignes={b ? [
          { l: "Clients actifs", v: num(b.clients.actifs), to: "/clients?statut=client" },
          { l: "Prospects", v: num(b.clients.prospects), to: "/clients?statut=prospect" },
          { l: "Nouvelles fiches (30 j)", v: num(b.clients.nouveaux30), to: "/clients" },
          { l: "Clients inactifs", v: num(b.clients.inactifs), to: "/clients?statut=inactif" },
          { l: "Tickets ouverts", v: num(b.clients.ticketsOuverts), sous: b.clients.ticketsUrgents ? `dont ${b.clients.ticketsUrgents} urgent(s)` : undefined, to: "/tickets" },
        ] : []} />
        <Bloc titre="Finance" hint="Panier et délai : 12 derniers mois" loading={loading} lignes={b ? [
          { l: `Facturé en ${moisNom}`, v: eur0(b.finance.factureMois), sous: `encaissé : ${eur0(b.finance.encaisseMois)}`, to: "/pilotage/chiffre-affaires" },
          { l: "À encaisser", v: eur0(b.finance.aEncaisser), to: "/factures?statut=envoyee" },
          { l: "En retard de paiement", v: eur0(b.finance.retardMontant), sous: `${b.finance.retardNb} facture(s)`, to: "/factures?etat=en_retard" },
          { l: "Panier moyen", v: b.finance.panierMoyen == null ? "—" : eur0(b.finance.panierMoyen), sous: b.finance.panierMoyen == null ? "aucune facture payée" : "par facture payée", to: "/factures?statut=payee" },
          { l: "Délai moyen de paiement", v: b.finance.delaiPaiementMoyen == null ? "—" : `${Math.round(b.finance.delaiPaiementMoyen)} j`, to: "/factures?statut=payee" },
          { l: "Abonnements à facturer", v: num(b.finance.aboAFacturer), to: "/abonnements?alerte=facture" },
        ] : []} />
        <Bloc titre="Acquisition" hint="Origine des demandes, 30 derniers jours" loading={loading}
          vide={b && b.acquisition.total30 === 0 && !visites.data ? "Aucune demande ces 30 derniers jours." : undefined}
          lignes={b ? [...(visites.data ? [{
            l: "Visites (Google Analytics)", v: num(visites.data),
            sous: `${b.acquisition.total30} demande(s), soit ${((b.acquisition.total30 / visites.data) * 100).toFixed(1).replace(".", ",")} %`, to: "/pilotage/acquisition",
          }] : []), ...b.acquisition.origines.map((o) => ({
            l: o.source ? label("source", o.source) : "Non renseignée",
            v: num(o.nombre),
            sous: `${Math.round((o.nombre / Math.max(b.acquisition.total30, 1)) * 100)} %`,
            to: `/leads?statut=toutes&source=${o.source ?? "inconnue"}`,
          }))] : []} />
      </div>

      <Panel title="Chiffre d'affaires — 12 derniers mois" hint="Encaissé (factures payées) et facturé (envoyées ou payées), en euros."
        extra={<Button type="link" size="small" onClick={() => navigate("/pilotage/chiffre-affaires")}>Analyse détaillée</Button>}>
        {loading ? (
          <div className="skel" style={{ height: 260 }} />
        ) : !aDuCA && !serie.some((s) => s.facture > 0) ? (
          <EmptyState icon={<BarChartOutlined />} title="Pas encore de chiffre d'affaires"
            description="Le graphique se remplira dès vos premières factures envoyées ou payées."
            action={<Button type="primary" onClick={() => navigate("/factures/nouvelle")}>Créer une facture</Button>} />
        ) : (
          <>
            <div className="legend-inline" style={{ marginBottom: 8 }}>
              <span><i style={{ background: COULEURS.series[0] }} />Encaissé</span>
              <span><i style={{ background: "#C7D2FE" }} />Facturé</span>
            </div>
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={serie} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="#EEF0F3" />
                  <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fill: "#667085", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "#667085", fontSize: 12 }} tickFormatter={(v) => eur0(v)} />
                  <Tooltip content={<TooltipEur />} cursor={{ fill: "#F2F4F7" }} />
                  <Bar isAnimationActive={false} dataKey="facture" name="Facturé" fill="#C7D2FE" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar isAnimationActive={false} dataKey="encaisse" name="Encaissé" fill={COULEURS.series[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Panel>
    </>
  );
}
