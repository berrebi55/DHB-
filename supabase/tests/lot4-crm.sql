-- =====================================================================
--  DHB — Tests du LOT 4 : origine des demandes, notes typées,
--  protection des clients contre la suppression.
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 30 / 30 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- ---------- Préparation ----------
set session_replication_role = replica;   -- nettoyage sans déclencheurs
delete from public.notes where client_id in (select id from public.clients where nom like 'Lot4%');
delete from public.devis where client_id in (select id from public.clients where nom like 'Lot4%');
delete from public.clients where nom like 'Lot4%';
delete from public.leads where email like '%@test-lot4.fr';
-- Ancienne demande (avant le lot 4) : paramètres de campagne collés dans source_url.
insert into public.leads(id, entity, nom, email, source_url) values
  ('cccccccc-0000-0000-0000-000000000001','infogerance','Lot4 Ancienne','ancienne@test-lot4.fr','/contact/?utm_source=newsletter&utm_medium=email&utm_campaign=rentree'),
  ('cccccccc-0000-0000-0000-000000000002','infogerance','Lot4 Sans info','sansinfo@test-lot4.fr','/contact/');
set session_replication_role = origin;
insert into public.clients(id, nom) values
  ('dddddddd-0000-0000-0000-000000000001','Lot4 Client vide'),
  ('dddddddd-0000-0000-0000-000000000002','Lot4 Client avec note'),
  ('dddddddd-0000-0000-0000-000000000003','Lot4 Client avec devis');
insert into public.notes(client_id, body) values ('dddddddd-0000-0000-0000-000000000002','Appel de suivi');
insert into public.devis(client_id, client_nom) values ('dddddddd-0000-0000-0000-000000000003','Lot4 Client avec devis');

create temp table resultats(n serial, groupe text, scenario text, attendu text, obtenu text, ok boolean);
grant all on resultats to anon, authenticated, service_role; grant usage on sequence resultats_n_seq to anon, authenticated, service_role;

-- essai(groupe, scénario, rôle, uid, requête, attendu) : 'REFUSE' | 'LIGNES=n' | 'LIGNES>0'
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
    case when attendu = 'REFUSE' then res like 'REFUSE%'
         when attendu = 'LIGNES>0' then res ~ '^LIGNES=[1-9]'
         else res = attendu end);
end $f$;

-- demande(scénario, rôle, uid, colonnes, valeurs, lecture, attendu) : insère une
-- demande avec le rôle donné, puis relit (en administrateur de la base) la
-- valeur calculée par la base pour cette demande. Tout est annulé ensuite.
create or replace function pg_temp.demande(sc text, r text, uid text, cols text, vals text, lecture text, attendu text) returns void language plpgsql as $f$
declare res text; v text; claims text;
begin
  claims := case when uid is null then json_build_object('role',r)::text else json_build_object('sub',uid,'role',r)::text end;
  begin
    execute 'set local role ' || r;
    perform set_config('request.jwt.claims', claims, true);
    perform set_config('request.jwt.claim.sub', coalesce(uid,''), true);
    execute format('insert into public.leads(entity, nom, email, %s) values (''infogerance'', ''Lot4 essai'', ''essai@test-lot4.fr'', %s)', cols, vals);
    execute 'set local role postgres';
    execute format('select (%s)::text from public.leads where email = ''essai@test-lot4.fr''', lecture) into v;
    res := 'VAL=' || coalesce(v, '∅');
    raise exception '__annuler__';
  exception when others then
    if sqlerrm <> '__annuler__' then res := 'REFUSE: ' || left(sqlerrm, 90); end if;
  end;
  insert into resultats(groupe,scenario,attendu,obtenu,ok) values ('Origine', sc, attendu, res,
    case when attendu = 'REFUSE' then res like 'REFUSE%' else res = attendu end);
end $f$;

\set A '11111111-1111-1111-1111-111111111111'
\set C '22222222-2222-2222-2222-222222222222'
\set P '33333333-3333-3333-3333-333333333333'
update public.profiles set role='en_attente' where id=:'P';

