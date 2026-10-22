-- =====================================================================
--  DHB — Tests du LOT 6 : table « documents » (PDF archivés) et stockage privé.
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 16 / 16 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- ---------- Préparation ----------
set session_replication_role = replica;
delete from public.documents where chemin like 'test-lot6/%';
delete from public.factures where numero like 'T6-%';
delete from public.devis where numero like 'T6-%';
set session_replication_role = origin;
insert into public.devis(id, numero, client_nom) values ('eeeeeeee-0000-0000-0000-000000000001','T6-DEV','Lot6');
insert into public.factures(id, numero, status, client_nom, total_ht, total_ttc, date_facture) values
  ('eeeeeeee-0000-0000-0000-000000000002','T6-FAC','envoyee','Lot6',100,100,current_date);
insert into public.documents(id, type, devis_id, numero, nom_fichier, chemin) values
  ('eeeeeeee-1111-0000-0000-000000000001','devis','eeeeeeee-0000-0000-0000-000000000001','T6-DEV','Devis-T6-DEV.pdf','test-lot6/devis.pdf');
insert into public.documents(id, type, facture_id, numero, nom_fichier, chemin) values
  ('eeeeeeee-1111-0000-0000-000000000002','facture','eeeeeeee-0000-0000-0000-000000000002','T6-FAC','Facture-T6-FAC.pdf','test-lot6/facture.pdf');

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

-- ---------- Lecture ----------
select pg_temp.essai('Lecture','Administrateur voit les documents','authenticated',:'A',$$select count(*) from public.documents where chemin like 'test-lot6/%'$$,'LIGNES=2');
select pg_temp.essai('Lecture','Collaborateur voit les documents','authenticated',:'C',$$select count(*) from public.documents where chemin like 'test-lot6/%'$$,'LIGNES=2');
select pg_temp.essai('Lecture','Compte en attente : rien','authenticated',:'P','select count(*) from public.documents','LIGNES=0');
select pg_temp.essai('Lecture','Anonyme : rien','anon',null,'select count(*) from public.documents','LIGNES=0');

-- ---------- Écriture depuis l'API : impossible ----------
select pg_temp.essai('API','Administrateur ajoute un document','authenticated',:'A',$$insert into public.documents(type, nom_fichier, chemin) values ('devis','x.pdf','test-lot6/x.pdf')$$,'REFUSE');
select pg_temp.essai('API','Collaborateur remplace le fichier d''un devis','authenticated',:'C',$$update public.documents set chemin='test-lot6/autre.pdf' where type='devis'$$,'REFUSE');
select pg_temp.essai('API','Administrateur supprime une archive','authenticated',:'A',$$delete from public.documents where chemin like 'test-lot6/%'$$,'REFUSE');
select pg_temp.essai('API','Anonyme ajoute un document','anon',null,$$insert into public.documents(type, nom_fichier, chemin) values ('devis','x.pdf','test-lot6/y.pdf')$$,'REFUSE');

-- ---------- Fonction serveur (clé service role) ----------
select pg_temp.essai('Serveur','Met à jour le PDF d''un devis','service_role',null,$$update public.documents set taille_octets=1234 where id='eeeeeeee-1111-0000-0000-000000000001'$$,'LIGNES=1');
select pg_temp.essai('Serveur','Modifier l''archive d''une facture : refusé','service_role',null,$$update public.documents set chemin='test-lot6/remplace.pdf' where id='eeeeeeee-1111-0000-0000-000000000002'$$,'REFUSE');
select pg_temp.essai('Serveur','Supprimer l''archive d''une facture : refusé','service_role',null,$$delete from public.documents where id='eeeeeeee-1111-0000-0000-000000000002'$$,'REFUSE');
select pg_temp.essai('Serveur','Deuxième archive pour la même facture : refusée','service_role',null,$$insert into public.documents(type, facture_id, nom_fichier, chemin) values ('facture','eeeeeeee-0000-0000-0000-000000000002','b.pdf','test-lot6/b.pdf')$$,'REFUSE');
select pg_temp.essai('Serveur','Supprimer le PDF d''un devis : accepté','service_role',null,$$delete from public.documents where id='eeeeeeee-1111-0000-0000-000000000001'$$,'LIGNES=1');
select pg_temp.essai('Serveur','Type inconnu refusé','service_role',null,$$insert into public.documents(type, nom_fichier, chemin) values ('photo','p.jpg','test-lot6/p.jpg')$$,'REFUSE');

-- ---------- Liens ----------
select pg_temp.essai('Liens','Facture archivée : suppression de la facture refusée','postgres',null,$$delete from public.factures where id='eeeeeeee-0000-0000-0000-000000000002'$$,'REFUSE');
insert into resultats(groupe,scenario,attendu,obtenu,ok)
  select 'Stockage','Espace « documents » privé', 'public=false',
         coalesce('public=' || (select public::text from storage.buckets where id='documents'), 'absent (pas de schéma storage)'),
         coalesce((select not public from storage.buckets where id='documents'), true);

-- ---------- Nettoyage ----------
set session_replication_role = replica;
delete from public.documents where chemin like 'test-lot6/%';
delete from public.factures where numero like 'T6-%';
delete from public.devis where numero like 'T6-%';
set session_replication_role = origin;

select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
