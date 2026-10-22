import { useState } from "react";
import { App, Button, Input, Popconfirm, Segmented } from "antd";
import { MessageOutlined } from "@ant-design/icons";
import { useCreate, useDelete, useList, type CrudFilter } from "@refinedev/core";
import { dateTimeFR, fromNow } from "../../lib/format";
import { useIdentite, useRole } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";
import { TYPES_NOTE, label, options } from "../../lib/statuts";
import { EmptyState } from "../ui";

interface Note {
  id: string;
  created_at: string;
  author_id: string | null;
  author_email: string | null;
  body: string;
  type?: string | null;
}

type Cible = { clientId?: string; leadId?: string; ticketId?: string; devisId?: string; factureId?: string };

/** Notes internes (client, demande, devis, facture) ou commentaires de ticket. */
export function NotesPanel(props: Cible & { placeholder?: string; emptyTitle?: string; vide?: string }) {
  const { message } = App.useApp();
  const { data: me } = useIdentite();
  const { isAdmin } = useRole();
  const [txt, setTxt] = useState("");
  const [type, setType] = useState("note");
  // Le type (appel, email, rendez-vous) n'a de sens que pour un client ou une demande.
  const typable = !!(props.clientId || props.leadId);
  const filters: CrudFilter[] = [];
  const values: Record<string, string> = {};
  const pairs: [keyof Cible, string][] = [
    ["clientId", "client_id"], ["leadId", "lead_id"], ["ticketId", "ticket_id"], ["devisId", "devis_id"], ["factureId", "facture_id"],
  ];
  pairs.forEach(([k, col]) => {
    if (props[k]) {
      filters.push({ field: col, operator: "eq", value: props[k] });
      values[col] = props[k]!;
    }
  });

  const { data, isLoading } = useList<Note>({
    resource: "notes",
    filters,
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { current: 1, pageSize: 50, mode: "server" },
    queryOptions: { retry: false },
  });
  const { mutate: create, isLoading: saving } = useCreate();
  const { mutate: remove } = useDelete();
  const rows = data?.data ?? [];

  const ajouter = () => {
    const body = txt.trim();
    if (!body) return;
    create(
      { resource: "notes", values: { ...values, body, ...(typable && type !== "note" ? { type } : {}) }, successNotification: false, errorNotification: false },
      {
        onSuccess: () => {
          setTxt("");
          message.success(`${label("note", typable ? type : "note")} enregistré${type === "note" || !typable ? "e" : ""}`);
          setType("note");
        },
        onError: (e) => message.error(messageErreurBase(e)),
      },
    );
  };

  return (
    <div>
      {typable && (
        <Segmented size="small" value={type} onChange={(v) => setType(String(v))} options={options(TYPES_NOTE)}
          style={{ marginBottom: 8 }} aria-label="Type d'échange" />
      )}
      <Input.TextArea
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        placeholder={props.placeholder ?? (type === "appel" ? "Résumé de l'appel (qui, quoi, suite à donner)…" : type === "email" ? "Résumé de l'email envoyé ou reçu…" : type === "rendez_vous" ? "Date, lieu et objet du rendez-vous…" : "Ajouter une note interne (information utile…)")}
        autoSize={{ minRows: 2, maxRows: 6 }}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") ajouter();
        }}
        aria-label="Nouvelle note"
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 4px" }}>
        <span className="faint" style={{ fontSize: 12 }}>Ctrl + Entrée pour enregistrer</span>
        <Button type="primary" onClick={ajouter} loading={saving} disabled={!txt.trim()}>Ajouter</Button>
      </div>
      {!isLoading && rows.length === 0 && (
        <EmptyState compact icon={<MessageOutlined />} title={props.emptyTitle ?? "Aucune note"} description={props.vide ?? "Gardez ici la trace de vos échanges."} />
      )}
      {rows.map((n) => (
        <div className="note" key={n.id}>
          <div className="who">
            <span title={dateTimeFR(n.created_at)}>
              {n.type && n.type !== "note" && <span className="st tone-info" style={{ marginRight: 6 }}>{label("note", n.type)}</span>}
              {n.author_email ?? "—"} · {fromNow(n.created_at)}
            </span>
            {(isAdmin || n.author_id === me?.id) && (
              <Popconfirm title="Supprimer cette note ?" okText="Supprimer" cancelText="Annuler" okButtonProps={{ danger: true }}
                onConfirm={() => remove({ resource: "notes", id: n.id, successNotification: false },
                  { onSuccess: () => message.success("Note supprimée"), onError: (e) => message.error(messageErreurBase(e)) })}>
                <Button type="link" size="small" danger style={{ padding: 0, height: "auto" }}>Supprimer</Button>
              </Popconfirm>
            )}
          </div>
          <div className="txt">{n.body}</div>
        </div>
      ))}
    </div>
  );
}
