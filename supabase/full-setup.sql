-- =====================================================================
--  DHB — INSTALLATION COMPLÈTE DE LA BASE (à exécuter en une fois)
--  Supabase → SQL Editor → New query → coller TOUT → Run.
--  Idempotent : peut être relancé sans danger.
--  Contient : leads, settings (prix), tickets, factures, CRM (clients, devis,
--  abonnements, prestations), rôles, signature de devis, paiements, notes,
--  journal d'activité, informations société. Testé : relançable à volonté.
-- =====================================================================

-- ---------- 1) LEADS (demandes de devis / questions) ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity text not null default 'infogerance',
  type text not null default 'devis' check (type in ('devis','question')),
  nom text, entreprise text, email text, telephone text, message text,
  service text, source_url text,
  status text not null default 'nouveau'
    check (status in ('nouveau','contacte','devis_envoye','gagne','perdu','archive')),
  is_read boolean not null default false,
  notes text,
  relance_at date,
  updated_at timestamptz not null default now()
);
alter table public.leads add column if not exists entity text not null default 'infogerance';
alter table public.leads add column if not exists relance_at date;
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_entity_idx on public.leads (entity);
create index if not exists leads_relance_idx on public.leads (relance_at);

-- ---------- 2) SETTINGS (prix éditables, par filiale) ----------
create table if not exists public.settings (
  entity text not null,
  skey text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (entity, skey)
);
insert into public.settings (entity, skey, value) values
  ('particuliers','abonnement_prix','14,90'),
  ('particuliers','intervention_prix','59')
on conflict (entity, skey) do nothing;

-- ---------- 3) TICKETS (support) ----------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity text not null default 'infogerance',
  client_nom text, client_email text,
  sujet text, description text,
  priorite text not null default 'normale' check (priorite in ('basse','normale','haute','urgente')),
  status text not null default 'ouvert' check (status in ('ouvert','en_cours','resolu','ferme')),
  updated_at timestamptz not null default now()
);
create index if not exists tickets_created_idx on public.tickets (created_at desc);

-- ---------- 4) FACTURES ----------
create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity text not null default 'infogerance',
  numero text,
  date_facture date not null default current_date,
  client_nom text, client_email text, client_adresse text,
  libelle text, quantite numeric not null default 1, prix_unitaire numeric not null default 0,
  tva_taux numeric not null default 0,
  total_ht numeric not null default 0, total_ttc numeric not null default 0,
  status text not null default 'brouillon' check (status in ('brouillon','envoyee','payee','annulee')),
  notes text,
  updated_at timestamptz not null default now()
);
create index if not exists factures_created_idx on public.factures (created_at desc);

-- Numérotation continue des factures (par année), côté serveur = fiable.
create table if not exists public.facture_compteurs (
  annee int primary key,
  dernier int not null default 0
);
create or replace function public.next_facture_numero()
returns text language plpgsql as $$
declare y int := extract(year from now())::int; n int;
begin
  -- Équipe et fonctions serveur uniquement : un compte « en_attente » ne
  -- consomme jamais de numéro (fonction non appelable par les anonymes : section 14).
  if coalesce(auth.jwt()->>'role','') = 'authenticated' and not public.is_staff() then
    raise exception 'Accès réservé à l''équipe.' using errcode = '42501';
  end if;
  insert into public.facture_compteurs(annee, dernier) values (y, 1)
    on conflict (annee) do update set dernier = public.facture_compteurs.dernier + 1
    returning dernier into n;
  return y::text || '-' || lpad(n::text, 4, '0');
end; $$;

-- ---------- 5) Mise à jour auto de updated_at (toutes les tables) ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
do $$ begin
  perform 1;
end $$;
drop trigger if exists trg_leads_touch on public.leads;
create trigger trg_leads_touch before update on public.leads for each row execute function public.touch_updated_at();
drop trigger if exists trg_settings_touch on public.settings;
create trigger trg_settings_touch before update on public.settings for each row execute function public.touch_updated_at();
drop trigger if exists trg_tickets_touch on public.tickets;
create trigger trg_tickets_touch before update on public.tickets for each row execute function public.touch_updated_at();
drop trigger if exists trg_factures_touch on public.factures;
create trigger trg_factures_touch before update on public.factures for each row execute function public.touch_updated_at();

-- ---------- 6) SÉCURITÉ (RLS) ----------
alter table public.leads enable row level security;
alter table public.settings enable row level security;
alter table public.tickets enable row level security;
alter table public.factures enable row level security;

-- leads : public peut créer ; admin lit/modifie/supprime
drop policy if exists "leads public insert" on public.leads;
create policy "leads public insert" on public.leads for insert to anon, authenticated with check (true);
drop policy if exists "leads auth read" on public.leads;
create policy "leads auth read" on public.leads for select to authenticated using (true);
drop policy if exists "leads auth update" on public.leads;
create policy "leads auth update" on public.leads for update to authenticated using (true) with check (true);
drop policy if exists "leads auth delete" on public.leads;
create policy "leads auth delete" on public.leads for delete to authenticated using (true);

-- settings : lecture publique (prix affichés), écriture admin
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings for select to anon, authenticated using (true);
drop policy if exists "settings auth write" on public.settings;
create policy "settings auth write" on public.settings for all to authenticated using (true) with check (true);

-- tickets & factures : réservés à l'admin connecté
drop policy if exists "tickets auth all" on public.tickets;
create policy "tickets auth all" on public.tickets for all to authenticated using (true) with check (true);
drop policy if exists "factures auth all" on public.factures;
create policy "factures auth all" on public.factures for all to authenticated using (true) with check (true);

-- ---------- 7) Temps réel (si pas déjà actif) ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='leads') then
    execute 'alter publication supabase_realtime add table public.leads';
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tickets') then
    execute 'alter publication supabase_realtime add table public.tickets';
  end if;
end $$;

-- =====================================================================
--  ⚠️ FACTURATION : ce module est fonctionnel, mais la conformité légale
--  (mentions obligatoires, continuité de numérotation, règles anti-fraude
--  TVA en France) reste à valider avec votre comptable avant tout usage réel.
-- =====================================================================

