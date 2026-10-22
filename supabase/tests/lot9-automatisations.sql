-- =====================================================================
--  DHB — Tests du LOT 9 : file d'événements, règles d'automatisation.
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 23 / 23 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function pg_temp.nettoyer() returns void language plpgsql as $f$
begin
  set session_replication_role = replica;
  delete from public.automatisation_runs where detail like 'lot9%';
  delete from public.evenements where objet_id in (select id from public.clients where nom like 'Lot9%')
    or objet_id in (select id from public.devis where client_nom like 'Lot9%')
    or objet_id in (select id from public.factures where client_nom like 'Lot9%')
    or objet_id in (select id from public.tickets where sujet like 'Lot9%')
    or objet_id in (select id from public.leads where nom like 'Lot9%');
  delete from public.paiements where reference like 'lot9%';
  delete from public.factures where client_nom like 'Lot9%';
  delete from public.devis where client_nom like 'Lot9%';
  delete from public.tickets where sujet like 'Lot9%';
  delete from public.leads where nom like 'Lot9%';
  delete from public.clients where nom like 'Lot9%';
  set session_replication_role = origin;
  update public.automatisations set actif = (cle in ('relance_devis','rappel_facture')),
    delai_jours = case cle when 'relance_devis' then 5 when 'rappel_facture' then 7 else 0 end;
end $f$;
select pg_temp.nettoyer();

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
create or replace function pg_temp.ev(objet uuid) returns text language sql as $f$
  select coalesce(string_agg(type, ',' order by created_at, type), '∅') from public.evenements where objet_id = objet;
$f$;

-- ---------- Émission des événements par la base ----------
insert into public.clients (id, nom, email) values ('a9a9a9a9-0000-4000-8000-000000000001', 'Lot9 Client', 'client@test-lot9.fr');
select pg_temp.verif('Événements', 'Création d''un client → client_cree', 'client_cree', pg_temp.ev('a9a9a9a9-0000-4000-8000-000000000001'));
update public.clients set telephone = '0102030405' where id = 'a9a9a9a9-0000-4000-8000-000000000001';
select pg_temp.verif('Événements', 'Simple modification d''un client → rien de plus', 'client_cree', pg_temp.ev('a9a9a9a9-0000-4000-8000-000000000001'));

do $$ begin
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  insert into public.leads (entity, nom, email) values ('particuliers', 'Lot9 Visiteur', 'visiteur@test-lot9.fr');
end $$;
select pg_temp.verif('Événements', 'Demande envoyée par un visiteur (formulaire public) → lead_cree', 'lead_cree',
  (select pg_temp.ev(id) from public.leads where nom = 'Lot9 Visiteur'));

insert into public.devis (id, numero, client_id, client_nom, statut) values ('a9a9a9a9-0000-4000-8000-000000000002', 'T9-DEV', 'a9a9a9a9-0000-4000-8000-000000000001', 'Lot9 Client', 'brouillon');
update public.devis set statut = 'envoye' where id = 'a9a9a9a9-0000-4000-8000-000000000002';
update public.devis set notes = 'x' where id = 'a9a9a9a9-0000-4000-8000-000000000002';
update public.devis set statut = 'accepte' where id = 'a9a9a9a9-0000-4000-8000-000000000002';
select pg_temp.verif('Événements', 'Devis envoyé puis accepté (modification sans effet ignorée)', 'devis_envoye,devis_accepte', pg_temp.ev('a9a9a9a9-0000-4000-8000-000000000002'));

insert into public.factures (id, numero, status, client_id, client_nom, total_ht, total_ttc) values ('a9a9a9a9-0000-4000-8000-000000000003', 'T9-FAC', 'brouillon', 'a9a9a9a9-0000-4000-8000-000000000001', 'Lot9 Client', 50, 50);
update public.factures set status = 'envoyee' where id = 'a9a9a9a9-0000-4000-8000-000000000003';
insert into public.paiements (facture_id, montant, moyen, reference) values ('a9a9a9a9-0000-4000-8000-000000000003', 50, 'virement', 'lot9-pay');
select pg_temp.verif('Événements', 'Facture envoyée puis payée (par le paiement) → 2 événements', 'facture_envoyee,facture_payee', pg_temp.ev('a9a9a9a9-0000-4000-8000-000000000003'));

insert into public.tickets (id, sujet, client_id, status) values ('a9a9a9a9-0000-4000-8000-000000000004', 'Lot9 Panne', 'a9a9a9a9-0000-4000-8000-000000000001', 'ouvert');
update public.tickets set status = 'en_cours' where id = 'a9a9a9a9-0000-4000-8000-000000000004';
update public.tickets set status = 'resolu' where id = 'a9a9a9a9-0000-4000-8000-000000000004';
select pg_temp.verif('Événements', 'Ticket : seul le passage à « résolu » crée un événement', 'ticket_resolu', pg_temp.ev('a9a9a9a9-0000-4000-8000-000000000004'));
select pg_temp.verif('Événements', 'Nouvel événement : en attente, 0 tentative', 'en_attente/0',
  (select statut || '/' || tentatives from public.evenements where objet_id = 'a9a9a9a9-0000-4000-8000-000000000004'));

