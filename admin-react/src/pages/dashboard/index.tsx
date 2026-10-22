import { useMemo, useState } from "react";
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
import { eur, eur0, num, variation } from "../../lib/format";
import { kpis, serieMensuelle, taches, useDonnees } from "../../lib/metrics";
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

export function DashboardPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { data: user } = useIdentite();
  const { data, erreur, loading, recharger } = useDonnees();
  const [generation, setGeneration] = useState(false);

  const k = useMemo(() => (data ? kpis(data) : null), [data]);
  const todo = useMemo(() => (data ? taches(data) : []), [data]);
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
      {erreur && <Alert type="warning" showIcon message={erreur} style={{ marginBottom: 16 }} />}

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

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="mini-stats">
          {[
            { v: k ? num(k.clientsActifs) : "—", l: "Clients actifs", to: "/clients?statut=client" },
            { v: k ? num(k.prospects30) : "—", l: "Prospects sur 30 jours", to: "/leads?statut=toutes" },
            { v: k ? eur0(k.devisAttenteMontant) : "—", l: k ? `${k.devisAttenteNb} devis en attente` : "Devis en attente", to: "/devis?statut=envoye" },
            { v: k ? num(k.abosActifs) : "—", l: "Abonnements actifs", to: "/abonnements" },
            { v: k ? num(k.ticketsOuverts) : "—", l: k?.ticketsUrgents ? `Tickets ouverts, dont ${k.ticketsUrgents} urgent${k.ticketsUrgents > 1 ? "s" : ""}` : "Tickets ouverts", to: "/tickets" },
            { v: k ? eur0(k.enRetardMontant) : "—", l: "En retard de paiement", to: "/factures?etat=en_retard" },
          ].map((s) => (
            <button type="button" key={s.to} className="mini-stat" onClick={() => navigate(s.to)}>
              <div className="v tabular">{s.v}</div>
              <div className="l">{s.l}</div>
            </button>
          ))}
        </div>
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
                  <XAxis dataKey="mois" tickLine={false} axisLine={false} tick={{ fill: "#8A93A3", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "#8A93A3", fontSize: 12 }} tickFormatter={(v) => eur0(v)} />
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
