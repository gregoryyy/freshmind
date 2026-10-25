set positional-arguments

# List available recipes.
default:
    @just --list

# Install dependencies from the lockfile.
install:
    npm ci

# Run the demo with live reload; accepts Vite arguments.
dev *args:
    npm run dev -- "$@"

# Build the library and TypeScript declarations.
build:
    npm run build

# Build the browser demo for production.
build-demo:
    npm run build:demo

# Check the optional local knowceans Java sampler/RNG reference; requires a JDK.
test-lda-java:
    node scripts/lda-java-reference.mjs

# Check the owner-authorized FM2014 retrieval binary on synthetic probability matrices.
test-retrieval-java:
    node scripts/retrieval-java-reference.mjs

# Compare shared and independent damping while context moves out of an RFC region.
damping-context-experiment output="docs/experiments/damping-context": build
    node scripts/damping-context-experiment.mjs {{quote(output)}}

# Regenerate the fictional graph-search library without importing legacy corpora.
search-example: build
    node scripts/search-example.mjs

# Reproduce lexical/LDA retrieval comparisons and exact-tag controls.
search-experiment *args: build
    node scripts/search-experiment.mjs "$@"

# Capture graph query, training, similarity and feedback interactions from production.
search-flipbook *args: build-demo
    node scripts/flipbook.mjs --tour search "$@"

# Capture a production-build walkthrough into docs/flipbook/ (PNGs, Markdown and HTML).
flipbook *args: build-demo
    node scripts/flipbook.mjs "$@"

# Capture fixed-space radius-two browsing, shared identity and retrieval seeds.
radius-two-flipbook *args: build-demo
    node scripts/flipbook.mjs --tour radius-two "$@"

# Capture sliders, horizontal choices and the retractable control panel.
controls-showcase *args: build-demo
    node scripts/flipbook.mjs --tour controls "$@"

# Evaluate a built radius-two application checkout (PR51 or later), without rebuilding it.
radius-two-evaluation app="." output="docs/experiments/radius-two":
    node scripts/radius-two-evaluation.mjs {{quote(app)}} {{quote(output)}}

# Capture the six-view research-community RFC/hybrid showcase from the production browser.
rfc-showcase *args: build-demo
    node scripts/flipbook.mjs --tour rfc-showcase "$@"

# Capture the automatic two-level, multiple-center RFC example from the production browser.
rfc-neighborhoods-preview: build-demo
    node scripts/rfc-neighborhoods-preview.mjs

# Regenerate the headless preset and documentation from the Freshmind type YAML.
sync-fm-config:
    npm run sync:fm-config

# Regenerate the user key map from the same rows used by browser help.
keymap: build
    node scripts/sync-keymap.mjs

# Convert only the two approved Java data sets; pass --overwrite for an intentional rerun.
convert-fm2014 *args: build
    node scripts/convert-fm2014.mjs --recover-type-weights "$@"

# Validate the approved examples and all normalized YAML round-trip records.
validate-examples *args: build
    node scripts/validate-examples.mjs "$@"

# Regenerate attributed public networks from the pinned source; requires Python 3, no NetworkX installation.
public-examples: build
    node scripts/convert-public-examples.mjs

# Compare plain TouchGraph and single-focus RFC on synthetic fixed-coordinate graphs.
rfc-experiment output="docs/experiments/rfc-single-focus": build
    node scripts/rfc-experiment.mjs {{quote(output)}}

# Matched multi-focus tree, leaf-link and shared-subtree experiments (120 runs).
rfc-multifocus-experiment output="docs/experiments/rfc-multifocus": build
    node scripts/rfc-multifocus-experiment.mjs {{quote(output)}}

# Compare archived/global and current/per-node damping on detector probes and two-center layouts.
rfc-stability-experiment output="docs/experiments/rfc-stability": build
    node scripts/rfc-stability-experiment.mjs {{quote(output)}}/v1 --historical
    node scripts/rfc-stability-experiment.mjs {{quote(output)}}/v2
    python3 scripts/rfc-stability-figures.py {{quote(output)}}

# Redraw recorded stability probes, layouts and motion/gain/cooling comparisons; requires matplotlib/numpy.
rfc-stability-figures output="docs/experiments/rfc-stability":
    python3 scripts/rfc-stability-figures.py {{quote(output)}}

# General adaptive damping with and without RFC; matched native forces and slow-motion detector probes.
layout-damping-experiment output="docs/experiments/layout-damping": build
    node scripts/layout-damping-experiment.mjs {{quote(output)}}
    python3 scripts/layout-damping-figures.py {{quote(output)}}

# Matched damping/rigidity, importance and cluster comparisons (780 runs), reports and eight diagrams.
rfc-followup-experiment output="docs/experiments/rfc-followup": build
    node scripts/rfc-followup-experiment.mjs {{quote(output)}}
    python3 scripts/rfc-followup-report.py {{quote(output)}}
    python3 scripts/rfc-followup-figures.py {{quote(output)}}

