import { useState } from "react";
import { App, Button, Form, Input, Modal, Select, Table } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import { useList, useUpdate } from "@refinedev/core";
import { PageHeader, Panel, ReadOnlyNotice } from "../../components/ui";
import type { Profil } from "../../components/forms/TicketDrawer";
import { dateFR, initiales } from "../../lib/format";
import { useIdentite, useIsMobile, useRole } from "../../lib/hooks";
import { appelerFonction, messageErreurBase } from "../../lib/functions";
import { viderCacheProfil } from "../../providers/authProvider";

const ROLES = [
  { value: "admin", label: "Administrateur" },
  { value: "collaborateur", label: "Collaborateur" },
  { value: "en_attente", label: "En attente (aucun accès)" },
];
const LIBELLE_ROLE: Record<string, [string, string]> = {
  admin: ["Administrateur", "tone-primary"],
  collaborateur: ["Collaborateur", "tone-neutral"],
  en_attente: ["En attente", "tone-warning"],
};

export const PERMISSIONS: [string, string, string][] = [
  ["Consulter toutes les données", "Oui", "Oui"],
  ["Créer et modifier demandes, clients, devis, factures, tickets", "Oui", "Oui"],
  ["Enregistrer des paiements, envoyer devis et factures", "Oui", "Oui"],
  ["Supprimer un élément", "Oui", "Non"],
  ["Modifier les prix et le bandeau des sites", "Oui", "Non"],
  ["Modifier les paramètres société", "Oui", "Non"],
  ["Gérer les utilisateurs et les rôles", "Oui", "Non"],
];

export function UtilisateursPage() {
  const { message } = App.useApp();
  const { isAdmin, loading } = useRole();
  const { data: me } = useIdentite();
  const isMobile = useIsMobile();
  const { data, isLoading } = useList<Profil & { created_at: string }>({ resource: "profiles", sorters: [{ field: "created_at", order: "asc" }], pagination: { mode: "off" } });
  const profils = data?.data ?? [];
  const { mutate: update } = useUpdate();
  const [invite, setInvite] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [form] = Form.useForm();
  const nbAdmins = profils.filter((p) => p.role === "admin").length;

  const changerRole = (p: Profil, role: string) => {
    if (p.role === "admin" && role !== "admin" && nbAdmins <= 1) {
      message.warning("Il doit rester au moins un administrateur.");
      return;
    }
    update({ resource: "profiles", id: p.id, values: { role }, successNotification: false, errorNotification: false },
      { onSuccess: () => { viderCacheProfil(); message.success("Rôle mis à jour"); }, onError: (e) => message.error(messageErreurBase(e)) });
  };

  const inviter = async () => {
    const v = await form.validateFields();
    setEnvoi(true);
    const r = await appelerFonction("invite-user", v);
    setEnvoi(false);
    if (r.ok) {
      message.success((r.data as { existant?: boolean } | undefined)?.existant ? `Accès validé pour ${v.email}` : `Invitation envoyée à ${v.email}`);
      setInvite(false);
      form.resetFields();
    } else message.error(r.message);
  };

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        subtitle="Comptes du back-office et leurs rôles. Un compte « En attente » n'a accès à rien tant qu'un administrateur ne l'a pas validé."
        crumbs={[{ label: "Système" }, { label: "Utilisateurs" }]}
        actions={isAdmin ? <Button type="primary" icon={<UserAddOutlined />} onClick={() => setInvite(true)}>Inviter un utilisateur</Button> : undefined}
      />
      <ReadOnlyNotice show={!loading && !isAdmin} what="La gestion des utilisateurs" />
      <div className="split">
        <Panel title="Comptes" flush>
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={profils}
            pagination={false}
            scroll={{ x: "max-content" }}
            columns={[
              {
                title: "Utilisateur", dataIndex: "email",
                render: (_: unknown, p) => (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span className="avatar-lg" style={{ width: 32, height: 32, fontSize: 12, borderRadius: 8 }}>{initiales(p.nom || p.email)}</span>
                    <div><div className="cell-main">{p.nom || p.email}{p.id === me?.id && <span className="faint"> (vous)</span>}</div><div className="cell-sub">{p.email}</div></div>
                  </div>
                ),
              },
              {
                title: "Rôle", dataIndex: "role",
                render: (v: string, p) => isAdmin && p.id !== me?.id
                  ? <Select size="small" value={v} options={ROLES} style={{ width: 150 }} onChange={(r) => changerRole(p, r)} aria-label="Changer le rôle" />
                  : <span className={`st ${(LIBELLE_ROLE[v] ?? LIBELLE_ROLE.en_attente)[1]}`}>{(LIBELLE_ROLE[v] ?? LIBELLE_ROLE.en_attente)[0]}</span>,
              },
              ...(!isMobile ? [{ title: "Depuis le", dataIndex: "created_at", render: (v: string) => dateFR(v) }] : []),
            ]}
          />
        </Panel>
        <Panel title="Ce que chaque rôle peut faire" hint="Ces règles sont appliquées par la base de données.">
          <table className="lines-table" style={{ fontSize: 13 }}>
            <thead><tr><th>Action</th><th>Admin</th><th>Collab.</th></tr></thead>
            <tbody>
              {PERMISSIONS.map(([a, x, y]) => (
                <tr key={a}><td>{a}</td><td><span className="st tone-success nodot">{x}</span></td><td><span className={`st nodot ${y === "Oui" ? "tone-success" : "tone-neutral"}`}>{y}</span></td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <Modal open={invite} onCancel={() => setInvite(false)} onOk={inviter} confirmLoading={envoi} okText="Envoyer l'invitation" cancelText="Annuler" title="Inviter un utilisateur" destroyOnClose>
        <p className="muted" style={{ marginTop: 0 }}>La personne reçoit un email pour créer son mot de passe. Si elle a déjà un compte « En attente », son accès est simplement validé.</p>
        <Form form={form} layout="vertical" initialValues={{ role: "collaborateur" }} requiredMark="optional">
          <Form.Item name="email" label="Email" rules={[{ required: true, message: "Saisissez un email." }, { type: "email", message: "Email invalide." }]}><Input /></Form.Item>
          <Form.Item name="nom" label="Nom affiché"><Input /></Form.Item>
          <Form.Item name="role" label="Rôle"><Select options={ROLES.filter((r) => r.value !== "en_attente")} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
