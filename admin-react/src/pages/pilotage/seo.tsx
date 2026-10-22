import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Select } from "antd";
import { EyeOutlined, AimOutlined, SearchOutlined, RiseOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import dayjs from "dayjs";
import { supabaseClient } from "../../supabaseClient";
import { EmptyState, Kpi, PageHeader, Panel } from "../../components/ui";
import { num } from "../../lib/format";
import { COULEURS } from "../../theme";

interface Jour { site: string; jour: string; clics: number; impressions: number; position: number | null }
interface Top { site: string; clics: number; impressions: number; position: number | null; periode_fin: string; requete?: string; page?: string }

const virgule = (x: number, d = 1) => x.toFixed(d).replace(".", ",");
/** Position moyenne pondérée par les impressions (comme Search Console). */
const positionMoyenne = (l: { impressions: number; position: number | null }[]) => {
  const imp = l.reduce((s, x) => s + (x.position != null ? x.impressions : 0), 0);
  return imp > 0 ? l.reduce((s, x) => s + (x.position ?? 0) * x.impressions, 0) / imp : null;
};

function TableTop({ lignes, cle, titre }: { lignes: Top[]; cle: "requete" | "page"; titre: string }) {
  if (!lignes.length) return <EmptyState compact icon={<SearchOutlined />} title="Aucune donnée" />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="lines-table origine-table">
        <thead><tr><th>{titre}</th><th className="num">Clics</th><th className="num">Impressions</th><th className="num">Position</th></tr></thead>
        <tbody>
          {lignes.slice(0, 25).map((l) => (
            <tr key={l[cle]}>
              <td style={{ wordBreak: "break-word" }}>{cle === "page" ? <a className="lien" href={l.page} target="_blank" rel="noopener noreferrer">{l.page!.replace(/^https?:\/\/[^/]+/, "") || "/"}</a> : l.requete}</td>
              <td className="num">{num(l.clics)}</td><td className="num">{num(l.impressions)}</td><td className="num">{l.position != null ? virgule(Number(l.position)) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Chiffres de recherche Google (copie quotidienne de Search Console, lot 12). */
export function StatsSeo() {
  const donnees = useQuery({
    queryKey: ["dhb", "seo"],
    staleTime: 60_000,
    queryFn: async () => {
      const [j, q, p] = await Promise.all([
        supabaseClient.from("seo_quotidien").select("site, jour, clics, impressions, position").order("jour").limit(5000),
        supabaseClient.from("seo_requetes").select("site, requete, clics, impressions, position, periode_fin").order("clics", { ascending: false }).limit(1000),
        supabaseClient.from("seo_pages").select("site, page, clics, impressions, position, periode_fin").order("clics", { ascending: false }).limit(1000),
      ]);
      const e = j.error ?? q.error ?? p.error;
      if (e) throw e;
      return { jours: (j.data ?? []) as Jour[], requetes: (q.data ?? []) as Top[], pages: (p.data ?? []) as Top[] };
    },
  });
  const sites = useMemo(() => [...new Set((donnees.data?.jours ?? []).map((x) => x.site))], [donnees.data]);
  const [site, setSite] = useState<string | undefined>();
  useEffect(() => { if (!site && sites.length) setSite(sites[0]); }, [sites, site]);

  const c = useMemo(() => {
    const jours = (donnees.data?.jours ?? []).filter((x) => x.site === site);
    const clics = jours.reduce((s, x) => s + x.clics, 0);
    const impressions = jours.reduce((s, x) => s + x.impressions, 0);
    return {
      clics, impressions, ctr: impressions > 0 ? (clics / impressions) * 100 : null, position: positionMoyenne(jours),
      serie: jours.map((x) => ({ jour: dayjs(x.jour).format("DD/MM"), clics: x.clics, impressions: x.impressions })),
      fin: jours.length ? dayjs(jours[jours.length - 1].jour).format("DD/MM/YYYY") : null,
      requetes: (donnees.data?.requetes ?? []).filter((x) => x.site === site),
      pages: (donnees.data?.pages ?? []).filter((x) => x.site === site),
    };
  }, [donnees.data, site]);
  const vide = !donnees.isLoading && !donnees.isError && sites.length === 0;

  return (
    <>
      <PageHeader title="SEO" subtitle="Présence dans les résultats Google : clics, impressions, position (Search Console)."
        crumbs={[{ label: "Pilotage" }, { label: "SEO" }]}
        actions={sites.length > 1 ? <Select value={site} onChange={setSite} options={sites.map((s) => ({ value: s, label: s.replace(/^sc-domain:/, "") }))} aria-label="Site" style={{ minWidth: 220 }} /> : undefined} />
      {donnees.isError && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Chiffres de recherche indisponibles" description="La base n'est peut-être pas à jour (supabase/full-setup.sql)." />}
      {vide ? (
        <Panel>
          <EmptyState icon={<SearchOutlined />} title="Pas encore de chiffres Search Console"
            description={<>Une fois les domaines achetés et vérifiés dans Google Search Console, déclarez-les dans <Link to="/systeme/integrations">Système → Intégrations</Link> : les chiffres seront copiés chaque jour.</>} />
        </Panel>
      ) : (
        <div className="section-gap">
          <div className="kpi-grid">
            <Kpi label="Clics (30 j)" icon={<AimOutlined />} loading={donnees.isLoading} value={num(c.clics)} foot={c.fin ? `jusqu'au ${c.fin} (décalage Google de 2-3 jours)` : ""} />
            <Kpi label="Impressions (30 j)" icon={<EyeOutlined />} loading={donnees.isLoading} value={num(c.impressions)} foot="Affichages dans les résultats" />
            <Kpi label="Taux de clic" icon={<RiseOutlined />} loading={donnees.isLoading} value={c.ctr == null ? "—" : `${virgule(c.ctr)} %`} empty={c.ctr == null} foot="Clics / impressions" />
            <Kpi label="Position moyenne" icon={<SearchOutlined />} loading={donnees.isLoading} value={c.position == null ? "—" : virgule(c.position)} empty={c.position == null} foot="1 = premier résultat" />
          </div>
          <Panel title="Clics par jour">
            <div className="chart-box">
              <ResponsiveContainer>
                <BarChart data={c.serie} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#EEF0F3" />
                  <XAxis dataKey="jour" tickLine={false} axisLine={false} tick={{ fill: "#667085", fontSize: 12 }} interval={4} />
                  <YAxis tickLine={false} axisLine={false} width={40} tick={{ fill: "#667085", fontSize: 12 }} allowDecimals={false} />
                  <Tooltip formatter={(v: number, n: string) => [num(v), n === "clics" ? "Clics" : "Impressions"]} cursor={{ fill: "#F2F4F7" }} />
                  <Bar isAnimationActive={false} dataKey="clics" fill={COULEURS.series[0]} radius={[3, 3, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <div className="grid-2">
            <Panel title="Requêtes" hint="Recherches qui ont fait apparaître le site (28 jours)." flush><TableTop lignes={c.requetes} cle="requete" titre="Requête" /></Panel>
            <Panel title="Pages" hint="Pages les plus cliquées (28 jours)." flush><TableTop lignes={c.pages} cle="page" titre="Page" /></Panel>
          </div>
        </div>
      )}
    </>
  );
}
