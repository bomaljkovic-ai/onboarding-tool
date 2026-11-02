-- Afdelingen met manager
create table if not exists public.afdelingen (
  naam          text primary key,
  manager_naam  text,
  manager_email text
);
alter table public.afdelingen enable row level security;
drop policy if exists afdelingen_lezen on public.afdelingen;
drop policy if exists afdelingen_beheer on public.afdelingen;
create policy afdelingen_lezen on public.afdelingen for select to authenticated
  using (public.mijn_rol() is not null);
create policy afdelingen_beheer on public.afdelingen for all to authenticated
  using (public.mijn_rol() = 'beheer') with check (public.mijn_rol() = 'beheer');

insert into public.afdelingen (naam, manager_naam, manager_email) values
  ('Logistiek','Shaam Bhoelai','shaam.bhoelai@kamera-express.nl'),
  ('Reparatie & retouren','Matthijs Gringhuis','matthijs.gringhuis@kamera-express.nl'),
  ('IT','John de Keuning','john.dekeuning@kamera-express.nl'),
  ('Recommerce','Bob van Assouw','bob.vanassouw@kamera-express.nl'),
  ('Retail','Marvin Kohen','marvin.kohen@kamera-express.nl'),
  ('Operational Excellence','Frank van der Leer','frank.vanderleer@kamera-express.nl'),
  ('HR','Omer Koc','omer.koc@kamera-express.nl'),
  ('Finance','Rick Sulkers','rick.sulkers@kamera-express.nl'),
  ('Marketing','Kasper Hessels','kasper.hessels@kamera-express.nl'),
  ('Digital','Maarten Cave','maarten.cave@kamera-express.nl'),
  ('Content en inkoop','Arthur Rolvink','arthur.rolvink@kamera-express.nl')
on conflict (naam) do update set manager_naam = excluded.manager_naam, manager_email = excluded.manager_email;

update public.instellingen set domein = 'kamera-express.nl' where id = 1 and domein = '';

-- E-mailadres van de leidinggevende bij elke mutatie
alter table public.mutaties add column if not exists leidinggevende_email text;

create or replace function public.nieuwe_mutatie(m jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  nieuw_id uuid;
  sys text[] := coalesce(array(select jsonb_array_elements_text(m->'systemen')), '{}');
  soortnaam text;
begin
  insert into public.mutaties (soort, voornaam, achternaam, prive_email, telefoon, huidig_account, functie, afdeling,
    leidinggevende, leidinggevende_email, datum, contract, locatie, systemen, opmerking, upn)
  values (m->>'soort', m->>'voornaam', m->>'achternaam', nullif(m->>'prive_email',''), nullif(m->>'telefoon',''),
    nullif(m->>'huidig_account',''), m->>'functie', m->>'afdeling', nullif(m->>'leidinggevende',''),
    nullif(lower(m->>'leidinggevende_email'),''), (m->>'datum')::date, nullif(m->>'contract',''), nullif(m->>'locatie',''),
    sys, nullif(m->>'opmerking',''), nullif(m->>'huidig_account',''))
  returning id into nieuw_id;

  insert into public.taken (mutatie_id, volgorde, omschrijving)
  select nieuw_id, row_number() over (order by t.volgorde, t.omschrijving), t.omschrijving
  from public.taak_sjablonen t
  where t.soort = m->>'soort' and (t.systeem is null or t.systeem = any(sys));

  soortnaam := case m->>'soort' when 'in' then 'Indienst' when 'uit' then 'Uitdienst' else 'Wijziging' end;
  insert into public.logboek (mutatie_id, tekst) values (nieuw_id, soortnaam || ' doorgegeven door HR');
  return nieuw_id;
end $$;

select naam, manager_naam, manager_email from public.afdelingen order by naam;
