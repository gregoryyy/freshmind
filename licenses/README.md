# License texts

The root [LICENSE](../LICENSE) explains which terms apply to which components;
[NOTICE](../NOTICE) retains attribution and source provenance. This directory
holds the supporting full texts:

- [Apache License 2.0](LICENSE-APACHE-2.0).
- [GNU General Public License 3](LICENSE-GPL-3.0), for components marked
  GPL-3.0-or-later as described in the root index.
- [GNU Library General Public License 2](LICENSE-LGPL-2.0), for the Cokus
  generator marked LGPL-2.0-or-later as described in the root index.
- [Elasticlunr MIT license](LICENSE-ELASTICLUNR.txt), for the literal retrieval
  engine and generated ES-module adapter.

Moving these texts does not change their contents or component license terms.
Keep this directory with root LICENSE and NOTICE in source/package distribution.
Original notices accompanying pinned third-party source remain with that source.
The plural directory name avoids colliding with root `LICENSE` on filesystems
that do not distinguish uppercase from lowercase names.

The browser build also emits dependency notices under its `licenses/` directory:
`LICENSES-D3.txt`, `LICENSES-CLUSTERING.txt`, `LICENSE-YAML.txt`,
`LICENSE-ELASTICLUNR.txt` and
`LICENSE-NETWORKX.txt`. They are collected from the installed dependency/pinned
source notices during the build; they are not new licenses for Freshmind itself.
