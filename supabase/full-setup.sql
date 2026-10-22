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
-- Recréées à chaque passage (« c.* » / « f.* » : une colonne ajoutée à la table
-- ne doit pas faire échouer le script). Aucune autre vue n'en dépend.
drop view if exists public.clients_vue;
drop view if exists public.factures_vue;
create view public.clients_vue with (security_invoker = on) as
select c.*,
  coalesce((select sum(f.total_ttc) from public.factures f where f.client_id = c.id and f.status = 'payee'), 0) as ca_encaisse,
  coalesce((select sum(f.total_ttc) from public.factures f where f.client_id = c.id and f.status in ('envoyee','payee')), 0) as ca_facture,
  (select count(*) from public.devis d where d.client_id = c.id) as nb_devis,
  (select count(*) from public.factures f where f.client_id = c.id and f.status <> 'annulee') as nb_factures,
  (select count(*) from public.tickets t where t.client_id = c.id and t.status in ('ouvert','en_cours')) as tickets_ouverts,
  greatest(c.updated_at, (select max(a.created_at) from public.activites a where a.client_id = c.id)) as derniere_activite
from public.clients c;

create view public.factures_vue with (security_invoker = on) as
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
    case when exists (select 1 from public.notes where client_id = old.id) then 'notes' end,
    case when to_regclass('public.emails') is not null
              and exists (select 1 from public.emails where client_id = old.id) then 'emails' end);
  if quoi <> '' then
    raise exception 'Ce client a un historique (%) : archivez-le au lieu de le supprimer.', quoi using errcode = '42501';
  end if;
  return old;
end; $$;
drop trigger if exists trg_clients_proteger_suppression on public.clients;
create trigger trg_clients_proteger_suppression before delete on public.clients
  for each row execute function public.clients_proteger_suppression();

-- =====================================================================
-- 18) LOT 6 — DOCUMENTS PDF (idempotent)
-- =====================================================================
-- Les PDF de devis et de factures sont produits côté serveur (Edge Function
-- render-pdf) et rangés dans un espace de stockage PRIVÉ (« documents ») :
-- aucun accès direct depuis le navigateur, tout passe par la fonction, qui
-- vérifie que l'appelant fait partie de l'équipe.
-- Une facture émise (envoyée, payée, annulée) est archivée UNE fois : son PDF
-- n'est plus jamais régénéré ni remplacé (le document envoyé reste identique).
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  type text not null check (type in ('devis','facture')),
  devis_id uuid references public.devis(id) on delete set null,
  facture_id uuid references public.factures(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  numero text,
  nom_fichier text not null,
  chemin text not null unique,          -- emplacement dans le stockage « documents »
  taille_octets bigint,
  empreinte_sha256 text,
  cree_par uuid
);
create unique index if not exists documents_facture_unique on public.documents (facture_id) where type = 'facture';
create unique index if not exists documents_devis_unique on public.documents (devis_id) where type = 'devis';
create index if not exists documents_client_idx on public.documents (client_id, created_at desc);
alter table public.documents enable row level security;
drop policy if exists "documents read" on public.documents;
create policy "documents read" on public.documents for select to authenticated using (public.is_staff());
-- (aucune politique d'écriture : seule la fonction render-pdf, avec la clé serveur, écrit ici)
revoke insert, update, delete, truncate on public.documents from anon, authenticated;

-- Archive d'une facture émise : ni modification ni suppression, même par la clé serveur.
create or replace function public.documents_proteger_factures()
returns trigger language plpgsql as $$
begin
  -- Seules les informations de copie vers Google Drive (lot 11) peuvent évoluer.
  if old.type = 'facture' and (tg_op = 'DELETE'
      or (to_jsonb(new) - array['drive_file_id','drive_copie_le','drive_erreur']) is distinct from (to_jsonb(old) - array['drive_file_id','drive_copie_le','drive_erreur'])) then
    raise exception 'Le PDF archivé d''une facture émise ne peut être ni modifié ni supprimé.' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end; $$;
drop trigger if exists trg_documents_proteger on public.documents;
create trigger trg_documents_proteger before update or delete on public.documents
  for each row execute function public.documents_proteger_factures();

-- Espace de stockage privé (uniquement sur un vrai projet Supabase, où le
-- schéma « storage » existe). Aucune politique sur storage.objects : seul le
-- serveur (clé service role) lit et écrit ces fichiers.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
      on conflict (id) do update set public = false;
  end if;
end $$;

-- =====================================================================
-- 19) LOT 7 — PAIEMENTS EN LIGNE STRIPE (idempotent)
-- =====================================================================
-- La fonction stripe-webhook (signature Stripe vérifiée) transmet chaque
-- événement à stripe_traiter_evenement(), qui fait TOUT en une seule
-- transaction : client retrouvé (email) ou créé, facture numérotée, paiement
-- (la facture passe « payée » via paiements_solder_facture), abonnement.
-- Un même événement ou un même paiement n'est jamais enregistré deux fois
-- (Stripe renvoie un événement tant qu'il n'a pas reçu de réponse « 200 »).

