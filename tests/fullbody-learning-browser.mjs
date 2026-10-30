import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
const root=resolve('site');
const reportFile=resolve(root,'pixel-lab/fullbody-generated/report.json');
const types={'.html':'text/html;charset=utf-8','.png':'image/png','.json':'application/json'};
const server=createServer((req,res)=>{
 try{
  let path=decodeURIComponent(new URL(req.url,'http://local').pathname);
  if(path.endsWith('/'))path+='index.html';
  const file=resolve(root,'.'+path);
  if(!file.startsWith(root+'/'))throw Error('Traversal');
  res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(readFileSync(file));
 }catch(e){res.writeHead(404);res.end('missing')}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
mkdirSync('artifacts/fullbody-learning',{recursive:true});
try{
 for(const [name,width,height] of [['desktop',1360,950],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,hasTouch:name==='phone'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:'+server.address().port+'/pixel-lab/fullbody-learning.html');
  await page.waitForFunction(()=>/模型已经生成候选|生成结果未就绪/.test(document.querySelector('#phase')?.textContent||''),{timeout:15000});
  assert.equal(await page.locator('#full').evaluate(c=>c.width===384&&c.height===512),true);
  assert.equal(await page.locator('#zoom').evaluate(c=>c.width===260&&c.height===260),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
  const auditFile=resolve(root,'pixel-lab/fullbody-generated/visual-review.json');
  const approved=existsSync(auditFile)&&JSON.parse(readFileSync(auditFile,'utf8')).status==='approved';
  const ready=existsSync(reportFile)&&approved;
  if(ready){
   const report=JSON.parse(readFileSync(reportFile,'utf8'));
   assert.equal(await page.locator('#gallery .item').count(),report.generated.length);
   await page.locator('#pose').selectOption(report.pose_groups[0]);
   assert.ok((await page.locator('#gallery .item').count())>=2);
   await page.locator('#gallery .item').nth(1).click();
   assert.match(await page.locator('#selected-title').textContent(),/候选/);
   await page.locator('#gridToggle').click();
   assert.equal(await page.locator('#gridToggle').getAttribute('aria-pressed'),'true');
   await page.locator('#background').click();
   assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('paper')),true);
   assert.ok((await page.locator('#download').getAttribute('href')).includes('generated_'));
   assert.equal(await page.locator('#empty').isVisible(),false);
  }else{
   assert.equal(await page.locator('#empty').isVisible(),true);
   assert.equal(await page.locator('#gallery .item').count(),0);
  }
  await page.screenshot({path:'artifacts/fullbody-learning/'+name+'-generated-characters.png',fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS: new-character model gallery desktop/mobile; real samples '+(existsSync(reportFile)?'loaded':'pending, no fake art'));
}finally{await browser.close();await new Promise(done=>server.close(done))}
