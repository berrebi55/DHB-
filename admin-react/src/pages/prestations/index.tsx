import { useEffect, useMemo, useState } from "react";
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Switch } from "antd";
import { AppstoreOutlined, PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useCreate, useDelete, useList, useUpdate, type CrudFilter } from "@refinedev/core";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, PageHeader, Panel, StatusTag } from "../../components/ui";
import type { Prestation } from "../../components/documents/LinesEditor";
import { cleanSearch, eur } from "../../lib/format";
import { ENTITES, label, options } from "../../lib/statuts";
import { useDebounced, useRole } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";

/** Catalogue des prestations : lignes réutilisables dans les devis et factures. */
export function PrestationsList() {
  const { message } = App.useApp();
  const { isAdmin } = useRole();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [inactives, setInactives] = useState(false);
  const [edition, setEdition] = useState<Prestation | null | "new">(null);
  const [form] = Form.useForm();
  const { mutate: create, isLoading: c1 } = useCreate();
  const { mutate: update, isLoading: c2 } = useUpdate();
  const { mutate: remove } = useDelete();

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [];
    if (!inactives) out.push({ field: "actif", operator: "eq", value: true });
    const t = cleanSearch(dq);
    if (t) out.push({ operator: "or", value: [{ field: "libelle", operator: "contains", value: t }, { field: "description", operator: "contains", value: t }] });
    return out;
  }, [dq, inactives]);

  const { data, isLoading } = useList<Prestation>({ resource: "prestations", filters, sorters: [{ field: "libelle", order: "asc" }], pagination: { mode: "off" } });
  const rows = data?.data ?? [];

  useEffect(() => {
    if (!edition) return;
    form.resetFields();
    form.setFieldsValue(edition === "new" ? { entity: "infogerance", actif: true, unite: "forfait" } : edition);
  }, [edition, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    const base = { successNotification: false as const, errorNotification: false as const };
    const done = () => { message.success(edition === "new" ? "Prestation ajoutée au catalogue" : "Prestation mise à jour"); setEdition(null); };
    const fail = (e: unknown) => message.error(messageErreurBase(e));
    if (edition === "new") create({ resource: "prestations", values: v, ...base }, { onSuccess: done, onError: fail });
    else if (edition) update({ resource: "prestations", id: edition.id, values: v, ...base }, { onSuccess: done, onError: fail });
  };

  return (
    <>
      <PageHeader
        title="Prestations"
        subtitle="Votre catalogue : ajoutez une prestation à un devis ou une facture en un clic."
        crumbs={[{ label: "Commercial" }, { label: "Prestations" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEdition("new")}>Nouvelle prestation</Button>}
      />
      <Panel flush>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#8a93a3" }} />} placeholder="Rechercher une prestation…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher une prestation" />
          <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><Switch size="small" checked={inactives} onChange={setInactives} /> Afficher les prestations désactivées</span>
        </div>
        <DataList<Prestation>
          rows={rows}
          loading={isLoading}
          onRowClick={(r) => setEdition(r)}
          empty={dq || inactives ? (
            <EmptyState icon={<SearchOutlined />} title="Aucune prestation ne correspond" />
          ) : (
            <EmptyState icon={<AppstoreOutlined />} title="Votre catalogue est vide"
              description="Enregistrez vos prestations courantes (intervention, forfait maintenance, installation…) pour composer vos devis plus vite."
              action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setEdition("new")}>Ajouter une prestation</Button>} />
          )}
          columns={[
            { title: "Prestation", dataIndex: "libelle", render: (v: string, r: Prestation) => <div><div className="cell-main">{v}</div>{r.description && <div className="cell-sub" style={{ maxWidth: 420 }}>{r.description}</div>}</div> },
            { title: "Prix unitaire HT", dataIndex: "prix_unitaire", align: "right" as const, render: (v: number, r: Prestation) => <span className="tabular"><b>{eur(v)}</b>{r.unite ? <span className="faint"> / {r.unite}</span> : null}</span> },
            { title: "Activité", dataIndex: "entity", render: (v: string) => label("entite", v) },
            { title: "État", dataIndex: "actif", render: (v: boolean) => v ? <StatusTag kind="abo" value="actif" /> : <span className="st tone-neutral">Désactivée</span> },
            ...(isAdmin ? [{
              title: "", key: "act", width: 90, render: (_: unknown, r: Prestation) => (
                <Popconfirm title="Supprimer cette prestation du catalogue ?" description="Les devis existants ne sont pas modifiés." okText="Supprimer" cancelText="Annuler" okButtonProps={{ danger: true }}
                  onConfirm={() => remove({ resource: "prestations", id: r.id, successNotification: false }, { onSuccess: () => message.success("Prestation supprimée"), onError: (e) => message.error(messageErreurBase(e)) })}>
                  <Button type="link" danger size="small">Supprimer</Button>
                </Popconfirm>
              ),
            }] : []),
          ]}
          mobileRender={(r) => (
            <><div className="m-row"><span className="m-title">{r.libelle}</span><b className="tabular">{eur(r.prix_unitaire)}</b></div>
              <div className="m-sub">{[r.unite, label("entite", r.entity), r.actif ? null : "désactivée"].filter(Boolean).join(" · ")}</div></>
          )}
        />
      </Panel>
      <Modal open={!!edition} onCancel={() => setEdition(null)} onOk={enregistrer} confirmLoading={c1 || c2} destroyOnClose
        title={edition === "new" ? "Nouvelle prestation" : "Modifier la prestation"} okText="Enregistrer" cancelText="Annuler">
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="libelle" label="Intitulé" rules={[{ required: true, message: "Indiquez un intitulé." }]}><Input placeholder="Ex. Intervention sur site (1 h)" /></Form.Item>
          <Form.Item name="description" label="Description (reprise sur le devis)"><Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
          <div className="grid-2" style={{ gap: 12 }}>
            <Form.Item name="prix_unitaire" label="Prix unitaire HT" rules={[{ required: true, message: "Indiquez un prix." }]}><InputNumber decimalSeparator="," min={0} precision={2} addonAfter="€" style={{ width: "100%" }} /></Form.Item>
            <Form.Item name="unite" label="Unité"><Select options={["forfait", "heure", "jour", "poste", "mois", "unité"].map((u) => ({ value: u, label: u }))} /></Form.Item>
          </div>
          <div className="grid-2" style={{ gap: 12 }}>
            <Form.Item name="entity" label="Activité"><Select options={options(ENTITES)} /></Form.Item>
            <Form.Item name="actif" label="Disponible dans les devis" valuePropName="checked"><Switch /></Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
}