alter table public.abonnements add column if not exists stripe_subscription_id text;
alter table public.abonnements add column if not exists stripe_customer_id text;
create unique index if not exists abonnements_stripe_unique on public.abonnements (stripe_subscription_id) where stripe_subscription_id is not null;
create unique index if not exists paiements_stripe_reference_unique on public.paiements (reference) where moyen = 'stripe' and reference is not null;

-- Journal des événements reçus de Stripe (anti-doublon + suivi).
create table if not exists public.stripe_evenements (
  id text primary key,                 -- identifiant de l'événement Stripe (evt_…)
  type text not null,
  recu_le timestamptz not null default now(),
  traite_le timestamptz,
  statut text not null default 'en_cours' check (statut in ('en_cours','traite','ignore','erreur')),
  resultat text,                       -- ex. « Facture 2026-0012 payée »
  erreur text
);
create index if not exists stripe_evenements_recu_idx on public.stripe_evenements (recu_le desc);
alter table public.stripe_evenements enable row level security;
drop policy if exists "stripe_evenements read" on public.stripe_evenements;
create policy "stripe_evenements read" on public.stripe_evenements for select to authenticated using (public.is_staff());
revoke insert, update, delete, truncate on public.stripe_evenements from anon, authenticated;

-- p_type : « paiement » (paiement reçu), « abonnement_statut », « ignore ».
-- p_d    : données déjà extraites et contrôlées par la fonction stripe-webhook.
create or replace function public.stripe_traiter_evenement(p_id text, p_type_stripe text, p_type text, p_d jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_st text; v_montant numeric; v_ref text; v_email text; v_cid uuid; v_cnom text; v_fid uuid; v_num text;
  v_aid uuid; v_jour date; v_lib text; v_mois int; v_resultat text; v_n int;
begin
  if p_id is null or p_id !~ '^evt_[A-Za-z0-9_]+$' then
    raise exception 'Identifiant d''événement Stripe invalide.' using errcode = '22023';
  end if;
  -- Anti-doublon : un événement déjà traité (ou ignoré) n'est jamais rejoué.
  insert into public.stripe_evenements (id, type, statut) values (p_id, coalesce(p_type_stripe, '?'), 'en_cours')
    on conflict (id) do nothing;
  if not found then
    select statut into v_st from public.stripe_evenements where id = p_id for update;
    if v_st in ('traite', 'ignore') then return 'deja_traite'; end if;
  end if;

  if p_type = 'paiement' then
    v_montant := round((p_d->>'montant')::numeric, 2);
    v_ref := nullif(trim(p_d->>'reference'), '');
    if v_montant is null or v_montant <= 0 or v_ref is null then
      update public.stripe_evenements set statut = 'ignore', traite_le = now(), resultat = 'Montant nul ou référence absente' where id = p_id;
      return 'ignore';
    end if;
    -- Même paiement déjà enregistré (ex. session de paiement + facture Stripe du même abonnement).
    if exists (select 1 from public.paiements where moyen = 'stripe' and reference = v_ref) then
      update public.stripe_evenements set statut = 'traite', traite_le = now(), resultat = 'Paiement déjà enregistré' where id = p_id;
      return 'deja_traite';
    end if;
    v_jour := coalesce(nullif(p_d->>'date', '')::date, current_date);
    v_lib := left(coalesce(nullif(trim(p_d->>'libelle'), ''), 'Paiement en ligne'), 300);
    v_email := nullif(lower(trim(p_d->>'email')), '');

    -- Abonnement déjà connu : son client est réutilisé.
    if nullif(p_d->>'subscription_id', '') is not null then
      select id, client_id into v_aid, v_cid from public.abonnements where stripe_subscription_id = p_d->>'subscription_id';
    end if;
    -- Sinon : client retrouvé par son email (fiche non archivée), ou créé.
    if v_cid is null and v_email is not null then
      select id into v_cid from public.clients where lower(email) = v_email and archived_at is null order by created_at limit 1;
    end if;
    if v_cid is null then
      insert into public.clients (type, entity, statut, nom, email, telephone, adresse, code_postal, ville, notes)
      values ('particulier', coalesce(nullif(p_d->>'entity', ''), 'particuliers'), 'client',
              coalesce(nullif(left(trim(p_d->>'nom'), 120), ''), v_email, 'Client Stripe'), v_email,
              nullif(left(trim(p_d->>'telephone'), 40), ''), nullif(left(trim(p_d->>'adresse'), 300), ''),
              nullif(left(trim(p_d->>'code_postal'), 20), ''), nullif(left(trim(p_d->>'ville'), 120), ''),
              'Fiche créée automatiquement lors d''un paiement en ligne (Stripe).')
      returning id into v_cid;
    else
      update public.clients set statut = 'client' where id = v_cid and statut = 'prospect';
    end if;
    select coalesce(nullif(entreprise, ''), nom) into v_cnom from public.clients where id = v_cid;

    -- Nouvel abonnement Stripe.
    if v_aid is null and nullif(p_d->>'subscription_id', '') is not null then
      v_mois := greatest(coalesce(nullif(p_d->>'intervalle_mois', '')::int, 1), 1);
      insert into public.abonnements (entity, client_id, client_nom, libelle, montant_mensuel, date_debut, statut,
                                      jour_facturation, derniere_facture_le, stripe_subscription_id, stripe_customer_id, notes)
      values (coalesce(nullif(p_d->>'entity', ''), 'particuliers'), v_cid, v_cnom, v_lib, round(v_montant / v_mois, 2), v_jour, 'actif',
              extract(day from v_jour)::int, v_jour, p_d->>'subscription_id', nullif(p_d->>'customer_id', ''),
              'Prélevé automatiquement par Stripe : les factures sont créées à chaque paiement reçu.')
      returning id into v_aid;
    elsif v_aid is not null then
      update public.abonnements set derniere_facture_le = v_jour, statut = 'actif' where id = v_aid;
    end if;

    v_num := public.next_facture_numero();
    insert into public.factures (entity, numero, date_facture, date_echeance, client_id, client_nom, client_email, client_adresse,
                                 abonnement_id, libelle, quantite, prix_unitaire, lignes, tva_taux, total_ht, total_ttc, status, conditions)
    values (coalesce(nullif(p_d->>'entity', ''), 'particuliers'), v_num, v_jour, v_jour, v_cid, v_cnom, v_email,
            nullif(concat_ws(', ', nullif(trim(p_d->>'adresse'), ''), nullif(trim(concat_ws(' ', p_d->>'code_postal', p_d->>'ville')), '')), ''),
            v_aid, v_lib, 1, v_montant, jsonb_build_array(jsonb_build_object('libelle', v_lib, 'qte', 1, 'pu', v_montant)),
            0, v_montant, v_montant, 'envoyee', 'Réglée en ligne par carte bancaire (Stripe).')
    returning id into v_fid;
    insert into public.paiements (facture_id, client_id, montant, date_paiement, moyen, reference, notes)
    values (v_fid, v_cid, v_montant, v_jour, 'stripe', v_ref, 'Paiement en ligne Stripe');
    v_resultat := 'Facture ' || v_num || ' payée (' || replace(to_char(v_montant, 'FM999999990.00'), '.', ',') || ' €)';

  elsif p_type = 'abonnement_statut' then
    update public.abonnements set statut = p_d->>'statut'
      where stripe_subscription_id = p_d->>'subscription_id' and p_d->>'statut' in ('actif', 'suspendu', 'resilie');
    get diagnostics v_n = row_count;
    if v_n = 0 then
      update public.stripe_evenements set statut = 'ignore', traite_le = now(), resultat = 'Abonnement inconnu' where id = p_id;
      return 'ignore';
    end if;
    v_resultat := 'Abonnement : ' || public.libelle_statut(p_d->>'statut');

  else
    update public.stripe_evenements set statut = 'ignore', traite_le = now(), resultat = left(coalesce(p_d->>'raison', 'Événement non utilisé'), 200) where id = p_id;
    return 'ignore';
  end if;

  update public.stripe_evenements set statut = 'traite', traite_le = now(), resultat = v_resultat, erreur = null where id = p_id;
  return 'traite';
end; $$;
revoke execute on function public.stripe_traiter_evenement(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.stripe_traiter_evenement(text, text, text, jsonb) to service_role;

-- =====================================================================
-- 20) LOT 8 — COMMUNICATION : HISTORIQUE ET MODÈLES D'EMAILS (idempotent)
-- =====================================================================
-- Tous les emails partent par un seul module serveur (_shared/email.ts) et
-- sont inscrits ici : envois manuels depuis les fiches, devis, factures,
-- relances, alertes de nouvelles demandes. Historique en lecture seule.
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  origine text not null check (origine in ('manuel','devis','facture','relance_devis','relance_facture','alerte_demande','automatisation')),
  modele_cle text,
  destinataire text not null,          -- adresse prévue (fiche du client)
  destinataire_reel text,              -- adresse réellement utilisée si redirection de test
  sujet text not null,
  corps_html text not null,
  piece_jointe text,                   -- nom du PDF joint
  statut text not null check (statut in ('envoye','echec')),
  erreur text,
  fournisseur_id text,                 -- identifiant Resend
  envoye_par uuid,
  envoye_par_email text,
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  devis_id uuid references public.devis(id) on delete set null,
  facture_id uuid references public.factures(id) on delete set null,
  ticket_id uuid references public.tickets(id) on delete set null
);
create index if not exists emails_created_idx on public.emails (created_at desc);
create index if not exists emails_client_idx on public.emails (client_id, created_at desc);
create index if not exists emails_lead_idx on public.emails (lead_id, created_at desc);
alter table public.emails enable row level security;
drop policy if exists "emails read" on public.emails;
create policy "emails read" on public.emails for select to authenticated using (public.is_staff());
-- (aucune politique d'écriture : seules les fonctions serveur écrivent l'historique)
revoke insert, update, delete, truncate on public.emails from anon, authenticated;

