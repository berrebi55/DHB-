import { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Typography,
  Space,
  Alert,
} from "antd";
import { useNotification } from "@refinedev/core";
import { ENTITY_OPTIONS } from "../constants";
import { supabaseClient } from "../supabaseClient";

interface FieldDef {
  key: string;
  label: string;
  def: string;
}

const FIELDS: Record<string, FieldDef[]> = {
  particuliers: [
    { key: "abonnement_prix", label: "Abonnement — « à partir de » (€/mois)", def: "19,90" },
    { key: "intervention_prix", label: "Intervention ponctuelle — « à partir de » (€)", def: "59" },
    { key: "annonce", label: "Bandeau d'annonce (vide = masqué)", def: "" },
  ],
  infogerance: [{ key: "annonce", label: "Bandeau d'annonce (vide = masqué)", def: "" }],
  groupe: [{ key: "annonce", label: "Bandeau d'annonce (vide = masqué)", def: "" }],
};

export const SettingsPage = () => {
  const [entity, setEntity] = useState("particuliers");
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { open } = useNotification();

  const load = async (ent: string) => {
    setErr(null);
    const { data, error } = await supabaseClient
      .from("settings")
      .select("skey,value")
      .eq("entity", ent);
    if (error) {
      setErr("Table 'settings' introuvable. Exécute supabase/full-setup.sql.");
      return;
    }
    const map: Record<string, string> = {};
    (data || []).forEach((r) => (map[r.skey] = r.value));
    const values: Record<string, string> = {};
    FIELDS[ent].forEach((f) => (values[f.key] = map[f.key] ?? f.def));
    form.setFieldsValue(values);
  };

  useEffect(() => {
    load(entity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  const onSave = async () => {
    const values = form.getFieldsValue();
    const rows = FIELDS[entity].map((f) => ({
      entity,
      skey: f.key,
      value: String(values[f.key] ?? "").trim(),
    }));
    setLoading(true);
    const { error } = await supabaseClient
      .from("settings")
      .upsert(rows, { onConflict: "entity,skey" });
    setLoading(false);
    if (error) open?.({ type: "error", message: "Erreur : " + error.message });
    else
      open?.({
        type: "success",
        message: "Enregistré",
        description: "Les sites afficheront le nouveau prix immédiatement.",
      });
  };

  return (
    <Card title="Prix & paramètres des sites">
      <Space direction="vertical" size="large" style={{ width: "100%", maxWidth: 560 }}>
        <div>
          <Typography.Text strong>Filiale</Typography.Text>
          <Select
            value={entity}
            onChange={setEntity}
            options={ENTITY_OPTIONS}
            style={{ width: "100%", marginTop: 6 }}
          />
        </div>
        {err && <Alert type="error" message={err} showIcon />}
        <Form form={form} layout="vertical">
          {FIELDS[entity].map((f) => (
            <Form.Item key={f.key} label={f.label} name={f.key}>
              <Input />
            </Form.Item>
          ))}
        </Form>
        <Button type="primary" loading={loading} onClick={onSave}>
          Enregistrer
        </Button>
      </Space>
    </Card>
  );
};
