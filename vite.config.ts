import { defineConfig } from "vite";
import { readFileSync, readdirSync } from "node:fs";

export default defineConfig({
  build: { outDir: "demo-dist", rollupOptions: { input: {
    index: new URL("./index.html", import.meta.url).pathname,
    freshmind: new URL("./freshmind.html", import.meta.url).pathname
  } } },
  plugins: [{
    name: "include-original-notices",
    generateBundle() {
      for (const fileName of ["LICENSE", "LICENSE-APACHE-2.0", "NOTICE"]) {
        this.emitFile({ type: "asset", fileName, source: readFileSync(new URL(fileName, import.meta.url), "utf8") });
      }
      const modules = new URL("node_modules/", import.meta.url);
      const licenses = readdirSync(modules).filter(name => name.startsWith("d3-")).sort()
        .map(name => `${name}\n\n${readFileSync(new URL(`${name}/LICENSE`, modules), "utf8")}`).join("\n\n");
      this.emitFile({ type: "asset", fileName: "LICENSES-D3.txt", source: licenses });
      this.emitFile({ type: "asset", fileName: "LICENSE-YAML.txt", source: readFileSync(new URL("yaml/LICENSE", modules), "utf8") });
    }
  }]
});