-- Modèles : texte avec variables {{…}}, remplacées au moment de l'envoi.
-- Lecture : équipe ; modification : administrateurs (comme la fiche entreprise).
create table if not exists public.email_modeles (
  cle text primary key check (cle ~ '^[a-z0-9_]{2,40}$'),
  nom text not null,
  cible text not null default 'tous' check (cible in ('tous','client','lead','devis','facture','ticket')),
  sujet text not null,
  corps text not null,
  actif boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.email_modeles enable row level security;
drop policy if exists "email_modeles read" on public.email_modeles;
drop policy if exists "email_modeles admin write" on public.email_modeles;
create policy "email_modeles read" on public.email_modeles for select to authenticated using (public.is_staff());
create policy "email_modeles admin write" on public.email_modeles for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop trigger if exists trg_email_modeles_touch on public.email_modeles;
create trigger trg_email_modeles_touch before update on public.email_modeles for each row execute function public.touch_updated_at();

-- Modèles de départ (modifiables ; jamais écrasés s'ils existent déjà).
insert into public.email_modeles (cle, nom, cible, sujet, corps) values
  ('libre', 'Message libre', 'tous', '', E'Bonjour {{contact_nom}},\n\n\n\nCordialement,\n{{signature}}'),
  ('suivi_demande', 'Suite à votre demande', 'lead', 'Votre demande — {{societe}}',
   E'Bonjour {{contact_nom}},\n\nMerci pour votre demande. Pour vous proposer la solution la plus adaptée, pourriez-vous nous indiquer un moment où vous joindre par téléphone ?\n\nCordialement,\n{{signature}}'),
  ('relance_devis', 'Relance d''un devis', 'devis', 'Votre devis {{devis_numero}} — {{societe}}',
   E'Bonjour {{contact_nom}},\n\nJe reviens vers vous au sujet du devis {{devis_numero}} d''un montant de {{devis_montant}}. Avez-vous pu en prendre connaissance ? Je reste à votre disposition pour en parler ou l''ajuster.\n\nCordialement,\n{{signature}}'),
  ('rappel_facture', 'Rappel de facture', 'facture', 'Rappel — facture {{facture_numero}} — {{societe}}',
   E'Bonjour {{contact_nom}},\n\nSauf erreur de notre part, la facture {{facture_numero}} reste à régler : montant restant {{facture_reste}}, échéance {{facture_echeance}}.\n\nSi le paiement a déjà été effectué, merci de ne pas tenir compte de ce message.\n\nCordialement,\n{{signature}}'),
  ('ticket_resolu', 'Ticket résolu', 'ticket', 'Votre demande d''assistance « {{ticket_sujet}} »',
   E'Bonjour {{contact_nom}},\n\nNous vous confirmons que votre demande « {{ticket_sujet}} » est résolue. Si le problème réapparaît, répondez simplement à cet email.\n\nCordialement,\n{{signature}}')
on conflict (cle) do nothing;

-- =====================================================================
-- 21) LOT 9 — AUTOMATISATIONS : FILE D'ÉVÉNEMENTS ET RÈGLES (idempotent)
-- =====================================================================
-- Une action dans DHB s'enregistre tout de suite ; ses effets externes
-- (emails automatiques…) passent par la file « evenements », traitée par la
-- fonction planifiée « worker » avec statut, tentatives, prochaine tentative
-- et erreur lisible. Une panne d'envoi n'empêche jamais d'utiliser le CRM.

-- ---------- 21.1 File d'événements ----------
create table if not exists public.evenements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null,                          -- ex. client_cree, ticket_resolu
  objet_type text not null,                    -- client, lead, devis, facture, ticket
  objet_id uuid not null,
  statut text not null default 'en_attente' check (statut in ('en_attente','traite','erreur','ignore')),
  tentatives int not null default 0,
  prochaine_tentative timestamptz not null default now(),
  traite_le timestamptz,
  erreur text
);
create index if not exists evenements_a_traiter_idx on public.evenements (prochaine_tentative) where statut = 'en_attente';
create index if not exists evenements_created_idx on public.evenements (created_at desc);
alter table public.evenements enable row level security;
drop policy if exists "evenements read" on public.evenements;
create policy "evenements read" on public.evenements for select to authenticated using (public.is_staff());
revoke insert, update, delete, truncate on public.evenements from anon, authenticated;

