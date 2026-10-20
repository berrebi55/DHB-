-- =====================================================================
--  DHB — INSTALLATION COMPLÈTE DE LA BASE (à exécuter en une fois)
--  Supabase → SQL Editor → New query → coller TOUT → Run.
--  Idempotent : peut être relancé sans danger.
--  Contient : leads (+relance), settings (prix), tickets, factures.
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
  tva_taux numeric not null default 20,
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
