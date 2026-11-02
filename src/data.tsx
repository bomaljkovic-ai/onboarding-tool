import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import type { Afdeling, Instellingen, Mutatie, Profiel, Rol } from "./lib/types";

const STANDAARD: Instellingen = { domein: "", afdelingen: [], leidinggevenden: [], locaties: [] };

interface DataCtx {
  session: Session;
  profiel: Profiel | null;
  rol: Rol | null;
  instellingen: Instellingen;
  afdelingen: Afdeling[];
  mutaties: Mutatie[];
  profielen: Record<string, Profiel>;
  geladen: boolean;
  fout: string | null;
  herlaad: () => Promise<void>;
  herlaadProfielen: () => Promise<void>;
  naamVan: (id: string | null | undefined) => string;
  toast: (t: string) => void;
}

const Ctx = createContext<DataCtx | null>(null);
export const useData = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useData buiten DataProvider");
  return c;
};

export function DataProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  const [instellingen, setInstellingen] = useState<Instellingen>(STANDAARD);
  const [mutaties, setMutaties] = useState<Mutatie[]>([]);
  const [afdelingen, setAfdelingen] = useState<Afdeling[]>([]);
  const [profielen, setProfielen] = useState<Record<string, Profiel>>({});
  const [geladen, setGeladen] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [toastTekst, setToastTekst] = useState<string | null>(null);
  const toastTimer = useRef<number>();

  const toast = useCallback((t: string) => {
    setToastTekst(t);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastTekst(null), 2800);
  }, []);

  const herlaadProfielen = useCallback(async () => {
    const { data } = await supabase.from("profielen").select("id,email,naam,rol").order("email");
    const map: Record<string, Profiel> = {};
    (data || []).forEach((p) => (map[p.id] = p as Profiel));
    setProfielen(map);
    setProfiel(map[session.user.id] || null);
  }, [session.user.id]);

  const herlaad = useCallback(async () => {
    const [m, i, a] = await Promise.all([
      supabase.from("mutaties").select("*, taken(*)").order("datum", { ascending: true }),
      supabase.from("instellingen").select("domein,afdelingen,leidinggevenden,locaties").eq("id", 1).maybeSingle(),
      supabase.from("afdelingen").select("naam,manager_naam,manager_email").order("naam"),
    ]);
    if (!a.error) setAfdelingen((a.data as Afdeling[]) || []);
    if (m.error) setFout(m.error.message);
    else {
      setFout(null);
      setMutaties(
        (m.data as Mutatie[]).map((x) => ({ ...x, taken: (x.taken || []).slice().sort((a, b) => a.volgorde - b.volgorde) })),
      );
    }
    if (i.data) setInstellingen(i.data as Instellingen);
    setGeladen(true);
  }, []);

  useEffect(() => {
    herlaadProfielen().then(herlaad);
    // Live bijwerken: bij elke wijziging opnieuw ophalen (kort uitgesteld om pieken samen te nemen)
    let t: number | undefined;
    const plan = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => herlaad(), 300);
    };
    const kanaal = supabase
      .channel("mutaties-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "mutaties" }, plan)
      .on("postgres_changes", { event: "*", schema: "public", table: "taken" }, plan)
      .subscribe();
    return () => {
      window.clearTimeout(t);
      supabase.removeChannel(kanaal);
    };
  }, [herlaad, herlaadProfielen]);

  const naamVan = useCallback(
    (id: string | null | undefined) => {
      if (!id) return "Onbekend";
      const p = profielen[id];
      return p?.naam || p?.email || "Onbekend";
    },
    [profielen],
  );

  const waarde = useMemo<DataCtx>(
    () => ({
      session, profiel, rol: profiel?.rol ?? null, instellingen, afdelingen, mutaties, profielen, geladen, fout,
      herlaad, herlaadProfielen, naamVan, toast,
    }),
    [session, profiel, instellingen, afdelingen, mutaties, profielen, geladen, fout, herlaad, herlaadProfielen, naamVan, toast],
  );

  return (
    <Ctx.Provider value={waarde}>
      {children}
      {toastTekst && (
        <div className="toast" role="status">
          {toastTekst}
        </div>
      )}
    </Ctx.Provider>
  );
}
