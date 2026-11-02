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

  const naam = profiel?.naam || session.user.email || "";
  const initialen = naam.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
  const kop = (
    <header className="topbar">
      <div className="tb-left">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" className="waffle">
          {[2, 8, 14].flatMap((y) => [2, 8, 14].map((x) => <rect key={`${x}-${y}`} x={x - 1.5} y={y - 1.5} width="3" height="3" rx="0.5" />))}
        </svg>
        <span className="app">Personeelsmutaties</span>
      </div>
      <div className="tb-right">
        <span className="who-text">
          <span className="who-name">{naam}</span>
          {rol && <span className="who-rol">{ROL_LABEL[rol]}</span>}
        </span>
        <span className="avatar" aria-hidden="true">{initialen}</span>
        <button type="button" className="tb-btn" onClick={uitloggen}>Afmelden</button>
      </div>
    </header>
  );
  const ico = {
    home: <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z" />,
    nieuw: <><circle cx="8" cy="7" r="3" /><path d="M2.5 17c.5-3 2.7-4.5 5.5-4.5 1.2 0 2.3.3 3.2.8M15 11v6M12 14h6" /></>,
    beheer: <><circle cx="10" cy="10" r="2.5" /><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4" /></>,
  };
  const Ico = ({ d }: { d: ReactNode }) => (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
  const nav = rol ? (
    <nav className="sidenav" aria-label="Onderdelen">
      <NavLink to="/overzicht"><Ico d={ico.home} /><span>Overzicht</span></NavLink>
      {(rol === "hr" || rol === "beheer") && <NavLink to="/nieuw"><Ico d={ico.nieuw} /><span>Nieuwe mutatie</span></NavLink>}
      {rol === "beheer" && <NavLink to="/beheer"><Ico d={ico.beheer} /><span>Beheer</span></NavLink>}
      <div className="nav-foot">{mutaties.length} mutaties · {open} open</div>
    </nav>
  ) : null;
  const venster = (inhoud: ReactNode) => (
    <div className="shell">
      {kop}
      <div className="shell-body">{nav}{inhoud}</div>
    </div>
  );

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
