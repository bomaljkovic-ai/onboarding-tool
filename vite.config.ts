import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" zodat de build op elke host en in elke submap werkt
export default defineConfig({
  plugins: [react()],
  base: "./",
});
