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
    // Approved top-only HUD: three icons, eight tiny ticks and exact values,
    // followed by right-aligned date/time. No extra fog or quick-menu icons.
    const topHud=await page.evaluate(()=>{
      const e=document.querySelector('#hud-top');
      const stats=document.querySelector('#hud-vitals');
      const time=document.querySelector('#hud-clock');
      return {visible:!!e&&getComputedStyle(e).display!=='none',
        statCount:stats?.querySelectorAll('.hud-stat').length,
        segmentCounts:[...document.querySelectorAll('.hud-segments')].map(n=>n.children.length),
        vals:['health','hunger','sanity'].map(k=>document.getElementById('hud-'+k+'-value').textContent),
        date:document.getElementById('hud-date')?.textContent,
        weekday:document.getElementById('hud-weekday')?.textContent,
        time:document.getElementById('hud-time')?.textContent,
        overflow:e.scrollWidth>e.clientWidth+2,
        statBounds:stats?.getBoundingClientRect().toJSON(),timeBounds:time?.getBoundingClientRect().toJSON()
      };
    });
    assert.equal(topHud.visible,true);
    assert.equal(topHud.statCount,3);
    assert.deepEqual(topHud.segmentCounts,[8,8,8]);
    assert.deepEqual(topHud.vals,['82/100','67/100','91/100']);
    assert.equal(topHud.date,'4月12日');
    assert.equal(topHud.weekday,'周五');
    assert.equal(topHud.time,'21:36');
    assert.equal(topHud.overflow,false,'Top HUD contents overflow: '+JSON.stringify(topHud));
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-approved-top-hud.png'});
    await page.evaluate(()=>{
      window.PaperWorldTopHUD.setStats({health:{current:37,max:125},hunger:{current:56,max:80}});
      window.PaperWorldTopHUD.setClock({month:5,day:1,weekday:'周五',hour:7,minute:3});
    });
    assert.equal(await page.locator('#hud-health-value').textContent(),'37/125');
    assert.equal(await page.locator('#hud-hunger-value').textContent(),'56/80');
    assert.equal(await page.locator('#hud-time').textContent(),'07:03');
    await page.evaluate(()=>{
      window.PaperWorldTopHUD.setStats({health:{current:82,max:100},hunger:{current:67,max:100}});
      window.PaperWorldTopHUD.setClock({month:4,day:12,weekday:'周五',hour:21,minute:36});
    });
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
    // Reject the previous translucent black board: the left UI fog must
    // have a variable organic silhouette, never shade the middle of the room.
    const menuSmoke=await page.evaluate(()=>{
      const c=document.getElementById('ui-edge-fog');
      const w=c.width,h=c.height;
      const px=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
      const rows=[.18,.28,.38,.48,.58].map(f=>{
        const y=Math.floor(h*f),range=Math.floor(w*.38);
        let front=0;
        for(let x=0;x<range;x++)if(px[(y*w+x)*4+3]>26)front=x;
        return front;
      });
      let spill=0,total=0;
      for(let y=0;y<h*.64;y+=3)for(let x=Math.floor(w*.37);x<w*.84;x+=3){
        total++;if(px[(y*w+x)*4+3]>4)spill++;
      }
      return {fronts:rows,variation:Math.max(...rows)-Math.min(...rows),spill,total,w,h};
    });
    assert.equal(menuSmoke.spill,0,
      'A rectangular semi-transparent layer darkens the classroom: '+JSON.stringify(menuSmoke));
    assert.ok(menuSmoke.variation>menuSmoke.w*.011,
      'The left fog boundary is still a straight panel edge: '+JSON.stringify(menuSmoke));
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
    // Real developer settings: native right-side fluid rather than a black rectangle.
    await page.locator('#menu-toggle').click();
    await page.locator('#game-dev').click();
    await page.waitForFunction(()=>!document.getElementById('dev-tools').hidden,{timeout:12000});
    const settingsSurface=await page.locator('#dev-tools').evaluate(el=>{
      const own=getComputedStyle(el);
      const button=getComputedStyle(el.querySelector('button'));
      const selector=getComputedStyle(el.querySelector('select'));
      return {background:own.backgroundColor,border:own.borderTopWidth,
        buttonBackground:button.backgroundColor,selectBackground:selector.backgroundColor};
    });
    assert.equal(settingsSurface.background,'rgba(0, 0, 0, 0)',
      'Developer settings still paints a rectangular black panel');
    assert.equal(settingsSurface.border,'0px',
      'Developer settings still paints a rectangular frame');
    assert.equal(settingsSurface.buttonBackground,'rgba(0, 0, 0, 0)',
      'Developer settings buttons still paint opaque squares');
    assert.equal(settingsSurface.selectBackground,'rgba(0, 0, 0, 0)',
      'Developer settings selects still paint black blocks');
    await page.waitForTimeout(1300);
    const devPixels=await page.evaluate(()=>{
      const c=document.getElementById('dev-panel-fog');
      const w=c.width,h=c.height;
      const alpha=c.getContext('2d').getImageData(Math.floor(w*.72),0,w-Math.floor(w*.72),h).data;
      let count=0;
      for(let i=3;i<alpha.length;i+=4)if(alpha[i]>55)count++;
      return {count,total:alpha.length/4,visible:c.dataset.visible};
    });
    assert.ok(devPixels.count>devPixels.total*.08,
      'Live source fog missing beneath developer settings: '+JSON.stringify(devPixels));
    // Regress the exact screenshot defect: side fog must grow FROM the right
    // screen edge, not start as a solid rectangle halfway across the scene.
    const rightOrientation=await page.evaluate(()=>{
      const c=document.getElementById('dev-panel-fog'),w=c.width,h=c.height;
      const p=c.getContext('2d').getImageData(0,0,w,h).data;
      const avg=x=>{
        let sum=0,n=0;
        for(let y=Math.floor(h*.1);y<h*.85;y+=3){
          sum+=p[(y*w+Math.floor(w*x))*4+3];n++;
        }
        return sum/Math.max(1,n);
      };
      return {farInside:avg(.48),front:avg(.60),edge:avg(.97)};
    });
    assert.ok(rightOrientation.edge>rightOrientation.front+40,
      'Right fog faces backwards (opaque rectangular inner border): '+JSON.stringify(rightOrientation));
    assert.ok(rightOrientation.farInside<3,
      'Right UI fog still dims an unrelated middle section: '+JSON.stringify(rightOrientation));
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-dev-settings.png'});
    // QA-only fog-on-white isolation: visual reviewers must see a *flowing,
    // feathered* fog edge, not a dark rectangular plate hiding the room.
    await page.evaluate(()=>{
      const original=document.getElementById('dev-panel-fog');
      const matte=document.createElement('canvas');
      matte.id='fog-matte-test';
      matte.width=original.width;matte.height=original.height;
      const ctx=matte.getContext('2d');
      ctx.fillStyle='#fff';ctx.fillRect(0,0,matte.width,matte.height);
      ctx.drawImage(original,0,0);
      matte.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:70;pointer-events:none';
      document.querySelector('#view').appendChild(matte);
    });
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-white-matte.png'});
    await page.locator('#fog-matte-test').evaluate(el=>el.remove());
    await page.locator('#dev-exit').click();
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('#dev-tools').isVisible(),false);
    assert.equal(await page.locator('#dev-panel-fog').getAttribute('data-visible'),'false',
      'Settings-side fog remains after settings are closed');
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-dev-closed.png'});
    assert.equal(await page.locator('#fog').count(),1,'Existing independent scene fog must remain untouched');
    assert.equal(await page.locator('#actor-player-l2d').count(),1,'L2D renderer must remain untouched');
    // Verify approved HUD on the requested actual bedroom module as well.
    await page.goto(target.replace('scene=classroom','scene=bedroom'),{waitUntil:'domcontentloaded'});
    await page.locator('#hud-top').waitFor({state:'visible'});
    await page.waitForTimeout(800);
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-bedroom-top-hud.png'});
    await page.close();
    console.log('PASS '+cfg.label+': native subtitle and settings fog, transparent controls, left/right triggers, empty top, hidden fog after closing, dialogue end; screenshots saved');
  }
  assert.deepEqual(errors,[]);
}finally{
  await browser.close();
  await new Promise(ok=>server.close(ok));
}