-- =====================================================================
--  MODULE CRM (clients, devis, abonnements, prestations) — additif
-- =====================================================================

-- CLIENTS (fiche centrale)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity text not null default 'infogerance',
  type text not null default 'entreprise' check (type in ('entreprise','particulier')),
  nom text, entreprise text, email text, telephone text, adresse text,
  statut text not null default 'prospect' check (statut in ('prospect','client','inactif')),
  notes text,
  updated_at timestamptz not null default now()
);
create index if not exists clients_created_idx on public.clients (created_at desc);

-- Liens optionnels vers un client
alter table public.leads    add column if not exists client_id uuid;
alter table public.tickets  add column if not exists client_id uuid;
alter table public.factures add column if not exists client_id uuid;
alter table public.factures add column if not exists lignes jsonb;

-- DEVIS (multi-lignes)
create table if not exists public.devis (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity text not null default 'infogerance',
  numero text,
  client_id uuid references public.clients(id) on delete set null,
  client_nom text, client_email text, client_adresse text,
  date_devis date not null default current_date,
  validite_jours int not null default 30,
  lignes jsonb not null default '[]',
  tva_taux numeric not null default 0,
  total_ht numeric not null default 0, total_ttc numeric not null default 0,
  statut text not null default 'brouillon' check (statut in ('brouillon','envoye','accepte','refuse','expire')),
  notes text,
  updated_at timestamptz not null default now()
);
create index if not exists devis_created_idx on public.devis (created_at desc);

-- ABONNEMENTS / contrats récurrents
create table if not exists public.abonnements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entity text not null default 'infogerance',
  client_id uuid references public.clients(id) on delete set null,
  client_nom text,
  libelle text,
  montant_mensuel numeric not null default 0,
  date_debut date not null default current_date,
  date_renouvellement date,
  statut text not null default 'actif' check (statut in ('actif','suspendu','resilie')),
  notes text,
  updated_at timestamptz not null default now()
);
create index if not exists abos_created_idx on public.abonnements (created_at desc);

-- PRESTATIONS (modèles de lignes réutilisables)
create table if not exists public.prestations (
  id uuid primary key default gen_random_uuid(),
  entity text not null default 'infogerance',
  libelle text, prix_unitaire numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Numérotation des devis (continue, par année)
create table if not exists public.devis_compteurs (annee int primary key, dernier int not null default 0);
create or replace function public.next_devis_numero()
returns text language plpgsql as $$
declare y int := extract(year from now())::int; n int;
begin
  -- Équipe et fonctions serveur uniquement : un compte « en_attente » ne
  -- consomme jamais de numéro (fonction non appelable par les anonymes : section 14).
  if coalesce(auth.jwt()->>'role','') = 'authenticated' and not public.is_staff() then
    raise exception 'Accès réservé à l''équipe.' using errcode = '42501';
  end if;
  insert into public.devis_compteurs(annee, dernier) values (y, 1)
    on conflict (annee) do update set dernier = public.devis_compteurs.dernier + 1
    returning dernier into n;
  return 'DEV-' || y::text || '-' || lpad(n::text, 4, '0');
end; $$;

-- updated_at
drop trigger if exists trg_clients_touch on public.clients;
create trigger trg_clients_touch before update on public.clients for each row execute function public.touch_updated_at();
drop trigger if exists trg_devis_touch on public.devis;
create trigger trg_devis_touch before update on public.devis for each row execute function public.touch_updated_at();
drop trigger if exists trg_abos_touch on public.abonnements;
create trigger trg_abos_touch before update on public.abonnements for each row execute function public.touch_updated_at();

-- RLS (admin uniquement)
alter table public.clients enable row level security;
alter table public.devis enable row level security;
alter table public.abonnements enable row level security;
alter table public.prestations enable row level security;
drop policy if exists "clients auth all" on public.clients;
create policy "clients auth all" on public.clients for all to authenticated using (true) with check (true);
drop policy if exists "devis auth all" on public.devis;
create policy "devis auth all" on public.devis for all to authenticated using (true) with check (true);
drop policy if exists "abos auth all" on public.abonnements;
create policy "abos auth all" on public.abonnements for all to authenticated using (true) with check (true);
drop policy if exists "prestations auth all" on public.prestations;
create policy "prestations auth all" on public.prestations for all to authenticated using (true) with check (true);

-- =====================================================================
--  MODULE AVANCÉ : rôles multi-utilisateur, signature devis en ligne,
--  facturation récurrente — additif (idempotent).
-- =====================================================================

-- ---------- 1) PROFILS & RÔLES (multi-utilisateur) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'en_attente' check (role in ('admin','collaborateur','en_attente')),
  created_at timestamptz not null default now()
);

-- À la création d'un compte : 1er inscrit = admin, les suivants = collaborateur.
-- Tout nouveau compte est « en_attente » : aucun accès au CRM tant qu'un
-- administrateur ne l'a pas invité ou validé (Edge Function invite-user,
-- ou page Système → Utilisateurs). L'ancienne règle « premier compte = admin »
-- est supprimée : le premier administrateur se désigne depuis le SQL Editor
-- avec public.definir_admin('email') (voir section 15).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
    values (new.id, new.email, 'en_attente')
    on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rattrapage : crée un profil « en_attente » (jamais admin) pour les comptes
-- existants sans profil. Les profils existants ne sont pas modifiés.
insert into public.profiles (id, email, role)
  select u.id, u.email, 'en_attente' from auth.users u
  where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Helper : l'utilisateur courant est-il admin ?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Helper : l'utilisateur courant fait-il partie de l'équipe (admin ou collaborateur) ?
-- C'est la condition d'accès à toutes les données internes du CRM.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','collaborateur'));
$$;

alter table public.profiles enable row level security;
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles admin write" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 2) SIGNATURE DEVIS EN LIGNE ----------
alter table public.devis add column if not exists public_token uuid not null default gen_random_uuid();
alter table public.devis add column if not exists signed_at timestamptz;
alter table public.devis add column if not exists signature_nom text;
alter table public.devis add column if not exists signature_ip text;
create unique index if not exists devis_public_token_idx on public.devis (public_token);
-- La lecture/signature publique passe par des Edge Functions (service role),
-- donc AUCUNE policy anon sur la table : les devis restent privés.

