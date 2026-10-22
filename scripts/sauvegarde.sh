#!/usr/bin/env bash
# =====================================================================
#  DHB — Sauvegarde indépendante de la base Supabase (PostgreSQL).
#
#  Produit UN fichier chiffré (AES-256, GnuPG) contenant :
#    - public.dump     : toutes les données métier + structure (schéma public,
#                        format pg_dump « custom ») ;
#    - auth.sql        : les comptes utilisateurs (auth.users, auth.identities) ;
#    - manifeste.json  : date, nombre de lignes par table, nombre de fichiers
#                        (sert à vérifier une restauration) ;
#    - fichiers/       : les PDF archivés (stockage « documents », lot 6), si
#                        la clé serveur est fournie (voir ci-dessous).
#  Puis enregistre le résultat dans public.sauvegardes (visible dans
#  Back-office → Système → Sauvegardes), y compris en cas d'échec.
#
#  Variables d'environnement :
#    SUPABASE_DB_URL     (obligatoire) chaîne de connexion PostgreSQL
#                        (Supabase → Connect → « Session pooler »)
#    BACKUP_PASSPHRASE   (obligatoire) phrase de chiffrement, 20 caractères min.
#    SAUVEGARDE_TYPE     quotidienne | manuelle | test   (défaut : manuelle)
#    RUN_URL             lien vers l'exécution (GitHub Actions), facultatif
#    DOSSIER_SORTIE      dossier du fichier produit (défaut : ./sauvegardes)
#    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
#                        (facultatives) pour copier les PDF du stockage. Sans
#                        elles, la base est sauvegardée et le nombre de PDF
#                        non copiés est signalé (jamais d'échec pour ça).
#
#  Usage : scripts/sauvegarde.sh       → affiche le chemin du fichier produit
#  Exécuté chaque nuit par .github/workflows/sauvegarde.yml.
# =====================================================================
set -Eeuo pipefail
umask 077

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL manquant}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE manquant}"
if [ "${#BACKUP_PASSPHRASE}" -lt 20 ]; then
  echo "BACKUP_PASSPHRASE trop courte (20 caractères minimum)." >&2; exit 2
fi
TYPE="${SAUVEGARDE_TYPE:-manuelle}"
case "$TYPE" in quotidienne|manuelle|test) ;; *) echo "SAUVEGARDE_TYPE invalide : $TYPE" >&2; exit 2;; esac
SORTIE="${DOSSIER_SORTIE:-./sauvegardes}"
DEBUT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
HORODATAGE="$(date -u +%Y%m%d-%H%M%S)"
NOM="dhb-sauvegarde-${HORODATAGE}.tar.gpg"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT

ETAPE="démarrage"
enregistrer() { # statut, erreur, taille, fichier, empreinte, lignes
  psql "$SUPABASE_DB_URL" -X -q -v ON_ERROR_STOP=1 \
    -v debut="$DEBUT" -v type="$TYPE" -v statut="$1" -v erreur="$2" -v taille="$3" \
    -v fichier="$4" -v empreinte="$5" -v lignes="$6" -v run_url="${RUN_URL:-}" <<'SQL'
insert into public.sauvegardes (debut, fin, type, statut, erreur, taille_octets, fichier, empreinte_sha256, lignes, run_url)
values (:'debut'::timestamptz, now(), :'type', :'statut', nullif(:'erreur',''), nullif(:'taille','')::bigint,
        nullif(:'fichier',''), nullif(:'empreinte',''), nullif(:'lignes','')::jsonb, nullif(:'run_url',''));
SQL
}
echec() {
  local msg="Échec à l'étape « ${ETAPE} » (ligne $1)."
  echo "$msg" >&2
  enregistrer "echec" "$msg" "" "" "" "" || echo "Impossible d'enregistrer l'échec dans la base." >&2
  exit 1
}
trap 'echec $LINENO' ERR

ETAPE="connexion"
psql "$SUPABASE_DB_URL" -X -q -tAc "select 1" >/dev/null

ETAPE="export des données métier (schéma public)"
pg_dump "$SUPABASE_DB_URL" --format=custom --schema=public --no-owner --file="$TRAVAIL/public.dump"

