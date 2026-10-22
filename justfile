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

# Build and serve the production demo; accepts Vite preview arguments.
preview *args: build-demo
    npx --no-install vite preview --host 127.0.0.1 "$@"

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
