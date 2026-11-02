-- VOORBEELDMUTATIES (verzonnen personen, om de tool uit te proberen)
do $$
declare v jsonb; nieuw uuid;
begin
  for v in select * from jsonb_array_elements('[
    {"soort":"in","voornaam":"Sanne","achternaam":"de Vries","functie":"Medewerker klantenservice","afdeling":"Klantenservice","leidinggevende":"Mark Jansen","d":14,"contract":"Vast","locatie":"Kantoor","prive_email":"sanne.voorbeeld@example.com","systemen":["entra","shopify","laptop","pas"],"opmerking":"VOORBEELD. Werkt de eerste week naast een collega.","klaar":0},
    {"soort":"in","voornaam":"Daan","achternaam":"Bakker","functie":"Magazijnmedewerker","afdeling":"Magazijn","leidinggevende":"Ilse Peters","d":3,"contract":"Tijdelijk","locatie":"Kantoor","systemen":["entra","pas"],"opmerking":"VOORBEELD","klaar":2},
    {"soort":"uit","voornaam":"Lotte","achternaam":"Smit","functie":"Accountmanager","afdeling":"Verkoop","leidinggevende":"Mark Jansen","d":6,"locatie":"Kantoor","huidig_account":"lotte.smit@voorbeeld.nl","systemen":["entra","shopify","laptop","telefoon"],"opmerking":"VOORBEELD. Mailbox naar Mark Jansen.","klaar":1},
    {"soort":"wijziging","voornaam":"Youssef","achternaam":"El Amrani","functie":"Teamleider klantenservice","afdeling":"Klantenservice","leidinggevende":"Mark Jansen","d":9,"locatie":"Kantoor","huidig_account":"youssef.elamrani@voorbeeld.nl","systemen":["entra","shopify"],"opmerking":"VOORBEELD","klaar":0},
    {"soort":"uit","voornaam":"Tom","achternaam":"Visser","functie":"Webredacteur","afdeling":"Marketing","leidinggevende":"Ilse Peters","d":-5,"locatie":"Kantoor","huidig_account":"tom.visser@voorbeeld.nl","systemen":["entra","shopify","laptop"],"opmerking":"VOORBEELD","klaar":99}
  ]'::jsonb)
  loop
    nieuw := public.nieuwe_mutatie(v || jsonb_build_object('datum', (current_date + (v->>'d')::int)::text));
    update public.taken set klaar = true, klaar_op = now()
      where mutatie_id = nieuw and volgorde <= (v->>'klaar')::int;
  end loop;
end $$;

update public.instellingen set leidinggevenden = array['Mark Jansen','Ilse Peters'] where id = 1 and leidinggevenden = '{}';

select soort, voornaam, achternaam, datum from public.mutaties order by datum;
