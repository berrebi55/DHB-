import { Edit, useForm } from "@refinedev/antd";
import { ClientFormFields } from "./form";

export const ClientEdit = () => {
  const { formProps, saveButtonProps } = useForm({ resource: "clients", action: "edit" });
  return (
    <Edit saveButtonProps={saveButtonProps} title="Modifier le client">
      <ClientFormFields formProps={formProps} />
    </Edit>
  );
};
