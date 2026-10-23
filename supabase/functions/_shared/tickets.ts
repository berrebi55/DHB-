// =====================================================================
//  DHB — ticketing par email (lot 18) : traitement d'un email reçu.
//
//  Resend Inbound reçoit l'email ; DHB le récupère (API « receiving ») et
//  devient la référence : ticket, message, pièces jointes (espace privé).
//  Règles de sécurité :
//   - l'adresse de l'expéditeur peut être falsifiée : elle sert à rattacher
//     (client connu, fil existant), jamais à donner un accès ;
//   - un email n'est ajouté à un ticket existant que si l'expéditeur fait déjà
//     partie de la conversation, sinon nouveau ticket « à qualifier » ;
//   - réponses automatiques, boucles et rafales ignorées ;
//   - pièces jointes : types et tailles limités, jamais exécutées ni affichées.
// =====================================================================
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { HttpError } from "./securite.ts";

const API = () => (Deno.env.get("RESEND_API_URL") ?? "https://api.resend.com").replace(/\/$/, "");
const ESPACE = "documents";
export const LIMITES = { piecesParEmail: 10, octetsParPiece: 10 * 1024 * 1024, octetsParEmail: 25 * 1024 * 1024, emailsParHeure: 20, texte: 50000 };
// Fichiers exécutables ou actifs : jamais conservés.
const EXTENSIONS_INTERDITES = /\.(exe|com|bat|cmd|scr|pif|msi|msp|jar|js|jse|vbs|vbe|ps1|psm1|wsf|wsh|hta|cpl|reg|lnk|dll|sh|app|dmg|iso|html?|svg|xhtml)$/i;

export interface EmailRecu {
  id: string; from: string; to: string[]; subject: string | null; text: string | null; html: string | null;
  headers: Record<string, string>; message_id: string | null; received_for?: string[];
  attachments?: { id: string; filename: string; content_type: string; size: number }[];
}
type Issue = { statut: "traite" | "ignore"; detail: string; ticket_id?: string };

async function resend<T>(chemin: string): Promise<T> {
  const cle = Deno.env.get("RESEND_API_KEY");
  if (!cle) throw new HttpError(503, "resend_non_configure");
  let r: Response;
  try {
    r = await fetch(`${API()}${chemin}`, { headers: { Authorization: `Bearer ${cle}` } });
  } catch {
    throw new HttpError(502, "resend_injoignable");
  }
  if (r.status === 404) throw new HttpError(404, "email_introuvable_chez_resend");
  if (!r.ok) throw new HttpError(502, `resend_${r.status}`);
  return await r.json() as T;
}

const adresse = (v: string | null | undefined) => {
  const m = String(v ?? "").match(/<([^>]+)>/);
  return (m ? m[1] : String(v ?? "")).trim().toLowerCase();
};
const nomAffiche = (v: string | null | undefined) => {
  const m = String(v ?? "").match(/^\s*"?([^"<]*?)"?\s*</);
  return m && m[1].trim() ? m[1].trim().slice(0, 120) : null;
};
const enTete = (h: Record<string, string>, nom: string) => {
  const k = Object.keys(h ?? {}).find((x) => x.toLowerCase() === nom);
  return k ? String(h[k]) : "";
};

/** Texte lisible d'un email : la version texte, sinon le HTML débarrassé de ses balises. */
export function texteLisible(e: Pick<EmailRecu, "text" | "html">): string {
  let t = (e.text ?? "").trim();
  if (!t && e.html) {
    t = e.html
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  }
  return t.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, LIMITES.texte);
}

