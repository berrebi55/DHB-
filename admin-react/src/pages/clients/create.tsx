import { Create, useForm } from "@refinedev/antd";
import { ClientFormFields } from "./form";

export const ClientCreate = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "clients" });
  return (
    <Create saveButtonProps={saveButtonProps} title="Nouveau client">
      <ClientFormFields formProps={formProps} />
    </Create>
  );
};
