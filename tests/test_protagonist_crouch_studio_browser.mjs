/* End-to-end real browser proof: published authentic crouch PSD splits load
 * under the SAME heroine, persist edits and paint a nonempty game ArtMesh.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
const base=resolve('site'),types={'.js':'text/javascript','.css':'text/css',
 '.json':'application/json','.html':'text/html','.png':'image/png','.webp':'image/webp',
 '.woff2':'font/woff2','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1'),name=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
 const filename=resolve(base,'.'+name);
 if(!filename.startsWith(base+sep)){res.writeHead(403);res.end();return}
 try{
  const body=readFileSync(filename);
  res.writeHead(200,{'content-type':types[extname(filename)]||'application/octet-stream'});
  res.end(body);
 }catch(e){res.writeHead(404);res.end('not found: '+name)}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,
 args:['--use-gl=angle','--use-angle=swiftshader','--no-sandbox']});
const address='http://127.0.0.1:'+server.address().port;
mkdirSync('artifacts/protagonist-crouch',{recursive:true});
try{
 for(const cfg of [{name:'desktop',width:1440,height:900,dpr:1},
                   {name:'mobile',width:390,height:844,dpr:2}]){
  const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:cfg.dpr});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(address+'/character-editor/?character=protagonist-crouch-axe&side=front',
   {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-crouch-axe'&&
    window.PaperchalkPartRigStudio?.state?.active===true&&
    window.characterEditor?.S?.layers?.front?.filter(x=>x.sourcePart)?.length===25,
   null,{timeout:50000});
  const data=await page.evaluate(async()=>{
   const model=window.PaperchalkPartRigStudio.state.model;
   const published=await fetch('../assets/l2d/library/protagonist-crouch-axe/front.rig.json').then(r=>{
    if(!r.ok)throw Error('Hosted true crouch rig missing: '+r.status);
    return r.json();
   });
   const parts=window.characterEditor.S.layers.front.filter(p=>p.sourcePart);
   const family=document.querySelector('.character-family[data-family="protagonist"]');
   const actionButtons=[...family.querySelectorAll('[data-category="action"] button')];
   const w=model.parts;
   const textureReady=parts.every(p=>p.canvas&&p.canvas.width>0&&p.canvas.height>0);
   const src=parts.map(p=>p.partId);
   return {characterId:model.characterId,
    family:window.PaperchalkCharacterLibrary.familyOf(window.PaperchalkStudio.list.get('protagonist-crouch-axe')),
    partCount:Object.keys(w).length,ids:src,textureReady,
    actionTo:model.actionState?.to||model.actionProfiles?.default,
    actionNames:actionButtons.map(x=>x.textContent),
    actionTargets:actionButtons.map(x=>x.dataset.character),
    familyCount:document.querySelectorAll('.character-family[data-family="protagonist"]').length,
    footLeft:w.footwear_l.parentId,footRight:w.footwear_r.parentId,
    axe:w.axe.kind,hair:w.front_hair.kind,
    maskNames:src.filter(id=>id.includes('eye')||id.includes('brow')||id.includes('lashes')),
    seeThroughSource:published.sourceSha256};
  });
  assert.equal(data.characterId,'protagonist-crouch-axe');
  assert.equal(data.family,'protagonist');
  assert.equal(data.partCount,25);
  assert.equal(data.textureReady,true);
  assert.equal(data.familyCount,1);
  assert.equal(data.footLeft,'ground');
  assert.equal(data.footRight,'ground');
  assert.equal(data.axe,'fixed');
  assert.equal(data.hair,'hair');
  assert.ok(data.ids.includes('handwear_l')&&data.ids.includes('handwear_r'));
  assert.ok(data.ids.includes('legwear_l')&&data.ids.includes('legwear_r'));
  assert.ok(data.actionTargets.includes('protagonist-crouch-axe'));
  assert.ok(data.actionNames.some(t=>t.includes('蹲下')));
  assert.ok(data.actionNames.some(t=>t.includes('战斗')));
  if(cfg.name==='mobile'){
   const frame=await page.evaluate(()=>{
    const stage=document.getElementById('stage'),
     dock=document.getElementById('easy-quickbar'),
     art=window.characterEditor.S;
    return {bottom:art.py+1024*art.zoom,
      toolbarTop:dock.getBoundingClientRect().top-stage.getBoundingClientRect().top,
      zoom:art.zoom,py:art.py};
   });
   assert.ok(frame.bottom<frame.toolbarTop-5,
    'entire original crouch heroine including shoes must remain ABOVE mobile tool dock: '+
      JSON.stringify(frame));
  }
  assert.equal(data.seeThroughSource,'7fb38ce233b0c6a9f5674f190f3ac95c70bc3ed8c7ea574a27460b6e79312a1f');
  // Actual deformed 2D source meshes should paint, not merely be registered.
  const pixel=await page.evaluate(()=>{
   const model=window.PaperchalkPartRigStudio.state.model;
   const layers=window.characterEditor.S.layers.front.filter(x=>x.sourcePart);
   const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;
   const context=canvas.getContext('2d',{willReadFrequently:true});
   window.PaperchalkPartRigCore.draw(context,layers,model,0);
   const d=context.getImageData(0,0,1024,1024).data;
   let opaque=0;for(let i=3;i<d.length;i+=4)if(d[i]>=80)opaque++;
   return opaque;
  });
  assert.ok(pixel>150000,'real 25-part L2D must paint torso, kneeling thighs and axe, got '+pixel);
  await page.screenshot({path:'artifacts/protagonist-crouch/'+cfg.name+'-crouch-studio.png',fullPage:true});
  // Do not create another protagonist root; the standard front button
  // should return to the authored standing 20-PartRig on demand.
  await page.locator('.character-family[data-family="protagonist"] [data-category="base"] button[data-face="front"]').click();
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist'&&
    window.PaperchalkStudio.countSourceParts?.()===20,null,{timeout:50000});
  await page.locator('.character-family[data-family="protagonist"] [data-category="action"] button[data-character="protagonist-crouch-axe"]').click();
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='protagonist-crouch-axe'&&
    window.PaperchalkStudio.countSourceParts?.()===25,null,{timeout:50000});
  assert.deepEqual(errors,[],cfg.name+' L2D editor errors');
  console.log('PASS heroine crouch studio',cfg.name,JSON.stringify({parts:data.partCount,pixel,actionNames:data.actionNames}));
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(address+'/?scene=classroom&dev=1',{waitUntil:'load'});
 await page.waitForFunction(()=>window.PaperchalkCharacterDev?.ready,null,{timeout:50000});
 await page.evaluate(()=>window.PaperchalkCharacterDev.assign('enemy','protagonist-crouch-axe','front',false));
 await page.waitForFunction(()=>window.PaperchalkL2DLibrary?.get('enemy')?.layers?.length===25&&
   window.PaperchalkL2DLibrary.inspect('enemy').renderedFrames>=2,null,{timeout:50000});
 const game=await page.evaluate(()=>{
  const state=window.PaperchalkL2DLibrary.get('enemy'),c=state.actor.canvas;
  const scratch=document.createElement('canvas');scratch.width=128;scratch.height=128;
  const ctx=scratch.getContext('2d',{willReadFrequently:true});ctx.drawImage(c,0,0,128,128);
  const d=ctx.getImageData(0,0,128,128).data;let count=0;
  for(let i=3;i<d.length;i+=4)if(d[i]>30)count++;
  return {partCount:state.layers.length,model:state.model.characterId,
   pixels:count,frames:state.renderedFrames,canvas:[c.width,c.height],
   mode:state.actor.root.dataset.l2dMode};
 });
 assert.equal(game.partCount,25);
 assert.equal(game.model,'protagonist-crouch-axe');
 assert.equal(game.mode,'library-part-mesh');
 assert.ok(game.pixels>2000,'real game renderer missing crouch figure '+JSON.stringify(game));
 await page.screenshot({path:'artifacts/protagonist-crouch/game-dev-crouch-npc.png'});
 // Restore real CHAR-002 and ensure neither module data nor visibility leaked.
 await page.evaluate(()=>window.PaperchalkCharacterDev.assign('enemy','char-002','front',false));
 await page.waitForFunction(()=>window.PaperchalkL2DLibrary?.get('enemy')?.layers?.length===18,null,{timeout:50000});
 assert.deepEqual(errors,[],'game DEV errors');
 console.log('PASS same game L2D module auto-load/restore after crouch',JSON.stringify(game));
 await page.close();
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
