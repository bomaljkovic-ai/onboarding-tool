-- DEEL 2 van 4
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

