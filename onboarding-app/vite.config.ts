import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin"
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), powerApps()],
  resolve: {
    // `vite --mode demo` swaps the connector services for in-memory fictional data
    // (used for recorded product tours). Normal dev/build never includes it.
    alias:
      mode === "demo"
        ? [{ find: /^\.\.\/generated$/, replacement: fileURLToPath(new URL("./src/demo/generated.ts", import.meta.url)) }]
        : [],
  },
}));
