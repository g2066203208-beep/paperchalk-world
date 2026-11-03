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
        player:get('player'),enemy:get('enemy'),
        perf:window.PaperWorldL2DGround.performance()};
    },z);
  };
  const ref=await capture();
  const expected=155/162*(950-160)/(950-(-190));
  const ratio=ref.enemy.renderedHeight/ref.player.renderedHeight;
  assert.equal(ref.dev,false);
  assert.ok(Math.abs(ratio-expected)<.035,
    'Enemy still looks miniature; visible heights not projectively normalized: '+
    JSON.stringify({ratio,expected,ref}));
  assert.ok(ref.enemy.expectedFootY>ref.horizon&&
    ref.enemy.expectedFootY<ref.player.worldFootY,
    'Enemy foot must lie between horizon and protagonist foot on the same floor: '+JSON.stringify(ref));
  assert.ok(Math.abs(ref.enemy.worldFootY-ref.enemy.expectedFootY)<1);
  assert.ok(ref.enemy.perspectiveScale>1.3&&ref.enemy.perspectiveScale<2.5,
    'Legacy 34% layout should get ONE ~1.6x correction, not a 5x upsample: '+JSON.stringify(ref));
  assert.ok(ref.enemy.sourceCanvasPixels>=512*512,
    'Character sharpness source resolution is too low');
  await page.screenshot({path:'artifacts/perspective/'+cfg.name+'-both-actors-corrected.png'});
  const far=await capture(-350);
  const near=await capture(-60);
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
  console.log('PASS '+cfg.name+': character 155/162 height, same ground and one 950px camera: '+
    JSON.stringify({ratio,expected,footY:ref.enemy.worldFootY,
      horizon:ref.horizon,far:far.enemy.renderedHeight,near:near.enemy.renderedHeight,
      sourceReadbacks:ref.perf.sourceReadbacks}));
  await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
