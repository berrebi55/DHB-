-- =====================================================================
--  DHB — Tests de sécurité du LOT 1 (RLS, rôles, formulaires publics,
--  factures émises, paiements, numérotation).
--
--  ⚠️  BASE DE TEST UNIQUEMENT. Ne JAMAIS exécuter sur la base de production :
--  ce script crée et supprime des comptes et des données de test
--  (emails *@test-lot1.fr, factures T-*, clients « Lot1 … »).
--
--  Prérequis : PostgreSQL avec un schéma « auth » compatible Supabase
--  (auth.users, auth.uid() lisant request.jwt.claims), rôles anon /
--  authenticated / service_role, puis supabase/full-setup.sql exécuté.
--  Comptes de référence attendus : 1111…1111 (admin), 2222…2222 (collaborateur).
--
--  Exécution : psql -d <base_de_test> -f supabase/tests/lot1-securite.sql
--  Résultat attendu : « 73 / 73 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;
-- ===================== Préparation des données de test =====================
set session_replication_role = replica;   -- nettoyage sans déclencheurs
delete from public.paiements where facture_id in (select id from public.factures where numero like 'T-%');
delete from public.factures where numero like 'T-%';
delete from public.leads where email like '%@test-lot1.fr' or nom like 'Lot1%';
delete from public.clients where nom like 'Lot1%';
delete from public.profiles where email like '%@test-lot1.fr';
delete from auth.users where email like '%@test-lot1.fr';
set session_replication_role = origin;

-- Compte qui s'inscrit lui-même (trigger normal) + compte « orphelin » sans profil (créé triggers coupés)
insert into auth.users(id,email) values ('33333333-3333-3333-3333-333333333333','inscrit@test-lot1.fr');
insert into auth.users(id,email) values ('44444444-4444-4444-4444-444444444444','inconnu2@test-lot1.fr');
set session_replication_role = replica;
insert into auth.users(id,email) values ('55555555-5555-5555-5555-555555555555','orphelin@test-lot1.fr');
set session_replication_role = origin;

insert into public.clients(id,nom,email) values ('aaaaaaaa-0000-0000-0000-000000000001','Lot1 Client protégé','client@exemple.fr');
insert into public.factures(id,numero,status,client_nom,total_ht,total_ttc,date_facture) values
 ('bbbbbbbb-0000-0000-0000-000000000001','T-BROUILLON','brouillon','Lot1',100,100,current_date),
 ('bbbbbbbb-0000-0000-0000-000000000002','T-ENVOYEE','envoyee','Lot1',200,200,current_date),
 ('bbbbbbbb-0000-0000-0000-000000000003','T-PAYEE','envoyee','Lot1',300,300,current_date),
 ('bbbbbbbb-0000-0000-0000-000000000004','T-ANNULEE','annulee','Lot1',400,400,current_date);
insert into public.paiements(facture_id,montant,date_paiement,moyen) values ('bbbbbbbb-0000-0000-0000-000000000003',300,current_date,'virement');

create temp table resultats(n serial, groupe text, scenario text, attendu text, obtenu text, ok boolean);
grant all on resultats to anon, authenticated; grant usage on sequence resultats_n_seq to anon, authenticated;

-- essai(groupe, scénario, rôle PG, uid, requête, attendu)
--   attendu : 'REFUSE' | 'LIGNES=n' | 'LIGNES>0'
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

-- ===================== Inscription / rôles =====================
insert into resultats(groupe,scenario,attendu,obtenu,ok)
 select 'Inscription','Compte inscrit lui-même → rôle', 'en_attente', role, role='en_attente' from public.profiles where id=:'P';
insert into resultats(groupe,scenario,attendu,obtenu,ok)
 select 'Inscription','2e compte inconnu → rôle', 'en_attente', role, role='en_attente' from public.profiles where id='44444444-4444-4444-4444-444444444444';
-- Rattrapage (bloc du script rejoué) : le compte orphelin ne doit jamais devenir admin
insert into public.profiles (id, email, role)
  select u.id, u.email, 'en_attente' from auth.users u
  where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
