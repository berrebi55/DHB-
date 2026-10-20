-- =====================================================================
--  DHB — Table des PARAMÈTRES éditables (prix, etc.), par filiale.
--  À exécuter dans Supabase : SQL Editor → coller → Run.
--  Les prix sont LISIBLES publiquement (le site les affiche) et
--  MODIFIABLES uniquement par un administrateur connecté.
-- =====================================================================

create table if not exists public.settings (
  entity     text not null,            -- groupe | infogerance | particuliers
  skey       text not null,            -- ex. abonnement_prix, intervention_prix
  value      text,
  updated_at timestamptz not null default now(),
  primary key (entity, skey)
);

create or replace function public.settings_touch()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_settings_touch on public.settings;
create trigger trg_settings_touch before update on public.settings
  for each row execute function public.settings_touch();

alter table public.settings enable row level security;

-- Lecture publique (le site affiche les prix)
drop policy if exists "settings public read" on public.settings;
create policy "settings public read" on public.settings
  for select to anon, authenticated using (true);

-- Écriture réservée à l'administrateur connecté
drop policy if exists "settings auth write" on public.settings;
create policy "settings auth write" on public.settings
  for all to authenticated using (true) with check (true);

-- Valeurs de départ (exemples — modifiables ensuite depuis l'admin)
insert into public.settings (entity, skey, value) values
  ('particuliers', 'abonnement_prix', '19,90'),
  ('particuliers', 'intervention_prix', '59')
on conflict (entity, skey) do nothing;
