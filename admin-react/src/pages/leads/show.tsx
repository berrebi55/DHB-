import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { App, Button, DatePicker, Dropdown, Modal, Select, Skeleton, Space, Steps, Typography } from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  InboxOutlined,
  MailOutlined,
  MoreOutlined,
  PhoneOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useDelete, useList, useOne, useUpdate } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { EmptyState, PageHeader, Panel, StatusTag, ErrorState } from "../../components/ui";
import { NotesPanel } from "../../components/activity/NotesPanel";
import { ActivityFeed } from "../../components/activity/ActivityFeed";
import { LeadDrawer, type Lead } from "../../components/forms/LeadDrawer";
import { ClientDrawer, type Client } from "../../components/forms/ClientDrawer";
import { dateFR, dateTimeFR, eur } from "../../lib/format";
import { PRIORITES, SOURCES_LEAD, label, options } from "../../lib/statuts";
import { useRole } from "../../lib/hooks";
import { messageErreurBase, estIntrouvable } from "../../lib/functions";

const PARCOURS = ["nouveau", "a_contacter", "contacte", "devis_a_preparer", "devis_envoye", "gagne"];

export function LeadShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const { isAdmin } = useRole();
  const { data, isLoading, isError, error, refetch } = useOne<Lead>({ resource: "leads", id: id!, liveMode: "auto" });
  const lead = data?.data;
  const { mutate: update } = useUpdate();
  const { mutate: remove } = useDelete();
  const [edit, setEdit] = useState(false);
  const [conversion, setConversion] = useState(false);

  const { data: devisData } = useList({
    resource: "devis",
    filters: [{ field: "lead_id", operator: "eq", value: id }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!id },
  });
  const devis = devisData?.data ?? [];

  // Ouvrir une demande la marque comme lue.
  useEffect(() => {
    if (lead && !lead.is_read) {
      update({ resource: "leads", id: lead.id, values: { is_read: true }, successNotification: false, errorNotification: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  const maj = (values: Partial<Lead>, ok?: string) =>
    update({ resource: "leads", id: id!, values, successNotification: false, errorNotification: false },
      { onSuccess: () => ok && message.success(ok), onError: (e) => message.error(messageErreurBase(e)) });

  if (isLoading) return <Panel><Skeleton active paragraph={{ rows: 8 }} /></Panel>;
  if (isError && !estIntrouvable(error))
    return <Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel>;
  if (isError || !lead)
    return <Panel><EmptyState icon={<InboxOutlined />} title="Demande introuvable" description="Elle a peut-être été supprimée." action={<Button onClick={() => navigate("/leads")}>Retour aux demandes</Button>} /></Panel>;

  const isQ = lead.type === "question";
  const listeTo = isQ ? "/support/questions" : "/leads";

  const convertir = async () => {
    // Évite les doublons : propose de rattacher à un client existant de même email.
    if (lead.email) {
      const { data: existant } = await supabaseClient.from("clients").select("id, nom, entreprise").ilike("email", lead.email).limit(1).maybeSingle();
      if (existant) {
        modal.confirm({
          title: "Un client existe déjà avec cet email",
          content: `${existant.entreprise || existant.nom} — voulez-vous rattacher cette demande à sa fiche ?`,
          okText: "Rattacher", cancelText: "Créer un nouveau client",
          onOk: () => rattacher(existant.id),
          onCancel: () => setConversion(true),
        });
        return;
      }
    }
    setConversion(true);
  };
  const rattacher = (clientId: string) =>
    update({ resource: "leads", id: lead.id, values: { client_id: clientId }, successNotification: false, errorNotification: false },
      { onSuccess: () => { message.success("Demande rattachée au client"); navigate(`/clients/${clientId}`); }, onError: (e) => message.error(messageErreurBase(e)) });

  const etape = PARCOURS.indexOf(lead.status);
  const plus = [
    { key: "edit", icon: <EditOutlined />, label: "Modifier", onClick: () => setEdit(true) },
    { key: "perdu", label: "Marquer comme perdue", onClick: () => maj({ status: "perdu" }, "Demande marquée perdue") },
    { key: "archive", label: "Archiver", onClick: () => maj({ status: "archive" }, "Demande archivée") },
    ...(isAdmin ? [{ type: "divider" as const }, {
      key: "del", icon: <DeleteOutlined />, danger: true, label: "Supprimer",
      onClick: () => Modal.confirm({
        title: "Supprimer cette demande ?", content: "Cette action est définitive.", okText: "Supprimer", okButtonProps: { danger: true }, cancelText: "Annuler",
        onOk: () => remove({ resource: "leads", id: lead.id, successNotification: false }, { onSuccess: () => { message.success("Demande supprimée"); navigate(listeTo); } }),
      }),
    }] : []),
  ];

  return (
    <>
      <PageHeader
        title={lead.nom || lead.email || "Demande"}
        subtitle={<Space size={8} wrap><StatusTag kind="lead" value={lead.status} /><StatusTag kind="priorite" value={lead.priorite} />
          <span className="faint">{isQ ? "Question" : "Demande de devis"} reçue le {dateTimeFR(lead.created_at)}</span></Space>}
        crumbs={[{ label: isQ ? "Questions reçues" : "Demandes", to: listeTo }, { label: lead.nom || "Demande" }]}
        back={listeTo}
        actions={
          <>
            {lead.client_id
              ? <Button icon={<UserOutlined />} onClick={() => navigate(`/clients/${lead.client_id}`)}>Voir le client</Button>
              : <Button icon={<UserAddOutlined />} onClick={convertir}>Convertir en client</Button>}
            {!isQ && <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate(`/devis/nouveau?lead=${lead.id}${lead.client_id ? `&client=${lead.client_id}` : ""}`)}>Créer un devis</Button>}
            <Dropdown menu={{ items: plus }} trigger={["click"]}><Button icon={<MoreOutlined />} aria-label="Plus d'actions" /></Dropdown>
          </>
        }
      />
      <div className="detail-grid">
        <div className="section-gap">
          {!isQ && (
            <Panel title="Avancement">
              <Steps
                size="small"
                current={etape < 0 ? 0 : etape}
                status={lead.status === "perdu" ? "error" : lead.status === "gagne" ? "finish" : "process"}
                onChange={(i) => maj({ status: PARCOURS[i] }, `Statut : ${label("lead", PARCOURS[i])}`)}
                items={PARCOURS.map((s) => ({ title: label("lead", s) }))}
                responsive
              />
              {["perdu", "archive"].includes(lead.status) && (
                <p className="muted" style={{ margin: "14px 0 0" }}>Cette demande est {label("lead", lead.status).toLowerCase()}. Cliquez sur une étape pour la réactiver.</p>
              )}
            </Panel>
          )}
          <Panel title={isQ ? "Question posée" : "Besoin exprimé"}>
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", marginBottom: 12 }}>{lead.message || <span className="faint">Aucun message.</span>}</Typography.Paragraph>
            <dl className="kv">
              {lead.service && <><dt>Service</dt><dd>{lead.service}</dd></>}
              <dt>Site</dt><dd>{label("entite", lead.entity)}{lead.source_url ? ` · ${lead.source_url === "saisie manuelle" ? "saisie manuelle" : lead.source_url}` : ""}</dd>
            </dl>
          </Panel>
          {!isQ && (
            <Panel title="Devis liés" extra={<Button size="small" onClick={() => navigate(`/devis/nouveau?lead=${lead.id}${lead.client_id ? `&client=${lead.client_id}` : ""}`)}>Nouveau devis</Button>} flush>
              {devis.length === 0 ? (
                <EmptyState compact icon={<FileTextOutlined />} title="Aucun devis pour cette demande" description="Préparez une proposition à partir du besoin exprimé." />
              ) : (
                <div className="m-list">
                  {devis.map((d: any) => (
                    <button type="button" key={d.id} className="m-item" onClick={() => navigate(`/devis/${d.id}`)}>
                      <div className="m-row"><span className="m-title">{d.numero}</span><StatusTag kind="devis" value={d.statut} /></div>
                      <div className="m-sub">{eur(d.total_ttc)} · {dateFR(d.date_devis)}</div>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          )}
          <Panel title="Notes"><NotesPanel leadId={lead.id} /></Panel>
          <Panel title="Historique" flush><ActivityFeed entite="leads" entiteId={lead.id} limit={20} /></Panel>
        </div>
        <div className="detail-side">
          <Panel title="Contact">
            <dl className="kv">
              <dt>Nom</dt><dd>{lead.nom || "—"}</dd>
              <dt>Entreprise</dt><dd>{lead.entreprise || "—"}</dd>
              <dt>Email</dt><dd>{lead.email ? <a href={`mailto:${lead.email}`}><MailOutlined /> {lead.email}</a> : "—"}</dd>
              <dt>Téléphone</dt><dd>{lead.telephone ? <a href={`tel:${lead.telephone}`}><PhoneOutlined /> {lead.telephone}</a> : "—"}</dd>
              <dt>Type</dt><dd>{label("typeClient", lead.type_client)}</dd>
              <dt>Client lié</dt><dd>{lead.client_id ? <Link to={`/clients/${lead.client_id}`}>Ouvrir la fiche</Link> : <span className="faint">Pas encore</span>}</dd>
            </dl>
          </Panel>
          <Panel title="Origine du contact" hint="Comment cette personne a trouvé DHB.">
            <label className="muted" style={{ fontSize: 13, display: "block" }}>Origine
              <Select allowClear placeholder="Non renseignée" value={lead.source ?? undefined} options={options(SOURCES_LEAD)} style={{ width: "100%", marginTop: 4 }}
                onChange={(v) => maj({ source: v ?? null }, v ? `Origine : ${label("source", v)}` : "Origine effacée")} />
            </label>
            <dl className="kv" style={{ marginTop: 12 }}>
              {lead.utm_campaign && <><dt>Campagne</dt><dd>{lead.utm_campaign}</dd></>}
              {(lead.utm_source || lead.utm_medium) && <><dt>Source / support</dt><dd>{[lead.utm_source, lead.utm_medium].filter(Boolean).join(" / ")}</dd></>}
              {lead.utm_term && <><dt>Mot-clé</dt><dd>{lead.utm_term}</dd></>}
              {lead.utm_content && <><dt>Contenu</dt><dd>{lead.utm_content}</dd></>}
              {lead.gclid && <><dt>Clic Google Ads</dt><dd>Oui</dd></>}
              <dt>Venu de</dt><dd>{lead.referrer || <span className="faint">—</span>}</dd>
              <dt>Page d'arrivée</dt><dd>{lead.landing_page || <span className="faint">—</span>}</dd>
            </dl>
          </Panel>
          <Panel title="Suivi">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="muted" style={{ fontSize: 13 }}>Priorité
                <Select value={lead.priorite} options={options(PRIORITES)} style={{ width: "100%", marginTop: 4 }} onChange={(v) => maj({ priorite: v }, "Priorité mise à jour")} />
              </label>
              <label className="muted" style={{ fontSize: 13 }}>Prochaine relance
                <DatePicker value={lead.relance_at ? dayjs(lead.relance_at) : null} format="DD/MM/YYYY" style={{ width: "100%", marginTop: 4 }}
                  onChange={(v) => maj({ relance_at: v ? v.format("YYYY-MM-DD") : null }, v ? `Relance prévue le ${v.format("DD/MM/YYYY")}` : "Relance supprimée")} />
              </label>
              <Space wrap>
                {[2, 7, 14].map((n) => (
                  <Button key={n} size="small" onClick={() => maj({ relance_at: dayjs().add(n, "day").format("YYYY-MM-DD") }, `Relance dans ${n} jours`)}>+{n} j</Button>
                ))}
              </Space>
            </div>
          </Panel>
        </div>
      </div>
      <LeadDrawer open={edit} lead={lead} onClose={() => setEdit(false)} />
      <ClientDrawer
        open={conversion}
        onClose={() => setConversion(false)}
        defaults={{
          type: (lead.type_client as Client["type"]) ?? (lead.entreprise ? "entreprise" : "particulier"),
          nom: lead.nom, entreprise: lead.entreprise, email: lead.email, telephone: lead.telephone,
          entity: lead.entity, statut: lead.status === "gagne" ? "client" : "prospect",
        }}
        extra={{ lead_id: lead.id }}
        onSaved={(c) => rattacher(c.id)}
      />
    </>
  );
}
