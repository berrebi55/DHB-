import { Form, Input, Select } from "antd";
import { CLIENT_STATUT, CLIENT_TYPE, ENTITY, toOptions } from "../../constants";
import type { FormProps } from "antd";

export const ClientFormFields = ({ formProps }: { formProps: FormProps }) => (
  <Form {...formProps} layout="vertical">
    <Form.Item
      label="Type"
      name="type"
      initialValue="entreprise"
      rules={[{ required: true }]}
    >
      <Select options={toOptions(CLIENT_TYPE)} />
    </Form.Item>
    <Form.Item
      label="Filiale"
      name="entity"
      initialValue="infogerance"
      rules={[{ required: true }]}
    >
      <Select options={toOptions(ENTITY)} />
    </Form.Item>
    <Form.Item label="Nom du contact" name="nom" rules={[{ required: true }]}>
      <Input />
    </Form.Item>
    <Form.Item label="Entreprise (si pro)" name="entreprise">
      <Input />
    </Form.Item>
    <Form.Item label="Email" name="email">
      <Input type="email" />
    </Form.Item>
    <Form.Item label="Téléphone" name="telephone">
      <Input />
    </Form.Item>
    <Form.Item label="Adresse" name="adresse">
      <Input />
    </Form.Item>
    <Form.Item
      label="Statut"
      name="statut"
      initialValue="prospect"
      rules={[{ required: true }]}
    >
      <Select options={toOptions(CLIENT_STATUT)} />
    </Form.Item>
    <Form.Item label="Notes" name="notes">
      <Input.TextArea rows={3} />
    </Form.Item>
  </Form>
);
