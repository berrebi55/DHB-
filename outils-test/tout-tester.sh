#!/usr/bin/env bash
# Lot 17 — audit global : rejoue toutes les suites de test sur l'environnement de test.
# Usage : bash tout-tester.sh <dossier du build de test du back-office>
OUTILS="$(cd "$(dirname "$0")" && pwd)"
DEPOT="C:/Users/CLAUDE/Documents/DHB-"
DIST="$1"
DENO="$OUTILS/node_modules/deno/deno.exe"
cd "$OUTILS" || exit 1
ligne() { printf '%-34s %s\n' "$1" "$2"; }

PARTIE="${2:-AB}"
if [[ $PARTIE == *A* ]]; then
echo "### Base de données (full-setup.sql rejoué 2 fois puis tests SQL)"
for i in 1 2; do
  n=$(docker exec -i dhb-test-pg psql -U postgres -d dhb_test -v ON_ERROR_STOP=1 -q < "$DEPOT/supabase/full-setup.sql" 2>&1 | grep -ci error)
  ligne "full-setup.sql (passage $i)" "$n erreur(s)"
done
docker restart dhb-postgrest >/dev/null; sleep 3
for f in lot1-securite lot2-sauvegardes lot4-crm lot6-documents lot7-stripe lot8-communication lot9-automatisations lot10-integrations lot11-drive lot12-search-console lot16-guides lot17-durcissement; do
  ligne "SQL $f" "$(docker exec -i dhb-test-pg psql -U postgres -d dhb_test -q < "$DEPOT/supabase/tests/$f.sql" 2>&1 | grep -o '[0-9]* / [0-9]* scénarios conformes' | tail -1)"
done

echo "### Fonctions serveur (Deno) et bout en bout"
ligne "deno check (toutes)" "$(cd "$DEPOT/supabase/functions" && for d in */; do [ -f "$d/index.ts" ] && echo "$d/index.ts"; done | xargs "$DENO" check 2>&1 | grep -c '^error' ) erreur(s)"
ligne "deno lint" "$("$DENO" lint "$DEPOT/supabase/functions" 2>&1 | tail -1)"
for t in test-render-pdf test-stripe-webhook test-emails test-worker test-recurrentes test-google test-drive test-seo; do
  ligne "$t" "$(timeout 500 node $t.mjs 2>&1 | grep -E 'conformes' | tail -1)"
done

echo "### Back-office"
ligne "TypeScript" "$(cd "$DEPOT/admin-react" && npx tsc --noEmit 2>&1 | grep -c 'error TS') erreur(s)"
ligne "ESLint" "$(cd "$DEPOT/admin-react" && npx eslint . 2>&1 | grep problems)"
L="$DEPOT/admin-react/src/lib"
cp test-chargertout-unitaire.ts "$L/__u.ts"; cp test-pagination.ts "$L/__p.ts"

ligne "chargerTout (unitaires)" "$("$DENO" run "$L/__u.ts" 2>&1 | tail -1)"
for cap in 1000 300; do docker rm -f dhb-postgrest-$cap >/dev/null 2>&1; docker run -d --name dhb-postgrest-$cap --network dhb-net -p $((54330 + cap / 100)):3000 -e PGRST_DB_URI=postgres://postgres:test@dhb-test-pg:5432/dhb_test -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=secret-jwt-de-test-au-moins-32-caracteres -e PGRST_DB_MAX_ROWS=$cap postgrest/postgrest:v12.2.3 >/dev/null; done; sleep 3
ligne "pagination (vrai PostgREST)" "$("$DENO" run --allow-net --allow-run --allow-env --allow-read "$L/__p.ts" 2>&1 | tail -1)"
docker rm -f dhb-postgrest-1000 dhb-postgrest-300 >/dev/null; rm -f "$L/__u.ts" "$L/__p.ts"
ligne "retour après connexion" "$(node test-retour.mjs "$DEPOT/admin-react/src/pages/login.tsx" | tail -1)"
ligne "npm audit" "$(cd "$DEPOT/admin-react" && npm audit 2>&1 | grep -E 'vulnerabilit' | tail -1)"
fi
if [[ $PARTIE == *B* ]]; then
for f in admin-lot4 admin-lot5 admin-lot6 admin-lot7 admin-lot8 admin-lot9 admin-lot10 admin-lot11 admin-lot12 admin-lot15 admin-lot16 admin-polices; do
  ligne "$f" "$(timeout 500 node $f.mjs "$DIST" 2>&1 | grep -E 'conformes|Error' | tail -1)"
done

echo "### Sites"
ligne "contrôles SEO (lot 13)" "$(python test-seo-sites.py "$DEPOT" 2>&1 | tail -1)"
ligne "contrôles contenu (lot 14)" "$(python test-lot14.py "$DEPOT" 2>&1 | tail -1)"
ligne "liens internes" "$(python liens.py "$DEPOT" 2>&1 | head -1)"
ligne "formulaire (lot 4)" "$(timeout 300 node formulaire-lot4.mjs "$DEPOT" 2>&1 | grep -E 'conformes' | tail -1)"
for f in sites-lot13 sites-lot14 sites-lot16; do
  ligne "$f" "$(timeout 500 node $f.mjs "$DEPOT" 2>&1 | grep -E 'conformes' | tail -1)"
done

echo "### Accessibilité (toutes les vues, bureau + mobile)"
timeout 580 node audit.mjs final "$DEPOT" "$DIST" 2>&1 | tail -3
fi
