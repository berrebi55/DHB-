import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Button, Input, Space, Tabs, Tag, Tooltip } from "antd";
import { FileDoneOutlined, PlusOutlined, RiseOutlined, SearchOutlined, SyncOutlined } from "@ant-design/icons";
import { useList } from "@refinedev/core";
import dayjs from "dayjs";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, Kpi, PageHeader, Panel, Pill, StatusTag } from "../../components/ui";
import { AbonnementDrawer, type Abonnement } from "../../components/forms/AbonnementDrawer";
import { dateFR, eur, eur0 } from "../../lib/format";
import { label } from "../../lib/statuts";
import { aboFactureADue, aboRenouvellementProche, mrr } from "../../lib/metrics";
import { useRafraichir, useUrlState } from "../../lib/hooks";
import { appelerFonction } from "../../lib/functions";

const KEYS = ["statut", "alerte", "q", "ouvrir", "creer"] as const;

export function AbonnementsList() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const rafraichir = useRafraichir();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const [enCours, setEnCours] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useList<Abonnement>({ resource: "abonnements", sorters: [{ field: "created_at", order: "desc" }], pagination: { mode: "off" } });
  const { data: retards } = useList({ resource: "factures_vue", filters: [{ field: "en_retard", operator: "eq", value: true }, { field: "abonnement_id", operator: "nnull", value: null }], pagination: { mode: "off" } });
  const aboEnRetard = useMemo(() => new Set((retards?.data ?? []).map((r: any) => r.abonnement_id)), [retards]);
  const tous = data?.data ?? [];

  const alertes = (a: Abonnement) => {
    const out: { cle: string; txt: string; ton: "info" | "warning" | "danger" }[] = [];
    if (aboFactureADue(a as any)) out.push({ cle: "facture", txt: "Facture à générer", ton: "info" });
    if (aboRenouvellementProche(a as any)) out.push({ cle: "renouvellement", txt: "Renouvellement proche", ton: "warning" });
    if (aboEnRetard.has(a.id)) out.push({ cle: "retard", txt: "Paiement en retard", ton: "danger" });
    return out;
  };

  const rows = useMemo(() => {
    let r = tous;
    if (f.statut && f.statut !== "tous") r = r.filter((a) => a.statut === f.statut);
    else if (!f.statut) r = r.filter((a) => a.statut === "actif");
    if (f.alerte) r = r.filter((a) => alertes(a).some((x) => x.cle === f.alerte));
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((a) => `${a.client_nom} ${a.libelle}`.toLowerCase().includes(t));
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tous, f.statut, f.alerte, q, aboEnRetard]);

  const ouvert = f.ouvrir ? tous.find((a) => a.id === f.ouvrir) ?? null : null;
  const dus = tous.filter((a) => aboFactureADue(a as any));
  const valeurMrr = mrr(tous as any);
  const nb = (s: string) => tous.filter((a) => a.statut === s).length;
  const nbAlerte = (cle: string) => tous.filter((a) => alertes(a).some((x) => x.cle === cle)).length;

  useEffect(() => setQ(f.q), [f.q]);

  const generer = async (abonnementId?: string) => {
    setEnCours(abonnementId ?? "tous");
    const r = await appelerFonction<{ generees: number; numeros: string[] }>("generate-recurring-invoices", abonnementId ? { abonnement_id: abonnementId } : {});
    setEnCours(null);
    if (!r.ok) return message.error(r.message);
    rafraichir("abonnements", "factures", "factures_vue");
    if (r.data?.generees) message.success(`${r.data.generees} facture(s) créée(s) en brouillon : ${r.data.numeros.join(", ")}`);
    else message.info("Aucune facture à générer : le mois en cours est déjà facturé.");
  };

  return (
    <>
      <PageHeader
        title="Abonnements"
        subtitle="Contrats récurrents, renouvellements et facturation mensuelle."
        crumbs={[{ label: "Facturation" }, { label: "Abonnements" }]}
        actions={
          <>
            {dus.length > 0 && <Button icon={<FileDoneOutlined />} loading={enCours === "tous"} onClick={() => generer()}>Générer les factures du mois ({dus.length})</Button>}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setF({ creer: "1" })}>Nouvel abonnement</Button>
          </>
        }
      />
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <Kpi label="MRR (récurrent mensuel)" icon={<RiseOutlined />} value={eur0(valeurMrr)} loading={isLoading} foot="Somme des abonnements actifs" to="/pilotage/recurrent" />
        <Kpi label="ARR (projection annuelle)" icon={<RiseOutlined />} value={eur0(valeurMrr * 12)} loading={isLoading} foot="MRR × 12" />
        <Kpi label="Abonnements actifs" icon={<SyncOutlined />} value={nb("actif")} loading={isLoading} foot={`${nb("suspendu")} suspendu(s) · ${nb("resilie")} résilié(s)`} />
        <Kpi label="Factures à générer" icon={<FileDoneOutlined />} value={dus.length} loading={isLoading} foot={dus.length ? "Pour le mois en cours" : "Mois en cours à jour"} to={dus.length ? "/abonnements?alerte=facture&statut=tous" : undefined} />
      </div>
      <Panel flush>
        <div className="list-tabs">
          <Tabs activeKey={f.statut || "actif"} onChange={(k) => setF({ statut: k === "actif" ? null : k })}
            items={[
              { key: "actif", label: <span>Actifs<span className="tab-count">{nb("actif")}</span></span> },
              { key: "suspendu", label: <span>Suspendus<span className="tab-count">{nb("suspendu")}</span></span> },
              { key: "resilie", label: <span>Résiliés<span className="tab-count">{nb("resilie")}</span></span> },
              { key: "tous", label: <span>Tous<span className="tab-count">{tous.length}</span></span> },
            ]} />
        </div>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#667085" }} />} placeholder="Client ou formule…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un abonnement" />
          <Space wrap>
            {[{ cle: "facture", txt: "Facture à générer" }, { cle: "renouvellement", txt: "Renouvellement proche" }, { cle: "retard", txt: "Paiement en retard" }].map((x) => (
              <Tag.CheckableTag key={x.cle} checked={f.alerte === x.cle} onChange={(c) => setF({ alerte: c ? x.cle : null })} style={{ border: "1px solid #e3e7ed", padding: "3px 10px" }}>
                {x.txt} ({nbAlerte(x.cle)})
              </Tag.CheckableTag>
            ))}
          </Space>
        </div>
        <DataList<Abonnement>
          rows={rows}
          loading={isLoading}
          error={isError ? error ?? true : undefined}
          onRetry={() => void refetch()}
          onRowClick={(r) => setF({ ouvrir: r.id })}
          empty={tous.length === 0 ? (
            <EmptyState icon={<SyncOutlined />} title="Aucun abonnement pour le moment"
              description="Créez un contrat récurrent : la facture du mois pourra être générée automatiquement."
              action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setF({ creer: "1" })}>Créer un abonnement</Button>} />
          ) : (
            <EmptyState icon={<SearchOutlined />} title="Aucun abonnement ne correspond" action={<Button onClick={() => { setQ(""); setF({ alerte: null, statut: "tous" }); }}>Tout afficher</Button>} />
          )}
          columns={[
            { title: "Client", dataIndex: "client_nom", render: (v: string, r: Abonnement) => <div><div className="cell-main">{r.client_id ? <a onClick={(e) => { e.stopPropagation(); navigate(`/clients/${r.client_id}`); }}>{v}</a> : v}</div><div className="cell-sub">{label("entite", r.entity)}</div></div> },
            { title: "Formule", dataIndex: "libelle", render: (v: string, r: Abonnement) => <>{v}{r.stripe_subscription_id && <div className="cell-sub" title="Prélevé automatiquement par Stripe : une facture payée est créée à chaque paiement reçu.">Paiement en ligne (Stripe)</div>}</> },
            { title: "Mensuel", dataIndex: "montant_mensuel", align: "right" as const, render: (v: number) => <b className="tabular">{eur(v)}</b> },
            { title: "Début", dataIndex: "date_debut", render: (v: string) => dateFR(v) },
            { title: "Renouvellement", dataIndex: "date_renouvellement", render: (v: string | null) => v ? <span style={{ color: dayjs(v).isBefore(dayjs()) ? "var(--danger)" : undefined }}>{dateFR(v)}</span> : <span className="faint">—</span> },
            { title: "Dernière facture", dataIndex: "derniere_facture_le", render: (v: string | null) => v ? dateFR(v) : <span className="faint">Jamais</span> },
            { title: "Alertes", key: "alertes", render: (_: unknown, r: Abonnement) => <Space size={4} wrap>{alertes(r).map((a) => <Pill key={a.cle} tone={a.ton} dot>{a.txt}</Pill>)}</Space> },
            { title: "Statut", dataIndex: "statut", render: (v: string) => <StatusTag kind="abo" value={v} /> },
            {
              title: "", key: "gen", render: (_: unknown, r: Abonnement) => aboFactureADue(r as any) ? (
                <Tooltip title="Crée la facture du mois en brouillon"><Button size="small" loading={enCours === r.id} onClick={() => generer(r.id)}>Générer</Button></Tooltip>
              ) : null,
            },
          ]}
          mobileRender={(r) => (
            <><div className="m-row"><span className="m-title">{r.client_nom}</span><b className="tabular">{eur(r.montant_mensuel)}/mois</b></div>
              <div className="m-sub">{r.libelle}{r.stripe_subscription_id ? " · Stripe" : ""}</div>
              <Space size={4} wrap>{alertes(r).map((a) => <Pill key={a.cle} tone={a.ton} dot>{a.txt}</Pill>)}</Space></>
          )}
        />
      </Panel>
      <AbonnementDrawer open={f.creer === "1" || !!ouvert} abonnement={ouvert} onClose={() => setF({ creer: null, ouvrir: null })} onSaved={() => rafraichir("abonnements")} />
    </>
  );
}
