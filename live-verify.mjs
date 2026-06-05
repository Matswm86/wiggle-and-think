import { chromium } from "playwright";
const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1280,height:900}});
const errs=[];
pg.on("console",m=>{if(m.type()==="error")errs.push(m.text());});
pg.on("pageerror",e=>errs.push("PAGEERROR: "+e.message));
pg.on("requestfailed",r=>errs.push("REQFAIL: "+r.url()+" "+(r.failure()?.errorText||"")));
await pg.goto("https://play.mwmai.no/",{waitUntil:"networkidle",timeout:30000});
await pg.waitForTimeout(1200);
const cards=await pg.locator(".card").count();
const hero=await pg.locator(".hero h1").first().textContent().catch(()=>null);
// open an exercise + start sound, check for CSP/audio errors
await pg.locator(".card").nth(11).click(); await pg.waitForTimeout(500); // freeze dance
await pg.locator(".musicchip .play").click().catch(()=>{});
await pg.waitForTimeout(1500);
const player=await pg.locator(".player").count();
const svg=await pg.locator(".pstage svg").count();
await pg.screenshot({path:"live-home.png"});
console.log("LIVE play.mwmai.no | cards:",cards,"| hero:",JSON.stringify(hero),"| player:",player,"| svg:",svg);
console.log("ERRORS ("+errs.length+"):"); errs.forEach(e=>console.log("  - "+e));
await b.close(); process.exit(errs.length?1:0);
