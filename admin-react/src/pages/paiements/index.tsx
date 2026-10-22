import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { App, Button, DatePicker, Input, Modal, Popconfirm, Select } from "antd";
import { PlusOutlined, SearchOutlined, WalletOutlined } from "@ant-design/icons";
import { useDelete, useList, type CrudFilter } from "@refinedev/core";
import dayjs, { type Dayjs } from "dayjs";
import { supabaseClient } from "../../supabaseClient";
import { DataList } from "../../components/ui/DataList";
import { EmptyState, Kpi, PageHeader, Panel, StatusTag } from "../../components/ui";
import { PaiementModal, type FacturePourPaiement } from "../../components/forms/PaiementModal";
import { cleanSearch, dateFR, eur, eur0 } from "../../lib/format";
import { MOYENS_PAIEMENT, options } from "../../lib/statuts";
import { useDebounced, useRafraichir, useRole, useUrlState } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";

interface Paiement {
  id: string;
  created_at: string;
  facture_id: string;
  client_id: string | null;
  montant: number;
  date_paiement: string;
  moyen: string;
  reference: string | null;
  notes: string | null;
  factures?: { numero: string | null; client_nom: string | null } | null;
}

const KEYS = ["q", "moyen", "du", "au", "page"] as const;
const PAGE = 25;

