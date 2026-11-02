import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useData } from "../data";
import { foutTekst } from "../lib/util";

// Vraagt eenmalig om een naam, zodat het logboek namen toont in plaats van e-mailadressen.
export default function NaamBanner() {
  const { profiel, herlaadProfielen, toast } = useData();
  const [naam, setNaam] = useState("");
  if (!profiel || profiel.naam) return null;

  async function opslaan() {
    if (!naam.trim() || !profiel) return;
    const { error } = await supabase.from("profielen").update({ naam: naam.trim() }).eq("id", profiel.id);
    if (error) toast(foutTekst(error));
    else {
      toast("Naam opgeslagen");
      herlaadProfielen();
    }
  }

  return (
    <div className="banner">
      <label htmlFor="mijn-naam" style={{ margin: 0, color: "inherit" }}>Hoe heet je? Je naam komt in het logboek te staan.</label>
      <span style={{ display: "flex", gap: 8, flex: "1 1 280px", maxWidth: 420 }}>
        <input id="mijn-naam" type="text" value={naam} onChange={(e) => setNaam(e.target.value)} placeholder="Voor- en achternaam" />
        <button type="button" className="btn pri" onClick={opslaan}>Opslaan</button>
      </span>
    </div>
  );
}
