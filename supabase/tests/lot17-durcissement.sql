-- =====================================================================
--  DHB — Tests du LOT 17 : contrôles globaux de sécurité de la base.
--  ⚠️  BASE DE TEST UNIQUEMENT. Résultat attendu : « 5 / 5 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;
create temp table resultats(n serial, scenario text, attendu text, obtenu text, ok boolean);
create or replace function pg_temp.verif(sc text, attendu text, obtenu text) returns void language sql as $f$
  insert into resultats(scenario, attendu, obtenu, ok) values (sc, attendu, coalesce(obtenu, '∅'), attendu = coalesce(obtenu, '∅'));
$f$;

select pg_temp.verif('Toutes les tables ont la sécurité par ligne (RLS)', 'aucune',
  coalesce((select string_agg(tablename, ', ') from pg_tables where schemaname = 'public' and not rowsecurity), 'aucune'));
select pg_temp.verif('Aucun droit TRUNCATE pour anon / authenticated', 'aucun',
  coalesce((select string_agg(distinct table_name, ', ') from information_schema.role_table_grants
            where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type = 'TRUNCATE'), 'aucun'));
select pg_temp.verif('Toutes les vues appliquent les droits de l''utilisateur (security_invoker)', 'aucune',
  coalesce((select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'v'
              and not exists (select 1 from unnest(c.reloptions) o where o in ('security_invoker=true', 'security_invoker=on'))), 'aucune'));
select pg_temp.verif('Fonctions SECURITY DEFINER : search_path fixé', 'aucune',
  coalesce((select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')), 'aucune'));
select pg_temp.verif('Stockage des documents : espace privé', 'false',
  (select public::text from storage.buckets where id = 'documents'));

select scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
