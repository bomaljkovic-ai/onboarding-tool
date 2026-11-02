import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
// Publishable key (sb_publishable_…); de oude naam ANON_KEY werkt ook nog
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;

export const configOk = Boolean(url && key);

// "implicit": uitnodigingslinks en inloglinks uit e-mails werken allebei,
// ook als je de link in een andere browser opent.
export const supabase = createClient(url || "http://localhost", key || "ontbreekt", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
});

// Foutmelding uit een verlopen of ongeldige e-maillink, om op het inlogscherm te tonen.
export let linkFout: string | null = null;

// Laat Supabase de inloggegevens uit de link lezen vóórdat de app start,
// en ruim daarna het adres op zodat alleen de app-navigatie (#/...) overblijft.
export async function verwerkInlogLink(): Promise<void> {
  const hash = window.location.hash.replace(/^#/, "");
  const p = new URLSearchParams(hash.startsWith("/") ? "" : hash);
  if (p.get("error_description")) {
    linkFout = /expired|invalid/i.test(p.get("error_code") || p.get("error_description") || "")
      ? "Deze link is verlopen of al gebruikt. Vraag hieronder een nieuwe inloglink aan."
      : p.get("error_description");
  }
  if (configOk) {
    try { await supabase.auth.getSession(); } catch { /* login-scherm toont zich vanzelf */ }
  }
  if (p.has("access_token") || p.has("error") || p.has("error_description")) {
    window.history.replaceState(null, "", window.location.pathname + "#/");
  }
}
