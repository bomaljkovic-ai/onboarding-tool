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

-- ============================================================
-- Instellingen (één rij)
-- ============================================================
create table public.instellingen (
  id              int primary key default 1 check (id = 1),
  domein          text not null default '',
  afdelingen      text[] not null default array['Klantenservice','Verkoop','Magazijn','Marketing','Financiën'],
  leidinggevenden text[] not null default '{}',
  locaties        text[] not null default array['Kantoor']
);
insert into public.instellingen (id) values (1);

-- ============================================================
-- Takensjablonen: welke taken horen bij welke mutatie en welk systeem
-- systeem = null betekent: altijd
-- ============================================================
create table public.taak_sjablonen (
  id           uuid primary key default gen_random_uuid(),
  soort        text not null check (soort in ('in','uit','wijziging')),
  systeem      text check (systeem in ('entra','shopify','odoo','laptop','telefoon','pas')),
  omschrijving text not null,
  volgorde     int not null default 100
);

insert into public.taak_sjablonen (soort, systeem, omschrijving, volgorde) values
  ('in','entra','Microsoft 365-account aanmaken (Entra)',10),
  ('in','entra','Licentie en groepen toewijzen',11),
  ('in','shopify','Shopify-medewerker uitnodigen met de juiste rechten',20),
  ('in','odoo','Odoo-gebruiker aanmaken',30),
  ('in','laptop','Laptop klaarzetten en koppelen aan account',40),
  ('in','telefoon','Telefoon / simkaart regelen',50),
  ('in','pas','Toegangspas aanvragen',60),
  ('in',null,'Welkomstmail met inloggegevens versturen',90),
  ('in',null,'Leidinggevende laten weten dat alles klaar is',91),

  ('uit','entra','Aanmelden blokkeren en sessies afmelden (Entra)',10),
  ('uit','entra','Mailbox omzetten naar gedeelde mailbox',11),
  ('uit','entra','OneDrive-bestanden overdragen',12),
  ('uit','entra','Licentie vrijgeven',13),
  ('uit','shopify','Shopify-account deactiveren',20),
  ('uit','odoo','Odoo-gebruiker archiveren',30),
  ('uit','laptop','Laptop innemen en wissen',40),
  ('uit','telefoon','Telefoon / simkaart innemen',50),
  ('uit','pas','Toegangspas innemen en blokkeren',60),
  ('uit',null,'Gedeelde wachtwoorden wijzigen',90),
  ('uit',null,'HR laten weten dat alles is afgerond',91),

  ('wijziging','entra','Afdeling, functie en groepen bijwerken in Entra',10),
  ('wijziging','shopify','Shopify-rechten aanpassen',20),
  ('wijziging','odoo','Odoo-rechten aanpassen',30),
  ('wijziging','laptop','Laptop: andere software of instellingen nodig?',40),
  ('wijziging','telefoon','Telefoon / simkaart aanpassen',50),
  ('wijziging','pas','Toegangsrechten pas aanpassen',60),
  ('wijziging',null,'Leidinggevende laten weten dat de wijziging is doorgevoerd',90);

-- ============================================================
-- Mutaties, taken en logboek
-- ============================================================
create table public.mutaties (
  id              uuid primary key default gen_random_uuid(),
  soort           text not null check (soort in ('in','uit','wijziging')),
  voornaam        text not null,
  achternaam      text not null,
  prive_email     text,
  telefoon        text,
  huidig_account  text,
  functie         text not null,
  afdeling        text not null,
  leidinggevende  text,
  datum           date not null,
  contract        text,
  locatie         text,
  systemen        text[] not null default '{}',
  opmerking       text,
  upn             text,
  ingetrokken     boolean not null default false,
  aangemaakt_door uuid references public.profielen(id) on delete set null default auth.uid(),
  aangemaakt_op   timestamptz not null default now()
);
create index mutaties_datum_idx on public.mutaties (datum);

create table public.taken (
  id           uuid primary key default gen_random_uuid(),
  mutatie_id   uuid not null references public.mutaties(id) on delete cascade,
  volgorde     int not null,
  omschrijving text not null,
  klaar        boolean not null default false,
  klaar_door   uuid references public.profielen(id) on delete set null,
  klaar_op     timestamptz
);
create index taken_mutatie_idx on public.taken (mutatie_id);

create table public.logboek (
  id         bigint generated always as identity primary key,
  mutatie_id uuid not null references public.mutaties(id) on delete cascade,
  door       uuid references public.profielen(id) on delete set null default auth.uid(),
  tekst      text not null,
  op         timestamptz not null default now()
);
create index logboek_mutatie_idx on public.logboek (mutatie_id);

