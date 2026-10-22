import { Link, useNavigate, useParams } from "react-router-dom";
import { App, Button, Dropdown, Modal, Select, Skeleton, Space, Typography } from "antd";
import { CheckOutlined, CustomerServiceOutlined, DeleteOutlined, MoreOutlined, ReloadOutlined, UserOutlined } from "@ant-design/icons";
import { useDelete, useOne, useUpdate } from "@refinedev/core";
import { EmptyState, PageHeader, Panel, StatusTag, ErrorState } from "../../components/ui";
import { NotesPanel } from "../../components/activity/NotesPanel";
import { ActivityFeed } from "../../components/activity/ActivityFeed";
import { useProfils, type Ticket } from "../../components/forms/TicketDrawer";
import { dateTimeFR, fromNow } from "../../lib/format";
import { PRIORITES, TICKET_STATUTS, label, options } from "../../lib/statuts";
import { useIdentite, useRole } from "../../lib/hooks";
import { messageErreurBase, estIntrouvable } from "../../lib/functions";

export function TicketShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { isAdmin } = useRole();
  const { data: me } = useIdentite();
  const profils = useProfils();
  const { data, isLoading, isError, error, refetch } = useOne<Ticket>({ resource: "tickets", id: id!, liveMode: "auto" });
  const t = data?.data;
  const { mutate: update } = useUpdate();
  const { mutate: remove } = useDelete();

  if (isLoading) return <Panel><Skeleton active paragraph={{ rows: 8 }} /></Panel>;
  if (isError && !estIntrouvable(error))
    return <Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel>;
  if (isError || !t)
    return <Panel><EmptyState icon={<CustomerServiceOutlined />} title="Ticket introuvable" action={<Button onClick={() => navigate("/tickets")}>Retour aux tickets</Button>} /></Panel>;

  const maj = (values: Partial<Ticket>, ok: string) =>
    update({ resource: "tickets", id: t.id, values, successNotification: false, errorNotification: false },
      { onSuccess: () => message.success(ok), onError: (e) => message.error(messageErreurBase(e)) });

  const actions = (() => {
    if (t.status === "ouvert") return <Button type="primary" icon={<UserOutlined />} onClick={() => maj({ status: "en_cours", responsable_id: t.responsable_id ?? me?.id ?? null }, "Ticket pris en charge")}>Prendre en charge</Button>;
    if (t.status === "en_cours") return <Button type="primary" icon={<CheckOutlined />} onClick={() => maj({ status: "resolu" }, "Ticket marqué résolu")}>Marquer résolu</Button>;
    if (t.status === "resolu") return <Space><Button icon={<ReloadOutlined />} onClick={() => maj({ status: "en_cours" }, "Ticket réouvert")}>Réouvrir</Button><Button type="primary" onClick={() => maj({ status: "ferme" }, "Ticket fermé")}>Fermer</Button></Space>;
    return <Button icon={<ReloadOutlined />} onClick={() => maj({ status: "ouvert" }, "Ticket réouvert")}>Réouvrir</Button>;
  })();

  const plus = [
    ...(t.status !== "resolu" && t.status !== "ferme" ? [{ key: "resolu", icon: <CheckOutlined />, label: "Marquer résolu", onClick: () => maj({ status: "resolu" }, "Ticket marqué résolu") }] : []),
    ...(t.status !== "ferme" ? [{ key: "ferme", label: "Fermer sans suite", onClick: () => maj({ status: "ferme" }, "Ticket fermé") }] : []),
    ...(isAdmin ? [{ type: "divider" as const }, {
      key: "del", icon: <DeleteOutlined />, danger: true, label: "Supprimer",
      onClick: () => Modal.confirm({ title: "Supprimer ce ticket et ses commentaires ?", okText: "Supprimer", okButtonProps: { danger: true }, cancelText: "Annuler",
        onOk: () => remove({ resource: "tickets", id: t.id, successNotification: false }, { onSuccess: () => { message.success("Ticket supprimé"); navigate("/tickets"); } }) }),
    }] : []),
  ];

  return (
    <>
      <PageHeader
        title={t.sujet}
        subtitle={<Space size={8} wrap><StatusTag kind="ticket" value={t.status} /><StatusTag kind="priorite" value={t.priorite} /><span className="faint">ouvert {fromNow(t.created_at)}</span></Space>}
        crumbs={[{ label: "Tickets", to: "/tickets" }, { label: t.sujet }]}
        back="/tickets"
        actions={<>{actions}{plus.length > 0 && <Dropdown menu={{ items: plus }} trigger={["click"]}><Button icon={<MoreOutlined />} aria-label="Plus d'actions" /></Dropdown>}</>}
      />
      <div className="detail-grid">
        <div className="section-gap">
          <Panel title="Description">
            <Typography.Paragraph style={{ whiteSpace: "pre-wrap", margin: 0 }}>{t.description || <span className="faint">Aucune description.</span>}</Typography.Paragraph>
          </Panel>
          <Panel title="Commentaires" hint="Échanges internes, diagnostic, actions réalisées.">
            <NotesPanel ticketId={t.id} placeholder="Ajouter un commentaire (diagnostic, action réalisée, réponse du client…)" emptyTitle="Aucun commentaire" vide="Notez ici le diagnostic et les actions réalisées." />
          </Panel>
          <Panel title="Historique" flush><ActivityFeed entite="tickets" entiteId={t.id} limit={20} /></Panel>
        </div>
        <div className="detail-side">
          <Panel title="Détails">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="muted" style={{ fontSize: 13 }}>Statut
                <Select value={t.status} options={options(TICKET_STATUTS)} style={{ width: "100%", marginTop: 4 }} onChange={(v) => maj({ status: v }, `Ticket : ${label("ticket", v)}`)} />
              </label>
              <label className="muted" style={{ fontSize: 13 }}>Priorité
                <Select value={t.priorite} options={options(PRIORITES)} style={{ width: "100%", marginTop: 4 }} onChange={(v) => maj({ priorite: v }, "Priorité mise à jour")} />
              </label>
              <label className="muted" style={{ fontSize: 13 }}>Responsable
                <Select allowClear placeholder="Non attribué" value={t.responsable_id ?? undefined} style={{ width: "100%", marginTop: 4 }}
                  options={profils.map((p) => ({ value: p.id, label: p.nom || p.email }))} onChange={(v) => maj({ responsable_id: v ?? null }, v ? "Responsable attribué" : "Ticket non attribué")} />
              </label>
            </div>
          </Panel>
          <Panel title="Client & dates">
            <dl className="kv">
              <dt>Client</dt><dd>{t.client_id ? <Link to={`/clients/${t.client_id}`}>{t.client_nom}</Link> : t.client_nom || "—"}</dd>
              <dt>Email</dt><dd>{t.client_email || "—"}</dd>
              <dt>Activité</dt><dd>{label("entite", t.entity)}</dd>
              <dt>Ouvert le</dt><dd>{dateTimeFR(t.created_at)}</dd>
              {t.resolved_at && <><dt>Résolu le</dt><dd>{dateTimeFR(t.resolved_at)}</dd></>}
              {t.closed_at && <><dt>Fermé le</dt><dd>{dateTimeFR(t.closed_at)}</dd></>}
              <dt>Mis à jour</dt><dd>{fromNow(t.updated_at)}</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
