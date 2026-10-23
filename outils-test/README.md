# Outils de test DHB (environnement de TEST uniquement)

Tous les tests des lots 1 à 17 : base de données, fonctions serveur (Deno), back-office
et sites dans Chrome, accessibilité. **Rien ici ne touche la vraie Supabase** : faux
Supabase dans le navigateur, base PostgreSQL locale dans Docker.

## 1. Installer (une fois)

```bash
cd outils-test
npm install          # Playwright, axe-core, Deno, pdf-lib (node_modules/ non versionné)
```

Chrome doit être installé (Playwright l'utilise via `channel: "chrome"`).

## 2. Base de test (Docker)

Si les conteneurs `dhb-test-pg` et `dhb-postgrest` n'existent plus :

```bash
docker network create dhb-net
docker run -d --name dhb-test-pg --network dhb-net -p 55432:5432 -e POSTGRES_PASSWORD=test -e POSTGRES_DB=dhb_test postgres:16
docker exec -i dhb-test-pg psql -U postgres -d dhb_test < outils-test/shim-supabase.sql
docker exec -i dhb-test-pg psql -U postgres -d dhb_test < supabase/full-setup.sql
docker exec -i dhb-test-pg psql -U postgres -d dhb_test < outils-test/comptes.sql
docker run -d --name dhb-postgrest --network dhb-net -p 54330:3000 -e PGRST_DB_URI=postgres://postgres:test@dhb-test-pg:5432/dhb_test -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon -e PGRST_JWT_SECRET=secret-jwt-de-test-au-moins-32-caracteres postgrest/postgrest:v12.2.3
```

Après l'ajout d'une table : `docker restart dhb-postgrest` (cache du schéma).

## 3. Build de test du back-office (faux Supabase)

```bash
cd admin-react
VITE_SUPABASE_URL=https://fauxsupabase.test VITE_SUPABASE_ANON_KEY=cle_de_test npx vite build --outDir ../outils-test/admin-dist --emptyOutDir
```

## 4. Tout rejouer

```bash
cd outils-test
bash tout-tester.sh admin-dist      # A = base + serveur, B = navigateur + sites ; ou « A » / « B »
```

Chaque script affiche « x / y … conformes ». Test d'un lot précis : `node admin-lotN.mjs admin-dist`,
`node sites-lotN.mjs C:/Users/CLAUDE/Documents/DHB-`, `docker exec -i dhb-test-pg psql -U postgres -d dhb_test < supabase/tests/lotN-….sql`.
