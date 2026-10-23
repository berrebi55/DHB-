-- =====================================================================
--  DHB — Tests du LOT 18 : ticketing par email (messages, pièces jointes, réglages).
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 18 / 18 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function pg_temp.nettoyer() returns void language plpgsql as $f$
begin
  delete from public.activites where entite = 'tickets' and entite_id in (select id from public.tickets where sujet like 'lot18%');
  delete from public.evenements where type = 'email_recu' and objet_id = '18181818-1818-1818-1818-181818181818';
  delete from public.tickets where sujet like 'lot18%';
  update public.integrations set details = '{"adresses": {"infogerance": "", "particuliers": ""}}' where cle = 'email_entrant';
end $f$;
select pg_temp.nettoyer();

-- Données : un ticket, un message entrant, une pièce jointe (écrits comme le serveur).
insert into public.tickets (sujet, client_email, canal) values ('lot18 imprimante', 'client@lot18.test', 'email');
insert into public.ticket_messages (ticket_id, sens, de_email, de_nom, sujet, texte, resend_id)
  select id, 'entrant', 'client@lot18.test', 'Client Lot18', 'lot18 imprimante', 'Bonjour, l''imprimante ne marche plus.', 'resend-lot18-1'
  from public.tickets where sujet = 'lot18 imprimante';
insert into public.ticket_pieces (ticket_id, message_id, nom, type_mime, taille, chemin)
  select m.ticket_id, m.id, 'photo.png', 'image/png', 1234, 'tickets/lot18/photo.png' from public.ticket_messages m where m.resend_id = 'resend-lot18-1';

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
    case when attendu = 'REFUSE' then res like 'REFUSE%' else res = attendu end);
end $f$;
create or replace function pg_temp.verif(g text, sc text, attendu text, obtenu text) returns void language sql as $f$
  insert into resultats(groupe, scenario, attendu, obtenu, ok) values (g, sc, attendu, coalesce(obtenu, '∅'), attendu = coalesce(obtenu, '∅'));
$f$;
\set A '11111111-1111-1111-1111-111111111111'
\set C '22222222-2222-2222-2222-222222222222'
\set P '33333333-3333-3333-3333-333333333333'
update public.profiles set role='en_attente' where id=:'P';

-- Lecture
select pg_temp.essai('Messages', 'Équipe : lit la conversation', 'authenticated', :'C', $$select count(*) from public.ticket_messages where resend_id = 'resend-lot18-1'$$, 'LIGNES=1');
select pg_temp.essai('Messages', 'Équipe : lit les pièces jointes', 'authenticated', :'C', $$select count(*) from public.ticket_pieces where chemin = 'tickets/lot18/photo.png'$$, 'LIGNES=1');
select pg_temp.essai('Messages', 'Compte en attente : rien', 'authenticated', :'P', 'select count(*) from public.ticket_messages', 'LIGNES=0');
select pg_temp.essai('Messages', 'Anonyme : rien', 'anon', null, 'select count(*) from public.ticket_pieces', 'LIGNES=0');
-- Écriture : réservée au serveur (un message « entrant » ne peut pas être fabriqué)
select pg_temp.essai('Messages', 'Collaborateur : fabriquer un message entrant refusé', 'authenticated', :'C',
  $$insert into public.ticket_messages (ticket_id, sens, texte) select id, 'entrant', 'faux' from public.tickets where sujet = 'lot18 imprimante'$$, 'REFUSE');
select pg_temp.essai('Messages', 'Administrateur : modifier un message refusé', 'authenticated', :'A', $$update public.ticket_messages set texte = 'modifié'$$, 'REFUSE');
select pg_temp.essai('Messages', 'Administrateur : supprimer une pièce jointe refusé', 'authenticated', :'A', $$delete from public.ticket_pieces$$, 'REFUSE');
select pg_temp.essai('Messages', 'Anonyme : écrire refusé', 'anon', null, $$insert into public.ticket_messages (ticket_id, sens, texte) values (gen_random_uuid(), 'entrant', 'x')$$, 'REFUSE');
select pg_temp.essai('Messages', 'Serveur : écrit un message', 'service_role', null,
  $$insert into public.ticket_messages (ticket_id, sens, texte) select id, 'sortant', 'Réponse' from public.tickets where sujet = 'lot18 imprimante'$$, 'LIGNES=1');
-- Doublons et cohérence
select pg_temp.essai('Doublons', 'Même email Resend enregistré deux fois : refusé', 'service_role', null,
  $$insert into public.ticket_messages (ticket_id, sens, texte, resend_id) select id, 'entrant', 'x', 'resend-lot18-1' from public.tickets where sujet = 'lot18 imprimante'$$, 'REFUSE');
insert into public.evenements (type, objet_type, objet_id) values ('email_recu', 'email', '18181818-1818-1818-1818-181818181818');
select pg_temp.essai('Doublons', 'Même événement « email reçu » mis deux fois en file : refusé', 'service_role', null,
  $$insert into public.evenements (type, objet_type, objet_id) values ('email_recu', 'email', '18181818-1818-1818-1818-181818181818')$$, 'REFUSE');
select pg_temp.essai('Doublons', 'Canal inconnu refusé', 'service_role', null, $$update public.tickets set canal = 'pigeon' where sujet = 'lot18 imprimante'$$, 'REFUSE');
select pg_temp.verif('Tickets', 'Numéro attribué automatiquement', 'oui',
  (select case when numero is not null then 'oui' else 'non' end from public.tickets where sujet = 'lot18 imprimante'));
select pg_temp.verif('Journal', '« Email reçu de Client Lot18 (ticket #n) » + date du dernier message', '1/oui',
  (select count(*)::text from public.activites a join public.tickets t on t.id = a.entite_id
     where t.sujet = 'lot18 imprimante' and a.titre like 'Email reçu de Client Lot18 (ticket #%)')
  || '/' || (select case when dernier_message_le is not null then 'oui' else 'non' end from public.tickets where sujet = 'lot18 imprimante'));
-- Réglages : adresses de support
select pg_temp.essai('Réglages', 'Administrateur : adresses de support valides', 'authenticated', :'A',
  $$update public.integrations set details = '{"adresses": {"infogerance": "support@pro.exemple.fr", "particuliers": ""}}' where cle = 'email_entrant'$$, 'LIGNES=1');
select pg_temp.essai('Réglages', 'Adresse invalide refusée', 'authenticated', :'A',
  $$update public.integrations set details = '{"adresses": {"infogerance": "pas-une-adresse"}}' where cle = 'email_entrant'$$, 'REFUSE');
select pg_temp.essai('Réglages', 'Collaborateur : sans effet', 'authenticated', :'C',
  $$update public.integrations set details = '{"adresses": {"infogerance": "x@y.fr"}}' where cle = 'email_entrant'$$, 'LIGNES=0');
-- Suppression du ticket : conversation et pièces jointes supprimées avec lui
delete from public.tickets where sujet = 'lot18 imprimante';
select pg_temp.verif('Suppression', 'Ticket supprimé → messages et pièces jointes supprimés', '0/0',
  (select count(*)::text from public.ticket_messages where resend_id = 'resend-lot18-1') || '/' || (select count(*)::text from public.ticket_pieces where chemin = 'tickets/lot18/photo.png'));

select pg_temp.nettoyer();
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
