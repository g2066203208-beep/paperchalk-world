// Browser-to-browser integration test: two Chromium tabs and a real local PeerServer.
// This does NOT prove connectivity through every public NAT/firewall configuration.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {spawn} from "node:child_process";
import {createRequire} from "node:module";
import {chromium} from "playwright";
const require=createRequire(import.meta.url),{PeerServer}=require("peer");
const signal=PeerServer({port:9100,host:"127.0.0.1",path:"/"});
const staticServer=spawn("python3",["-m","http.server","4173","--bind","127.0.0.1"],{stdio:"ignore"});
let browser;
const errors=[];
async function open(context){
  const page=await context.newPage();
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js",route=>route.fulfill({path:path.resolve("node_modules/peerjs/dist/peerjs.min.js"),contentType:"application/javascript"}));
  await page.addInitScript(()=>{
    window.CRYPTBOUND_E2E=true;
    window.CRYPTBOUND_PEER_OPTIONS={host:"127.0.0.1",port:9100,path:"/",secure:false};
  });
  for(let attempt=0;attempt<25;attempt++){
    try{await page.goto("http://127.0.0.1:4173/",{waitUntil:"domcontentloaded",timeout:5000});break;}
    catch(e){if(attempt===24)throw e;await new Promise(r=>setTimeout(r,200));}
  }
  await page.waitForFunction(()=>typeof window.cryptboundSnapshot==="function");
  return page;
}
async function main(){
  browser=await chromium.launch({headless:true,args:["--no-sandbox","--disable-dev-shm-usage"]});
  const context=await browser.newContext({viewport:{width:1440,height:940},deviceScaleFactor:1});
  const host=await open(context),guest=await open(context);
  assert.match(await host.title(),/深渊共鸣/);
  await host.locator("#nameInput").fill("房主");
  await host.locator("#createBtn").click();
  await host.waitForFunction(()=>/^[A-Z2-9]{8}$/.test(document.getElementById("roomCode").textContent),null,{timeout:15000});
  const code=await host.locator("#roomCode").textContent();
  assert.equal(code.length,8);
  await guest.locator("#nameInput").fill("队友");
  await guest.locator("#roomInput").fill(code);
  await guest.locator("#joinBtn").click();
  await host.waitForFunction(()=>Object.keys(window.cryptboundSnapshot()?.players||{}).length===2,null,{timeout:18000});
  await guest.waitForFunction(()=>Object.keys(window.cryptboundSnapshot()?.players||{}).length===2,null,{timeout:18000});
  const roomA=await host.evaluate(()=>window.cryptboundSnapshot().room);
  const roomB=await guest.evaluate(()=>window.cryptboundSnapshot().room);
  assert.equal(roomA,roomB);
  const guestId=await guest.evaluate(()=>Object.keys(window.cryptboundSnapshot().players).find(id=>id!=="host"));
  assert.ok(guestId);
  const initial=await host.evaluate(id=>window.cryptboundSnapshot().players[id].x,guestId);
  await guest.keyboard.down("d");
  await new Promise(r=>setTimeout(r,620));
  await guest.keyboard.up("d");
  await host.waitForFunction(({id,x})=>window.cryptboundSnapshot()?.players[id]?.x>x+25,{id:guestId,x:initial},{timeout:10000});
  await guest.waitForFunction(({id,x})=>window.cryptboundSnapshot()?.players[id]?.x>x+25,{id:guestId,x:initial},{timeout:10000});
  await fs.mkdir("artifacts",{recursive:true});
  await host.screenshot({path:"artifacts/host-two-players.png",fullPage:true});
  await guest.screenshot({path:"artifacts/guest-two-players.png",fullPage:true});
  assert.deepEqual(errors,[],"No unhandled browser exceptions");
  console.log("PASS: two real WebRTC clients joined, received matching rooms, and synced remote movement. Screenshots saved.");
}
try{await main();}
finally{await browser?.close();staticServer.kill();await new Promise(resolve=>signal.close(resolve));}
