import { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Typography, Spin, Empty, Button, Space } from "antd";
import { SyncOutlined, BellOutlined } from "@ant-design/icons";
import { useNotification } from "@refinedev/core";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { supabaseClient } from "../../supabaseClient";
import { ENTITY, LEAD_STATUS } from "../../constants";
import { eur } from "../../utils/format";

const COLORS = ["#22d3ee", "#a855f7", "#34d399", "#fbbf24", "#fb7185", "#60a5fa"];
const monthKey = (d: string) => (d || "").slice(0, 7); // YYYY-MM

export const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [abos, setAbos] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const { open } = useNotification();

  const callFn = async (name: string, label: string) => {
    setBusy(name);
    try {
      const r = await fetch(import.meta.env.VITE_SUPABASE_URL + "/functions/v1/" + name, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + import.meta.env.VITE_SUPABASE_ANON_KEY,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: "{}",
      });
      const d = await r.json();
      if (d?.ok) {
        const detail =
          name === "generate-recurring-invoices"
            ? `${d.generees} facture(s) générée(s)`
            : `${d.relancesDevis} devis + ${d.relancesFactures} facture(s) relancés`;
        open?.({ type: "success", message: label, description: detail });
      } else {
        open?.({ type: "error", message: "Erreur : " + (d?.error || "fonction non déployée") });
      }
    } catch (e: any) {
      open?.({ type: "error", message: "Erreur : " + e.message });
    }
    setBusy(null);
  };

  useEffect(() => {
    (async () => {
      const [l, f, a] = await Promise.all([
        supabaseClient.from("leads").select("*"),
        supabaseClient.from("factures").select("*"),
        supabaseClient.from("abonnements").select("*"),
      ]);
      setLeads(l.data || []);
      setFactures(f.data || []);
      setAbos(a.data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const nouveaux = leads.filter((l) => l.status === "nouveau").length;
  const gagnes = leads.filter((l) => l.status === "gagne").length;
  const relances = leads.filter(
    (l) =>
      l.relance_at &&
      l.relance_at <= today &&
      !["gagne", "perdu", "archive"].includes(l.status),
  ).length;
  const conversion = leads.length ? Math.round((gagnes / leads.length) * 100) : 0;
  const mrr = abos
    .filter((a) => a.statut === "actif")
    .reduce((s, a) => s + (Number(a.montant_mensuel) || 0), 0);
  const caPayes = factures
    .filter((f) => f.status === "payee")
    .reduce((s, f) => s + (Number(f.total_ttc) || 0), 0);

  // CA payé par mois (12 derniers mois)
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  const caParMois = months.map((m) => {
    const total = factures
      .filter((f) => f.status === "payee" && monthKey(f.date_facture) === m)
      .reduce((s, f) => s + (Number(f.total_ttc) || 0), 0);
    return { mois: m.slice(5) + "/" + m.slice(2, 4), ca: Math.round(total) };
  });

  // Demandes par statut (pie)
  const parStatut = Object.keys(LEAD_STATUS)
    .map((k) => ({ name: LEAD_STATUS[k], value: leads.filter((l) => l.status === k).length }))
    .filter((x) => x.value > 0);

  // CA facturé par filiale
  const parFiliale = Object.keys(ENTITY)
    .map((k) => ({
      name: ENTITY[k],
      ca: Math.round(
        factures
          .filter((f) => f.entity === k && f.status === "payee")
          .reduce((s, f) => s + (Number(f.total_ttc) || 0), 0),
      ),
    }))
    .filter((x) => x.ca > 0);

  const stat = (title: string, value: any, color?: string) => (
    <Col xs={12} md={6}>
      <Card>
        <Statistic title={title} value={value} valueStyle={color ? { color } : {}} />
      </Card>
    </Col>
  );

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Tableau de bord
        </Typography.Title>
        <Space wrap>
          <Button
            icon={<SyncOutlined />}
            loading={busy === "generate-recurring-invoices"}
            onClick={() =>
              callFn("generate-recurring-invoices", "Facturation récurrente")
            }
          >
            Générer les factures du mois
          </Button>
          <Button
            icon={<BellOutlined />}
            loading={busy === "send-reminders"}
            onClick={() => callFn("send-reminders", "Relances envoyées")}
          >
            Lancer les relances
          </Button>
        </Space>
      </Row>

      <Row gutter={[16, 16]}>
        {stat("Demandes nouvelles", nouveaux, "#2563eb")}
        {stat("Relances à faire", relances, relances ? "#dc2626" : undefined)}
        {stat("MRR (récurrent / mois)", eur(mrr), "#16a34a")}
        {stat("Factures payées (total)", eur(caPayes), "#16a34a")}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {stat("Taux de conversion", conversion + " %", "#a855f7")}
        {stat("Affaires gagnées", gagnes, "#16a34a")}
        {stat("Abonnements actifs", abos.filter((a) => a.statut === "actif").length)}
        {stat("ARR (projection / an)", eur(mrr * 12), "#16a34a")}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Chiffre d'affaires encaissé — 12 derniers mois">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={caParMois}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip formatter={(v: any) => eur(v)} />
                <Bar dataKey="ca" fill="#22d3ee" radius={[4, 4, 0, 0]} name="CA encaissé" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Demandes par statut">
            {parStatut.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={parStatut}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {parStatut.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="Aucune demande" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="CA encaissé par filiale">
            {parFiliale.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={parFiliale} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Tooltip formatter={(v: any) => eur(v)} />
                  <Bar dataKey="ca" fill="#34d399" radius={[0, 4, 4, 0]} name="CA" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="Aucune facture payée" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Cumul du CA encaissé (progression)">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={caParMois.reduce((acc: any[], cur, i) => {
                  const prev = i > 0 ? acc[i - 1].cumul : 0;
                  acc.push({ mois: cur.mois, cumul: prev + cur.ca });
                  return acc;
                }, [])}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip formatter={(v: any) => eur(v)} />
                <Line type="monotone" dataKey="cumul" stroke="#a855f7" strokeWidth={2} dot={{ r: 2 }} name="Cumul" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
