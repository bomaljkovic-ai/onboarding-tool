import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { configOk, supabase } from "./lib/supabase";
import { DataProvider, useData } from "./data";
import { ROL_LABEL } from "./lib/types";
import Login from "./pages/Login";
import Overzicht from "./pages/Overzicht";
import Nieuw from "./pages/Nieuw";
import Detail from "./pages/Detail";
import Beheer from "./pages/Beheer";
import NaamBanner from "./pages/NaamBanner";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [klaar, setKlaar] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setKlaar(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configOk) {
    return (
      <div className="center gut">
        <div className="panel card">
          <h1>Nog niet ingesteld</h1>
          <p style={{ margin: 0 }}>
            De verbinding met Supabase ontbreekt. Vul <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in, lokaal in
            <code> .env.local</code> of bij je hostingdienst als omgevingsvariabelen. Zie de README.
          </p>
        </div>
      </div>
    );
  }
  if (!klaar) return <div className="center"><span className="sub">Laden…</span></div>;
  if (!session) return <Login />;
  return (
    <DataProvider session={session}>
      <Shell />
    </DataProvider>
  );
}

function Shell() {
  const { profiel, rol, geladen, session, mutaties } = useData();
  const open = mutaties.filter((m) => !m.ingetrokken && (m.taken || []).some((t) => !t.klaar)).length;
  const uitloggen = () => supabase.auth.signOut();

  const kop = (
    <header className="bar">
      <div className="titlebar">
        <span className="tb-title">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="11" fill="#C0C0C0" stroke="#000" /><rect x="2" y="3" width="12" height="2" fill="#000080" /><circle cx="6" cy="9" r="2" fill="#FFD800" stroke="#000" /><path d="M9 8h4M9 10h3" stroke="#000" /></svg>
          Personeelsmutaties
        </span>
        <span className="tb-ctrl" aria-hidden="true"><i>_</i><i>□</i><i>×</i></span>
      </div>
      <div className="menubar">
        {rol && (
          <nav className="tabs" aria-label="Onderdelen">
            <NavLink to="/overzicht">Overzicht</NavLink>
            {(rol === "hr" || rol === "beheer") && <NavLink to="/nieuw">Nieuwe mutatie</NavLink>}
            {rol === "beheer" && <NavLink to="/beheer">Beheer</NavLink>}
          </nav>
        )}
        <div className="who">
          <span>
            {profiel?.naam || session.user.email}
            {rol ? ` · ${ROL_LABEL[rol]}` : ""}
          </span>
          <button type="button" onClick={uitloggen}>Afmelden</button>
        </div>
      </div>
    </header>
  );
  const status = (
    <footer className="statusbar">
      <span>{geladen ? "Gereed" : "Bezig met laden…"}</span>
      <span>{mutaties.length} mutaties</span>
      <span>{open} open</span>
      <span>{profiel?.naam || session.user.email}</span>
    </footer>
  );
  const venster = (inhoud: ReactNode) => <div className="window">{kop}{inhoud}{status}</div>;

  if (!geladen && !profiel) return venster(<main className="gut"><div className="empty">Laden…</div></main>);

  if (!rol) {
    return venster(
        <main className="gut">
          <div className="panel" style={{ maxWidth: 640 }}>
            <h1>Nog geen toegang</h1>
            <p style={{ margin: 0 }}>
              Je bent ingelogd als <strong>{session.user.email}</strong>, maar je hebt nog geen rol. Vraag iemand met de rol Beheer om je de
              rol HR of IT te geven. Daarna kun je deze pagina vernieuwen.
            </p>
          </div>
        </main>
    );
  }

  return venster(
      <main className="gut">
        <NaamBanner />
        <Routes>
          <Route path="/overzicht" element={<Overzicht />} />
          <Route path="/nieuw" element={rol === "it" ? <Navigate to="/overzicht" replace /> : <Nieuw />} />
          <Route path="/m/:id" element={<Detail />} />
          <Route path="/beheer" element={rol === "beheer" ? <Beheer /> : <Navigate to="/overzicht" replace />} />
          <Route path="*" element={<Navigate to="/overzicht" replace />} />
        </Routes>
      </main>
  );
}
