-- =====================================================================
--  DHB — Tests du LOT 2 : droits sur public.sauvegardes.
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 9 / 9 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;
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
    case when attendu = 'REFUSE' then res like 'REFUSE%'
         when attendu = 'LIGNES>0' then res ~ '^LIGNES=[1-9]'
         else res = attendu end);
end $f$;
\set A '11111111-1111-1111-1111-111111111111'
\set C '22222222-2222-2222-2222-222222222222'
\set P '33333333-3333-3333-3333-333333333333'
update public.profiles set role='en_attente' where id=:'P';
insert into public.sauvegardes(type,statut,taille_octets,fichier) values ('test','reussie',1234,'lot2-test.tar.gpg');
select pg_temp.essai('Lecture','Administrateur lit l''historique','authenticated',:'A','select count(*) from public.sauvegardes','LIGNES>0');
select pg_temp.essai('Lecture','Collaborateur lit l''historique','authenticated',:'C','select count(*) from public.sauvegardes','LIGNES>0');
select pg_temp.essai('Lecture','Compte en attente : rien','authenticated',:'P','select count(*) from public.sauvegardes','LIGNES=0');
select pg_temp.essai('Lecture','Anonyme : rien','anon',null,'select count(*) from public.sauvegardes','LIGNES=0');
select pg_temp.essai('Écriture','Administrateur ajoute une fausse sauvegarde','authenticated',:'A',$$insert into public.sauvegardes(type,statut) values ('manuelle','reussie')$$,'REFUSE');
select pg_temp.essai('Écriture','Collaborateur modifie l''historique','authenticated',:'C',$$update public.sauvegardes set statut='reussie'$$,'REFUSE');
select pg_temp.essai('Écriture','Administrateur supprime l''historique','authenticated',:'A',$$delete from public.sauvegardes$$,'REFUSE');
select pg_temp.essai('Écriture','Anonyme ajoute une sauvegarde','anon',null,$$insert into public.sauvegardes(type,statut) values ('manuelle','reussie')$$,'REFUSE');
select pg_temp.essai('Contrôle','Statut invalide refusé par la base','postgres',null,$$insert into public.sauvegardes(type,statut) values ('manuelle','peut-etre')$$,'REFUSE');
delete from public.sauvegardes where fichier='lot2-test.tar.gpg';
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
