import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Segmented } from "antd";
import { BarChartOutlined, InboxOutlined, TeamOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabaseClient } from "../../supabaseClient";
import { EmptyState, Kpi, PageHeader, Panel } from "../../components/ui";
import { num } from "../../lib/format";
import { useDonnees } from "../../lib/metrics";
import { label, SOURCES_LEAD } from "../../lib/statuts";
import { COULEURS } from "../../theme";

interface Ligne { jour: string; canal: string; sessions: number; utilisateurs: number; conversions: number }
const taux = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1).replace(".", ",")} %` : "—");

/** Visiteurs (copie quotidienne de Google Analytics) et demandes reçues (base DHB). */
export function StatsAcquisition() {
  const [jours, setJours] = useState(30);
  const depuis = dayjs().subtract(jours, "day").format("YYYY-MM-DD");
  const ga = useQuery({
    queryKey: ["dhb", "analytics", jours],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabaseClient.from("analytics_quotidien").select("jour, canal, sessions, utilisateurs, conversions").gte("jour", depuis).limit(5000);
      if (error) throw error;
      return (data ?? []) as Ligne[];
    },
  });
  const { data: d } = useDonnees();
  const lignes = useMemo(() => ga.data ?? [], [ga.data]);

  const calcul = useMemo(() => {
    const sessions = lignes.reduce((s, l) => s + l.sessions, 0);
    const utilisateurs = lignes.reduce((s, l) => s + l.utilisateurs, 0);
    const parJour = new Map<string, number>();
    const parCanal = new Map<string, { sessions: number; utilisateurs: number; conversions: number }>();
    lignes.forEach((l) => {
      parJour.set(l.jour, (parJour.get(l.jour) ?? 0) + l.sessions);
      const c = parCanal.get(l.canal) ?? { sessions: 0, utilisateurs: 0, conversions: 0 };
      c.sessions += l.sessions; c.utilisateurs += l.utilisateurs; c.conversions += l.conversions;
      parCanal.set(l.canal, c);
    });
    const serie = Array.from({ length: jours }, (_, i) => {
      const j = dayjs().subtract(jours - i, "day");
      return { jour: j.format("DD/MM"), sessions: parJour.get(j.format("YYYY-MM-DD")) ?? 0 };
    });
    const demandes = (d?.leads ?? []).filter((l) => l.type !== "question" && l.created_at.slice(0, 10) >= depuis);
    const origines = [...SOURCES_LEAD.map((s) => s.value), null].map((s) => ({ source: s, n: demandes.filter((l) => (l.source ?? null) === s).length })).filter((x) => x.n > 0);
    return { sessions, utilisateurs, serie, canaux: [...parCanal.entries()].sort((a, b) => b[1].sessions - a[1].sessions), demandes: demandes.length, origines };
  }, [lignes, d, jours, depuis]);

  const sansDonnees = !ga.isLoading && lignes.length === 0;
  return (
    <>
      <PageHeader title="Acquisition" subtitle="D'où viennent vos visiteurs et combien deviennent des demandes."
        crumbs={[{ label: "Pilotage" }, { label: "Acquisition" }]}
        actions={<Segmented value={jours} onChange={(v) => setJours(Number(v))} options={[{ value: 30, label: "30 jours" }, { value: 90, label: "90 jours" }]} aria-label="Période" />} />
      {ga.isError && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Chiffres de visite indisponibles" description="La base n'est peut-être pas à jour (supabase/full-setup.sql)." />}
      {sansDonnees && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Aucun chiffre de visite pour l'instant"
          description={<>Connectez Google et renseignez la propriété GA4 dans <Link to="/systeme/integrations">Système → Intégrations</Link> : les visites seront copiées chaque jour. Les demandes ci-dessous viennent de DHB et sont déjà à jour.</>} />
      )}
      <div className="section-gap">
        <div className="kpi-grid">
          <Kpi label={`Sessions (${jours} j)`} icon={<BarChartOutlined />} loading={ga.isLoading} value={sansDonnees ? "—" : num(calcul.sessions)} empty={sansDonnees} foot="Source : Google Analytics" />
          <Kpi label={`Visiteurs (${jours} j)`} icon={<TeamOutlined />} loading={ga.isLoading} value={sansDonnees ? "—" : num(calcul.utilisateurs)} empty={sansDonnees} foot="Utilisateurs distincts (Google Analytics)" />
          <Kpi label={`Demandes reçues (${jours} j)`} icon={<InboxOutlined />} value={num(calcul.demandes)} foot="Formulaires et saisies (DHB)" to="/leads?statut=toutes" />
          <Kpi label="Demandes pour 100 sessions" icon={<InboxOutlined />} value={sansDonnees ? "—" : taux(calcul.demandes, calcul.sessions)} empty={sansDonnees} foot="Taux de transformation des visites" />
        </div>
        {!sansDonnees && (
          <Panel title="Sessions par jour">
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={calcul.serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF0F3" />
                  <XAxis dataKey="jour" tickLine={false} axisLine={false} tick={{ fill: "#667085", fontSize: 12 }} interval={jours > 30 ? 13 : 4} />
                  <YAxis tickLine={false} axisLine={false} width={40} tick={{ fill: "#667085", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [num(v), "Sessions"]} cursor={{ fill: "#F2F4F7" }} />
                  <Bar isAnimationActive={false} dataKey="sessions" fill={COULEURS.series[0]} radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        )}
        <div className="grid-2">
          <Panel title="Visites par canal" hint="Regroupement de Google Analytics." flush>
            {sansDonnees ? <EmptyState compact icon={<BarChartOutlined />} title="Pas encore de chiffres" /> : (
              <table className="lines-table origine-table">
                <thead><tr><th>Canal</th><th className="num">Sessions</th><th className="num">Événements clés</th></tr></thead>
                <tbody>{calcul.canaux.map(([c, v]) => <tr key={c}><td>{c}</td><td className="num">{num(v.sessions)}</td><td className="num">{num(v.conversions)}</td></tr>)}</tbody>
              </table>
            )}
          </Panel>
          <Panel title="Demandes par origine" hint="Enregistrée avec chaque demande (DHB)." flush>
            {calcul.origines.length === 0 ? <EmptyState compact icon={<InboxOutlined />} title="Aucune demande sur la période" /> : (
              <table className="lines-table origine-table">
                <thead><tr><th>Origine</th><th className="num">Demandes</th></tr></thead>
                <tbody>{calcul.origines.map((o) => <tr key={o.source ?? "x"}><td><Link to={`/leads?statut=toutes&source=${o.source ?? "inconnue"}`}>{o.source ? label("source", o.source) : "Non renseignée"}</Link></td><td className="num">{num(o.n)}</td></tr>)}</tbody>
              </table>
            )}
          </Panel>
        </div>
        <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>Les visites ne sont comptées que pour les visiteurs ayant accepté la mesure d'audience (bandeau cookies) ; elles sont donc inférieures à la fréquentation réelle.</p>
      </div>
    </>
  );
}
