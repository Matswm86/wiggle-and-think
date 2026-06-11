/* diag_motion.cjs — verify the procedural root-motion layer + new audio engine.
   Renders jump/bob moves at key phases into contact strips (lift-off must be
   visible, head never cropped) and smoke-tests all 5 music bands + freeze.
   Usage: node tools/diag_motion.cjs  (serves dist/, drives via Playwright) */
const { chromium } = require("playwright");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".glb": "model/gltf-binary", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml" };
const OUT = path.join(__dirname, "diag-out");
// move → phases that show ground / lift / peak / land
const SONIC = {
  kanga: [0.1, 0.45, 0.55, 0.75],
  starjump: [0.1, 0.45, 0.55, 0.85],
  jacks: [0, 0.25, 0.5, 0.75],
  flamingo: [0.1, 0.45, 0.54, 0.8],
  march: [0, 0.25, 0.5, 0.75],
  tree: [0.1, 0.4, 0.6, 0.9],
};

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
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction(() => window.Sonic3D && window.Sonic3D.ready, null, { timeout: 30000 });

  for (const [id, phases] of Object.entries(SONIC)) {
    const dataUrl = await page.evaluate(async ({ exId, phases }) => {
      const S = 300, comp = document.createElement("canvas");
      comp.width = S * phases.length; comp.height = S;
      const cctx = comp.getContext("2d");
      cctx.fillStyle = "#fff8e8"; cctx.fillRect(0, 0, comp.width, comp.height);
      for (let i = 0; i < phases.length; i++) {
        const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
        const ctrl = window.Sonic3D.mount(cv, exId, { pausedAt: phases[i] });
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        cctx.drawImage(cv, i * S, 0, S, S);
        cctx.fillStyle = "#26343c"; cctx.font = "16px sans-serif";
        cctx.fillText("t=" + phases[i], i * S + 8, 22);
        if (ctrl && ctrl.stop) ctrl.stop();
      }
      return comp.toDataURL("image/png");
    }, { exId: id, phases });
    fs.writeFileSync(path.join(OUT, "motion-" + id + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log("wrote motion-" + id + ".png");
  }

  // floor character life-layer still grounded?
  const floorUrl = await page.evaluate(async () => {
    await new Promise((r) => window.Floor3D && window.Floor3D.ready ? r() : window.Floor3D.whenReady(r));
    const S = 300, ids = ["bear", "dog", "catcow"], comp = document.createElement("canvas");
    comp.width = S * ids.length; comp.height = S;
    const cctx = comp.getContext("2d");
    cctx.fillStyle = "#fff8e8"; cctx.fillRect(0, 0, comp.width, comp.height);
    for (let i = 0; i < ids.length; i++) {
      const cv = document.createElement("canvas"); cv.width = S; cv.height = S;
      const ctrl = window.Floor3D.mount(cv, ids[i], { pausedAt: 0.3 });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      cctx.drawImage(cv, i * S, 0, S, S);
      cctx.fillStyle = "#26343c"; cctx.font = "16px sans-serif"; cctx.fillText(ids[i], i * S + 8, 22);
      if (ctrl && ctrl.stop) ctrl.stop();
    }
    return comp.toDataURL("image/png");
  });
  fs.writeFileSync(path.join(OUT, "motion-floor.png"), Buffer.from(floorUrl.split(",")[1], "base64"));
  console.log("wrote motion-floor.png");

  // audio: every band + the freeze game + the per-move SFX overlays
  const audio = await page.evaluate(async () => {
    const out = [];
    window.PipAudio.ensure();
    for (const [band, bpm, sfx] of [["A", 65, "breathe"], ["B", 95, "tightrope"], ["C", 110, "flamingo"], ["D", 130, "kanga"], ["E", 100, "drum"]]) {
      try {
        window.PipAudio.start(band, bpm, { sfx });
        await new Promise((r) => setTimeout(r, 900));
        out.push(band + ":ok(playing=" + window.PipAudio.state.playing + ")");
      } catch (e) { out.push(band + ":THROW " + e.message); }
    }
    try {
      let froze = 0;
      window.PipAudio.start("D", 130, { freeze: true, onFreeze: () => froze++, onUnfreeze: () => {} });
      await new Promise((r) => setTimeout(r, 1200));
      out.push("freeze:ok(armed, fires later)");
    } catch (e) { out.push("freeze:THROW " + e.message); }
    for (const s of ["tap", "clap", "whoosh", "trace", "chime"]) {
      try { window.PipAudio.sfx(s); } catch (e) { out.push("sfx-" + s + ":THROW " + e.message); }
    }
    window.PipAudio.stop();
    return out;
  });
  console.log("audio:", audio.join(" | "));
  console.log("console errors:", errs.length ? errs : "none");
  await browser.close(); srv.close();
  process.exit(errs.length || audio.some((a) => a.includes("THROW")) ? 1 : 0);
})();
