// Tests navigateur du lot 8 : emails depuis les fiches, pages Communication.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { brancher, CLE_SESSION, session, HOTE } from "./faux-supabase.mjs";

const DIST = process.argv[2];
const AXE = fs.readFileSync(path.resolve("node_modules/axe-core/axe.min.js"), "utf8");
const res = []; const ok = (n, c, d) => res.push({ n, ok: !!c, d });
const nav = await chromium.launch({ channel: "chrome" });
const erreurs = []; const appels = [];
let reponse = null;   // réponse forcée de email-send
const MODELES = [
  { cle: "libre", nom: "Message libre", cible: "tous", sujet: "", corps: "Bonjour {{contact_nom}},\n\n\n\nCordialement,\n{{signature}}", actif: true },
  { cle: "rappel_facture", nom: "Rappel de facture", cible: "facture", sujet: "Rappel — facture {{facture_numero}}", corps: "Bonjour {{contact_nom}}, reste {{facture_reste}}.", actif: true },
  { cle: "relance_devis", nom: "Relance d'un devis", cible: "devis", sujet: "Votre devis {{devis_numero}}", corps: "Bonjour", actif: true },
  { cle: "suivi_demande", nom: "Suite à votre demande", cible: "lead", sujet: "Votre demande", corps: "Bonjour {{contact_nom}}", actif: true },
];
const EMAILS = [
  { id: "e1000000-0000-4000-8000-000000000001", created_at: "2026-10-21T09:00:00Z", origine: "facture", destinataire: "client0@exemple.fr", destinataire_reel: "moi@exemple.fr", sujet: "Votre facture 2026-0001", corps_html: "<p>Bonjour <b>Cabinet</b></p>", piece_jointe: "Facture-2026-0001.pdf", statut: "envoye", erreur: null, envoye_par_email: "admin@test.fr", client_id: "00000002-0000-4000-8000-000000000001", facture_id: "00000004-0000-4000-8000-000000000001" },
  { id: "e1000000-0000-4000-8000-000000000002", created_at: "2026-10-20T09:00:00Z", origine: "relance_devis", destinataire: "client0@exemple.fr", destinataire_reel: null, sujet: "Votre devis DEV-2026-0001", corps_html: "<p>Relance</p>", piece_jointe: null, statut: "echec", erreur: "API key is invalid", envoye_par_email: null, client_id: "00000002-0000-4000-8000-000000000001", devis_id: "00000003-0000-4000-8000-000000000001" },
];

