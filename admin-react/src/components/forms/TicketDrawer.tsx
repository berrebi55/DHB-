import { useEffect } from "react";
import { App, Button, Col, Drawer, Form, Input, Row, Select } from "antd";
import { useCreate, useList } from "@refinedev/core";
import { ENTITES, PRIORITES, options } from "../../lib/statuts";
import { messageErreurBase } from "../../lib/functions";
import { ClientField } from "./ClientSelect";
import type { Client } from "./ClientDrawer";

export interface Ticket {
  id: string;
  created_at: string;
  updated_at: string;
  entity: string;
  client_id: string | null;
  client_nom: string | null;
  client_email: string | null;
  sujet: string;
  description: string | null;
  priorite: string;
  status: string;
  responsable_id: string | null;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface Profil {
  id: string;
  email: string | null;
  nom: string | null;
  role: string;
}

/** Liste des utilisateurs pour choisir un responsable. */
export function useProfils() {
  const { data } = useList<Profil>({ resource: "profiles", pagination: { mode: "off" }, queryOptions: { staleTime: 60_000, retry: false } });
  return data?.data ?? [];
}

export function TicketDrawer(props: { open: boolean; onClose: () => void; defaultClient?: Client | null; onSaved?: (t: Ticket) => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const profils = useProfils();
  const { mutate: create, isLoading } = useCreate<Ticket>();

  useEffect(() => {
    if (!props.open) return;
    form.resetFields();
    const c = props.defaultClient;
    form.setFieldsValue({
      priorite: "normale",
      entity: c?.entity ?? "infogerance",
      client_id: c?.id ?? null,
      client_nom: c?.nom ?? null,
      client_email: c?.email ?? null,
    });
  }, [props.open, props.defaultClient, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    create(
      { resource: "tickets", values: { ...v, status: "ouvert" }, successNotification: false, errorNotification: false },
      {
        onSuccess: (r) => {
          message.success("Ticket créé");
          props.onSaved?.(r.data);
          props.onClose();
        },
        onError: (e) => message.error(messageErreurBase(e)),
      },
    );
  };

  return (
    <Drawer open={props.open} onClose={props.onClose} width={520} title="Nouveau ticket" destroyOnClose
      footer={<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button onClick={props.onClose}>Annuler</Button><Button type="primary" loading={isLoading} onClick={enregistrer}>Créer le ticket</Button></div>}>
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="client_id" label="Client" rules={[{ required: true, message: "Choisissez le client concerné." }]}>
          <ClientField onClient={(c) => form.setFieldsValue({ client_nom: c?.nom ?? null, client_email: c?.email ?? null, entity: c?.entity ?? form.getFieldValue("entity") })} />
        </Form.Item>
        <Form.Item name="client_nom" hidden><Input /></Form.Item>
        <Form.Item name="client_email" hidden><Input /></Form.Item>
        <Form.Item name="sujet" label="Sujet" rules={[{ required: true, message: "Résumez le problème en quelques mots." }]}>
          <Input placeholder="Ex. Imprimante réseau hors ligne" />
        </Form.Item>
        <Form.Item name="description" label="Description"><Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="Symptômes, depuis quand, ce qui a déjà été essayé…" /></Form.Item>
        <Row gutter={12}>
          <Col xs={12}><Form.Item name="priorite" label="Priorité"><Select options={options(PRIORITES)} /></Form.Item></Col>
          <Col xs={12}><Form.Item name="entity" label="Activité"><Select options={options(ENTITES)} /></Form.Item></Col>
        </Row>
        <Form.Item name="responsable_id" label="Responsable">
          <Select allowClear placeholder="Non attribué" options={profils.map((p) => ({ value: p.id, label: p.nom || p.email }))} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
