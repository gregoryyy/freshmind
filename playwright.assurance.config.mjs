import {defineConfig} from '@playwright/test';
const port=Number(process.env.PLAYWRIGHT_PORT??4189);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid PLAYWRIGHT_PORT');
export default defineConfig({
  testDir:'./tests/assurance-browser',workers:1,timeout:60000,
  use:{baseURL:`http://127.0.0.1:${port}`,headless:true,channel:process.env.PLAYWRIGHT_CHANNEL,viewport:{width:1440,height:1000}},
  // Serve the already assembled build. Never rebuild while a browser is reading it.
  webServer:{command:`node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,url:`http://127.0.0.1:${port}`,reuseExistingServer:false},
  reporter:[['list'],['json',{outputFile:process.env.ASSURANCE_BROWSER_REPORT??'test-results/assurance-browser.json'}]]
});