-- Événements émis par la base elle-même (fiable : impossible d'en oublier un).
create or replace function public.emettre_evenement()
returns trigger language plpgsql security definer set search_path = public as $$
declare t text; o text; n jsonb; a jsonb; champ text;
begin
  o := case tg_table_name when 'clients' then 'client' when 'leads' then 'lead' when 'devis' then 'devis'
                          when 'factures' then 'facture' when 'tickets' then 'ticket' when 'documents' then 'document' end;
  if tg_op = 'INSERT' then
    t := case tg_table_name when 'clients' then 'client_cree' when 'leads' then 'lead_cree' when 'documents' then 'document_cree' end;
  elsif tg_table_name = 'documents' then
    -- Nouvelle version du PDF (devis) : à recopier vers Google Drive.
    if (to_jsonb(new)->>'empreinte_sha256') is distinct from (to_jsonb(old)->>'empreinte_sha256') then t := 'document_maj'; end if;
  else
    -- Lecture en JSON : la colonne d'état s'appelle « statut » (devis) ou « status » (factures, tickets).
    n := to_jsonb(new); a := to_jsonb(old);
    champ := case tg_table_name when 'devis' then 'statut' else 'status' end;
    if (n->>champ) is distinct from (a->>champ) then
      t := case tg_table_name || ':' || (n->>champ)
             when 'devis:envoye' then 'devis_envoye' when 'devis:accepte' then 'devis_accepte'
             when 'factures:envoyee' then 'facture_envoyee' when 'factures:payee' then 'facture_payee'
             when 'tickets:resolu' then 'ticket_resolu' when 'leads:gagne' then 'lead_gagne' end;
    end if;
  end if;
  if t is not null then
    insert into public.evenements (type, objet_type, objet_id) values (t, o, new.id);
  end if;
  return null;
end; $$;
do $$ declare t text; begin
  foreach t in array array['clients','leads'] loop
    execute format('drop trigger if exists trg_%s_evenement on public.%I', t, t);
    execute format('create trigger trg_%s_evenement after insert on public.%I for each row execute function public.emettre_evenement()', t, t);
  end loop;
  foreach t in array array['devis','factures','tickets'] loop
    execute format('drop trigger if exists trg_%s_evenement on public.%I', t, t);
    execute format('create trigger trg_%s_evenement after update on public.%I for each row execute function public.emettre_evenement()', t, t);
  end loop;
end $$;

-- Réessayer un événement en erreur (administrateur, depuis Système → Automatisations).
create or replace function public.reessayer_evenement(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs.' using errcode = '42501'; end if;
  update public.evenements set statut = 'en_attente', tentatives = 0, prochaine_tentative = now(), erreur = null
    where id = p_id and statut = 'erreur';
end; $$;
revoke execute on function public.reessayer_evenement(uuid) from public, anon;
grant execute on function public.reessayer_evenement(uuid) to authenticated;

-- ---------- 21.2 Règles « SI … ALORS envoyer l'email … » ----------
-- Lecture : équipe ; réglage (activer, délai, modèle) : administrateurs.
create table if not exists public.automatisations (
  cle text primary key,
  nom text not null,
  description text not null,
  declencheur text not null,                   -- événement, ou « quotidien » (contrôle chaque jour)
  actif boolean not null default false,
  delai_jours int not null default 0 check (delai_jours between 0 and 90),
  modele_cle text references public.email_modeles(cle) on update cascade,
  updated_at timestamptz not null default now()
);
alter table public.automatisations enable row level security;
drop policy if exists "automatisations read" on public.automatisations;
drop policy if exists "automatisations admin update" on public.automatisations;
create policy "automatisations read" on public.automatisations for select to authenticated using (public.is_staff());
create policy "automatisations admin update" on public.automatisations for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete, truncate on public.automatisations from anon, authenticated;
drop trigger if exists trg_automatisations_touch on public.automatisations;
create trigger trg_automatisations_touch before update on public.automatisations for each row execute function public.touch_updated_at();

insert into public.email_modeles (cle, nom, cible, sujet, corps) values
  ('bienvenue', 'Bienvenue (nouveau client)', 'client', 'Bienvenue — {{societe}}',
   E'Bonjour {{contact_nom}},\n\nMerci de votre confiance. Pour toute question, il vous suffit de répondre à cet email.\n\nCordialement,\n{{signature}}')
on conflict (cle) do nothing;

-- Règles de départ. Relances de devis et rappels de facture : actives, comme les
-- relances automatiques existantes (send-reminders). Bienvenue et ticket résolu :
-- désactivées tant que le propriétaire ne les a pas relues et activées.
insert into public.automatisations (cle, nom, description, declencheur, actif, delai_jours, modele_cle) values
  ('relance_devis', 'Relance des devis sans réponse',
   'SI un devis envoyé n''est ni signé ni refusé après le délai ALORS le client reçoit l''email de relance (au plus une fois tous les 7 jours).',
   'quotidien', true, 5, 'relance_devis'),
  ('rappel_facture', 'Rappel des factures en retard',
   'SI une facture envoyée n''est pas réglée après son échéance + le délai ALORS le client reçoit l''email de rappel (au plus une fois tous les 7 jours).',
   'quotidien', true, 7, 'rappel_facture'),
  ('bienvenue', 'Bienvenue aux nouveaux clients',
   'SI une fiche client est créée avec un email ALORS le client reçoit l''email de bienvenue (une seule fois).',
   'client_cree', false, 0, 'bienvenue'),
  ('ticket_resolu', 'Ticket résolu',
   'SI un ticket passe à « résolu » ALORS le client reçoit l''email de confirmation (une seule fois par ticket).',
   'ticket_resolu', false, 0, 'ticket_resolu')
on conflict (cle) do nothing;

-- ---------- 21.3 Journal des exécutions ----------
create table if not exists public.automatisation_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  automatisation_cle text not null references public.automatisations(cle),
  objet_type text not null,
  objet_id uuid not null,
  statut text not null check (statut in ('envoye','echec','ignore')),
  detail text,
  email_id uuid
);
create index if not exists automatisation_runs_created_idx on public.automatisation_runs (created_at desc);
-- « Une seule fois » : bienvenue par client, confirmation par ticket.
create unique index if not exists automatisation_runs_unique_unefois on public.automatisation_runs (automatisation_cle, objet_id)
  where automatisation_cle in ('bienvenue', 'ticket_resolu') and statut = 'envoye';
alter table public.automatisation_runs enable row level security;
drop policy if exists "automatisation_runs read" on public.automatisation_runs;
create policy "automatisation_runs read" on public.automatisation_runs for select to authenticated using (public.is_staff());
revoke insert, update, delete, truncate on public.automatisation_runs from anon, authenticated;

-- =====================================================================
-- 22) LOT 10 — INTÉGRATIONS ET GOOGLE ANALYTICS (idempotent)
-- =====================================================================

