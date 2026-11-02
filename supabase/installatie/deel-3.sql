-- DEEL 3 van 4
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

