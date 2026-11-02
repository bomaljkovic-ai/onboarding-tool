import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useData } from "../data";
import { ROL_LABEL, type Afdeling, type Rol } from "../lib/types";
import { foutTekst, lijst } from "../lib/util";

export default function Beheer() {
  const { instellingen, afdelingen, profielen, session, toast, herlaad, herlaadProfielen } = useData();
  const [afdRijen, setAfdRijen] = useState<Afdeling[]>(afdelingen);
  useEffect(() => setAfdRijen(afdelingen), [afdelingen]);

  const zetAfd = (i: number, k: keyof Afdeling, v: string) =>
    setAfdRijen((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  async function bewaarAfdelingen() {
    const rijen = afdRijen
      .map((a) => ({ naam: a.naam.trim(), manager_naam: (a.manager_naam || "").trim() || null, manager_email: (a.manager_email || "").trim().toLowerCase() || null }))
      .filter((a) => a.naam);
    const namen = rijen.map((a) => a.naam);
    if (new Set(namen).size !== namen.length) return toast("Elke afdeling mag maar één keer voorkomen.");
    const weg = afdelingen.map((a) => a.naam).filter((n) => !namen.includes(n));
    if (weg.length) {
      const { error } = await supabase.from("afdelingen").delete().in("naam", weg);
      if (error) return toast(foutTekst(error));
    }
    if (rijen.length) {
      const { error } = await supabase.from("afdelingen").upsert(rijen, { onConflict: "naam" });
      if (error) return toast(foutTekst(error));
    }
    toast("Afdelingen opgeslagen");
    herlaad();
  }
  const [domein, setDomein] = useState(instellingen.domein);
  const [afd, setAfd] = useState(instellingen.afdelingen.join("\n"));
  const [lg, setLg] = useState(instellingen.leidinggevenden.join("\n"));
  const [loc, setLoc] = useState(instellingen.locaties.join("\n"));

  useEffect(() => {
    setDomein(instellingen.domein);
    setAfd(instellingen.afdelingen.join("\n"));
    setLg(instellingen.leidinggevenden.join("\n"));
    setLoc(instellingen.locaties.join("\n"));
  }, [instellingen]);

  async function opslaan(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("instellingen").update({
      domein: domein.trim().replace(/^@/, ""), afdelingen: lijst(afd), leidinggevenden: lijst(lg), locaties: lijst(loc),
    }).eq("id", 1);
    if (error) return toast(foutTekst(error));
    toast("Instellingen opgeslagen");
    herlaad();
  }

  async function zetRol(id: string, rol: string) {
    const { error } = await supabase.rpc("zet_rol", { gebruiker: id, nieuwe_rol: rol || null });
    if (error) return toast(foutTekst(error));
    toast("Rol aangepast");
    herlaadProfielen();
  }

  const gebruikers = Object.values(profielen).sort((a, b) => a.email.localeCompare(b.email));

  return (
    <>
      <div><h1>Beheer</h1><p className="lede">Instellingen voor het formulier en wie welke rol heeft.</p></div>

      <form className="panel" onSubmit={opslaan} noValidate>
        <h2>Instellingen</h2>
        <div className="grid">
          <div><label htmlFor="b-domein">E-maildomein voor nieuwe accounts</label><input type="text" id="b-domein" className="mono" placeholder="bedrijf.nl" value={domein} onChange={(e) => setDomein(e.target.value)} /></div>
        </div>
        <div className="grid">
          <div><label htmlFor="b-loc">Werklocaties (één per regel)</label><textarea id="b-loc" style={{ minHeight: 120 }} value={loc} onChange={(e) => setLoc(e.target.value)} /></div>
        </div>
        <div className="actions"><button type="submit" className="btn pri">Opslaan</button></div>
      </form>

      <section className="panel">
        <h2>Afdelingen en managers</h2>
        <p className="sub" style={{ margin: 0 }}>Kiest HR een afdeling in het formulier, dan wordt de manager automatisch ingevuld. Het Entra-script stelt deze persoon ook in als manager.</p>
        <div className="tablewrap" style={{ border: 0 }}>
          <table style={{ minWidth: 680 }}>
            <thead><tr><th>Afdeling</th><th>Manager</th><th>E-mailadres manager</th><th><span className="sr">Verwijderen</span></th></tr></thead>
            <tbody>
              {afdRijen.map((a, i) => (
                <tr key={i}>
                  <td><label className="sr" htmlFor={`afd-n-${i}`}>Afdeling</label><input type="text" id={`afd-n-${i}`} value={a.naam} onChange={(e) => zetAfd(i, "naam", e.target.value)} /></td>
                  <td><label className="sr" htmlFor={`afd-m-${i}`}>Manager</label><input type="text" id={`afd-m-${i}`} value={a.manager_naam || ""} onChange={(e) => zetAfd(i, "manager_naam", e.target.value)} /></td>
                  <td><label className="sr" htmlFor={`afd-e-${i}`}>E-mail</label><input type="email" id={`afd-e-${i}`} className="mono" value={a.manager_email || ""} onChange={(e) => zetAfd(i, "manager_email", e.target.value)} /></td>
                  <td style={{ width: 60 }}><button type="button" className="btn" aria-label={`Verwijder ${a.naam || "rij"}`} onClick={() => setAfdRijen((r) => r.filter((_, j) => j !== i))}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="actions" style={{ justifyContent: "space-between" }}>
          <button type="button" className="btn" onClick={() => setAfdRijen((r) => [...r, { naam: "", manager_naam: "", manager_email: "" }])}>Afdeling toevoegen</button>
          <button type="button" className="btn pri" onClick={bewaarAfdelingen}>Afdelingen opslaan</button>
        </div>
      </section>

      <section className="panel">
        <h2>Gebruikers en rollen</h2>
        <p className="sub" style={{ margin: 0 }}>
          HR geeft mutaties door. IT vinkt taken af. Beheer kan alles en past deze pagina aan. Zonder rol kan iemand niets zien.
        </p>
        <div className="tablewrap" style={{ border: 0 }}>
          <table style={{ minWidth: 520 }}>
            <thead><tr><th>Naam</th><th>E-mailadres</th><th>Rol</th></tr></thead>
            <tbody>
              {gebruikers.map((g) => (
                <tr key={g.id}>
                  <td>{g.naam || <span className="sub">Nog niet ingevuld</span>}</td>
                  <td className="mono" style={{ fontSize: 14 }}>{g.email}</td>
                  <td style={{ width: 180 }}>
                    <label htmlFor={"rol-" + g.id} className="sr">Rol van {g.email}</label>
                    <select id={"rol-" + g.id} value={g.rol || ""} disabled={g.id === session.user.id} onChange={(e) => zetRol(g.id, e.target.value)}>
                      <option value="">Geen toegang</option>
                      {(Object.keys(ROL_LABEL) as Rol[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel note" style={{ padding: 16 }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            <strong>Nieuwe collega toegang geven:</strong> nodig het e-mailadres uit in Supabase › Authentication › Users › Invite user.
            De persoon verschijnt dan in deze lijst. Geef een rol en vernieuw zo nodig de pagina.
          </p>
        </div>
      </section>
    </>
  );
}
