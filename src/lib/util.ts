import type { Mutatie } from "./types";

export function parseDatum(s: string | null | undefined): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dagenTot(s: string | null | undefined): number | null {
  const d = parseDatum(s);
  if (!d) return null;
  const v = new Date();
  v.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - v.getTime()) / 86400000);
}

export function fmtDatum(s: string | null | undefined, lang = false): string {
  const d = parseDatum(s);
  if (!d) return "—";
  return d.toLocaleDateString(
    "nl-NL",
    lang ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { weekday: "short", day: "numeric", month: "short" },
  );
}

export function fmtMoment(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function wanneer(s: string | null | undefined): string {
  const n = dagenTot(s);
  if (n === null) return "";
  if (n === 0) return "vandaag";
  if (n === 1) return "morgen";
  if (n === -1) return "gisteren";
  return n > 0 ? `over ${n} dagen` : `${-n} dagen geleden`;
}

export const volledigeNaam = (m: Pick<Mutatie, "voornaam" | "achternaam">) =>
  [m.voornaam, m.achternaam].filter(Boolean).join(" ");

export const lijst = (s: string) =>
  s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);

function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function stelUpnVoor(m: Pick<Mutatie, "voornaam" | "achternaam">, domein: string): string {
  const v = slug(m.voornaam || "");
  const a = slug(m.achternaam || "");
  return `${v && a ? `${v}.${a}` : v || a || "naam"}@${domein.trim() || "[DOMEIN]"}`;
}

export function voortgang(m: Mutatie) {
  const t = m.taken || [];
  return { klaar: t.filter((x) => x.klaar).length, totaal: t.length };
}

export type StatusKey = "ingetrokken" | "klaar" | "urgent" | "bezig" | "nieuw";
export function status(m: Mutatie): { key: StatusKey; label: string; cls: string } {
  if (m.ingetrokken) return { key: "ingetrokken", label: "Ingetrokken", cls: "grey" };
  const p = voortgang(m);
  if (p.totaal && p.klaar === p.totaal) return { key: "klaar", label: "Afgerond", cls: "done" };
  const n = dagenTot(m.datum);
  if (n !== null && n <= 3) return { key: "urgent", label: n < 0 ? "Datum verstreken" : "Let op: binnenkort", cls: "alert" };
  if (p.klaar > 0) return { key: "bezig", label: "Bezig", cls: "grey" };
  return { key: "nieuw", label: "Nieuw", cls: "grey" };
}

const ps = (v: string | null | undefined) => String(v || "").replace(/[`"$]/g, (c) => "`" + c);

export function scriptEntra(m: Mutatie, upn: string): string {
  if (m.soort === "in") {
    const nick = upn.split("@")[0];
    return `# Nieuw account in Entra (Microsoft Graph PowerShell)
Connect-MgGraph -Scopes "User.ReadWrite.All"

$wachtwoord = @{
  Password = "VUL-HIER-EEN-TIJDELIJK-WACHTWOORD-IN"
  ForceChangePasswordNextSignIn = $true
}

New-MgUser \`
  -DisplayName "${ps(volledigeNaam(m))}" \`
  -GivenName "${ps(m.voornaam)}" \`
  -Surname "${ps(m.achternaam)}" \`
  -UserPrincipalName "${ps(upn)}" \`
  -MailNickname "${ps(nick)}" \`
  -JobTitle "${ps(m.functie)}" \`
  -Department "${ps(m.afdeling)}" \`
  -UsageLocation "NL" \`
  -AccountEnabled \`
  -PasswordProfile $wachtwoord

# Licentie en groepen daarna toewijzen in het Entra- of Microsoft 365-beheercentrum.`;
  }
  if (m.soort === "uit") {
    return `# Account blokkeren op de laatste werkdag (Microsoft Graph PowerShell)
Connect-MgGraph -Scopes "User.ReadWrite.All"

Update-MgUser -UserId "${ps(upn)}" -AccountEnabled:$false
Revoke-MgUserSignInSession -UserId "${ps(upn)}"

# Mailbox omzetten naar gedeelde mailbox (Exchange Online PowerShell)
Connect-ExchangeOnline
Set-Mailbox -Identity "${ps(upn)}" -Type Shared`;
  }
  return `# Functie en afdeling bijwerken (Microsoft Graph PowerShell)
Connect-MgGraph -Scopes "User.ReadWrite.All"

Update-MgUser -UserId "${ps(upn)}" \`
  -JobTitle "${ps(m.functie)}" \`
  -Department "${ps(m.afdeling)}"

# Groepen aanpassen in het Entra-beheercentrum.`;
}

export function foutTekst(e: unknown): string {
  const msg = (e as { message?: string })?.message || "";
  if (/row-level security|permission denied/i.test(msg)) return "Je hebt hier geen rechten voor met jouw rol.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Geen verbinding met de server. Controleer je internet en probeer het opnieuw.";
  return msg || "Er ging iets mis. Probeer het opnieuw.";
}
