import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Segmented, Select } from "antd";
import { BarChartOutlined, EuroOutlined, FileTextOutlined, InboxOutlined, RiseOutlined, TeamOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, Kpi, PageHeader, Panel } from "../../components/ui";
import { TooltipEur } from "../dashboard";
import { eur, eur0, num, variation } from "../../lib/format";
import { caEncaisse, caFacture, dateEncaissement, mrr, serieMensuelle, useDonnees, type Donnees, type F } from "../../lib/metrics";
import { ENTITES, SOURCES_LEAD } from "../../lib/statuts";
import { COULEURS } from "../../theme";

type Periode = "annee" | "12m" | "tout";
const bornes = (p: Periode): [Dayjs, Dayjs] => {
  const fin = dayjs().add(1, "day").startOf("day");
  if (p === "annee") return [dayjs().startOf("year"), fin];
  if (p === "12m") return [dayjs().startOf("month").subtract(11, "month"), fin];
  return [dayjs("2000-01-01"), fin];
};
const dans = (d: string | null | undefined, [a, b]: [Dayjs, Dayjs]) => !!d && !dayjs(d).isBefore(a) && dayjs(d).isBefore(b);
const tauxTxt = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(0)} %` : "—");

function SelecteurPeriode({ value, onChange }: { value: Periode; onChange: (p: Periode) => void }) {
  return <Segmented value={value} onChange={(v) => onChange(v as Periode)} options={[{ value: "annee", label: `${dayjs().year()}` }, { value: "12m", label: "12 derniers mois" }, { value: "tout", label: "Depuis le début" }]} />;
}

function Cadre({ titre, sousTitre, actions, children }: { titre: string; sousTitre: string; actions?: ReactNode; children: (d: Donnees) => ReactNode }) {
  const { data, erreur, loading, recharger } = useDonnees();
  return (
    <>
      <PageHeader title={titre} subtitle={sousTitre} crumbs={[{ label: "Pilotage" }, { label: titre }]} actions={actions} />
      {erreur && <Alert type="warning" showIcon message={erreur} action={<Button size="small" onClick={recharger}>Réessayer</Button>} style={{ marginBottom: 16 }} />}
      {data?.partiel && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Chiffres partiels" description="Une table dépasse 50 000 lignes : seules les 50 000 premières sont prises en compte. Prévenez l'administrateur (calculs à déplacer côté base)." />}
      {loading && <div className="kpi-grid">{[0, 1, 2, 3].map((i) => <Kpi key={i} label="…" value="" loading />)}</div>}
      {data && children(data)}
    </>
  );
}

/** Barres horizontales simples (répartitions), échelle commune. */
function Repartition({ items, format = eur0 }: { items: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (max <= 0) return <EmptyState compact icon={<BarChartOutlined />} title="Pas encore de données" description="Cette répartition apparaîtra avec vos premières données réelles." />;
  return (
    <div className="funnel">
      {items.map((i, k) => (
        <div className="funnel-row" key={i.label}>
          <span>{i.label}</span>
          <div className="funnel-bar"><div style={{ width: `${(i.value / max) * 100}%`, background: COULEURS.series[k % COULEURS.series.length] }} /></div>
          <span className="v">{format(i.value)}</span>
        </div>
      ))}
    </div>
  );
}

function GraphMensuel({ serie }: { serie: { mois: string; encaisse: number; facture: number }[] }) {
  if (!serie.some((s) => s.encaisse > 0 || s.facture > 0))
    return <EmptyState icon={<BarChartOutlined />} title="Pas encore de chiffre d'affaires sur la période" description="Le graphique se remplit avec vos factures envoyées et payées." />;
  return (
    <>
      <div className="legend-inline" style={{ marginBottom: 8 }}><span><i style={{ background: COULEURS.series[0] }} />Encaissé</span><span><i style={{ background: "#C7D2FE" }} />Facturé</span></div>
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
  );
}

const typeDeFacture = (f: F, d: Donnees) => {
  const c = f.client_id ? d.clients.find((x) => x.id === f.client_id) : null;
  if (c) return c.type;
  return f.entity === "particuliers" ? "particulier" : "entreprise";
};

/* ======================= Statistiques (vue d'ensemble) ======================= */
export function StatsOverview() {
  const [p, setP] = useState<Periode>("annee");
  const navigate = useNavigate();
  return (
    <Cadre titre="Statistiques" sousTitre="Vue d'ensemble, calculée uniquement sur vos données enregistrées." actions={<SelecteurPeriode value={p} onChange={setP} />}>
      {(d) => {
        const b = bornes(p);
        const enc = caEncaisse(d.factures, ...b);
        const fac = caFacture(d.factures, ...b);
        const payees = d.factures.filter((f) => f.status === "payee" && dans(dateEncaissement(f).toISOString(), b));
        const impayees = d.factures.filter((f) => f.status === "envoyee");
        const devisP = d.devis.filter((x) => dans(x.date_devis, b));
        const envoyes = devisP.filter((x) => ["envoye", "accepte", "refuse", "expire"].includes(x.statut));
        const acceptes = devisP.filter((x) => x.statut === "accepte");
        const leadsP = d.leads.filter((l) => l.type !== "question" && dans(l.created_at, b));
        const convertis = leadsP.filter((l) => l.client_id);
        const parType = ["entreprise", "particulier"].map((t) => ({ label: t === "entreprise" ? "Entreprises" : "Particuliers", value: payees.filter((f) => typeDeFacture(f, d) === t).reduce((s, f) => s + f.total_ttc, 0) }));
        const parActivite = ENTITES.map((e) => ({ label: e.label, value: payees.filter((f) => f.entity === e.value).reduce((s, f) => s + f.total_ttc, 0) }));
        const serie = p === "tout" ? serieMensuelle(d.factures, 12) : serieMensuelle(d.factures, p === "annee" ? dayjs().month() + 1 : 12);
        return (
          <div className="section-gap">
            <div className="kpi-grid">
              <Kpi label="CA encaissé" icon={<EuroOutlined />} value={eur0(enc)} foot={`${payees.length} facture${payees.length > 1 ? "s" : ""} payée${payees.length > 1 ? "s" : ""}`} to="/pilotage/chiffre-affaires" />
              <Kpi label="CA facturé" icon={<FileTextOutlined />} value={eur0(fac)} foot="Factures envoyées ou payées" />
              <Kpi label="Factures impayées" icon={<EuroOutlined />} value={eur0(impayees.reduce((s, f) => s + f.reste_a_payer, 0))} foot={`${impayees.length} en attente · ${impayees.filter((f) => f.en_retard).length} en retard`} to="/factures?statut=envoyee" />
              <Kpi label="MRR / ARR" icon={<RiseOutlined />} value={eur0(mrr(d.abonnements))} foot={`ARR ${eur0(mrr(d.abonnements) * 12)}`} to="/pilotage/recurrent" />
            </div>
            <div className="kpi-grid">
              <Kpi label="Devis envoyés" icon={<FileTextOutlined />} value={num(envoyes.length)} foot={`${eur0(envoyes.reduce((s, x) => s + x.total_ttc, 0))} proposés`} to="/devis" />
              <Kpi label="Devis acceptés" icon={<FileTextOutlined />} value={num(acceptes.length)} foot={`Taux d'acceptation : ${tauxTxt(acceptes.length, envoyes.length)}`} to="/devis?statut=accepte" />
              <Kpi label="Demandes reçues" icon={<InboxOutlined />} value={num(leadsP.length)} foot={`${d.leads.filter((l) => l.type === "question" && dans(l.created_at, b)).length} question(s) en plus`} to="/leads?statut=toutes" />
              <Kpi label="Conversion demandes → clients" icon={<TeamOutlined />} value={tauxTxt(convertis.length, leadsP.length)} foot={`${convertis.length} demande(s) devenue(s) client`} to="/pilotage/commercial" />
            </div>
            <Panel title="Chiffre d'affaires mensuel" extra={<Button type="link" size="small" onClick={() => navigate("/pilotage/chiffre-affaires")}>Détail</Button>}><GraphMensuel serie={serie} /></Panel>
            <div className="grid-2">
              <Panel title="Encaissé : particuliers / entreprises"><Repartition items={parType} /></Panel>
              <Panel title="Encaissé par activité"><Repartition items={parActivite} /></Panel>
            </div>
          </div>
        );
      }}
    </Cadre>
  );
}

