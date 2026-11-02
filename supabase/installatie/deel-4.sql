-- DEEL 4 van 4
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

-- Jou beheerder maken
update public.profielen set rol = 'beheer' where email = 'info@dokwebsites.nl';

-- Controle: hier hoort jouw e-mailadres met rol 'beheer' te staan
select email, rol from public.profielen;
