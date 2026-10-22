-- =====================================================================
--  DHB — Tests du LOT 7 : enregistrement des paiements Stripe
--  (stripe_traiter_evenement, appelée par la fonction stripe-webhook).
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 33 / 33 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- ---------- Préparation ----------
create or replace function pg_temp.nettoyer() returns void language plpgsql as $f$
begin
  set session_replication_role = replica;
  delete from public.paiements where reference like 'lot7_%';
  delete from public.factures where client_email ilike '%@test-lot7.fr' or client_nom like 'Lot7%';
  delete from public.abonnements where stripe_subscription_id like 'sub_lot7%';
  delete from public.clients where email ilike '%@test-lot7.fr';
  delete from public.stripe_evenements where id like 'evt_lot7%';
  set session_replication_role = origin;
end $f$;
select pg_temp.nettoyer();
insert into public.clients (id, nom, email, statut) values ('ffffffff-0000-4000-8000-000000000001', 'Lot7 Prospect', 'Prospect@Test-Lot7.fr', 'prospect');
insert into public.clients (id, nom, email, statut, archived_at) values ('ffffffff-0000-4000-8000-000000000002', 'Lot7 Archivé', 'archive@test-lot7.fr', 'client', now());

create temp table resultats(n serial, groupe text, scenario text, attendu text, obtenu text, ok boolean);
grant all on resultats to anon, authenticated, service_role; grant usage on sequence resultats_n_seq to anon, authenticated, service_role;
create or replace function pg_temp.verif(g text, sc text, attendu text, obtenu text) returns void language sql as $f$
  insert into resultats(groupe, scenario, attendu, obtenu, ok) values (g, sc, attendu, coalesce(obtenu, '∅'), coalesce(obtenu, '∅') = attendu);
$f$;
-- Appel de la fonction avec le rôle du serveur (comme stripe-webhook).
create or replace function pg_temp.stripe(id text, typ text, d jsonb) returns text language plpgsql as $f$
declare r text;
begin
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  r := public.stripe_traiter_evenement(id, 'test', typ, d);
  reset role;
  return r;
exception when others then
  reset role;
  return 'REFUSE: ' || left(sqlerrm, 80);
end $f$;
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

