-- =====================================================================
--  DHB — Compléments de restauration (utilisé par scripts/restaurer.sh).
--
--  Une sauvegarde contient tout le schéma public (tables, données, fonctions,
--  règles RLS, déclencheurs des tables publiques, droits). Ce fichier recrée
--  uniquement ce qui vit HORS du schéma public et n'est donc pas dans la
--  sauvegarde. Il ne modifie AUCUNE donnée (contrairement à full-setup.sql,
--  qui contient des mises à jour de rattrapage).
--
--  À garder aligné avec full-setup.sql (sections « Profils » et « Temps réel »).
-- =====================================================================

-- Création automatique d'un profil « en_attente » à chaque nouveau compte.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tables diffusées en temps réel au back-office.
do $$ declare t text; begin
  foreach t in array array['leads','tickets','activites'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- Espace de stockage privé des PDF (lot 6) : les fichiers eux-mêmes sont remis
-- par scripts/restaurer.sh (étape 7).
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
      on conflict (id) do update set public = false;
  end if;
end $$;
