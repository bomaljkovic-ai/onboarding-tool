-- DEEL 1 van 4
-- EERSTE INSTALLATIE (veilig opnieuw uit te voeren zolang er nog geen echte gegevens in staan)
-- Let op: dit wist eerst alle tabellen van deze tool. Gebruik het niet meer als je de tool echt gebruikt.

drop trigger if exists bij_nieuwe_gebruiker on auth.users;
drop table if exists public.logboek, public.taken, public.mutaties, public.taak_sjablonen, public.instellingen, public.profielen cascade;
drop function if exists public.nieuwe_mutatie(jsonb);
drop function if exists public.zet_rol(uuid, text);
drop function if exists public.mijn_rol();
drop function if exists public.nieuwe_gebruiker();

-- Personeelsmutaties: on- en offboarding
-- Plak dit hele bestand in Supabase › SQL Editor en klik op Run.

create extension if not exists pgcrypto;

-- ============================================================
-- Profielen en rollen
-- ============================================================
create table public.profielen (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  naam          text,
  rol           text check (rol in ('hr','it','beheer')),
  aangemaakt_op timestamptz not null default now()
);

-- Elke nieuwe gebruiker krijgt automatisch een profiel, nog zonder rol.
create or replace function public.nieuwe_gebruiker()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profielen (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger bij_nieuwe_gebruiker
  after insert on auth.users
  for each row execute function public.nieuwe_gebruiker();

-- Gebruikers die al bestonden vóór deze opzet ook een profiel geven.
insert into public.profielen (id, email)
select id, email from auth.users where email is not null
on conflict (id) do nothing;

-- De rol van de ingelogde gebruiker (null = geen toegang).
create or replace function public.mijn_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from public.profielen where id = auth.uid()
$$;

-- Alleen Beheer mag rollen toekennen.
create or replace function public.zet_rol(gebruiker uuid, nieuwe_rol text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.mijn_rol() is distinct from 'beheer' then
    raise exception 'Alleen Beheer kan rollen toekennen';
  end if;
  if nieuwe_rol is not null and nieuwe_rol not in ('hr','it','beheer') then
    raise exception 'Onbekende rol: %', nieuwe_rol;
  end if;
  if gebruiker = auth.uid() and nieuwe_rol is distinct from 'beheer' then
    raise exception 'Je kunt je eigen beheerrol niet weghalen';
  end if;
  update public.profielen set rol = nieuwe_rol where id = gebruiker;
end $$;

