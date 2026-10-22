#!/usr/bin/env bash
# =====================================================================
#  DHB — Sauvegarde indépendante de la base Supabase (PostgreSQL).
#
#  Produit UN fichier chiffré (AES-256, GnuPG) contenant :
#    - public.dump     : toutes les données métier + structure (schéma public,
#                        format pg_dump « custom ») ;
#    - auth.sql        : les comptes utilisateurs (auth.users, auth.identities) ;
#    - manifeste.json  : date, nombre de lignes par table (sert à vérifier
#                        une restauration).
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
printf '{"cree_le":"%s","type":"%s","lignes":%s}\n' "$DEBUT" "$TYPE" "$LIGNES" > "$TRAVAIL/manifeste.json"

ETAPE="vérification de l'archive"
pg_restore --list "$TRAVAIL/public.dump" >/dev/null

ETAPE="chiffrement"
mkdir -p "$SORTIE"
tar -C "$TRAVAIL" -cf - public.dump auth.sql manifeste.json \
  | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
        --symmetric --cipher-algo AES256 --output "$SORTIE/$NOM" 3<<<"$BACKUP_PASSPHRASE"

ETAPE="contrôle du fichier chiffré"
gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 --decrypt "$SORTIE/$NOM" 3<<<"$BACKUP_PASSPHRASE" \
  | tar -tf - | sort | tr '\n' ' ' | grep -q "auth.sql manifeste.json public.dump"

TAILLE="$(stat -c %s "$SORTIE/$NOM")"
EMPREINTE="$(sha256sum "$SORTIE/$NOM" | cut -d' ' -f1)"

ETAPE="enregistrement du résultat"
enregistrer "reussie" "" "$TAILLE" "$NOM" "$EMPREINTE" "$LIGNES"
trap - ERR
echo "$SORTIE/$NOM"