-- Nieuwe mutatie met takenlijst en logregel in één keer.
-- security invoker: de beveiligingsregels hieronder gelden gewoon.
create or replace function public.nieuwe_mutatie(m jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  nieuw_id uuid;
  sys text[] := coalesce(array(select jsonb_array_elements_text(m->'systemen')), '{}');
  soortnaam text;
begin
  insert into public.mutaties (soort, voornaam, achternaam, prive_email, telefoon, huidig_account,
    functie, afdeling, leidinggevende, datum, contract, locatie, systemen, opmerking, upn)
  values (m->>'soort', m->>'voornaam', m->>'achternaam', nullif(m->>'prive_email',''), nullif(m->>'telefoon',''),
    nullif(m->>'huidig_account',''), m->>'functie', m->>'afdeling', nullif(m->>'leidinggevende',''),
    (m->>'datum')::date, nullif(m->>'contract',''), nullif(m->>'locatie',''), sys, nullif(m->>'opmerking',''),
    nullif(m->>'huidig_account',''))
  returning id into nieuw_id;

  insert into public.taken (mutatie_id, volgorde, omschrijving)
  select nieuw_id, row_number() over (order by t.volgorde, t.omschrijving), t.omschrijving
  from public.taak_sjablonen t
  where t.soort = m->>'soort' and (t.systeem is null or t.systeem = any(sys));

  soortnaam := case m->>'soort' when 'in' then 'Indienst' when 'uit' then 'Uitdienst' else 'Wijziging' end;
  insert into public.logboek (mutatie_id, tekst) values (nieuw_id, soortnaam || ' doorgegeven door HR');
  return nieuw_id;
end $$;

-- ============================================================
-- Beveiliging (Row Level Security)
--   HR     : mutaties doorgeven en intrekken
--   IT     : taken afvinken, gebruikersnaam vastleggen
--   Beheer : alles, plus instellingen en rollen
--   Zonder rol: niets
-- ============================================================
alter table public.profielen      enable row level security;
alter table public.instellingen   enable row level security;
alter table public.taak_sjablonen enable row level security;
alter table public.mutaties       enable row level security;
alter table public.taken          enable row level security;
alter table public.logboek        enable row level security;

-- Profielen: eigen profiel altijd; anderen alleen met een rol. Alleen de eigen naam wijzigen.
create policy profielen_lezen on public.profielen for select to authenticated
  using (id = auth.uid() or public.mijn_rol() is not null);
create policy profielen_eigen_naam on public.profielen for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profielen from authenticated;
grant update (naam) on public.profielen to authenticated;

create policy instellingen_lezen on public.instellingen for select to authenticated
  using (public.mijn_rol() is not null);
create policy instellingen_wijzigen on public.instellingen for update to authenticated
  using (public.mijn_rol() = 'beheer') with check (public.mijn_rol() = 'beheer');

create policy sjablonen_lezen on public.taak_sjablonen for select to authenticated
  using (public.mijn_rol() is not null);
create policy sjablonen_beheer on public.taak_sjablonen for all to authenticated
  using (public.mijn_rol() = 'beheer') with check (public.mijn_rol() = 'beheer');

create policy mutaties_lezen on public.mutaties for select to authenticated
  using (public.mijn_rol() is not null);
create policy mutaties_toevoegen on public.mutaties for insert to authenticated
  with check (public.mijn_rol() in ('hr','beheer'));
create policy mutaties_wijzigen on public.mutaties for update to authenticated
  using (public.mijn_rol() in ('hr','it','beheer')) with check (public.mijn_rol() in ('hr','it','beheer'));

create policy taken_lezen on public.taken for select to authenticated
  using (public.mijn_rol() is not null);
create policy taken_toevoegen on public.taken for insert to authenticated
  with check (public.mijn_rol() in ('hr','beheer'));
create policy taken_afvinken on public.taken for update to authenticated
  using (public.mijn_rol() in ('it','beheer')) with check (public.mijn_rol() in ('it','beheer'));

create policy logboek_lezen on public.logboek for select to authenticated
  using (public.mijn_rol() is not null);
create policy logboek_schrijven on public.logboek for insert to authenticated
  with check (public.mijn_rol() is not null and door = auth.uid());

-- Live bijwerken in de app
alter publication supabase_realtime add table public.mutaties, public.taken, public.logboek;