-- ---------- 3) FACTURATION RÉCURRENTE (suivi) ----------
alter table public.abonnements add column if not exists jour_facturation int;
alter table public.abonnements add column if not exists derniere_facture_le date;
-- Par défaut, facturer le jour du mois de la date de début.
update public.abonnements
  set jour_facturation = extract(day from date_debut)::int
  where jour_facturation is null and date_debut is not null;

-- Restreindre les paramètres (prix) aux admins : les collaborateurs ne touchent pas aux tarifs.
drop policy if exists "settings auth write" on public.settings;
drop policy if exists "settings admin write" on public.settings;
create policy "settings admin write" on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 4) RELANCES AUTO (anti-spam : 1 relance / 7 j max) ----------
alter table public.devis    add column if not exists derniere_relance_le date;
alter table public.factures add column if not exists derniere_relance_le date;

-- =====================================================================
--  REFONTE v2 — back-office professionnel (additif, idempotent)
--  Statuts de leads étendus, priorités, échéances, paiements, notes,
--  journal d'activité alimenté par la base, vues d'agrégats, informations
--  société, et suppression réservée aux admins au niveau de la base.
-- =====================================================================

-- ---------- 1) LEADS : statuts étendus, priorité, type de client ----------
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('nouveau','a_contacter','contacte','devis_a_preparer','devis_envoye','gagne','perdu','archive'));
alter table public.leads add column if not exists priorite text not null default 'normale';
alter table public.leads add column if not exists type_client text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_priorite_check') then
    alter table public.leads add constraint leads_priorite_check check (priorite in ('basse','normale','haute','urgente'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'leads_type_client_check') then
    alter table public.leads add constraint leads_type_client_check check (type_client is null or type_client in ('entreprise','particulier'));
  end if;
end $$;

-- Type de client déduit du site d'origine (et du champ « Vous êtes » du site Groupe).
create or replace function public.leads_set_type_client()
returns trigger language plpgsql as $$
begin
  if new.type_client is null then
    new.type_client := case
      when new.entity = 'particuliers' then 'particulier'
      when new.entity = 'infogerance' then 'entreprise'
      when new.entreprise ilike '%particulier%' then 'particulier'
      when new.entreprise ilike '%entreprise%' then 'entreprise'
      else null end;
  end if;
  return new;
end; $$;
drop trigger if exists trg_leads_type_client on public.leads;
create trigger trg_leads_type_client before insert on public.leads
  for each row execute function public.leads_set_type_client();
update public.leads set type_client = case
    when entity = 'particuliers' then 'particulier'
    when entity = 'infogerance' then 'entreprise'
    when entreprise ilike '%particulier%' then 'particulier'
    when entreprise ilike '%entreprise%' then 'entreprise' end
  where type_client is null;

-- ---------- 2) CLIENTS : localisation, archivage, origine ----------
alter table public.clients add column if not exists ville text;
alter table public.clients add column if not exists code_postal text;
alter table public.clients add column if not exists siret text;
alter table public.clients add column if not exists archived_at timestamptz;
alter table public.clients add column if not exists lead_id uuid;

-- Liens client (NOT VALID : n'échoue pas sur d'anciennes lignes orphelines).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_client_fk') then
    alter table public.leads add constraint leads_client_fk foreign key (client_id) references public.clients(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'tickets_client_fk') then
    alter table public.tickets add constraint tickets_client_fk foreign key (client_id) references public.clients(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'factures_client_fk') then
    alter table public.factures add constraint factures_client_fk foreign key (client_id) references public.clients(id) on delete set null not valid;
  end if;
end $$;

-- ---------- 3) DEVIS ----------
alter table public.devis add column if not exists conditions text;
alter table public.devis add column if not exists envoye_at timestamptz;
alter table public.devis add column if not exists lead_id uuid;

-- ---------- 4) FACTURES : échéance, paiement, origine ----------
alter table public.factures add column if not exists date_echeance date;
alter table public.factures add column if not exists paid_at timestamptz;
alter table public.factures add column if not exists devis_id uuid;
alter table public.factures add column if not exists abonnement_id uuid;
alter table public.factures add column if not exists conditions text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'factures_devis_fk') then
    alter table public.factures add constraint factures_devis_fk foreign key (devis_id) references public.devis(id) on delete set null not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'factures_abonnement_fk') then
    alter table public.factures add constraint factures_abonnement_fk foreign key (abonnement_id) references public.abonnements(id) on delete set null not valid;
  end if;
end $$;
-- Date de paiement renseignée automatiquement quand une facture passe à « payée ».
create or replace function public.factures_set_paid_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'payee' and new.paid_at is null then new.paid_at := now(); end if;
  if new.status <> 'payee' then new.paid_at := null; end if;
  return new;
end; $$;
drop trigger if exists trg_factures_paid_at on public.factures;
create trigger trg_factures_paid_at before insert or update of status on public.factures
  for each row execute function public.factures_set_paid_at();

-- ---------- 5) PAIEMENTS ----------
create table if not exists public.paiements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  facture_id uuid not null references public.factures(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  montant numeric not null check (montant > 0),
  date_paiement date not null default current_date,
  moyen text not null default 'virement'
    check (moyen in ('virement','carte','especes','cheque','prelevement','stripe','autre')),
  reference text,
  notes text,
  created_by uuid default auth.uid()
);
create index if not exists paiements_facture_idx on public.paiements (facture_id);
create index if not exists paiements_date_idx on public.paiements (date_paiement desc);

-- Quand les paiements couvrent le total, la facture passe automatiquement à « payée ».
create or replace function public.paiements_solder_facture()
returns trigger language plpgsql as $$
declare fid uuid; total numeric; paye numeric; derniere date;
begin
  fid := coalesce(new.facture_id, old.facture_id);
  select total_ttc into total from public.factures where id = fid;
  select coalesce(sum(montant), 0), max(date_paiement) into paye, derniere from public.paiements where facture_id = fid;
  if total is null then return null; end if;
  if paye >= total then
    update public.factures set status = 'payee', paid_at = derniere::timestamptz
      where id = fid and status <> 'payee';
  else
    -- Paiement supprimé : la facture redevient « envoyée » si elle n'est plus soldée.
    update public.factures set status = 'envoyee'
      where id = fid and status = 'payee' and tg_op = 'DELETE';
  end if;
  return null;
