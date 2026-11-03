import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdirSync,readFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';

const root=resolve('site'),mime={
 '.html':'text/html','.js':'application/javascript','.css':'text/css',
 '.json':'application/json','.webp':'image/webp','.png':'image/png'};
const server=createServer((req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 const p=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!p.startsWith(root+'/')){res.writeHead(403).end();return}
 try{const b=readFileSync(p);res.writeHead(200,{'content-type':mime[extname(p)]||'application/octet-stream'});res.end(b)}
 catch{res.writeHead(404).end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/perspective',{recursive:true});
try{
 for(const cfg of [{name:'desktop',width:1280,height:720,mobile:false},
                   {name:'mobile',width:390,height:844,mobile:true}]){
  const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},
    isMobile:cfg.mobile,hasTouch:cfg.mobile,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+
    '/index.html?scene=classroom',{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>!!window.PaperchalkL2D&&
    !!window.PaperWorldL2DGround,{timeout:18000});
  // Intro story may hide the enemy until she is introduced. Show both
  // FULL L2D animation sources only for this comparison, never static PNGs.
  await page.evaluate(async()=>{
    document.getElementById('enemy-depth-root').hidden=false;
    document.getElementById('actor-enemy').hidden=false;
    document.getElementById('camera-player-root').hidden=false;
    const npc=window.PaperchalkL2D.get('enemy');
    if(!npc.img.src){
      npc.img.src='./assets/characters/char-002/front.png';
      await npc.img.decode();
    }
    await window.PaperchalkL2D.refresh('enemy');
  });
  await page.waitForFunction(()=>{
    const actors=['player','enemy'].map(id=>window.PaperchalkL2D.get(id));
    const s=window.PaperWorldL2DGround.inspect();
    return actors.every(a=>a.root.dataset.l2dState==='ready'&&
      a.canvas.width>0&&a.canvas.height>0)&&
      s.actors.length===2&&s.actors.every(a=>a.detected);
  },null,{timeout:28000});
  await page.waitForTimeout(250);
  const capture=async(z=null)=>{
    return page.evaluate(value=>{
      const rig=document.getElementById('dev-rig');
      if(value!==null)rig.style.setProperty('--dev-depth-enemy',value+'px');
      const s=window.PaperWorldL2DGround.inspect();
      const get=id=>{
        const a=window.PaperchalkL2D.get(id);
        const info=s.actors.find(x=>x.id===id);
        const rc=a.canvas.getBoundingClientRect();
        return { ...info,rect:rc.toJSON(),
          renderedHeight:rc.height*info.visibleFraction,
          shoeScreenY:rc.top+rc.height*info.soleY,
          sourceCanvasPixels:a.canvas.width*a.canvas.height,
          imgSize:a.img.offsetHeight};
      };
      return {dev:s.dev,horizon:s.horizonY,
        viewportHeight:document.getElementById('view').clientHeight,
        player:get('player'),enemy:get('enemy'),
        perf:window.PaperWorldL2DGround.performance()};
    },z);
  };
  const ref=await capture();
  // Cinematic v4: heroine +300 is a true cropped foreground character,
  // female-two -40 is a nearby opponent IN the fog, not a distant doll.
  const expected=155/162*(950-300)/(950-(-40));
  const ratio=ref.enemy.renderedHeight/ref.player.renderedHeight;
  assert.equal(ref.dev,false);
  assert.ok(ref.horizon>ref.viewportHeight*.3&&ref.horizon<ref.viewportHeight*.7,
    'Hidden DEV rig leaked a zero-height horizon into the real game: '+JSON.stringify(ref));
  assert.ok(Math.abs(ratio-expected)<.035,
    'Enemy still looks miniature; visible heights not projectively normalized: '+
    JSON.stringify({ratio,expected,ref}));
  assert.ok(ref.player.worldFootY>ref.viewportHeight*1.025&&
    ref.player.worldFootY<ref.viewportHeight*1.065,
    'Heroine feet must be deliberately BEYOND the lower camera frame: '+JSON.stringify(ref));
  assert.ok(ref.enemy.expectedFootY>ref.viewportHeight*.82&&
    ref.enemy.expectedFootY<ref.viewportHeight*.91&&
    ref.enemy.expectedFootY<ref.player.worldFootY,
    'Enemy must stand on the close MIDGROUND at 82–91% frame height: '+JSON.stringify(ref));
  assert.ok(Math.abs(ref.enemy.worldFootY-ref.enemy.expectedFootY)<1);
  // Logical formulas alone cannot prove visible placement. The ACTUAL
  // browser layout must show a half-out-of-frame heroine and a fully
  // onscreen midground opponent. Check rendered shoe pixels, not only
  // the computed model values.
  assert.ok(ref.player.shoeScreenY>ref.viewportHeight*1.02&&
    ref.player.shoeScreenY<ref.viewportHeight*1.09,
    'Visible heroine canvas shoes are NOT past the lower camera edge: '+JSON.stringify(ref));
  assert.ok(ref.enemy.shoeScreenY>ref.viewportHeight*.79&&
    ref.enemy.shoeScreenY<ref.viewportHeight*.93&&
    ref.enemy.rect.top<ref.viewportHeight*.54,
    'NPC visible L2D is outside frame or too far from the encounter: '+JSON.stringify(ref));
  assert.ok(ref.enemy.perspectiveScale>1&&ref.enemy.perspectiveScale<1.7,
    'Nearby CHAR-002 must not be magnified from a tiny old 34% source: '+JSON.stringify(ref));
  assert.ok(ref.enemy.sourceCanvasPixels>=512*512,
    'Character sharpness source resolution is too low');
  await page.screenshot({path:'artifacts/perspective/'+cfg.name+'-both-actors-corrected.png'});
  const far=await capture(-350);
  const near=await capture(-10);
  assert.ok(far.enemy.renderedHeight<ref.enemy.renderedHeight&&
    ref.enemy.renderedHeight<near.enemy.renderedHeight,
    'Near/far motion must change actual visible L2D height');
  assert.ok(far.enemy.worldFootY<ref.enemy.worldFootY&&
    ref.enemy.worldFootY<near.enemy.worldFootY,
    'Shoes must move toward horizon as actor travels away');
  assert.ok(Math.abs(far.enemy.worldFootY-far.enemy.expectedFootY)<1&&
    Math.abs(near.enemy.worldFootY-near.enemy.expectedFootY)<1,
    'L2D shoes floated away from same projected floor');
  assert.equal(ref.enemy.sourceCanvasPixels,near.enemy.sourceCanvasPixels,
    'Camera distance must not rebuild large L2D textures');
  await page.screenshot({path:'artifacts/perspective/'+cfg.name+'-near-grounded.png'});
  assert.deepEqual(errors,[],errors.join('; '));
  console.log('PASS '+cfg.name+': near-camera heroine cropped below screen, midground opponent, common floor: '+
    JSON.stringify({ratio,expected,footY:ref.enemy.worldFootY,
      horizon:ref.horizon,far:far.enemy.renderedHeight,near:near.enemy.renderedHeight,
      sourceReadbacks:ref.perf.sourceReadbacks}));
  await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