/* ======================= Chiffre d'affaires ======================= */
export function StatsCA() {
  const [annee, setAnnee] = useState(dayjs().year());
  return (
    <Cadre titre="Chiffre d'affaires" sousTitre="Encaissé = factures payées (date de paiement). Facturé = factures envoyées ou payées (date de facture)."
      actions={<Select value={annee} onChange={setAnnee} style={{ width: 120 }} aria-label="Année" options={Array.from({ length: 5 }, (_, i) => dayjs().year() - i).map((y) => ({ value: y, label: String(y) }))} />}>
      {(d) => {
        const debut = dayjs(`${annee}-01-01`);
        const mois = Array.from({ length: 12 }, (_, i) => {
          const m = debut.add(i, "month");
          const mPrec = m.subtract(1, "year");
          return {
            mois: m.format("MMM").replace(".", ""),
            encaisse: Math.round(caEncaisse(d.factures, m, m.add(1, "month"))),
            facture: Math.round(caFacture(d.factures, m, m.add(1, "month"))),
            prec: Math.round(caEncaisse(d.factures, mPrec, mPrec.add(1, "month"))),
          };
        });
        const total = mois.reduce((s, m) => s + m.encaisse, 0);
        const totalFact = mois.reduce((s, m) => s + m.facture, 0);
        const totalPrec = mois.reduce((s, m) => s + m.prec, 0);
        const v = variation(total, totalPrec);
        const payees = d.factures.filter((f) => f.status === "payee" && dateEncaissement(f).year() === annee);
        const parClient = new Map<string, number>();
        payees.forEach((f) => parClient.set(f.client_nom || "Sans client", (parClient.get(f.client_nom || "Sans client") ?? 0) + f.total_ttc));
        const top = [...parClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([l, val]) => ({ label: l, value: val }));
        const moisActifs = mois.filter((m) => m.encaisse > 0).length;
        return (
          <div className="section-gap">
            <div className="kpi-grid">
              <Kpi label={`Encaissé ${annee}`} icon={<EuroOutlined />} value={eur0(total)} delta={v} foot={v == null ? `Pas de données ${annee - 1} pour comparer` : `vs ${annee - 1}`} />
              <Kpi label={`Facturé ${annee}`} icon={<FileTextOutlined />} value={eur0(totalFact)} foot="Envoyé ou payé" />
              <Kpi label="Moyenne par mois encaissé" icon={<EuroOutlined />} value={moisActifs ? eur0(total / moisActifs) : "—"} empty={!moisActifs} foot={moisActifs ? `Sur ${moisActifs} mois avec encaissement` : "Aucun encaissement"} />
              <Kpi label="Panier moyen" icon={<EuroOutlined />} value={payees.length ? eur0(total / payees.length) : "—"} empty={!payees.length} foot={`${payees.length} facture(s) payée(s)`} />
            </div>
            <Panel title={`Mois par mois — ${annee}`}><GraphMensuel serie={mois} /></Panel>
            <div className="grid-2">
              <Panel title="Principaux clients (encaissé)"><Repartition items={top} /></Panel>
              <Panel title="Détail mensuel" flush>
                <div style={{ overflowX: "auto" }}>
                  <table className="lines-table" style={{ fontSize: 13.5 }}>
                    <thead><tr><th style={{ paddingLeft: 18 }}>Mois</th><th className="num">Facturé</th><th className="num">Encaissé</th><th className="num" style={{ paddingRight: 18 }}>{annee - 1}</th></tr></thead>
                    <tbody>
                      {mois.map((m) => (
                        <tr key={m.mois}><td style={{ paddingLeft: 18, textTransform: "capitalize" }}>{m.mois}</td><td className="num tabular">{eur0(m.facture)}</td><td className="num tabular"><b>{eur0(m.encaisse)}</b></td><td className="num tabular faint" style={{ paddingRight: 18 }}>{m.prec ? eur0(m.prec) : "—"}</td></tr>
                      ))}
                      <tr><td style={{ paddingLeft: 18 }}><b>Total</b></td><td className="num tabular"><b>{eur0(totalFact)}</b></td><td className="num tabular"><b>{eur0(total)}</b></td><td className="num tabular" style={{ paddingRight: 18 }}>{totalPrec ? eur0(totalPrec) : "—"}</td></tr>
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          </div>
        );
      }}
    </Cadre>
  );
}

