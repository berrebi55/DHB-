# Lot 13 : contrôles SEO techniques sur les 3 sites générés (toutes les pages).
import glob, hashlib, html, json, os, re, struct, subprocess, sys, tempfile, datetime, xml.etree.ElementTree as ET
sys.stdout.reconfigure(encoding="utf-8")
DEPOT = sys.argv[1]
sys.path.insert(0, os.path.join(DEPOT, "build"))
import marque  # noqa: E402

res = []
def ok(nom, cond, detail=""):
    res.append((nom, bool(cond), detail))

DOMAINES = {"groupe": "https://www.dhb-groupe.fr", "infogerance": "https://pro.dhb-groupe.fr", "particuliers": "https://www.dhb-assistance.fr"}
HORS_INDEX = {"404.html", "paiement-reussi/index.html", "paiement-annule/index.html", "devis.html"}

def empreinte():
    h = hashlib.sha256()
    for f in sorted(glob.glob(os.path.join(DEPOT, "sites", "**", "*"), recursive=True)):
        if os.path.isfile(f):
            h.update(f.encode()); h.update(open(f, "rb").read())
    return h.hexdigest()

# --- 0. Régénération reproductible -------------------------------------------
subprocess.run([sys.executable, os.path.join(DEPOT, "build", "build_all.py")], check=True, capture_output=True)
e1 = empreinte()
subprocess.run([sys.executable, os.path.join(DEPOT, "build", "build_all.py")], check=True, capture_output=True)
ok("Régénérer deux fois ne change rien (dates du sitemap stables)", empreinte() == e1)

# --- 1. Fonctions de référencement -------------------------------------------
T = marque.titre_seo
ok("Titre court inchangé", T("Contact — DHB Assistance") == "Contact — DHB Assistance")
ok("Titre long : complément « — causes et solutions » retiré, marque gardée si elle tient",
   T("Mon ordinateur ne s'allume plus (aucun voyant, aucun signe de vie) — causes et solutions | DHB") == "Mon ordinateur ne s'allume plus — causes et solutions | DHB",
   T("Mon ordinateur ne s'allume plus (aucun voyant, aucun signe de vie) — causes et solutions | DHB"))
ok("Titre trop long : jamais coupé au milieu ni « … »",
   T("Le VPN se connecte mais je n'accède pas au serveur de fichiers de l'entreprise — causes et solutions | DHB") == "Le VPN se connecte mais je n'accède pas au serveur de fichiers de l'entreprise")
ok("« — DHB, … » n'est pas pris pour la marque", not T("À propos — DHB, maintenance & sécurité informatique pour entreprises").endswith("…")
   and len(T("À propos — DHB, maintenance & sécurité informatique pour entreprises")) >= 20)
D = marque.description_seo
d = D("Première phrase assez longue pour servir de description complète à la page concernée, sans rien ajouter. Deuxième phrase qui ferait dépasser la limite de cent soixante caractères.")
ok("Description : coupée en fin de phrase", d.endswith("sans rien ajouter.") and len(d) <= 160, d)
d = D("mot " * 60)
ok("Description sans phrase : fin de mot + « … », ≤ 160", d.endswith("…") and len(d) <= 160 and "mo…" not in d)

with tempfile.TemporaryDirectory() as tmp:
    marque.ecrire_site(tmp, "https://x.fr", {"index.html": "A", "b/index.html": "B"}, lambda u: "0.5")
    sm = os.path.join(tmp, "sitemap.xml")
    contenu_sm = open(sm, encoding="utf-8").read().replace(datetime.date.today().isoformat(), "2020-01-01")
    open(sm, "w", encoding="utf-8").write(contenu_sm)
    marque.ecrire_site(tmp, "https://x.fr", {"index.html": "A", "b/index.html": "B modifiée", "404.html": "x"}, lambda u: "0.5", exclus=("404.html",))
    s = open(sm, encoding="utf-8").read()
    ok("Sitemap : date gardée si la page n'a pas changé, date du jour sinon, 404 exclue",
       "<loc>https://x.fr/</loc><lastmod>2020-01-01" in s and f"<loc>https://x.fr/b/</loc><lastmod>{datetime.date.today().isoformat()}" in s and "404" not in s, s)

# --- 2. Toutes les pages ------------------------------------------------------
def png_taille(p):
    b = open(p, "rb").read(32)
    return struct.unpack(">II", b[16:24]) if b[:8] == b"\x89PNG\r\n\x1a\n" else None

