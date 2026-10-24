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
      for (const fileName of ["LICENSE", "licenses/LICENSE-APACHE-2.0", "licenses/LICENSE-GPL-3.0", "licenses/LICENSE-LGPL-2.0", "NOTICE"]) {
        this.emitFile({ type: "asset", fileName, source: readFileSync(new URL(fileName, import.meta.url), "utf8") });
      }
      const modules = new URL("node_modules/", import.meta.url);
      const licenses = readdirSync(modules).filter(name => name.startsWith("d3-")).sort()
        .map(name => `${name}\n\n${readFileSync(new URL(`${name}/LICENSE`, modules), "utf8")}`).join("\n\n");
      this.emitFile({ type: "asset", fileName: "licenses/LICENSES-D3.txt", source: licenses });
      const clusteringLicenses=readdirSync(modules).filter(name=>name.startsWith("graphology")||["mnemonist","obliterator","pandemonium","events"].includes(name)).sort()
        .map(name=>`${name}\n\n${readFileSync(new URL(`${name}/${name==="events"?"LICENSE":"LICENSE.txt"}`,modules),"utf8")}`).join("\n\n");
      this.emitFile({type:"asset",fileName:"licenses/LICENSES-CLUSTERING.txt",source:clusteringLicenses});
      this.emitFile({ type: "asset", fileName: "licenses/LICENSE-YAML.txt", source: readFileSync(new URL("yaml/LICENSE", modules), "utf8") });
      this.emitFile({ type: "asset", fileName: "licenses/LICENSE-ELASTICLUNR.txt", source: readFileSync(new URL("elasticlunr/LICENSE", modules), "utf8") });
      this.emitFile({ type: "asset", fileName: "licenses/LICENSE-NETWORKX.txt", source: readFileSync(new URL("examples/public/sources/LICENSE-NETWORKX.txt", import.meta.url), "utf8") });
    }
  }]
});
