/* verify.mjs — load built dist/ over http, capture console errors,
   screenshot Home + an open exercise Player. */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "dist", PORT = 8791;
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".svg":"image/svg+xml" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const f = join(ROOT, p);
  if (!existsSync(f)) { res.statusCode = 404; return res.end("404"); }
  res.setHeader("Content-Type", MIME[extname(f)] || "application/octet-stream");
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(PORT, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [], warnings = [];
page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
page.on("requestfailed", r => errors.push("REQFAIL: " + r.url() + " " + (r.failure()?.errorText||"")));

await page.goto(`http://localhost:${PORT}/`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// Home rendered? count exercise cards
const cards = await page.locator(".card").count();
const heroTitle = await page.locator(".hero h1").first().textContent().catch(()=>null);
await page.screenshot({ path: "verify-home.png", fullPage: false });

// open the Flamingo Hop card (#4) — airborne move, to see the dynamic shadow
let playerOk = false, stageSvg = 0, bd = 0, capA = null, capB = null;
if (cards > 0) {
  await page.locator(".card").nth(3).click();
  await page.waitForTimeout(600);
  playerOk = await page.locator(".player").count() > 0;
  stageSvg = await page.locator(".pstage svg").count();
  bd = await page.locator(".bd-row").count();
  // phase-clock sanity: live caption should change over the move cycle
  capA = await page.locator(".livecap").textContent().catch(()=>null);
  // audio smoke-test: press play, ensure no throw
  await page.locator(".musicchip .play").click().catch(()=>{});
  await page.waitForTimeout(1700);
  capB = await page.locator(".livecap").textContent().catch(()=>null);
  await page.screenshot({ path: "verify-player.png" });
  await page.locator(".close-x").last().click().catch(()=>{});
}
// open Starfish Breathing (#20) for the breathing-belly view
if (cards >= 20) {
  await page.locator(".card").nth(19).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "verify-breathe.png" });
}

console.log("cards:", cards, "| hero:", JSON.stringify(heroTitle), "| player:", playerOk, "| stage svg:", stageSvg, "| bd rows:", bd);
console.log("caption move:", JSON.stringify(capA), "->", JSON.stringify(capB), "(changed:", capA!==capB, ")");
console.log("ERRORS (" + errors.length + "):");
errors.forEach(e => console.log("  - " + e));

await browser.close();
server.close();
process.exit(errors.length ? 1 : 0);
