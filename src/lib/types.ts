export type Soort = "in" | "uit" | "wijziging";
export type Rol = "hr" | "it" | "beheer";

export interface Profiel {
  id: string;
  email: string;
  naam: string | null;
  rol: Rol | null;
}

export interface Instellingen {
  domein: string;
  afdelingen: string[];
  leidinggevenden: string[];
  locaties: string[];
}

export interface Afdeling {
  naam: string;
  manager_naam: string | null;
  manager_email: string | null;
}

export interface Taak {
  id: string;
  mutatie_id: string;
  volgorde: number;
  omschrijving: string;
  klaar: boolean;
  klaar_door: string | null;
  klaar_op: string | null;
}

export interface Logregel {
  id: number;
  mutatie_id: string;
  door: string | null;
  tekst: string;
  op: string;
}

export interface Mutatie {
  id: string;
  soort: Soort;
  voornaam: string;
  achternaam: string;
  prive_email: string | null;
  telefoon: string | null;
  huidig_account: string | null;
  functie: string;
  afdeling: string;
  leidinggevende: string | null;
  leidinggevende_email: string | null;
  datum: string;
  contract: string | null;
  locatie: string | null;
  systemen: string[];
  opmerking: string | null;
  upn: string | null;
  ingetrokken: boolean;
  aangemaakt_door: string | null;
  aangemaakt_op: string;
  taken?: Taak[];
}

export const SYSTEMEN: { id: string; label: string; kort: string }[] = [
  { id: "entra", label: "Microsoft 365-account (Entra)", kort: "Entra" },
  { id: "google", label: "Google-account (Budgetcam)", kort: "Google" },
  { id: "shopify_pos", label: "Shopify POS-account", kort: "Shopify POS" },
  { id: "shopify_admin", label: "Shopify admin-account", kort: "Shopify admin" },
  { id: "odoo", label: "Odoo-account", kort: "Odoo" },
  { id: "roots", label: "Roots", kort: "Roots" },
  { id: "laptop", label: "Laptop", kort: "Laptop" },
  { id: "telefoon", label: "Telefoon / simkaart", kort: "Telefoon" },
  { id: "pas", label: "Toegangspas", kort: "Pas" },
];

export const SOORT_LABEL: Record<Soort, string> = { in: "Indienst", uit: "Uitdienst", wijziging: "Wijziging" };
export const ROL_LABEL: Record<Rol, string> = { hr: "HR", it: "IT", beheer: "Beheer" };
