import { useEffect, useState } from "react";
import { Button, Select, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../supabaseClient";
import { cleanSearch } from "../../lib/format";
import { useDebounced } from "../../lib/hooks";
import { ClientDrawer, type Client } from "./ClientDrawer";

/**
 * Adaptateur pour Form.Item : la valeur du champ est l'identifiant du client,
 * `onClient` reçoit la fiche complète (pour recopier nom, email, adresse…).
 */
export function ClientField(props: {
  value?: string | null;
  onChange?: (id: string | null) => void;
  onClient?: (c: Client | null) => void;
  allowCreate?: boolean;
}) {
  return (
    <ClientSelect
      value={props.value}
      allowCreate={props.allowCreate}
      onChange={(c) => {
        props.onChange?.(c?.id ?? null);
        props.onClient?.(c);
      }}
    />
  );
}

/** Sélecteur de client avec recherche serveur et création à la volée. */
export function ClientSelect(props: {
  value?: string | null;
  onChange: (client: Client | null) => void;
  allowCreate?: boolean;
  placeholder?: string;
  status?: "error";
  id?: string;
}) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 200);
  const [opts, setOpts] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let annule = false;
    setLoading(true);
    let req = supabaseClient.from("clients").select("*").is("archived_at", null).order("nom").limit(30);
    const t = cleanSearch(dq);
    if (t) req = req.or(`nom.ilike.%${t}%,entreprise.ilike.%${t}%,email.ilike.%${t}%`);
    req.then(({ data }) => {
      if (annule) return;
      const rows = (data ?? []) as Client[];
      // S'assure que le client sélectionné reste affiché même s'il n'est pas dans la recherche.
      if (props.value && !rows.some((r) => r.id === props.value)) {
        supabaseClient.from("clients").select("*").eq("id", props.value).maybeSingle().then(({ data: c }) => {
          if (!annule && c) setOpts([c as Client, ...rows]);
        });
      }
      setOpts(rows);
      setLoading(false);
    });
    return () => {
      annule = true;
    };
  }, [dq, props.value]);

  return (
    <>
      <Space.Compact style={{ width: "100%" }}>
        <Select
          id={props.id}
          showSearch
          allowClear
          value={props.value || undefined}
          placeholder={props.placeholder ?? "Rechercher un client…"}
          filterOption={false}
          onSearch={setQ}
          loading={loading}
          status={props.status}
          notFoundContent={loading ? "Recherche…" : "Aucun client trouvé"}
          options={opts.map((c) => ({
            value: c.id,
            label: [c.nom, c.entreprise].filter(Boolean).join(" — ") + (c.ville ? ` · ${c.ville}` : ""),
          }))}
          onChange={(id) => props.onChange(opts.find((o) => o.id === id) ?? null)}
          style={{ width: "100%" }}
        />
        {props.allowCreate !== false && (
          <Button icon={<PlusOutlined />} onClick={() => setCreating(true)}>Nouveau</Button>
        )}
      </Space.Compact>
      <ClientDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(c) => {
          setOpts((o) => [c, ...o]);
          props.onChange(c);
          setCreating(false);
        }}
      />
    </>
  );
}