ETAPE="export des comptes (auth)"
pg_dump "$SUPABASE_DB_URL" --data-only --table=auth.users --table=auth.identities --file="$TRAVAIL/auth.sql"

ETAPE="export des fichiers PDF (stockage « documents »)"
# Un fichier manquant n'empêche jamais la sauvegarde de la base : il est compté
# et signalé (manifeste + historique), la base reste la priorité.
mkdir -p "$TRAVAIL/fichiers"
NB_FICHIERS=0; NB_NON_COPIES=0
OBJETS=""
if [ "$(psql "$SUPABASE_DB_URL" -X -q -tAc "select to_regclass('storage.objects') is not null")" = "t" ]; then
  OBJETS="$(psql "$SUPABASE_DB_URL" -X -q -tAc "select name from storage.objects where bucket_id = 'documents' order by name")"
fi
while IFS= read -r OBJET; do
  [ -z "$OBJET" ] && continue
  # Noms attendus : factures/<uuid>.pdf, devis/<uuid>.pdf (tout autre nom est refusé).
  if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] \
     || ! [[ "$OBJET" =~ ^[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+$ ]] || [[ "$OBJET" == *..* ]]; then
    NB_NON_COPIES=$((NB_NON_COPIES + 1)); continue
  fi
  mkdir -p "$TRAVAIL/fichiers/$(dirname "$OBJET")"
  if curl -fsS --retry 2 --max-time 60 -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
       "$SUPABASE_URL/storage/v1/object/documents/$OBJET" -o "$TRAVAIL/fichiers/$OBJET"; then
    NB_FICHIERS=$((NB_FICHIERS + 1))
  else
    rm -f "$TRAVAIL/fichiers/$OBJET"; NB_NON_COPIES=$((NB_NON_COPIES + 1))
  fi
done <<< "$OBJETS"
AVERTISSEMENT=""
if [ "$NB_NON_COPIES" -gt 0 ]; then
  AVERTISSEMENT="Attention : ${NB_NON_COPIES} fichier(s) PDF non copié(s) (clé serveur absente ou stockage injoignable). La base est sauvegardée."
  echo "$AVERTISSEMENT" >&2
fi

ETAPE="comptage des lignes"
LIGNES="$(psql "$SUPABASE_DB_URL" -X -q -tA <<'SQL'
select json_object_agg(t, n order by t) from (
  select 'public.' || table_name as t,
         (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::bigint as n
  from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'
  union all
  select 'auth.users', (select count(*) from auth.users)
) s;
SQL
)"
printf '{"cree_le":"%s","type":"%s","lignes":%s,"fichiers":%s,"fichiers_non_copies":%s}\n' \
  "$DEBUT" "$TYPE" "$LIGNES" "$NB_FICHIERS" "$NB_NON_COPIES" > "$TRAVAIL/manifeste.json"

ETAPE="vérification de l'archive"
pg_restore --list "$TRAVAIL/public.dump" >/dev/null

ETAPE="chiffrement"
mkdir -p "$SORTIE"
tar -C "$TRAVAIL" -cf - public.dump auth.sql manifeste.json fichiers \
  | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
        --symmetric --cipher-algo AES256 --output "$SORTIE/$NOM" 3<<<"$BACKUP_PASSPHRASE"

ETAPE="contrôle du fichier chiffré"
gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$SORTIE/$NOM" 3<<<"$BACKUP_PASSPHRASE" \
  | tar -tf - > "$TRAVAIL/contenu"
for f in public.dump auth.sql manifeste.json; do grep -qx "$f" "$TRAVAIL/contenu"; done
[ "$(grep -c '^fichiers/.*[^/]$' "$TRAVAIL/contenu" || true)" = "$NB_FICHIERS" ]

TAILLE="$(stat -c %s "$SORTIE/$NOM")"
EMPREINTE="$(sha256sum "$SORTIE/$NOM" | cut -d' ' -f1)"

ETAPE="enregistrement du résultat"
enregistrer "reussie" "$AVERTISSEMENT" "$TAILLE" "$NOM" "$EMPREINTE" "$LIGNES"
trap - ERR
echo "$SORTIE/$NOM"