/* ======================= Récurrent ======================= */
export function StatsRecurrent() {
  return (
    <Cadre titre="Récurrent (MRR / ARR)" sousTitre="Revenu récurrent issu des abonnements actifs.">
      {(d) => {
        const actifs = d.abonnements.filter((a) => a.statut === "actif");
        const m = mrr(d.abonnements);
        const parActivite = ENTITES.map((e) => ({ label: e.label, value: actifs.filter((a) => a.entity === e.value).reduce((s, a) => s + a.montant_mensuel, 0) }));
        const factAbo = d.factures.filter((f) => f.abonnement_id && f.status === "payee");
        const serie = Array.from({ length: 12 }, (_, i) => {
          const mo = dayjs().startOf("month").subtract(11 - i, "month");
          return { mois: mo.format("MMM YY").replace(".", ""), encaisse: Math.round(caEncaisse(factAbo, mo, mo.add(1, "month"))), facture: Math.round(caFacture(d.factures.filter((f) => f.abonnement_id), mo, mo.add(1, "month"))) };
        });
        return (
          <div className="section-gap">
            <div className="kpi-grid">
              <Kpi label="MRR" icon={<RiseOutlined />} value={eur0(m)} foot="Somme mensuelle des abonnements actifs" />
              <Kpi label="ARR" icon={<RiseOutlined />} value={eur0(m * 12)} foot="MRR × 12 (projection)" />
              <Kpi label="Abonnements actifs" icon={<TeamOutlined />} value={actifs.length} to="/abonnements" foot={`${d.abonnements.filter((a) => a.statut === "resilie").length} résilié(s) au total`} />
              <Kpi label="Revenu moyen par abonnement" icon={<EuroOutlined />} value={actifs.length ? eur(m / actifs.length) : "—"} empty={!actifs.length} foot="Par mois" />
            </div>
            <div className="grid-2">
              <Panel title="MRR par activité"><Repartition items={parActivite} /></Panel>
              <Panel title="Abonnements actifs (par montant)">
                <Repartition items={[...actifs].sort((a, b) => b.montant_mensuel - a.montant_mensuel).slice(0, 8).map((a) => ({ label: a.client_nom || a.libelle || "—", value: a.montant_mensuel }))} format={(n) => `${eur0(n)}/mois`} />
              </Panel>
            </div>
            <Panel title="Factures d'abonnement — 12 derniers mois" hint="Historique réel des factures émises pour les abonnements (le MRR passé n'est pas reconstitué).">
              <GraphMensuel serie={serie} />
            </Panel>
          </div>
        );
      }}
    </Cadre>
  );
}