-- ---------- 22.1 État des intégrations (non secret) ----------
-- Lecture : équipe ; réglages non secrets (identifiants GA4…) : administrateurs.
-- Le statut, la dernière synchronisation et l'erreur sont écrits par le serveur.
create table if not exists public.integrations (
  cle text primary key check (cle in ('google','ga4')),
  statut text not null default 'non_configure' check (statut in ('non_configure','connecte','erreur')),
  compte text,                            -- ex. compte Google connecté
  details jsonb not null default '{}',    -- ex. {"ga4_property_id":"123","ga4_measurement_id":"G-…"}
  derniere_synchro timestamptz,
  erreur text,
  updated_at timestamptz not null default now()
);
insert into public.integrations (cle) values ('google'), ('ga4') on conflict (cle) do nothing;
alter table public.integrations enable row level security;
drop policy if exists "integrations read" on public.integrations;
drop policy if exists "integrations admin update" on public.integrations;
create policy "integrations read" on public.integrations for select to authenticated using (public.is_staff());
create policy "integrations admin update" on public.integrations for update to authenticated using (public.is_admin()) with check (public.is_admin());
revoke insert, delete, truncate on public.integrations from anon, authenticated;
-- Un administrateur ne règle que les détails non secrets : statut, compte et
-- erreurs restent sous le contrôle du serveur.
create or replace function public.integrations_proteger()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.jwt()->>'role', '') = 'authenticated' then
    new.statut := old.statut; new.compte := old.compte; new.derniere_synchro := old.derniere_synchro; new.erreur := old.erreur;
    if new.details ?| array['refresh_token','access_token','client_secret','api_secret'] then
      raise exception 'Aucun secret dans les réglages : les secrets vont dans Supabase → Edge Functions → Secrets.' using errcode = '22023';
    end if;
    if (new.details->>'ga4_property_id') is not null and (new.details->>'ga4_property_id') !~ '^[0-9]{5,15}$' then
      raise exception 'Identifiant de propriété GA4 invalide (chiffres uniquement, ex. 123456789).' using errcode = '22023';
    end if;
    if (new.details->>'ga4_measurement_id') is not null and (new.details->>'ga4_measurement_id') !~ '^G-[A-Z0-9]{4,15}$' then
      raise exception 'Identifiant de mesure GA4 invalide (forme G-XXXXXXXXXX).' using errcode = '22023';
    end if;
  end if;
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists trg_integrations_proteger on public.integrations;
create trigger trg_integrations_proteger before update on public.integrations
  for each row execute function public.integrations_proteger();

