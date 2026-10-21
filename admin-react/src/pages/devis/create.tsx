import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { DevisFormFields } from "./form";
import { supabaseClient } from "../../supabaseClient";
import { totalHT, type Ligne } from "../../utils/format";

export const DevisCreate = () => {
  const [form] = Form.useForm();
  const { formProps, saveButtonProps, onFinish } = useForm({ resource: "devis" });

  const handleFinish = async (values: any) => {
    const lignes: Ligne[] = (values.lignes || []).filter(
      (l: Ligne) => l && (l.libelle || l.pu),
    );
    if (!lignes.length) {
      form.setFields([{ name: "lignes", errors: ["Ajoute au moins une ligne"] }]);
      return;
    }
    const tva = Number(values.tva_taux) || 0;
    const ht = totalHT(lignes);
    const ttc = ht * (1 + tva / 100);
    const { data: numero, error } = await supabaseClient.rpc("next_devis_numero");
    if (error) {
      form.setFields([{ name: "client_nom", errors: ["Erreur numéro : " + error.message] }]);
      return;
    }
    await onFinish({
      ...values,
      lignes,
      tva_taux: tva,
      total_ht: ht,
      total_ttc: ttc,
      numero,
      statut: "brouillon",
    });
  };

  return (
    <Create saveButtonProps={saveButtonProps} title="Nouveau devis">
      <DevisFormFields
        form={form}
        formProps={{
          ...formProps,
          form,
          onFinish: handleFinish,
          initialValues: { lignes: [{ libelle: "", qte: 1, pu: 0 }] },
        }}
      />
    </Create>
  );
};
