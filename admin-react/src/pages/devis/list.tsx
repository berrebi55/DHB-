import {
  List,
  useTable,
  EditButton,
  DeleteButton,
  CreateButton,
  DateField,
} from "@refinedev/antd";
import { Table, Tag, Select, Space, Button, Tooltip } from "antd";
import {
  PrinterOutlined,
  FileDoneOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import { useUpdate, useCreate, useNotification } from "@refinedev/core";
import { DEVIS_STATUT, ENTITY, STATUS_COLOR, toOptions } from "../../constants";
import { eur } from "../../utils/format";
import { printDevis } from "../../utils/print";
import { supabaseClient } from "../../supabaseClient";

// Base publique de signature : adapte si tu déploies ailleurs.
const SIGN_BASE =
  (import.meta.env.VITE_SIGN_BASE as string) ||
  `${window.location.origin}/devis.html`;

export const DevisList = () => {
  const { tableProps } = useTable({
    resource: "devis",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    pagination: { pageSize: 20 },
  });
  const { mutate: update } = useUpdate();
  const { mutate: create } = useCreate();
  const { open } = useNotification();

  const toFacture = async (d: any) => {
    const { data: numero, error } = await supabaseClient.rpc("next_facture_numero");
    if (error) {
      open?.({ type: "error", message: "Erreur numéro : " + error.message });
      return;
    }
    const lignes = Array.isArray(d.lignes) ? d.lignes : [];
    create(
      {
        resource: "factures",
        values: {
          entity: d.entity,
          numero,
          date_facture: new Date().toISOString().slice(0, 10),
          client_nom: d.client_nom,
          client_email: d.client_email,
          client_adresse: d.client_adresse,
          libelle: `Prestations (voir détail) — devis ${d.numero || ""}`,
          quantite: 1,
          prix_unitaire: d.total_ht,
          tva_taux: d.tva_taux,
          total_ht: d.total_ht,
          total_ttc: d.total_ttc,
          lignes,
          status: "brouillon",
        },
      },
      {
        onSuccess: () => {
          update({ resource: "devis", id: d.id, values: { statut: "accepte" } });
          open?.({ type: "success", message: `Facture ${numero} créée` });
        },
      },
    );
  };

  const copyLink = (d: any) => {
    const url = `${SIGN_BASE}?token=${d.public_token}`;
    navigator.clipboard?.writeText(url);
    open?.({ type: "success", message: "Lien de signature copié", description: url });
  };

  return (
    <List title="Devis" headerButtons={<CreateButton />}>
      <Table {...tableProps} rowKey="id" scroll={{ x: 1000 }}>
        <Table.Column dataIndex="numero" title="N°" width={140} render={(v) => <b>{v || "—"}</b>} />
        <Table.Column
          dataIndex="created_at"
          title="Date"
          render={(v) => <DateField value={v} format="DD/MM/YYYY" />}
          width={110}
        />
        <Table.Column dataIndex="entity" title="Filiale" render={(v) => ENTITY[v] ?? v} width={110} />
        <Table.Column dataIndex="client_nom" title="Client" />
        <Table.Column
          dataIndex="total_ht"
          title="Total HT"
          align="right"
          render={(v) => <b>{eur(v)}</b>}
          width={120}
        />
        <Table.Column
          dataIndex="signed_at"
          title="Signé"
          width={110}
          render={(v, r: any) =>
            v ? (
              <Tooltip title={`Signé par ${r.signature_nom || ""}`}>
                <Tag color="green">✍ Signé</Tag>
              </Tooltip>
            ) : (
              <Tag color="default">—</Tag>
            )
          }
        />
        <Table.Column
          dataIndex="statut"
          title="Statut"
          width={150}
          render={(v, r: any) => (
            <Select
              size="small"
              value={v}
              style={{ width: 130 }}
              options={toOptions(DEVIS_STATUT)}
              onChange={(val) =>
                update({ resource: "devis", id: r.id, values: { statut: val } })
              }
            />
          )}
        />
        <Table.Column
          title="Actions"
          width={200}
          render={(_, r: any) => (
            <Space wrap>
              <Tooltip title="Imprimer / PDF">
                <Button
                  size="small"
                  icon={<PrinterOutlined />}
                  onClick={() => printDevis(r)}
                />
              </Tooltip>
              <Tooltip title="Lien de signature client">
                <Button size="small" icon={<LinkOutlined />} onClick={() => copyLink(r)} />
              </Tooltip>
              <Tooltip title="Convertir en facture">
                <Button
                  size="small"
                  icon={<FileDoneOutlined />}
                  onClick={() => toFacture(r)}
                />
              </Tooltip>
              <EditButton hideText size="small" recordItemId={r.id} />
              <DeleteButton hideText size="small" recordItemId={r.id} />
            </Space>
          )}
        />
        <Table.Column
          dataIndex="statut"
          title=""
          width={90}
          render={(v) => <Tag color={STATUS_COLOR[v]}>{DEVIS_STATUT[v]}</Tag>}
        />
      </Table>
    </List>
  );
};
