import { List, useTable, FilterDropdown, DateField } from "@refinedev/antd";
import { Table, Tag, Select, Space, Typography } from "antd";
import { useUpdate } from "@refinedev/core";
import {
  LEAD_STATUS,
  ENTITY,
  STATUS_COLOR,
  toOptions,
} from "../../constants";

export const LeadsList = () => {
  const { tableProps } = useTable({
    resource: "leads",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    pagination: { pageSize: 20 },
  });
  const { mutate } = useUpdate();

  return (
    <List title="Demandes de devis & questions">
      <Table {...tableProps} rowKey="id" scroll={{ x: 900 }}>
        <Table.Column
          dataIndex="created_at"
          title="Date"
          render={(v) => <DateField value={v} format="DD/MM/YYYY HH:mm" />}
          width={150}
        />
        <Table.Column
          dataIndex="entity"
          title="Filiale"
          render={(v) => ENTITY[v] ?? v}
          width={120}
        />
        <Table.Column
          dataIndex="type"
          title="Type"
          render={(v) => (
            <Tag color={v === "devis" ? "blue" : "default"}>
              {v === "devis" ? "Devis" : "Question"}
            </Tag>
          )}
          width={100}
        />
        <Table.Column
          title="Contact"
          render={(_, r: any) => (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{r.nom || "—"}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {r.email}
                {r.telephone ? ` · ${r.telephone}` : ""}
              </Typography.Text>
              {r.entreprise ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {r.entreprise}
                </Typography.Text>
              ) : null}
            </Space>
          )}
        />
        <Table.Column
          dataIndex="message"
          title="Message"
          render={(v) => (
            <Typography.Paragraph
              ellipsis={{ rows: 2, tooltip: v }}
              style={{ maxWidth: 280, marginBottom: 0 }}
            >
              {v || "—"}
            </Typography.Paragraph>
          )}
        />
        <Table.Column
          dataIndex="status"
          title="Statut"
          width={160}
          filterDropdown={(props) => (
            <FilterDropdown {...props}>
              <Select
                style={{ minWidth: 180 }}
                options={toOptions(LEAD_STATUS)}
                allowClear
                placeholder="Filtrer"
              />
            </FilterDropdown>
          )}
          render={(v, r: any) => (
            <Select
              size="small"
              value={v}
              style={{ width: 150 }}
              options={toOptions(LEAD_STATUS)}
              onChange={(val) =>
                mutate({ resource: "leads", id: r.id, values: { status: val } })
              }
            />
          )}
        />
        <Table.Column
          dataIndex="status"
          title=""
          width={90}
          render={(v) => <Tag color={STATUS_COLOR[v]}>{LEAD_STATUS[v]}</Tag>}
        />
      </Table>
    </List>
  );
};
