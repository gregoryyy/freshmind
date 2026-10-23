import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PLAYWRIGHT_PORT must be a valid TCP port");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL, headless: true, channel: process.env.PLAYWRIGHT_CHANNEL,
    viewport: { width: 1440, height: 1000 } },
  webServer: { command: `npm run dev -- --port ${port} --strictPort`, url: baseURL, reuseExistingServer: false },
  reporter: "list"
});
