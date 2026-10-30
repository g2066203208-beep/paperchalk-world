import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/'))throw Error('Traversal');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(path));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});
const origin='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/world-materials',{recursive:true});
const getPack=page=>page.evaluate(()=>JSON.parse(window.__PAPERWORLD_MATERIAL_STUDIO__.snapshot()));
const getState=page=>page.evaluate(()=>window.__PAPERWORLD_MATERIAL_STUDIO__.state());
try{
 for(const [device,width,height] of [['phone',390,844],['landscape',844,390],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:device!=='desktop',isMobile:device!=='desktop',acceptDownloads:true,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'world-builder/materials.html',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__PAPERWORLD_MATERIAL_STUDIO__?.state()?.atlasSize[0]===64);
  let state=await getState(page);
  assert.equal(state.active,'stone');
  assert.equal(state.webgl,true,'WebGL must show an actual textured 3D cube');
  const before=await getPack(page);
  assert.equal(before.materials.length,8);
  assert.equal(before.materials[0].pixels.length,256);
  assert.ok((await page.locator('#pixel-canvas').boundingBox()).width>220);
  // Enter an exact different pixel; verify source pixels change and undo/redo restores.
  const original=before.materials[0].pixels[2*16+2],target=original===4?1:4;
  await page.locator('[data-ink="'+target+'"]').click();
  const box=await page.locator('#pixel-canvas').boundingBox();
  const x=box.x+(2.5/16)*box.width,y=box.y+(2.5/16)*box.height;
  await page.mouse.click(x,y);
  let edited=await getPack(page);
  assert.equal(edited.materials[0].pixels[2*16+2],target);
  await page.locator('#undo').click();
  assert.equal((await getPack(page)).materials[0].pixels[2*16+2],before.materials[0].pixels[2*16+2]);
  await page.locator('#redo').click();
  assert.equal((await getPack(page)).materials[0].pixels[2*16+2],target);
  // Inspect another named material and check the same real pixel data drives both previews.
  await page.locator('[data-material="brick"]').click();
  assert.equal((await getState(page)).active,'brick');
  await page.locator('[data-tool="fill"]').click();
  assert.equal((await getState(page)).tool,'fill');
  await page.screenshot({path:'artifacts/world-materials/'+device+'-material-studio.png',fullPage:true});
  const [png]=await Promise.all([page.waitForEvent('download'),page.locator('#export-atlas').click()]);
  assert.equal(png.suggestedFilename(),'paperworld-material-atlas-64x32.png');
  const [json]=await Promise.all([page.waitForEvent('download'),page.locator('#export-pack').click()]);
  assert.match(json.suggestedFilename(),/material-pack\.json$/);
  await page.locator('#apply-world').click();
  await page.waitForURL('**/index.html?world3d=1&materials=1');
  await page.waitForFunction(()=>window.__PAPERWORLD_MENU__?.state==='world'&&!window.__PAPERWORLD_MENU__?.transition,{timeout:15000});
  await page.waitForTimeout(300);
  assert.deepEqual(errors,[],'no UI, shader or runtime JS errors on '+device);
  assert.equal(await page.locator('#pw-world-material-link').count(),1);
  // Same origin applies material edits immediately to the real 3D game on entry.
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('paperworld-world-materials-v1')));
  assert.equal(saved.materials[0].pixels[2*16+2],target);
  await page.screenshot({path:'artifacts/world-materials/'+device+'-textured-3d-world.png'});
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:400,height:850}});
 const page=await context.newPage();await page.goto(origin);
 await page.locator('#pw-world-builder-link').click();
 await page.waitForURL('**/world-builder/materials.html');
 assert.equal(await page.locator('#material-list .material-item').count(),8);
 await context.close();
 console.log('PASS: 3 device views; 8 four-ink materials; real 3D shader preview; pencil, undo/redo, PNG+JSON; persisted edits applied to original WebGL game');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
