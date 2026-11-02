import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { verwerkInlogLink } from "./lib/supabase";
import "./styles.css";

// Eerst een eventuele inloglink verwerken, dan pas de app (en de #/-navigatie) starten.
verwerkInlogLink().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  );
});
