import { useEffect } from "react";
import { App, Button, Col, DatePicker, Drawer, Form, Input, Row, Segmented, Select } from "antd";
import dayjs from "dayjs";
import { useCreate, useUpdate } from "@refinedev/core";
import { ENTITES, LEAD_STATUTS, PRIORITES, TYPES_CLIENT, options } from "../../lib/statuts";
import { messageErreurBase } from "../../lib/functions";

export interface Lead {
  id: string;
  created_at: string;
  updated_at?: string;
  entity: string;
  type: "devis" | "question";
  nom: string | null;
  entreprise: string | null;
  email: string | null;
  telephone: string | null;
  message: string | null;
  service: string | null;
  source_url: string | null;
  status: string;
  priorite: string;
  type_client: string | null;
  is_read: boolean;
  relance_at: string | null;
  client_id: string | null;
  notes: string | null;
}

/** Saisie manuelle d'une demande (appel, salon, recommandation…) ou modification. */
export function LeadDrawer(props: { open: boolean; onClose: () => void; lead?: Lead | null; defaultType?: "devis" | "question"; onSaved?: (l: Lead) => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { mutate: create, isLoading: c1 } = useCreate<Lead>();
  const { mutate: update, isLoading: c2 } = useUpdate<Lead>();
  const edition = !!props.lead;

  useEffect(() => {
    if (!props.open) return;
    form.resetFields();
    const l = props.lead;
    form.setFieldsValue(
      l
        ? { ...l, relance_at: l.relance_at ? dayjs(l.relance_at) : null }
        : { type: props.defaultType ?? "devis", entity: "infogerance", priorite: "normale", status: "nouveau", type_client: "entreprise" },
    );
  }, [props.open, props.lead, props.defaultType, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    const values = {
      ...v,
      relance_at: v.relance_at ? dayjs(v.relance_at).format("YYYY-MM-DD") : null,
      ...(edition ? {} : { source_url: "saisie manuelle", is_read: true }),
    };
    const done = (l: Lead) => {
      message.success(edition ? "Demande mise à jour" : "Demande enregistrée");
      props.onSaved?.(l);
      props.onClose();
    };
    const fail = (e: unknown) => message.error(messageErreurBase(e));
    if (edition) update({ resource: "leads", id: props.lead!.id, values, successNotification: false, errorNotification: false }, { onSuccess: (r) => done(r.data), onError: fail });
    else create({ resource: "leads", values, successNotification: false, errorNotification: false }, { onSuccess: (r) => done(r.data), onError: fail });
  };

  return (
    <Drawer open={props.open} onClose={props.onClose} width={540} destroyOnClose
      title={edition ? "Modifier la demande" : "Nouvelle demande"}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={props.onClose}>Annuler</Button>
          <Button type="primary" loading={c1 || c2} onClick={enregistrer}>{edition ? "Enregistrer" : "Enregistrer la demande"}</Button>
        </div>
      }>
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="type" label="Nature">
          <Segmented block options={[{ value: "devis", label: "Demande de devis" }, { value: "question", label: "Question / support" }]} />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={24} sm={12}><Form.Item name="nom" label="Nom" rules={[{ required: true, message: "Indiquez un nom." }]}><Input /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="entreprise" label="Entreprise"><Input /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col xs={24} sm={12}><Form.Item name="email" label="Email" rules={[{ type: "email", message: "Adresse email invalide." }]}><Input /></Form.Item></Col>
          <Col xs={24} sm={12}><Form.Item name="telephone" label="Téléphone"><Input /></Form.Item></Col>
        </Row>
        <Form.Item name="message" label="Besoin exprimé"><Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} /></Form.Item>
        <Row gutter={12}>
          <Col xs={12}><Form.Item name="status" label="Statut"><Select options={options(LEAD_STATUTS)} /></Form.Item></Col>
          <Col xs={12}><Form.Item name="priorite" label="Priorité"><Select options={options(PRIORITES)} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col xs={12}><Form.Item name="type_client" label="Type de client"><Select allowClear options={options(TYPES_CLIENT)} /></Form.Item></Col>
          <Col xs={12}><Form.Item name="entity" label="Activité"><Select options={options(ENTITES)} /></Form.Item></Col>
        </Row>
        <Form.Item name="relance_at" label="Date de relance"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
      </Form>
    </Drawer>
  );
}