insert into resultats(groupe,scenario,attendu,obtenu,ok)
 select 'Rattrapage','Compte sans profil après rattrapage', 'en_attente', role, role='en_attente' from public.profiles where id='55555555-5555-5555-5555-555555555555';
insert into resultats(groupe,scenario,attendu,obtenu,ok)
 select 'Rattrapage','Profils existants conservés (admin)', 'admin', role, role='admin' from public.profiles where id=:'A';

-- ===================== Utilisateur en_attente =====================
select pg_temp.essai('En attente','Lire les clients','authenticated',:'P','select count(*) from public.clients','LIGNES=0');
select pg_temp.essai('En attente','Lire la vue clients','authenticated',:'P','select count(*) from public.clients_vue','LIGNES=0');
select pg_temp.essai('En attente','Lire les demandes','authenticated',:'P','select count(*) from public.leads','LIGNES=0');
select pg_temp.essai('En attente','Lire les factures','authenticated',:'P','select count(*) from public.factures','LIGNES=0');
select pg_temp.essai('En attente','Lire le journal','authenticated',:'P','select count(*) from public.activites','LIGNES=0');
select pg_temp.essai('En attente','Lire la fiche entreprise','authenticated',:'P','select count(*) from public.entreprise','LIGNES=0');
select pg_temp.essai('En attente','Lire les profils (seulement le sien)','authenticated',:'P','select count(*) from public.profiles','LIGNES=1');
select pg_temp.essai('En attente','Modifier un client','authenticated',:'P',$$update public.clients set notes='piraté' where nom like 'Lot1%'$$,'LIGNES=0');
select pg_temp.essai('En attente','Créer un client','authenticated',:'P',$$insert into public.clients(nom) values ('Lot1 intrus')$$,'REFUSE');
select pg_temp.essai('En attente','Se donner le rôle admin','authenticated',:'P',$$update public.profiles set role='admin' where id=auth.uid()$$,'REFUSE');
select pg_temp.essai('En attente','Consommer un numéro de facture','authenticated',:'P','select public.next_facture_numero()','REFUSE');
select pg_temp.essai('En attente','Écrire une note','authenticated',:'P',$$insert into public.notes(client_id,body) values ('aaaaaaaa-0000-0000-0000-000000000001','x')$$,'REFUSE');
select pg_temp.essai('En attente','Se nommer admin via definir_admin','authenticated',:'P',$$select public.definir_admin('inscrit@test-lot1.fr')$$,'REFUSE');

-- ===================== Visiteur anonyme (non authentifié) =====================
select pg_temp.essai('Anonyme','Lire les clients','anon',null,'select count(*) from public.clients','LIGNES=0');
select pg_temp.essai('Anonyme','Lire les demandes','anon',null,'select count(*) from public.leads','LIGNES=0');
select pg_temp.essai('Anonyme','Lire les prix publics (settings)','anon',null,'select count(*) from public.settings','LIGNES>0');
select pg_temp.essai('Anonyme','Modifier un client','anon',null,$$update public.clients set notes='x'$$,'LIGNES=0');
select pg_temp.essai('Anonyme','Supprimer une facture','anon',null,$$delete from public.factures where numero like 'T-%'$$,'LIGNES=0');
select pg_temp.essai('Anonyme','Numéro de facture','anon',null,'select public.next_facture_numero()','REFUSE');
select pg_temp.essai('Anonyme','definir_admin','anon',null,$$select public.definir_admin('inscrit@test-lot1.fr')$$,'REFUSE');
select pg_temp.essai('Anonyme','Demande normale (formulaire)','anon',null,$$insert into public.leads(entity,type,nom,email,message) values ('particuliers','devis','Lot1 Visiteur','visiteur@test-lot1.fr','Bonjour')$$,'LIGNES=1');
select pg_temp.essai('Anonyme','Demande sans email ni téléphone','anon',null,$$insert into public.leads(entity,nom) values ('particuliers','Lot1 vide')$$,'REFUSE');
select pg_temp.essai('Anonyme','Demande email invalide','anon',null,$$insert into public.leads(entity,email) values ('particuliers','pas-un-email')$$,'REFUSE');
select pg_temp.essai('Anonyme','Demande site inconnu','anon',null,$$insert into public.leads(entity,email) values ('pirate','a@test-lot1.fr')$$,'REFUSE');
select pg_temp.essai('Anonyme','Demande message trop long','anon',null,$$insert into public.leads(entity,email,message) values ('particuliers','b@test-lot1.fr',repeat('x',6000))$$,'REFUSE');

