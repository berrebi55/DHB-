import { useEffect, useState } from "react";
import { App, Button, Form, Input, Popconfirm } from "antd";
import { CheckCircleOutlined, LockOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../supabaseClient";
import { PageHeader, Panel } from "../../components/ui";
import { useIdentite, useRole } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";
import { viderCacheProfil } from "../../providers/authProvider";
import { PERMISSIONS } from "./utilisateurs";

export function SecuritePage() {
  const { message } = App.useApp();
  const { data: me } = useIdentite();
  const { isAdmin } = useRole();
  const [nom, setNom] = useState("");
  const [savingNom, setSavingNom] = useState(false);
  const [savingMdp, setSavingMdp] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (me && me.name !== me.email) setNom(me.name);
  }, [me]);

  const enregistrerNom = async () => {
    if (!me) return;
    setSavingNom(true);
    const { error } = await supabaseClient.from("profiles").update({ nom: nom.trim() || null }).eq("id", me.id);
    setSavingNom(false);
    if (error) return message.error(messageErreurBase(error));
    viderCacheProfil();
    message.success("Nom mis à jour (visible après rechargement de la page)");
  };

  const changerMdp = async () => {
    const v = await form.validateFields();
    setSavingMdp(true);
    const { error } = await supabaseClient.auth.updateUser({ password: v.password });
    setSavingMdp(false);
    if (error) return message.error(/weak|short|at least/i.test(error.message) ? "Mot de passe trop faible : 10 caractères minimum, avec lettres et chiffres." : error.message);
    form.resetFields();
    message.success("Mot de passe modifié");
  };

  const deconnecterAutres = async () => {
    const { error } = await supabaseClient.auth.signOut({ scope: "others" });
    if (error) message.error(error.message);
    else message.success("Les autres sessions ont été déconnectées");
  };

  return (
    <>
      <PageHeader title="Sécurité" subtitle="Votre compte, votre mot de passe et les règles d'accès." crumbs={[{ label: "Système" }, { label: "Sécurité" }]} />
      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="section-gap">
          <Panel title="Mon compte">
            <dl className="kv" style={{ marginBottom: 16 }}>
              <dt>Email</dt><dd>{me?.email}</dd>
              <dt>Rôle</dt><dd><span className={`st ${isAdmin ? "tone-primary" : "tone-neutral"}`}>{isAdmin ? "Administrateur" : "Collaborateur"}</span></dd>
            </dl>
            <Form layout="vertical">
              <Form.Item label="Nom affiché" extra="Utilisé dans le journal d'activité et l'attribution des tickets.">
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Prénom Nom" />
              </Form.Item>
              <Button onClick={enregistrerNom} loading={savingNom}>Enregistrer le nom</Button>
            </Form>
          </Panel>
          <Panel title="Mot de passe">
            <Form form={form} layout="vertical" requiredMark={false}>
              <Form.Item name="password" label="Nouveau mot de passe" rules={[{ required: true, message: "Saisissez un mot de passe." }, { min: 10, message: "10 caractères minimum." }]}>
                <Input.Password prefix={<LockOutlined style={{ color: "#8a93a3" }} />} autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="confirm" label="Confirmation" dependencies={["password"]}
                rules={[{ required: true, message: "Confirmez le mot de passe." }, ({ getFieldValue }) => ({ validator: (_, v) => (!v || getFieldValue("password") === v ? Promise.resolve() : Promise.reject(new Error("Les deux mots de passe sont différents."))) })]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" onClick={changerMdp} loading={savingMdp}>Changer le mot de passe</Button>
            </Form>
          </Panel>
          <Panel title="Sessions">
            <p className="muted" style={{ marginTop: 0, fontSize: 13.5 }}>Vous vous êtes connecté sur un autre appareil (ordinateur partagé, téléphone perdu) ? Déconnectez-le d'ici.</p>
            <Popconfirm title="Déconnecter toutes les autres sessions ?" okText="Déconnecter" cancelText="Annuler" onConfirm={deconnecterAutres}>
              <Button>Déconnecter mes autres sessions</Button>
            </Popconfirm>
          </Panel>
        </div>
        <div className="section-gap">
          <Panel title="Règles d'accès par rôle" hint="Appliquées par la base de données (RLS), pas seulement par l'interface.">
            <table className="lines-table" style={{ fontSize: 13 }}>
              <thead><tr><th>Action</th><th>Admin</th><th>Collab.</th></tr></thead>
              <tbody>{PERMISSIONS.map(([a, x, y]) => <tr key={a}><td>{a}</td><td>{x}</td><td>{y}</td></tr>)}</tbody>
            </table>
          </Panel>
          <Panel title="Protections en place">
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
              {[
                "Les données ne sont lisibles qu'après connexion (sécurité au niveau des lignes).",
                "Les visiteurs des sites peuvent seulement déposer une demande.",
                "La clé secrète Supabase n'est jamais présente dans le navigateur.",
                "Les envois d'emails exigent un utilisateur connecté et ne s'adressent qu'au client du document.",
                "Les devis publics ne sont accessibles qu'avec leur lien unique.",
                "Chaque création, changement de statut et suppression est inscrit au journal d'activité.",
              ].map((t) => <li key={t} style={{ display: "flex", gap: 10 }}><CheckCircleOutlined style={{ color: "var(--success)", marginTop: 3 }} />{t}</li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
