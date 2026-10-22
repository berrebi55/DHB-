-- =====================================================================
--  DHB — Tests du LOT 12 : Search Console (propriétés, chiffres copiés).
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 11 / 11 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function pg_temp.nettoyer() returns void language plpgsql as $f$
begin
  delete from public.seo_quotidien where site like '%lot12%';
  delete from public.seo_requetes where site like '%lot12%';
  delete from public.seo_pages where site like '%lot12%';
  update public.integrations set details = '{}' where cle = 'search_console';
end $f$;
select pg_temp.nettoyer();
insert into public.seo_quotidien (site, jour, clics, impressions, position) values ('sc-domain:lot12.fr', current_date - 3, 5, 120, 8.4);
insert into public.seo_requetes (site, requete, clics, impressions, position, periode_fin) values ('sc-domain:lot12.fr', 'dépannage informatique', 3, 50, 6.1, current_date - 3);
insert into public.seo_pages (site, page, clics, impressions, position, periode_fin) values ('sc-domain:lot12.fr', 'https://lot12.fr/', 4, 80, 5.2, current_date - 3);

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

select pg_temp.essai('Propriétés', 'Administrateur : déclare un domaine et un préfixe d''URL', 'authenticated', :'A',
  $$update public.integrations set details = '{"sites": ["sc-domain:dhb-groupe.fr", "https://pro.dhb-groupe.fr/"]}' where cle = 'search_console'$$, 'LIGNES=1');
select pg_temp.essai('Propriétés', 'Adresse sans protocole refusée', 'authenticated', :'A',
  $$update public.integrations set details = '{"sites": ["dhb-groupe.fr"]}' where cle = 'search_console'$$, 'REFUSE');
select pg_temp.essai('Propriétés', 'Plus de 10 propriétés refusé', 'authenticated', :'A',
  $$update public.integrations set details = '{"sites": ["sc-domain:a1.fr","sc-domain:a2.fr","sc-domain:a3.fr","sc-domain:a4.fr","sc-domain:a5.fr","sc-domain:a6.fr","sc-domain:a7.fr","sc-domain:a8.fr","sc-domain:a9.fr","sc-domain:a10.fr","sc-domain:a11.fr"]}' where cle = 'search_console'$$, 'REFUSE');
select pg_temp.essai('Propriétés', 'Collaborateur : sans effet', 'authenticated', :'C',
  $$update public.integrations set details = '{"sites": ["sc-domain:x.fr"]}' where cle = 'search_console'$$, 'LIGNES=0');
select pg_temp.essai('Chiffres', 'Équipe : lit les clics par jour', 'authenticated', :'C', $$select count(*) from public.seo_quotidien where site like '%lot12%'$$, 'LIGNES=1');
select pg_temp.essai('Chiffres', 'Équipe : lit les requêtes et les pages', 'authenticated', :'C', $$select count(*) from public.seo_requetes r join public.seo_pages p using (site) where r.site like '%lot12%'$$, 'LIGNES=1');
select pg_temp.essai('Chiffres', 'Compte en attente : rien', 'authenticated', :'P', 'select count(*) from public.seo_quotidien', 'LIGNES=0');
select pg_temp.essai('Chiffres', 'Anonyme : rien', 'anon', null, 'select count(*) from public.seo_requetes', 'LIGNES=0');
select pg_temp.essai('Chiffres', 'Administrateur : modifier les chiffres refusé (copie de Google uniquement)', 'authenticated', :'A', $$update public.seo_quotidien set clics = 999$$, 'REFUSE');
select pg_temp.essai('Chiffres', 'Administrateur : ajouter une requête refusé', 'authenticated', :'A', $$insert into public.seo_requetes (site, requete, periode_fin) values ('x', 'y', current_date)$$, 'REFUSE');
select pg_temp.essai('Chiffres', 'Serveur : écrit les chiffres', 'service_role', null, $$insert into public.seo_pages (site, page, periode_fin) values ('sc-domain:lot12.fr', 'https://lot12.fr/contact/', current_date)$$, 'LIGNES=1');

select pg_temp.nettoyer();
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
