import { useEffect } from "react";
import { App, Button, Col, Drawer, Form, Input, Row, Segmented, Select } from "antd";
import { useCreate, useUpdate } from "@refinedev/core";
import { CLIENT_STATUTS, ENTITES, options } from "../../lib/statuts";
import { messageErreurBase } from "../../lib/functions";
import { useRafraichir } from "../../lib/hooks";

export interface Client {
  id: string;
  created_at?: string;
  updated_at?: string;
  type: "entreprise" | "particulier";
  entity: string;
  nom: string | null;
  entreprise: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  siret: string | null;
  statut: string;
  notes: string | null;
  archived_at: string | null;
  lead_id: string | null;
}

export const adresseComplete = (c?: Partial<Client> | null) =>
  c ? [c.adresse, [c.code_postal, c.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";

/** Création / modification d'un client. `defaults` sert à pré-remplir (ex. depuis une demande). */
export function ClientDrawer(props: {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
  defaults?: Partial<Client>;
  /** Valeurs enregistrées sans être affichées (ex. lead_id d'origine). */
  extra?: Record<string, unknown>;
  onSaved?: (c: Client) => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const type = Form.useWatch("type", form);
  const { mutate: create, isLoading: c1 } = useCreate<Client>();
  const { mutate: update, isLoading: c2 } = useUpdate<Client>();
  const edition = !!props.client;
  const rafraichir = useRafraichir();

  useEffect(() => {
    if (!props.open) return;
    form.resetFields();
    form.setFieldsValue(
      props.client ?? { type: "entreprise", entity: "infogerance", statut: "prospect", ...props.defaults },
    );
  }, [props.open, props.client, props.defaults, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    const values = { ...(edition ? {} : props.extra), ...v, entreprise: v.type === "particulier" ? null : v.entreprise || null };
    const done = (c: Client) => {
      message.success(edition ? "Client mis à jour" : "Client créé avec succès");
      rafraichir("clients", "clients_vue");
      props.onSaved?.(c);
      props.onClose();
    };
    const fail = (e: unknown) => message.error(messageErreurBase(e));
    if (edition) {
      update({ resource: "clients", id: props.client!.id, values, successNotification: false, errorNotification: false },
        { onSuccess: (r) => done(r.data), onError: fail });
    } else {
      create({ resource: "clients", values, successNotification: false, errorNotification: false },
        { onSuccess: (r) => done(r.data), onError: fail });
    }
  };

  return (
    <Drawer
      open={props.open}
      onClose={props.onClose}
      width={520}
      title={edition ? "Modifier le client" : "Nouveau client"}
      destroyOnClose
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={props.onClose}>Annuler</Button>
          <Button type="primary" loading={c1 || c2} onClick={enregistrer}>{edition ? "Enregistrer" : "Créer le client"}</Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="type" label="Type de client">
          <Segmented block options={[{ value: "entreprise", label: "Entreprise" }, { value: "particulier", label: "Particulier" }]} />
        </Form.Item>
        {type !== "particulier" && (
          <Form.Item name="entreprise" label="Raison sociale" rules={[{ required: true, message: "Indiquez le nom de l'entreprise." }]}>
            <Input placeholder="Ex. Cabinet Martin" />
          </Form.Item>
        )}
        <Form.Item name="nom" label={type === "particulier" ? "Nom et prénom" : "Contact principal"}
          rules={[{ required: true, message: "Indiquez un nom." }]}>
          <Input placeholder="Ex. Claire Martin" />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Adresse email invalide." }]}>
              <Input placeholder="nom@exemple.fr" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="telephone" label="Téléphone"><Input placeholder="06 …" /></Form.Item>
          </Col>
        </Row>
        <Form.Item name="adresse" label="Adresse"><Input placeholder="Numéro et rue" /></Form.Item>
        <Row gutter={12}>
          <Col xs={10}><Form.Item name="code_postal" label="Code postal"><Input /></Form.Item></Col>
          <Col xs={14}><Form.Item name="ville" label="Ville"><Input /></Form.Item></Col>
        </Row>
        {type !== "particulier" && (
          <Form.Item name="siret" label="SIRET"><Input placeholder="14 chiffres" /></Form.Item>
        )}
        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item name="statut" label="Statut"><Select options={options(CLIENT_STATUTS)} /></Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="entity" label="Activité"><Select options={options(ENTITES)} /></Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Informations utiles" extra="Pour l'historique des échanges, utilisez plutôt les notes de la fiche client.">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
