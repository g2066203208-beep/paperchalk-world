import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';

const sha=data=>createHash('sha256').update(data).digest('hex');
const localFile=readFileSync('site/horror-room/index.html');
const expectedHash=sha(localFile);
const url='https://g2066203208-beep.github.io/paperchalk-world/horror-room/';
const revision=(process.env.GITHUB_SHA||'local').slice(0,12);
let downloaded=null,code=null,matched=false;
for(let attempt=1;attempt<=16;attempt++){
  try {
    const resp=await fetch(url+'?revision='+revision+'&check='+attempt,{
      headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(16000)
    });
    code=resp.status;
    if(resp.ok){
      downloaded=Buffer.from(await resp.arrayBuffer());
      matched=sha(downloaded)===expectedHash;
    }
    console.log('PUBLIC_HTTP_CHECK',JSON.stringify({
      attempt,status:code,bytes:downloaded?.length,exact_sha256_match:matched
    }));
    if(matched)break;
  }catch(e){console.log('PUBLIC_HTTP_RETRY',attempt,String(e).slice(0,180))}
  await new Promise(r=>setTimeout(r,6500));
}
assert.ok(matched,'Public GitHub Pages did NOT serve the exact latest checked-in room HTML');
mkdirSync('artifacts/horror-room-live',{recursive:true});
const browser=await chromium.launch({headless:true,args:[
  '--no-sandbox','--use-gl=angle','--use-angle=swiftshader',
  '--enable-webgl','--enable-unsafe-swiftshader'
]});
try {
  for(const [label,width,height] of [['desktop',1280,720],['portrait',390,844],['landscape',844,390]]){
    const context=await browser.newContext({
      viewport:{width,height},reducedMotion:'reduce',
      ignoreHTTPSErrors:false
    });
    const page=await context.newPage();
    const errors=[];const failedRequests=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('requestfailed',r=>failedRequests.push(r.url()+' '+r.failure()?.errorText));
    const response=await page.goto(url+'?revision='+revision,{waitUntil:'load',timeout:40000});
    assert.equal(response.status(),200,label+' public HTTP 200');
    await page.waitForFunction(()=>window.__HORROR_ROOM__?.triangleCount>=1100,{timeout:18000});
    await page.waitForTimeout(300);
    const live=await page.evaluate(()=>({
      objects:window.__HORROR_ROOM__.meshObjects,
      triangles:window.__HORROR_ROOM__.triangleCount,
      unlit:window.__HORROR_ROOM__.roomUnlit,
      backend:window.__HORROR_ROOM__.renderBackend
    }));
    assert.ok(live.objects>=90&&live.triangles>=1100&&live.unlit,label+' modeled dark room');
    await page.screenshot({path:'artifacts/horror-room-live/'+label+'-public-page.png'});
    await page.getByRole('button',{name:'模拟敲门'}).click();
    await page.waitForTimeout(250);
    assert.match(await page.locator('#status').innerText(),/咚|门板|第三/);
    await page.screenshot({path:'artifacts/horror-room-live/'+label+'-public-knock.png'});
    await page.getByRole('button',{name:'查看门锁'}).click();
    assert.match(await page.locator('#status').innerText(),/门锁|锁舌/);
    assert.deepEqual(errors,[],label+' JavaScript errors');
    assert.deepEqual(failedRequests,[],label+' browser network failed');
    console.log('PUBLIC_BROWSER_PASS',JSON.stringify({label,url,revision,...live}));
    await context.close();
  }
}finally{await browser.close();}