end; $$;
drop trigger if exists trg_paiements_solder on public.paiements;
create trigger trg_paiements_solder after insert or delete on public.paiements
  for each row execute function public.paiements_solder_facture();

-- ---------- 6) TICKETS : responsable, dates de résolution ----------
alter table public.tickets add column if not exists responsable_id uuid;
alter table public.tickets add column if not exists resolved_at timestamptz;
alter table public.tickets add column if not exists closed_at timestamptz;
create or replace function public.tickets_set_dates()
returns trigger language plpgsql as $$
begin
  if new.status = 'resolu' and new.resolved_at is null then new.resolved_at := now(); end if;
  if new.status = 'ferme' and new.closed_at is null then new.closed_at := now(); end if;
  if new.status in ('ouvert','en_cours') then new.resolved_at := null; new.closed_at := null; end if;
  return new;
end; $$;
drop trigger if exists trg_tickets_dates on public.tickets;
create trigger trg_tickets_dates before insert or update of status on public.tickets
  for each row execute function public.tickets_set_dates();

-- ---------- 7) PRESTATIONS (catalogue) & PROFILS ----------
alter table public.prestations add column if not exists description text;
alter table public.prestations add column if not exists unite text;
alter table public.prestations add column if not exists actif boolean not null default true;
alter table public.profiles add column if not exists nom text;

-- ---------- 8) NOTES & COMMENTAIRES ----------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  author_id uuid default auth.uid(),
  author_email text default (auth.jwt() ->> 'email'),
  client_id uuid references public.clients(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  ticket_id uuid references public.tickets(id) on delete cascade,
  devis_id uuid references public.devis(id) on delete cascade,
  facture_id uuid references public.factures(id) on delete cascade,
  body text not null check (length(trim(body)) > 0)
);
create index if not exists notes_client_idx on public.notes (client_id, created_at desc);
create index if not exists notes_ticket_idx on public.notes (ticket_id, created_at desc);
create index if not exists notes_lead_idx on public.notes (lead_id, created_at desc);

-- ---------- 9) INFORMATIONS SOCIÉTÉ (imprimées sur devis/factures) ----------
-- Une seule ligne (id = 1). Lecture : comptes connectés. Écriture : admins.
create table if not exists public.entreprise (
  id int primary key default 1 check (id = 1),
  raison_sociale text, forme_juridique text, siret text, tva_intracom text,
  adresse text, code_postal text, ville text,
  email text, telephone text, site_web text,
  iban text, bic text,
  delai_paiement_jours int not null default 30,
  validite_devis_jours int not null default 30,
  conditions_devis text,
  mentions_facture text,
  penalites_retard text,
  updated_at timestamptz not null default now()
);
insert into public.entreprise (id) values (1) on conflict (id) do nothing;
drop trigger if exists trg_entreprise_touch on public.entreprise;
create trigger trg_entreprise_touch before update on public.entreprise for each row execute function public.touch_updated_at();

-- ---------- 10) JOURNAL D'ACTIVITÉ (alimenté par la base) ----------
create table if not exists public.activites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  action text not null,
  entite text not null,
  entite_id uuid,
  client_id uuid,
  titre text not null,
  details jsonb
);
create index if not exists activites_created_idx on public.activites (created_at desc);
create index if not exists activites_client_idx on public.activites (client_id, created_at desc);
create index if not exists activites_entite_idx on public.activites (entite, entite_id);

create or replace function public.libelle_statut(code text)
returns text language sql immutable as $$
  select case code
    when 'nouveau' then 'Nouveau' when 'a_contacter' then 'À contacter' when 'contacte' then 'Contacté'
    when 'devis_a_preparer' then 'Devis à préparer' when 'devis_envoye' then 'Devis envoyé'
    when 'gagne' then 'Gagné' when 'perdu' then 'Perdu' when 'archive' then 'Archivé'
    when 'ouvert' then 'Ouvert' when 'en_cours' then 'En cours' when 'resolu' then 'Résolu' when 'ferme' then 'Fermé'
    when 'actif' then 'Actif' when 'suspendu' then 'Suspendu' when 'resilie' then 'Résilié'
    when 'prospect' then 'Prospect' when 'client' then 'Client' when 'inactif' then 'Inactif'
    when 'brouillon' then 'Brouillon' when 'expire' then 'Expiré'
    else coalesce(code, '') end;
$$;

