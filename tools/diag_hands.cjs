/* diag_hands.cjs — render each hand move at 4 phases into a contact strip PNG.
   Usage: node tools/diag_hands.cjs  (serves dist/, drives Hands3D via Playwright) */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".glb": "model/gltf-binary", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml" };
const MOVES = ["palmbeak", "fistpalm", "beakfist", "beaktalk", "fingercount", "rps"];
const OUT = path.join(__dirname, "diag-out");

function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rep) => {
      let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
      const fp = path.join(ROOT, p);
      fs.readFile(fp, (e, buf) => {
        if (e) { rep.writeHead(404); rep.end("nf"); return; }
        rep.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" });
        rep.end(buf);
      });
    });
    s.listen(0, () => res(s));
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction(() => window.Hands3D && window.Hands3D.ready, null, { timeout: 20000 });

  for (const id of MOVES) {
    const dataUrl = await page.evaluate(async (exId) => {
      const phases = [0, 0.25, 0.5, 0.75];
      const S = 300, comp = document.createElement("canvas");
      comp.width = S * phases.length; comp.height = S;
      const cctx = comp.getContext("2d");
      cctx.fillStyle = "#fff8e8"; cctx.fillRect(0, 0, comp.width, comp.height);
      for (let i = 0; i < phases.length; i++) {
        const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
        const ctrl = window.Hands3D.mount(cv, exId, { pausedAt: phases[i], frozen: true });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        cctx.drawImage(cv, i * S, 0, S, S);
        cctx.fillStyle = "#26343c"; cctx.font = "16px sans-serif";
        cctx.fillText("t=" + phases[i], i * S + 8, 22);
        if (ctrl && ctrl.stop) ctrl.stop();
      }
      return comp.toDataURL("image/png");
    }, id);
    fs.writeFileSync(path.join(OUT, id + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log("wrote", id + ".png");
  }
  console.log("console errors:", errs.length ? errs : "none");
  await browser.close(); srv.close();
})();