-- ---------- 1. Paiement ponctuel d'un nouveau client ----------
select pg_temp.verif('Ponctuel', 'Événement traité', 'traite', pg_temp.stripe('evt_lot7_1', 'paiement',
  '{"montant": 59, "reference": "lot7_pi_1", "email": "Nouveau@Test-Lot7.fr", "nom": "Lot7 Nouveau", "telephone": "0600000000",
    "adresse": "1 rue du Test", "code_postal": "93200", "ville": "Saint-Denis", "libelle": "Intervention ponctuelle", "date": "2026-10-22"}'));
select pg_temp.verif('Ponctuel', 'Client créé (particulier, statut client, email en minuscules)', 'particulier/client/nouveau@test-lot7.fr/particuliers',
  (select type || '/' || statut || '/' || email || '/' || entity from public.clients where email = 'nouveau@test-lot7.fr'));
select pg_temp.verif('Ponctuel', 'Facture créée, numérotée et PAYÉE (franchise de TVA)', 'payee/59.00/0/1',
  (select status || '/' || to_char(total_ttc, 'FM9990.00') || '/' || tva_taux || '/' || (numero ~ '^\d{4}-\d{4}$')::int from public.factures where client_email = 'nouveau@test-lot7.fr'));
select pg_temp.verif('Ponctuel', 'Paiement Stripe rattaché, date du paiement', 'stripe/59/2026-10-22',
  (select moyen || '/' || montant::int || '/' || date_paiement from public.paiements where reference = 'lot7_pi_1'));
select pg_temp.verif('Ponctuel', 'Libellé et adresse repris de Stripe', 'Intervention ponctuelle|1 rue du Test, 93200 Saint-Denis',
  (select libelle || '|' || client_adresse from public.factures where client_email = 'nouveau@test-lot7.fr'));
select pg_temp.verif('Ponctuel', 'Journal : facture et paiement tracés', '2',
  (select count(distinct entite)::text from public.activites a join public.factures f on a.client_id = f.client_id
   where f.client_email = 'nouveau@test-lot7.fr' and a.entite in ('factures','paiements')));

-- ---------- 2. Anti-doublon ----------
select pg_temp.verif('Doublons', 'Même événement renvoyé par Stripe', 'deja_traite', pg_temp.stripe('evt_lot7_1', 'paiement', '{"montant": 59, "reference": "lot7_pi_1"}'));
select pg_temp.verif('Doublons', 'Autre événement, même paiement', 'deja_traite', pg_temp.stripe('evt_lot7_1b', 'paiement', '{"montant": 59, "reference": "lot7_pi_1", "email": "nouveau@test-lot7.fr"}'));
select pg_temp.verif('Doublons', 'Toujours 1 facture, 1 paiement, 1 client', '1/1/1',
  (select (select count(*) from public.factures where client_email = 'nouveau@test-lot7.fr') || '/' ||
          (select count(*) from public.paiements where reference = 'lot7_pi_1') || '/' ||
          (select count(*) from public.clients where email = 'nouveau@test-lot7.fr')));

-- ---------- 3. Client existant ----------
select pg_temp.verif('Client existant', 'Retrouvé par email (majuscules ignorées)', 'traite', pg_temp.stripe('evt_lot7_2', 'paiement',
  '{"montant": 89.9, "reference": "lot7_pi_2", "email": "prospect@test-lot7.fr", "libelle": "Intervention"}'));
select pg_temp.verif('Client existant', 'Pas de doublon de fiche, prospect devenu client', '1/client',
  (select count(*) || '/' || max(statut) from public.clients where lower(email) = 'prospect@test-lot7.fr'));
select pg_temp.verif('Client existant', 'Fiche archivée non réutilisée (nouvelle fiche)', 'traite', pg_temp.stripe('evt_lot7_3', 'paiement',
  '{"montant": 10, "reference": "lot7_pi_3", "email": "archive@test-lot7.fr"}'));
select pg_temp.verif('Client existant', 'Fiche archivée intacte', '1', (select count(*)::text from public.clients where email = 'archive@test-lot7.fr' and archived_at is null));

-- ---------- 4. Abonnement ----------
select pg_temp.verif('Abonnement', 'Premier paiement d''abonnement', 'traite', pg_temp.stripe('evt_lot7_4', 'paiement',
  '{"montant": 14.9, "reference": "lot7_in_1", "email": "abonne@test-lot7.fr", "nom": "Lot7 Abonné", "libelle": "Abonnement sérénité",
    "subscription_id": "sub_lot7_A", "customer_id": "cus_lot7", "intervalle_mois": 1, "date": "2026-10-05"}'));
select pg_temp.verif('Abonnement', 'Abonnement créé actif, montant, jour, géré par Stripe', 'actif/14.90/5/cus_lot7',
  (select statut || '/' || to_char(montant_mensuel, 'FM990.00') || '/' || jour_facturation || '/' || stripe_customer_id from public.abonnements where stripe_subscription_id = 'sub_lot7_A'));
select pg_temp.verif('Abonnement', 'Facture rattachée à l''abonnement', '1',
  (select count(*)::text from public.factures f join public.abonnements a on a.id = f.abonnement_id where a.stripe_subscription_id = 'sub_lot7_A'));
select pg_temp.verif('Abonnement', 'Renouvellement mensuel (sans email)', 'traite', pg_temp.stripe('evt_lot7_5', 'paiement',
  '{"montant": 14.9, "reference": "lot7_in_2", "subscription_id": "sub_lot7_A", "libelle": "Abonnement sérénité", "date": "2026-11-05"}'));
select pg_temp.verif('Abonnement', 'Renouvellement : même client, 2 factures payées, dernière facture le 05/11', '1/2/2026-11-05',
  (select count(distinct f.client_id) || '/' || count(*) filter (where f.status = 'payee') || '/' || max(a.derniere_facture_le)
   from public.factures f join public.abonnements a on a.id = f.abonnement_id where a.stripe_subscription_id = 'sub_lot7_A'));
select pg_temp.verif('Abonnement', 'Abonnement annuel (120 €/an)', 'traite', pg_temp.stripe('evt_lot7_6', 'paiement',
  '{"montant": 120, "reference": "lot7_in_3", "email": "annuel@test-lot7.fr", "subscription_id": "sub_lot7_B", "intervalle_mois": 12}'));
select pg_temp.verif('Abonnement', 'Abonnement annuel : montant ramené au mois', '10.00',
  (select to_char(montant_mensuel, 'FM990.00') from public.abonnements where stripe_subscription_id = 'sub_lot7_B'));
select pg_temp.verif('Abonnement', 'Résiliation', 'traite', pg_temp.stripe('evt_lot7_7', 'abonnement_statut', '{"subscription_id": "sub_lot7_A", "statut": "resilie"}'));
select pg_temp.verif('Abonnement', 'Statut résilié enregistré', 'resilie', (select statut from public.abonnements where stripe_subscription_id = 'sub_lot7_A'));
select pg_temp.verif('Abonnement', 'Abonnement inconnu : ignoré', 'ignore', pg_temp.stripe('evt_lot7_8', 'abonnement_statut', '{"subscription_id": "sub_inconnu", "statut": "resilie"}'));

-- ---------- 5. Cas ignorés et erreurs ----------
select pg_temp.verif('Contrôles', 'Montant nul : ignoré', 'ignore', pg_temp.stripe('evt_lot7_9', 'paiement', '{"montant": 0, "reference": "lot7_pi_0"}'));
select pg_temp.verif('Contrôles', 'Événement non utilisé : journalisé « ignoré »', 'ignore', (select pg_temp.stripe('evt_lot7_10', 'ignore', '{"raison": "Type charge.refunded non utilisé"}')));
select pg_temp.verif('Contrôles', 'Identifiant d''événement invalide : refusé', 'REFUSE', left(pg_temp.stripe('pas_un_evt', 'paiement', '{"montant": 5, "reference": "lot7_x"}'), 6));
select pg_temp.verif('Contrôles', 'Erreur en cours de traitement : RIEN n''est enregistré (transaction annulée)', 'REFUSE/0/0/0',
  left(pg_temp.stripe('evt_lot7_11', 'paiement', '{"montant": 30, "reference": "lot7_pi_err", "email": "erreur@test-lot7.fr", "date": "2026-13-45"}'), 6)
  || '/' || (select count(*) from public.clients where email = 'erreur@test-lot7.fr')
  || '/' || (select count(*) from public.paiements where reference = 'lot7_pi_err')
  || '/' || (select count(*) from public.stripe_evenements where id = 'evt_lot7_11'));
select pg_temp.verif('Contrôles', 'Numéros de facture consécutifs', 'true',
  (select (max(substr(numero, 6)::int) - min(substr(numero, 6)::int) + 1 = count(*))::text from public.factures
   where client_email like '%@test-lot7.fr' or abonnement_id in (select id from public.abonnements where stripe_subscription_id like 'sub_lot7%')));

-- ---------- 6. Droits ----------
select pg_temp.essai('Droits', 'Administrateur : appel direct de la fonction refusé', 'authenticated', :'A', $$select public.stripe_traiter_evenement('evt_lot7_x', 't', 'paiement', '{"montant": 1, "reference": "lot7_y"}')$$, 'REFUSE');
select pg_temp.essai('Droits', 'Anonyme : appel direct refusé', 'anon', null, $$select public.stripe_traiter_evenement('evt_lot7_x', 't', 'paiement', '{"montant": 1, "reference": "lot7_y"}')$$, 'REFUSE');
select pg_temp.essai('Droits', 'Équipe : lit le journal Stripe', 'authenticated', :'C', $$select count(*) from public.stripe_evenements where id like 'evt_lot7%'$$, 'LIGNES>0');
select pg_temp.essai('Droits', 'Compte en attente : journal Stripe invisible', 'authenticated', :'P', 'select count(*) from public.stripe_evenements', 'LIGNES=0');
select pg_temp.essai('Droits', 'Administrateur : ne peut pas falsifier le journal Stripe', 'authenticated', :'A', $$update public.stripe_evenements set statut = 'traite'$$, 'REFUSE');

select pg_temp.nettoyer();
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
