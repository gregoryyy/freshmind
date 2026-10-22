import { defineConfig } from "vite";
import { readFileSync, readdirSync } from "node:fs";

export default defineConfig({
  build: { outDir: "demo-dist" },
  plugins: [{
    name: "include-original-notices",
    generateBundle() {
      for (const fileName of ["LICENSE", "NOTICE"]) {
        this.emitFile({ type: "asset", fileName, source: readFileSync(new URL(fileName, import.meta.url), "utf8") });
      }
      const modules = new URL("node_modules/", import.meta.url);
      const licenses = readdirSync(modules).filter(name => name.startsWith("d3-")).sort()
        .map(name => `${name}\n\n${readFileSync(new URL(`${name}/LICENSE`, modules), "utf8")}`).join("\n\n");
      this.emitFile({ type: "asset", fileName: "LICENSES-D3.txt", source: licenses });
    }
  }]
});
