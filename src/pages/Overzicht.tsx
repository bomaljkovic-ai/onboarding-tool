import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useData } from "../data";
import { SOORT_LABEL, SYSTEMEN, type Mutatie } from "../lib/types";
import { dagenTot, fmtDatum, status, voortgang, volledigeNaam, wanneer } from "../lib/util";

type Filter = "komend" | "open" | "archief" | "alles";

export default function Overzicht() {
  const { mutaties, geladen, fout, rol } = useData();
  const [filter, setFilter] = useState<Filter>("komend");
  const [zoek, setZoek] = useState("");
  const nav = useNavigate();

  const actief = mutaties.filter((m) => !m.ingetrokken);
  const binnen30 = (m: Mutatie) => { const n = dagenTot(m.datum); return n !== null && n >= 0 && n <= 30; };
  const in30 = actief.filter((m) => m.soort === "in" && binnen30(m)).length;
  const uit30 = actief.filter((m) => m.soort === "uit" && binnen30(m)).length;
  const openTaken = actief.reduce((s, m) => { const p = voortgang(m); return s + p.totaal - p.klaar; }, 0);

  const rijen = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    let r = mutaties.slice();
    if (filter === "komend")
      r = r.filter((m) => {
        if (m.ingetrokken) return false;
        const n = dagenTot(m.datum);
        return (n !== null && n >= -7 && n <= 30) || (status(m).key !== "klaar" && n !== null && n < 0);
      });
    else if (filter === "open") r = r.filter((m) => !m.ingetrokken && status(m).key !== "klaar");
    else if (filter === "archief") r = r.filter((m) => m.ingetrokken || status(m).key === "klaar");
    if (q) r = r.filter((m) => [volledigeNaam(m), m.functie, m.afdeling, m.leidinggevende].join(" ").toLowerCase().includes(q));
    r.sort((a, b) => a.datum.localeCompare(b.datum));
    if (filter === "archief") r.reverse();
    return r;
  }, [mutaties, filter, zoek]);

  function exportCsv() {
    const kol = ["Soort", "Voornaam", "Achternaam", "Functie", "Afdeling", "Leidinggevende", "Datum", "Werklocatie", "Systemen", "Taken klaar", "Taken totaal", "Status"];
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const regels = rijen.map((m) => {
      const p = voortgang(m);
      return [SOORT_LABEL[m.soort], m.voornaam, m.achternaam, m.functie, m.afdeling, m.leidinggevende, m.datum, m.locatie, m.systemen.join(" "), p.klaar, p.totaal, status(m).label].map(q).join(";");
    });
    const blob = new Blob(["﻿" + kol.map(q).join(";") + "\n" + regels.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "personeelsmutaties.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const knop = (k: Filter, t: string) => (
    <button type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{t}</button>
  );

  let inhoud;
  if (fout) inhoud = <div className="empty"><strong>Laden lukte niet</strong><span>{fout}</span></div>;
  else if (!geladen) inhoud = <div className="empty"><strong>Mutaties laden…</strong></div>;
  else if (!mutaties.length)
    inhoud = (
      <div className="empty">
        <strong>Nog geen mutaties</strong>
        <span>Zodra HR een indienst-, uitdienst- of wijzigingsformulier doorstuurt, verschijnt het hier met de taken voor IT.</span>
        {rol !== "it" && <Link className="btn pri" to="/nieuw">Eerste mutatie doorgeven</Link>}
      </div>
    );
  else if (!rijen.length) inhoud = <div className="empty"><strong>Niets in deze selectie</strong><span>Kies een ander filter of pas je zoekterm aan.</span></div>;
  else
    inhoud = (
      <table>
        <thead>
          <tr><th>Datum</th><th>Medewerker</th><th>Soort</th><th>Afdeling</th><th>Systemen</th><th>Voortgang</th><th>Status</th></tr>
        </thead>
        <tbody>
          {rijen.map((m) => {
            const p = voortgang(m), st = status(m);
            const pct = p.totaal ? Math.round((p.klaar / p.totaal) * 100) : 0;
            const kleur = m.soort === "uit" ? "var(--out-strong)" : m.soort === "wijziging" ? "var(--ch-strong)" : "var(--accent)";
            const sys = m.systemen.map((id) => SYSTEMEN.find((s) => s.id === id)?.kort || id).join(" · ");
            return (
              <tr key={m.id} className="klik" onClick={() => nav(`/m/${m.id}`)}>
                <td className="nowrap"><div style={{ fontWeight: 600 }}>{fmtDatum(m.datum)}</div><div className="sub">{wanneer(m.datum)}</div></td>
                <td>
                  <Link to={`/m/${m.id}`} style={{ color: "var(--ink)", fontWeight: 500, textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>{volledigeNaam(m)}</Link>
                  <div className="sub">{m.functie}</div>
                </td>
                <td><span className={`pill ${m.soort}`}>{SOORT_LABEL[m.soort]}</span></td>
                <td>{m.afdeling}</td>
                <td className="sub" style={{ color: "var(--ink-2)" }}>{sys || "—"}</td>
                <td>
                  <div className="prog">
                    <div className="track"><div className="fill" style={{ width: `${pct}%`, background: kleur }} /></div>
                    <span className="sub">{p.klaar} van {p.totaal}</span>
                  </div>
                </td>
                <td><span className={`pill ${st.cls}`}>{st.label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );

  return (
    <>
      <div className="head">
        <div><h1>Wie komt, wie gaat</h1><p className="lede">Alle mutaties die HR heeft doorgegeven, met de taken voor IT.</p></div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {rijen.length > 0 && <button type="button" className="btn" onClick={exportCsv}>Exporteer als CSV</button>}
          {rol !== "it" && <Link className="btn pri" to="/nieuw">Nieuwe mutatie</Link>}
        </div>
      </div>
      <div className="tiles">
        <div className="tile"><div className="k">In dienst, komende 30 dagen</div><div className="v in">{in30}</div></div>
        <div className="tile"><div className="k">Uit dienst, komende 30 dagen</div><div className="v out">{uit30}</div></div>
        <div className="tile"><div className="k">Openstaande IT-taken</div><div className="v">{openTaken}</div></div>
      </div>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Filter">
          {knop("komend", "Komende 30 dagen")}{knop("open", "Alles wat open staat")}{knop("archief", "Afgerond en ingetrokken")}{knop("alles", "Alles")}
        </div>
        <div style={{ flex: "1 1 220px", display: "flex", justifyContent: "flex-end", minWidth: 0 }}>
          <label htmlFor="zoek" className="sr">Zoeken</label>
          <input type="search" id="zoek" placeholder="Zoek op naam, functie of afdeling" value={zoek} onChange={(e) => setZoek(e.target.value)} />
        </div>
      </div>
      <div className="tablewrap">{inhoud}</div>
    </>
  );
}
