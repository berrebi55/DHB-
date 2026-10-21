import { Form, Input, Select, InputNumber, Button, Row, Col, Typography, Divider } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import { useSelect } from "@refinedev/antd";
import { ENTITY, toOptions } from "../../constants";
import { eur } from "../../utils/format";
import type { FormInstance, FormProps } from "antd";

// Total HT live calculé depuis les lignes du formulaire.
const LiveTotal = ({ form }: { form: FormInstance }) => {
  Form.useWatch("lignes", form); // re-render à chaque frappe
  const lignes = form.getFieldValue("lignes") || [];
  const ht = lignes.reduce(
    (s: number, l: any) => s + (Number(l?.qte) || 0) * (Number(l?.pu) || 0),
    0,
  );
  return (
    <Typography.Title level={4} style={{ textAlign: "right" }}>
      Total HT : {eur(ht)}
    </Typography.Title>
  );
};

export const DevisFormFields = ({
  formProps,
  form,
}: {
  formProps: FormProps;
  form: FormInstance;
}) => {
  const { selectProps: clientSelect, query } = useSelect({
    resource: "clients",
    optionLabel: "nom",
    optionValue: "id",
    onSearch: (value) => [{ field: "nom", operator: "contains", value }],
  });

  const onClientChange = (id: unknown) => {
    const c = ((query.data?.data as any[]) || []).find((x) => x.id === id);
    if (c) {
      form.setFieldsValue({
        client_nom: c.nom,
        client_email: c.email,
        client_adresse: c.adresse,
      });
    }
  };

  return (
    <Form {...formProps} form={form} layout="vertical">
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="Filiale" name="entity" initialValue="infogerance">
            <Select options={toOptions(ENTITY)} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Client existant (optionnel)" name="client_id">
            <Select
              {...clientSelect}
              allowClear
              placeholder="Lier une fiche client"
              onChange={(v) => onClientChange(v)}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="Validité (jours)" name="validite_jours" initialValue={30}>
            <InputNumber min={1} style={{ width: "100%" }} />
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
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item label="TVA (%) — 0 si franchise" name="tva_taux" initialValue={0}>
            <InputNumber min={0} step={0.1} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation="left">Lignes</Divider>
      <Form.List name="lignes">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...rest }) => (
              <Row gutter={8} key={key} align="middle" style={{ marginBottom: 8 }}>
                <Col flex="auto">
                  <Form.Item
                    {...rest}
                    name={[name, "libelle"]}
                    rules={[{ required: true, message: "Prestation ?" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Prestation" />
                  </Form.Item>
                </Col>
                <Col flex="90px">
                  <Form.Item
                    {...rest}
                    name={[name, "qte"]}
                    initialValue={1}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} placeholder="Qté" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col flex="130px">
                  <Form.Item
                    {...rest}
                    name={[name, "pu"]}
                    initialValue={0}
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      step={0.01}
                      placeholder="PU HT"
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>
                <Col flex="32px">
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Col>
              </Row>
            ))}
            <Button
              type="dashed"
              onClick={() => add({ libelle: "", qte: 1, pu: 0 })}
              icon={<PlusOutlined />}
              block
            >
              Ajouter une ligne
            </Button>
          </>
        )}
      </Form.List>

      <LiveTotal form={form} />
      <Form.Item label="Notes internes" name="notes">
        <Input.TextArea rows={2} />
      </Form.Item>
    </Form>
  );
};