create or replace function public.log_activite()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r jsonb; o jsonb; act text; titre text; cid uuid; lib text;
begin
  if tg_op = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then o := to_jsonb(old); end if;

  cid := case when tg_table_name = 'clients' then (r->>'id')::uuid
              else nullif(r->>'client_id','')::uuid end;
  lib := coalesce(nullif(r->>'numero',''), nullif(r->>'client_nom',''), nullif(r->>'nom',''),
                  nullif(r->>'sujet',''), nullif(r->>'libelle',''), nullif(r->>'email',''), '');

  if tg_op = 'INSERT' then
    act := case tg_table_name
      when 'leads' then 'lead_cree' when 'clients' then 'client_cree'
      when 'devis' then 'devis_cree' when 'factures' then 'facture_creee'
      when 'paiements' then 'paiement_recu' when 'abonnements' then 'abonnement_cree'
      when 'tickets' then 'ticket_cree' when 'notes' then 'note_ajoutee' else tg_table_name || '_cree' end;
    titre := case tg_table_name
      when 'leads' then (case when r->>'type' = 'question' then 'Question reçue de ' else 'Nouvelle demande de ' end)
                        || coalesce(nullif(r->>'nom',''), nullif(r->>'email',''), 'un visiteur')
      when 'clients' then 'Client créé : ' || lib
      when 'devis' then 'Devis ' || coalesce(r->>'numero','') || ' créé'
      when 'factures' then 'Facture ' || coalesce(r->>'numero','') || ' créée'
      when 'paiements' then 'Paiement reçu : ' || replace(to_char((r->>'montant')::numeric, 'FM999999990.00'), '.', ',') || ' €'
      when 'abonnements' then 'Abonnement créé : ' || lib
      when 'tickets' then 'Ticket ouvert : ' || lib
      when 'notes' then 'Note ajoutée'
      else 'Création' end;
  elsif tg_op = 'UPDATE' then
    if tg_table_name in ('leads','factures','tickets') and (r->>'status') is distinct from (o->>'status') then
      act := tg_table_name || '_statut';
      titre := case tg_table_name
        when 'leads' then 'Demande « ' || lib || ' » : ' || public.libelle_statut(r->>'status')
        when 'factures' then case r->>'status'
            when 'envoyee' then 'Facture ' || lib || ' envoyée'
            when 'payee' then 'Facture ' || lib || ' payée'
            when 'annulee' then 'Facture ' || lib || ' annulée'
            else 'Facture ' || lib || ' : ' || public.libelle_statut(r->>'status') end
        when 'tickets' then 'Ticket « ' || lib || ' » : ' || public.libelle_statut(r->>'status') end;
    elsif tg_table_name in ('devis','abonnements','clients') and (r->>'statut') is distinct from (o->>'statut') then
      act := tg_table_name || '_statut';
      titre := case tg_table_name
        when 'devis' then case r->>'statut'
            when 'envoye' then 'Devis ' || lib || ' envoyé'
            when 'accepte' then 'Devis ' || lib || ' accepté'
            when 'refuse' then 'Devis ' || lib || ' refusé'
            else 'Devis ' || lib || ' : ' || public.libelle_statut(r->>'statut') end
        when 'abonnements' then 'Abonnement « ' || lib || ' » : ' || public.libelle_statut(r->>'statut')
        when 'clients' then 'Client « ' || lib || ' » : ' || public.libelle_statut(r->>'statut') end;
    elsif tg_table_name = 'devis' and (r->>'signed_at') is not null and (o->>'signed_at') is null then
      act := 'devis_signe';
      titre := 'Devis ' || lib || ' signé par ' || coalesce(r->>'signature_nom','le client');
    elsif tg_table_name = 'clients' and (r->>'archived_at') is distinct from (o->>'archived_at') then
      act := case when r->>'archived_at' is null then 'client_restaure' else 'client_archive' end;
      titre := case when r->>'archived_at' is null then 'Client restauré : ' else 'Client archivé : ' end || lib;
    elsif tg_table_name = 'leads' and (r->>'client_id') is not null and (o->>'client_id') is null then
      act := 'lead_converti';
      titre := 'Demande « ' || lib || ' » convertie en client';
    else
      return null;  -- modification sans intérêt pour le journal
    end if;
  else
    act := tg_table_name || '_supprime';
    titre := 'Suppression (' || tg_table_name || ') : ' || lib;
  end if;

  insert into public.activites (actor_id, actor_email, action, entite, entite_id, client_id, titre, details)
  values (auth.uid(), auth.jwt() ->> 'email', act, tg_table_name, (r->>'id')::uuid, cid, titre,
          jsonb_build_object('op', tg_op));
  return null;
end; $$;

do $$ declare t text; begin
  foreach t in array array['leads','clients','devis','factures','paiements','abonnements','tickets','notes'] loop
    execute format('drop trigger if exists trg_%s_activite on public.%I', t, t);
    execute format('create trigger trg_%s_activite after insert or update or delete on public.%I for each row execute function public.log_activite()', t, t);
  end loop;
end $$;

-- ---------- 11) VUES D'AGRÉGATS (respectent la RLS : security_invoker) ----------
create or replace view public.clients_vue with (security_invoker = on) as
select c.*,
  coalesce((select sum(f.total_ttc) from public.factures f where f.client_id = c.id and f.status = 'payee'), 0) as ca_encaisse,
  coalesce((select sum(f.total_ttc) from public.factures f where f.client_id = c.id and f.status in ('envoyee','payee')), 0) as ca_facture,
  (select count(*) from public.devis d where d.client_id = c.id) as nb_devis,
  (select count(*) from public.factures f where f.client_id = c.id and f.status <> 'annulee') as nb_factures,
  (select count(*) from public.tickets t where t.client_id = c.id and t.status in ('ouvert','en_cours')) as tickets_ouverts,
  greatest(c.updated_at, (select max(a.created_at) from public.activites a where a.client_id = c.id)) as derniere_activite
from public.clients c;

create or replace view public.factures_vue with (security_invoker = on) as
select f.*,
  coalesce(f.date_echeance, f.date_facture) as echeance_effective,
  coalesce((select sum(p.montant) from public.paiements p where p.facture_id = f.id), 0) as montant_paye,
  greatest(f.total_ttc - coalesce((select sum(p.montant) from public.paiements p where p.facture_id = f.id), 0), 0) as reste_a_payer,
  (f.status = 'envoyee' and coalesce(f.date_echeance, f.date_facture) < current_date) as en_retard
from public.factures f;

