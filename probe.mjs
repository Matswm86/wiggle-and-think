import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
const ROOT="dist",PORT=8792,MIME={".html":"text/html",".js":"text/javascript",".css":"text/css"};
const srv=createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/index.html";const f=join(ROOT,p);if(!existsSync(f)){r.statusCode=404;return r.end();}r.setHeader("Content-Type",MIME[extname(f)]||"application/octet-stream");r.end(readFileSync(f));});
await new Promise(r=>srv.listen(PORT,r));
const b=await chromium.launch();const pg=await b.newPage();
await pg.goto(`http://localhost:${PORT}/`,{waitUntil:"networkidle"});
// kanga = card index 15
await pg.locator(".card").nth(15).click(); await pg.waitForTimeout(300);
const sampleShadow=async()=>pg.evaluate(()=>{const s=document.querySelector(".pstage .shadow");return s?getComputedStyle(s).transform:"none";});
const s1=await sampleShadow(); await pg.waitForTimeout(450); const s2=await sampleShadow(); await pg.waitForTimeout(450); const s3=await sampleShadow();
const shadowAnimates = new Set([s1,s2,s3]).size>1;
console.log("KANGA shadow transforms:",s1.slice(0,28),"|",s2.slice(0,28),"|",s3.slice(0,28));
console.log("shadow animates:",shadowAnimates);
await pg.locator(".close-x").last().click(); await pg.waitForTimeout(200);
// breathe = card index 19
await pg.locator(".card").nth(19).click(); await pg.waitForTimeout(300);
const sampleBelly=async()=>pg.evaluate(()=>{const e=document.querySelector(".pstage .belly");return e?getComputedStyle(e).transform:"none";});
const b1=await sampleBelly(); await pg.waitForTimeout(1600); const b2=await sampleBelly();
console.log("BREATHE belly:",b1.slice(0,30),"->",b2.slice(0,30),"| animates:",b1!==b2);
await b.close(); srv.close();