-- ---------- Origine calculée par la base (formulaire public, anonyme) ----------
select pg_temp.demande('Publicité Google (utm_medium=cpc)','anon',null,'utm_source, utm_medium',$$'google','cpc'$$,'source','VAL=publicite');
select pg_temp.demande('Clic publicitaire (gclid seul)','anon',null,'gclid, landing_page',$$'Cj0KCQ','/'$$,'source','VAL=publicite');
select pg_temp.demande('Moteur de recherche (site d''origine google)','anon',null,'referrer, landing_page',$$'www.google.com','/services/'$$,'source','VAL=recherche');
select pg_temp.demande('Moteur de recherche (Qwant)','anon',null,'referrer',$$'www.qwant.com'$$,'source','VAL=recherche');
select pg_temp.demande('Réseau social (LinkedIn)','anon',null,'referrer',$$'www.linkedin.com'$$,'source','VAL=reseaux_sociaux');
select pg_temp.demande('Réseau social (utm_source=facebook)','anon',null,'utm_source',$$'facebook'$$,'source','VAL=reseaux_sociaux');
select pg_temp.demande('Campagne email (utm_medium=email)','anon',null,'utm_source, utm_medium',$$'brevo','email'$$,'source','VAL=email');
select pg_temp.demande('Autre site du groupe DHB','anon',null,'referrer',$$'pro.dhb-groupe.fr'$$,'source','VAL=site_dhb');
select pg_temp.demande('Autre site (lien externe)','anon',null,'referrer',$$'www.annuaire-local.fr'$$,'source','VAL=site_referent');
select pg_temp.demande('Accès direct (page d''arrivée seule)','anon',null,'landing_page',$$'/contact/'$$,'source','VAL=direct');
select pg_temp.demande('Sans aucune information : origine inconnue','anon',null,'message',$$'Bonjour'$$,'source','VAL=∅');
select pg_temp.demande('Source forcée par le visiteur : ignorée','anon',null,'source, landing_page',$$'recommandation','/'$$,'source','VAL=direct');
select pg_temp.demande('Champ trop long : tronqué, demande acceptée','anon',null,'utm_campaign',$$repeat('x', 400)$$,'length(utm_campaign)','VAL=200');
select pg_temp.demande('Identifiant GA4 invalide : ignoré','anon',null,'ga_client_id',$$'abc<script>'$$,'ga_client_id','VAL=∅');
select pg_temp.demande('Identifiant GA4 valide : conservé','anon',null,'ga_client_id',$$'1234567890.1700000000'$$,'ga_client_id','VAL=1234567890.1700000000');
select pg_temp.demande('Statut toujours imposé avec l''attribution','anon',null,'status, utm_source',$$'gagne','google'$$,'status','VAL=nouveau');

-- ---------- Origine saisie par l'équipe ----------
select pg_temp.demande('Collaborateur : demande par téléphone','authenticated',:'C','source',$$'telephone'$$,'source','VAL=telephone');
select pg_temp.demande('Collaborateur : valeur inconnue refusée','authenticated',:'C','source',$$'pigeon_voyageur'$$,'source','REFUSE');
select pg_temp.essai('Origine','Collaborateur corrige la source','authenticated',:'C',$$update public.leads set source='recommandation' where id='cccccccc-0000-0000-0000-000000000002'$$,'LIGNES=1');
select pg_temp.essai('Origine','Compte en attente : modification impossible','authenticated',:'P',$$update public.leads set source='autre' where email like '%@test-lot4.fr'$$,'LIGNES=0');

-- ---------- Rattrapage des anciennes demandes ----------
do $$ begin perform public.rattraper_attribution_leads(); end $$;
insert into resultats(groupe,scenario,attendu,obtenu,ok)
  select 'Rattrapage','Paramètres recopiés depuis source_url','email/newsletter/rentree',
         concat_ws('/', source, utm_source, utm_campaign), concat_ws('/', source, utm_source, utm_campaign) = 'email/newsletter/rentree'
  from public.leads where id='cccccccc-0000-0000-0000-000000000001';
insert into resultats(groupe,scenario,attendu,obtenu,ok)
  select 'Rattrapage','Sans paramètre : origine laissée vide (rien d''inventé)','∅', coalesce(source,'∅'), source is null
  from public.leads where id='cccccccc-0000-0000-0000-000000000002';
select pg_temp.essai('Rattrapage','Fonction non appelable par l''API','authenticated',:'A','select public.rattraper_attribution_leads()','REFUSE');

-- ---------- Notes typées (fil du client) ----------
select pg_temp.essai('Historique','Collaborateur enregistre un appel','authenticated',:'C',$$insert into public.notes(client_id, type, body, author_id) values ('dddddddd-0000-0000-0000-000000000001','appel','Rappel demandé', '22222222-2222-2222-2222-222222222222')$$,'LIGNES=1');
select pg_temp.essai('Historique','Type inconnu refusé','authenticated',:'C',$$insert into public.notes(client_id, type, body, author_id) values ('dddddddd-0000-0000-0000-000000000001','sms','x', '22222222-2222-2222-2222-222222222222')$$,'REFUSE');

-- ---------- Clients : archivage plutôt que suppression ----------
select pg_temp.essai('Clients','Admin supprime une fiche vide','authenticated',:'A',$$delete from public.clients where id='dddddddd-0000-0000-0000-000000000001'$$,'LIGNES=1');
select pg_temp.essai('Clients','Admin supprime un client avec notes : refusé','authenticated',:'A',$$delete from public.clients where id='dddddddd-0000-0000-0000-000000000002'$$,'REFUSE');
select pg_temp.essai('Clients','Admin supprime un client avec devis : refusé','authenticated',:'A',$$delete from public.clients where id='dddddddd-0000-0000-0000-000000000003'$$,'REFUSE');
select pg_temp.essai('Clients','Collaborateur archive un client','authenticated',:'C',$$update public.clients set archived_at=now() where id='dddddddd-0000-0000-0000-000000000002'$$,'LIGNES=1');
select pg_temp.essai('Clients','Notes conservées','postgres',null,$$select count(*) from public.notes where client_id='dddddddd-0000-0000-0000-000000000002'$$,'LIGNES=1');

-- ---------- Nettoyage ----------
set session_replication_role = replica;
delete from public.notes where client_id in (select id from public.clients where nom like 'Lot4%');
delete from public.devis where client_id in (select id from public.clients where nom like 'Lot4%');
delete from public.clients where nom like 'Lot4%';
delete from public.leads where email like '%@test-lot4.fr';
set session_replication_role = origin;

select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
