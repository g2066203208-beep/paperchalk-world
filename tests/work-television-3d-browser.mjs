import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('artifacts/work-tv-3d');
fs.mkdirSync(out,{recursive:true});
const metal=s=>s.match(/function metal\(nx,ny,nz,rough,ambient,lamp\) \{[\s\S]*?\n  \}/)?.[0];
const coin=fs.readFileSync('site/card-battle/slots-daggers/coin-art.js','utf8');
const tv=fs.readFileSync('site/card-battle/slots-daggers/television/television.js','utf8');
const html=fs.readFileSync('site/card-battle/slots-daggers/television/index.html','utf8');
const tvCpu=fs.readFileSync('site/card-battle/slots-daggers/television/work-tv-cpu.js','utf8');
const broadcast=fs.readFileSync('site/card-battle/slots-daggers/television/broadcast.js','utf8');
if(!html.includes('src="broadcast.js"')||!html.includes('src="../../../l2d/rig.js"')||!broadcast.includes('protagonist-front.webp'))throw Error('Canonical protagonist presenter was not connected to real broadcast channels');
if(!tv.includes('function glassMesh()')||!tv.includes("mode==='glass3D'"))throw Error('Glass is still a 2D sprite; missing real depth-rasterized 3D cup mesh');
if(!metal(tvCpu)||metal(coin)!==metal(tvCpu))throw Error('WORK CPU TV module must use byte-identical original CoinTable metal()');
for(const token of ['const dieSize=48;', 'function dieHeight(x,y,k)', 'function makeDies()', 'const dies=makeDies();'])if(!tvCpu.includes(token))throw Error('Original Work 48x48 emboss normal-map pipeline was not ported: '+token);
if(!html.includes('src="work-tv-cpu.js"')||!tv.includes('WorkTVCPU.shade('))throw Error('3D TV pixels are still shaded flat instead of Work CPU alloy/normal-mapped shading');
if(!metal(coin)||metal(coin)!==metal(tv))throw Error('Original Work coin metallic shading function was modified');
if(!html.includes('src="../reel-art.js"')||!html.includes('src="../cabinet-art.js"'))throw Error('Slot ReelArt/CabinetArt originals were not wired to the television');
if(!tv.includes('frontScrews:0')||!tv.includes('deskMesh()')||!tv.includes('plantMesh()')||!tv.includes('woodQuad('))throw Error('Real table and faceted TV mesh missing');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']});
const viewports=[{name:'desktop-1280x720',width:1280,height:720},{name:'phone-portrait-390x844',width:390,height:844},{name:'phone-landscape-844x390',width:844,height:390}];
const results=[];
for(const v of viewports){
 const context=await browser.newContext({viewport:{width:v.width,height:v.height},deviceScaleFactor:1,recordVideo:{dir:out,size:{width:v.width,height:v.height}}});
 const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  await page.goto('http://127.0.0.1:4173/card-battle/slots-daggers/television/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.WorkTVQA?.state().screenMappingPixels>5000&&window.WorkTVQA?.state().actualReelArt&&window.WorkTVQA?.state().originalCabinetTexture,{timeout:22000});
  await page.waitForTimeout(2250);
  const a=await page.evaluate(()=>WorkTVQA.state());
  if(a.meshFaces<175||a.crtTriangles!==104||a.frontScrews!==0||a.screenPrograms!==6||a.powerTransition!=='on'||a.crtPixelCoverage<3000)throw Error('Low-poly TV model / Work CRT incomplete '+JSON.stringify(a));
  if(!a.modelColor.includes('Work')||!a.screenShape.includes('faceted')||!a.deskRealMesh||!a.originalWoodTexture||!a.originalGlassSprite||!a.originalIvyAsset||a.realGlass3DFaces<80||a.physicalFurnitureFaces<20||a.physicalPlantFaces<100||a.frameRenderMs>160)throw Error('Work material reuse, real desk, plant or performance regression '+JSON.stringify(a));
  // These counters are incremented only inside the REAL barycentric per-pixel
  // material raster, not by presence of functions or screenshot color matches.
  const cpu=a.workCpu;
  if(a.originalPaletteCount!==256||a.workCpuNormalMap!==48||!cpu||cpu.pixelShaders<15000||cpu.normalMapHits<40||cpu.goldPixels<200||cpu.materialTexels<1000)
    throw Error('FAIL: original Work pixel shader / stamped die normals / alloy palette or real CabinetArt texels were not sampled during TV rendering: '+JSON.stringify(a));
  if(a.geometryBuildMs>16000)throw Error('Work CPU material build exceeds hard startup budget: '+JSON.stringify(a));
  await page.screenshot({path:path.join(out,v.name+'-01-table-original-wood-glass-ivy.png')});
  const offPos=a.controlPositions.power;
  await page.mouse.click(offPos[0],offPos[1]);
  await page.waitForTimeout(850);
  const off=await page.evaluate(()=>WorkTVQA.state());
  if(off.power!==false||off.powerTransition!=='off'||off.pressCount!==1)throw Error('Physical 3D power dial does not actually turn TV off '+JSON.stringify(off));
  await page.screenshot({path:path.join(out,v.name+'-02-real-dial-power-off.png')});
  const onPos=off.controlPositions.power;
  await page.mouse.click(onPos[0],onPos[1]);
  await page.waitForTimeout(280);
  const ignition=await page.evaluate(()=>WorkTVQA.state());
  if(!ignition.power||ignition.powerTransition!=='boot'||ignition.pressCount!==2)throw Error('Physical 3D power dial does not ignite CRT '+JSON.stringify(ignition));
  await page.screenshot({path:path.join(out,v.name+'-03-tube-ignition-white-line.png')});
  await page.waitForTimeout(1390);
  const recovered=await page.evaluate(()=>WorkTVQA.state());
  if(recovered.powerTransition!=='on')throw Error('Boot aperture did not finish '+JSON.stringify(recovered));
  await page.screenshot({path:path.join(out,v.name+'-04-completed-crt-warm-boot.png')});
  const channelPos=recovered.controlPositions.channel;
  await page.mouse.click(channelPos[0],channelPos[1]);
  await page.waitForTimeout(480);
  const tuned=await page.evaluate(()=>WorkTVQA.state());
  if(tuned.broadcast?.channels!==6||tuned.broadcast?.errors?.length)
    throw Error('Six real channels or portrait fetch failed '+JSON.stringify(tuned.broadcast));
  if(tuned.channel!==1||tuned.pressCount!==3)throw Error('Second physical 3D knob does not switch WORK reel ad '+JSON.stringify(tuned));
  await page.screenshot({path:path.join(out,v.name+'-05-presenter-commercial-second-channel.png')});
  for(let expected=2;expected<6;expected++){
   await page.evaluate(()=>WorkTVQA.nextChannel());
   await page.waitForTimeout(170);
   const q=await page.evaluate(()=>WorkTVQA.state());
   if(q.channel!==expected||q.screenPrograms!==6)throw Error('Failed broadcast channel '+expected);
   await page.screenshot({path:path.join(out,v.name+'-broadcast-0'+(expected+1)+'.png')});
  }
  await page.waitForTimeout(200);
  const broadcastStatus=await page.evaluate(()=>WorkTVQA.state().broadcast);
  if(broadcastStatus.loadedPortraits<2||!broadcastStatus.hostIsCanonical||!broadcastStatus.hostL2D||!broadcastStatus.originalGameBreathRig)
   throw Error('Canonical characters not loaded as live broadcast hosts '+JSON.stringify(broadcastStatus));
  await page.evaluate(()=>WorkTVQA.nextChannel()); // wraps the physical tuner to NEWS
  if((await page.evaluate(()=>WorkTVQA.state().channel))!==0)throw Error('Channel dial did not wrap to NEWS');
  await page.keyboard.press('i');
  await page.waitForTimeout(120);
  const guide=await page.evaluate(()=>WorkTVQA.state());
  if(!guide.showGuide||guide.programScripts!==6)throw Error('Real CRT 6-channel electronic program guide unavailable '+JSON.stringify(guide));
  await page.screenshot({path:path.join(out,v.name+'-07-native-crt-channel-guide.png')});
  await page.keyboard.press('i');
  if((await page.evaluate(()=>WorkTVQA.state().showGuide)))throw Error('I cannot close TV native guide');
  await page.keyboard.press('Digit4');
  if((await page.evaluate(()=>WorkTVQA.state().channel))!==3)throw Error('Direct keyboard tuning channel 4 failed');
  await page.evaluate(()=>WorkTVQA.setAngles(26,7));
  await page.waitForTimeout(290);
  const turned=await page.evaluate(()=>WorkTVQA.state());
  if(turned.yaw!==26||turned.pitch!==7||turned.renderCache<=a.renderCache)throw Error('True-3D body cannot rotate or lacks depth rebuild '+JSON.stringify(turned));
  await page.screenshot({path:path.join(out,v.name+'-06-depth-of-real-television.png')});
  if(errors.length)throw Error('Javascript errors '+errors.join(' | '));
  results.push({viewport:v.name,on:a,off,ignition,recovered,tuned,turned,errors});
  console.log('PASS',v.name,JSON.stringify({on:{model:a.meshFaces,screen:a.crtTriangles,originalReel:a.actualReelArt,cabinet:a.originalCabinetTexture,cpuPixels:a.workCpu.pixelShaders,dieNormals:a.workCpu.normalMapHits,patinaPixels:a.workCpu.materialTexels,cpuBuildMs:a.geometryBuildMs,fps:a.fps,frameMs:a.frameRenderMs},off:{power:off.power,transition:off.powerTransition},ignition:ignition.powerTransition,tuned:tuned.channel,turn:turned.yaw}));
 }catch(e){
  await page.screenshot({path:path.join(out,v.name+'-FAIL-debug.png')}).catch(()=>{});
  console.error('FAIL',v.name,String(e),errors);
  throw e;
 }finally{await context.close();}
}
for(const legacy of ['coin-lab/index.html','coin-lab/items.html','coin-pusher/index.html','coin-pusher/standalone.html']){
 const p=await browser.newPage();
 await p.goto('http://127.0.0.1:4173/card-battle/slots-daggers/'+legacy,{waitUntil:'domcontentloaded'});
 await p.waitForURL('**/television/index.html',{timeout:12000});
 await p.close();console.log('PASS legacy redirect',legacy);
}
await browser.close();
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({identicalOriginalMetal:true,results},null,2));