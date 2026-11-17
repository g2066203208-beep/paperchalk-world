import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const OUT="artifacts/visual-studies-20261117";fs.mkdirSync(OUT+"/video",{recursive:true});
const browser=await chromium.launch({headless:true,args:["--no-sandbox","--enable-webgl","--use-angle=swiftshader"]});
const cases=[
 {name:"quiet",url:"portrait-study-a.html",mode:"a"},
 {name:"theatre",url:"portrait-study-b.html",mode:"b"},
 {name:"carnival",url:"carnival-study.html",mode:"c"}
];
const dims=[{name:"desktop-1920",width:1920,height:1080,mobile:false},{name:"phone-390",width:390,height:844,mobile:true}];
const reports=[];
for(const c of cases)for(const d of dims){
 const context=await browser.newContext({viewport:{width:d.width,height:d.height},deviceScaleFactor:1,
  isMobile:d.mobile,hasTouch:d.mobile,recordVideo:{dir:OUT+"/video",size:{width:d.width,height:d.height}}});
 const page=await context.newPage(),errs=[];
 page.on("pageerror",e=>errs.push(e.message));
 const id=c.name+"-"+d.name;
 try{
  await page.goto("http://127.0.0.1:4173/visual-studies/"+c.url,{waitUntil:"networkidle",timeout:25000});
  await page.waitForFunction(()=>window.PaperchalkVisualStudies?.ready===true,null,{timeout:25000});
  const original=await page.evaluate(()=>{
   const s=window.PaperchalkVisualStudies;
   return {mode:s.mode,ready:s.ready,actorCount:s.actorCount,hasOriginalArt:s.hasOriginalArt,layers:s.sceneLayers,
    stageSize:[document.getElementById("study").clientWidth,document.getElementById("study").clientHeight],
    images:[...document.querySelectorAll(".actor img")].map(img=>({ready:img.dataset.cutoutReady,
     src:img.dataset.cutoutReady==="1"?"converted-from-github-image":img.src,
     bounds:(()=>{let r=img.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()})),
    curtainCount:document.querySelectorAll(".theatre .curtain").length,
    gearCount:document.querySelectorAll(".cog").length,
    pencilCount:document.querySelectorAll(".pencil").length
   };
  });
  assert.equal(original.mode,c.mode);
  assert(original.layers>=2,"multiple layered world elements are required");
  assert(original.stageSize[0]===d.width&&original.stageSize[1]===d.height,"viewport stage must fit");
  if(c.mode!=="c"){
   assert.equal(original.actorCount,2,"both approved original Anima characters must load");
   assert(original.hasOriginalArt,"both original Anima cutouts must succeed");
   for(const img of original.images)assert(img.bounds[0]>-d.width&&img.bounds[2]>40&&img.bounds[3]>100,"portrait within viewport");
   if(c.mode==="b")assert.equal(original.curtainCount,2,"real layered theatre curtains");
  }else{
   assert(original.gearCount>=5&&original.pencilCount>=6,"complete active paper carnival stage");
   assert(await page.locator(".boat svg").isVisible(),"original paper actor must be visible");
  }
  await page.screenshot({path:OUT+"/"+id+"-01-actual.png"});
  await page.locator("#act").click();
  await page.waitForTimeout(c.mode==="c"?280:260);
  assert((await page.evaluate(()=>window.PaperchalkVisualStudies.played))>=1,"action must trigger actual animation");
  await page.screenshot({path:OUT+"/"+id+"-02-action.png"});
  await page.waitForTimeout(640);
  await page.locator("#lights").click();
  assert(await page.locator("#study").evaluate(el=>el.classList.contains("lite")),"lighting comparison must toggle");
  await page.screenshot({path:OUT+"/"+id+"-03-light-comparison.png"});
  if(c.mode==="c"){
   await page.locator("#perspective").click();
   assert(await page.locator("#study").evaluate(el=>el.classList.contains("is-angled")),"perspective toggle works");
   await page.screenshot({path:OUT+"/"+id+"-04-depth.png"});
  }else{
   await page.locator("#detail").click();
   assert(await page.locator("#study").evaluate(el=>el.classList.contains("no-ground")),"grounding debug toggle works");
   await page.screenshot({path:OUT+"/"+id+"-04-no-contact-shadow.png"});
  }
  assert.deepEqual(errs,[],"no runtime JS errors");
  reports.push({case:id,passed:true,original,errors:errs});
  console.log("PASS visual study "+id,original);
 }catch(e){
  reports.push({case:id,passed:false,error:String(e.stack||e)});
  await page.screenshot({path:OUT+"/"+id+"-FAILED.png"}).catch(()=>{});
  console.error("FAIL visual study "+id,e.stack||e);
 }finally{await context.close()}
}
await browser.close();
fs.writeFileSync(OUT+"/results.json",JSON.stringify(reports,null,2));
assert(reports.every(x=>x.passed),"Independent visual studies browser QA failed");
