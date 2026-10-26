// Real two-client WebRTC shop interaction at mobile resolution and landscape.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {spawn} from "node:child_process";
import {createRequire} from "node:module";
import {chromium} from "playwright";
const require=createRequire(import.meta.url),{PeerServer}=require("peer");
PeerServer({port:9100,host:"127.0.0.1",path:"/"});
const server=spawn("python3",["-m","http.server","4173","--bind","127.0.0.1"],{stdio:"ignore"});
const errors=[];let browser;
async function open(ctx,w=390,h=844){
 const p=await ctx.newPage();
 await p.setViewportSize({width:w,height:h});
 p.on("pageerror",e=>errors.push(e.stack||e.message));
 await p.route("https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js",
    route=>route.fulfill({path:path.resolve("node_modules/peerjs/dist/peerjs.min.js"),contentType:"application/javascript"}));
 await p.addInitScript(()=>{window.CRYPTBOUND_PEER_OPTIONS={host:"127.0.0.1",port:9100,path:"/",secure:false};});
 for(let tries=0;tries<30;tries++)try{
   await p.goto("http://127.0.0.1:4173",{waitUntil:"domcontentloaded",timeout:3500});break;
 }catch(e){if(tries===29)throw e;await new Promise(ok=>setTimeout(ok,220));}
 await p.waitForFunction(()=>window.__KIOSK_TEST__?.getHits);
 return p;
}
async function action(page,cmd,key){
 const h=await page.evaluate(([cmd,key])=>window.__KIOSK_TEST__.getHits().find(x=>x.cmd===cmd&&(key===undefined||x.key===key)),[cmd,key]);
 assert.ok(h,"Missing clickable "+cmd+" / "+key);
 const v=await page.evaluate(()=>window.__KIOSK_TEST__.screen());
 const rect=await page.locator("#game").boundingBox();
 await page.mouse.click(rect.x+(h.x+h.w/2)/v.W*rect.width,rect.y+(h.y+h.h/2)/v.H*rect.height);
}
const snapshot=p=>p.evaluate(()=>window.__KIOSK_TEST__.getState());
try{
 browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 const host=await open(context),guest=await open(context);
 await host.locator("#nickname").fill("店长");
 await host.locator("#host").click();
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.players?.host,{timeout:20000});
 const code=(await host.locator("#roomCode").textContent()).split("：")[1];
 assert.equal(code.length,8);
 await guest.locator("#nickname").fill("店员");
 await guest.locator("#joinCode").fill(code);
 await guest.locator("#join").click();
 await guest.waitForFunction(()=>Object.keys(window.__KIOSK_TEST__.getState()?.players||{}).length===2,{timeout:20000});
 await action(guest,"window");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.windowOpen===true,{timeout:15000});
 assert.equal((await snapshot(host)).windowOpen,true);
 await action(guest,"slot","shelfL1");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.hand==="tea",{timeout:12000});
 await action(guest,"counter");
 await host.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.counter==="tea",{timeout:12000});
 await action(host,"sell");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.totalServed===1,{timeout:15000});
 assert.equal((await snapshot(guest)).cash,109);
 // Real door/open state and stock list should be shared rather than fake icons.
 await action(host,"toggle","drawerL");
 await guest.waitForFunction(()=>window.__KIOSK_TEST__.getState()?.open?.drawerL===true,{timeout:12000});
 assert.equal((await snapshot(guest)).slots.drawerL.sku,"cocoa");
 await fs.mkdir("artifacts",{recursive:true});
 await host.screenshot({path:"artifacts/kiosk-mobile-host.png",fullPage:false});
 await guest.screenshot({path:"artifacts/kiosk-mobile-guest.png",fullPage:false});
 const mobileOverflow=await host.evaluate(()=>document.documentElement.scrollHeight>innerHeight+2||document.documentElement.scrollWidth>innerWidth+2);
 assert.equal(mobileOverflow,false,"mobile must be one fixed no-scroll screen");
 // Local solo save survives refresh; source account is separate from legacy save.
 const solo=await open(context);
 await solo.locator("#solo").click();
 await solo.waitForFunction(()=>Boolean(window.__KIOSK_TEST__?.getState()&&window.__KIOSK_TEST__?.getHits().some(h=>h.cmd==="window")));
 await action(solo,"window");
 await solo.reload();
 await solo.waitForFunction(()=>window.__KIOSK_TEST__?.getState!==undefined);
 await solo.locator("#resume").click();
 assert.equal((await snapshot(solo)).windowOpen,true);
 await solo.screenshot({path:"artifacts/kiosk-mobile-solo.png",fullPage:false});
 // Landscape and desktop use an expanded camera, not a scaled portrait screenshot.
 const wide=await open(context,1280,720);
 await wide.locator("#solo").click();
 await wide.waitForFunction(()=>Boolean(window.__KIOSK_TEST__?.getState()&&window.__KIOSK_TEST__?.getHits().length));
 assert.equal((await wide.evaluate(()=>window.__KIOSK_TEST__.screen())).land,true);
 assert.ok((await wide.evaluate(()=>window.__KIOSK_TEST__.getHits())).some(h=>h.cmd==="slot"));
 await wide.screenshot({path:"artifacts/kiosk-landscape-desktop.png",fullPage:false});
 assert.deepEqual(errors,[]);
 console.log("PASS: two actual mobile clients transferred stock, opened drawer, sold a customer, local restore, no scroll, landscape layout.");
}catch(e){console.error(e);process.exitCode=1;}
finally{await browser?.close();server.kill();process.exit();}