-- ===================== Collaborateur =====================
select pg_temp.essai('Collaborateur','Lire les clients','authenticated',:'C','select count(*) from public.clients','LIGNES>0');
select pg_temp.essai('Collaborateur','Modifier un client','authenticated',:'C',$$update public.clients set notes='ok' where nom like 'Lot1%'$$,'LIGNES=1');
select pg_temp.essai('Collaborateur','Supprimer un client','authenticated',:'C',$$delete from public.clients where nom like 'Lot1%'$$,'LIGNES=0');
select pg_temp.essai('Collaborateur','Modifier son propre rôle','authenticated',:'C',$$update public.profiles set role='admin' where id=auth.uid()$$,'REFUSE');
select pg_temp.essai('Collaborateur','Modifier le rôle d''un autre','authenticated',:'C',$$update public.profiles set role='en_attente' where id='11111111-1111-1111-1111-111111111111'$$,'LIGNES=0');
select pg_temp.essai('Collaborateur','Valider un compte en attente','authenticated',:'C',$$update public.profiles set role='collaborateur' where id='33333333-3333-3333-3333-333333333333'$$,'LIGNES=0');
select pg_temp.essai('Collaborateur','Modifier la fiche entreprise','authenticated',:'C',$$update public.entreprise set siret='000'$$,'LIGNES=0');
select pg_temp.essai('Collaborateur','Modifier les prix (settings)','authenticated',:'C',$$insert into public.settings(entity,skey,value) values ('particuliers','intervention_prix','1') on conflict (entity,skey) do update set value='1'$$,'REFUSE');
select pg_temp.essai('Collaborateur','Supprimer une facture brouillon','authenticated',:'C',$$delete from public.factures where numero='T-BROUILLON'$$,'LIGNES=0');
select pg_temp.essai('Collaborateur','Lire les profils de l''équipe','authenticated',:'C','select count(*) from public.profiles','LIGNES>0');
select pg_temp.essai('Collaborateur','Numéro de facture','authenticated',:'C','select public.next_facture_numero()','LIGNES=1');
select pg_temp.essai('Collaborateur','Écrire une note','authenticated',:'C',$$insert into public.notes(client_id,body) values ('aaaaaaaa-0000-0000-0000-000000000001','appel')$$,'LIGNES=1');
select pg_temp.essai('Collaborateur','definir_admin','authenticated',:'C',$$select public.definir_admin('collab@dhb.fr')$$,'REFUSE');

-- ===================== Administrateur =====================
select pg_temp.essai('Admin','Lire les clients','authenticated',:'A','select count(*) from public.clients','LIGNES>0');
select pg_temp.essai('Admin','Modifier la fiche entreprise','authenticated',:'A',$$update public.entreprise set ville=ville$$,'LIGNES=1');
select pg_temp.essai('Admin','Valider un compte en attente','authenticated',:'A',$$update public.profiles set role='collaborateur' where id='33333333-3333-3333-3333-333333333333'$$,'LIGNES=1');
select pg_temp.essai('Admin','Se retirer le rôle (dernier admin)','authenticated',:'A',$$update public.profiles set role='collaborateur' where id=auth.uid()$$,'REFUSE');
select pg_temp.essai('Admin','Supprimer un client','authenticated',:'A',$$delete from public.clients where nom like 'Lot1%'$$,'LIGNES=1');

