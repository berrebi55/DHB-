import { useEffect } from "react";
import { App, Button, Col, DatePicker, Drawer, Form, Input, InputNumber, Row, Select } from "antd";
import dayjs from "dayjs";
import { useCreate, useUpdate } from "@refinedev/core";
import { ABO_STATUTS, ENTITES, options } from "../../lib/statuts";
import { messageErreurBase } from "../../lib/functions";
import { ClientField } from "./ClientSelect";
import type { Client } from "./ClientDrawer";

export interface Abonnement {
  id: string;
  created_at: string;
  entity: string;
  client_id: string | null;
  client_nom: string | null;
  libelle: string | null;
  montant_mensuel: number;
  date_debut: string;
  date_renouvellement: string | null;
  jour_facturation: number | null;
  derniere_facture_le: string | null;
  statut: string;
  notes: string | null;
  stripe_subscription_id?: string | null;
}

const d = (v?: string | null) => (v ? dayjs(v) : null);
const iso = (v: unknown) => (v ? dayjs(v as string).format("YYYY-MM-DD") : null);

export function AbonnementDrawer(props: { open: boolean; onClose: () => void; abonnement?: Abonnement | null; defaultClient?: Client | null; onSaved?: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { mutate: create, isLoading: c1 } = useCreate();
  const { mutate: update, isLoading: c2 } = useUpdate();
  const edition = !!props.abonnement;

  useEffect(() => {
    if (!props.open) return;
    form.resetFields();
    const a = props.abonnement;
    const c = props.defaultClient;
    form.setFieldsValue(
      a
        ? { ...a, date_debut: d(a.date_debut), date_renouvellement: d(a.date_renouvellement) }
        : { statut: "actif", entity: c?.entity ?? "infogerance", date_debut: dayjs(), jour_facturation: Math.min(dayjs().date(), 28), client_id: c?.id ?? null, client_nom: c?.nom ?? null },
    );
  }, [props.open, props.abonnement, props.defaultClient, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    const values = { ...v, date_debut: iso(v.date_debut), date_renouvellement: iso(v.date_renouvellement) };
    const done = () => {
      message.success(edition ? "Abonnement mis à jour" : "Abonnement créé");
      props.onSaved?.();
      props.onClose();
    };
    const fail = (e: unknown) => message.error(messageErreurBase(e));
    const base = { successNotification: false as const, errorNotification: false as const };
    if (edition) update({ resource: "abonnements", id: props.abonnement!.id, values, ...base }, { onSuccess: done, onError: fail });
    else create({ resource: "abonnements", values, ...base }, { onSuccess: done, onError: fail });
  };

  return (
    <Drawer open={props.open} onClose={props.onClose} width={520} destroyOnClose title={edition ? "Modifier l'abonnement" : "Nouvel abonnement"}
      footer={<div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button onClick={props.onClose}>Annuler</Button><Button type="primary" loading={c1 || c2} onClick={enregistrer}>{edition ? "Enregistrer" : "Créer l'abonnement"}</Button></div>}>
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="client_id" label="Client" rules={[{ required: true, message: "Choisissez le client." }]}>
          <ClientField onClient={(c) => form.setFieldsValue({ client_nom: c?.nom ?? null, entity: c?.entity ?? form.getFieldValue("entity") })} />
        </Form.Item>
        <Form.Item name="client_nom" hidden><Input /></Form.Item>
        <Form.Item name="libelle" label="Formule" rules={[{ required: true, message: "Nommez la formule." }]}>
          <Input placeholder="Ex. Infogérance — 5 postes" />
        </Form.Item>
        <Row gutter={12}>
          <Col xs={12}>
            <Form.Item name="montant_mensuel" label="Montant mensuel" rules={[{ required: true, message: "Indiquez le montant." }]}>
              <InputNumber decimalSeparator="," min={0} step={1} precision={2} addonAfter="€" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item name="jour_facturation" label="Jour de facturation" extra="Du 1 au 28">
              <InputNumber decimalSeparator="," min={1} max={28} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col xs={12}><Form.Item name="date_debut" label="Début" rules={[{ required: true }]}><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col>
          <Col xs={12}><Form.Item name="date_renouvellement" label="Renouvellement"><DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col xs={12}><Form.Item name="statut" label="Statut"><Select options={options(ABO_STATUTS)} /></Form.Item></Col>
          <Col xs={12}><Form.Item name="entity" label="Activité"><Select options={options(ENTITES)} /></Form.Item></Col>
        </Row>
        <Form.Item name="notes" label="Notes"><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
      </Form>
    </Drawer>
  );
}
