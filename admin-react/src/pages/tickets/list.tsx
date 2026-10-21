import { List, useTable, DeleteButton, DateField } from "@refinedev/antd";
import { Table, Tag, Select, Space, Typography } from "antd";
import { useUpdate } from "@refinedev/core";
import {
  TICKET_STATUT,
  TICKET_PRIORITE,
  ENTITY,
  STATUS_COLOR,
  toOptions,
} from "../../constants";

const PRIO_COLOR: Record<string, string> = {
  basse: "default",
  normale: "blue",
  haute: "orange",
  urgente: "red",
};

export const TicketsList = () => {
  const { tableProps } = useTable({
    resource: "tickets",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    pagination: { pageSize: 20 },
  });
  const { mutate: update } = useUpdate();

  return (
    <List title="Tickets de support">
      <Table {...tableProps} rowKey="id" scroll={{ x: 900 }}>
        <Table.Column
          dataIndex="created_at"
          title="Date"
          render={(v) => <DateField value={v} format="DD/MM/YYYY" />}
          width={110}
        />
        <Table.Column dataIndex="entity" title="Filiale" render={(v) => ENTITY[v] ?? v} width={110} />
        <Table.Column
          title="Client"
          render={(_, r: any) => (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{r.client_nom || "—"}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {r.client_email}
              </Typography.Text>
            </Space>
          )}
        />
        <Table.Column
          title="Sujet"
          render={(_, r: any) => (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{r.sujet}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {r.description}
              </Typography.Text>
            </Space>
          )}
        />
        <Table.Column
          dataIndex="priorite"
          title="Priorité"
          width={110}
          render={(v) => <Tag color={PRIO_COLOR[v]}>{TICKET_PRIORITE[v] ?? v}</Tag>}
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
              options={toOptions(TICKET_STATUT)}
              onChange={(val) =>
                update({ resource: "tickets", id: r.id, values: { status: val } })
              }
            />
          )}
        />
        <Table.Column
          dataIndex="status"
          title=""
          width={80}
          render={(v) => <Tag color={STATUS_COLOR[v]}>{TICKET_STATUT[v]}</Tag>}
        />
        <Table.Column
          title=""
          width={60}
          render={(_, r: any) => <DeleteButton hideText size="small" recordItemId={r.id} />}
        />
      </Table>
    </List>
  );
};
