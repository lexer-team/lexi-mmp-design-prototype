import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { conceptMetaPlugin } from "./vite-plugin-concept-meta";

export default defineConfig({
  cacheDir: "/tmp/vite-cache-sandbox-xyz",
  plugins: [react(), tailwindcss(), conceptMetaPlugin()],
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
});
