import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select, InputNumber, DatePicker, Row, Col } from "antd";
import dayjs from "dayjs";
import { ENTITY, toOptions } from "../../constants";

export const AbonnementCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "abonnements" });
  const { selectProps: clientSelect } = useSelect({
    resource: "clients",
    optionLabel: "nom",
    optionValue: "id",
    onSearch: (value) => [{ field: "nom", operator: "contains", value }],
  });

  return (
    <Create saveButtonProps={saveButtonProps} title="Nouvel abonnement">
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{ statut: "actif", montant_mensuel: 0, date_debut: dayjs() }}
        onFinish={(values: any) =>
          formProps.onFinish?.({
            ...values,
            date_debut: values.date_debut
              ? dayjs(values.date_debut).format("YYYY-MM-DD")
              : null,
            date_renouvellement: values.date_renouvellement
              ? dayjs(values.date_renouvellement).format("YYYY-MM-DD")
              : null,
          })
        }
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Filiale" name="entity" initialValue="infogerance">
              <Select options={toOptions(ENTITY)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Client existant (optionnel)" name="client_id">
              <Select {...clientSelect} allowClear placeholder="Lier une fiche client" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Client (nom)" name="client_nom" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Libellé (forfait)" name="libelle" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item label="Montant mensuel (€)" name="montant_mensuel">
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Début" name="date_debut">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Renouvellement" name="date_renouvellement">
              <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
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
