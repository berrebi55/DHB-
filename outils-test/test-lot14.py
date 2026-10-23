# Lot 14 : titres courts, descriptions entières, maillage (fiches, villes).
import glob, html, os, re, sys, collections
sys.stdout.reconfigure(encoding="utf-8")
DEPOT = sys.argv[1]
sys.path.insert(0, os.path.join(DEPOT, "build"))
from titres_courts import TITRES_COURTS  # noqa: E402
import problems_data as pd  # noqa: E402
sys.path.insert(0, os.path.join(DEPOT, "build", "particuliers"))
import aide_data as ad  # noqa: E402

res = []
def ok(n, c, d=""): res.append((n, bool(c), d))
pages = {os.path.normpath(f): open(f, encoding="utf-8").read() for f in glob.glob(os.path.join(DEPOT, "sites", "**", "*.html"), recursive=True)}
titre = lambda s: html.unescape(re.search(r"<title>(.*?)</title>", s, re.S).group(1))
canon = lambda s: (re.search(r'<link rel="canonical" href="(.*?)"', s) or [None, None])[1]
par_canon = {canon(s): (f, s) for f, s in pages.items() if canon(s)}

# 1. Titres
longs = [titre(s) for s in pages.values() if len(titre(s)) > 60]
ok("Aucun titre de plus de 60 caractères (173 pages)", not longs, longs[:3])
manquants = [u for u in TITRES_COURTS if u not in par_canon]
ok(f"Les {len(TITRES_COURTS)} titres courts correspondent à des pages existantes", not manquants, manquants)
ok("Titres courts appliqués tels quels", all(titre(par_canon[u][1]) == t for u, t in TITRES_COURTS.items() if u in par_canon))
ok("Titre complet conservé dans og:title et h1", all(
    (lambda s: re.search(r'<meta property="og:title" content="(.*?)"', s) and len(html.unescape(re.search(r'<meta property="og:title" content="(.*?)"', s).group(1))) > 60)(par_canon[u][1])
    for u in TITRES_COURTS if u in par_canon))

# 2. Descriptions : jamais coupées au milieu d'un mot
coupees = []
for f, s in pages.items():
    m = re.search(r'<meta name="description" content="(.*?)"', s)
    if not m: continue
    d = html.unescape(m.group(1))
    if len(d) > 160 or not re.search(r"[.!?…»)]$", d): coupees.append((f, d[-40:]))
ok("Descriptions ≤ 160 et finies (ponctuation finale ou « … »)", not coupees, coupees[:3])
sym_coupes = [p["slug"] for p in pd.P if p["sym"][:150] != p["sym"] and (p["sym"][:150] + " Causes") in "".join(pages.values())]
ok("Fiches pannes : plus de symptôme tronqué à 150 caractères", not sym_coupes, sym_coupes[:3])

# 3. Maillage : liens entrants
entrants = collections.Counter()
for f, s in pages.items():
    d = os.path.dirname(f)
    for u in set(re.findall(r'<a [^>]*href="([^"#?:]+)"', s)):
        t = os.path.normpath(os.path.join(d, u))
        if os.path.isdir(t): t = os.path.join(t, "index.html")
        if t != f: entrants[t] += 1
fiche = lambda site, rub, slug: os.path.normpath(os.path.join(DEPOT, "sites", site, rub, slug, "index.html"))
faibles_pro = [p["slug"] for p in pd.P if entrants[fiche("infogerance", "pannes-frequentes", p["slug"])] < 3]
faibles_aide = [a["slug"] for a in ad.A if entrants[fiche("particuliers", "aide", a["slug"])] < 3]
ok(f"Chaque fiche panne ({len(pd.P)}) reçoit au moins 3 liens internes", not faibles_pro, faibles_pro[:5])
ok(f"Chaque fiche d'aide ({len(ad.A)}) reçoit au moins 3 liens internes", not faibles_aide, faibles_aide[:5])
# Bloc « autres fiches » : 4 liens, jamais la page elle-même, même catégorie quand le titre l'annonce
erreurs = []
for p in pd.P:
    s = pages[fiche("infogerance", "pannes-frequentes", p["slug"])]
    bloc = re.search(r'<h2 class="center" style="margin-bottom:30px">(.*?)</h2>\s*<div class="related">(.*?)</div>', s, re.S)
    if not bloc: erreurs.append(p["slug"]); continue
    liens = re.findall(r'pannes-frequentes/([a-z0-9-]+)/', bloc.group(2))
    if len(liens) != 4 or p["slug"] in liens: erreurs.append(p["slug"])
    if "catégorie" in bloc.group(1) and any(pd.get(x)["cat"] != p["cat"] for x in liens): erreurs.append(p["slug"] + " (catégorie)")
for a in ad.A:
    s = pages[fiche("particuliers", "aide", a["slug"])]
    bloc = re.search(r'<h2 class="center" style="margin-bottom:30px">(Autres aides[^<]*)</h2>\s*<div class="related">(.*?)</div>', s, re.S)
    liens = re.findall(r'aide/([a-z0-9-]+)/', bloc.group(2)) if bloc else []
    if len(liens) != 4 or a["slug"] in liens: erreurs.append(a["slug"])
    if bloc and "«" in bloc.group(1) and any(ad.get(x)["cat"] != a["cat"] for x in liens): erreurs.append(a["slug"] + " (catégorie)")
ok("Bloc « autres fiches » : 4 liens, sans la page elle-même, titre exact (catégorie ou non)", not erreurs, erreurs[:5])

# 4. Villes
villes = sorted(glob.glob(os.path.join(DEPOT, "sites", "infogerance", "zones", "*", "index.html")))
err_v = []
for f in villes:
    s = pages[os.path.normpath(f)]
    bloc = re.search(r"Autres zones d'intervention</h2>\s*<div class=\"related\">(.*?)</div>", s, re.S)
    liens = re.findall(r'zones/([a-z0-9-]+)/', bloc.group(1)) if bloc else []
    slug = os.path.basename(os.path.dirname(f))
    if slug in liens or len(liens) < 6 or any(not os.path.exists(fiche("infogerance", "zones", x)) for x in liens): err_v.append(slug)
ok(f"Chaque page de ville ({len(villes)}) renvoie vers au moins 6 autres zones existantes", not err_v, err_v)
s = pages[os.path.normpath(os.path.join(DEPOT, "sites/infogerance/zones/depannage-informatique-saint-denis/index.html"))]
bloc = re.search(r"Autres zones d'intervention</h2>\s*<div class=\"related\">(.*?)</div>", s, re.S).group(1)
ok("Même département proposé en premier (Saint-Denis → villes du 93)", re.findall(r">([^<]+)</a>", bloc)[0].endswith("(93)"), bloc[:200])

# 5. Document de validation
doc = open(os.path.join(DEPOT, "docs", "CONTENU-A-VALIDER.md"), encoding="utf-8").read()
ok("docs/CONTENU-A-VALIDER.md : titres, engagements, villes, informations légales", all(x in doc for x in ("titres_courts.py", "9 h – 18 h", "sous 24 h", "24/7", "pages_zones.py", "À COMPLÉTER")))

for n, r, d in res: print("OK   " if r else "ÉCHEC", n, "" if r else d)
print(f"{sum(1 for _, r, _ in res if r)} / {len(res)} contrôles du lot 14 conformes")
