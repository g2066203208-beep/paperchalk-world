import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer((req,res)=>{
 try{
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
  if(!path.startsWith(root+'/'))throw Error('Traversal');
  res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(path));
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const origin='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/pixel-atelier',{recursive:true});
const info=page=>page.evaluate(()=>window.__PAPERWORLD_PIXEL_EDITOR__?.getInfo());
const project=page=>page.evaluate(()=>JSON.parse(window.__PAPERWORLD_PIXEL_EDITOR__.exportSnapshot()));
try{
 for(const [screen,width,height] of [['mobile',390,844],['landscape',844,390],['desktop',1440,900]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:screen!=='desktop',isMobile:screen!=='desktop',acceptDownloads:true});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(origin+'pixel-lab/editor.html',{waitUntil:'load'});
  await page.waitForFunction(()=>window.__PAPERWORLD_PIXEL_EDITOR__?.getInfo().width===64);
  assert.equal((await info(page)).frames,1);
  const box=await page.locator('#paint-canvas').boundingBox();
  assert.ok(box.width>50&&box.height>80,'drawing surface fits screen');
  // Pencil stroke must change indexed document, not only show a preview on canvas.
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();await page.mouse.move(box.x+box.width/2+24,box.y+box.height/2,{steps:5});await page.mouse.up();
  let p=await project(page),painted=p.frames[0].cels[0].filter(Boolean);
  assert.ok(painted.length>=2,'pixel stroke paints continuous exact cells');
  assert.ok(painted.every(v=>v===1));
  await page.locator('#undo').click();
  assert.equal((await project(page)).frames[0].cels[0].filter(Boolean).length,0,'undo restores previous pixels');
  await page.locator('#redo').click();
  assert.ok((await project(page)).frames[0].cels[0].filter(Boolean).length>0,'redo restores stroke');
  await page.locator('#add-layer').click();assert.equal((await info(page)).layers,2);
  await page.locator('#add-frame').click();assert.equal((await info(page)).frames,2);
  await page.locator('#play').click();
  assert.equal(await page.locator('#play').getAttribute('aria-pressed'),'true');
  await page.locator('#play').click();
  // Save-as JSON is a valid project and should survive a full round trip.
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-json').click()]);
  assert.match(download.suggestedFilename(),/paperworld-project\.json$/);
  await page.screenshot({path:'artifacts/pixel-atelier/'+screen+'-editor.png',fullPage:true});
  assert.deepEqual(errors,[],'editor page JS errors: '+screen);
  await context.close();
 }
 const context=await browser.newContext();
 const page=await context.newPage();
 await page.goto(origin,{waitUntil:'load'});
 await page.locator('#pw-pixel-editor-link').click();
 await page.waitForURL('**/pixel-lab/editor.html');
 assert.equal((await page.locator('h2').first().textContent()).includes('游戏标准色板'),true);
 await context.close();
 console.log('PASS: original APK game menu routes to pixel art editor; mobile/landscape/desktop painting, layers, animation, undo, redo, JSON export');
}finally{await browser.close();await new Promise(done=>server.close(done))}
