import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css',
  '.json':'application/json','.webp':'image/webp','.png':'image/png'};
const server=createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1'),pathname=url.pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
  try{const data=readFileSync(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream'});res.end(data)}
  catch{res.writeHead(404);res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/ground',{recursive:true});
try{
 for(const cfg of [{name:'desktop',w:1280,h:720,mobile:false},{name:'mobile',w:390,h:844,mobile:true}]){
   const page=await browser.newPage({viewport:{width:cfg.w,height:cfg.h},isMobile:cfg.mobile,hasTouch:cfg.mobile});
   const errs=[];page.on('pageerror',e=>errs.push(e.message));
   const url='http://127.0.0.1:'+server.address().port+'/index.html?scene=classroom&dev=1';
   await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
   await page.waitForFunction(()=>!!window.PaperWorldGroundPerspective&&
     !!document.getElementById('dev-ground-perspective')?.textContent,{timeout:15000});
   const initial=await page.evaluate(()=>({fit:window.PaperWorldGroundPerspective.inspect(),
     state:window.PaperWorldGroundPerspective.current()}));
   assert.equal(initial.fit.valid,true,JSON.stringify(initial));
   assert.ok(initial.fit.sizePercent>45&&initial.fit.sizePercent<60,
     'Default distant NPC should be about 52% of the scene, not old hardcoded 34%: '+JSON.stringify(initial));
   assert.equal(initial.state.locked,false,'Preexisting hand-placed defaults must not be silently changed');
   assert.equal(initial.state.enemy.size,34,'Editor changed saved NPC size without consent');
   const {x,y,size}=initial.state.enemy;
   await page.locator('#dev-ground-calibrate').click({timeout:15000});
   const calibrated=await page.evaluate(()=>({state:window.PaperWorldGroundPerspective.current(),
     fit:window.PaperWorldGroundPerspective.inspect(),
     stored:localStorage.getItem('paperchalk-layer-editor-v2')}));
   assert.equal(calibrated.state.locked,true,'Calibrate button did not enable ground locking');
   assert.equal(calibrated.state.enemy.x,x,'Calibration moved manually placed X');
   assert.equal(calibrated.state.enemy.y,y,'Calibration moved manually placed shoe Y');
   assert.notEqual(calibrated.state.enemy.size,size,'Calibration did not change perspective size');
   assert.ok(Math.abs(calibrated.state.enemy.size-calibrated.fit.sizePercent)<.03,
     'Projected scale does not match floor geometry: '+JSON.stringify(calibrated));
   assert.ok(calibrated.stored?.includes('"lockPerspective":1'),
     'One-click calibration did not preserve the updated floor model');
   await page.screenshot({path:'artifacts/ground/ground-'+cfg.name+'-calibrated.png'});
   // Moving the NPC shoe point is movement across one common ground plane:
   // depth and physical apparent size must update; the new foot is not moved.
   const oldHeight=calibrated.state.enemy.size;
   await page.evaluate(()=>{
     const slider=document.getElementById('dev-y');
     slider.value='26';
     slider.dispatchEvent(new Event('input',{bubbles:true}));
   });
   const shifted=await page.evaluate(()=>window.PaperWorldGroundPerspective.current());
   assert.equal(shifted.enemy.y,26);
   assert.ok(shifted.enemy.size<oldHeight,
     'Moving the NPC farther along the floor should shrink apparent stature');
   assert.equal(shifted.enemy.x,x,'Ground constraint changed horizontal placement');
   await page.locator('#dev-ground-lock').uncheck();
   assert.equal((await page.evaluate(()=>window.PaperWorldGroundPerspective.current())).locked,false);
   assert.deepEqual(errs,[],errs.join('; '));
   console.log('PASS '+cfg.name+': physical stature, common-floor perspective, opt-in calibration, saved coordinates');
   await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