-- ---------- Droits sur la file ----------
select pg_temp.essai('File', 'Équipe : lit la file', 'authenticated', :'C', $$select count(*) from public.evenements where objet_id = 'a9a9a9a9-0000-4000-8000-000000000004'$$, 'LIGNES=1');
select pg_temp.essai('File', 'Compte en attente : rien', 'authenticated', :'P', 'select count(*) from public.evenements', 'LIGNES=0');
select pg_temp.essai('File', 'Administrateur : ajouter un faux événement refusé', 'authenticated', :'A', $$insert into public.evenements (type, objet_type, objet_id) values ('client_cree','client','a9a9a9a9-0000-4000-8000-000000000001')$$, 'REFUSE');
select pg_temp.essai('File', 'Administrateur : marquer « traité » à la main refusé', 'authenticated', :'A', $$update public.evenements set statut = 'traite'$$, 'REFUSE');
update public.evenements set statut = 'erreur', tentatives = 5, erreur = 'lot9 panne' where objet_id = 'a9a9a9a9-0000-4000-8000-000000000004';
select pg_temp.essai('File', 'Collaborateur : réessayer un événement refusé', 'authenticated', :'C', $$select public.reessayer_evenement((select id from public.evenements where objet_id = 'a9a9a9a9-0000-4000-8000-000000000004'))$$, 'REFUSE');
select pg_temp.essai('File', 'Administrateur : réessayer un événement en erreur', 'authenticated', :'A', $$select public.reessayer_evenement((select id from public.evenements where objet_id = 'a9a9a9a9-0000-4000-8000-000000000004'))$$, 'LIGNES=1');
do $$ begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  perform public.reessayer_evenement((select id from public.evenements where objet_id = 'a9a9a9a9-0000-4000-8000-000000000004'));
end $$;
select pg_temp.verif('File', 'Après « réessayer » : en attente, compteur et erreur remis à zéro', 'en_attente/0/∅',
  (select statut || '/' || tentatives || '/' || coalesce(erreur, '∅') from public.evenements where objet_id = 'a9a9a9a9-0000-4000-8000-000000000004'));

-- ---------- Règles ----------
select pg_temp.essai('Règles', 'Équipe : lit les 4 règles', 'authenticated', :'C', $$select count(*) from public.automatisations where cle in ('relance_devis','rappel_facture','bienvenue','ticket_resolu')$$, 'LIGNES=4');
select pg_temp.verif('Règles', 'Par défaut : relances actives (5 j / 7 j), bienvenue et ticket désactivés', 'bienvenue:f:0|rappel_facture:t:7|relance_devis:t:5|ticket_resolu:f:0',
  (select string_agg(cle || ':' || actif::text::char(1) || ':' || delai_jours, '|' order by cle) from public.automatisations));
select pg_temp.essai('Règles', 'Collaborateur : modifier une règle sans effet', 'authenticated', :'C', $$update public.automatisations set actif = true where cle = 'bienvenue'$$, 'LIGNES=0');
select pg_temp.essai('Règles', 'Administrateur : active une règle et change le délai', 'authenticated', :'A', $$update public.automatisations set actif = true, delai_jours = 10 where cle = 'relance_devis'$$, 'LIGNES=1');
select pg_temp.essai('Règles', 'Délai hors limites (120 jours) refusé', 'authenticated', :'A', $$update public.automatisations set delai_jours = 120 where cle = 'relance_devis'$$, 'REFUSE');
select pg_temp.essai('Règles', 'Modèle inexistant refusé', 'authenticated', :'A', $$update public.automatisations set modele_cle = 'pas_de_modele' where cle = 'relance_devis'$$, 'REFUSE');
select pg_temp.essai('Règles', 'Administrateur : créer ou supprimer une règle refusé', 'authenticated', :'A', $$delete from public.automatisations where cle = 'bienvenue'$$, 'REFUSE');

-- ---------- Journal des exécutions ----------
insert into public.automatisation_runs (automatisation_cle, objet_type, objet_id, statut, detail) values ('bienvenue', 'client', 'a9a9a9a9-0000-4000-8000-000000000001', 'envoye', 'lot9 1');
select pg_temp.essai('Exécutions', 'Bienvenue envoyé deux fois au même client : refusé', 'service_role', null,
  $$insert into public.automatisation_runs (automatisation_cle, objet_type, objet_id, statut, detail) values ('bienvenue', 'client', 'a9a9a9a9-0000-4000-8000-000000000001', 'envoye', 'lot9 2')$$, 'REFUSE');
select pg_temp.essai('Exécutions', 'Administrateur : falsifier le journal refusé', 'authenticated', :'A', $$delete from public.automatisation_runs$$, 'REFUSE');

select pg_temp.nettoyer();
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
