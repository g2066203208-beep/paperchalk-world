import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

// Regression QA for the independent black-fog UI base on every screen edge.
// Runs against the actual game page; neither tests nor snapshots replace
// the production scene fog or L2D canvas.
const root=resolve('site');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  let p=new URL(req.url,'http://127.0.0.1').pathname;
  if(p.endsWith('/'))p+='index.html';
  const file=resolve(root,'.'+p);
  if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
  try{const data=readFileSync(file);res.writeHead(200,{'content-type':types[extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data)}
  catch{if(!res.headersSent)res.writeHead(404);res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const target='http://127.0.0.1:'+server.address().port+'/index.html?scene=classroom';
mkdirSync('artifacts/classroom',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const errors=[];
const edge=side=>'.ui-fog-band[data-edge="'+side+'"]';
async function expectEdge(page,side,want){
  await page.waitForFunction(([side,want])=>{
    const node=document.querySelector('.ui-fog-band[data-edge="'+side+'"]');
    return node?.dataset.active===String(want);
  },[side,want],{timeout:15000});
  assert.equal(await page.locator(edge(side)).getAttribute('data-active'),String(want));
}
try{
  for(const cfg of [{label:'desktop',width:1280,height:720,mobile:false},{label:'mobile',width:390,height:844,mobile:true}]){
    const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:1,isMobile:cfg.mobile,hasTouch:cfg.mobile});
    page.on('pageerror',e=>errors.push(cfg.label+': '+e.message));
    await page.goto(target,{waitUntil:'domcontentloaded',timeout:40000});
    await expectEdge(page,'bottom',true);
    await expectEdge(page,'top',false);
    await expectEdge(page,'left',false);
    await expectEdge(page,'right',false);
    assert.equal(await page.locator('#top-actions').isVisible(),false,'AUTO/LOG must not remain visible in the top-right corner');
    assert.equal(await page.locator('#dialogue').isVisible(),true);
    await page.waitForTimeout(750);
    const fogInk=await page.evaluate(()=>{
      const fog=document.getElementById('ui-edge-fog');
      const context=fog.getContext('2d');
      const w=fog.width,h=fog.height;
      const scan=context.getImageData(0,Math.floor(h*.75),w,h-Math.floor(h*.75)).data;
      let solid=0;
      for(let i=3;i<scan.length;i+=4)if(scan[i]>45)solid++;
      return {solid,total:scan.length/4,width:w,height:h};
    });
    assert.ok(fogInk.solid>fogInk.total*.01,'Native fog did not draw any visible subtitle foundation: '+JSON.stringify(fogInk));
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-dialogue.png'});
    await page.locator('#menu-toggle').click();
    await expectEdge(page,'left',true);
    await page.waitForTimeout(750);
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-left-menu.png'});
    await page.locator('#hide-button').click();
    await expectEdge(page,'bottom',false);
    await expectEdge(page,'left',false);
    await expectEdge(page,'top',false);
    await page.waitForTimeout(750);
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-no-dialogue.png'});
    const empty=await page.evaluate(()=>{
      const canvas=document.querySelector('#ui-edge-fog');
      const {width:w,height:h}=canvas;
      const data=canvas.getContext('2d').getImageData(0,0,w,h).data;
      let pixels=0;
      for(let i=3;i<data.length;i+=4)if(data[i]>0)pixels++;
      return pixels;
    });
    assert.equal(empty,0,'UI fog must be completely absent with no side panel or subtitle');
    await page.locator('#menu-toggle').click();
    await page.locator('#hide-button').click();
    await expectEdge(page,'bottom',true);
    await expectEdge(page,'left',false);
    await page.evaluate(()=>{
      const panel=document.createElement('aside');
      panel.id='fog-right-test';
      panel.setAttribute('data-ui-fog-edge','right');
      panel.textContent='右侧UI测试';
      panel.style.cssText='position:absolute;right:2%;top:20%;width:180px;height:100px;z-index:1;color:white;pointer-events:none';
      document.querySelector('#novel-ui').appendChild(panel);
    });
    await expectEdge(page,'right',true);
    await page.waitForTimeout(750);
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-right-panel.png'});
    await page.locator('#fog-right-test').evaluate(el=>el.remove());
    await expectEdge(page,'right',false);
    // Finishing last dialogue line must retract its fog and leave the scene.
    for(let i=0;i<3;i++)await page.locator('#next-line').click();
    await expectEdge(page,'bottom',false);
    assert.equal(await page.locator('#dialogue').isVisible(),false,'Finished conversation remains stuck on screen');
    assert.equal(await page.locator('#advance').isVisible(),false,'Next-line arrow remains after conversation ends');
    await page.waitForTimeout(750);
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-story-finished.png'});
    assert.equal(await page.locator('#fog').count(),1,'Existing independent scene fog must remain untouched');
    assert.equal(await page.locator('#actor-player-l2d').count(),1,'L2D renderer must remain untouched');
    await page.close();
    console.log('PASS '+cfg.label+': native fluid subtitle, conditional left/right, empty top, fog withdrawn after story end, no AUTO/LOG; screenshots saved');
  }
  assert.deepEqual(errors,[]);
}finally{
  await browser.close();
  await new Promise(ok=>server.close(ok));
}
