-- Nieuwe systemen: Google (Budgetcam), Shopify POS, Shopify admin, Roots
alter table public.taak_sjablonen drop constraint if exists taak_sjablonen_systeem_check;

delete from public.taak_sjablonen where systeem in ('shopify','shopify_admin','shopify_pos','google','roots');

insert into public.taak_sjablonen (soort, systeem, omschrijving, volgorde) values
  ('in','google','Google-account aanmaken (Budgetcam)',15),
  ('in','shopify_pos','Shopify POS-medewerker toevoegen met pincode',18),
  ('in','shopify_admin','Shopify admin-account uitnodigen met de juiste rechten',20),
  ('in','roots','Roots-account aanmaken',35),

  ('uit','google','Google-account blokkeren en gegevens overdragen (Budgetcam)',15),
  ('uit','shopify_pos','Shopify POS-toegang intrekken',18),
  ('uit','shopify_admin','Shopify admin-account deactiveren',20),
  ('uit','roots','Roots-account deactiveren',35),

  ('wijziging','google','Google-account en groepen aanpassen (Budgetcam)',15),
  ('wijziging','shopify_pos','Shopify POS-rechten aanpassen',18),
  ('wijziging','shopify_admin','Shopify admin-rechten aanpassen',20),
  ('wijziging','roots','Roots-rechten aanpassen',35);

-- Bestaande mutaties met het oude "shopify" omzetten naar "shopify_admin"
update public.mutaties set systemen = array_replace(systemen, 'shopify', 'shopify_admin')
where 'shopify' = any(systemen);

select soort, systeem, omschrijving from public.taak_sjablonen order by soort, volgorde;