-- ===================== Factures (admin) =====================
select pg_temp.essai('Factures','Supprimer une facture brouillon','authenticated',:'A',$$delete from public.factures where numero='T-BROUILLON'$$,'LIGNES=1');
select pg_temp.essai('Factures','Supprimer une facture envoyée','authenticated',:'A',$$delete from public.factures where numero='T-ENVOYEE'$$,'REFUSE');
select pg_temp.essai('Factures','Supprimer une facture payée','authenticated',:'A',$$delete from public.factures where numero='T-PAYEE'$$,'REFUSE');
select pg_temp.essai('Factures','Supprimer une facture annulée','authenticated',:'A',$$delete from public.factures where numero='T-ANNULEE'$$,'REFUSE');
select pg_temp.essai('Factures','Modifier le montant d''une facture envoyée','authenticated',:'A',$$update public.factures set total_ttc=1 where numero='T-ENVOYEE'$$,'REFUSE');
select pg_temp.essai('Factures','Modifier le numéro d''une facture envoyée','authenticated',:'A',$$update public.factures set numero='T-X' where numero='T-ENVOYEE'$$,'REFUSE');
select pg_temp.essai('Factures','Repasser une facture envoyée en brouillon','authenticated',:'A',$$update public.factures set status='brouillon' where numero='T-ENVOYEE'$$,'REFUSE');
select pg_temp.essai('Factures','Réactiver une facture annulée','authenticated',:'A',$$update public.factures set status='envoyee' where numero='T-ANNULEE'$$,'REFUSE');
select pg_temp.essai('Factures','Annuler une facture envoyée','authenticated',:'A',$$update public.factures set status='annulee' where numero='T-ENVOYEE'$$,'LIGNES=1');
select pg_temp.essai('Factures','Modifier une facture brouillon','authenticated',:'A',$$update public.factures set total_ttc=150 where numero='T-BROUILLON'$$,'LIGNES=1');
select pg_temp.essai('Factures','Changer l''échéance d''une facture envoyée','authenticated',:'A',$$update public.factures set date_echeance=current_date+30 where numero='T-ENVOYEE'$$,'LIGNES=1');
select pg_temp.essai('Factures','Supprimer une facture émise (service role)','service_role',null,$$delete from public.factures where numero='T-ENVOYEE'$$,'REFUSE');


-- ===================== Formulaire public falsifié (vérifié en base) =====================
set role anon;
select set_config('request.jwt.claims','{"role":"anon"}',false);
insert into public.leads(id,entity,type,nom,email,status,priorite,client_id,is_read,notes,relance_at,created_at)
 values ('cccccccc-0000-0000-0000-000000000001','particuliers','devis','Lot1 Falsifié','falsifie@test-lot1.fr','gagne','urgente',
         '11111111-1111-1111-1111-111111111111',true,'note interne','2020-01-01','2001-01-01');
reset role;
select set_config('request.jwt.claims','',false);
insert into resultats(groupe,scenario,attendu,obtenu,ok)
 select 'Formulaire falsifié','Valeurs internes imposées par la base',
        'nouveau / normale / client vide / non lue / sans note / date réelle / id regénéré',
        status||' / '||priorite||' / '||coalesce(client_id::text,'client vide')||' / '||case when is_read then 'lue' else 'non lue' end
          ||' / '||coalesce(notes,'sans note')||' / '||case when created_at > now()-interval '1 hour' then 'date réelle' else created_at::text end
          ||' / '||case when id='cccccccc-0000-0000-0000-000000000001' then 'id imposé!' else 'id regénéré' end,
        status='nouveau' and priorite='normale' and client_id is null and not is_read and notes is null and relance_at is null
          and created_at > now()-interval '1 hour' and id <> 'cccccccc-0000-0000-0000-000000000001'
 from public.leads where email='falsifie@test-lot1.fr';
insert into resultats(groupe,scenario,attendu,obtenu,ok)
 select 'Formulaire falsifié','Type de client recalculé (particuliers)','particulier', coalesce(type_client,'(vide)'), type_client='particulier'
 from public.leads where email='falsifie@test-lot1.fr';