# Redraw recorded follow-up layouts and parameter comparisons; requires matplotlib/numpy.
rfc-followup-figures output="docs/experiments/rfc-followup":
    python3 scripts/rfc-followup-figures.py {{quote(output)}}

# Rebuild follow-up narratives/tables from the recorded inputs without rerunning layout.
rfc-followup-report output="docs/experiments/rfc-followup":
    python3 scripts/rfc-followup-report.py {{quote(output)}}

# Context and intersection exclusion: 100 matched runs, native examples, report and diagrams.
rfc-exclusion-experiment output="docs/experiments/rfc-exclusion": build
    node scripts/rfc-exclusion-experiment.mjs {{quote(output)}}
    python3 scripts/rfc-exclusion-figures.py {{quote(output)}}

# Redraw recorded exclusion comparisons and rebuild their report without rerunning layout.
rfc-exclusion-figures output="docs/experiments/rfc-exclusion":
    python3 scripts/rfc-exclusion-figures.py {{quote(output)}}

# Matched TG/RFC, lens and structural views (160 runs), native input, report and diagrams.
rfc-hybrid-experiment output="docs/experiments/rfc-hybrid": build
    node scripts/rfc-hybrid-experiment.mjs {{quote(output)}}
    python3 scripts/rfc-hybrid-figures.py {{quote(output)}}

# Redraw hybrid-view comparisons and rebuild their report from recorded data.
rfc-hybrid-figures output="docs/experiments/rfc-hybrid":
    python3 scripts/rfc-hybrid-figures.py {{quote(output)}}

# Regenerate the synthetic tree/DAG, weighted-tree and overlapping-cluster examples.
substructure-examples: build
    node scripts/substructure-examples.mjs

# Regenerate the synthetic typed leaf-aggregation / hybrid-view input.
structural-example: build
    node scripts/structural-view-example.mjs

# Regenerate the typed research-community showcase for single/multiple RFC and hybrid views.
rfc-showcase-example: build
    node scripts/rfc-showcase-example.mjs

# Plot an existing RFC report; requires Python 3 with matplotlib.
rfc-plot output="docs/experiments/rfc-single-focus":
    python3 scripts/plot-rfc.py {{quote(output)}}

# Render the second RFC draft's SVG/PDF/PNG figures; requires matplotlib and numpy.
rfc-figures:
    python3 scripts/rfc-paper-figures.py

# Regenerate experiments/figures and render the second draft next to its Markdown source.
rfc-paper: rfc-experiment rfc-multifocus-experiment rfc-plot rfc-figures
    rm -f docs/papers/rfc-revisited-draft2.md.pdf
    just pdf docs/papers/rfc-revisited-draft2.md

# Build and serve the production demo; accepts Vite preview arguments.
preview *args: build-demo
    npx --no-install vite preview --host 127.0.0.1 "$@"

# Measure specified assertion fault sensitivity on disposable compiled copies.
assurance-sensitivity output="/tmp/fm4-assurance-sensitivity.json": build
    node scripts/assurance-sensitivity.mjs {{quote(output)}}

# Observe the assembled production browser with public synthetic privacy canaries.
test-assurance-browser: build-demo
    npx --no-install playwright test --config playwright.assurance.config.mjs

# Check reviewed source/requirement/evidence references and report freshness.
assurance-map *args:
    node scripts/assurance-map.mjs "$@"

# Check TypeScript without emitting files.
typecheck:
    npm run typecheck

# Build the library and run the core tests.
test:
    npm test

# Compare with the original Java implementations; requires a JDK.
test-java:
    npm run test:java

# Run Playwright browser tests; accepts Playwright arguments.
test-browser *args:
    npm run test:browser -- "$@"

# Run routine checks and build the demo.
check: typecheck test build-demo

# Also run Java parity and browser tests; requires a JDK and Playwright browser.
check-all: check test-java test-browser