/* ======================= Performance commerciale ======================= */
export function StatsCommercial() {
  const [p, setP] = useState<Periode>("annee");
  return (
    <Cadre titre="Performance commerciale" sousTitre="Du premier contact à la signature." actions={<SelecteurPeriode value={p} onChange={setP} />}>
      {(d) => {
        const b = bornes(p);
        const leads = d.leads.filter((l) => l.type !== "question" && dans(l.created_at, b));
        const contactes = leads.filter((l) => !["nouveau", "a_contacter"].includes(l.status));
        const avecDevis = leads.filter((l) => ["devis_envoye", "gagne"].includes(l.status) || d.devis.some((x) => x.lead_id === l.id && x.statut !== "brouillon"));
        const gagnes = leads.filter((l) => l.status === "gagne");
        const funnel = [
          { label: "Demandes reçues", value: leads.length },
          { label: "Contactées", value: contactes.length },
          { label: "Devis envoyé", value: avecDevis.length },
          { label: "Gagnées", value: gagnes.length },
        ];
        const devis = d.devis.filter((x) => dans(x.date_devis, b));
        const envoyes = devis.filter((x) => ["envoye", "accepte", "refuse", "expire"].includes(x.statut));
        const acceptes = devis.filter((x) => x.statut === "accepte");
        const refuses = devis.filter((x) => x.statut === "refuse");
        const delais = acceptes.filter((x) => x.signed_at && (x.envoye_at || x.created_at)).map((x) => dayjs(x.signed_at!).diff(dayjs(x.envoye_at ?? x.created_at), "day"));
        const delaiMoyen = delais.length ? delais.reduce((a, c) => a + c, 0) / delais.length : null;
        const convertis = leads.filter((l) => l.client_id);
        const parSource = ENTITES.map((e) => ({ label: e.label, value: leads.filter((l) => l.entity === e.value).length }));
        // Origine du contact : demandes reçues, gagnées et taux de transformation par origine.
        const parOrigine = [...SOURCES_LEAD.map((s) => ({ cle: s.value, label: s.label })), { cle: null as string | null, label: "Non renseignée" }]
          .map((o) => {
            const ls = leads.filter((l) => (l.source ?? null) === o.cle);
            return { ...o, demandes: ls.length, gagnees: ls.filter((l) => l.status === "gagne").length };
          })
          .filter((o) => o.demandes > 0)
          .sort((a, b) => b.demandes - a.demandes);
        const parType = [
          { label: "Entreprises", value: leads.filter((l) => l.type_client === "entreprise").length },
          { label: "Particuliers", value: leads.filter((l) => l.type_client === "particulier").length },
          { label: "Non précisé", value: leads.filter((l) => !l.type_client).length },
        ];
        const statuts = [
          { name: "Acceptés", value: acceptes.length, color: COULEURS.success },
          { name: "En attente", value: devis.filter((x) => x.statut === "envoye").length, color: COULEURS.series[0] },
          { name: "Refusés", value: refuses.length, color: COULEURS.danger },
          { name: "Expirés", value: devis.filter((x) => x.statut === "expire").length, color: COULEURS.series[4] },
        ].filter((s) => s.value > 0);
        return (
          <div className="section-gap">
            <div className="kpi-grid">
              <Kpi label="Taux de transformation" icon={<TeamOutlined />} value={tauxTxt(gagnes.length, leads.length)} foot={`${gagnes.length} gagnée(s) sur ${leads.length} demande(s)`} />
              <Kpi label="Conversion en client" icon={<TeamOutlined />} value={tauxTxt(convertis.length, leads.length)} foot="Demandes rattachées à une fiche client" />
              <Kpi label="Taux d'acceptation des devis" icon={<FileTextOutlined />} value={tauxTxt(acceptes.length, envoyes.length)} foot={`${acceptes.length} accepté(s) / ${envoyes.length} envoyé(s)`} />
              <Kpi label="Délai moyen de signature" icon={<FileTextOutlined />} value={delaiMoyen == null ? "—" : `${delaiMoyen.toFixed(0)} j`} empty={delaiMoyen == null} foot={delaiMoyen == null ? "Aucune signature en ligne sur la période" : `Sur ${delais.length} devis signé(s)`} />
            </div>
            <div className="grid-2">
              <Panel title="Entonnoir commercial" hint="Nombre de demandes ayant atteint chaque étape.">
                {leads.length ? (
                  <div className="funnel">
                    {funnel.map((s) => (
                      <div className="funnel-row" key={s.label}>
                        <span>{s.label}</span>
                        <div className="funnel-bar"><div style={{ width: `${(s.value / Math.max(funnel[0].value, 1)) * 100}%` }} /></div>
                        <span className="v">{s.value} <span className="faint" style={{ fontWeight: 400 }}>· {Math.round((s.value / Math.max(funnel[0].value, 1)) * 100)} %</span></span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState compact icon={<InboxOutlined />} title="Aucune demande sur la période" />}
              </Panel>
              <Panel title="Issue des devis">
                {statuts.length ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ width: 180, height: 180 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie isAnimationActive={false} data={statuts} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                            {statuts.map((s) => <Cell key={s.name} fill={s.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number, n: string) => [`${v} devis`, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="legend-inline" style={{ flexDirection: "column", gap: 8 }}>
                      {statuts.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name} : <b>{s.value}</b></span>)}
                    </div>
                  </div>
                ) : <EmptyState compact icon={<FileTextOutlined />} title="Aucun devis sur la période" />}
              </Panel>
            </div>
            <div className="grid-2">
              <Panel title="Demandes par site d'origine"><Repartition items={parSource} format={(n) => num(n)} /></Panel>
              <Panel title="Demandes : entreprises / particuliers"><Repartition items={parType} format={(n) => num(n)} /></Panel>
            </div>
            <Panel title="Demandes par origine du contact" hint="D'où viennent vos demandes et lesquelles se transforment." flush>
              {parOrigine.length ? (
                <table className="lines-table origine-table">
                  <thead><tr><th>Origine</th><th className="num">Demandes</th><th className="num">Gagnées</th><th className="num">Transformation</th></tr></thead>
                  <tbody>
                    {parOrigine.map((o) => (
                      <tr key={o.cle ?? "inconnue"}>
                        <td>{o.label}</td>
                        <td className="num">{num(o.demandes)}</td>
                        <td className="num">{num(o.gagnees)}</td>
                        <td className="num">{tauxTxt(o.gagnees, o.demandes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <EmptyState compact icon={<InboxOutlined />} title="Aucune demande sur la période" />}
            </Panel>
            <p className="faint" style={{ fontSize: 12.5, margin: 0 }}>Les questions reçues (support) ne sont pas comptées dans l'entonnoir commercial.</p>
          </div>
        );
      }}
    </Cadre>
  );
}