-- Limite anti-robot : 3 demandes / 10 min par email
select pg_temp.essai('Anti-robot','1re demande (même email)','anon',null,$$insert into public.leads(entity,email) values ('groupe','robot@test-lot1.fr')$$,'LIGNES=1');
insert into public.leads(entity,email,nom) values ('groupe','robot@test-lot1.fr','Lot1 r1'),('groupe','robot@test-lot1.fr','Lot1 r2'),('groupe','robot@test-lot1.fr','Lot1 r3');
select pg_temp.essai('Anti-robot','4e demande en 10 min (même email)','anon',null,$$insert into public.leads(entity,email) values ('groupe','robot@test-lot1.fr')$$,'REFUSE');
select pg_temp.essai('Anti-robot','Autre visiteur au même moment','anon',null,$$insert into public.leads(entity,email) values ('groupe','autre@test-lot1.fr')$$,'LIGNES=1');
select pg_temp.essai('Équipe','Collaborateur saisit une demande avec statut','authenticated',:'C',$$insert into public.leads(entity,email,status,priorite) values ('groupe','equipe@test-lot1.fr','contacte','haute')$$,'LIGNES=1');

-- ===================== Paiements et solde (comportement existant inchangé) =====================
select pg_temp.essai('Paiements','Collaborateur enregistre un paiement','authenticated',:'C',$$insert into public.paiements(facture_id,montant,date_paiement,moyen) values ('bbbbbbbb-0000-0000-0000-000000000002',50,current_date,'virement')$$,'LIGNES=1');
insert into resultats(groupe,scenario,attendu,obtenu,ok)
 select 'Paiements','Facture « T-PAYEE » soldée par son paiement','payee',status,status='payee' from public.factures where numero='T-PAYEE';
insert into public.paiements(facture_id,montant,date_paiement,moyen) values ('bbbbbbbb-0000-0000-0000-000000000002',120,current_date,'virement');
insert into resultats(groupe,scenario,attendu,obtenu,ok) select 'Paiements','Paiement partiel (120 / 200)','envoyee',status,status='envoyee' from public.factures where numero='T-ENVOYEE';
insert into public.paiements(facture_id,montant,date_paiement,moyen) values ('bbbbbbbb-0000-0000-0000-000000000002',80,current_date,'cheque');
insert into resultats(groupe,scenario,attendu,obtenu,ok) select 'Paiements','Solde complet (200 / 200)','payee + date',status||' + '||coalesce(paid_at::date::text,'sans date'),status='payee' and paid_at is not null from public.factures where numero='T-ENVOYEE';
delete from public.paiements where facture_id='bbbbbbbb-0000-0000-0000-000000000002' and montant=80;
insert into resultats(groupe,scenario,attendu,obtenu,ok) select 'Paiements','Suppression d''un paiement → réouverte','envoyee',status,status='envoyee' from public.factures where numero='T-ENVOYEE';
insert into resultats(groupe,scenario,attendu,obtenu,ok) select 'Paiements','Paiements conservés (facture émise non supprimable)','1',count(*)::text,count(*)=1 from public.paiements where facture_id='bbbbbbbb-0000-0000-0000-000000000002';
select pg_temp.essai('Paiements','Payer une facture annulée','authenticated',:'A',$$insert into public.paiements(facture_id,montant,date_paiement,moyen) values ('bbbbbbbb-0000-0000-0000-000000000004',400,current_date,'virement')$$,'REFUSE');

-- ===================== Numérotation continue =====================
create temp table numeros(n text);
select set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',false);
insert into numeros select public.next_facture_numero();
insert into numeros select public.next_facture_numero();
select set_config('request.jwt.claims','',false);
insert into resultats(groupe,scenario,attendu,obtenu,ok)
 select 'Numérotation','Deux numéros consécutifs (collaborateur)','+1', string_agg(n,' puis ' order by n),
   (max(split_part(n,'-',2)::int) - min(split_part(n,'-',2)::int)) = 1 from numeros;

select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
