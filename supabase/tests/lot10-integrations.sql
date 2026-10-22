-- =====================================================================
--  DHB — Tests du LOT 10 : intégrations, identifiants Google, chiffres GA4.
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 20 / 20 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function pg_temp.nettoyer() returns void language plpgsql as $f$
begin
  set session_replication_role = replica;
  delete from public.integration_credentials;
  delete from public.integration_logs where message like 'lot10%';
  delete from public.analytics_quotidien where canal like 'Lot10%';
  delete from public.evenements where objet_id in (select id from public.leads where nom like 'Lot10%');
  delete from public.leads where nom like 'Lot10%';
  update public.integrations set statut = 'non_configure', compte = null, details = '{}', erreur = null, derniere_synchro = null;
  set session_replication_role = origin;
end $f$;
select pg_temp.nettoyer();
insert into public.integration_credentials (cle, refresh_token) values ('google', 'jeton-secret-lot10');
insert into public.integration_logs (cle, action, statut, message) values ('google', 'connexion', 'ok', 'lot10 essai');
insert into public.analytics_quotidien (jour, canal, sessions) values (current_date, 'Lot10 Direct', 12);

create temp table resultats(n serial, groupe text, scenario text, attendu text, obtenu text, ok boolean);
grant all on resultats to anon, authenticated, service_role; grant usage on sequence resultats_n_seq to anon, authenticated, service_role;
create or replace function pg_temp.verif(g text, sc text, attendu text, obtenu text) returns void language sql as $f$
  insert into resultats(groupe, scenario, attendu, obtenu, ok) values (g, sc, attendu, coalesce(obtenu, '∅'), coalesce(obtenu, '∅') = attendu);
$f$;
create or replace function pg_temp.essai(g text, sc text, r text, uid text, q text, attendu text) returns void language plpgsql as $f$
declare res text; n bigint; claims text;
begin
  claims := case when uid is null then json_build_object('role',r)::text else json_build_object('sub',uid,'role',r)::text end;
  begin
    execute 'set local role ' || r;
    perform set_config('request.jwt.claims', claims, true);
    perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
    if q ~* '^\s*select count' then execute q into n; else execute q; get diagnostics n = row_count; end if;
    res := 'LIGNES=' || n;
    raise exception '__annuler__';
  exception when others then
    if sqlerrm <> '__annuler__' then res := 'REFUSE: ' || left(sqlerrm, 90); end if;
  end;
  insert into resultats(groupe,scenario,attendu,obtenu,ok) values (g, sc, attendu, res,
    case when attendu = 'REFUSE' then res like 'REFUSE%' when attendu = 'LIGNES>0' then res ~ '^LIGNES=[1-9]' else res = attendu end);
end $f$;
\set A '11111111-1111-1111-1111-111111111111'
\set C '22222222-2222-2222-2222-222222222222'
\set P '33333333-3333-3333-3333-333333333333'
update public.profiles set role='en_attente' where id=:'P';

-- ---------- Identifiants Google : jamais lisibles depuis l'API ----------
select pg_temp.essai('Secrets', 'Administrateur : lire le jeton Google refusé', 'authenticated', :'A', 'select count(*) from public.integration_credentials', 'REFUSE');
select pg_temp.essai('Secrets', 'Anonyme : lire le jeton refusé', 'anon', null, 'select count(*) from public.integration_credentials', 'REFUSE');
select pg_temp.essai('Secrets', 'Administrateur : écrire un jeton refusé', 'authenticated', :'A', $$update public.integration_credentials set refresh_token = 'x'$$, 'REFUSE');
select pg_temp.essai('Secrets', 'Serveur : lit le jeton', 'service_role', null, 'select count(*) from public.integration_credentials', 'LIGNES=1');

