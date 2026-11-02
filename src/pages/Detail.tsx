import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useData } from "../data";
import { SOORT_LABEL, SYSTEMEN, type Logregel, type Mutatie, type Taak } from "../lib/types";
import { fmtDatum, fmtMoment, foutTekst, scriptEntra, status, stelUpnVoor, voortgang, volledigeNaam, wanneer } from "../lib/util";

export default function Detail() {
  const { id = "" } = useParams();
  const { mutaties, geladen, rol, instellingen, naamVan, toast, herlaad, session } = useData();
  const m = mutaties.find((x) => x.id === id);
  const [log, setLog] = useState<Logregel[]>([]);
  const [notitie, setNotitie] = useState("");
  const [upn, setUpn] = useState("");
  const [bevestig, setBevestig] = useState(false);

  const laadLog = useCallback(async () => {
    const { data } = await supabase.from("logboek").select("*").eq("mutatie_id", id).order("op", { ascending: false });
    setLog((data as Logregel[]) || []);
  }, [id]);

  useEffect(() => {
    laadLog();
    const k = supabase
      .channel("log-" + id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "logboek", filter: `mutatie_id=eq.${id}` }, laadLog)
      .subscribe();
    return () => { supabase.removeChannel(k); };
  }, [id, laadLog]);

  useEffect(() => {
    if (m) setUpn(m.upn || stelUpnVoor(m, instellingen.domein));
  }, [m?.id, m?.upn, instellingen.domein]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!m) {
    return (
      <>
        <Link className="back" to="/overzicht">← Terug naar overzicht</Link>
        <div className="panel"><div className="empty"><strong>{geladen ? "Deze mutatie bestaat niet (meer)" : "Mutatie laden…"}</strong></div></div>
      </>
    );
  }

  const magAfvinken = rol === "it" || rol === "beheer";
  const magIntrekken = rol === "hr" || rol === "beheer";
  const p = voortgang(m), st = status(m);
  const datumLabel = m.soort === "in" ? "start" : m.soort === "uit" ? "laatste werkdag" : "ingangsdatum";
  const heeft = (s: string) => m.systemen.includes(s);
  const huidigeUpn = upn.trim() || stelUpnVoor(m, instellingen.domein);

  async function schrijfLog(tekst: string) {
    await supabase.from("logboek").insert({ mutatie_id: m!.id, tekst, door: session.user.id });
  }

  async function wisselTaak(t: Taak, klaar: boolean) {
    const { error } = await supabase.from("taken")
      .update(klaar ? { klaar: true, klaar_door: session.user.id, klaar_op: new Date().toISOString() } : { klaar: false, klaar_door: null, klaar_op: null })
      .eq("id", t.id);
    if (error) return toast(foutTekst(error));
    await schrijfLog((klaar ? "Afgevinkt: " : "Weer open gezet: ") + t.omschrijving);
    herlaad();
  }

  async function bewaarUpn() {
    const v = upn.trim();
    if (!v || v === m!.upn) return;
    const { error } = await supabase.from("mutaties").update({ upn: v }).eq("id", m!.id);
    if (error) return toast(foutTekst(error));
    await schrijfLog("Gebruikersnaam vastgelegd: " + v);
    toast("Gebruikersnaam opgeslagen");
    herlaad();
  }

  async function bewaarNotitie() {
    const v = notitie.trim();
    if (!v) return;
    setNotitie("");
    await schrijfLog("Notitie: " + v);
  }

  async function intrekken() {
    setBevestig(false);
    const nieuw = !m!.ingetrokken;
    const { error } = await supabase.from("mutaties").update({ ingetrokken: nieuw }).eq("id", m!.id);
    if (error) return toast(foutTekst(error));
    await schrijfLog(nieuw ? "Mutatie ingetrokken" : "Mutatie teruggezet");
    herlaad();
  }

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(scriptEntra(m!, huidigeUpn));
      toast("Script gekopieerd");
    } catch {
      toast("Kopiëren lukte niet. Selecteer het script en kopieer met Cmd+C of Ctrl+C.");
    }
  }

  return (
    <>
      <Link className="back" to="/overzicht">← Terug naar overzicht</Link>
      <div className="head">
        <div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <h1>{volledigeNaam(m)}</h1>
            <span className={`pill ${m.soort}`}>{SOORT_LABEL[m.soort]}</span>
            <span className={`pill ${st.cls}`}>{st.label}</span>
          </div>
          <p className="lede">{m.functie} · {m.afdeling} · {datumLabel} {fmtDatum(m.datum, true)} ({wanneer(m.datum)})</p>
        </div>
        <span className="sub">{p.klaar} van {p.totaal} taken klaar</span>
      </div>

      {bevestig && (
        <div className="confirm">
          <span>Weet je zeker dat je deze mutatie wilt {m.ingetrokken ? "terugzetten" : "intrekken"}?</span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn" onClick={() => setBevestig(false)}>Nee</button>
            <button type="button" className={`btn ${m.ingetrokken ? "pri" : "danger"}`} onClick={intrekken}>Ja, {m.ingetrokken ? "terugzetten" : "intrekken"}</button>
          </span>
        </div>
      )}

      <div className="row">
        <div className="grow">
          <section className="panel">
            <h2>Taken voor IT</h2>
            {!magAfvinken && <p className="sub" style={{ margin: 0 }}>Alleen IT kan taken afvinken. Je ziet hier de voortgang.</p>}
            <div className="tasks">
              {(m.taken || []).map((t) => (
                <label key={t.id} className={`task${t.klaar ? " is-done" : ""}`}>
                  <input type="checkbox" checked={t.klaar} disabled={!magAfvinken} onChange={(e) => wisselTaak(t, e.target.checked)} />
                  <span>
                    <span className="t">{t.omschrijving}</span>
                    {t.klaar && t.klaar_op && <span className="sub" style={{ display: "block" }}>Afgevinkt door {naamVan(t.klaar_door)}, {fmtMoment(t.klaar_op)}</span>}
                  </span>
                </label>
              ))}
            </div>
          </section>

          {heeft("entra") && (
            <section className="panel">
              <h2>Microsoft 365-account (Entra)</h2>
              <div className="grid">
                <div>
                  <label htmlFor="d-upn">{m.soort === "in" ? "Gebruikersnaam (voorstel, pas aan waar nodig)" : "Account"}</label>
                  <input type="text" id="d-upn" className="mono" value={upn} onChange={(e) => setUpn(e.target.value)} onBlur={bewaarUpn} readOnly={!magAfvinken} />
                </div>
              </div>
              <p className="sub" style={{ margin: 0 }}>
                {m.soort === "in" ? "Plak dit script in PowerShell op een beheerders-pc. Vul eerst een tijdelijk wachtwoord in."
                  : m.soort === "uit" ? "Voer dit uit op de laatste werkdag, na werktijd." : "Werkt functie en afdeling bij op het bestaande account."}
              </p>
              <pre className="code">{scriptEntra(m, huidigeUpn)}</pre>
              <div><button type="button" className="btn" onClick={kopieer}>Kopieer script</button></div>
            </section>
          )}

          {heeft("shopify") && (
            <section className="panel">
              <h2>Shopify</h2>
              <dl className="facts">
                <div><dt>E-mailadres</dt><dd className="mono">{huidigeUpn}</dd></div>
                <div><dt>Waar</dt><dd>Shopify-admin › Instellingen › Gebruikers</dd></div>
                <div><dt>Actie</dt><dd>{m.soort === "in" ? `Medewerker uitnodigen, rechten zoals collega's op ${m.afdeling}` : m.soort === "uit" ? "Account deactiveren of verwijderen" : `Rechten aanpassen aan ${m.afdeling}`}</dd></div>
              </dl>
            </section>
          )}

          <Gegevens m={m} />
        </div>

        <aside className="side">
          {m.opmerking && <div className="panel"><h2>Opmerking van HR</h2><p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-line" }}>{m.opmerking}</p></div>}
          <div className="panel">
            <h2>Logboek</h2>
            <ol className="log">
              {log.map((l) => (
                <li key={l.id}><div className="sub">{fmtMoment(l.op)} · {naamVan(l.door)}</div>{l.tekst}</li>
              ))}
            </ol>
            <div><label htmlFor="d-notitie">Notitie toevoegen</label><textarea id="d-notitie" style={{ minHeight: 64 }} value={notitie} onChange={(e) => setNotitie(e.target.value)} /></div>
            <div><button type="button" className="btn" onClick={bewaarNotitie}>Notitie opslaan</button></div>
          </div>
          {magIntrekken && (
            <div className="panel">
              <h2>Mutatie</h2>
              <p className="sub" style={{ margin: 0 }}>Gaat de indienst- of uitdiensttreding niet door? Trek de mutatie dan in. Ze blijft bewaard in het archief.</p>
              <div>
                <button type="button" className={`btn ${m.ingetrokken ? "" : "danger"}`} onClick={() => { setBevestig(true); window.scrollTo(0, 0); }}>
                  {m.ingetrokken ? "Terugzetten" : "Mutatie intrekken"}
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Gegevens({ m }: { m: Mutatie }) {
  const rij = (k: string, v: string | null | undefined) => <div><dt>{k}</dt><dd>{v || "—"}</dd></div>;
  return (
    <section className="panel">
      <h2>Gegevens van HR</h2>
      <dl className="facts">
        {rij("Naam", volledigeNaam(m))}
        {rij("Functie", m.functie)}
        {rij("Afdeling", m.afdeling)}
        {rij("Leidinggevende", [m.leidinggevende, m.leidinggevende_email].filter(Boolean).join(" · "))}
        {rij("Datum", fmtDatum(m.datum, true))}
        {rij("Werklocatie", m.locatie)}
        {m.soort === "in" ? (<>{rij("Privé e-mail", m.prive_email)}</>) : rij("Huidig e-mailadres", m.huidig_account)}
        {rij("Systemen", m.systemen.map((id) => SYSTEMEN.find((s) => s.id === id)?.label || id).join(", "))}
      </dl>
    </section>
  );
}
