import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFileSync,mkdirSync} from "node:fs";
import {resolve,extname} from "node:path";
import {chromium} from "playwright";

const root=resolve("site");
const mime={".html":"text/html; charset=utf-8",".webp":"image/webp",".css":"text/css"};
const server=createServer((req,res)=>{
 const p=decodeURI(new URL(req.url||"/","http://local").pathname);
 const name=resolve(root,"."+ (p.endsWith("/")?p+"index.html":p));
 if(!name.startsWith(root+"/")){res.writeHead(403);res.end();return}
 try{res.writeHead(200,{"content-type":mime[extname(name)]||"text/plain","cache-control":"no-store"});res.end(readFileSync(name))}
 catch{res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const base="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const errors=[];
try{
 for(const [name,width,height] of [["desktop",1440,900],["phone",390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  page.on("pageerror",e=>errors.push(name+": "+e.message));
  await page.goto(base+"/false-memory/",{waitUntil:"load"});
  assert.equal(await page.locator("#hall.active").count(),1);
  assert.equal(await page.locator("#hotspots button").count(),4);
  const image=await page.locator("#hero").evaluate(e=>({loaded:e.complete&&e.naturalWidth>0,src:e.currentSrc,width:e.naturalWidth,height:e.naturalHeight}));
  assert.equal(image.loaded,true,JSON.stringify(image));
  assert.equal(image.height,846,"protagonist must retain full 846px source height");
  assert.equal(image.width,260,"protagonist must retain full 260px source width (not a blurry thumbnail)");
  await page.locator('button[data-title="观察字条"]').click();
  assert.match(await page.locator("#line").innerText(),/明日值日/);
  await page.locator('button[data-title="检查时钟"]').click();
  await page.locator('button[data-title="进入 3-B"]').click();
  assert.equal(await page.locator("#classroom.active").count(),1);
  await page.locator('button[data-title="调查课桌"]').click();
  await page.locator("#choices button").first().waitFor({timeout:4000});
  assert.equal(await page.locator("#choices button").count(),2);
  await page.locator("#choices button").last().click();
  assert.match(await page.locator("#speaker").innerText(),/结局二/);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=2,"no unwanted horizontal overflow on "+name+": "+overflow);
  mkdirSync("artifacts/false-memory",{recursive:true});
  await page.screenshot({path:"artifacts/false-memory/"+name+".png",fullPage:true,animations:"disabled"});
  await page.close();
  console.log("PASS "+name+": sprite, 3 scenes, 4 clues, branching ending, layout");
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(r=>server.close(r))}