-- ---------- 22.2 Identifiants Google (serveur uniquement) ----------
-- Jeton de renouvellement OAuth : aucune politique RLS et aucun droit pour
-- anon / authenticated → illisible depuis l'API, même pour un administrateur.
create table if not exists public.integration_credentials (
  cle text primary key references public.integrations(cle),
  refresh_token text not null,
  scopes text,
  updated_at timestamptz not null default now()
);
alter table public.integration_credentials enable row level security;
revoke all on public.integration_credentials from anon, authenticated;

-- ---------- 22.3 Journal des intégrations ----------
create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cle text not null,
  action text not null,                  -- connexion, deconnexion, synchro, conversion…
  statut text not null check (statut in ('ok','erreur','ignore')),
  message text
);
create index if not exists integration_logs_created_idx on public.integration_logs (created_at desc);
alter table public.integration_logs enable row level security;
drop policy if exists "integration_logs read" on public.integration_logs;
create policy "integration_logs read" on public.integration_logs for select to authenticated using (public.is_staff());
revoke insert, update, delete, truncate on public.integration_logs from anon, authenticated;

-- ---------- 22.4 Copie quotidienne des chiffres GA4 ----------
create table if not exists public.analytics_quotidien (
  jour date not null,
  canal text not null,                   -- regroupement de canaux GA4 (Organic Search, Direct…)
  sessions int not null default 0,
  utilisateurs int not null default 0,
  conversions int not null default 0,    -- « événements clés » GA4
  copie_le timestamptz not null default now(),
  primary key (jour, canal)
);
alter table public.analytics_quotidien enable row level security;
drop policy if exists "analytics_quotidien read" on public.analytics_quotidien;
create policy "analytics_quotidien read" on public.analytics_quotidien for select to authenticated using (public.is_staff());
revoke insert, update, delete, truncate on public.analytics_quotidien from anon, authenticated;

