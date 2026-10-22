// =====================================================================
//  DHB — Stripe : vérification de signature et lecture des événements
//  (utilisé par la fonction stripe-webhook ; testé séparément).
// =====================================================================
import { secretValide } from "./securite.ts";

const TOLERANCE_S = 300;

/** Vérifie l'en-tête Stripe-Signature (t=…, v1=…) : HMAC-SHA256 de « t.corps ». */
export async function signatureValide(entete: string | null, corps: string, secret: string, maintenant = Date.now()): Promise<boolean> {
  if (!entete) return false;
  const parts = entete.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !/^\d+$/.test(t) || !signatures.length) return false;
  if (Math.abs(maintenant / 1000 - Number(t)) > TOLERANCE_S) return false;
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(`${t}.${corps}`));
  const attendu = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((s) => secretValide(s, attendu));
}

/** Date du jour (YYYY-MM-DD) à Paris pour un horodatage Stripe (secondes). */
const jourParis = (secondes?: number | null) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" }).format(secondes ? new Date(secondes * 1000) : new Date());

/** Nombre de mois couverts par un paiement récurrent (annuel = 12, trimestriel = 3…). */
const mois = (r?: { interval?: string; interval_count?: number } | null) =>
  !r || !["month", "year"].includes(r.interval ?? "") ? 1 : (r.interval === "year" ? 12 : 1) * Math.max(Number(r.interval_count) || 1, 1);

// deno-lint-ignore no-explicit-any
export type Objet = any;

/** Libellé et périodicité exacts (produit Stripe), si la clé secrète est disponible. */
async function detailSession(sessionId: string): Promise<{ libelle?: string; intervalle?: number }> {
  const cle = Deno.env.get("STRIPE_SECRET_KEY");
  if (!cle) return {};
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=1`, {
      headers: { Authorization: `Bearer ${cle}` },
    });
    if (!r.ok) return {};
    const l = (await r.json())?.data?.[0];
    return { libelle: l?.description ?? undefined, intervalle: l?.price?.recurring ? mois(l.price.recurring) : undefined };
  } catch {
    return {};
  }
}

/** Traduit un événement Stripe en données pour stripe_traiter_evenement. */
export async function analyser(evt: Objet): Promise<{ type: "paiement" | "abonnement_statut" | "ignore"; donnees: Record<string, unknown> }> {
  const o = evt?.data?.object ?? {};
  switch (evt?.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (o.payment_status !== "paid") return { type: "ignore", donnees: { raison: `Paiement non finalisé (${o.payment_status ?? "?"})` } };
      if (String(o.currency ?? "eur").toLowerCase() !== "eur") return { type: "ignore", donnees: { raison: `Devise non gérée (${o.currency})` } };
      const abonnement = o.mode === "subscription";
      const det = await detailSession(o.id);
      const c = o.customer_details ?? {};
      const a = c.address ?? {};
      return {
        type: "paiement",
        donnees: {
          montant: (Number(o.amount_total) || 0) / 100,
          // Même référence que l'événement invoice.paid du 1er paiement d'abonnement → jamais deux factures.
          reference: abonnement ? (o.invoice ?? o.id) : (o.payment_intent ?? o.id),
          email: c.email ?? o.customer_email ?? null,
          nom: c.name ?? null,
          telephone: c.phone ?? null,
          adresse: [a.line1, a.line2].filter(Boolean).join(" ") || null,
          code_postal: a.postal_code ?? null,
          ville: a.city ?? null,
          libelle: det.libelle ?? (abonnement ? "Abonnement (paiement en ligne)" : "Intervention (paiement en ligne)"),
          subscription_id: abonnement ? o.subscription ?? null : null,
          customer_id: typeof o.customer === "string" ? o.customer : null,
          intervalle_mois: abonnement ? det.intervalle ?? 1 : null,
          date: jourParis(evt.created),
          entity: "particuliers",
        },
      };
    }
    case "invoice.paid": {
      const sub = o.subscription ?? o.parent?.subscription_details?.subscription ?? null;
      if (!sub) return { type: "ignore", donnees: { raison: "Facture Stripe sans abonnement (déjà traitée par la session de paiement)" } };
      if (!(Number(o.amount_paid) > 0)) return { type: "ignore", donnees: { raison: "Montant nul" } };
      const ligne = o.lines?.data?.[0] ?? {};
      const recurrence = ligne.price?.recurring ?? ligne.pricing?.price_details?.recurring ?? null;
      return {
        type: "paiement",
        donnees: {
          montant: Number(o.amount_paid) / 100,
          reference: o.id,
          email: o.customer_email ?? null,
          nom: o.customer_name ?? null,
          libelle: ligne.description ?? "Abonnement (paiement en ligne)",
          subscription_id: typeof sub === "string" ? sub : sub?.id,
          customer_id: typeof o.customer === "string" ? o.customer : null,
          intervalle_mois: mois(recurrence),
          date: jourParis(o.status_transitions?.paid_at ?? evt.created),
          entity: "particuliers",
        },
      };
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const s = evt.type === "customer.subscription.deleted" ? "canceled" : o.status;
      const statut = ["active", "trialing"].includes(s) ? "actif" : s === "canceled" || s === "incomplete_expired" ? "resilie" : "suspendu";
      return { type: "abonnement_statut", donnees: { subscription_id: o.id, statut } };
    }
    default:
      return { type: "ignore", donnees: { raison: `Événement non utilisé (${evt?.type ?? "?"})` } };
  }
}