stats = {"pages": 0, "titres>60": 0}
erreurs = []
for dossier, dom in DOMAINES.items():
    base = os.path.join(DEPOT, "sites", dossier)
    og = os.path.join(base, "assets", "img", "og.png")
    ok(f"[{dossier}] og.png 1200 × 630", os.path.exists(og) and png_taille(og) == (1200, 630), png_taille(og) if os.path.exists(og) else "absent")
    ok(f"[{dossier}] page 404 présente", os.path.exists(os.path.join(base, "404.html")))
    sm = ET.parse(os.path.join(base, "sitemap.xml")).getroot()
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = {u.find("s:loc", ns).text: u.find("s:lastmod", ns).text for u in sm.findall("s:url", ns)}
    for f in glob.glob(os.path.join(base, "**", "*.html"), recursive=True):
        rel = os.path.relpath(f, base).replace("\\", "/")
        s = open(f, encoding="utf-8").read()
        stats["pages"] += 1
        err = lambda m: erreurs.append(f"{dossier}/{rel} : {m}")
        titres = re.findall(r"<title>(.*?)</title>", s, re.S)
        if len(titres) != 1: err("titre absent ou multiple"); continue
        t = html.unescape(titres[0])
        if len(t) > 60: stats["titres>60"] += 1
        if t.endswith("…") or len(t) > 80: err(f"titre coupé ou trop long ({len(t)})")
        if re.search(r"&(?!amp;|lt;|gt;|quot;|#\d+;|#x[0-9a-fA-F]+;)", titres[0]): err("« & » non échappé dans le titre")
        if "fonts.googleapis" in s or "fonts.gstatic" in s: err("police chargée chez Google")
        indexable = rel not in HORS_INDEX
        canon = re.findall(r'<link rel="canonical" href="(.*?)"', s)
        robots = re.findall(r'<meta name="robots" content="(.*?)"', s)
        if indexable:
            attendu = dom + "/" + ("" if rel == "index.html" else rel[:-len("index.html")] if rel.endswith("index.html") else rel)
            if canon != [attendu]: err(f"canonical {canon} ≠ {attendu}")
            if robots != ["index, follow"]: err(f"robots {robots}")
            if attendu not in locs: err("absente du sitemap")
            desc = re.findall(r'<meta name="description" content="(.*?)"', s)
            if len(desc) != 1 or not (20 <= len(html.unescape(desc[0])) <= 160): err(f"description {len(html.unescape(desc[0])) if desc else 'absente'}")
            if f'<meta property="og:image" content="{dom}/assets/img/og.png">' not in s: err("og:image")
            if '<meta name="twitter:card" content="summary_large_image">' not in s: err("twitter:card")
            if f'<meta property="og:url" content="{attendu}">' not in s: err("og:url")
        else:
            if canon: err("canonical sur une page hors index")
            if not robots or "noindex" not in robots[0]: err(f"robots {robots}")
            if any(l.endswith("/" + rel.replace("index.html", "")) for l in locs if rel != "404.html") or any(l.endswith("404.html") for l in locs): err("dans le sitemap")
        if rel == "404.html" and '<base href="/">' not in s: err("404 sans <base href=\"/\">")
        if rel != "404.html" and "<base " in s: err("<base> hors 404")
        # Polices locales
        if rel != "devis.html":
            for u in re.findall(r"url\(([^)]+\.woff2)\)", s) + re.findall(r'<link rel="preload" href="([^"]+)"', s):
                cible = os.path.normpath(os.path.join(base if rel == "404.html" else os.path.dirname(f), u.lstrip("/") if rel == "404.html" else u))
                if not os.path.exists(cible): err(f"police introuvable {u}")
            if "<style>@font-face" not in s: err("pas de @font-face local")
        # Données structurées
        for bloc in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
            try:
                j = json.loads(bloc)
            except Exception as e:
                err(f"JSON-LD invalide : {e}"); continue
            if j.get("@type") == "BreadcrumbList":
                el = j["itemListElement"]
                if [x["position"] for x in el] != list(range(1, len(el) + 1)): err("positions du fil")
                if el[0].get("item") != dom + "/" or el[0]["name"] != "Accueil": err("fil : accueil")
                if any("item" not in x for x in el[:-1]): err("fil : liens")
                for x in el[:-1]:
                    chemin = x["item"][len(dom) + 1:]
                    if not os.path.exists(os.path.join(base, chemin, "index.html") if chemin == "" or chemin.endswith("/") else os.path.join(base, chemin)): err(f"fil : {x['item']} introuvable")
        if 'class="breadcrumb' in s and '"BreadcrumbList"' not in s: err("fil visible sans BreadcrumbList")
    for loc in locs:
        chemin = loc[len(dom) + 1:]
        if not os.path.exists(os.path.join(base, chemin, "index.html") if chemin == "" or chemin.endswith("/") else os.path.join(base, chemin)): erreurs.append(f"{dossier} sitemap : {loc} introuvable")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", locs[loc]): erreurs.append(f"{dossier} sitemap : date {locs[loc]}")

for e in erreurs[:25]: print("   ", e)
ok(f"Toutes les pages conformes ({stats['pages']} pages : titre, description, canonical/noindex, partage, polices, fil d'Ariane, JSON-LD, sitemap)", not erreurs, f"{len(erreurs)} écart(s)")
ok("Aucune référence à Google Fonts dans les sites (HTML, CSS, JS)",
   not [f for f in glob.glob(os.path.join(DEPOT, "sites", "**", "*.*"), recursive=True) if f.endswith((".html", ".css", ".js")) and re.search(r"fonts\.(googleapis|gstatic)", open(f, encoding="utf-8", errors="ignore").read())])
print(f"   (titres encore > 60 caractères, phrases complètes à réécrire au lot 14 : {stats['titres>60']})")

for nom, r, dt in res:
    print("OK   " if r else "ÉCHEC", nom, "" if r else dt)
print(f"{sum(1 for _, r, _ in res if r)} / {len(res)} contrôles SEO conformes")
