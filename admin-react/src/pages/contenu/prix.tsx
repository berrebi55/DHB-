import { useEffect, useState } from "react";
import { Alert, App, Button, Form, Input, Skeleton } from "antd";
import { supabaseClient } from "../../supabaseClient";
import { PageHeader, Panel, ReadOnlyNotice } from "../../components/ui";
import { useRole } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";

interface Champ {
  key: string;
  label: string;
  type: "prix" | "texte";
  aide?: string;
  defaut: string;
}

// Valeurs modifiables en direct sur les sites (table settings, lue par les pages publiques).
const SITES: { entity: string; nom: string; domaine: string; champs: Champ[] }[] = [
  {
    entity: "particuliers", nom: "DHB Assistance", domaine: "dhb-assistance.fr",
    champs: [
      { key: "abonnement_prix", label: "Abonnement — prix « à partir de » (€ / mois)", type: "prix", defaut: "14,90" },
      { key: "intervention_prix", label: "Intervention ponctuelle — prix « à partir de » (€)", type: "prix", defaut: "59" },
      { key: "annonce", label: "Bandeau d'annonce", type: "texte", aide: "Laissez vide pour masquer le bandeau.", defaut: "" },
    ],
  },
  { entity: "infogerance", nom: "DHB Pro", domaine: "pro.dhb-groupe.fr", champs: [{ key: "annonce", label: "Bandeau d'annonce", type: "texte", aide: "Laissez vide pour masquer le bandeau.", defaut: "" }] },
  { entity: "groupe", nom: "DHB Groupe", domaine: "dhb-groupe.fr", champs: [{ key: "annonce", label: "Bandeau d'annonce", type: "texte", aide: "Laissez vide pour masquer le bandeau.", defaut: "" }] },
];

const PRIX = /^\d{1,5}([.,]\d{1,2})?$/;

function SiteCard({ site, lectureSeule }: { site: (typeof SITES)[number]; lectureSeule: boolean }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [charge, setCharge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const valeurs = Form.useWatch([], form) ?? {};

  useEffect(() => {
    supabaseClient.from("settings").select("skey, value").eq("entity", site.entity).then(({ data, error }) => {
      if (error) setErreur(messageErreurBase(error));
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: { skey: string; value: string }) => (map[r.skey] = r.value));
      form.setFieldsValue(Object.fromEntries(site.champs.map((c) => [c.key, map[c.key] ?? c.defaut])));
      setCharge(true);
    });
  }, [site, form]);

  const enregistrer = async () => {
    const v = await form.validateFields();
    setSaving(true);
    const rows = site.champs.map((c) => ({ entity: site.entity, skey: c.key, value: String(v[c.key] ?? "").trim().replace(".", ",") }));
    const { error } = await supabaseClient.from("settings").upsert(rows, { onConflict: "entity,skey" });
    setSaving(false);
    if (error) message.error(messageErreurBase(error));
    else message.success(`${site.nom} : modifications en ligne immédiatement`);
  };

  return (
    <Panel title={site.nom} hint={site.domaine}>
      {erreur && <Alert type="warning" showIcon message={erreur} style={{ marginBottom: 12 }} />}
      {!charge ? <Skeleton active paragraph={{ rows: 3 }} /> : (
        <Form form={form} layout="vertical" disabled={lectureSeule} requiredMark={false}>
          {site.champs.map((c) => (
            <Form.Item key={c.key} name={c.key} label={c.label} extra={c.aide}
              rules={c.type === "prix" ? [{ required: true, message: "Indiquez un prix." }, { pattern: PRIX, message: "Format attendu : 14,90" }] : [{ max: 160, message: "160 caractères maximum." }]}>
              {c.type === "prix" ? <Input addonAfter="€" style={{ maxWidth: 200 }} /> : <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} showCount maxLength={160} placeholder="Ex. Fermé du 24 au 26 décembre — urgences au 01 …" />}
            </Form.Item>
          ))}
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>Aperçu sur le site</div>
          <div style={{ border: "1px dashed #d5dbe3", borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
            {valeurs.annonce ? <div style={{ background: "#0E1B2E", color: "#fff", padding: "8px 14px", fontSize: 13, textAlign: "center" }}>{valeurs.annonce}</div>
              : <div style={{ padding: "8px 14px", fontSize: 12.5, color: "#667085", textAlign: "center" }}>Bandeau masqué</div>}
            {site.champs.some((c) => c.type === "prix") && (
              <div style={{ display: "flex", gap: 24, padding: 14, flexWrap: "wrap", background: "#fff" }}>
                <div><div className="faint" style={{ fontSize: 12 }}>Abonnement</div><b style={{ fontSize: 18 }}>À partir de {valeurs.abonnement_prix || "—"} €</b><span className="faint"> / mois</span></div>
                <div><div className="faint" style={{ fontSize: 12 }}>Intervention</div><b style={{ fontSize: 18 }}>À partir de {valeurs.intervention_prix || "—"} €</b></div>
              </div>
            )}
          </div>
          {!lectureSeule && <Button type="primary" loading={saving} onClick={enregistrer}>Publier sur {site.nom}</Button>}
        </Form>
      )}
    </Panel>
  );
}

export function PrixPage() {
  const { isAdmin, loading } = useRole();
  return (
    <>
      <PageHeader title="Prix & bandeau" subtitle="Modifiez les prix affichés et le bandeau d'annonce des sites, sans redéploiement." crumbs={[{ label: "Contenu" }, { label: "Prix & bandeau" }]} />
      <ReadOnlyNotice show={!loading && !isAdmin} />
      <div className="grid-3" style={{ alignItems: "start" }}>
        {SITES.map((s) => <SiteCard key={s.entity} site={s} lectureSeule={!isAdmin} />)}
      </div>
      <p className="faint" style={{ fontSize: 12.5, marginTop: 16 }}>
        Les pages publiques gardent une valeur de secours dans leur code (bonne pour le référencement) et affichent la valeur publiée ici dès le chargement. Les prix entreprises restent sur devis.
      </p>
    </>
  );
}
