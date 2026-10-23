# Approved FM2014 examples

Only `berry` and `nips-fm` are approved migration/distribution datasets. Other data in the Java reference is proprietary and excluded. The tools explicitly name these two inputs; they never glob or scan the reference directory for graphs.

| Dataset | Nodes | Relations | Initial browser view |
| --- | ---: | ---: | --- |
| `berry.fm.yaml` | 21 | 22 | Complete small graph |
| `nips-fm.fm.yaml` | 3,777 | 5,257 | Two-hop neighborhood of its first node |

Both use the companion `fm2014.types.yaml`. Select an example in the main browser, or open its graph and companion files together. A single-file browser export embeds the effective type configuration. No imported URL or annotation resource is opened automatically.

Conversion retains XML node IDs (or label-derived IDs when absent), label/annotation/URL strings, types, relation endpoints, labels and dashed strokes. Node and relation order is retained; relations receive deterministic `fm2014-eN` IDs. Default weights, lengths and other native fields are explicit in the output. All original records are represented: neither dataset needs placeholder nodes or weight/type recovery. Berry's unavailable Windows resource paths and HTML hints remain source data.

`conversion-report.json` records source SHA-256, counts, recoveries, placeholders and unavailable resources. Layout positions are omitted because these source files do not store a layout; the browser's existing spring embedder initializes and arranges a visible neighborhood. No indexes, backups or external text corpora are included. Data remains attributed to its original dataset; the TypeScript/Python tooling uses the Freshmind license notices.

```sh
just convert-fm2014 --overwrite
just validate-examples
just validate-examples --source-dir ../knowceans/knowceans-freshmind-2014
```

The last command independently parses only the two approved XML files and compares every source ID, label, hint, URL, type, relation endpoint and stroke. Ordinary validation needs no reference checkout. Both checks compare complete normalized records through native YAML round trips, including metadata and extensions, rather than just graph counts.

The standalone Python reader also covers the known legacy numeric-type/weight defect and unsupported XML fields: recoveries require an explicit option, original values are retained in `extensions.fm2014`, genuine weight fields take precedence, conflicts/duplicate IDs fail, and unknown fields are preserved as XML text in the same namespace. These branches use synthetic regression input, not proprietary datasets.
