#!/usr/bin/env bash
# =====================================================================
#  DHB — Restauration d'une sauvegarde produite par scripts/sauvegarde.sh.
#
#  À utiliser sur un projet Supabase NEUF (ou une base de test vide) :
#  le script refuse de s'exécuter si la base cible contient déjà des tables
#  métier, pour ne jamais écraser des données par erreur.
#
#  Variables d'environnement :
#    BACKUP_PASSPHRASE   phrase de chiffrement utilisée pour la sauvegarde
#    CIBLE_DB_URL        connexion PostgreSQL de la base à restaurer
#                        (inutile avec --verifier)
#  Usage :
#    scripts/restaurer.sh --verifier fichier.tar.gpg   → déchiffre et contrôle
#                                                        sans rien restaurer
#    scripts/restaurer.sh fichier.tar.gpg              → restauration complète
#
#  Étapes de la restauration (ordre imposé par les dépendances) :
#    1. structure des tables (sans index, clés ni déclencheurs) ;
#    2. comptes utilisateurs (auth.users / auth.identities) ;
#    3. données métier ;
#    4. index, clés étrangères, déclencheurs, règles RLS ;
#    5. supabase/restauration-complements.sql : recrée ce qui vit hors du
#       schéma public (déclencheur de création de profil, temps réel), sans
#       toucher aux données (les données restaurées restent identiques) ;
#    6. PDF archivés (lot 6) : remis dans le stockage « documents » si
#       SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définies, sinon copiés
#       dans un dossier local à déposer à la main ;
#    7. contrôle : nombre de lignes par table = celui du manifeste.
# =====================================================================
set -Eeuo pipefail
umask 077
VERIFIER=0
if [ "${1:-}" = "--verifier" ]; then VERIFIER=1; shift; fi
FICHIER="${1:?Usage : scripts/restaurer.sh [--verifier] fichier.tar.gpg}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE manquant}"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT

echo "1/8 Déchiffrement…"
if ! gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt --output "$TRAVAIL/archive.tar" \
      "$FICHIER" 3<<<"$BACKUP_PASSPHRASE" 2>"$TRAVAIL/gpg.log"; then
  echo "Déchiffrement impossible : phrase de chiffrement incorrecte ou fichier endommagé." >&2
  exit 1
fi
tar -C "$TRAVAIL" -xf "$TRAVAIL/archive.tar" && rm -f "$TRAVAIL/archive.tar"
for f in public.dump auth.sql manifeste.json; do
  [ -s "$TRAVAIL/$f" ] || { echo "Fichier manquant dans la sauvegarde : $f" >&2; exit 1; }
done
pg_restore --list "$TRAVAIL/public.dump" > "$TRAVAIL/liste-complete"
echo "    Sauvegarde du $(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["cree_le"])' "$TRAVAIL/manifeste.json") ; $(grep -c 'TABLE DATA' "$TRAVAIL/liste-complete") tables de données."
if [ "$VERIFIER" = 1 ]; then
  echo "Vérification terminée : la sauvegarde est lisible et complète (aucune restauration effectuée)."
  exit 0
fi

: "${CIBLE_DB_URL:?CIBLE_DB_URL manquant}"
echo "2/8 Contrôle de la base cible…"
EXISTANTES="$(psql "$CIBLE_DB_URL" -X -tAc "select count(*) from information_schema.tables where table_schema='public' and table_name in ('clients','factures','leads','profiles')")"
if [ "$EXISTANTES" != "0" ]; then
  echo "Refus : la base cible contient déjà des tables DHB. Restaurez dans un projet neuf." >&2
  exit 1
fi
# Le schéma public existe déjà sur toute base : on ne le recrée pas.
grep -v -E ' SCHEMA - public | COMMENT - SCHEMA public ' "$TRAVAIL/liste-complete" > "$TRAVAIL/liste"

echo "3/8 Structure des tables…"
pg_restore --section=pre-data --use-list="$TRAVAIL/liste" --no-owner --exit-on-error -d "$CIBLE_DB_URL" "$TRAVAIL/public.dump"
echo "4/8 Comptes utilisateurs…"
psql "$CIBLE_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$TRAVAIL/auth.sql" >/dev/null
echo "5/8 Données métier…"
pg_restore --section=data --use-list="$TRAVAIL/liste" --no-owner --exit-on-error -d "$CIBLE_DB_URL" "$TRAVAIL/public.dump"
echo "6/8 Index, clés, déclencheurs, règles de sécurité…"
pg_restore --section=post-data --use-list="$TRAVAIL/liste" --no-owner --exit-on-error -d "$CIBLE_DB_URL" "$TRAVAIL/public.dump"
psql "$CIBLE_DB_URL" -X -q -v ON_ERROR_STOP=1 -f "$RACINE/supabase/restauration-complements.sql" >/dev/null 2>"$TRAVAIL/complements.log" \
  || { cat "$TRAVAIL/complements.log" >&2; exit 1; }

echo "7/8 Fichiers PDF (stockage « documents »)…"
NB_PDF="$(find "$TRAVAIL/fichiers" -type f 2>/dev/null | wc -l | tr -d ' ')"
ATTENDUS="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("fichiers", 0))' "$TRAVAIL/manifeste.json")"
if [ "$NB_PDF" != "$ATTENDUS" ]; then
  echo "Sauvegarde incohérente : ${NB_PDF} PDF présents, ${ATTENDUS} attendus." >&2; exit 1
fi
if [ "$NB_PDF" = "0" ]; then
  echo "    Aucun PDF dans cette sauvegarde."
elif [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  ( cd "$TRAVAIL/fichiers" && find . -type f | sed 's#^\./##' | sort ) | while IFS= read -r OBJET; do
    curl -fsS --retry 2 -X POST -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Content-Type: application/pdf" -H "x-upsert: true" --data-binary "@$TRAVAIL/fichiers/$OBJET" \
      "$SUPABASE_URL/storage/v1/object/documents/$OBJET" >/dev/null
  done
  echo "    ${NB_PDF} PDF remis dans le stockage « documents »."
else
  COPIE="./pdf-restaures-$(date +%Y%m%d-%H%M%S)"
  cp -r "$TRAVAIL/fichiers" "$COPIE"
  echo "    ${NB_PDF} PDF copiés dans ${COPIE} : définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY puis relancez,"
  echo "    ou déposez-les à la main dans Supabase → Storage → documents (mêmes dossiers)."
fi

echo "8/8 Contrôle des données restaurées…"
psql "$CIBLE_DB_URL" -X -tA > "$TRAVAIL/apres.json" <<'SQL'
select json_object_agg(t, n order by t) from (
  select 'public.' || table_name as t,
         (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::bigint as n
  from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'
  union all
  select 'auth.users', (select count(*) from auth.users)
) s;
SQL
python3 - "$TRAVAIL/manifeste.json" "$TRAVAIL/apres.json" <<'PY'
import json, sys
avant = json.load(open(sys.argv[1]))["lignes"]
apres = json.loads(open(sys.argv[2]).read().strip())
ecarts = [(t, n, apres.get(t)) for t, n in sorted(avant.items()) if apres.get(t) != n]
for t, n in sorted(avant.items()):
    print(f"    {t:32} {n:>7} → {apres.get(t)}{'' if apres.get(t) == n else '   ÉCART'}")
if ecarts:
    print(f"Restauration INCOMPLÈTE : {len(ecarts)} table(s) en écart.", file=sys.stderr)
    sys.exit(1)
print("Restauration terminée : toutes les tables correspondent à la sauvegarde.")
PY