-- ---------- État des intégrations ----------
select pg_temp.essai('État', 'Équipe : voit google et ga4', 'authenticated', :'C', $$select count(*) from public.integrations where cle in ('google','ga4')$$, 'LIGNES=2');
select pg_temp.essai('État', 'Compte en attente : rien', 'authenticated', :'P', 'select count(*) from public.integrations', 'LIGNES=0');
select pg_temp.essai('Réglages', 'Collaborateur : modifier les réglages sans effet', 'authenticated', :'C', $$update public.integrations set details = '{"ga4_property_id":"123456789"}' where cle = 'ga4'$$, 'LIGNES=0');
select pg_temp.essai('Réglages', 'Administrateur : enregistre la propriété et l''identifiant de mesure', 'authenticated', :'A', $$update public.integrations set details = '{"ga4_property_id":"123456789","ga4_measurement_id":"G-ABC123DEF4"}' where cle = 'ga4'$$, 'LIGNES=1');
select pg_temp.essai('Réglages', 'Propriété GA4 non numérique refusée', 'authenticated', :'A', $$update public.integrations set details = '{"ga4_property_id":"UA-12345-1"}' where cle = 'ga4'$$, 'REFUSE');
select pg_temp.essai('Réglages', 'Identifiant de mesure mal formé refusé', 'authenticated', :'A', $$update public.integrations set details = '{"ga4_measurement_id":"12345"}' where cle = 'ga4'$$, 'REFUSE');
select pg_temp.essai('Réglages', 'Secret glissé dans les réglages refusé', 'authenticated', :'A', $$update public.integrations set details = '{"api_secret":"abc"}' where cle = 'ga4'$$, 'REFUSE');
do $$ begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  update public.integrations set statut = 'connecte', compte = 'pirate@exemple.fr', erreur = 'x', details = '{"ga4_property_id":"123456789"}' where cle = 'google';
end $$;
select pg_temp.verif('Réglages', 'Administrateur : statut, compte et erreur restent gérés par le serveur', 'non_configure/∅/∅/123456789',
  (select statut || '/' || coalesce(compte, '∅') || '/' || coalesce(erreur, '∅') || '/' || (details->>'ga4_property_id') from public.integrations where cle = 'google'));
select pg_temp.essai('État', 'Serveur : met à jour le statut de connexion', 'service_role', null, $$update public.integrations set statut = 'connecte', compte = 'dhb@exemple.fr' where cle = 'google'$$, 'LIGNES=1');
select pg_temp.essai('État', 'Administrateur : supprimer une intégration refusé', 'authenticated', :'A', $$delete from public.integrations where cle = 'google'$$, 'REFUSE');

-- ---------- Journal et chiffres ----------
select pg_temp.essai('Journal', 'Équipe : lit le journal', 'authenticated', :'C', $$select count(*) from public.integration_logs where message like 'lot10%'$$, 'LIGNES=1');
select pg_temp.essai('Journal', 'Administrateur : falsifier le journal refusé', 'authenticated', :'A', $$delete from public.integration_logs$$, 'REFUSE');
select pg_temp.essai('Chiffres', 'Équipe : lit les chiffres GA4 copiés', 'authenticated', :'C', $$select count(*) from public.analytics_quotidien where canal like 'Lot10%'$$, 'LIGNES=1');
select pg_temp.essai('Chiffres', 'Administrateur : modifier les chiffres refusé (copie de GA4 uniquement)', 'authenticated', :'A', $$update public.analytics_quotidien set sessions = 9999$$, 'REFUSE');

-- ---------- Conversion « demande gagnée » ----------
-- (une demande créée hors de l'équipe reçoit un identifiant imposé par la base : on la retrouve par son nom)
insert into public.leads (entity, nom, email) values ('infogerance', 'Lot10 Prospect', 'p@test-lot10.fr');
update public.leads set status = 'contacte' where nom = 'Lot10 Prospect';
update public.leads set status = 'gagne' where nom = 'Lot10 Prospect';
select pg_temp.verif('Événements', 'Demande créée puis gagnée → lead_cree puis lead_gagne (pas d''événement intermédiaire)', 'lead_cree,lead_gagne',
  (select string_agg(type, ',' order by created_at, type) from public.evenements where objet_id = (select id from public.leads where nom = 'Lot10 Prospect')));
update public.leads set is_read = true where nom = 'Lot10 Prospect';
select pg_temp.verif('Événements', 'Simple lecture d''une demande : aucun événement', '2',
  (select count(*)::text from public.evenements where objet_id = (select id from public.leads where nom = 'Lot10 Prospect')));

select pg_temp.nettoyer();
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