# Markdown → A4 PDF, following the Kibitz workflow: Pandoc + headless Chrome.
# Needs Pandoc and Google Chrome; CHROME can select a different executable.
chrome := env_var_or_default("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
pdf_css := justfile_directory() / "scripts/pdf/style.css"
pdf_mermaid := justfile_directory() / "scripts/pdf/mermaid.html"
pdf_stamps := justfile_directory() / ".pdfstamps"

# Render one Markdown file next to its source, e.g. docs/TODO.md → docs/TODO.md.pdf.
pdf file:
    #!/usr/bin/env bash
    set -euo pipefail
    src="$1"
    case "$src" in *.md) ;; *) echo "ERROR: not a .md file: $src" >&2; exit 2 ;; esac
    if [ ! -f "$src" ]; then echo "ERROR: file not found: $src" >&2; exit 2; fi
    css_file={{quote(pdf_css)}}
    mermaid_file={{quote(pdf_mermaid)}}
    stampdir={{quote(pdf_stamps)}}
    chrome_bin={{quote(chrome)}}
    recipe_file={{quote(justfile())}}
    dir="$(cd "$(dirname "$src")" && pwd)"
    base="$(basename "$src")"
    out="$dir/$base.pdf"
    mkdir -p "$stampdir"
    # Hash both inputs and output, surviving checkout timestamp changes.
    # Images are not hashed: delete the PDF to rebuild after image-only changes.
    hash="$(cat "$src" "$css_file" "$mermaid_file" "$recipe_file" | shasum -a 256 | cut -d' ' -f1)"
    stamp="$stampdir/$(printf '%s' "$out" | shasum -a 256 | cut -c1-16).sha"
    if [ -f "$out" ]; then
        outhash="$(shasum -a 256 "$out" | cut -d' ' -f1)"
        if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$hash $outhash" ]; then
            echo "up to date: $out"; exit 0
        fi
        if [ ! -f "$stamp" ] && [ "$out" -nt "$src" ] && [ "$out" -nt "$css_file" ] && [ "$out" -nt "$mermaid_file" ] && [ "$out" -nt "$recipe_file" ]; then
            printf '%s %s\n' "$hash" "$outhash" > "$stamp"
            echo "up to date: $out"; exit 0
        fi
    fi
    if ! command -v pandoc >/dev/null; then echo "ERROR: install Pandoc to render PDFs (brew install pandoc)." >&2; exit 1; fi
    if [ ! -x "$chrome_bin" ]; then echo "ERROR: Chrome not found: $chrome_bin (set CHROME to its executable)." >&2; exit 1; fi
    tmp="$(mktemp -d)"
    chrome_pid=""
    cleanup() {
        if [ -n "$chrome_pid" ]; then
            kill "$chrome_pid" 2>/dev/null || true
            wait "$chrome_pid" 2>/dev/null || true
        fi
        rm -rf "$tmp"
    }
    trap cleanup EXIT
    extra=()
    if grep -q '^```mermaid' "$src"; then extra=(--include-in-header "$mermaid_file"); fi
    # Embed images/CSS and, when needed, Mermaid. Mermaid requires network at build time.
    pandoc "$src" -f gfm+tex_math_dollars -o "$tmp/doc.html" --standalone --embed-resources --mathml \
        --resource-path "$dir" --css "$css_file" --metadata pagetitle="$base" ${extra[@]+"${extra[@]}"}
    "$chrome_bin" --headless --disable-gpu --no-first-run --no-default-browser-check --disable-extensions \
        --virtual-time-budget=15000 --timeout=20000 --user-data-dir="$tmp/chrome-profile" \
        --no-pdf-header-footer --print-to-pdf="$tmp/out.pdf" "$tmp/doc.html" >"$tmp/chrome.log" 2>&1 &
    chrome_pid=$!
    finished=""
    deadline=$((SECONDS + 60))
    while [ "$SECONDS" -lt "$deadline" ]; do
        if ! kill -0 "$chrome_pid" 2>/dev/null; then finished=1; break; fi
        if [ -s "$tmp/out.pdf" ]; then
            s1=$(wc -c < "$tmp/out.pdf"); sleep 0.5; s2=$(wc -c < "$tmp/out.pdf" 2>/dev/null || echo 0)
            if [ "$s1" = "$s2" ]; then finished=1; break; fi
        fi
        sleep 0.5
    done
    if [ -z "$finished" ]; then
        kill -9 "$chrome_pid" 2>/dev/null || true
        echo "ERROR: Chrome timed out after 60 s" >&2; cat "$tmp/chrome.log" >&2; exit 1
    fi
    if [ ! -s "$tmp/out.pdf" ]; then
        echo "ERROR: Chrome produced no PDF" >&2; cat "$tmp/chrome.log" >&2; exit 1
    fi
    mv "$tmp/out.pdf" "$out"
    printf '%s %s\n' "$hash" "$(shasum -a 256 "$out" | cut -d' ' -f1)" > "$stamp"
    echo "wrote $out"

# Render all tracked/new, non-ignored Markdown files, optionally restricted to paths.
pdfs *paths:
    #!/usr/bin/env bash
    set -euo pipefail
    cd {{quote(justfile_directory())}}
    list="$(mktemp)"
    trap 'rm -f "$list"' EXIT
    git ls-files -z --cached --others --exclude-standard -- "$@" > "$list"
    fail=0
    while IFS= read -r -d '' f; do
        case "$f" in CLAUDE.md|*/CLAUDE.md|.github/*) continue ;; *.md) ;; *) continue ;; esac
        [ -f "$f" ] || continue
        echo "── $f"
        just pdf "$f" || { echo "FAILED: $f" >&2; fail=1; }
    done < "$list"
    exit "$fail"