async function ouvrir(vue, chemin) {
  const ctx = await nav.newContext(vue === "mobile" ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  await brancher(ctx);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "content-range" };
  await ctx.route(`${HOTE}/functions/v1/email-send`, async (r) => {
    if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    const c = JSON.parse(r.request().postData() || "{}");
    appels.push(c);
    if (reponse) return r.fulfill({ status: reponse.status, headers: cors, contentType: "application/json", body: JSON.stringify(reponse.body) });
    const body = c.apercu
      ? { destinataire: "client0@exemple.fr", sujet: c.sujet.replace("{{facture_numero}}", "2026-0001"), html: "<p>Bonjour Contact 1</p>", redirection: "moi@exemple.fr" }
      : { ok: true, email_id: "x", destinataire: "client0@exemple.fr" };
    return r.fulfill({ status: 200, headers: cors, contentType: "application/json", body: JSON.stringify(body) });
  });
  await ctx.route(`${HOTE}/rest/v1/email_modeles**`, (r) => r.fulfill({ status: 200, headers: { ...cors, "content-range": `0-3/4` }, contentType: "application/json", body: JSON.stringify(MODELES) }));
  await ctx.route(`${HOTE}/rest/v1/emails**`, (r) => r.fulfill({ status: 200, headers: { ...cors, "content-range": `0-1/2` }, contentType: "application/json", body: JSON.stringify(EMAILS) }));
  await ctx.route("http://admin.test/**", (r) => {
    let f = path.join(DIST, new URL(r.request().url()).pathname);
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(DIST, "index.html");
    const ext = path.extname(f);
    return r.fulfill({ body: fs.readFileSync(f), contentType: ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" : "text/html" });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => erreurs.push(`${chemin}: ${e.message}`));
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [CLE_SESSION, JSON.stringify(session())]);
  await page.goto("http://admin.test" + chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  return { ctx, page };
}
const axe = (page) => page.evaluate(async (src) => {
  if (!window.axe) { const s = document.createElement("script"); s.textContent = src; document.head.appendChild(s); }
  const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"] } });
  return r.violations.filter((v) => !["aria-required-children", "empty-table-header"].includes(v.id)).map((v) => `${v.id}(${v.nodes.length}): ${v.nodes[0]?.target}`);
}, AXE);
const debord = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
const menu = async (page, libelle) => { await page.getByLabel("Plus d'actions").click(); await page.locator(".ant-dropdown-menu-item", { hasText: libelle }).click(); await page.waitForTimeout(500); };

for (const vue of ["desktop", "mobile"]) {
  // ---- Fiche client : rédaction complète
  {
    const { ctx, page } = await ouvrir(vue, "/clients/00000002-0000-4000-8000-000000000001");
    await page.getByRole("button", { name: "Écrire un email" }).click(); await page.waitForTimeout(500);
    const tiroir = page.locator(".ant-drawer-content");
    ok(`[${vue}] Client : tiroir ouvert, destinataire = email de la fiche (non modifiable)`, (await tiroir.getByLabel("Destinataire").inputValue()) === "client0@exemple.fr" && await tiroir.getByLabel("Destinataire").getAttribute("readonly") !== null);
    await tiroir.getByLabel("Modèle").click();
    const autres = await page.locator(".ant-select-item-option", { hasText: /Rappel de facture|Relance d'un devis|Suite à votre demande/ }).count();
    await page.locator(".ant-select-item-option", { hasText: "Message libre" }).click();
    ok(`[${vue}] Client : le modèle remplit le message ; modèles d'autres fiches non proposés`, /Bonjour \{\{contact_nom\}\}/.test(await tiroir.getByLabel("Message").inputValue()) && autres === 0, autres);
    await tiroir.getByLabel("Sujet").fill("Point sur votre contrat");
    await tiroir.getByLabel("Message").click(); await tiroir.getByLabel("Message").press("End");
    await tiroir.getByRole("button", { name: "Date du jour" }).click();
    ok(`[${vue}] Client : clic sur une variable → insérée dans le message`, /\{\{date_du_jour\}\}/.test(await tiroir.getByLabel("Message").inputValue()));
    ok(`[${vue}] Client : pas de case « Joindre le PDF » sur une fiche client`, (await tiroir.getByText("Joindre le PDF").count()) === 0);
    appels.length = 0;
    await tiroir.getByRole("button", { name: "Aperçu" }).click(); await page.waitForTimeout(600);
    const modal = page.locator(".ant-modal-content");
    ok(`[${vue}] Aperçu : destinataire, sujet, contenu, avertissement mode test`, /client0@exemple\.fr/.test(await modal.innerText()) && /Mode test : l'email partira vers moi@exemple\.fr/.test(await modal.innerText()) && (await modal.locator("iframe[sandbox]").count()) === 1);
    ok(`[${vue}] Aperçu : demandé au serveur sans envoi`, appels[0]?.apercu === true && appels[0]?.cible?.type === "client", appels[0]);
    const v1 = await axe(page); ok(`[${vue}] Aperçu : axe-core sans défaut`, v1.length === 0, v1);
    await modal.getByRole("button", { name: "Envoyer" }).click(); await page.waitForTimeout(800);
    ok(`[${vue}] Envoi : requête complète (sujet, modèle, cible), confirmation, tiroir fermé`, appels[1]?.apercu === false && appels[1]?.modele === "libre" && appels[1]?.sujet === "Point sur votre contrat"
      && /Email envoyé à client0@exemple\.fr/.test(await page.locator(".ant-message").innerText().catch(() => "")) && !(await page.locator(".ant-drawer-open").count()), appels[1]);
    const v2 = await axe(page); ok(`[${vue}] Fiche client : axe-core sans défaut`, v2.length === 0, v2);
    ok(`[${vue}] Fiche client : pas de débordement`, !(await debord(page)));
    await ctx.close();
  }
  // ---- Facture : PDF joint + variables manquantes
  {
    const { ctx, page } = await ouvrir(vue, "/factures/00000004-0000-4000-8000-000000000001");
    await menu(page, "Écrire un email");
    const tiroir = page.locator(".ant-drawer-content");
    ok(`[${vue}] Facture : case « Joindre le PDF » proposée (facture émise)`, (await tiroir.getByText("Joindre le PDF").count()) === 1);
    await tiroir.getByLabel("Modèle").click(); await page.locator(".ant-select-item-option", { hasText: "Rappel de facture" }).click();
    await tiroir.getByText("Joindre le PDF").click();
    reponse = { status: 422, body: { error: "variables_manquantes", variables: ["facture_echeance"] } };
    appels.length = 0;
    await tiroir.getByRole("button", { name: "Envoyer" }).click(); await page.waitForTimeout(600);
    ok(`[${vue}] Facture : variables manquantes expliquées, tiroir reste ouvert`, /Informations manquantes sur la fiche pour : \{\{facture_echeance\}\}/.test(await tiroir.innerText()) && (await page.locator(".ant-drawer-open").count()) === 1);
    ok(`[${vue}] Facture : PDF demandé à l'envoi`, appels[0]?.joindre_pdf === true && appels[0]?.cible?.type === "facture", appels[0]);
    reponse = { status: 503, body: { error: "resend_not_configured" } };
    await tiroir.getByRole("button", { name: "Envoyer" }).click(); await page.waitForTimeout(600);
    ok(`[${vue}] Facture : envoi non configuré → message clair`, /L'envoi d'emails n'est pas encore activé/.test(await tiroir.innerText()));
    reponse = null;
    const v = await axe(page); ok(`[${vue}] Facture (tiroir ouvert) : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Facture : pas de débordement`, !(await debord(page)));
    await ctx.close();
  }
  // ---- Devis, demande, ticket : entrée présente et bonne cible
  for (const [chemin, libelle, type] of [["/devis/00000003-0000-4000-8000-000000000001", "Écrire un email (relance", "devis"], ["/leads/00000001-0000-4000-8000-000000000001", "Écrire un email", "lead"], ["/tickets/00000007-0000-4000-8000-000000000001", "Écrire un email au client", "ticket"]]) {
    const { ctx, page } = await ouvrir(vue, chemin);
    await menu(page, libelle);
    const tiroir = page.locator(".ant-drawer-content");
    await tiroir.getByLabel("Sujet").fill("Test"); await tiroir.getByLabel("Message").fill("Bonjour");
    appels.length = 0;
    await tiroir.getByRole("button", { name: "Envoyer" }).click(); await page.waitForTimeout(600);
    ok(`[${vue}] ${type} : email envoyé depuis la fiche`, appels[0]?.cible?.type === type, appels[0]);
    await ctx.close();
  }
  // ---- Pages Communication
  {
    const { ctx, page } = await ouvrir(vue, "/communication/emails");
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Emails envoyés : liste, statut, mode test, échec`, /Votre facture 2026-0001/.test(t) && /Échec/.test(t) && (vue === "mobile" || /test : envoyé à moi@exemple\.fr/.test(t)));
    await page.getByText("Votre devis DEV-2026-0001").click(); await page.waitForTimeout(500);
    const d = await page.locator(".ant-drawer-content").innerText();
    ok(`[${vue}] Emails envoyés : détail (erreur affichée, envoi automatique, lien vers la fiche)`, /Cet email n'est pas parti/.test(d) && /API key is invalid/.test(d) && /Envoi automatique/.test(d) && /Ouvrir la fiche/.test(d), d.slice(0, 200));
    const v = await axe(page); ok(`[${vue}] Emails envoyés : axe-core sans défaut`, v.length === 0, v);
    ok(`[${vue}] Emails envoyés : pas de débordement`, !(await debord(page)));
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, "/communication/modeles");
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Modèles : liste et bouton « Nouveau modèle » (admin)`, /Rappel de facture/.test(t) && /Nouveau modèle/.test(t));
    await page.getByText("Rappel de facture").first().click(); await page.waitForTimeout(500);
    ok(`[${vue}] Modèles : édition (nom, sujet, message, liste des variables)`, (await page.locator(".ant-drawer-content").getByLabel("Nom du modèle").inputValue()) === "Rappel de facture" && /\{\{facture_reste\}\}/.test(await page.locator(".ant-drawer-content").innerText()));
    const v = await axe(page); ok(`[${vue}] Modèles (tiroir ouvert) : axe-core sans défaut`, v.length === 0, v);
    await ctx.close();
  }
  {
    const { ctx, page } = await ouvrir(vue, "/clients/00000002-0000-4000-8000-000000000001?onglet=historique");
    const t = await page.locator(".feed").innerText();
    ok(`[${vue}] Fil client : emails envoyés et non partis affichés`, /Email envoyé/.test(t) && /Votre facture 2026-0001 \(PDF joint\)/.test(t) && /Email non parti/.test(t));
    await page.getByText("Échanges", { exact: true }).click(); await page.waitForTimeout(300);
    ok(`[${vue}] Fil client : filtre Échanges inclut les emails`, /Email envoyé/.test(await page.locator(".feed").innerText()));
    await ctx.close();
  }
  // ---- Menu
  {
    const { ctx, page } = await ouvrir(vue, "/");
    if (vue === "mobile") { await page.locator("button[aria-label*='menu' i]").first().click(); await page.waitForTimeout(400); }
    const t = await page.locator("body").innerText();
    ok(`[${vue}] Menu : groupe Communication (Emails envoyés, Modèles d'emails)`, /COMMUNICATION|Communication/.test(t) && /Emails envoyés/.test(t) && /Modèles d'emails/.test(t));
    await ctx.close();
  }
}
await nav.close();
ok("Aucune erreur JavaScript", erreurs.length === 0, erreurs);
for (const x of res) console.log(x.ok ? "OK   " : "ÉCHEC", x.n, x.ok ? "" : JSON.stringify(x.d)?.slice(0, 300));
console.log(`${res.filter((x) => x.ok).length} / ${res.length} tests back-office conformes`);
