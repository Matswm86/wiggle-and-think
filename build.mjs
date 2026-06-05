/* build.mjs — transpile JSX → JS, vendor React, emit a self-contained
   static site to dist/. No in-browser Babel, no external CDN, strict CSP. */
import { transformSync } from "@babel/core";
import presetReact from "@babel/preset-react";
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const SRC = "src", OUT = "dist", A = "assets";
const VER = String(Date.now()).slice(-7); // cache-bust token

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, A, "vendor"), { recursive: true });

// JSX files transpiled to .js (order preserved by index.html script tags)
const JSX = ["tweaks-panel", "ui", "player", "grownups", "app"];
// plain assets copied verbatim (hands3d.js is an ES module, copied as-is)
const JS = ["pip", "data", "audio", "hands3d"];
const CSS = ["char", "anim", "app"];

for (const name of JSX) {
  const code = readFileSync(join(SRC, A, `${name}.jsx`), "utf8");
  const out = transformSync(code, {
    presets: [[presetReact, { runtime: "classic", pragma: "React.createElement", pragmaFrag: "React.Fragment" }]],
    filename: `${name}.jsx`,
    compact: false,
    comments: false,
  }).code;
  writeFileSync(join(OUT, A, `${name}.js`), out);
}
for (const name of JS) cpSync(join(SRC, A, `${name}.js`), join(OUT, A, `${name}.js`));
for (const name of CSS) cpSync(join(SRC, A, `${name}.css`), join(OUT, A, `${name}.css`));
cpSync(join(SRC, A, "vendor"), join(OUT, A, "vendor"), { recursive: true });
cpSync(join(SRC, A, "models"), join(OUT, A, "models"), { recursive: true });   // rigged hand glTF

// rewrite index.html: drop unpkg + babel, vendor react, .jsx→.js, bump ?v=
let html = readFileSync(join(SRC, "index.html"), "utf8");
html = html
  .replace(/<script src="https:\/\/unpkg\.com\/react@[^"]*"[^>]*><\/script>\s*/g,
    `<script src="assets/vendor/react.production.min.js"></script>\n`)
  .replace(/<script src="https:\/\/unpkg\.com\/react-dom@[^"]*"[^>]*><\/script>\s*/g,
    `<script src="assets/vendor/react-dom.production.min.js"></script>\n`)
  .replace(/<script src="https:\/\/unpkg\.com\/@babel\/standalone@[^"]*"[^>]*><\/script>\s*/g, "")
  .replace(/<!-- React components \(transpiled\) -->/,
    "<!-- React components (pre-transpiled at build time) -->")
  .replace(/type="text\/babel"\s*/g, "")
  .replace(/\.jsx\?v=\d+/g, m => m.replace(".jsx", ".js"))
  .replace(/\?v=\d+/g, `?v=${VER}`);

writeFileSync(join(OUT, "index.html"), html);
console.log(`built dist/ (v=${VER}) — ${readdirSync(join(OUT, A)).filter(f=>extname(f)).length} assets`);
