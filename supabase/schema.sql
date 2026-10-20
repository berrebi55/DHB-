-- =====================================================================
--  DHB — Schéma de base de données (Supabase / PostgreSQL)
--  À exécuter dans Supabase : SQL Editor → coller ce fichier → Run.
--  Sécurité : RLS activée. Le public peut UNIQUEMENT créer une demande.
--  Seul un administrateur connecté peut lire / modifier / supprimer.
-- =====================================================================

-- 1) Table des demandes (devis + questions)
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  entity        text not null default 'infogerance',   -- filiale : groupe | infogerance | particuliers | ...
  type          text not null default 'devis'
                  check (type in ('devis', 'question')),
  nom           text,
  entreprise    text,
  email         text,
  telephone     text,
  message       text,
  service       text,            -- service concerné (facultatif)
  source_url    text,            -- page d'où vient la demande
  status        text not null default 'nouveau'
                  check (status in ('nouveau','contacte','devis_envoye','gagne','perdu','archive')),
  is_read       boolean not null default false,
  notes         text,            -- notes internes de l'admin
  updated_at    timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx     on public.leads (status);
create index if not exists leads_type_idx        on public.leads (type);
create index if not exists leads_entity_idx      on public.leads (entity);

-- Si la table existe déjà (créée avant l'ajout du multi-filiales), ajoutez la colonne :
alter table public.leads add column if not exists entity text not null default 'infogerance';

-- 2) Mise à jour automatique de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- 3) Sécurité au niveau des lignes (RLS)
alter table public.leads enable row level security;

-- 3a) Le public (clé publique) peut UNIQUEMENT insérer une demande.
drop policy if exists "public can insert leads" on public.leads;
create policy "public can insert leads"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- 3b) Seul un utilisateur CONNECTÉ (admin) peut lire les demandes.
drop policy if exists "authenticated can read leads" on public.leads;
create policy "authenticated can read leads"
  on public.leads for select
  to authenticated
  using (true);

-- 3c) Seul un admin connecté peut modifier (statut, notes, lu).
drop policy if exists "authenticated can update leads" on public.leads;
create policy "authenticated can update leads"
  on public.leads for update
  to authenticated
  using (true) with check (true);

-- 3d) Seul un admin connecté peut supprimer.
drop policy if exists "authenticated can delete leads" on public.leads;
create policy "authenticated can delete leads"
  on public.leads for delete
  to authenticated
  using (true);

-- 4) Temps réel : pousser les nouvelles demandes vers l'admin en direct.
alter publication supabase_realtime add table public.leads;

-- =====================================================================
--  ÉTAPES MANUELLES APRÈS CE SCRIPT (dans le tableau de bord Supabase)
--  a) Authentication → Users → "Add user" : créez VOTRE compte admin
--     (email + mot de passe). C'est ce compte qui ouvrira /admin/.
--  b) Authentication → Providers → Email : laissez "Email" activé,
--     et désactivez "Allow new users to sign up" pour empêcher toute
--     création de compte depuis l'extérieur (vous restez seul admin).
--  c) (Email de notification) voir supabase/functions/notify-new-lead.
-- =====================================================================
