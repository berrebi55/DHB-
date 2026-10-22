-- =====================================================================
--  DHB — Tests du LOT 11 : Google Drive (réglages, colonnes serveur,
--  événements des documents, archive des factures).
--  ⚠️  BASE DE TEST UNIQUEMENT (mêmes prérequis que lot1-securite.sql,
--  qui doit avoir été exécuté au moins une fois : comptes de test).
--  Résultat attendu : « 14 / 14 scénarios conformes ».
-- =====================================================================
\set ON_ERROR_STOP 1
set client_min_messages = warning;

create or replace function pg_temp.nettoyer() returns void language plpgsql as $f$
begin
  set session_replication_role = replica;
  delete from public.evenements where objet_id in (select id from public.documents where chemin like 'test-lot11/%') or objet_id in (select id from public.clients where nom like 'Lot11%');
  delete from public.documents where chemin like 'test-lot11/%';
  delete from public.factures where numero like 'T11-%';
  delete from public.clients where nom like 'Lot11%';
  update public.integrations set details = '{"actif": false, "sous_dossiers": ["01 - Devis", "02 - Factures", "03 - Contrats et abonnements", "04 - Parc informatique", "05 - Interventions", "06 - Échanges", "07 - Documents du client", "08 - Divers"]}' where cle = 'drive';
  set session_replication_role = origin;
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

-- ---------- Réglages Drive ----------
select pg_temp.verif('Réglages', '8 sous-dossiers proposés par défaut, Drive désactivé', '8/false',
  (select jsonb_array_length(details->'sous_dossiers') || '/' || (details->>'actif') from public.integrations where cle = 'drive'));
select pg_temp.essai('Réglages', 'Administrateur : active Drive et renomme les sous-dossiers', 'authenticated', :'A',
  $$update public.integrations set details = '{"actif": true, "sous_dossiers": ["Devis", "Factures", "Contrats"]}' where cle = 'drive'$$, 'LIGNES=1');
select pg_temp.essai('Réglages', 'Plus de 8 sous-dossiers refusé', 'authenticated', :'A',
  $$update public.integrations set details = '{"sous_dossiers": ["1","2","3","4","5","6","7","8","9"]}' where cle = 'drive'$$, 'REFUSE');
select pg_temp.essai('Réglages', 'Nom avec « / » refusé', 'authenticated', :'A',
  $$update public.integrations set details = '{"sous_dossiers": ["Devis", "Factures/2026"]}' where cle = 'drive'$$, 'REFUSE');
select pg_temp.essai('Réglages', 'Collaborateur : sans effet', 'authenticated', :'C', $$update public.integrations set details = '{"actif": true, "sous_dossiers": ["A","B"]}' where cle = 'drive'$$, 'LIGNES=0');

-- ---------- Colonnes Drive des clients : serveur uniquement ----------
do $$ begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  insert into public.clients (id, nom, drive_folder_url, drive_sync_statut) values ('b11b11b1-0000-4000-8000-000000000001', 'Lot11 Client', 'https://pirate.example/', 'a_jour');
  update public.clients set drive_folder_url = 'https://pirate.example/2', nom = 'Lot11 Client modifié' where id = 'b11b11b1-0000-4000-8000-000000000001';
end $$;
select pg_temp.verif('Clients', 'Collaborateur : création / modification normales, lien Drive ignoré', 'Lot11 Client modifié/∅/∅',
  (select nom || '/' || coalesce(drive_folder_url, '∅') || '/' || coalesce(drive_sync_statut, '∅') from public.clients where id = 'b11b11b1-0000-4000-8000-000000000001'));
select pg_temp.essai('Clients', 'Serveur : enregistre le dossier Drive', 'service_role', null,
  $$update public.clients set drive_folder_id = 'fold1', drive_folder_url = 'https://drive.google.com/drive/folders/fold1', drive_sync_statut = 'a_jour' where id = 'b11b11b1-0000-4000-8000-000000000001'$$, 'LIGNES=1');

-- ---------- Documents : événements et archive des factures ----------
insert into public.factures (id, numero, status, client_nom, total_ht, total_ttc) values ('b11b11b1-0000-4000-8000-0000000000f1', 'T11-FAC', 'envoyee', 'Lot11', 10, 10);
insert into public.documents (id, type, facture_id, client_id, numero, nom_fichier, chemin, empreinte_sha256) values
  ('b11b11b1-0000-4000-8000-0000000000a1', 'facture', 'b11b11b1-0000-4000-8000-0000000000f1', 'b11b11b1-0000-4000-8000-000000000001', 'T11-FAC', 'Facture-T11-FAC.pdf', 'test-lot11/f.pdf', 'aaa'),
  ('b11b11b1-0000-4000-8000-0000000000a2', 'devis', null, 'b11b11b1-0000-4000-8000-000000000001', 'T11-DEV', 'Devis-T11-DEV.pdf', 'test-lot11/d.pdf', 'bbb');
select pg_temp.verif('Événements', 'Nouveau document → document_cree (2)', '2',
  (select count(*)::text from public.evenements where type = 'document_cree' and objet_id in ('b11b11b1-0000-4000-8000-0000000000a1','b11b11b1-0000-4000-8000-0000000000a2')));
update public.documents set empreinte_sha256 = 'ccc', taille_octets = 12 where id = 'b11b11b1-0000-4000-8000-0000000000a2';
select pg_temp.verif('Événements', 'Nouvelle version du PDF d''un devis → document_maj', '1',
  (select count(*)::text from public.evenements where type = 'document_maj' and objet_id = 'b11b11b1-0000-4000-8000-0000000000a2'));
select pg_temp.essai('Archive', 'Serveur : note la copie Drive d''une facture archivée', 'service_role', null,
  $$update public.documents set drive_file_id = 'file1', drive_copie_le = now() where id = 'b11b11b1-0000-4000-8000-0000000000a1'$$, 'LIGNES=1');
update public.documents set drive_file_id = 'file2' where id = 'b11b11b1-0000-4000-8000-0000000000a2';
select pg_temp.verif('Événements', 'Simple note de copie Drive : aucun nouvel événement', '0',
  (select count(*)::text from public.evenements where type = 'document_maj' and objet_id = 'b11b11b1-0000-4000-8000-0000000000a1'));
select pg_temp.essai('Archive', 'Serveur : modifier le contenu de l''archive d''une facture toujours refusé', 'service_role', null,
  $$update public.documents set chemin = 'test-lot11/autre.pdf', drive_file_id = 'file3' where id = 'b11b11b1-0000-4000-8000-0000000000a1'$$, 'REFUSE');
select pg_temp.essai('Archive', 'Serveur : supprimer l''archive toujours refusé', 'service_role', null,
  $$delete from public.documents where id = 'b11b11b1-0000-4000-8000-0000000000a1'$$, 'REFUSE');
select pg_temp.essai('Archive', 'Collaborateur : écrire dans documents toujours refusé', 'authenticated', :'C',
  $$update public.documents set drive_file_id = 'x'$$, 'REFUSE');

select pg_temp.nettoyer();
select groupe, scenario, attendu, obtenu, case when ok then 'OK' else 'ÉCHEC' end as verdict from resultats order by n;
select count(*) filter (where ok) || ' / ' || count(*) || ' scénarios conformes' as bilan from resultats;
