import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useData } from "../data";
import { SYSTEMEN, type Soort } from "../lib/types";
import { foutTekst } from "../lib/util";

interface Form {
  soort: Soort; voornaam: string; achternaam: string; prive_email: string; telefoon: string; huidig_account: string;
  functie: string; afdeling: string; leidinggevende: string; leidinggevende_email: string; datum: string; contract: string; locatie: string;
  systemen: string[]; opmerking: string;
}

const leeg = (locatie: string): Form => ({
  soort: "in", voornaam: "", achternaam: "", prive_email: "", telefoon: "", huidig_account: "", functie: "", afdeling: "",
  leidinggevende: "", leidinggevende_email: "", datum: "", contract: "", locatie, systemen: ["entra", "laptop"], opmerking: "",
});

export default function Nieuw() {
  const { instellingen, afdelingen, toast, herlaad } = useData();
  const afdNamen = afdelingen.length ? afdelingen.map((a) => a.naam) : instellingen.afdelingen;
  const managers = afdelingen.filter((a) => a.manager_naam);

  // Afdeling gekozen: leidinggevende van die afdeling invullen
  const kiesAfdeling = (naam: string) => {
    const a = afdelingen.find((x) => x.naam === naam);
    setF((o) => ({ ...o, afdeling: naam, leidinggevende: a?.manager_naam || "", leidinggevende_email: a?.manager_email || "" }));
    if (fouten.afdeling) setFouten((o) => { const n = { ...o }; delete n.afdeling; return n; });
  };
  // Leidinggevende getypt of gekozen: e-mail erbij zoeken
  const kiesLeidinggevende = (naam: string) => {
    const a = managers.find((x) => x.manager_naam?.toLowerCase() === naam.trim().toLowerCase());
    setF((o) => ({ ...o, leidinggevende: naam, leidinggevende_email: a ? a.manager_email || "" : o.leidinggevende_email }));
  };
  const [f, setF] = useState<Form>(() => leeg(instellingen.locaties[0] || ""));
  const [fouten, setFouten] = useState<Record<string, string>>({});
  const [bezig, setBezig] = useState(false);
  const nav = useNavigate();

  const zet = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((o) => ({ ...o, [k]: v }));
    if (fouten[k as string]) setFouten((o) => { const n = { ...o }; delete n[k as string]; return n; });
  };
  const wisselSys = (id: string, aan: boolean) =>
    setF((o) => ({ ...o, systemen: aan ? [...o.systemen.filter((x) => x !== id), id] : o.systemen.filter((x) => x !== id) }));

  async function verstuur(e: FormEvent) {
    e.preventDefault();
    const fo: Record<string, string> = {};
    if (!f.voornaam.trim()) fo.voornaam = "Vul de voornaam in.";
    if (!f.achternaam.trim()) fo.achternaam = "Vul de achternaam in.";
    if (!f.functie.trim()) fo.functie = "Vul de functie in.";
    if (!f.afdeling) fo.afdeling = "Kies een afdeling.";
    if (!f.datum) fo.datum = "Kies een datum.";
    setFouten(fo);
    if (Object.keys(fo).length) {
      document.getElementById("f-" + Object.keys(fo)[0])?.focus();
      return;
    }
    setBezig(true);
    const payload = {
      ...f,
      voornaam: f.voornaam.trim(), achternaam: f.achternaam.trim(), functie: f.functie.trim(),
      prive_email: f.soort === "in" ? f.prive_email.trim() : "", telefoon: "",
      huidig_account: f.soort === "in" ? "" : f.huidig_account.trim(),
      systemen: SYSTEMEN.map((s) => s.id).filter((id) => f.systemen.includes(id)),
    };
    const { data, error } = await supabase.rpc("nieuwe_mutatie", { m: payload });
    setBezig(false);
    if (error) { toast(foutTekst(error)); return; }
    toast("Doorgestuurd naar IT");
    await herlaad();
    nav(`/m/${data}`);
  }

  const s = f.soort;
  const datumLabel = s === "in" ? "Eerste werkdag" : s === "uit" ? "Laatste werkdag" : "Ingangsdatum";
  const sysVraag = s === "in" ? "Wat heeft deze persoon nodig?" : s === "uit" ? "Waar heeft deze persoon toegang toe?" : "Welke systemen moeten worden aangepast?";
  const err = (k: string) => (fouten[k] ? <div className="err">{fouten[k]}</div> : null);
  const soortKnop = (k: Soort, t: string) => (
    <button type="button" aria-pressed={s === k} onClick={() => { setF((o) => ({ ...o, soort: k })); setFouten({}); }}>{t}</button>
  );

  return (
    <div className="row">
      <form className="grow panel" onSubmit={verstuur} noValidate>
        <div><h1>Mutatie doorgeven</h1><p className="lede">IT ziet de mutatie direct in het overzicht, met de taken die erbij horen.</p></div>

        <fieldset><legend>Soort mutatie</legend>
          <div className="seg">{soortKnop("in", "Indiensttreding")}{soortKnop("uit", "Uitdiensttreding")}{soortKnop("wijziging", "Functie- of afdelingswijziging")}</div>
        </fieldset>

        <fieldset><legend>Medewerker</legend>
          <div className="grid">
            <div><label htmlFor="f-voornaam" className="req">Voornaam</label><input type="text" id="f-voornaam" value={f.voornaam} onChange={(e) => zet("voornaam", e.target.value)} />{err("voornaam")}</div>
            <div><label htmlFor="f-achternaam" className="req">Achternaam</label><input type="text" id="f-achternaam" value={f.achternaam} onChange={(e) => zet("achternaam", e.target.value)} />{err("achternaam")}</div>
            {s === "in" ? (
              <>
                <div><label htmlFor="f-prive">Privé e-mail (voor welkomstmail)</label><input type="email" id="f-prive" value={f.prive_email} onChange={(e) => zet("prive_email", e.target.value)} /></div>
              </>
            ) : (
              <div><label htmlFor="f-acc">Huidig e-mailadres op het werk</label><input type="email" id="f-acc" placeholder="voornaam.achternaam@…" value={f.huidig_account} onChange={(e) => zet("huidig_account", e.target.value)} /></div>
            )}
          </div>
        </fieldset>

        <fieldset><legend>{s === "wijziging" ? "Nieuwe functie en planning" : "Functie en planning"}</legend>
          <div className="grid">
            <div><label htmlFor="f-functie" className="req">Functie</label><input type="text" id="f-functie" value={f.functie} onChange={(e) => zet("functie", e.target.value)} />{err("functie")}</div>
            <div>
              <label htmlFor="f-afdeling" className="req">Afdeling</label>
              <select id="f-afdeling" value={f.afdeling} onChange={(e) => kiesAfdeling(e.target.value)}>
                <option value="">Kies…</option>
                {afdNamen.map((x) => <option key={x}>{x}</option>)}
              </select>{err("afdeling")}
            </div>
            <div>
              <label htmlFor="f-lg">Leidinggevende</label>
              <input type="text" id="f-lg" list="lg-lijst" value={f.leidinggevende} onChange={(e) => kiesLeidinggevende(e.target.value)} />
              <datalist id="lg-lijst">
                {(managers.length ? managers.map((a) => a.manager_naam as string) : instellingen.leidinggevenden).map((x) => <option key={x} value={x} />)}
              </datalist>
            </div>
            <div><label htmlFor="f-lg-mail">E-mail leidinggevende</label><input type="email" id="f-lg-mail" value={f.leidinggevende_email} onChange={(e) => zet("leidinggevende_email", e.target.value)} /></div>
            <div><label htmlFor="f-datum" className="req">{datumLabel}</label><input type="date" id="f-datum" value={f.datum} onChange={(e) => zet("datum", e.target.value)} />{err("datum")}</div>
            <div>
              <label htmlFor="f-loc">Werklocatie</label>
              <select id="f-loc" value={f.locatie} onChange={(e) => zet("locatie", e.target.value)}>
                <option value="">Kies…</option>
                {instellingen.locaties.map((x) => <option key={x}>{x}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset><legend>{sysVraag}</legend>
          <div className="checks">
            {SYSTEMEN.map((x) => (
              <label key={x.id} className="check">
                <input type="checkbox" checked={f.systemen.includes(x.id)} onChange={(e) => wisselSys(x.id, e.target.checked)} /> {x.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div><label htmlFor="f-opm">Opmerkingen voor IT</label><textarea id="f-opm" value={f.opmerking} onChange={(e) => zet("opmerking", e.target.value)} /></div>

        <div className="actions">
          <button type="button" className="btn" onClick={() => { setF(leeg(instellingen.locaties[0] || "")); setFouten({}); }}>Formulier leegmaken</button>
          <button type="submit" className="btn pri" disabled={bezig}>{bezig ? "Bezig met doorsturen…" : "Doorsturen naar IT"}</button>
        </div>
      </form>

      <aside className="side">
        <div className="panel"><h2>Na het doorsturen</h2>
          <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "var(--ink-2)" }}>
            <li>De mutatie staat direct in het IT-overzicht.</li>
            <li>Er wordt automatisch een takenlijst gemaakt op basis van de gekozen systemen.</li>
            <li>IT werkt de taken af en ziet wat er nog openstaat.</li>
          </ol>
        </div>
        <div className="panel note">
          <h2 style={{ color: "var(--warn-ink)" }}>Graag op tijd doorgeven</h2>
          <p style={{ margin: 0, fontSize: 14 }}>Minimaal 10 werkdagen voor een indiensttreding, zodat de laptop en accounts klaar zijn. Bij onverwacht vertrek: geef het direct door.</p>
        </div>
      </aside>
    </div>
  );
}
