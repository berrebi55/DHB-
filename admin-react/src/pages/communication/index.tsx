import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { App, Alert, Button, Drawer, Form, Input, Select, Switch } from "antd";
import { EditOutlined, MailOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useInvalidate, useList, type CrudFilter } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, PageHeader, Panel } from "../../components/ui";
import { cleanSearch, dateTimeFR } from "../../lib/format";
import { useDebounced, useRole, useUrlState } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";

export interface EmailHisto {
  id: string;
  created_at: string;
  origine: string;
  modele_cle: string | null;
  destinataire: string;
  destinataire_reel: string | null;
  sujet: string;
  corps_html: string;
  piece_jointe: string | null;
  statut: "envoye" | "echec";
  erreur: string | null;
  envoye_par_email: string | null;
  client_id: string | null;
  lead_id: string | null;
  devis_id: string | null;
  facture_id: string | null;
  ticket_id: string | null;
}

export const ORIGINES: Record<string, string> = {
  manuel: "Écrit depuis une fiche",
  devis: "Envoi de devis",
  facture: "Envoi de facture",
  relance_devis: "Relance de devis",
  relance_facture: "Rappel de facture",
  alerte_demande: "Alerte nouvelle demande",
  automatisation: "Automatisation",
};

const KEYS = ["q", "origine", "statut", "page"] as const;
const PAGE = 30;

