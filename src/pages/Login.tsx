import { useState, type FormEvent } from "react";
import { linkFout, supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(linkFout);

  async function verstuur(e: FormEvent) {
    e.preventDefault();
    setFout(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setFout("Vul een geldig e-mailadres in.");
      return;
    }
    setBezig(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin + window.location.pathname },
    });
    setBezig(false);
    if (error) {
      if (/signups not allowed|not found|user not found/i.test(error.message)) {
        setFout("Dit e-mailadres heeft geen toegang. Vraag Beheer om je uit te nodigen.");
      } else if (/rate limit|seconds/i.test(error.message)) {
        setFout("Er is net al een link verstuurd. Wacht een minuut en probeer het opnieuw.");
      } else setFout(error.message);
      return;
    }
    setVerstuurd(true);
  }

  return (
    <div className="center gut">
      <div className="panel card">
        <div>
          <h1>Personeelsmutaties</h1>
          <p className="lede">Log in met je werk-e-mailadres. Je krijgt een link om in te loggen.</p>
        </div>
        {verstuurd ? (
          <div className="banner" role="status">
            <span>
              Check je mail op <strong>{email}</strong> en klik op de link.
            </span>
          </div>
        ) : (
          <form onSubmit={verstuur} noValidate style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label htmlFor="login-email">E-mailadres</label>
              <input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              {fout && <div className="err">{fout}</div>}
            </div>
            <button type="submit" className="btn pri" disabled={bezig} style={{ justifyContent: "center" }}>
              {bezig ? "Bezig…" : "Stuur inloglink"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
