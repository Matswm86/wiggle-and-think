import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const ROOT="dist",PORT=8793,MIME={".html":"text/html",".js":"text/javascript",".css":"text/css"};
const srv=createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";const f=join(ROOT,p);if(!existsSync(f)){r.statusCode=404;return r.end();}r.setHeader("Content-Type",MIME[extname(f)]||"application/octet-stream");r.end(readFileSync(f));});
await new Promise(r=>srv.listen(PORT,r));
const b=await chromium.launch();
const views=[
  ["iphone-portrait",390,844],["android-portrait",360,800],
  ["iphone-landscape",844,390],
  ["ipad-portrait",768,1024],["ipad-landscape",1024,768],
  ["laptop",1366,768],["tv-1080p",1920,1080],["tv-4k",2560,1440],
];
let allErr=0;
for(const [name,w,h] of views){
  const pg=await b.newPage({viewport:{width:w,height:h}});
  const errs=[]; pg.on("console",m=>{if(m.type()==="error")errs.push(m.text());}); pg.on("pageerror",e=>errs.push(e.message));
  await pg.goto(`http://localhost:${PORT}/`,{waitUntil:"networkidle"}); await pg.waitForTimeout(500);
  // horizontal overflow check
  const ov=await pg.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  const cols=await pg.evaluate(()=>{const g=document.querySelector(".grid");return g?getComputedStyle(g).gridTemplateColumns.split(" ").length:0;});
  await pg.screenshot({path:`rwd-${name}.png`});
  console.log(`${name.padEnd(18)} ${String(w)+"x"+h} | hOverflow:${ov} | gridCols:${cols} | errs:${errs.length}`);
  allErr+=errs.length;
  await pg.close();
}
await b.close(); srv.close();
console.log("TOTAL ERRORS:",allErr);