/* ======================= Historique des emails ======================= */
export function EmailsPage() {
  const navigate = useNavigate();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const dq = useDebounced(q, 300);
  const [ouvert, setOuvert] = useState<EmailHisto | null>(null);
  const page = Number(f.page) || 1;
  useEffect(() => {
    if (dq !== f.q) setF({ q: dq, page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [];
    if (f.origine) out.push({ field: "origine", operator: "eq", value: f.origine });
    if (f.statut) out.push({ field: "statut", operator: "eq", value: f.statut });
    const t = cleanSearch(f.q);
    if (t) out.push({ operator: "or", value: [{ field: "sujet", operator: "contains", value: t }, { field: "destinataire", operator: "contains", value: t }] });
    return out;
  }, [f.origine, f.statut, f.q]);
  const { data, isLoading, isError, error, refetch } = useList<EmailHisto>({
    resource: "emails", filters, sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: page, pageSize: PAGE, mode: "server" }, queryOptions: { keepPreviousData: true, retry: false },
  });
  const rows = data?.data ?? [];
  const lien = (e: EmailHisto) =>
    e.facture_id ? `/factures/${e.facture_id}` : e.devis_id ? `/devis/${e.devis_id}` : e.ticket_id ? `/tickets/${e.ticket_id}` : e.lead_id ? `/leads/${e.lead_id}` : e.client_id ? `/clients/${e.client_id}` : null;
  const etat = (e: EmailHisto) => e.statut === "envoye"
    ? <span className="st tone-success">Envoyé</span>
    : <span className="st tone-danger" title={e.erreur ?? undefined}>Échec</span>;

  return (
    <>
      <PageHeader title="Emails envoyés" subtitle="Tous les emails partis de DHB : écrits depuis une fiche, devis, factures, relances, alertes."
        crumbs={[{ label: "Communication" }, { label: "Emails envoyés" }]} />
      <Panel flush>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#667085" }} />} placeholder="Sujet ou destinataire…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un email" />
          <Select allowClear placeholder="Origine" aria-label="Filtrer : origine" value={f.origine || undefined} onChange={(v) => setF({ origine: v, page: null })}
            options={Object.entries(ORIGINES).map(([value, label]) => ({ value, label }))} popupMatchSelectWidth={false} />
          <Select allowClear placeholder="Statut" aria-label="Filtrer : statut" value={f.statut || undefined} onChange={(v) => setF({ statut: v, page: null })}
            options={[{ value: "envoye", label: "Envoyés" }, { value: "echec", label: "Échecs" }]} />
        </div>
        <DataList<EmailHisto>
          rows={rows} loading={isLoading} error={isError ? error ?? true : undefined} onRetry={() => void refetch()}
          total={data?.total ?? 0} page={page} pageSize={PAGE} onPage={(p) => setF({ page: String(p) })}
          onRowClick={(e) => setOuvert(e)}
          columns={[
            { title: "Date", dataIndex: "created_at", width: 150, render: (v: string) => <span style={{ fontSize: 13 }}>{dateTimeFR(v)}</span> },
            { title: "Sujet", dataIndex: "sujet", render: (v: string, e) => <div><div className="cell-main">{v}</div><div className="cell-sub">{ORIGINES[e.origine] ?? e.origine}{e.piece_jointe ? ` · PDF joint` : ""}</div></div> },
            { title: "Destinataire", dataIndex: "destinataire", render: (v: string, e) => <div style={{ fontSize: 13 }}>{v}{e.destinataire_reel && <div className="cell-sub">test : envoyé à {e.destinataire_reel}</div>}</div> },
            { title: "Statut", dataIndex: "statut", width: 100, render: (_: string, e) => etat(e) },
          ]}
          mobileRender={(e) => (
            <>
              <div className="m-row"><span className="m-title">{e.sujet}</span>{etat(e)}</div>
              <div className="m-sub">{e.destinataire} · {dateTimeFR(e.created_at)}</div>
            </>
          )}
          empty={<EmptyState icon={<MailOutlined />} title={filters.length ? "Aucun email ne correspond" : "Aucun email envoyé pour le moment"}
            description="Les emails envoyés depuis les fiches, les devis, les factures et les relances apparaîtront ici." />}
        />
      </Panel>
      <Drawer open={!!ouvert} onClose={() => setOuvert(null)} width={640} title={ouvert?.sujet} destroyOnClose
        extra={ouvert && lien(ouvert) ? <Button onClick={() => navigate(lien(ouvert)!)}>Ouvrir la fiche</Button> : null}>
        {ouvert && (
          <>
            {ouvert.statut === "echec" && <Alert type="error" showIcon style={{ marginBottom: 12 }} message="Cet email n'est pas parti" description={ouvert.erreur ?? "Erreur non précisée."} />}
            <dl className="kv" style={{ marginBottom: 12 }}>
              <dt>Date</dt><dd>{dateTimeFR(ouvert.created_at)}</dd>
              <dt>À</dt><dd>{ouvert.destinataire}{ouvert.destinataire_reel ? ` (test : envoyé à ${ouvert.destinataire_reel})` : ""}</dd>
              <dt>Origine</dt><dd>{ORIGINES[ouvert.origine] ?? ouvert.origine}</dd>
              <dt>Par</dt><dd>{ouvert.envoye_par_email ?? "Envoi automatique"}</dd>
              {ouvert.piece_jointe && <><dt>Pièce jointe</dt><dd>{ouvert.piece_jointe}</dd></>}
            </dl>
            <iframe title="Contenu de l'email" sandbox="" srcDoc={ouvert.corps_html} style={{ width: "100%", height: 420, border: "1px solid var(--border)", borderRadius: 8, background: "#fff" }} />
          </>
        )}
      </Drawer>
    </>
  );
}

/* ======================= Modèles d'emails ======================= */
interface Modele { cle: string; nom: string; cible: string; sujet: string; corps: string; actif: boolean; updated_at?: string }
const CIBLES = [
  { value: "tous", label: "Toutes les fiches" }, { value: "client", label: "Clients" }, { value: "lead", label: "Demandes" },
  { value: "devis", label: "Devis" }, { value: "facture", label: "Factures" }, { value: "ticket", label: "Tickets" },
];

export function ModelesEmailPage() {
  const { message } = App.useApp();
  const { isAdmin } = useRole();
  const invalider = useInvalidate();
  const [edition, setEdition] = useState<Modele | "nouveau" | null>(null);
  const [form] = Form.useForm<Modele>();
  const [enCours, setEnCours] = useState(false);
  const { data, isLoading, isError, error, refetch } = useList<Modele>({
    resource: "email_modeles", sorters: [{ field: "nom", order: "asc" }], pagination: { mode: "off" }, queryOptions: { retry: false },
  });
  const rows = (data?.data ?? []).map((m) => ({ ...m, id: m.cle }));

  useEffect(() => {
    if (!edition) return;
    form.resetFields();
    form.setFieldsValue(edition === "nouveau" ? { cle: "", nom: "", cible: "tous", sujet: "", corps: "", actif: true } : edition);
  }, [edition, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    setEnCours(true);
    const { error: e } = edition === "nouveau"
      ? await supabaseClient.from("email_modeles").insert(v)
      : await supabaseClient.from("email_modeles").update({ nom: v.nom, cible: v.cible, sujet: v.sujet, corps: v.corps, actif: v.actif }).eq("cle", (edition as Modele).cle);
    setEnCours(false);
    if (e) { message.error(messageErreurBase(e)); return; }
    message.success("Modèle enregistré");
    setEdition(null);
    invalider({ resource: "email_modeles", invalidates: ["list"] });
  };

  return (
    <>
      <PageHeader title="Modèles d'emails" subtitle="Textes prêts à l'emploi ; les {{variables}} sont remplies avec les informations de la fiche au moment de l'envoi."
        crumbs={[{ label: "Communication" }, { label: "Modèles d'emails" }]}
        actions={isAdmin ? <Button type="primary" icon={<PlusOutlined />} onClick={() => setEdition("nouveau")}>Nouveau modèle</Button> : undefined} />
      {!isAdmin && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Seul un administrateur peut modifier les modèles." />}
      <Panel flush>
        <DataList<Modele & { id: string }>
          rows={rows} loading={isLoading} error={isError ? error ?? true : undefined} onRetry={() => void refetch()}
          onRowClick={(m) => isAdmin && setEdition(m)}
          columns={[
            { title: "Modèle", dataIndex: "nom", render: (v: string, m) => <div><div className="cell-main">{v}</div><div className="cell-sub">{m.sujet || "Sujet libre"}</div></div> },
            { title: "Pour", dataIndex: "cible", render: (v: string) => CIBLES.find((c) => c.value === v)?.label ?? v },
            { title: "État", dataIndex: "actif", width: 110, render: (v: boolean) => v ? <span className="st tone-success">Actif</span> : <span className="st tone-neutral">Désactivé</span> },
            ...(isAdmin ? [{ title: <span className="sr-only">Modifier</span>, key: "e", width: 60, render: () => <EditOutlined aria-hidden /> }] : []),
          ]}
          mobileRender={(m) => (<><div className="m-row"><span className="m-title">{m.nom}</span>{m.actif ? <span className="st tone-success">Actif</span> : <span className="st tone-neutral">Désactivé</span>}</div><div className="m-sub">{CIBLES.find((c) => c.value === m.cible)?.label}</div></>)}
          empty={<EmptyState icon={<MailOutlined />} title="Aucun modèle" description="Exécutez supabase/full-setup.sql pour installer les modèles de départ." />}
        />
      </Panel>
      <Drawer open={!!edition} onClose={() => setEdition(null)} width={600} destroyOnClose title={edition === "nouveau" ? "Nouveau modèle" : "Modifier le modèle"}
        footer={<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button onClick={() => setEdition(null)}>Annuler</Button><Button type="primary" loading={enCours} onClick={enregistrer}>Enregistrer</Button></div>}>
        <Form form={form} layout="vertical" requiredMark="optional">
          {edition === "nouveau" && (
            <Form.Item name="cle" label="Identifiant" extra="Lettres minuscules, chiffres et _ (ex. relance_contrat)." rules={[{ required: true, pattern: /^[a-z0-9_]{2,40}$/, message: "2 à 40 caractères : a-z, 0-9, _" }]}><Input /></Form.Item>
          )}
          <Form.Item name="nom" label="Nom du modèle" rules={[{ required: true, message: "Indiquez un nom." }]}><Input /></Form.Item>
          <Form.Item name="cible" label="Proposé sur"><Select options={CIBLES} /></Form.Item>
          <Form.Item name="sujet" label="Sujet" extra="Peut contenir des variables, ex. {{facture_numero}}."><Input maxLength={200} /></Form.Item>
          <Form.Item name="corps" label="Message" rules={[{ required: true, message: "Le message est vide." }]}
            extra="Variables : {{contact_nom}}, {{client_nom}}, {{societe}}, {{signature}}, {{date_du_jour}}, {{devis_numero}}, {{devis_montant}}, {{devis_date}}, {{devis_validite}}, {{facture_numero}}, {{facture_montant}}, {{facture_reste}}, {{facture_echeance}}, {{ticket_sujet}}.">
            <Input.TextArea autoSize={{ minRows: 8, maxRows: 18 }} />
          </Form.Item>
          <Form.Item name="actif" label="Actif" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
