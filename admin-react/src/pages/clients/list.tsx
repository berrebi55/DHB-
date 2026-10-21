import {
  List,
  useTable,
  EditButton,
  DeleteButton,
  CreateButton,
  FilterDropdown,
} from "@refinedev/antd";
import { Table, Tag, Space, Typography, Input, Select } from "antd";
import { useState } from "react";
import {
  CLIENT_STATUT,
  CLIENT_TYPE,
  ENTITY,
  STATUS_COLOR,
  toOptions,
} from "../../constants";

export const ClientsList = () => {
  const [q, setQ] = useState("");
  const { tableProps, searchFormProps, setFilters } = useTable({
    resource: "clients",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    pagination: { pageSize: 20 },
  });

  const onSearch = (val: string) => {
    setQ(val);
    setFilters(
      val
        ? [
            {
              operator: "or",
              value: [
                { field: "nom", operator: "contains", value: val },
                { field: "entreprise", operator: "contains", value: val },
                { field: "email", operator: "contains", value: val },
                { field: "telephone", operator: "contains", value: val },
              ],
            },
          ]
        : [],
      "replace",
    );
  };

  return (
    <List
      title="Clients & prospects"
      headerButtons={
        <>
          <Input.Search
            allowClear
            placeholder="Rechercher…"
            value={q}
            onChange={(e) => onSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <CreateButton />
        </>
      }
    >
      <Table {...tableProps} rowKey="id" scroll={{ x: 900 }}>
        <Table.Column
          title="Nom"
          render={(_, r: any) => (
            <Space direction="vertical" size={0}>
              <Typography.Text strong>{r.nom || "—"}</Typography.Text>
              {r.entreprise ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {r.entreprise}
                </Typography.Text>
              ) : null}
            </Space>
          )}
        />
        <Table.Column
          dataIndex="type"
          title="Type"
          render={(v) => CLIENT_TYPE[v] ?? v}
          width={110}
        />
        <Table.Column
          dataIndex="entity"
          title="Filiale"
          render={(v) => ENTITY[v] ?? v}
          width={120}
        />
        <Table.Column
          title="Contact"
          render={(_, r: any) => (
            <Space direction="vertical" size={0}>
              {r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : null}
              {r.telephone ? (
                <Typography.Text type="secondary">{r.telephone}</Typography.Text>
              ) : null}
            </Space>
          )}
        />
        <Table.Column
          dataIndex="statut"
          title="Statut"
          width={130}
          filterDropdown={(props) => (
            <FilterDropdown {...props}>
              <Select
                style={{ minWidth: 160 }}
                options={toOptions(CLIENT_STATUT)}
                allowClear
              />
            </FilterDropdown>
          )}
          render={(v) => <Tag color={STATUS_COLOR[v]}>{CLIENT_STATUT[v] ?? v}</Tag>}
        />
        <Table.Column
          title="Actions"
          width={120}
          render={(_, r: any) => (
            <Space>
              <EditButton hideText size="small" recordItemId={r.id} />
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
