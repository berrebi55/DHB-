import { useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { App, Button, Dropdown, Modal, Skeleton, Space } from "antd";
import {
  CustomerServiceOutlined,
  DeleteOutlined,
  EditOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  InboxOutlined,
  InboxOutlined as ArchiveIcon,
  MailOutlined,
  MessageOutlined,
  MoreOutlined,
  PhoneOutlined,
  SyncOutlined,
  TeamOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useDelete, useList, useOne, useUpdate } from "@refinedev/core";
import { EmptyState, PageHeader, Panel, StatusTag, ErrorState } from "../../components/ui";
import { NotesPanel } from "../../components/activity/NotesPanel";
import { DocumentsClient } from "../../components/documents/DocumentsClient";
import { DossierDrive } from "../../components/documents/DossierDrive";
import { EmailDrawer } from "../../components/communication/EmailDrawer";
import { ClientTimeline } from "../../components/activity/ClientTimeline";
import { ActivityFeed } from "../../components/activity/ActivityFeed";
import { ClientDrawer, adresseComplete } from "../../components/forms/ClientDrawer";
import { TicketDrawer } from "../../components/forms/TicketDrawer";
import { AbonnementDrawer } from "../../components/forms/AbonnementDrawer";
import { dateFR, eur, eur0, fromNow, initiales } from "../../lib/format";
import { label, natureLead } from "../../lib/statuts";
import { useRole, useUrlState } from "../../lib/hooks";
import { messageErreurBase, estIntrouvable } from "../../lib/functions";
import type { ClientVue } from "./list";
import { Onglets } from "../../components/ui/Onglets";

/** Petite liste cliquable utilisée dans les onglets de la fiche. */
function MiniListe<T extends { id: string }>(props: { rows: T[]; loading?: boolean; to: (r: T) => string; titre: (r: T) => ReactNode; statut: (r: T) => ReactNode; sous: (r: T) => ReactNode; vide: ReactNode }) {
  const navigate = useNavigate();
  if (props.loading) return <div style={{ padding: 16 }}><Skeleton active paragraph={{ rows: 2 }} title={false} /></div>;
  if (!props.rows.length) return <>{props.vide}</>;
  return (
    <div className="m-list">
      {props.rows.map((r) => (
        <button type="button" key={r.id} className="m-item" onClick={() => navigate(props.to(r))}>
          <div className="m-row"><span className="m-title">{props.titre(r)}</span>{props.statut(r)}</div>
          <div className="m-sub">{props.sous(r)}</div>
        </button>
      ))}
    </div>
  );
}

export function ClientShow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ecrire, setEcrire] = useState(false);
  const { message } = App.useApp();
  const { isAdmin } = useRole();
  const [f, setF] = useUrlState(["onglet"] as const);
  const [edit, setEdit] = useState(false);
  const [ticket, setTicket] = useState(false);
  const [abo, setAbo] = useState(false);
  const { data, isLoading, isError, error, refetch } = useOne<ClientVue>({ resource: "clients_vue", id: id! });
  const c = data?.data;
  const { mutate: update } = useUpdate();
  const { mutate: remove } = useDelete();

  const parClient = { filters: [{ field: "client_id", operator: "eq" as const, value: id }], sorters: [{ field: "created_at", order: "desc" as const }], pagination: { mode: "off" as const }, queryOptions: { enabled: !!id } };
  const leads = useList({ resource: "leads", ...parClient });
  const devis = useList({ resource: "devis", ...parClient });
  const factures = useList({ resource: "factures_vue", ...parClient });
  const paiements = useList({ resource: "paiements", ...parClient, sorters: [{ field: "date_paiement", order: "desc" as const }] });
  const abonnements = useList({ resource: "abonnements", ...parClient });
  const tickets = useList({ resource: "tickets", ...parClient });

  if (isLoading) return <Panel><Skeleton active avatar paragraph={{ rows: 8 }} /></Panel>;
  if (isError && !estIntrouvable(error))
    return <Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel>;
  if (isError || !c)
    return <Panel><EmptyState icon={<TeamOutlined />} title="Client introuvable" description="Il a peut-être été supprimé." action={<Button onClick={() => navigate("/clients")}>Retour aux clients</Button>} /></Panel>;

  const nom = c.entreprise || c.nom || "Client";
  const archiver = () =>
    update({ resource: "clients", id: c.id, values: { archived_at: c.archived_at ? null : new Date().toISOString() }, successNotification: false, errorNotification: false, invalidates: ["all"] },
      { onSuccess: () => message.success(c.archived_at ? "Client restauré" : "Client archivé"), onError: (e) => message.error(messageErreurBase(e)) });

  const plus = [
    { key: "edit", icon: <EditOutlined />, label: "Modifier les informations", onClick: () => setEdit(true) },
    { key: "abo", icon: <SyncOutlined />, label: "Nouvel abonnement", onClick: () => setAbo(true) },
    { key: "arch", icon: <ArchiveIcon />, label: c.archived_at ? "Restaurer le client" : "Archiver le client", onClick: archiver },
    ...(isAdmin ? [{ type: "divider" as const }, {
      key: "del", icon: <DeleteOutlined />, danger: true, label: "Supprimer définitivement",
      onClick: () => Modal.confirm({
        title: `Supprimer ${nom} ?`,
        content: "Possible uniquement pour une fiche vide (créée par erreur). Si ce client a déjà un historique (demandes, devis, factures, notes…), la suppression sera refusée : archivez-le.",
        okText: "Supprimer", okButtonProps: { danger: true }, cancelText: "Annuler",
        onOk: () => remove({ resource: "clients", id: c.id, successNotification: false }, { onSuccess: () => { message.success("Client supprimé"); navigate("/clients"); }, onError: (e) => message.error(messageErreurBase(e)) }),
      }),
    }] : []),
  ];

  const onglet = f.onglet || "apercu";
  const nbOuverts = (tickets.data?.data ?? []).filter((t: any) => ["ouvert", "en_cours"].includes(t.status)).length;

  return (
    <>
      <EmailDrawer open={ecrire} onClose={() => setEcrire(false)} cible="client" id={c.id} destinataire={c.email} />
      <PageHeader
        title={<span className="entity-head"><span className="avatar-lg">{initiales(nom)}</span><span>{nom}</span></span>}
        subtitle={<Space size={8} wrap>
          {c.archived_at ? <span className="st tone-neutral">Archivé</span> : <StatusTag kind="client" value={c.statut} />}
          <StatusTag kind="typeClient" value={c.type} dot={false} />
          <span className="faint">{[c.entreprise ? c.nom : null, c.ville, `client depuis ${fromNow(c.created_at).replace("il y a ", "")}`].filter(Boolean).join(" · ")}</span>
        </Space>}
        crumbs={[{ label: "Clients", to: "/clients" }, { label: nom }]}
        back="/clients"
        actions={
          <div className="quick-actions">
            <Button type="primary" icon={<FileTextOutlined />} onClick={() => navigate(`/devis/nouveau?client=${c.id}`)}>Créer un devis</Button>
            <Button icon={<FileDoneOutlined />} onClick={() => navigate(`/factures/nouvelle?client=${c.id}`)}>Créer une facture</Button>
            <Button icon={<CustomerServiceOutlined />} onClick={() => setTicket(true)}>Créer un ticket</Button>
            <Button icon={<MessageOutlined />} onClick={() => setF({ onglet: "notes" })}>Ajouter une note</Button>
            {c.email && <Button icon={<MailOutlined />} onClick={() => setEcrire(true)}>Écrire un email</Button>}
            <Dropdown menu={{ items: plus }} trigger={["click"]}><Button icon={<MoreOutlined />} aria-label="Plus d'actions" /></Dropdown>
          </div>
        }
      />

      <div className="mini-kpis" style={{ marginBottom: 20 }}>
        <div><div className="v">{eur0(c.ca_encaisse)}</div><div className="l">CA encaissé</div></div>
        <div><div className="v">{eur0(c.ca_facture)}</div><div className="l">Facturé (envoyé ou payé)</div></div>
        <div><div className="v">{c.nb_devis}</div><div className="l">Devis</div></div>
        <div><div className="v">{c.tickets_ouverts}</div><div className="l">Tickets ouverts</div></div>
      </div>

      <div className="panel" style={{ padding: "0 18px" }}>
        <Onglets label="Sections de la fiche client" className="onglets-contenu"
          activeKey={onglet}
          onChange={(k) => setF({ onglet: k === "apercu" ? null : k })}
          items={[
            {
              key: "apercu", label: "Vue d'ensemble",
              children: (
                <div className="split" style={{ paddingBottom: 18 }}>
                  <div className="section-gap">
                    <div>
                      <h2 style={{ fontSize: 15, margin: "4px 0 12px" }}>Informations</h2>
                      <dl className="kv">
                        <dt>Contact</dt><dd>{c.nom || "—"}</dd>
                        <dt>Email</dt><dd>{c.email ? <a href={`mailto:${c.email}`}><MailOutlined /> {c.email}</a> : "—"}</dd>
                        <dt>Téléphone</dt><dd>{c.telephone ? <a href={`tel:${c.telephone}`}><PhoneOutlined /> {c.telephone}</a> : "—"}</dd>
                        <dt>Adresse</dt><dd>{adresseComplete(c) || "—"}</dd>
                        {c.type === "entreprise" && <><dt>SIRET</dt><dd>{c.siret || "—"}</dd></>}
                        <dt>Activité</dt><dd>{label("entite", c.entity)}</dd>
                        <DossierDrive client={c} />
                        {c.notes && <><dt>Infos utiles</dt><dd style={{ whiteSpace: "pre-wrap" }}>{c.notes}</dd></>}
                      </dl>
                      <Button size="small" icon={<EditOutlined />} style={{ marginTop: 12 }} onClick={() => setEdit(true)}>Modifier</Button>
                    </div>
                    <div>
                      <h2 style={{ fontSize: 15, margin: "8px 0 12px" }}>Dernières notes</h2>
                      <NotesPanel clientId={c.id} />
                    </div>
                  </div>
                  <div>
                    <h2 style={{ fontSize: 15, margin: "4px 0 4px" }}>Activité récente</h2>
                    <div style={{ marginInline: -18 }}><ActivityFeed clientId={c.id} limit={10} /></div>
                  </div>
                </div>
              ),
            },
            {
              key: "commercial", label: <span>Commercial<span className="tab-count">{(devis.data?.total ?? 0) + (leads.data?.total ?? 0)}</span></span>,
              children: (
                <div className="grid-2" style={{ paddingBottom: 18 }}>
                  <Panel title="Devis" extra={<Button size="small" onClick={() => navigate(`/devis/nouveau?client=${c.id}`)}>Nouveau</Button>} flush>
                    <MiniListe rows={(devis.data?.data ?? []) as any[]} loading={devis.isLoading} to={(r) => `/devis/${r.id}`} titre={(r) => r.numero} statut={(r) => <StatusTag kind="devis" value={r.statut} />}
                      sous={(r) => `${eur(r.total_ttc)} · ${dateFR(r.date_devis)}`}
                      vide={<EmptyState compact icon={<FileTextOutlined />} title="Aucun devis" description="Préparez une proposition pour ce client." />} />
                  </Panel>
                  <Panel title="Demandes" flush>
                    <MiniListe rows={(leads.data?.data ?? []) as any[]} loading={leads.isLoading} to={(r) => `/leads/${r.id}`} titre={(r) => natureLead(r.type)} statut={(r) => <StatusTag kind="lead" value={r.status} />}
                      sous={(r) => `${dateFR(r.created_at)} · ${(r.message ?? "").slice(0, 80)}`}
                      vide={<EmptyState compact icon={<InboxOutlined />} title="Aucune demande liée" description="Les demandes converties en client apparaissent ici." />} />
                  </Panel>
                </div>
              ),
            },
            {
              key: "facturation", label: <span>Facturation<span className="tab-count">{factures.data?.total ?? 0}</span></span>,
              children: (
                <div className="section-gap" style={{ paddingBottom: 18 }}>
                  <div className="grid-2">
                    <Panel title="Factures" extra={<Button size="small" onClick={() => navigate(`/factures/nouvelle?client=${c.id}`)}>Nouvelle</Button>} flush>
                      <MiniListe rows={(factures.data?.data ?? []) as any[]} loading={factures.isLoading} to={(r) => `/factures/${r.id}`} titre={(r) => r.numero}
                        statut={(r) => r.en_retard ? <span className="st tone-danger">En retard</span> : <StatusTag kind="facture" value={r.status} />}
                        sous={(r) => `${eur(r.total_ttc)} · ${dateFR(r.date_facture)}${Number(r.reste_a_payer) > 0 && r.status === "envoyee" ? ` · reste ${eur(r.reste_a_payer)}` : ""}`}
                        vide={<EmptyState compact icon={<FileDoneOutlined />} title="Aucune facture" description="Les factures de ce client apparaîtront ici." />} />
                    </Panel>
                    <Panel title="Paiements reçus" flush>
                      <MiniListe rows={(paiements.data?.data ?? []) as any[]} loading={paiements.isLoading} to={() => "/paiements"} titre={(r) => eur(r.montant)} statut={(r) => <StatusTag kind="moyen" value={r.moyen} dot={false} />}
                        sous={(r) => `${dateFR(r.date_paiement)}${r.reference ? ` · ${r.reference}` : ""}`}
                        vide={<EmptyState compact icon={<WalletOutlined />} title="Aucun paiement enregistré" description="Enregistrez un paiement depuis une facture." />} />
                    </Panel>
                  </div>
                  <Panel title="Abonnements" extra={<Button size="small" onClick={() => setAbo(true)}>Nouvel abonnement</Button>} flush>
                    <MiniListe rows={(abonnements.data?.data ?? []) as any[]} loading={abonnements.isLoading} to={(r) => `/abonnements?ouvrir=${r.id}`} titre={(r) => r.libelle} statut={(r) => <StatusTag kind="abo" value={r.statut} />}
                      sous={(r) => `${eur(r.montant_mensuel)} / mois · depuis le ${dateFR(r.date_debut)}`}
                      vide={<EmptyState compact icon={<SyncOutlined />} title="Aucun abonnement" description="Mettez en place un contrat récurrent pour ce client." />} />
                  </Panel>
                </div>
              ),
            },
            {
              key: "support", label: <span>Support<span className="tab-count">{nbOuverts}</span></span>,
              children: (
                <div style={{ paddingBottom: 18 }}>
                  <Panel title="Tickets" extra={<Button size="small" onClick={() => setTicket(true)}>Nouveau ticket</Button>} flush>
                    <MiniListe rows={(tickets.data?.data ?? []) as any[]} loading={tickets.isLoading} to={(r) => `/tickets/${r.id}`} titre={(r) => r.sujet}
                      statut={(r) => <StatusTag kind="ticket" value={r.status} />} sous={(r) => `${label("priorite", r.priorite)} · ouvert ${fromNow(r.created_at)}`}
                      vide={<EmptyState compact icon={<CustomerServiceOutlined />} title="Aucun ticket" description="Les demandes de support de ce client apparaîtront ici." />} />
                  </Panel>
                </div>
              ),
            },
            { key: "documents", label: "Documents", children: <div style={{ marginInline: -18, paddingBottom: 8 }}><DocumentsClient clientId={c.id} /></div> },
            { key: "notes", label: "Notes", children: <div style={{ paddingBottom: 18, maxWidth: 760 }}><NotesPanel clientId={c.id} /></div> },
            { key: "historique", label: "Historique", children: <div style={{ marginInline: -18, paddingBottom: 8 }}><ClientTimeline clientId={c.id} /></div> },
          ]}
        />
      </div>

      <ClientDrawer open={edit} client={c} onClose={() => setEdit(false)} />
      <TicketDrawer open={ticket} defaultClient={c} onClose={() => setTicket(false)} onSaved={(t) => navigate(`/tickets/${t.id}`)} />
      <AbonnementDrawer open={abo} defaultClient={c} onClose={() => setAbo(false)} />
    </>
  );
}
