import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { DevisFormFields } from "./form";
import { totalHT, type Ligne } from "../../utils/format";

export const DevisEdit = () => {
  const [form] = Form.useForm();
  const { formProps, saveButtonProps, onFinish } = useForm({
    resource: "devis",
    action: "edit",
  });

  const handleFinish = async (values: any) => {
    const lignes: Ligne[] = (values.lignes || []).filter(
      (l: Ligne) => l && (l.libelle || l.pu),
    );
    const tva = Number(values.tva_taux) || 0;
    const ht = totalHT(lignes);
    const ttc = ht * (1 + tva / 100);
    await onFinish({ ...values, lignes, tva_taux: tva, total_ht: ht, total_ttc: ttc });
  };

  return (
    <Edit saveButtonProps={saveButtonProps} title="Modifier le devis">
      <DevisFormFields
        form={form}
        formProps={{ ...formProps, form, onFinish: handleFinish }}
      />
    </Edit>
  );
};
