import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, App, Button, Col, DatePicker, Form, Input, InputNumber, Row, Select, Skeleton } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useInvalidate } from "@refinedev/core";
import { supabaseClient } from "../../supabaseClient";
import { PageHeader, Panel } from "../../components/ui";
import { ClientSelect } from "../../components/forms/ClientSelect";
import { adresseComplete, type Client } from "../../components/forms/ClientDrawer";
import { LinesEditor, ligneVide } from "../../components/documents/LinesEditor";
import { eur, totalHT, type Ligne } from "../../lib/format";
import { ENTITES, options } from "../../lib/statuts";
import { useEntreprise } from "../../lib/hooks";
import { messageErreurBase } from "../../lib/functions";
import { lignesDe } from "../../lib/document";

type Kind = "devis" | "facture";

interface Etat {
  client_id: string | null;
  client_nom: string;
  client_email: string;
  client_adresse: string;
  entity: string;
  date: Dayjs;
  validite_jours: number;
  date_echeance: Dayjs | null;
  tva_taux: number;
  lignes: Ligne[];
  conditions: string;
  notes: string;
  lead_id: string | null;
  devis_id: string | null;
}

const LEAD_AMONT = ["nouveau", "a_contacter", "contacte"];

/** Création / modification d'un devis ou d'une facture (un seul écran, même logique). */
export function DocumentEditor({ kind }: { kind: Kind }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const { message } = App.useApp();
  const { entreprise, loading: entLoading } = useEntreprise();
  const isDevis = kind === "devis";
  const table = isDevis ? "devis" : "factures";
  const base = isDevis ? "/devis" : "/factures";
  const edition = !!id;

  const [etat, setEtat] = useState<Etat | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [verrou, setVerrou] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [erreurs, setErreurs] = useState<{ client?: string; lignes?: string }>({});

  // Chargement initial : édition, duplication, depuis un client / une demande / un devis.
  useEffect(() => {
    if (entLoading) return;
    let annule = false;
    (async () => {
      const delai = entreprise?.delai_paiement_jours ?? 30;
      const e: Etat = {
        client_id: null, client_nom: "", client_email: "", client_adresse: "",
        entity: "infogerance", date: dayjs(),
        validite_jours: entreprise?.validite_devis_jours ?? 30,
        date_echeance: isDevis ? null : dayjs().add(delai, "day"),
        tva_taux: 0, lignes: [ligneVide()],
        conditions: (isDevis ? entreprise?.conditions_devis : entreprise?.mentions_facture) ?? "",
        notes: "", lead_id: null, devis_id: null,
      };
      const remplirClient = (c: Partial<Client> | null) => {
        if (!c) return;
        e.client_id = (c as Client).id ?? null;
        e.client_nom = c.entreprise || c.nom || "";
        e.client_email = c.email ?? "";
        e.client_adresse = adresseComplete(c);
        if (c.entity) e.entity = c.entity;
      };

      if (edition) {
        const { data: d, error } = await supabaseClient.from(table).select("*").eq("id", id).maybeSingle();
        if (error || !d) { message.error("Document introuvable."); navigate(base); return; }
        setNumero(d.numero);
        const statut = isDevis ? d.statut : d.status;
        if (!isDevis && statut !== "brouillon") setVerrou("Une facture émise ne peut plus être modifiée : annulez-la puis créez-en une nouvelle si nécessaire.");
        if (isDevis && (d.signed_at || ["accepte", "refuse", "expire"].includes(statut))) setVerrou("Ce devis est signé ou clôturé : dupliquez-le pour proposer une nouvelle version.");
        Object.assign(e, {
          client_id: d.client_id, client_nom: d.client_nom ?? "", client_email: d.client_email ?? "", client_adresse: d.client_adresse ?? "",
          entity: d.entity, date: dayjs(isDevis ? d.date_devis : d.date_facture),
          validite_jours: d.validite_jours ?? e.validite_jours,
          date_echeance: d.date_echeance ? dayjs(d.date_echeance) : null,
          tva_taux: Number(d.tva_taux) || 0, lignes: lignesDe(d).length ? lignesDe(d) : [ligneVide()],
          conditions: d.conditions ?? "", notes: d.notes ?? "", lead_id: d.lead_id ?? null, devis_id: d.devis_id ?? null,
        });
      } else {
        const dup = params.get("dupliquer");
        const fromDevis = params.get("devis");
        const clientId = params.get("client");
        const leadId = params.get("lead");
        if (dup || fromDevis) {
          const { data: d } = await supabaseClient.from("devis").select("*").eq("id", dup || fromDevis).maybeSingle();
          if (d) {
            Object.assign(e, {
              client_id: d.client_id, client_nom: d.client_nom ?? "", client_email: d.client_email ?? "", client_adresse: d.client_adresse ?? "",
              entity: d.entity, tva_taux: Number(d.tva_taux) || 0, lignes: lignesDe(d).length ? lignesDe(d) : [ligneVide()],
              lead_id: d.lead_id ?? null,
            });
            if (dup) e.conditions = d.conditions ?? e.conditions;
            if (fromDevis) e.devis_id = d.id;
          }
        }
        if (clientId) {
          const { data: c } = await supabaseClient.from("clients").select("*").eq("id", clientId).maybeSingle();
          remplirClient(c);
        }
        if (leadId && isDevis) {
          const { data: l } = await supabaseClient.from("leads").select("*").eq("id", leadId).maybeSingle();
          if (l) {
            e.lead_id = l.id;
            e.entity = l.entity ?? e.entity;
            if (l.client_id) {
              const { data: c } = await supabaseClient.from("clients").select("*").eq("id", l.client_id).maybeSingle();
              remplirClient(c);
            } else {
              e.client_nom = l.entreprise || l.nom || "";
              e.client_email = l.email ?? "";
            }
            if (l.message) e.notes = `Demande initiale : ${l.message}`;
          }
        }
      }
      if (!annule) setEtat(e);
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, entLoading]);

  const ht = useMemo(() => totalHT(etat?.lignes ?? []), [etat?.lignes]);
  const tva = etat?.tva_taux ?? 0;
  const ttc = ht * (1 + tva / 100);
  const maj = (patch: Partial<Etat>) => setEtat((s) => (s ? { ...s, ...patch } : s));

  const enregistrer = async () => {
    if (!etat) return;
    const lignes = etat.lignes.filter((l) => l.libelle.trim() || l.pu);
    const errs: typeof erreurs = {};
    if (!etat.client_nom.trim()) errs.client = "Choisissez un client ou saisissez un nom.";
    if (!lignes.length || lignes.some((l) => !l.libelle.trim())) errs.lignes = "Chaque ligne doit avoir une désignation.";
    setErreurs(errs);
    if (Object.keys(errs).length) {
      message.warning("Complétez les champs signalés.");
      return;
    }
    setSaving(true);
    const htFinal = totalHT(lignes);
    const ttcFinal = Math.round(htFinal * (1 + tva / 100) * 100) / 100;
    const commun = {
      client_id: etat.client_id, client_nom: etat.client_nom.trim(), client_email: etat.client_email.trim() || null,
      client_adresse: etat.client_adresse.trim() || null, entity: etat.entity, lignes, tva_taux: tva,
      total_ht: htFinal, total_ttc: ttcFinal, conditions: etat.conditions.trim() || null, notes: etat.notes.trim() || null,
    };
    const valeurs = isDevis
      ? { ...commun, date_devis: etat.date.format("YYYY-MM-DD"), validite_jours: etat.validite_jours, lead_id: etat.lead_id }
      : {
          ...commun, date_facture: etat.date.format("YYYY-MM-DD"),
          date_echeance: etat.date_echeance ? etat.date_echeance.format("YYYY-MM-DD") : null,
          devis_id: etat.devis_id,
          // Champs historiques conservés pour la compatibilité (ancien admin, emails).
          libelle: lignes.length === 1 ? lignes[0].libelle : `${lignes[0].libelle} (+${lignes.length - 1} ligne${lignes.length > 2 ? "s" : ""})`,
          quantite: 1, prix_unitaire: htFinal,
        };
    try {
      let docId = id;
      if (edition) {
        const { error } = await supabaseClient.from(table).update(valeurs).eq("id", id);
        if (error) throw error;
      } else {
        const { data: num, error: e1 } = await supabaseClient.rpc(isDevis ? "next_devis_numero" : "next_facture_numero");
        if (e1) throw e1;
        const { data, error } = await supabaseClient.from(table)
          .insert({ ...valeurs, numero: num, ...(isDevis ? { statut: "brouillon" } : { status: "brouillon" }) })
          .select("id").single();
        if (error) throw error;
        docId = data.id;
        // Cohérence du parcours commercial.
        if (isDevis && etat.lead_id) {
          await supabaseClient.from("leads").update({ status: "devis_a_preparer" }).eq("id", etat.lead_id).in("status", LEAD_AMONT);
        }
        if (!isDevis && etat.devis_id) {
          await supabaseClient.from("devis").update({ statut: "accepte" }).eq("id", etat.devis_id).eq("statut", "envoye");
        }
      }
      invalidate({ resource: table, invalidates: ["list", "detail"] });
      message.success(edition ? "Modifications enregistrées" : `${isDevis ? "Devis" : "Facture"} créé${isDevis ? "" : "e"} en brouillon`);
      navigate(`${base}/${docId}`);
    } catch (err) {
      message.error(messageErreurBase(err));
    } finally {
      setSaving(false);
    }
  };

  const titre = edition ? `Modifier ${isDevis ? "le devis" : "la facture"} ${numero ?? ""}` : isDevis ? "Nouveau devis" : "Nouvelle facture";

  if (!etat) {
    return (
      <>
        <PageHeader title={titre} crumbs={[{ label: isDevis ? "Devis" : "Factures", to: base }, { label: edition ? "Modification" : "Création" }]} />
        <Panel><Skeleton active paragraph={{ rows: 8 }} /></Panel>
      </>
    );
  }

  const nomClientForm = (
    <Row gutter={12}>
      <Col xs={24} md={12}>
        <Form.Item label="Nom affiché sur le document" htmlFor="doc-client-nom" validateStatus={erreurs.client ? "error" : undefined} help={erreurs.client}>
          <Input id="doc-client-nom" value={etat.client_nom} onChange={(e) => maj({ client_nom: e.target.value })} placeholder="Entreprise ou nom du client" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Email du client" htmlFor="doc-client-email">
          <Input id="doc-client-email" value={etat.client_email} onChange={(e) => maj({ client_email: e.target.value })} placeholder="Pour l'envoi par email" />
        </Form.Item>
      </Col>
      <Col xs={24}>
        <Form.Item label="Adresse de facturation" htmlFor="doc-client-adresse" style={{ marginBottom: 0 }}>
          <Input.TextArea id="doc-client-adresse" value={etat.client_adresse} onChange={(e) => maj({ client_adresse: e.target.value })} autoSize={{ minRows: 1, maxRows: 3 }} />
        </Form.Item>
      </Col>
    </Row>
  );

  return (
    <>
      <PageHeader
        title={titre}
        crumbs={[{ label: isDevis ? "Devis" : "Factures", to: base }, { label: edition ? numero ?? "Modification" : "Création" }]}
        back={edition ? `${base}/${id}` : base}
        actions={
          <>
            <Button onClick={() => navigate(edition ? `${base}/${id}` : base)}>Annuler</Button>
            <Button type="primary" loading={saving} onClick={enregistrer} disabled={!!verrou}>
              {edition ? "Enregistrer" : "Créer le brouillon"}
            </Button>
          </>
        }
      />
      {verrou && <Alert type="warning" showIcon message={verrou} style={{ marginBottom: 16 }} />}
      <Form layout="vertical" component="div" disabled={!!verrou}>
        <div className="doc-layout">
          <div className="section-gap">
            <Panel title="Client">
              <Form.Item label="Client du CRM" htmlFor="doc-client" extra="Choisissez un client pour lier le document à sa fiche (recommandé).">
                <ClientSelect
                  id="doc-client"
                  value={etat.client_id}
                  status={erreurs.client ? "error" : undefined}
                  onChange={(c) =>
                    maj(c
                      ? { client_id: c.id, client_nom: c.entreprise || c.nom || "", client_email: c.email ?? "", client_adresse: adresseComplete(c), entity: c.entity || etat.entity }
                      : { client_id: null })
                  }
                />
              </Form.Item>
              {nomClientForm}
            </Panel>
            <Panel title="Prestations" hint="Le total se calcule automatiquement.">
              <LinesEditor value={etat.lignes} onChange={(l) => maj({ lignes: l })} error={erreurs.lignes} />
            </Panel>
            <Panel title={isDevis ? "Conditions & notes" : "Mentions & notes"}>
              <Form.Item htmlFor="doc-conditions" label={isDevis ? "Conditions (imprimées sur le devis)" : "Conditions de paiement (imprimées sur la facture)"}
                extra={isDevis ? "Acompte, délais d'intervention, modalités de paiement…" : "Ex. Paiement à réception par virement."}>
                <Input.TextArea id="doc-conditions" value={etat.conditions} onChange={(e) => maj({ conditions: e.target.value })} autoSize={{ minRows: 2, maxRows: 6 }} />
              </Form.Item>
              <Form.Item label="Notes internes (non imprimées)" htmlFor="doc-notes" style={{ marginBottom: 0 }}>
                <Input.TextArea id="doc-notes" value={etat.notes} onChange={(e) => maj({ notes: e.target.value })} autoSize={{ minRows: 2, maxRows: 6 }} />
              </Form.Item>
            </Panel>
          </div>
          <div className="detail-side">
            <Panel title="Paramètres">
              <Form.Item label="Activité" htmlFor="doc-activite">
                <Select id="doc-activite" value={etat.entity} onChange={(v) => maj({ entity: v })} options={options(ENTITES)} />
              </Form.Item>
              <Form.Item label={isDevis ? "Date du devis" : "Date de facture"} htmlFor="doc-date">
                <DatePicker id="doc-date" value={etat.date} onChange={(v) => v && maj({ date: v })} format="DD/MM/YYYY" style={{ width: "100%" }} allowClear={false} />
              </Form.Item>
              {isDevis ? (
                <Form.Item label="Validité" htmlFor="doc-validite">
                  <InputNumber id="doc-validite" decimalSeparator="," min={1} max={365} value={etat.validite_jours} onChange={(v) => maj({ validite_jours: Number(v) || 30 })} addonAfter="jours" style={{ width: "100%" }} />
                </Form.Item>
              ) : (
                <Form.Item label="Échéance" htmlFor="doc-echeance" extra="Vide = paiement à réception.">
                  <DatePicker id="doc-echeance" value={etat.date_echeance} onChange={(v) => maj({ date_echeance: v })} format="DD/MM/YYYY" style={{ width: "100%" }} />
                </Form.Item>
              )}
              <Form.Item label="TVA" htmlFor="doc-tva" extra="0 % en franchise de TVA (art. 293 B du CGI)." style={{ marginBottom: 0 }}>
                <InputNumber id="doc-tva" decimalSeparator="," min={0} max={100} step={0.5} value={etat.tva_taux} onChange={(v) => maj({ tva_taux: Number(v) || 0 })} addonAfter="%" style={{ width: "100%" }} />
              </Form.Item>
            </Panel>
            <Panel title="Totaux">
              <div className="totals">
                <div className="row"><span>Total HT</span><span className="tabular">{eur(ht)}</span></div>
                {tva > 0 && <div className="row"><span>TVA {tva} %</span><span className="tabular">{eur(ttc - ht)}</span></div>}
                <div className="row grand"><span>{tva > 0 ? "Total TTC" : "Total"}</span><span className="tabular">{eur(ttc)}</span></div>
                {tva === 0 && <div className="mention">TVA non applicable, art. 293 B du CGI</div>}
              </div>
              <Button type="primary" block loading={saving} onClick={enregistrer} disabled={!!verrou} style={{ marginTop: 16 }}>
                {edition ? "Enregistrer" : "Créer le brouillon"}
              </Button>
              <div className="mention" style={{ marginTop: 8 }}>
                Le document est créé en brouillon : vous pourrez le relire, l'imprimer puis l'envoyer.
              </div>
            </Panel>
          </div>
        </div>
      </Form>
    </>
  );
}
