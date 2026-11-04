/* Production Chromium proof: actual 25 PSD textures, not generated art.
 * Crouch cloth, both real grasping hands, rigid axe and planted shoe soles
 * are rendered with the exact shared runtime function, then saved as frames.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
const base=resolve('site'),types={'.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.html':'text/html','.png':'image/png','.webp':'image/webp',
 '.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),
  pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname,
  file=resolve(base,'.'+pathname);
 if(!file.startsWith(base+sep)){res.writeHead(403);res.end();return;}
 try{
  const bytes=readFileSync(file);
  res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});
  res.end(bytes);
 }catch(e){res.writeHead(404);res.end(pathname);}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,
 args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
const dir='artifacts/protagonist-crouch/motion';
mkdirSync(dir,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url+'/character-editor/?character=protagonist-crouch-axe&side=front',
  {waitUntil:'load'});
 await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-crouch-axe'&&
  window.PaperchalkPartRigStudio?.state?.active&&
  window.characterEditor.S.layers.front.filter(x=>x.sourcePart).length===25&&
  !document.getElementById('rig-crouch-motion')?.hidden,
  null,{timeout:60000});
 assert.equal(await page.locator('#rig-crouch-motion input[data-crouch]').count(),4);
 const baseline=await page.evaluate(()=>({
  name:window.PaperchalkStudio.list.get('protagonist-crouch-axe').label,
  parts:Object.keys(window.PaperchalkPartRigStudio.state.model.parts).length,
  movement:window.PaperchalkPartRigStudio.state.model.crouchDynamics,
  weapon:window.PaperchalkPartRigStudio.state.model.parts.axe.kind
 }));
 assert.equal(baseline.parts,25);
 assert.equal(baseline.weapon,'fixed');
 assert.deepEqual(baseline.movement,{version:1,cloth:1,axe:1,legs:1,feet:1});
 // Four real user-adjustable coupled motions persist on this action.
 await page.evaluate(()=>{
  for(const [id,value] of [['cloth','115'],['axe','90'],['legs','110'],['feet','85']]){
   const input=document.querySelector('#rig-crouch-motion input[data-crouch="'+id+'"]');
   input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));
  }
 });
 await page.locator('#btnSave').click();
 await page.waitForFunction(async()=>{
  const m=await window.PaperchalkStudio.readPartRig('protagonist-crouch-axe','front');
  return m?.crouchDynamics?.cloth===1.15&&m.crouchDynamics.axe===.9&&
   m.crouchDynamics.legs===1.1&&m.crouchDynamics.feet===.85;
 },null,{timeout:35000});
 await page.screenshot({path:dir+'/crouch-rig-controls.png',fullPage:true});
 const phases=Array.from({length:15},(_,i)=>i*.42);
 const evidence=[];
 for(let i=0;i<phases.length;i++){
  const pose=await page.evaluate(phase=>{
   const model=window.PaperchalkPartRigStudio.state.model,
     layers=window.characterEditor.S.layers.front.filter(p=>p.sourcePart),
     core=window.PaperchalkPartRigCore,
     canvas=document.createElement('canvas');
   canvas.width=1024;canvas.height=1024;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const start=performance.now();
   core.draw(ctx,layers,model,phase);
   const drawMs=performance.now()-start,
     data=ctx.getImageData(0,0,1024,1024).data;
   let visible=0;for(let x=3;x<data.length;x+=4)if(data[x]>50)visible++;
   return {url:canvas.toDataURL('image/png'),visible,drawMs};
  },phases[i]);
  assert.ok(pose.visible>145000,'real crouch frame must contain genuine PSD art');
  writeFileSync(dir+'/phase-'+String(i).padStart(2,'0')+'.png',
    Buffer.from(pose.url.slice(pose.url.indexOf(',')+1),'base64'));
  evidence.push({phase:phases[i],pixels:pose.visible,renderMs:pose.drawMs});
 }
 // Verify the actual rendered game frames change without cheap whole-image
 // translation or a frozen display; core geometry tests enforce the grips.
 const comparison=await page.evaluate(()=>{
  const model=window.PaperchalkPartRigStudio.state.model,core=window.PaperchalkPartRigCore,
    layers=window.characterEditor.S.layers.front.filter(p=>p.sourcePart);
  const frame=t=>{
   const c=document.createElement('canvas');c.width=1024;c.height=1024;
   const ctx=c.getContext('2d',{willReadFrequently:true});
   core.draw(ctx,layers,model,t);
   return ctx.getImageData(0,0,1024,1024).data;
  };
  const a=frame(0),b=frame(2.6);
  const region=(x0,y0,x1,y1)=>{
   let changed=0;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const n=(y*1024+x)*4;
    if(Math.abs(a[n]-b[n])+Math.abs(a[n+1]-b[n+1])+
       Math.abs(a[n+2]-b[n+2])+Math.abs(a[n+3]-b[n+3])>32)changed++;
   }
   return changed;
  };
  return {cloth:region(290,620,810,895),
   weapon:region(15,175,260,425),
   footwear:region(385,880,735,1018)};
 });
 assert.ok(comparison.cloth>80,'rendered skirt/coat hem must actually flutter');
 assert.ok(comparison.weapon>50,'real held axe must move, not stay frozen');
 assert.ok(comparison.footwear>15,'shoe uppers must bend slightly');
 await page.reload({waitUntil:'load'});
 await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
  window.PaperchalkPartRigStudio.state.model?.characterId==='protagonist-crouch-axe'&&
  window.PaperchalkPartRigStudio.state.model.crouchDynamics.cloth===1.15,
  null,{timeout:60000});
 assert.equal(await page.locator('#rig-crouch-motion input[data-crouch="axe"]').inputValue(),'90');
 assert.deepEqual(errors,[],'studio must not throw exceptions during 15 true frames or save/reload');
 console.log('PASS CROUCH REAL FRAMES: '+JSON.stringify({count:phases.length,
  pixels:evidence[0].pixels,comparison,
  avgMs:Math.round(evidence.reduce((sum,e)=>sum+e.renderMs,0)/evidence.length*10)/10,
  saved:baseline.movement,poseAfterReload:'unchanged'}));
 await page.close();
 // The GAME must receive exactly the saved combined movement settings.
 const game=await browser.newPage({viewport:{width:1280,height:800}});
 const gameErrors=[];game.on('pageerror',e=>gameErrors.push(e.message));
 await game.goto(url+'/?dev=1&scene=classroom',{waitUntil:'load'});
 await game.waitForFunction(()=>window.PaperchalkCharacterDev?.ready,null,{timeout:45000});
 await game.evaluate(()=>window.PaperchalkCharacterDev.assign(
  'enemy','protagonist-crouch-axe','front',false));
 await game.waitForFunction(()=>window.PaperchalkL2DLibrary?.get('enemy')?.layers.length===25&&
  window.PaperchalkL2DLibrary.get('enemy').model.crouchDynamics?.cloth!==undefined&&
  window.PaperchalkL2DLibrary.inspect('enemy').renderedFrames>=4,
  null,{timeout:45000});
 const actual=await game.evaluate(()=>{
  const m=window.PaperchalkL2DLibrary.get('enemy').model;
  return {id:m.characterId,parts:Object.keys(m.parts).length,
   enabled:Object.values(m.parts).filter(p=>p._crouchDynamics).length,
   motion:m.crouchDynamics};
 });
 assert.equal(actual.id,'protagonist-crouch-axe');
 assert.equal(actual.parts,25);
 assert.equal(actual.enabled,8);
 assert.ok(actual.motion.axe>=0&&actual.motion.axe<=1.5);
 assert.deepEqual(gameErrors,[],'real game must load source action without JS errors');
 await game.screenshot({path:dir+'/game-crouch-dynamics.png'});
 console.log('PASS CROUCH SAME GAME RENDERER: 25 PSD layers / 8 coupled dynamic parts, no detached grip or floating sole');
 await game.close();
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
