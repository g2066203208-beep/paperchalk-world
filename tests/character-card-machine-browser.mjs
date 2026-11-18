/* Verified Chromium frames of the SAME 3D dispenser and real uploaded portraits.
 * Evidence is not concept art. Uses the built-in deterministic timeline seek.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const out='artifacts/character-card-machine';
fs.mkdirSync(out+'/videos',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
 '--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader',
 '--enable-unsafe-swiftshader'
]});
const results=[];
for(const d of [
 {name:'desktop',width:1440,height:900},
 {name:'portrait',width:390,height:844},
 {name:'landscape',width:844,height:390}
]){
 const context=await browser.newContext({viewport:{width:d.width,height:d.height},
  deviceScaleFactor:1,recordVideo:{dir:out+'/videos',size:{width:d.width,height:d.height}}});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 try{
  const response=await page.goto('http://127.0.0.1:4173/card-battle/character-card-machine.html',
   {waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.loaded,{timeout:22000});
  let initial=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert.equal(initial.reelMeshes,3);
  assert.equal(initial.cardModel3D,true);
  assert.equal(initial.metallic,true);
  assert.equal(initial.HDR,true);
  assert.equal(await page.evaluate(()=>window.PaperchalkCharacterMachineQA.manifestCount),35);
  if(d.name==='landscape'){
   const layout=await page.evaluate(()=>({
    stageBottom:document.querySelector('.stage').getBoundingClientRect().bottom,
    stageTop:document.querySelector('.stage').getBoundingClientRect().top,
    controlBottom:document.querySelector('.controls').getBoundingClientRect().bottom,
    windowHeight:innerHeight
   }));
   assert(layout.stageTop>=0&&layout.stageBottom<=layout.windowHeight,
    'landscape machine must fit entirely on the viewport BEFORE button click');
   assert(layout.controlBottom<=layout.windowHeight,
    'landscape draw buttons must remain visible without a scroll');
  }
  await page.screenshot({path:out+'/'+d.name+'-00-machine-standby.png'});
  // The exact user-supplied burgundy-gold artwork must be a real GitHub
  // WebP texture on the rear face, not procedurally redrawn geometry.
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.state?.cardBackReady,{timeout:16000});
  const original=await page.evaluate(async()=>{
   const state=window.PaperchalkCharacterMachineQA.state;
   const image=new Image();image.src=state.backImageUrl;
   await image.decode();
   return {...state,textureWidth:image.naturalWidth,textureHeight:image.naturalHeight};
  });
  assert.equal(original.backsideUsesOriginalTexture,true);
  assert.equal(original.artworkPlanesOnly,true,'no extruded or ornamental gold frame geometry');
  assert.equal(original.cardDecorationMeshes,0,'must not use chunky procedural gold frame');
  assert.equal(original.frontSideCulling,true,'front and back require GPU FrontSide culling');
  assert.equal(original.surfaceNormalsReady,true,'normalMap must be attached to real card back');
  assert.equal(original.foilMetalnessReady,true,'gold foil is classified in a material map');
  assert(original.foilPixels>100,'image RGB should identify meaningful fine gold lines');
  assert(original.backNormalPixels>100,'color-derived relief MUST produce non-flat normals');
  assert(original.backPaperFiberPixels>1000,'paper fibers must cover the whole burgundy plane');
  assert(original.backRoughnessRange[0]<.55 && original.backRoughnessRange[1]>.9,
   'foil and paper must NOT share one plastic-smooth roughness');
  assert(original.backPrintedPigment,'backside uses a carefully grained copy of original paint pixels');
  assert.equal(original.correctArtworkTextureOrientation,true,
   'generated print textures must have the same image top-left convention as original artwork');
  assert(original.frontPaperSheen>0 && original.backPaperSheen>0,
   'front paper and reverse stock need physical cellulose sheen, not glossy plastic');
  assert(original.backImageUrl.endsWith('/assets/cards/shared/character-card-back-anima.webp'));
  assert.equal(original.textureWidth,480);
  assert(original.textureHeight>700);
  await page.locator('#inspect').click();
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.state?.inspecting);
  assert.equal(await page.locator('#inspect-toolbar').isVisible(),true);
  await page.waitForTimeout(130);
  let cull=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert(cull.backVisible&&!cull.frontVisible&&cull.visibleArtworkFace==='back',
    'back-only image is visible after 180-degree rotation');
  assert.equal(cull.frontSideCulling,true);
  assert.equal(cull.studioLighting,true,'inspection needs independent, neutral studio lighting');
  assert(cull.inspectWarmIntensity<1,'the slot machine orange spotlight must not wash out portrait art');
  assert(cull.inspectBloom<.3,'do not burn white details with large HDR bloom in free viewer');
  // Inspect toolbar must not obscure the artwork: it's in its own layout row.
  const layout=await page.evaluate(()=>({
   cardRect:document.querySelector('#machine-canvas').getBoundingClientRect().toJSON(),
   toolbarRect:document.querySelector('#inspect-toolbar').getBoundingClientRect().toJSON()
  }));
  assert(layout.toolbarRect.y>=layout.cardRect.bottom-2,
    'inspection toolbar must sit BELOW canvas rather than cover the card');
  await page.screenshot({path:out+'/'+d.name+'-INSPECT-00-original-back.png'});
  await page.locator('#inspect-character').selectOption('wonder-circus/ringmaster.png');
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.state?.inspectorCharacterId==='wonder-circus/ringmaster.png'&&
   window.PaperchalkCharacterMachineQA?.state?.portraitLoaded,{timeout:10000});
  await page.locator('#inspect-front').click();
  await page.waitForTimeout(320);
  const frontState=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert(frontState.frontVisible&&!frontState.backVisible,
   'rear image MUST be culled as soon as the character turns toward camera');
  assert(frontState.portraitNormalsReady,'character portrait should receive subtle color-derived normal maps');
  assert(frontState.portraitNormalPixels>100,'actual portrait colors should generate real surface detail');
  assert(frontState.portraitPaperFiberPixels>1000,'all portrait regions require fibrous press-paper normals');
  assert(frontState.portraitRoughnessRange[0]>.75 &&
   frontState.portraitRoughnessRange[1]-frontState.portraitRoughnessRange[0]>.03,
   'portrait colors must stay MATTE while having variable printed-ink roughness');
  assert(frontState.portraitPrintedPigment,'the whole illustrated front must receive fine non-plastic pigment stipple');
  assert(frontState.portraitPaperSheen>0,'physical satin/cellulose sheen must exist on the card front');
  await page.screenshot({path:out+'/'+d.name+'-INSPECT-01-real-ringmaster-front.png'});
  await page.evaluate(()=>window.PaperchalkCharacterMachineQA.inspectRotate(Math.PI,0));
  await page.waitForTimeout(130);
  const reverseState=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert(reverseState.backVisible&&!reverseState.frontVisible,
   'turning back around must hide every pixel of character front');
  await page.evaluate(()=>window.PaperchalkCharacterMachineQA.inspectRotate(0,0));
  // Real pointer drag, not only a test-helper angle setter.
  const bounds=await page.locator('#machine-canvas').boundingBox();
  assert(bounds&&bounds.width>100&&bounds.height>150);
  const x=bounds.x+bounds.width*.51,y=bounds.y+bounds.height*.51;
  const yawBefore=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state.inspectionQuaternion);
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+Math.min(85,bounds.width*.24),y+Math.min(56,bounds.height*.19),{steps:7});
  await page.mouse.up();
  const afterDrag=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert.notDeepEqual(afterDrag.inspectionQuaternion,yawBefore,'actual mouse drag must rotate true THREE.Quaternion');
  assert(Math.abs(afterDrag.inspectionPitch)>.10,'vertical drag must rotate freely about X');
  // Buttons, wheel and mouse must all change REAL model zoom.
  const zoomBefore=afterDrag.inspectionZoom;
  await page.locator('#inspect-zoom-in').click();
  assert((await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state.inspectionZoom))>zoomBefore);
  await page.locator('#inspect-zoom-out').click();
  await page.mouse.move(x,y);
  await page.mouse.wheel(0,-270);
  const wheelZoom=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state.inspectionZoom);
  assert(wheelZoom>zoomBefore,'wheel must enlarge the card, not scroll the page');
  await page.evaluate(()=>{window.PaperchalkCharacterMachineQA.inspectRotate(.82,.27,.47);
   window.PaperchalkCharacterMachineQA.inspectZoom(2.40);});
  await page.screenshot({path:out+'/'+d.name+'-INSPECT-02-side-and-zoom.png'});
  const tilted=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert(tilted.inspectionZoom>=2.35);
  assert(Math.abs(tilted.inspectionYaw)>.75);
  assert(Math.abs(tilted.inspectionRoll)>.45,'Z-axis tilt should work in addition to yaw/pitch');
  // This was NOT possible in the old +/- 1.17 radian version.
  await page.evaluate(()=>window.PaperchalkCharacterMachineQA.inspectRotate(Math.PI*5,Math.PI*3,Math.PI*.8));
  const spins=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert(spins.inspectionYaw>14 && spins.inspectionPitch>8,'rotation must remain unrestricted beyond 360 degrees');
  const qnorm=Math.hypot(...spins.inspectionQuaternion);
  assert(Math.abs(qnorm-1)<.0001,'free-rotation quaternion must stay normalized');
  await page.evaluate(()=>{window.PaperchalkCharacterMachineQA.inspectZoom(6.5);
   window.PaperchalkCharacterMachineQA.inspectPan(1.2,-.70);});
  const deep=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert(deep.inspectionZoom>6,'deep magnification must be possible');
  assert(deep.inspectionPan[0]>1,'viewer must support panning while zoomed');
  await page.screenshot({path:out+'/'+d.name+'-INSPECT-04-zoomed-detail.png'});
  await page.locator('#inspect-reset').click();
  await page.screenshot({path:out+'/'+d.name+'-INSPECT-05-recentered.png'});
  await page.locator('#inspect-back').click();
  await page.waitForTimeout(340);
  cull=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert(cull.visibleArtworkFace==='back'&&cull.backVisible&&!cull.frontVisible,
   'manual back button must not leak opposite face');
  await page.screenshot({path:out+'/'+d.name+'-INSPECT-03-back-after-flip.png'});
  await page.locator('#inspect-exit').click();
  const restored=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert.equal(restored.inspecting,false);
  assert.equal(restored.studioLighting,false);
  assert(restored.inspectWarmIntensity>10,'original slot machine dramatic lighting must return on exit');
  await page.locator('#draw-one').click();
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.state?.current &&
   window.PaperchalkCharacterMachineQA?.state?.portraitLoaded,{timeout:22000});
  const stamps=[
   [400,'01-reels-fast'],
   [1550,'02-reels-brake'],
   [2100,'03-card-back-exiting-chute'],
   [2700,'04-real-card-rotation'],
   [3180,'05-hdr-reveal'],
   [3800,'06-portrait-on-card']
  ];
  let first,final;
  for(const [ms,label] of stamps){
   const stage=await page.evaluate(ms=>window.PaperchalkCharacterMachineQA.seek(ms),ms);
   if(ms===2100)assert(stage.card.visible&&stage.card.rotationY>3,
    'cardstock leaves MACHINE backside first');
   if(ms===2700)assert(stage.card.rotationY>0 && stage.card.rotationY<3.15);
   if(ms===3800)assert(stage.complete&&stage.card.rotationY<.01);
   await page.evaluate(()=>window.PaperchalkCharacterMachineQA.redraw());
   const png=await page.screenshot({path:out+'/'+d.name+'-'+label+'.png',animations:'disabled'});
   if(ms===400)first=png;if(ms===3800)final=png;
  }
  assert(!first.equals(final),'the live WebGL machine must visibly change during the sequence');
  assert(await page.locator('#card-name').isVisible(),'a REAL character must be named on reveal');
  const after=await page.evaluate(()=>window.PaperchalkCharacterMachineQA.state);
  assert.equal(after.revealed,true);
  assert(after.items>=1);
  assert(!errors.length,'fatal JS exceptions: '+errors.join('\n'));
  // Queue five ACTUAL new character cards, not five CSS clones.
  await page.locator('#draw-five').click();
  await page.waitForFunction(()=>window.PaperchalkCharacterMachineQA?.state?.queued>=4 ||
   window.PaperchalkCharacterMachineQA?.state?.starting,{timeout:3000});
  await page.screenshot({path:out+'/'+d.name+'-07-five-draws-queued.png'});
  results.push({viewport:d.name,passed:true,character:after.current,id:after.currentId,
   portraits:35,beforeCount:initial.items,afterCount:after.items,errors});
  console.log('PASS',d.name,after.current,'portrait from',after.currentId);
 }catch(e){
  results.push({viewport:d.name,passed:false,error:String(e.stack||e),errors});
  await page.screenshot({path:out+'/'+d.name+'-FAIL.png'}).catch(()=>{});
  console.error('FAIL',d.name,e.stack||e);
 }finally{await context.close();}
}
await browser.close();
fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
assert(results.every(r=>r.passed),'REAL character-card machine browser QA failed');