-- ---------- 12) SÉCURITÉ : RLS par action ----------
-- Lecture / création / modification : membres de l'équipe (is_staff : admin ou
-- collaborateur) — jamais un simple compte connecté « en_attente ».
-- Suppression : administrateurs uniquement (appliqué par la base, pas seulement l'interface).
alter table public.paiements enable row level security;
alter table public.notes enable row level security;
alter table public.activites enable row level security;
alter table public.entreprise enable row level security;

do $$ declare t text; begin
  foreach t in array array['tickets','factures','clients','devis','abonnements','prestations','paiements'] loop
    execute format('drop policy if exists "%s auth all" on public.%I', t, t);
    execute format('drop policy if exists "%s read" on public.%I', t, t);
    execute format('drop policy if exists "%s insert" on public.%I', t, t);
    execute format('drop policy if exists "%s update" on public.%I', t, t);
    execute format('drop policy if exists "%s delete admin" on public.%I', t, t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (public.is_staff())', t, t);
    execute format('create policy "%s insert" on public.%I for insert to authenticated with check (public.is_staff())', t, t);
    execute format('create policy "%s update" on public.%I for update to authenticated using (public.is_staff()) with check (public.is_staff())', t, t);
    execute format('create policy "%s delete admin" on public.%I for delete to authenticated using (public.is_admin())', t, t);
  end loop;
end $$;
-- Les politiques historiques « abos auth all » portaient un autre nom :
drop policy if exists "abos auth all" on public.abonnements;

drop policy if exists "leads auth delete" on public.leads;
drop policy if exists "leads delete admin" on public.leads;
create policy "leads delete admin" on public.leads for delete to authenticated using (public.is_admin());
-- Lecture / traitement des demandes : équipe uniquement (l'insertion publique
-- reste ouverte, mais filtrée par le trigger leads_proteger_saisie_publique).
drop policy if exists "leads auth read" on public.leads;
create policy "leads auth read" on public.leads for select to authenticated using (public.is_staff());
drop policy if exists "leads auth update" on public.leads;
create policy "leads auth update" on public.leads for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "notes read" on public.notes;
drop policy if exists "notes insert" on public.notes;
drop policy if exists "notes delete" on public.notes;
create policy "notes read" on public.notes for select to authenticated using (public.is_staff());
create policy "notes insert" on public.notes for insert to authenticated with check (author_id = auth.uid() and public.is_staff());
create policy "notes delete" on public.notes for delete to authenticated using (author_id = auth.uid() or public.is_admin());

drop policy if exists "activites read" on public.activites;
create policy "activites read" on public.activites for select to authenticated using (public.is_staff());
-- (aucune politique d'écriture : seul le trigger log_activite écrit dans le journal)

drop policy if exists "entreprise read" on public.entreprise;
drop policy if exists "entreprise admin write" on public.entreprise;
create policy "entreprise read" on public.entreprise for select to authenticated using (public.is_staff());
create policy "entreprise admin write" on public.entreprise for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Profils : chacun peut modifier son nom, jamais son propre rôle.
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.my_role());

-- ---------- 13) Temps réel ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='activites') then
    execute 'alter publication supabase_realtime add table public.activites';
  end if;
end $$;

-- ---------- 14) NUMÉROTATION : compteurs inaccessibles depuis l'API ----------
-- Les compteurs ne sont modifiables que par les fonctions de numérotation,
-- elles-mêmes réservées aux comptes connectés et aux fonctions serveur.
alter table public.facture_compteurs enable row level security;
alter table public.devis_compteurs enable row level security;
alter function public.next_facture_numero() security definer set search_path = public;
alter function public.next_devis_numero() security definer set search_path = public;
revoke execute on function public.next_facture_numero() from public, anon;
revoke execute on function public.next_devis_numero() from public, anon;
grant execute on function public.next_facture_numero() to authenticated, service_role;
grant execute on function public.next_devis_numero() to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;

-- =====================================================================
-- 15) LOT 1 — SÉCURITÉ DES ACCÈS ET DES DONNÉES (idempotent)
-- =====================================================================

-- ---------- 15.1 Rôles : « en_attente » pour tout compte non validé ----------
alter table public.profiles alter column role set default 'en_attente';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin','collaborateur','en_attente'));

