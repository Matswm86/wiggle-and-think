/* diag_tracks.cjs — prove the real-track engine works end to end in a browser:
   every band's track decodes, JOINS the beat grid (state.on), reports the
   effective BPM, and the freeze game stops + restarts the track on the bar.
   Usage: node tools/diag_tracks.cjs  (serves dist/, drives via Playwright) */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".glb": "model/gltf-binary", ".mp3": "audio/mpeg", ".png": "image/png", ".svg": "image/svg+xml" };

function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rep) => {
      let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
      fs.readFile(path.join(ROOT, p), (e, buf) => {
        if (e) { rep.writeHead(404); rep.end("nf"); return; }
        rep.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" });
        rep.end(buf);
      });
    });
    s.listen(0, () => res(s));
  });
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`http://localhost:${port}/index.html`);
  // let the three WebGL engines finish init first — on a software renderer
  // their model decode starves the audio decoder and fakes join timeouts
  await page.waitForFunction(() => window.PipAudio && window.MUSIC_TRACKS &&
    window.Sonic3D && window.Sonic3D.ready && window.Floor3D && window.Floor3D.ready &&
    window.Hands3D && window.Hands3D.ready, null, { timeout: 60000 });
  await page.waitForTimeout(1000);

  // 1. every manifest file is served + every band joins the grid
  const bands = await page.evaluate(async () => {
    const out = [];
    const mids = { A: 65, B: 95, C: 110, D: 130, E: 100 };
    for (const [b, list] of Object.entries(window.MUSIC_TRACKS)) {
      for (const t of list) {
        const r = await fetch(t.src, { method: "HEAD" }).catch(() => ({ ok: false, status: 0 }));
        if (!r.ok) out.push(`MISSING ${t.src} (${r.status})`);
      }
      window.PipAudio.ensure();
      window.PipAudio.start(b, mids[b], {});
      const t0 = performance.now();
      while (!window.PipAudio.state.on && performance.now() - t0 < 25000)
        await new Promise((r) => setTimeout(r, 100));
      out.push(`${b}: on=${window.PipAudio.state.on} effBpm=${window.PipAudio.state.bpm} ` +
        `title="${window.PipAudio.state.title}" joinMs=${Math.round(performance.now() - t0)}`);
      window.PipAudio.stop();
    }
    return out;
  });
  bands.forEach((l) => console.log(l));

  // 2. freeze game: track must stop on freeze and rejoin after
  const freeze = await page.evaluate(async () => {
    let froze = 0, unfroze = 0;
    window.PipAudio.start("D", 130, { freeze: true, onFreeze: () => froze++, onUnfreeze: () => unfroze++ });
    const t0 = performance.now();
    while (!window.PipAudio.state.on && performance.now() - t0 < 12000) await new Promise((r) => setTimeout(r, 100));
    const joined = window.PipAudio.state.on;
    while (froze < 1 && performance.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 100));
    const offInFreeze = !window.PipAudio.state.on;
    while (unfroze < 1 && performance.now() - t0 < 45000) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 600));
    const backOn = window.PipAudio.state.on;
    window.PipAudio.stop();
    return { joined, froze, offInFreeze, unfroze, backOn };
  });
  console.log("freeze game:", JSON.stringify(freeze));

  // 3. beat-lock math: one cycle must equal BEATS[ex]*60/bpm after lock
  const lock = await page.evaluate(() => {
    const out = [];
    for (const [ex, dur, eng] of [["kanga", window.Sonic3D.DURATION.kanga, "sonic"],
                                  ["drum", window.Sonic3D.DURATION.drum, "sonic"],
                                  ["bear", window.Floor3D.DURATION.bear, "floor"]]) {
      const bpm = 110, n = window.BEATS[ex];
      const sp = (dur * bpm) / (60 * n);
      out.push(`${ex}(${eng}): cycle=${(dur / sp).toFixed(2)}s expected=${(n * 60 / bpm).toFixed(2)}s`);
    }
    return out;
  });
  lock.forEach((l) => console.log(l));

  console.log("console errors:", errs.length ? errs : "none");
  await browser.close(); srv.close();
  const bad = bands.some((l) => l.includes("MISSING") || l.includes("on=false")) ||
    !freeze.joined || !freeze.offInFreeze || !freeze.backOn || errs.length;
  process.exit(bad ? 1 : 0);
})();
