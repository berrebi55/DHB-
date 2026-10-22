-- =====================================================================
--  DHB — Tests du LOT 8 : historique des emails et modèles.
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 15 / 15 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

set session_replication_role = replica;
delete from public.emails where sujet like 'Lot8%';
delete from public.clients where nom = 'Lot8 Client';
delete from public.email_modeles where cle like 'lot8%';
set session_replication_role = origin;
insert into public.clients (id, nom, email) values ('abababab-0000-4000-8000-000000000001', 'Lot8 Client', 'client@test-lot8.fr');
insert into public.emails (origine, destinataire, sujet, corps_html, statut, client_id)
  values ('manuel', 'client@test-lot8.fr', 'Lot8 essai', '<p>Bonjour</p>', 'envoye', 'abababab-0000-4000-8000-000000000001');

create temp table resultats(n serial, groupe text, scenario text, attendu text, obtenu text, ok boolean);
grant all on resultats to anon, authenticated, service_role; grant usage on sequence resultats_n_seq to anon, authenticated, service_role;
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

-- Historique
select pg_temp.essai('Historique', 'Collaborateur lit l''historique', 'authenticated', :'C', $$select count(*) from public.emails where sujet like 'Lot8%'$$, 'LIGNES=1');
select pg_temp.essai('Historique', 'Compte en attente : rien', 'authenticated', :'P', 'select count(*) from public.emails', 'LIGNES=0');
select pg_temp.essai('Historique', 'Anonyme : rien', 'anon', null, 'select count(*) from public.emails', 'LIGNES=0');
select pg_temp.essai('Historique', 'Administrateur : ajouter un faux email refusé', 'authenticated', :'A', $$insert into public.emails (origine, destinataire, sujet, corps_html, statut) values ('manuel','x@y.fr','Lot8 faux','x','envoye')$$, 'REFUSE');
select pg_temp.essai('Historique', 'Administrateur : modifier l''historique refusé', 'authenticated', :'A', $$update public.emails set statut = 'echec'$$, 'REFUSE');
select pg_temp.essai('Historique', 'Administrateur : effacer l''historique refusé', 'authenticated', :'A', $$delete from public.emails$$, 'REFUSE');
select pg_temp.essai('Historique', 'Serveur : écrit l''historique', 'service_role', null, $$insert into public.emails (origine, destinataire, sujet, corps_html, statut) values ('relance_devis','x@y.fr','Lot8 serveur','x','echec')$$, 'LIGNES=1');
select pg_temp.essai('Historique', 'Origine inconnue refusée', 'service_role', null, $$insert into public.emails (origine, destinataire, sujet, corps_html, statut) values ('pirate','x@y.fr','Lot8 x','x','envoye')$$, 'REFUSE');

-- Modèles
select pg_temp.essai('Modèles', 'Équipe : lit les 5 modèles de départ', 'authenticated', :'C', $$select count(*) from public.email_modeles where cle in ('libre','suivi_demande','relance_devis','rappel_facture','ticket_resolu')$$, 'LIGNES=5');
select pg_temp.essai('Modèles', 'Collaborateur : modifier un modèle refusé', 'authenticated', :'C', $$update public.email_modeles set sujet = 'x' where cle = 'libre'$$, 'LIGNES=0');
select pg_temp.essai('Modèles', 'Administrateur : crée un modèle', 'authenticated', :'A', $$insert into public.email_modeles (cle, nom, sujet, corps) values ('lot8_test', 'Test', 'Sujet', 'Corps')$$, 'LIGNES=1');
select pg_temp.essai('Modèles', 'Administrateur : modifie un modèle', 'authenticated', :'A', $$update public.email_modeles set sujet = sujet where cle = 'libre'$$, 'LIGNES=1');
select pg_temp.essai('Modèles', 'Clé invalide refusée', 'authenticated', :'A', $$insert into public.email_modeles (cle, nom, sujet, corps) values ('Clé avec espaces', 'x', 'x', 'x')$$, 'REFUSE');
select pg_temp.essai('Modèles', 'Anonyme : aucun modèle visible', 'anon', null, 'select count(*) from public.email_modeles', 'LIGNES=0');

-- Client avec emails : historique protégé (lot 4)
select pg_temp.essai('Clients', 'Client avec un email envoyé : suppression refusée', 'authenticated', :'A', $$delete from public.clients where id = 'abababab-0000-4000-8000-000000000001'$$, 'REFUSE');

set session_replication_role = replica;
delete from public.emails where sujet like 'Lot8%';
delete from public.clients where nom = 'Lot8 Client';
delete from public.email_modeles where cle like 'lot8%';
set session_replication_role = origin;
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
