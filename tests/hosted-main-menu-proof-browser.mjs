import {chromium} from "playwright";
import fs from "node:fs";
const out="artifacts/hosted-main-menu-proof";
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--enable-webgl","--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const pages=[
{name:"desktop-1920x1080",width:1920,height:1080},
{name:"laptop-1366x768",width:1366,height:768}
];
const report=[];
for(const vp of pages){
 const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:1,colorScheme:"dark",recordVideo:{dir:out+"/video",size:{width:vp.width,height:vp.height}}});
 const page=await ctx.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 const candidates=[
  {kind:"actual-GitHub-Pages",url:"https://g2066203208-beep.github.io/paperchalk-world/"},
  {kind:"current-checked-out-source",url:"http://127.0.0.1:4173/index.html"}
 ];
 let origin=null;
 try{
  for(const dest of candidates){
   try{
    const resp=await page.goto(dest.url,{waitUntil:"domcontentloaded",timeout:30000});
    if(resp?.status()===200&&await page.locator("#scene-menu-main").count()){origin=dest;break;}
   }catch(e){console.log("Menu candidate unavailable",dest.url,String(e).slice(0,180));}
  }
  if(!origin)throw Error("Unable to load either hosted menu or checked-out main menu");
  await page.waitForFunction(()=>document.getElementById("source")?.naturalWidth>0 && document.getElementById("scene")?.dataset.scene==="menu",null,{timeout:22000});
  await page.waitForTimeout(1800);
  // Record what is truly in the DOM, and whether the new Anima demo has an actual hosted entry.
  const list=await page.locator("#scene-menu-main button").evaluateAll(bs=>bs.map(b=>{
   const r=b.getBoundingClientRect(),s=getComputedStyle(b);
   return {id:b.id,label:b.textContent.trim(),disabled:b.disabled,visible:r.width>0&&r.height>0&&s.visibility!=="hidden",rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};
  }));
  const screenshot=out+"/"+vp.name+"-01-current-main-menu.png";
  await page.screenshot({path:screenshot,fullPage:false,animations:"disabled"});
  // Scroll the native menu container so truncated lower entries can also be inspected.
  const nav=page.locator("#scene-menu-main");
  await nav.evaluate(el=>{el.scrollTop=el.scrollHeight});
  await page.waitForTimeout(240);
  await page.screenshot({path:out+"/"+vp.name+"-02-menu-bottom.png",fullPage:false,animations:"disabled"});
  const doc=await page.evaluate(()=>({
   pageTitle:document.title,scene:document.querySelector("#scene")?.dataset.scene,
   sceneMenu:document.querySelector("#scene-menu-main")?.getBoundingClientRect().toJSON(),
   anDemoButton:!!document.querySelector("#menu-anima-paintover")
  }));
  report.push({viewport:vp.name,origin,menu:list,doc,pageErrors:errors,screenshots:[screenshot]});
  console.log("CAPTURED HOSTED MAIN MENU",vp.name,origin.kind,JSON.stringify(list.map(x=>x.label)));
 }catch(e){report.push({viewport:vp.name,error:String(e),origin,pageErrors:errors});console.error(e);}
 finally{await ctx.close();}
}
await browser.close();
fs.writeFileSync(out+"/results.json",JSON.stringify(report,null,2));
if(!report.some(r=>r.menu?.length))process.exitCode=1;