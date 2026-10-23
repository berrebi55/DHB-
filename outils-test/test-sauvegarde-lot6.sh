#!/usr/bin/env bash
# Tests de sauvegarde / restauration avec les PDF (lot 6). Exécuté dans le conteneur dhb-outils.
set -uo pipefail
OK=0; KO=0
ok() { if eval "$2"; then echo "OK    $1"; OK=$((OK+1)); else echo "ÉCHEC $1"; KO=$((KO+1)); fi; }
export BACKUP_PASSPHRASE="phrase-de-test-assez-longue-2026"
export PGPASSWORD=test
BASE="postgresql://postgres:test@dhb-test-pg:5432/dhb_test"
TRAV=/tmp/lot6; rm -rf "$TRAV"; mkdir -p "$TRAV/stock-source/factures" "$TRAV/stock-source/devis" "$TRAV/stock-cible" "$TRAV/sorties"
cp /depot/scripts/*.sh "$TRAV/"; mkdir -p "$TRAV/supabase"; cp /depot/supabase/restauration-complements.sql "$TRAV/supabase/"
mkdir -p "$TRAV/scripts"; cp /depot/scripts/*.sh "$TRAV/scripts/"; sed -i "s/$//" "$TRAV"/scripts/*.sh "$TRAV"/supabase/*.sql

# Deux vrais PDF « archivés » + un nom d'objet dangereux qui ne doit jamais être suivi.
F="aaaaaaaa-0000-4000-8000-000000000001"; D="bbbbbbbb-0000-4000-8000-000000000001"
printf '%%PDF-1.7 facture de test\n' > "$TRAV/stock-source/factures/$F.pdf"
head -c 30000 /dev/urandom > "$TRAV/stock-source/devis/$D.pdf"
psql "$BASE" -X -q -c "delete from storage.objects where bucket_id='documents'; insert into storage.objects(bucket_id,name) values ('documents','factures/$F.pdf'),('documents','devis/$D.pdf'),('documents','../../etc/passwd');"

python3 /outils/stockage-factice.py "$TRAV/stock-source" & SRV=$!; sleep 1

# 1) Sauvegarde avec la clé serveur
export SUPABASE_URL="http://127.0.0.1:8787" SUPABASE_SERVICE_ROLE_KEY="cle-serveur-de-test"
FICHIER="$(SUPABASE_DB_URL="$BASE" DOSSIER_SORTIE="$TRAV/sorties" SAUVEGARDE_TYPE=test bash "$TRAV/scripts/sauvegarde.sh" 2>"$TRAV/err1")"
ok "Avec clé : sauvegarde produite" '[ -s "$FICHIER" ]'
ok "Avec clé : nom dangereux signalé (1 non copié)" 'grep -q "1 fichier(s) PDF non copié" "$TRAV/err1"'
gpg --batch --quiet --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" --decrypt "$FICHIER" 2>/dev/null | tar -C "$TRAV" -xf - --one-top-level=contenu1
ok "Archive : 2 PDF inclus" '[ "$(find "$TRAV/contenu1/fichiers" -type f | wc -l)" = 2 ]'
ok "Archive : PDF identiques aux originaux" 'cmp -s "$TRAV/contenu1/fichiers/devis/$D.pdf" "$TRAV/stock-source/devis/$D.pdf" && cmp -s "$TRAV/contenu1/fichiers/factures/$F.pdf" "$TRAV/stock-source/factures/$F.pdf"'
ok "Archive : rien hors du dossier fichiers (passwd non suivi)" '! find "$TRAV/contenu1" -name passwd | grep -q .'
ok "Manifeste : fichiers=2, non copiés=1" 'python3 -c "import json,sys;m=json.load(open(sys.argv[1]));sys.exit(0 if (m[\"fichiers\"],m[\"fichiers_non_copies\"])==(2,1) else 1)" "$TRAV/contenu1/manifeste.json"'
ok "Historique : réussie + avertissement enregistré" '[ "$(psql "$BASE" -X -tAc "select statut || (erreur like '"'"'Attention : 1 fichier%'"'"')::text from public.sauvegardes order by created_at desc limit 1")" = "reussietrue" ]'
ok "Aucun PDF en clair laissé sur le disque" '! ls "$TRAV/sorties" | grep -v "\.tar\.gpg$" | grep -q .'

# 2) Sauvegarde sans la clé serveur : la base est quand même sauvegardée
FICHIER2="$(env -u SUPABASE_SERVICE_ROLE_KEY SUPABASE_DB_URL="$BASE" DOSSIER_SORTIE="$TRAV/sorties" SAUVEGARDE_TYPE=test bash "$TRAV/scripts/sauvegarde.sh" 2>"$TRAV/err2")"
ok "Sans clé : sauvegarde de la base réussie" '[ -s "$FICHIER2" ] && [ "$(psql "$BASE" -X -tAc "select statut from public.sauvegardes order by created_at desc limit 1")" = "reussie" ]'
ok "Sans clé : 3 PDF signalés non copiés" 'grep -q "3 fichier(s) PDF non copié" "$TRAV/err2"'

# 3) Stockage injoignable : idem, jamais d'échec
kill $SRV; sleep 0.5
FICHIER3="$(SUPABASE_DB_URL="$BASE" DOSSIER_SORTIE="$TRAV/sorties" SAUVEGARDE_TYPE=test bash "$TRAV/scripts/sauvegarde.sh" 2>"$TRAV/err3")"
ok "Stockage injoignable : sauvegarde réussie, 3 non copiés" '[ -s "$FICHIER3" ] && grep -q "3 fichier(s) PDF non copié" "$TRAV/err3"'

# 4) Vérification puis restauration complète dans une base neuve, PDF remis dans un autre stockage
ok "Vérification (--verifier)" 'bash "$TRAV/scripts/restaurer.sh" --verifier "$FICHIER" >/dev/null 2>&1'
psql "postgresql://postgres:test@dhb-test-pg:5432/postgres" -X -q -c "drop database if exists dhb_restau_lot6" -c "create database dhb_restau_lot6"
CIBLE="postgresql://postgres:test@dhb-test-pg:5432/dhb_restau_lot6"
psql "$CIBLE" -X -q -f /outils/shim-supabase.sql >/dev/null 2>&1
python3 /outils/stockage-factice.py "$TRAV/stock-cible" & SRV=$!; sleep 1
( cd "$TRAV" && CIBLE_DB_URL="$CIBLE" bash scripts/restaurer.sh "$FICHIER" > "$TRAV/restau.log" 2>&1 ); R=$?
ok "Restauration : terminée sans écart" '[ $R = 0 ] && grep -q "toutes les tables correspondent" "$TRAV/restau.log"'
ok "Restauration : 2 PDF remis dans le stockage" 'grep -q "2 PDF remis" "$TRAV/restau.log" && cmp -s "$TRAV/stock-cible/devis/$D.pdf" "$TRAV/stock-source/devis/$D.pdf" && cmp -s "$TRAV/stock-cible/factures/$F.pdf" "$TRAV/stock-source/factures/$F.pdf"'
ok "Restauration : espace « documents » recréé privé" '[ "$(psql "$CIBLE" -X -tAc "select public from storage.buckets where id='"'"'documents'"'"'")" = "f" ]'
kill $SRV

# 5) Restauration sans clé : PDF copiés dans un dossier local
psql "postgresql://postgres:test@dhb-test-pg:5432/postgres" -X -q -c "drop database if exists dhb_restau_lot6" -c "create database dhb_restau_lot6"
psql "$CIBLE" -X -q -f /outils/shim-supabase.sql >/dev/null 2>&1
( cd "$TRAV" && env -u SUPABASE_SERVICE_ROLE_KEY CIBLE_DB_URL="$CIBLE" bash scripts/restaurer.sh "$FICHIER" > "$TRAV/restau2.log" 2>&1 ); R=$?
ok "Restauration sans clé : PDF copiés en local + consigne" '[ $R = 0 ] && grep -q "2 PDF copiés dans ./pdf-restaures-" "$TRAV/restau2.log" && [ "$(find "$TRAV"/pdf-restaures-* -type f | wc -l)" = 2 ]'

# 6) Archive altérée (PDF retiré) : la restauration le détecte
mkdir -p "$TRAV/alt"; gpg --batch --quiet --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" --decrypt "$FICHIER" 2>/dev/null | tar -C "$TRAV/alt" -xf -
rm "$TRAV/alt/fichiers/devis/$D.pdf"; tar -C "$TRAV/alt" -cf - public.dump auth.sql manifeste.json fichiers | gpg --batch --yes --quiet --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" --symmetric --cipher-algo AES256 -o "$TRAV/altere.tar.gpg"
psql "postgresql://postgres:test@dhb-test-pg:5432/postgres" -X -q -c "drop database if exists dhb_restau_lot6" -c "create database dhb_restau_lot6"
psql "$CIBLE" -X -q -f /outils/shim-supabase.sql >/dev/null 2>&1
( cd "$TRAV" && CIBLE_DB_URL="$CIBLE" bash scripts/restaurer.sh "$TRAV/altere.tar.gpg" > "$TRAV/restau3.log" 2>&1 ); R=$?
ok "Archive altérée : restauration refusée (PDF manquant détecté)" '[ $R != 0 ] && grep -q "1 PDF présents, 2 attendus" "$TRAV/restau3.log"'

psql "$BASE" -X -q -c "delete from storage.objects where bucket_id='documents'; delete from public.sauvegardes where type='test'"
psql "postgresql://postgres:test@dhb-test-pg:5432/postgres" -X -q -c "drop database if exists dhb_restau_lot6"
echo "$OK / $((OK+KO)) tests sauvegarde/restauration conformes"
