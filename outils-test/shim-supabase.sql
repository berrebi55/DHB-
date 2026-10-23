-- Shim minimal imitant un projet Supabase (base de TEST locale uniquement).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
end $$;
grant anon, authenticated, service_role to postgres;

create extension if not exists pgcrypto;
create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text default 'email',
  identity_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                         auth.jwt()->>'sub'), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(auth.jwt()->>'role', current_setting('request.jwt.claim.role', true))
$$;
create or replace function auth.email() returns text language sql stable as $$
  select auth.jwt()->>'email'
$$;
grant execute on all functions in schema auth to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

do $$ begin
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- Stockage (minimal) : tables utilisées par full-setup.sql et la sauvegarde.
create schema if not exists storage;
create table if not exists storage.buckets (id text primary key, name text not null, public boolean default false, created_at timestamptz default now());
create table if not exists storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, created_at timestamptz default now(), metadata jsonb, unique (bucket_id, name));
