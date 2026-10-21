import { List, useTable, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Tag, Select, Row, Col, Card, Statistic } from "antd";
import { useUpdate } from "@refinedev/core";
import { ABO_STATUT, ENTITY, STATUS_COLOR, toOptions } from "../../constants";
import { eur } from "../../utils/format";

export const AbonnementsList = () => {
  const { tableProps } = useTable({
    resource: "abonnements",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    pagination: { pageSize: 50 },
  });
  const { mutate: update } = useUpdate();

  const rows: any[] = [...(tableProps.dataSource || [])];
  const actifs = rows.filter((a) => a.statut === "actif");
  const mrr = actifs.reduce((s, a) => s + (Number(a.montant_mensuel) || 0), 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <List title="Abonnements & contrats récurrents" headerButtons={<CreateButton />}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Abonnements actifs" value={actifs.length} />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="MRR (récurrent / mois)"
              value={eur(mrr)}
              valueStyle={{ color: "#16a34a" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="ARR (projection / an)"
              value={eur(mrr * 12)}
              valueStyle={{ color: "#16a34a" }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Total contrats" value={rows.length} />
          </Card>
        </Col>
      </Row>

      <Table {...tableProps} rowKey="id" scroll={{ x: 900 }}>
        <Table.Column dataIndex="client_nom" title="Client" />
        <Table.Column dataIndex="libelle" title="Forfait" />
        <Table.Column dataIndex="entity" title="Filiale" render={(v) => ENTITY[v] ?? v} width={110} />
        <Table.Column
          dataIndex="montant_mensuel"
          title="€/mois"
          align="right"
          render={(v) => <b>{eur(v)}</b>}
          width={110}
        />
        <Table.Column
          dataIndex="date_renouvellement"
          title="Renouvellement"
          width={140}
          render={(v, r: any) => {
            const due = v && v <= today && r.statut === "actif";
            return (
              <span style={due ? { color: "#dc2626", fontWeight: 700 } : {}}>
                {v || "—"} {due ? "⚠" : ""}
              </span>
            );
          }}
        />
        <Table.Column
          dataIndex="statut"
          title="Statut"
          width={140}
          render={(v, r: any) => (
            <Select
              size="small"
              value={v}
              style={{ width: 120 }}
              options={toOptions(ABO_STATUT)}
              onChange={(val) =>
                update({ resource: "abonnements", id: r.id, values: { statut: val } })
              }
            />
          )}
        />
        <Table.Column
          dataIndex="statut"
          title=""
          width={80}
          render={(v) => <Tag color={STATUS_COLOR[v]}>{ABO_STATUT[v]}</Tag>}
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
