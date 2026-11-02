import { useEffect, useState } from "react";
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
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      // inlogcode uit het adres halen na het openen van de e-maillink
      if (s && window.location.search.includes("code=")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  if (!configOk) {
    return (
      <div className="center gut">
        <div className="panel card">
          <h1>Nog niet ingesteld</h1>
          <p style={{ margin: 0 }}>
            De verbinding met Supabase ontbreekt. Vul <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code> in, lokaal in
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
  const { profiel, rol, geladen, session } = useData();
  const uitloggen = () => supabase.auth.signOut();

  const kop = (
    <header className="bar">
      <div className="bar-in gut">
        <div className="brand">
          <i aria-hidden="true">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
            </svg>
          </i>
          Personeelsmutaties
        </div>
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
          <button type="button" onClick={uitloggen}>Uitloggen</button>
        </div>
      </div>
    </header>
  );

  if (!geladen && !profiel) return <>{kop}<main className="gut"><div className="empty">Laden…</div></main></>;

  if (!rol) {
    return (
      <>
        {kop}
        <main className="gut">
          <div className="panel" style={{ maxWidth: 640 }}>
            <h1>Nog geen toegang</h1>
            <p style={{ margin: 0 }}>
              Je bent ingelogd als <strong>{session.user.email}</strong>, maar je hebt nog geen rol. Vraag iemand met de rol Beheer om je de
              rol HR of IT te geven. Daarna kun je deze pagina vernieuwen.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {kop}
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
    </>
  );
}