-- ---------- 22.5 Événement « demande gagnée » (conversion côté serveur) ----------
-- La file du lot 9 reçoit aussi le passage d'une demande à « gagné » : le robot
-- peut alors envoyer la conversion à GA4 (Measurement Protocol).
drop trigger if exists trg_leads_evenement_maj on public.leads;
create trigger trg_leads_evenement_maj after update on public.leads
  for each row execute function public.emettre_evenement();

-- =====================================================================
-- 23) LOT 11 — GOOGLE DRIVE : DOSSIER PAR CLIENT, COPIE DES PDF (idempotent)
-- =====================================================================
-- Avec le compte Google connecté (lot 10), DHB crée un dossier par client
-- (et ses sous-dossiers) dans « DHB — Clients », puis y copie les PDF des devis
-- et des factures. Tout passe par la file d'événements du robot (lot 9) :
-- une panne de Google n'empêche jamais d'utiliser le CRM ; l'état est visible
-- sur la fiche client et l'opération peut être relancée.

alter table public.integrations drop constraint if exists integrations_cle_check;
alter table public.integrations add constraint integrations_cle_check check (cle in ('google','ga4','drive','search_console'));
-- Sous-dossiers proposés par défaut (modifiables par un administrateur dans
-- Système → Intégrations ; à valider par le propriétaire).
insert into public.integrations (cle, details) values
  ('drive', '{"actif": false, "sous_dossiers": ["01 - Devis", "02 - Factures", "03 - Contrats et abonnements", "04 - Parc informatique", "05 - Interventions", "06 - Échanges", "07 - Documents du client", "08 - Divers"]}'),
  ('search_console', '{}')
on conflict (cle) do nothing;

-- Réglages Drive : sous-dossiers contrôlés (8 au plus, noms simples).
create or replace function public.integrations_controler_drive()
returns trigger language plpgsql as $$
declare d text;
begin
  if new.cle = 'drive' and coalesce(auth.jwt()->>'role', '') = 'authenticated' then
    if jsonb_typeof(new.details->'sous_dossiers') <> 'array' or jsonb_array_length(new.details->'sous_dossiers') not between 2 and 8 then
      raise exception 'Indiquez entre 2 et 8 sous-dossiers.' using errcode = '22023';
    end if;
    for d in select jsonb_array_elements_text(new.details->'sous_dossiers') loop
      if d !~ '^[^/\\<>:"|?*]{1,60}$' then
        raise exception 'Nom de sous-dossier invalide : « % » (60 caractères au plus, sans / \ < > : " | ? *).', d using errcode = '22023';
      end if;
    end loop;
  end if;
  return new;
