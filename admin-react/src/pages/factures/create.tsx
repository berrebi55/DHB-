import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, InputNumber, Row, Col, DatePicker } from "antd";
import dayjs from "dayjs";
import { ENTITY, toOptions } from "../../constants";
import { supabaseClient } from "../../supabaseClient";

export const FactureCreate = () => {
  const [form] = Form.useForm();
  const { formProps, saveButtonProps, onFinish } = useForm({ resource: "factures" });

  const handleFinish = async (values: any) => {
    const q = Number(values.quantite) || 0;
    const pu = Number(values.prix_unitaire) || 0;
    const tva = Number(values.tva_taux) || 0;
    const ht = q * pu;
    const ttc = ht * (1 + tva / 100);
    const { data: numero, error } = await supabaseClient.rpc("next_facture_numero");
    if (error) {
      form.setFields([{ name: "client_nom", errors: ["Erreur numéro : " + error.message] }]);
      return;
    }
    await onFinish({
      ...values,
      date_facture: values.date_facture
        ? dayjs(values.date_facture).format("YYYY-MM-DD")
        : new Date().toISOString().slice(0, 10),
      quantite: q,
      prix_unitaire: pu,
      tva_taux: tva,
      total_ht: ht,
      total_ttc: ttc,
      numero,
      status: "brouillon",
    });
  };

  return (
    <Create saveButtonProps={saveButtonProps} title="Nouvelle facture">
      <Form
        {...formProps}
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ quantite: 1, prix_unitaire: 0, tva_taux: 0, date_facture: dayjs() }}
      >
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Filiale" name="entity" initialValue="infogerance">
              <Select options={toOptions(ENTITY)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Date" name="date_facture">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Nom client" name="client_nom" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Email client" name="client_email">
              <Input type="email" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Adresse client" name="client_adresse">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Prestation" name="libelle" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={8}>
            <Form.Item label="Quantité" name="quantite">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item label="PU HT (€)" name="prix_unitaire">
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item label="TVA (%) — 0 si franchise" name="tva_taux">
              <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Notes" name="notes">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Create>
  );
};