-- Désigner un administrateur depuis le SQL Editor de Supabase uniquement
-- (premier admin d'un nouveau projet, ou dépannage). Non appelable par l'API.
create or replace function public.definir_admin(p_email text)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'Aucun compte avec l''email % : créez-le d''abord (Authentication → Users).', p_email;
  end if;
  insert into public.profiles (id, email, role) values (uid, lower(trim(p_email)), 'admin')
    on conflict (id) do update set role = 'admin';
  return 'Administrateur : ' || p_email;
end; $$;
revoke execute on function public.definir_admin(text) from public, anon, authenticated;

-- Il doit toujours rester au moins un administrateur (évite de se bloquer dehors).
create or replace function public.profiles_garder_un_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin')
     and not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
    raise exception 'Impossible : il doit rester au moins un administrateur.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end; $$;
drop trigger if exists trg_profiles_garder_admin on public.profiles;
create trigger trg_profiles_garder_admin before update of role or delete on public.profiles
  for each row execute function public.profiles_garder_un_admin();

-- ---------- 15.2 Formulaires publics : valeurs imposées par la base ----------
-- Une demande créée hors de l'équipe (visiteur anonyme ou compte en attente)
-- ne peut fixer que les champs du formulaire. Tout le reste est imposé.
-- Limites anti-robot : 3 demandes / 10 min par email, 30 / 10 min au total.
create or replace function public.leads_proteger_saisie_publique()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then return new; end if;

  -- Champs internes : jamais contrôlables depuis un formulaire public.
  new.id := gen_random_uuid();
  new.status := 'nouveau';
  new.priorite := 'normale';
  new.is_read := false;
  new.notes := null;
  new.relance_at := null;
  new.client_id := null;
  new.type_client := null;      -- recalculé par trg_leads_type_client
  new.created_at := now();
  new.updated_at := now();

  -- Valeurs autorisées.
  if new.type is null or new.type not in ('devis','question') then new.type := 'devis'; end if;
  if new.entity is null or new.entity not in ('infogerance','particuliers','groupe') then
    raise exception 'Demande refusée : site d''origine inconnu.' using errcode = '22023';
  end if;

  -- Contenu : nettoyage et longueurs maximales.
  new.nom := nullif(trim(new.nom), '');
  new.entreprise := nullif(trim(new.entreprise), '');
  new.email := nullif(lower(trim(new.email)), '');
  new.telephone := nullif(trim(new.telephone), '');
  new.message := nullif(trim(new.message), '');
  new.service := nullif(trim(new.service), '');
  if new.email is null and new.telephone is null then
    raise exception 'Demande refusée : email ou téléphone requis.' using errcode = '22023';
  end if;
  if new.email is not null and new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Demande refusée : email invalide.' using errcode = '22023';
  end if;
  if length(coalesce(new.nom,'')) > 120 or length(coalesce(new.entreprise,'')) > 160
     or length(coalesce(new.email,'')) > 254 or length(coalesce(new.telephone,'')) > 40
     or length(coalesce(new.message,'')) > 5000 or length(coalesce(new.service,'')) > 120
     or length(coalesce(new.source_url,'')) > 500 then
    raise exception 'Demande refusée : contenu trop long.' using errcode = '22023';
  end if;

  -- Limites de débit (anti-robot côté serveur).
  if new.email is not null and (select count(*) from public.leads
      where email = new.email and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'Trop de demandes envoyées : réessayez dans quelques minutes.' using errcode = '54000';
  end if;
  if (select count(*) from public.leads where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Trop de demandes en ce moment : réessayez dans quelques minutes.' using errcode = '54000';
  end if;
  return new;
end; $$;
-- Nom choisi pour s'exécuter avant trg_leads_type_client (ordre alphabétique).
drop trigger if exists trg_leads_00_proteger on public.leads;
create trigger trg_leads_00_proteger before insert on public.leads
  for each row execute function public.leads_proteger_saisie_publique();

-- ---------- 15.3 Factures émises : ni suppression, ni modification du contenu ----------
-- Obligation de numérotation continue : une facture envoyée/payée/annulée reste
-- en base. On l'annule (statut « annulée »), on ne la supprime pas.
create or replace function public.factures_proteger_emises()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'brouillon' then
      raise exception 'Une facture émise (%) ne peut pas être supprimée : annulez-la.', coalesce(old.numero, old.id::text)
        using errcode = '42501';
    end if;
    return old;
  end if;
  -- UPDATE
  if old.status = 'brouillon' then return new; end if;
  if new.status = 'brouillon' then
    raise exception 'Une facture émise ne peut pas repasser en brouillon.' using errcode = '42501';
  end if;
  if old.status = 'annulee' and new.status <> 'annulee' then
    raise exception 'Une facture annulée ne peut pas être réactivée : créez une nouvelle facture.' using errcode = '42501';
  end if;
  if new.numero is distinct from old.numero or new.date_facture is distinct from old.date_facture
     or new.client_nom is distinct from old.client_nom or new.client_adresse is distinct from old.client_adresse
     or new.lignes is distinct from old.lignes or new.libelle is distinct from old.libelle
     or new.quantite is distinct from old.quantite or new.prix_unitaire is distinct from old.prix_unitaire
     or new.tva_taux is distinct from old.tva_taux or new.total_ht is distinct from old.total_ht
     or new.total_ttc is distinct from old.total_ttc or new.entity is distinct from old.entity
     or new.conditions is distinct from old.conditions then
    raise exception 'Une facture émise ne peut plus être modifiée : annulez-la puis créez-en une nouvelle.'
      using errcode = '42501';
  end if;
  return new;
end; $$;
drop trigger if exists trg_factures_proteger on public.factures;
create trigger trg_factures_proteger before update or delete on public.factures
  for each row execute function public.factures_proteger_emises();

-- =====================================================================
-- 16) LOT 2 — HISTORIQUE DES SAUVEGARDES (idempotent)
-- =====================================================================
-- Rempli uniquement par le script de sauvegarde (scripts/sauvegarde.sh, exécuté
-- par GitHub Actions avec la connexion PostgreSQL) : aucune écriture possible
-- depuis l'API. Consultable par l'équipe dans Système → Sauvegardes.
create table if not exists public.sauvegardes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  debut timestamptz not null default now(),
  fin timestamptz,
  type text not null default 'quotidienne' check (type in ('quotidienne','manuelle','test')),
  statut text not null check (statut in ('reussie','echec')),
  taille_octets bigint,
  fichier text,
  empreinte_sha256 text,
  lignes jsonb,                -- nombre de lignes par table au moment de la sauvegarde
  run_url text,                -- lien vers l'exécution GitHub Actions
  erreur text
);
create index if not exists sauvegardes_created_idx on public.sauvegardes (created_at desc);
alter table public.sauvegardes enable row level security;
drop policy if exists "sauvegardes read" on public.sauvegardes;
create policy "sauvegardes read" on public.sauvegardes for select to authenticated using (public.is_staff());
-- (aucune politique d'écriture : ni anon ni authenticated ne peuvent écrire)
revoke insert, update, delete, truncate on public.sauvegardes from anon, authenticated;

-- =====================================================================
-- 17) LOT 4 — CRM : ORIGINE DES DEMANDES ET HISTORIQUE CLIENT (idempotent)
-- =====================================================================

-- ---------- 17.1 Origine des demandes (attribution) ----------
-- Renseignée par les formulaires des sites (paramètres de campagne, site
-- d'où vient le visiteur, page d'arrivée) et modifiable par l'équipe (« source »).
alter table public.leads add column if not exists source text;
alter table public.leads add column if not exists utm_source text;
alter table public.leads add column if not exists utm_medium text;
alter table public.leads add column if not exists utm_campaign text;
alter table public.leads add column if not exists utm_term text;
alter table public.leads add column if not exists utm_content text;
alter table public.leads add column if not exists gclid text;
alter table public.leads add column if not exists referrer text;       -- site d'où vient le visiteur (domaine seulement)
alter table public.leads add column if not exists landing_page text;   -- première page vue pendant la visite
alter table public.leads add column if not exists ga_client_id text;   -- identifiant GA4 (seulement si cookies acceptés)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_source_check') then
    alter table public.leads add constraint leads_source_check check (source is null or source in
      ('recherche','publicite','reseaux_sociaux','email','site_referent','site_dhb','direct','telephone','recommandation','autre'));
  end if;
end $$;
create index if not exists leads_source_idx on public.leads (source);

-- Classement automatique de l'origine (règles simples, documentées) :
-- clic publicitaire (gclid ou utm_medium payant) → publicité ; campagne email ;
-- réseaux sociaux ; moteur de recherche ; autre site du groupe ; autre site ;
-- aucune information de campagne ni site d'origine → accès direct.
create or replace function public.classer_source_lead(
  p_utm_source text, p_utm_medium text, p_gclid text, p_referrer text)
returns text language sql immutable as $$
  select case
    when nullif(p_gclid,'') is not null
      or lower(coalesce(p_utm_medium,'')) in ('cpc','ppc','paid','paidsearch','paid_search','display','cpm','ads')
      then 'publicite'
    when lower(coalesce(p_utm_medium,'')) in ('email','e-mail','newsletter','mail')
      then 'email'
    when lower(coalesce(p_utm_medium,'')) in ('social','social-network','social_media','reseaux_sociaux')
      or lower(coalesce(p_utm_source, p_referrer, '')) ~ '(facebook|instagram|linkedin|lnkd\.in|twitter|(^|\.)x\.com$|^t\.co$|tiktok|youtube|pinterest|whatsapp)'
      then 'reseaux_sociaux'
    when lower(coalesce(p_utm_medium,'')) = 'organic'
      or lower(coalesce(p_utm_source, p_referrer, '')) ~ '(google|bing|duckduckgo|qwant|ecosia|yahoo|search\.brave|startpage|lilo)'
      then 'recherche'
    when lower(coalesce(p_referrer,'')) ~ 'dhb' then 'site_dhb'
    when nullif(p_utm_source,'') is not null or nullif(p_referrer,'') is not null then 'site_referent'
    else 'direct' end;
$$;

create or replace function public.leads_definir_source()
returns trigger language plpgsql as $$
begin
  if new.source is null and (new.utm_source is not null or new.utm_medium is not null or new.gclid is not null
      or new.referrer is not null or new.landing_page is not null) then
    new.source := public.classer_source_lead(new.utm_source, new.utm_medium, new.gclid, new.referrer);
  end if;
  return new;
end; $$;
-- « trg_leads_10_… » : s'exécute après trg_leads_00 / 01 (ordre alphabétique).
drop trigger if exists trg_leads_10_source on public.leads;
create trigger trg_leads_10_source before insert on public.leads
  for each row execute function public.leads_definir_source();

-- Formulaires publics : les champs d'origine sont acceptés mais nettoyés et
-- bornés (jamais de refus de la demande à cause d'eux) ; la source est toujours
-- calculée par la base, jamais fournie par le visiteur.
create or replace function public.leads_nettoyer_attribution()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then return new; end if;
  new.source := null;
  new.utm_source := left(nullif(trim(new.utm_source), ''), 200);
  new.utm_medium := left(nullif(trim(new.utm_medium), ''), 200);
  new.utm_campaign := left(nullif(trim(new.utm_campaign), ''), 200);
  new.utm_term := left(nullif(trim(new.utm_term), ''), 200);
  new.utm_content := left(nullif(trim(new.utm_content), ''), 200);
  new.gclid := left(nullif(trim(new.gclid), ''), 200);
  new.referrer := left(nullif(lower(trim(new.referrer)), ''), 255);
  new.landing_page := left(nullif(trim(new.landing_page), ''), 500);
  new.ga_client_id := case when new.ga_client_id ~ '^[0-9]{1,20}\.[0-9]{1,20}$' then new.ga_client_id end;
  return new;
end; $$;
drop trigger if exists trg_leads_01_attribution on public.leads;
create trigger trg_leads_01_attribution before insert on public.leads
  for each row execute function public.leads_nettoyer_attribution();

-- Rattrapage : les anciennes demandes avaient leurs paramètres de campagne
-- collés dans source_url (« /contact/?utm_source=… »). On les recopie dans les
-- nouvelles colonnes, sans rien supprimer. Sans information : origine inconnue
-- (aucune valeur inventée).
create or replace function public.rattraper_attribution_leads()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.leads set
      utm_source   = substring(source_url from '[?&]utm_source=([^&#]+)'),
      utm_medium   = substring(source_url from '[?&]utm_medium=([^&#]+)'),
      utm_campaign = substring(source_url from '[?&]utm_campaign=([^&#]+)'),
      gclid        = substring(source_url from '[?&]gclid=([^&#]+)')
    where source_url ~ '[?&](utm_source|utm_medium|utm_campaign|gclid)='
      and utm_source is null and utm_medium is null and utm_campaign is null and gclid is null;
  get diagnostics n = row_count;
  update public.leads set source = public.classer_source_lead(utm_source, utm_medium, gclid, referrer)
    where source is null and (utm_source is not null or utm_medium is not null or gclid is not null);
  return n;
end; $$;
revoke execute on function public.rattraper_attribution_leads() from public, anon, authenticated;
select public.rattraper_attribution_leads();

-- ---------- 17.2 Historique client : appels, emails, rendez-vous ----------
-- Une note peut être typée pour tracer les échanges dans le fil chronologique du client.
alter table public.notes add column if not exists type text not null default 'note';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'notes_type_check') then
    alter table public.notes add constraint notes_type_check check (type in ('note','appel','email','rendez_vous'));
  end if;
end $$;

-- ---------- 17.3 Clients : archivage plutôt que suppression ----------
-- Un client qui a un historique (demandes, devis, factures, paiements,
-- abonnements, tickets, notes) ne peut plus être supprimé : on l'archive.
-- Seule une fiche vide (créée par erreur) reste supprimable (admin).
create or replace function public.clients_proteger_suppression()
returns trigger language plpgsql security definer set search_path = public as $$
declare quoi text;
begin
  quoi := concat_ws(', ',
    case when exists (select 1 from public.leads where client_id = old.id) then 'demandes' end,
    case when exists (select 1 from public.devis where client_id = old.id) then 'devis' end,
    case when exists (select 1 from public.factures where client_id = old.id) then 'factures' end,
    case when exists (select 1 from public.paiements where client_id = old.id) then 'paiements' end,
    case when exists (select 1 from public.abonnements where client_id = old.id) then 'abonnements' end,
    case when exists (select 1 from public.tickets where client_id = old.id) then 'tickets' end,
    case when exists (select 1 from public.notes where client_id = old.id) then 'notes' end);
  if quoi <> '' then
    raise exception 'Ce client a un historique (%) : archivez-le au lieu de le supprimer.', quoi using errcode = '42501';
  end if;
  return old;
end; $$;
drop trigger if exists trg_clients_proteger_suppression on public.clients;
create trigger trg_clients_proteger_suppression before delete on public.clients
  for each row execute function public.clients_proteger_suppression();
