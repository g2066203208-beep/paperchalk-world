/* Real game staging acceptance: opaque painted feet touch the snow plane.
 * No concept image, no fake actors. Loads real 704x1024 Anima cutouts,
 * checks feet from their ACTUAL alpha pixels, measures two world depths,
 * and records Chrome desktop/phone screenshots + WebM.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const OUT="artifacts/snowbound-world-integration";
fs.mkdirSync(OUT+"/videos",{recursive:true});
const devices=[
 {name:"desktop-1920",width:1920,height:1080,mobile:false},
 {name:"phone-390",width:390,height:844,mobile:true},
 {name:"landscape-844",width:844,height:390,mobile:true}
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const reports=[];
for(const cfg of devices){
 const context=await browser.newContext({
   viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:1,
   isMobile:cfg.mobile,hasTouch:cfg.mobile,
   recordVideo:{dir:OUT+"/videos",size:{width:cfg.width,height:cfg.height}}
 });
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto("http://127.0.0.1:4173/card-battle/snowbound-journey.html",
    {waitUntil:"networkidle"});
  for(const action of ["town","new","leader","node"]){
    await page.locator('[data-act="'+action+'"]:visible:not([disabled])').first().click();
    await page.waitForFunction(()=>!window.PaperchalkSnowboundUI?.motion?.isBusy(),
      null,{timeout:22000});
  }
  await page.waitForFunction(()=>[...document.querySelectorAll(".stage-actor .unit-art img")]
    .every(img=>img.dataset.cutoutReady==="1" &&
      img.closest(".unit-art")?.dataset.maskReady==="1"),null,{timeout:16000});
  await page.waitForTimeout(240);
  const measure=await page.evaluate(()=>{
    const board=document.querySelector(".double-board").getBoundingClientRect();
    const field=document.querySelector(".battle-field").getBoundingClientRect();
    const nodes=[...document.querySelectorAll(".battle-slot:has(.battle-unit)")];
    const opaqueFoot=(img)=>{
      // Downsample the actual converted transparent art, then locate its
      // lowest painted pixels. An img element's empty box isn't a foot!
      const c=document.createElement("canvas");c.width=88;c.height=128;
      const g=c.getContext("2d",{willReadFrequently:true});
      g.clearRect(0,0,88,128);g.drawImage(img,0,0,88,128);
      const pix=g.getImageData(0,0,88,128).data;
      let last=-1,count=0;
      for(let y=0;y<128;y++)for(let x=0;x<88;x++){
        if(pix[(y*88+x)*4+3]>64){last=y;count++}
      }
      const r=img.getBoundingClientRect();
      return {lastOpaqueRow:last,opaquePixels:count,
        y:r.top+(last+.5)/128*r.height};
    };
    return {
      viewport:[innerWidth,innerHeight],
      board:{top:board.top,bottom:board.bottom,height:board.height},
      field:{top:field.top,bottom:field.bottom,height:field.height},
      background:getComputedStyle(document.querySelector(".battle-scene")).backgroundImage,
      nodes:nodes.map(slot=>{
        const img=slot.querySelector(".unit-art img");
        const r=slot.getBoundingClientRect();
        const art=img.closest(".unit-art");
        const mask=getComputedStyle(art,"::before").webkitMaskImage||
          getComputedStyle(art,"::before").maskImage;
        return {side:slot.dataset.side,slot:slot.dataset.slot,
          row:Number(slot.dataset.slot)>2?1:0,
          x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,
          feet:opaqueFoot(img),cutoutReady:img.dataset.cutoutReady,
          maskReady:art.dataset.maskReady,mask,
          groundShadow:getComputedStyle(slot,"::before").backgroundImage,
          outline:getComputedStyle(slot.querySelector(".battle-unit")).borderTopWidth};
      })
    };
  });
  assert(measure.background.includes("snowy-forest-reference.webp"),
    "actual source forest must remain behind the actors");
  // Validate the physically separate front-plane is the SAME original
  // painting's cropped ink, not a synthetic replacement scene image.
  const branches=await page.evaluate(async()=>{
    const el=document.querySelector(".snowforest-ink-foreground");
    if(!el)return {exists:false};
    const style=getComputedStyle(el);
    const source=style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if(!source)return {exists:true,decoded:false,background:style.backgroundImage};
    const im=new Image();im.src=source;await im.decode();
    const canvas=document.createElement("canvas");canvas.width=96;canvas.height=64;
    const cx=canvas.getContext("2d",{willReadFrequently:true});
    cx.drawImage(im,0,0,96,64);
    const a=cx.getImageData(0,0,96,64).data;let marked=0,blank=0;
    for(let i=3;i<a.length;i+=4){if(a[i]>20)marked++;else blank++}
    return {exists:true,decoded:true,width:im.naturalWidth,height:im.naturalHeight,
      marked,blank,background:style.backgroundImage};
  });
  assert(branches.exists&&branches.decoded&&branches.width===1536&&branches.height===1024,
    "separate original-ink reed foreground must decode at matching source resolution: "+JSON.stringify(branches));
  assert(branches.marked>20&&branches.blank>3000,
    "front-plane must have thin painted branches and mostly real transparency, not a new opaque image");
  assert.equal(measure.nodes.length,3,"opening encounter must display three original characters");
  for(const unit of measure.nodes){
    const feet=unit.feet.y;
    const groundDist=measure.board.bottom-feet;
    assert(unit.feet.opaquePixels>600&&unit.feet.lastOpaqueRow>=105,
       "actual silhouette must have recognizable feet: "+JSON.stringify(unit));
    assert(groundDist>=-7&&groundDist<=measure.board.height*.18,
       "FLOATING ACTOR: painted boots not in the snow ground band: "+JSON.stringify({
         viewport:cfg.name,unit,groundDistance:groundDist,board:measure.board}));
    assert.equal(unit.maskReady,"1","lighting must use the actual Anima alpha matte");
    assert(unit.mask?.includes("blob:"),"actor lighting must be clipped to the silhouette");
    assert(unit.groundShadow.includes("radial-gradient"),
      "each standing person must cast snow contact AO, not a floating rectangular panel");
    assert.equal(unit.outline,"0px","actor must be frameless and belong to the scene");
  }
  const near=measure.nodes.filter(x=>x.row===0),far=measure.nodes.filter(x=>x.row===1);
  if(near.length&&far.length){
    const minNear=Math.min(...near.map(x=>x.feet.y));
    const maxFar=Math.max(...far.map(x=>x.feet.y));
    assert(minNear-maxFar>=7,
      "second-depth actors must stand slightly farther uphill, not hover above the tree canopy");
  }
  assert.deepEqual(errors,[],"original scene color/alpha/motion code must produce no runtime errors");
  await page.screenshot({path:OUT+"/"+cfg.name+"-snow-grounded.png",fullPage:false});
  reports.push({device:cfg.name,passed:true,measure,
    evidence:"actual alpha-mask feet + Chrome screenshot + original video"});
  console.log("PASS real-world original Anima scene grounding",cfg.name,
    measure.nodes.map(u=>({side:u.side,slot:u.slot,paintedFootY:+u.feet.y.toFixed(1)})));
 }catch(e){
  reports.push({device:cfg.name,passed:false,error:String(e.stack||e)});
  await page.screenshot({path:OUT+"/"+cfg.name+"-FAILED.png"}).catch(()=>{});
  console.error("FAIL snow-ground world",cfg.name,e.stack||e);
 }finally{await context.close()}
}
await browser.close();
fs.writeFileSync(OUT+"/results.json",JSON.stringify(reports,null,2));
assert(reports.every(r=>r.passed),"snow ground integration acceptance FAILED");
