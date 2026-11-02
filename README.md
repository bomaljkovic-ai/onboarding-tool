# Personeelsmutaties: on- en offboarding

HR geeft in- en uitdiensttredingen en wijzigingen door via een formulier. IT ziet in één overzicht wie wanneer komt of gaat, met per medewerker een takenlijst, een Entra-script (PowerShell) en Shopify-instructies.

Gebouwd met React + Vite + TypeScript en Supabase (database, inloggen en live bijwerken).

## Rollen

| Rol    | Kan                                                              |
|--------|------------------------------------------------------------------|
| HR     | Mutaties doorgeven en intrekken, alles bekijken                  |
| IT     | Taken afvinken, gebruikersnaam vastleggen, alles bekijken        |
| Beheer | Alles, plus instellingen en rollen toekennen                     |
| Geen   | Niets: wie geen rol heeft, ziet geen gegevens                    |

De database dwingt dit af met Row Level Security, dus ook iemand die de app omzeilt kan niet meer zien of doen dan zijn rol toestaat.

## Eenmalig instellen

### 1. Supabase-project
1. Maak een project aan op [supabase.com](https://supabase.com). Kies regio Frankfurt of een andere EU-regio.
2. Ga naar **SQL Editor** en voer de bestanden in `supabase/migrations/` één voor één uit, in volgorde van naam (plakken en **Run**).
3. Ga naar **Authentication › Sign In / Providers** en zet **Allow new users to sign up** uit. Dan kan alleen inloggen wie je uitnodigt.
4. Ga naar **Authentication › URL Configuration** en vul bij **Site URL** het adres in waar de app komt te staan. Zet bij **Redirect URLs** ook `http://localhost:5173` als je lokaal wilt testen.

### 2. Jezelf beheerder maken
1. **Authentication › Users › Invite user**: nodig je eigen e-mailadres uit.
2. Voer in de SQL Editor uit, met je eigen adres:
   ```sql
   update public.profielen set rol = 'beheer' where email = 'jij@bedrijf.nl';
   ```
3. Daarna nodig je collega's uit via **Invite user** en geef je ze een rol op de pagina **Beheer** in de app.

### 3. Lokaal draaien (optioneel)
```bash
cp .env.example .env.local   # vul URL en publishable key in (Project Settings › API Keys)
npm install
npm run dev
```

### 4. Online zetten
De app is een statische site (`npm run build` → map `dist`). Hij werkt op elke host, omdat de navigatie via `#/` loopt en er geen serverinstellingen nodig zijn.

**Vercel of Netlify:** importeer deze GitHub-repo, build command `npm run build`, output `dist`. Voeg de omgevingsvariabelen `VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY` toe. Elke push naar `main` zet automatisch een nieuwe versie online.

De publishable key (`sb_publishable_…`) mag in de site staan; de beveiliging zit in de databaseregels. Zet nooit een **secret key** (`sb_secret_…`) in de site.

## Takenlijsten aanpassen
De taken per soort mutatie en systeem staan in de tabel `taak_sjablonen`. Pas ze aan in Supabase › Table Editor. Nieuwe mutaties gebruiken meteen de nieuwe lijst.

## Hoe het werkt
- `supabase/migrations/` – tabellen, beveiliging, rollen en de functie `nieuwe_mutatie` die een mutatie met takenlijst in één keer aanmaakt.
- `src/pages/` – Inloggen, Overzicht, Nieuwe mutatie, Detail en Beheer.
- `src/lib/util.ts` – datums, status en de Entra-scripts.

## Volgende stappen
- **Entra automatisch:** een Supabase Edge Function met een app-registratie in Entra (Microsoft Graph) die na goedkeuring door IT het account aanmaakt of blokkeert. De geheime sleutel staat dan alleen op de server.
- **Melding naar IT** bij een nieuwe mutatie (e-mail of Teams).
- **Collega's uitnodigen vanuit de app** in plaats van via Supabase.