end; $$;
drop trigger if exists trg_integrations_controler_drive on public.integrations;
create trigger trg_integrations_controler_drive before update on public.integrations
  for each row execute function public.integrations_controler_drive();

-- Dossier Drive de chaque client.
alter table public.clients add column if not exists drive_folder_id text;
alter table public.clients add column if not exists drive_folder_url text;
alter table public.clients add column if not exists drive_sync_statut text;
alter table public.clients add column if not exists drive_cree_le timestamptz;
alter table public.clients add column if not exists drive_erreur text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'clients_drive_statut_check') then
    alter table public.clients add constraint clients_drive_statut_check check (drive_sync_statut is null or drive_sync_statut in ('en_attente','a_jour','erreur'));
  end if;
end $$;

-- Copie de chaque PDF.
alter table public.documents add column if not exists drive_file_id text;
alter table public.documents add column if not exists drive_copie_le timestamptz;
alter table public.documents add column if not exists drive_erreur text;

-- Événements « document créé / nouvelle version » (file du lot 9).
drop trigger if exists trg_documents_evenement on public.documents;
create trigger trg_documents_evenement after insert or update on public.documents
  for each row execute function public.emettre_evenement();

-- Les informations Drive d'un client sont gérées par le serveur uniquement
-- (un utilisateur ne peut pas y mettre un lien arbitraire).
create or replace function public.clients_drive_serveur()
returns trigger language plpgsql as $$
begin
  if coalesce(auth.jwt()->>'role', '') in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.drive_folder_id := null; new.drive_folder_url := null; new.drive_sync_statut := null; new.drive_cree_le := null; new.drive_erreur := null;
    else
      new.drive_folder_id := old.drive_folder_id; new.drive_folder_url := old.drive_folder_url;
      new.drive_sync_statut := old.drive_sync_statut; new.drive_cree_le := old.drive_cree_le; new.drive_erreur := old.drive_erreur;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_clients_drive_serveur on public.clients;
create trigger trg_clients_drive_serveur before insert or update on public.clients
  for each row execute function public.clients_drive_serveur();

-- =====================================================================
-- 24) LOT 12 — SEARCH CONSOLE (idempotent)
-- =====================================================================
-- Copie quotidienne des chiffres de recherche Google (clics, impressions,
-- taux de clic, position) des propriétés vérifiées, déclarées par un
-- administrateur dans Système → Intégrations. Données Google disponibles avec
-- 2 à 3 jours de décalage. Lecture : équipe ; écriture : serveur.

-- Propriétés : « sc-domain:exemple.fr » (domaine) ou « https://www.exemple.fr/ » (préfixe d'URL).
create or replace function public.integrations_controler_search_console()
returns trigger language plpgsql as $$
declare s text;
begin
  if new.cle = 'search_console' and coalesce(auth.jwt()->>'role', '') = 'authenticated' and new.details ? 'sites' then
    if jsonb_typeof(new.details->'sites') <> 'array' or jsonb_array_length(new.details->'sites') > 10 then
      raise exception 'Indiquez au plus 10 propriétés Search Console.' using errcode = '22023';
    end if;
    for s in select jsonb_array_elements_text(new.details->'sites') loop
      if s !~ '^(sc-domain:[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?|https?://[a-z0-9.-]+(:[0-9]+)?/([^ ]*)?)$' then
        raise exception 'Propriété Search Console invalide : « % » (ex. sc-domain:exemple.fr ou https://www.exemple.fr/).', s using errcode = '22023';
      end if;
    end loop;
  end if;
  return new;
end; $$;
drop trigger if exists trg_integrations_controler_search_console on public.integrations;
create trigger trg_integrations_controler_search_console before update on public.integrations
  for each row execute function public.integrations_controler_search_console();

create table if not exists public.seo_quotidien (
  site text not null,
  jour date not null,
  clics int not null default 0,
  impressions int not null default 0,
  position numeric(6,2),                 -- position moyenne
  copie_le timestamptz not null default now(),
  primary key (site, jour)
);
-- Requêtes et pages les plus vues sur les 28 derniers jours disponibles.
create table if not exists public.seo_requetes (
  site text not null,
  requete text not null,
  clics int not null default 0,
  impressions int not null default 0,
  position numeric(6,2),
  periode_fin date not null,
  primary key (site, requete)
);
create table if not exists public.seo_pages (
  site text not null,
  page text not null,
  clics int not null default 0,
  impressions int not null default 0,
  position numeric(6,2),
  periode_fin date not null,
  primary key (site, page)
);
do $$ declare t text; begin
  foreach t in array array['seo_quotidien','seo_requetes','seo_pages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s read" on public.%I', t, t);
    execute format('create policy "%s read" on public.%I for select to authenticated using (public.is_staff())', t, t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
  end loop;
end $$;
