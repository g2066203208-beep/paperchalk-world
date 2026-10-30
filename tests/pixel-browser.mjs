import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const server=spawn('python3',['-m','http.server','4175','--directory','site'],{stdio:'ignore'});
let browser;
try{
 await mkdir('pixel-artifacts',{recursive:true});
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1540,height:1040},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 let ok=false;
 for(let i=0;i<25;i++){
  try{await page.goto('http://127.0.0.1:4175/pixel-lab/learn.html',{waitUntil:'networkidle',timeout:2000});ok=true;break;}
  catch(err){await new Promise(res=>setTimeout(res,160));}
 }
 assert.ok(ok,'local PixelLab page must load');
 await page.waitForFunction(()=>window.__PIXEL_LAB__?.model?.metrics?.steps>0,null,{timeout:13000});
 const model=await page.evaluate(()=>window.__PIXEL_LAB__.model);
 assert.equal(model.format,'pixel-lab-neural-inpaint-v1');
 assert.equal(model.examples.length>=2,true);
 assert.equal(model.metrics.training_sprites+model.metrics.validation_sprites,
  Number(await page.locator('#metric-images').innerText()));
 assert.match(await page.locator('#ml-status').innerText(),/已训练/);
 const pixels=await page.evaluate(()=>window.__PIXEL_LAB__.pixels);
 assert.equal(pixels.original.length,256);
 assert.ok(pixels.damaged.filter(x=>x===-1).length>=25);
 await page.screenshot({path:'pixel-artifacts/pixel-lab-01-before.png',fullPage:true});
 await page.locator('#restore').click();
 await page.waitForFunction(()=>document.querySelector('#local-accuracy').textContent.includes('%'),null,{timeout:12000});
 const complete=await page.evaluate(()=>window.__PIXEL_LAB__.pixels);
 assert.equal(complete.predicted.length,256);
 assert.ok(complete.predicted.every((v,i)=>v>=0&&v<12));
 for(let i=0;i<256;i++)
  if(complete.damaged[i]!==-1)
   assert.equal(complete.predicted[i],complete.original[i],'model must never overwrite known pixels');
 const accuracy=await page.locator('#local-accuracy').innerText();
 assert.match(accuracy,/遮挡区域/);
 await page.screenshot({path:'pixel-artifacts/pixel-lab-02-neural-restored.png',fullPage:true});
 await page.locator('#replay').click();
 await page.waitForFunction(()=>document.querySelector('#rl-progress').textContent!=='0 / 0',null,{timeout:10000});
 const strokes=await page.evaluate(()=>{
  const api=window.__PIXEL_LAB__;
  const ops=api.paintPlan(api.pixels.original,api.policy.q);
  return {ops:ops.length,naive:api.pixels.original.filter(v=>v>0).length};
 });
 assert.ok(strokes.ops<strokes.naive,'learned brush policy should use fewer operations than a pencil');
 const end=await page.evaluate(()=>{
  const api=window.__PIXEL_LAB__,ops=api.paintPlan(api.pixels.original,api.policy.q),canvas=Array(256).fill(0);
  for(const op of ops)for(const idx of op.points)canvas[idx]=op.color;
  return canvas.every((value,i)=>value===api.pixels.original[i]);
 });
 assert.equal(end,true,'policy strokes must actually reconstruct the CC0 reference');
 await page.waitForFunction(()=>document.querySelector('#rl-progress').textContent.split('/')[0].trim()===document.querySelector('#rl-progress').textContent.split('/')[1].trim(),
  null,{timeout:22000});
 await page.screenshot({path:'pixel-artifacts/pixel-lab-03-rl-drawing.png',fullPage:true});
 // Changing a held-out sample really changes the neural input.
 const before=await page.evaluate(()=>window.__PIXEL_LAB__.pixels.original.join(','));
 await page.locator('#sample').selectOption('1');
 const after=await page.evaluate(()=>window.__PIXEL_LAB__.pixels.original.join(','));
 assert.notEqual(before,after);
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 mobile.on('pageerror',err=>errors.push(err.message));
 await mobile.goto('http://127.0.0.1:4175/pixel-lab/learn.html',{waitUntil:'networkidle'});
 await mobile.waitForFunction(()=>window.__PIXEL_LAB__?.model?.metrics?.steps>0);
 assert.equal(await mobile.locator('#predicted').isVisible(),true);
 const overflow=await mobile.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert.ok(overflow<8,'mobile PixelLab horizontal overflow '+overflow);
 await mobile.screenshot({path:'pixel-artifacts/pixel-lab-04-mobile.png',fullPage:true});
 assert.deepEqual(errors,[],'real browser threw an exception');
 console.log('PASS PixelLab trained neural inference, honest mask restoration, RL brush playback and mobile layout',strokes,accuracy);
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
