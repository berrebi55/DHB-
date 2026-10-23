-- =====================================================================
--  DHB — Tests du LOT 16 : demandes de guide (type « guide »).
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 7 / 7 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function pg_temp.nettoyer() returns void language plpgsql as $f$
begin
  delete from public.activites where titre like '%lot16%';
  delete from public.evenements where objet_type = 'lead' and objet_id in (select id from public.leads where email like 'lot16-%@test.invalid');
  delete from public.leads where email like 'lot16-%@test.invalid';
end $f$;
select pg_temp.nettoyer();
create temp table resultats(n serial, groupe text, scenario text, attendu text, obtenu text, ok boolean);
create or replace function pg_temp.verif(g text, sc text, attendu text, obtenu text) returns void language sql as $f$
  insert into resultats(groupe, scenario, attendu, obtenu, ok) values (g, sc, attendu, coalesce(obtenu, '∅'), attendu = obtenu);
$f$;

-- Formulaires publics (rôle anonyme), comme depuis les sites.
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
insert into public.leads (entity, type, nom, email, message, source_url)
  values ('infogerance', 'guide', 'Visiteur lot16', 'lot16-guide@test.invalid', 'Demande du guide « Sécurité PME »', '/services/cybersecurite/');
insert into public.leads (entity, type, email, message) values ('particuliers', 'question', 'lot16-question@test.invalid', 'Une question');
insert into public.leads (entity, type, email, message) values ('infogerance', 'inconnu', 'lot16-autre@test.invalid', 'Type fantaisiste');
reset role;
select set_config('request.jwt.claims', '', false);

select pg_temp.verif('Formulaire', 'Guide demandé : enregistré comme « guide »', 'guide',
  (select type from public.leads where email = 'lot16-guide@test.invalid'));
select pg_temp.verif('Formulaire', 'Question : reste une « question »', 'question',
  (select type from public.leads where email = 'lot16-question@test.invalid'));
select pg_temp.verif('Formulaire', 'Type inconnu : ramené à « devis »', 'devis',
  (select type from public.leads where email = 'lot16-autre@test.invalid'));
select pg_temp.verif('Formulaire', 'Champs internes imposés (statut nouveau, priorité normale)', 'nouveau/normale',
  (select status || '/' || priorite from public.leads where email = 'lot16-guide@test.invalid'));
select pg_temp.verif('Journal', 'Activité « Guide téléchargé par … »', '1',
  (select count(*)::text from public.activites where titre = 'Guide téléchargé par Visiteur lot16'));
select pg_temp.verif('Automatisations', 'Événement « lead_cree » émis (file du lot 9)', '1',
  (select count(*)::text from public.evenements e join public.leads l on l.id = e.objet_id where l.email = 'lot16-guide@test.invalid' and e.type = 'lead_cree'));
do $$ begin
  begin
    update public.leads set type = 'autre' where email = 'lot16-guide@test.invalid';
    insert into resultats(groupe, scenario, attendu, obtenu, ok) values ('Base', 'Modification vers un type hors liste refusée (contrainte)', 'REFUSE', 'ACCEPTE', false);
  exception when check_violation then
    insert into resultats(groupe, scenario, attendu, obtenu, ok) values ('Base', 'Modification vers un type hors liste refusée (contrainte)', 'REFUSE', 'REFUSE', true);
  end;
end $$;

select pg_temp.nettoyer();
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