/** Objet sans « Re: / TR: / Fwd: » ni référence de ticket. */
export const objetPropre = (s: string | null) =>
  (s ?? "").replace(/\[DHB #\d+\]/gi, "").replace(/^\s*((re|tr|fw|fwd|réf)\s*:\s*)+/i, "").trim().slice(0, 200) || "(sans objet)";

/** Réponse automatique (absence, accusé de réception, liste de diffusion) : ne crée rien. */
export function estAutomatique(h: Record<string, string>): boolean {
  const auto = enTete(h, "auto-submitted").toLowerCase();
  const prec = enTete(h, "precedence").toLowerCase();
  return (auto !== "" && auto !== "no") || ["bulk", "junk", "list", "auto_reply"].includes(prec)
    || !!enTete(h, "x-autoreply") || !!enTete(h, "x-autorespond") || !!enTete(h, "list-id");
}

export async function adressesSupport(sb: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await sb.from("integrations").select("details").eq("cle", "email_entrant").maybeSingle();
  const a = ((data?.details ?? {}) as { adresses?: Record<string, string> }).adresses ?? {};
  return Object.fromEntries(Object.entries(a).map(([k, v]) => [k, String(v ?? "").trim().toLowerCase()]).filter(([, v]) => v));
}

/** Traite un email reçu (identifiant Resend). Idempotent : un email déjà enregistré n'est pas refait. */
export async function traiterEmailRecu(sb: SupabaseClient, emailId: string): Promise<Issue> {
  const { data: deja } = await sb.from("ticket_messages").select("ticket_id").eq("resend_id", emailId).maybeSingle();
  if (deja) return { statut: "traite", detail: "déjà enregistré", ticket_id: deja.ticket_id };

  const e = await resend<EmailRecu>(`/emails/receiving/${encodeURIComponent(emailId)}`);
  const de = adresse(enTete(e.headers, "from") || e.from);
  // Adresse stricte : elle sert ensuite dans des filtres de requête (aucun caractère spécial).
  if (!/^[a-z0-9._+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(de) || de.length > 254) return { statut: "ignore", detail: "expéditeur illisible" };
  if (estAutomatique(e.headers)) return { statut: "ignore", detail: "réponse automatique ou liste de diffusion" };

  // Destinataires : une adresse de support configurée (sinon on accepte tout : domaine de test).
  const support = await adressesSupport(sb);
  const destinataires = [...(e.to ?? []), ...(e.received_for ?? [])].map(adresse);
  const nos = Object.values(support);
  const expediteurs = [...nos, adresse(Deno.env.get("NOTIFY_FROM"))].filter(Boolean);
  if (expediteurs.includes(de)) return { statut: "ignore", detail: "email envoyé par DHB lui-même (boucle)" };
  let entity = "infogerance";
  if (nos.length) {
    const site = Object.entries(support).find(([, v]) => destinataires.includes(v));
    if (!site) return { statut: "ignore", detail: "aucune adresse de support parmi les destinataires" };
    entity = site[0];
  }

  // Rafale : au-delà de 20 emails par heure d'un même expéditeur, on n'enregistre plus.
  const { count } = await sb.from("ticket_messages").select("id", { count: "exact", head: true })
    .eq("sens", "entrant").eq("de_email", de).gte("created_at", new Date(Date.now() - 3600000).toISOString());
  if ((count ?? 0) >= LIMITES.emailsParHeure) return { statut: "ignore", detail: "trop d'emails de cet expéditeur en une heure" };

  const texte = texteLisible(e);
  const sujet = objetPropre(e.subject);

  // Fil existant : référence [DHB #n] dans l'objet, ou réponse à un message connu
  // — et seulement si l'expéditeur fait déjà partie de la conversation.
  let ticket: { id: string; status: string; client_email: string | null } | null = null;
  const ref = (e.subject ?? "").match(/\[DHB #(\d{1,12})\]/i);
  const candidats: { id: string; status: string; client_email: string | null }[] = [];
  if (ref) {
    const { data } = await sb.from("tickets").select("id, status, client_email").eq("numero", Number(ref[1])).maybeSingle();
    if (data) candidats.push(data);
  }
  const reponseA = [enTete(e.headers, "in-reply-to"), ...enTete(e.headers, "references").split(/\s+/)].map((x) => x.trim()).filter(Boolean);
  if (!candidats.length && reponseA.length) {
    const { data } = await sb.from("ticket_messages").select("ticket_id").in("message_id", reponseA.slice(0, 20)).limit(1);
    if (data?.length) {
      const { data: t } = await sb.from("tickets").select("id, status, client_email").eq("id", data[0].ticket_id).maybeSingle();
      if (t) candidats.push(t);
    }
  }
  let refRefusee = false;
  for (const c of candidats) {
    const { count: participe } = await sb.from("ticket_messages").select("id", { count: "exact", head: true })
      .eq("ticket_id", c.id).or(`de_email.eq.${de},a_email.eq.${de}`);
    if (adresse(c.client_email) === de || (participe ?? 0) > 0) { ticket = c; break; }
    refRefusee = true;
  }

  // Client connu : un seul client avec cet email, sinon « à qualifier ».
  // ilike (casse ignorée) avec « _ » échappé : il ne doit pas servir de joker.
  const { data: clients } = await sb.from("clients").select("id, nom, entreprise").ilike("email", de.replace(/_/g, "\\_")).limit(2);
  const client = clients?.length === 1 ? clients[0] : null;

  if (!ticket) {
    const { data: t, error } = await sb.from("tickets").insert({
      sujet, description: texte.slice(0, 2000), entity, canal: "email", status: "ouvert", priorite: "normale",
      client_email: de, client_nom: nomAffiche(enTete(e.headers, "from")) ?? client?.entreprise ?? client?.nom ?? de,
      client_id: client?.id ?? null, a_qualifier: !client,
    }).select("id, status, client_email").single();
    if (error || !t) throw new HttpError(500, "ticket_non_cree");
    ticket = t;
  } else if (["resolu", "ferme"].includes(ticket.status)) {
    await sb.from("tickets").update({ status: "ouvert" }).eq("id", ticket.id);   // le client relance : on rouvre
  }

  const note = refRefusee ? "\n\n[DHB] Référence de ticket présente dans l'objet, mais l'expéditeur ne fait pas partie de ce ticket : nouveau ticket créé." : "";
  const { data: msg, error: eMsg } = await sb.from("ticket_messages").insert({
    ticket_id: ticket.id, sens: "entrant", de_email: de, de_nom: nomAffiche(enTete(e.headers, "from")),
    a_email: destinataires[0] ?? null, sujet: (e.subject ?? "").slice(0, 300), texte: (texte + note).slice(0, LIMITES.texte),
    message_id: e.message_id, resend_id: e.id,
  }).select("id").single();
  if (eMsg?.code === "23505") return { statut: "traite", detail: "déjà enregistré", ticket_id: ticket.id };
  if (eMsg || !msg) throw new HttpError(500, "message_non_enregistre");

  // Pièces jointes : copiées dans l'espace privé, dans les limites.
  if (e.attachments?.length) {
    const liste = await resend<{ data: { id: string; filename: string; content_type: string; size: number; download_url: string }[] }>(
      `/emails/receiving/${encodeURIComponent(emailId)}/attachments`);
    let total = 0; const refus: string[] = [];
    for (const [i, p] of (liste.data ?? []).entries()) {
      // Nom de fichier : liste blanche (lettres, chiffres, espace, « . _ ( ) - »), le reste devient « _ ».
      const nom = (p.filename || "piece").replace(/[^\p{L}\p{N} ._()-]/gu, "_").replace(/\.{2,}/g, ".").replace(/^\./, "_").slice(0, 150);
      if (i >= LIMITES.piecesParEmail) { refus.push(`${nom} (plus de ${LIMITES.piecesParEmail} pièces)`); continue; }
      if (EXTENSIONS_INTERDITES.test(nom)) { refus.push(`${nom} (type de fichier refusé)`); continue; }
      if (p.size > LIMITES.octetsParPiece || total + p.size > LIMITES.octetsParEmail) { refus.push(`${nom} (trop volumineux)`); continue; }
      const r = await fetch(p.download_url).catch(() => null);
      if (!r?.ok) throw new HttpError(502, "piece_jointe_illisible");      // réessayé plus tard
      const octets = new Uint8Array(await r.arrayBuffer());
      if (octets.length > LIMITES.octetsParPiece) { refus.push(`${nom} (trop volumineux)`); continue; }
      total += octets.length;
      const chemin = `tickets/${ticket.id}/${msg.id}/${i + 1}-${nom}`;
      const { error: eUp } = await sb.storage.from(ESPACE).upload(chemin, octets, { contentType: "application/octet-stream", upsert: true });
      if (eUp) throw new HttpError(502, "stockage_indisponible");
      await sb.from("ticket_pieces").upsert({ ticket_id: ticket.id, message_id: msg.id, nom, type_mime: p.content_type?.slice(0, 100) ?? null, taille: octets.length, chemin }, { onConflict: "chemin" });
    }
    if (refus.length) {
      await sb.from("ticket_messages").update({ texte: `${texte}${note}\n\n[DHB] Pièces jointes non conservées : ${refus.join(", ")}.`.slice(0, LIMITES.texte) }).eq("id", msg.id);
    }
  }
  return { statut: "traite", detail: `email enregistré dans le ticket`, ticket_id: ticket.id };
}

/** Vérifie la signature d'un webhook Resend (schéma Svix : HMAC-SHA256, secret « whsec_… »). */
export async function signatureSvixValide(req: Headers, corps: string, secret: string, maintenant = Date.now()): Promise<boolean> {
  const id = req.get("svix-id"), t = req.get("svix-timestamp"), sigs = req.get("svix-signature");
  if (!id || !t || !sigs || !/^\d+$/.test(t)) return false;
  if (Math.abs(maintenant / 1000 - Number(t)) > 300) return false;       // rejeu : 5 minutes au plus
  let cleBrute: Uint8Array<ArrayBuffer>;
  try {
    cleBrute = Uint8Array.from(atob(secret.replace(/^whsec_/, "")), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const cle = await crypto.subtle.importKey("raw", cleBrute, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(`${id}.${t}.${corps}`)));
  const attendu = btoa(String.fromCharCode(...mac));
  return sigs.split(" ").some((s) => {
    const [v, val] = s.split(",");
    if (v !== "v1" || !val || val.length !== attendu.length) return false;
    let diff = 0;
    for (let i = 0; i < val.length; i++) diff |= val.charCodeAt(i) ^ attendu.charCodeAt(i);
    return diff === 0;
  });
}
