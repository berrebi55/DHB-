import {
  List,
  useTable,
  DeleteButton,
  CreateButton,
  DateField,
} from "@refinedev/antd";
import { Table, Tag, Select, Space, Button, Tooltip } from "antd";
import { PrinterOutlined, MailOutlined } from "@ant-design/icons";
import { useUpdate, useNotification } from "@refinedev/core";
import { FACTURE_STATUT, ENTITY, STATUS_COLOR, toOptions } from "../../constants";
import { eur } from "../../utils/format";
import { printFacture } from "../../utils/print";
import { supabaseClient } from "../../supabaseClient";

export const FacturesList = () => {
  const { tableProps } = useTable({
    resource: "factures",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    pagination: { pageSize: 20 },
  });
  const { mutate: update } = useUpdate();
  const { open } = useNotification();

  const sendInvoice = async (f: any) => {
    if (!f.client_email) {
      open?.({ type: "error", message: "Pas d'email client sur cette facture" });
      return;
    }
    try {
      const r = await fetch(
        import.meta.env.VITE_SUPABASE_URL + "/functions/v1/send-invoice",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + import.meta.env.VITE_SUPABASE_ANON_KEY,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            to: f.client_email,
            nom: f.client_nom,
            numero: f.numero,
            total: eur(f.total_ttc),
            date: f.date_facture,
            libelle: f.libelle,
            entity: f.entity,
          }),
        },
      );
      const d = await r.json();
      if (d?.ok) {
        open?.({ type: "success", message: "Facture envoyée ✉️" });
        update({ resource: "factures", id: f.id, values: { status: "envoyee" } });
      } else if (d?.error === "resend_not_configured") {
        open?.({ type: "error", message: "Configure Resend pour envoyer les emails" });
      } else {
        open?.({ type: "error", message: "Erreur : " + (d?.error || "inconnue") });
      }
    } catch (e: any) {
      open?.({ type: "error", message: "Erreur : " + e.message });
    }
  };

  return (
    <List title="Factures" headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id" scroll={{ x: 1000 }}>
        <Table.Column dataIndex="numero" title="N°" width={120} render={(v) => <b>{v || "—"}</b>} />
        <Table.Column
          dataIndex="date_facture"
          title="Date"
          render={(v) => <DateField value={v} format="DD/MM/YYYY" />}
          width={110}
        />
        <Table.Column dataIndex="entity" title="Filiale" render={(v) => ENTITY[v] ?? v} width={110} />
        <Table.Column dataIndex="client_nom" title="Client" />
        <Table.Column
          dataIndex="total_ttc"
          title="Total"
          align="right"
          render={(v) => <b>{eur(v)}</b>}
          width={120}
        />
        <Table.Column
          dataIndex="status"
          title="Statut"
          width={150}
          render={(v, r: any) => (
            <Select
              size="small"
              value={v}
              style={{ width: 130 }}
              options={toOptions(FACTURE_STATUT)}
              onChange={(val) =>
                update({ resource: "factures", id: r.id, values: { status: val } })
              }
            />
          )}
        />
        <Table.Column
          title="Actions"
          width={160}
          render={(_, r: any) => (
            <Space wrap>
              <Tooltip title="Imprimer / PDF">
                <Button size="small" icon={<PrinterOutlined />} onClick={() => printFacture(r)} />
              </Tooltip>
              <Tooltip title="Envoyer par email">
                <Button size="small" icon={<MailOutlined />} onClick={() => sendInvoice(r)} />
              </Tooltip>
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
        <Table.Column
          dataIndex="status"
          title=""
          width={90}
          render={(v) => <Tag color={STATUS_COLOR[v]}>{FACTURE_STATUT[v]}</Tag>}
        />
      </Table>
    </List>
  );
};
