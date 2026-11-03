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
        viewportWidth:e.clientWidth,
        statBounds:stats?.getBoundingClientRect().toJSON(),timeBounds:time?.getBoundingClientRect().toJSON(),
        statAnchor:stats?.offsetLeft,statIntrinsicWidth:stats?.offsetWidth,
        clockLeft:time?.offsetLeft,clockWidth:time?.offsetWidth,
        hasCrossedIcon:!!stats?.querySelector('[data-stat="hunger"] svg path[opacity]'),
        scale:stats?.style.getPropertyValue('--hud-scale')
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
    // Check coordinates within the LOGICAL 16:9 game canvas. The mobile
    // browser rotates that canvas 90 degrees into portrait device space, so
    // getBoundingClientRect().left is not a logical horizontal position.
    const center=topHud.statAnchor;
    const rightEdge=center+topHud.statIntrinsicWidth*Number(topHud.scale)/2;
    assert.ok(Math.abs(center-topHud.viewportWidth/2)<2.5,
      'Three status groups must be centered on the FULL logical game viewport: '+JSON.stringify(topHud));
    assert.ok(rightEdge+4<=topHud.clockLeft,
      'Status and clock must never overlap on any viewport: '+JSON.stringify(topHud));
    assert.equal(topHud.hasCrossedIcon,false,'Hunger icon still has crossed X-strokes');
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
    await page.waitForTimeout(900);
    const bedroomInit=await page.evaluate(()=>({
      url:location.href,scene:document.querySelector('#scene')?.dataset.scene,
      rootHidden:document.querySelector('#novel-ui')?.hidden,
      hudVisible:!!document.querySelector('#hud-top')?.getClientRects().length,
      dialogueHidden:document.querySelector('#dialogue')?.hidden,
      registry:window.PAPERWORLD_SCENE_CATALOG?.map(x=>x.id),
      runtime:Boolean(window.PaperWorldDialogue),
      bodyClass:document.body.className
    }));
    console.log('BEDROOM INIT',JSON.stringify(bedroomInit),'PAGE ERRORS',errors.join('; '));
    await page.locator('#hud-top').waitFor({state:'visible',timeout:6000});
    await expectEdge(page,'bottom',true);
    assert.equal(await page.locator('#dialogue').isVisible(),true,
      'Bedroom environment incorrectly hides its active dialogue');
    assert.equal(await page.locator('#speaker').textContent(),'???');
    assert.ok((await page.locator('#dialogue-text').textContent()).includes('房间'),
      'Bedroom dialogue appears to use classroom words');
    await page.waitForTimeout(1150);
    const bedroomFogPixels=await page.evaluate(()=>{
      const c=document.getElementById('ui-edge-fog');
      const w=c.width,h=c.height,a=c.getContext('2d').getImageData(0,Math.floor(h*.74),w,Math.ceil(h*.26)).data;
      let count=0;for(let k=3;k<a.length;k+=4)if(a[k]>35)count++;return {count,total:a.length/4};
    });
    assert.ok(bedroomFogPixels.count>bedroomFogPixels.total*.04,
      'Dialogue is visible but its actual bottom fluid black fog is missing: '+JSON.stringify(bedroomFogPixels));
    // This is a real shape test, not just "there were dark pixels". A
    // translucent black panel would fail because its top edge is flat, while
    // the native fog must have a completely clear region above a variable
    // smoky crest and become dense only close to the physical bottom.
    const subtitleSilhouette=await page.evaluate(()=>{
      const c=document.getElementById('ui-edge-fog'),w=c.width,h=c.height;
      const pixels=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,w,h).data;
      const alpha=(x,y)=>pixels[(Math.floor(y)*w+Math.floor(x))*4+3];
      const fronts=[];
      for(let x=w*.07;x<w*.94;x+=w*.025){
        let first=h;
        for(let y=Math.floor(h*.61);y<h*.93;y+=2){
          if(alpha(x,y)>20){first=y;break}
        }
        fronts.push(first);
      }
      let upperDark=0,bottomDark=0;
      for(let x=0;x<w;x+=5){
        if(alpha(x,h*.57)>2)upperDark++;
        if(alpha(x,h*.94)>130)bottomDark++;
      }
      return {minFront:Math.min(...fronts),maxFront:Math.max(...fronts),
        variation:Math.max(...fronts)-Math.min(...fronts),upperDark,bottomDark,
        sampledColumns:Math.ceil(w/5),h,w};
    });
    assert.equal(subtitleSilhouette.upperDark,0,
      'Subtitle fog includes a rectangular translucent black board above its smoke: '+JSON.stringify(subtitleSilhouette));
    assert.ok(subtitleSilhouette.variation>subtitleSilhouette.h*.022,
      'Subtitle smoke leading edge remains a perfectly straight horizontal panel: '+JSON.stringify(subtitleSilhouette));
    assert.ok(subtitleSilhouette.bottomDark>subtitleSilhouette.sampledColumns*.55,
      'Subtitle smoke is not dark enough at the bottom to support dialogue: '+JSON.stringify(subtitleSilhouette));
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-bedroom-dialogue-and-bottom-fog.png'});
    // A white matte reveals the alpha shape without hiding it in a dark scene.
    await page.evaluate(()=>{
      const src=document.getElementById('ui-edge-fog');
      const matte=document.createElement('canvas');
      matte.id='subtitle-fog-matte';matte.width=src.width;matte.height=src.height;
      const ctx=matte.getContext('2d');ctx.fillStyle='white';
      ctx.fillRect(0,0,matte.width,matte.height);ctx.drawImage(src,0,0);
      matte.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:80;pointer-events:none';
      document.querySelector('#view').appendChild(matte);
    });
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-bedroom-bottom-fog-white-matte.png'});
    await page.locator('#subtitle-fog-matte').evaluate(el=>el.remove());
    await page.locator('#menu-toggle').click();
    await expectEdge(page,'left',true);
    await expectEdge(page,'bottom',true);
    await page.waitForTimeout(750);
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-bedroom-left-menu-and-bottom-fog.png'});
    await page.locator('#menu-toggle').click();
    await expectEdge(page,'left',false);
    await page.locator('#next-line').click();
    await expectEdge(page,'bottom',false);
    assert.equal(await page.locator('#dialogue').isVisible(),false,
      'Bedroom preview dialogue should end and disappear');
    await page.waitForTimeout(800);
    await page.screenshot({path:'artifacts/classroom/ui-fog-'+cfg.label+'-bedroom-clean-scene.png'});
    await page.evaluate(()=>window.PaperWorldDialogue.show({
      speaker:'测试对白',text:'字幕与黑雾必须一起出现。'
    }));
    await expectEdge(page,'bottom',true);
    assert.equal(await page.locator('#dialogue-text').textContent(),'字幕与黑雾必须一起出现。');
    await page.locator('#next-line').click();
    await expectEdge(page,'bottom',false);
    await page.close();
    console.log('PASS '+cfg.label+': native subtitle and settings fog, transparent controls, left/right triggers, empty top, hidden fog after closing, dialogue end; screenshots saved');
  }
  assert.deepEqual(errors,[]);
}finally{
  await browser.close();
  await new Promise(ok=>server.close(ok));
}