export function PaiementsList() {
  const { message } = App.useApp();
  const { isAdmin } = useRole();
  const rafraichir = useRafraichir();
  const [f, setF] = useUrlState(KEYS);
  const [q, setQ] = useState(f.q);
  const dq = useDebounced(q, 300);
  const page = Number(f.page) || 1;
  const { mutate: remove } = useDelete();
  const [choix, setChoix] = useState(false);
  const [aPayer, setAPayer] = useState<FacturePourPaiement[]>([]);
  const [facture, setFacture] = useState<FacturePourPaiement | null>(null);
  const [stats, setStats] = useState<{ mois: number; annee: number } | null>(null);

  useEffect(() => {
    if (dq !== f.q) setF({ q: dq });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  const filters = useMemo<CrudFilter[]>(() => {
    const out: CrudFilter[] = [];
    if (f.moyen) out.push({ field: "moyen", operator: "eq", value: f.moyen });
    if (f.du) out.push({ field: "date_paiement", operator: "gte", value: f.du });
    if (f.au) out.push({ field: "date_paiement", operator: "lte", value: f.au });
    const t = cleanSearch(f.q);
    if (t) out.push({ field: "reference", operator: "contains", value: t });
    return out;
  }, [f.moyen, f.du, f.au, f.q]);

  const { data, isLoading, isError, error, refetch } = useList<Paiement>({
    resource: "paiements",
    filters,
    sorters: [{ field: "date_paiement", order: "desc" }, { field: "created_at", order: "desc" }],
    pagination: { current: page, pageSize: PAGE, mode: "server" },
    queryOptions: { keepPreviousData: true },
    meta: { select: "*, factures(numero, client_nom)" },
  });
  const rows = data?.data ?? [];

  useEffect(() => {
    supabaseClient.from("paiements").select("montant, date_paiement").gte("date_paiement", dayjs().startOf("year").format("YYYY-MM-DD")).then(({ data: d }) => {
      const debutMois = dayjs().startOf("month").format("YYYY-MM-DD");
      const l = (d ?? []) as { montant: number; date_paiement: string }[];
      setStats({ mois: l.filter((p) => p.date_paiement >= debutMois).reduce((s, p) => s + Number(p.montant), 0), annee: l.reduce((s, p) => s + Number(p.montant), 0) });
    });
  }, [data]);

  const ouvrirChoix = async () => {
    const { data: d } = await supabaseClient.from("factures_vue").select("id, numero, client_id, client_nom, total_ttc, reste_a_payer").eq("status", "envoyee").order("date_facture");
    setAPayer((d ?? []) as FacturePourPaiement[]);
    setChoix(true);
  };

  const periode: [Dayjs | null, Dayjs | null] = [f.du ? dayjs(f.du) : null, f.au ? dayjs(f.au) : null];
  const filtres = !!(f.q || f.moyen || f.du || f.au);

  return (
    <>
      <PageHeader
        title="Paiements"
        subtitle="Encaissements enregistrés sur vos factures."
        crumbs={[{ label: "Facturation" }, { label: "Paiements" }]}
        actions={<Button type="primary" icon={<PlusOutlined />} onClick={ouvrirChoix}>Enregistrer un paiement</Button>}
      />
      <div className="kpi-grid" style={{ marginBottom: 20, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <Kpi label={`Reçu en ${dayjs().format("MMMM")}`} icon={<WalletOutlined />} value={stats ? eur0(stats.mois) : "—"} loading={!stats} foot="Paiements enregistrés ce mois" />
        <Kpi label={`Reçu en ${dayjs().year()}`} icon={<WalletOutlined />} value={stats ? eur0(stats.annee) : "—"} loading={!stats} foot="Depuis le 1er janvier" />
      </div>
      <Panel flush>
        <div className="filterbar">
          <Input className="grow" allowClear prefix={<SearchOutlined style={{ color: "#8a93a3" }} />} placeholder="Référence (n° de virement, chèque…)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un paiement" />
          <Select allowClear placeholder="Moyen" value={f.moyen || undefined} onChange={(v) => setF({ moyen: v })} options={options(MOYENS_PAIEMENT)} />
          <DatePicker.RangePicker format="DD/MM/YYYY" value={periode} allowEmpty={[true, true]}
            onChange={(v) => setF({ du: v?.[0]?.format("YYYY-MM-DD") ?? null, au: v?.[1]?.format("YYYY-MM-DD") ?? null })} />
          {filtres && <Button type="link" onClick={() => { setQ(""); setF({ q: null, moyen: null, du: null, au: null }); }}>Réinitialiser</Button>}
        </div>
        <DataList<Paiement>
          rows={rows}
          loading={isLoading}
          error={isError ? error ?? true : undefined}
          onRetry={() => void refetch()}
          total={data?.total ?? 0}
          page={page}
          pageSize={PAGE}
          onPage={(p) => setF({ page: String(p) })}
          empty={filtres ? (
            <EmptyState icon={<SearchOutlined />} title="Aucun paiement sur cette sélection" />
          ) : (
            <EmptyState icon={<WalletOutlined />} title="Aucun paiement enregistré"
              description="Enregistrez les règlements reçus : la facture passe automatiquement à « payée » quand elle est soldée."
              action={<Button type="primary" icon={<PlusOutlined />} onClick={ouvrirChoix}>Enregistrer un paiement</Button>} />
          )}
          columns={[
            { title: "Date", dataIndex: "date_paiement", render: (v: string) => dateFR(v) },
            { title: "Facture", dataIndex: "facture_id", render: (v: string, r: Paiement) => <Link to={`/factures/${v}`}>{r.factures?.numero ?? "Voir"}</Link> },
            { title: "Client", dataIndex: "client_id", render: (v: string, r: Paiement) => v ? <Link to={`/clients/${v}`}>{r.factures?.client_nom ?? "Client"}</Link> : r.factures?.client_nom ?? "—" },
            { title: "Moyen", dataIndex: "moyen", render: (v: string) => <StatusTag kind="moyen" value={v} dot={false} /> },
            { title: "Référence", dataIndex: "reference", render: (v: string) => v || <span className="faint">—</span> },
            { title: "Montant", dataIndex: "montant", align: "right" as const, render: (v: number) => <b className="tabular">{eur(v)}</b> },
            ...(isAdmin ? [{
              title: "", key: "act", width: 90, render: (_: unknown, r: Paiement) => (
                <Popconfirm title="Supprimer ce paiement ?" description="Si la facture n'est plus soldée, elle repasse à « envoyée »." okText="Supprimer" cancelText="Annuler" okButtonProps={{ danger: true }}
                  onConfirm={() => remove({ resource: "paiements", id: r.id, successNotification: false }, { onSuccess: () => { rafraichir("factures", "factures_vue", "clients_vue"); message.success("Paiement supprimé"); }, onError: (e) => message.error(messageErreurBase(e)) })}>
                  <Button type="link" danger size="small">Supprimer</Button>
                </Popconfirm>
              ),
            }] : []),
          ]}
          mobileRender={(r) => (
            <><div className="m-row"><span className="m-title">{r.factures?.client_nom ?? "—"}</span><b className="tabular">{eur(r.montant)}</b></div>
              <div className="m-sub">{dateFR(r.date_paiement)} · {r.factures?.numero} · {r.moyen}</div></>
          )}
        />
      </Panel>
      <Modal open={choix} onCancel={() => setChoix(false)} footer={null} title="Quelle facture est réglée ?" destroyOnClose>
        {aPayer.length === 0 ? (
          <EmptyState compact icon={<WalletOutlined />} title="Aucune facture en attente de paiement" description="Seules les factures envoyées et non soldées peuvent recevoir un paiement." />
        ) : (
          <Select showSearch style={{ width: "100%" }} placeholder="Choisir une facture…" optionFilterProp="label"
            options={aPayer.map((x) => ({ value: x.id, label: `${x.numero} — ${x.client_nom ?? ""} — reste ${eur(x.reste_a_payer)}` }))}
            onChange={(id) => { setFacture(aPayer.find((x) => x.id === id) ?? null); setChoix(false); }} />
        )}
      </Modal>
      <PaiementModal open={!!facture} facture={facture} onClose={() => setFacture(null)} />
    </>
  );
}
