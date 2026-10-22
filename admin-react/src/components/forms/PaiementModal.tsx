import { useEffect } from "react";
import { App, DatePicker, Form, Input, InputNumber, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useCreate } from "@refinedev/core";
import { MOYENS_PAIEMENT, options } from "../../lib/statuts";
import { eur } from "../../lib/format";
import { messageErreurBase } from "../../lib/functions";
import { useRafraichir } from "../../lib/hooks";

export interface FacturePourPaiement {
  id: string;
  numero: string | null;
  client_id: string | null;
  client_nom: string | null;
  total_ttc: number;
  reste_a_payer?: number;
}

/**
 * Enregistre un encaissement. Quand les paiements couvrent le total, la base
 * passe automatiquement la facture à « payée » (trigger paiements_solder_facture).
 */
export function PaiementModal(props: { open: boolean; onClose: () => void; facture: FacturePourPaiement | null; onSaved?: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { mutate: create, isLoading } = useCreate();
  const rafraichir = useRafraichir();
  const reste = props.facture ? Number(props.facture.reste_a_payer ?? props.facture.total_ttc) : 0;

  useEffect(() => {
    if (!props.open) return;
    form.resetFields();
    form.setFieldsValue({ montant: reste > 0 ? reste : undefined, date_paiement: dayjs(), moyen: "virement" });
  }, [props.open, reste, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    if (!props.facture) return;
    create(
      {
        resource: "paiements",
        values: {
          facture_id: props.facture.id,
          client_id: props.facture.client_id,
          montant: v.montant,
          date_paiement: dayjs(v.date_paiement).format("YYYY-MM-DD"),
          moyen: v.moyen,
          reference: v.reference || null,
          notes: v.notes || null,
        },
        successNotification: false,
        errorNotification: false,
      },
      {
        onSuccess: () => {
          message.success(v.montant >= reste ? "Paiement enregistré — facture soldée" : "Paiement partiel enregistré");
          rafraichir("factures", "factures_vue", "paiements", "clients_vue");
          props.onSaved?.();
          props.onClose();
        },
        onError: (e) => message.error(messageErreurBase(e)),
      },
    );
  };

  return (
    <Modal open={props.open} onCancel={props.onClose} onOk={enregistrer} confirmLoading={isLoading} okText="Enregistrer le paiement" cancelText="Annuler"
      title={`Enregistrer un paiement${props.facture?.numero ? ` — ${props.facture.numero}` : ""}`} destroyOnClose>
      {props.facture && (
        <p className="muted" style={{ marginTop: 0 }}>
          {props.facture.client_nom} · total {eur(props.facture.total_ttc)} · reste à payer <b>{eur(reste)}</b>
        </p>
      )}
      <Form form={form} layout="vertical" requiredMark="optional">
        <Form.Item name="montant" label="Montant reçu" rules={[{ required: true, message: "Indiquez le montant." }, { type: "number", min: 0.01, message: "Le montant doit être positif." }]}>
          <InputNumber decimalSeparator="," min={0} precision={2} addonAfter="€" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="date_paiement" label="Date de réception" rules={[{ required: true }]}>
          <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="moyen" label="Moyen de paiement"><Select options={options(MOYENS_PAIEMENT)} /></Form.Item>
        <Form.Item name="reference" label="Référence" extra="N° de virement, de chèque…"><Input /></Form.Item>
        <Form.Item name="notes" label="Note"><Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} /></Form.Item>
      </Form>
    </Modal>
  );
}
