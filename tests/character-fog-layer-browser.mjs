import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {inflateSync} from 'node:zlib';
import {chromium} from 'playwright';

const root=resolve('site'),mime={'.html':'text/html','.js':'text/javascript',
 '.css':'text/css','.json':'application/json','.png':'image/png',
 '.webp':'image/webp','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
 let path=new URL(req.url,'http://127.0.0.1').pathname;
 if(path.endsWith('/'))path+='index.html';
 const file=resolve(root,'.'+path);
 if(!file.startsWith(root+'/')){res.writeHead(403);res.end();return}
 try{const b=readFileSync(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(b)}
 catch{res.writeHead(404);res.end('not found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));

function pixelAtCenter(png){
 assert.equal(png.subarray(1,4).toString(),'PNG');
 let offset=8,width=0,height=0,kind=0,bits=0,interlace=0;
 const idat=[];
 while(offset<png.length){
   const len=png.readUInt32BE(offset),tag=png.toString('ascii',offset+4,offset+8);
   const chunk=png.subarray(offset+8,offset+8+len);
   if(tag==='IHDR'){
     width=chunk.readUInt32BE(0);height=chunk.readUInt32BE(4);
     bits=chunk[8];kind=chunk[9];interlace=chunk[12];
   }else if(tag==='IDAT')idat.push(chunk);
   else if(tag==='IEND')break;
   offset+=len+12;
 }
 assert.equal(bits,8);
 assert.equal(interlace,0);
 assert.ok(kind===2||kind===6,'unexpected PNG format '+kind);
 const bpp=kind===6?4:3,stride=width*bpp;
 const data=inflateSync(Buffer.concat(idat));
 let cursor=0,prev=Buffer.alloc(stride);
 const targetY=Math.floor(height/2),targetX=Math.floor(width/2);
 for(let y=0;y<=targetY;y++){
   const filter=data[cursor++],row=Buffer.alloc(stride);
   for(let i=0;i<stride;i++){
     const a=i>=bpp?row[i-bpp]:0,b=prev[i],c=i>=bpp?prev[i-bpp]:0;
     let p=0;
     if(filter===1)p=a;
     else if(filter===2)p=b;
     else if(filter===3)p=Math.floor((a+b)/2);
     else if(filter===4){
       const n=a+b-c,da=Math.abs(n-a),db=Math.abs(n-b),dc=Math.abs(n-c);
       p=da<=db&&da<=dc?a:db<=dc?b:c;
     }else assert.equal(filter,0,'unknown PNG row filter');
     row[i]=(data[cursor+i]+p)&255;
   }
   cursor+=stride;
   prev=row;
 }
 return [...prev.subarray(targetX*bpp,targetX*bpp+3)];
}

const browser=await chromium.launch({headless:true,args:['--no-sandbox',
 '--use-gl=angle','--use-angle=swiftshader']});
mkdirSync('artifacts/fog-layer',{recursive:true});
try{
 for(const cfg of [{name:'desktop',w:1280,h:720,mobile:false},
                   {name:'mobile',w:390,h:844,mobile:true}]){
  const page=await browser.newPage({viewport:{width:cfg.w,height:cfg.h},
    isMobile:cfg.mobile,hasTouch:cfg.mobile,deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+
   '/index.html?scene=classroom',{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>{
    const c=document.getElementById('ui-edge-fog');
    return c?.width>0&&c?.height>0&&
      document.getElementById('novel-ui')?.hidden===false;
  },null,{timeout:16000});
  const roles=await page.evaluate(()=>{
    const id=x=>document.getElementById(x);
    const z=x=>Number(getComputedStyle(id(x)).zIndex);
    return {scene:z('scene'),enemy:z('enemy-depth-root'),
      nativeFog:z('fog'),edgeFog:z('ui-edge-fog'),
      protagonist:z('camera-player-root'),interface:z('novel-ui'),
      edgeParent:id('ui-edge-fog').parentElement.id,
      phoneFogParent:id('ui-phone-fog').parentElement.id,
      source:id('ui-edge-fog').getAttribute('data-visible')};
  });
  assert.equal(roles.edgeParent,'view','UI edge smoke still nested in top UI (covers protagonist)');
  assert.equal(roles.phoneFogParent,'novel-ui','Phone-specific contact veil must stay on phone');
  assert.ok(roles.scene<roles.enemy&&roles.enemy<roles.nativeFog&&
    roles.nativeFog<roles.edgeFog&&roles.edgeFog<roles.protagonist&&
    roles.protagonist<roles.interface,
    'World layer paint order not scene < enemy < smoke < protagonist < controls: '+
      JSON.stringify(roles));
  await page.evaluate(()=>{
    const view=document.getElementById('view');
    const enemy=document.getElementById('enemy-depth-root');
    const player=document.getElementById('camera-player-root');
    const uiFog=document.getElementById('ui-edge-fog');
    player.hidden=false;enemy.hidden=false;
    const create=(root,id,color,x,y)=>{
      const el=document.createElement('div');
      el.id=id;
      Object.assign(el.style,{position:'absolute',width:'48px',height:'48px',
        left:x+'px',top:y+'px',background:color,
        pointerEvents:'none',zIndex:'1000',boxShadow:'none'});
      root.append(el);
    };
    const W=view.clientWidth,H=view.clientHeight;
    const x=W*.46,y=H*.52;
    create(player,'player-fog-probe','#00ff00',x-24,y-24);
    create(enemy,'enemy-fog-probe','#ff00ff',
      x-(W-enemy.offsetWidth)/2-24,y-(H-enemy.offsetHeight)/2-24);
    // The exact ACTIVE UI-edge fog canvas, not a separate fake test layer.
    // Fully opaque only during this probe; all normal fog animation remains
    // unchanged and continues after the probe.
    uiFog.style.backgroundColor='#000';
    uiFog.hidden=false;
  });
  await page.waitForTimeout(130);
  const playerColor=pixelAtCenter(await page.locator('#player-fog-probe').screenshot());
  assert.ok(playerColor[1]>205&&playerColor[0]<100&&playerColor[2]<100,
    'FOREGROUND PROTAGONIST was painted behind black fog: '+
      JSON.stringify({cfg:cfg.name,playerColor,roles}));
  await page.locator('#player-fog-probe').evaluate(el=>{el.style.opacity='0'});
  const enemyCovered=pixelAtCenter(await page.locator('#enemy-fog-probe').screenshot());
  assert.ok(enemyCovered.every(x=>x<75),
    'ENEMY L2D was not occluded by black fog in real browser paint: '+
      JSON.stringify({cfg:cfg.name,enemyCovered,roles}));
  const baseline=await page.locator('#enemy-fog-probe').evaluate(el=>{
    const fog=document.getElementById('fog'),edge=document.getElementById('ui-edge-fog');
    fog.style.visibility='hidden';
    edge.hidden=true;
    return {fog:fog.style.visibility,hidden:edge.hidden};
  });
  assert.equal(baseline.hidden,true);
  const enemyExposed=pixelAtCenter(await page.locator('#enemy-fog-probe').screenshot());
  assert.ok(enemyExposed[0]>190&&enemyExposed[2]>190&&enemyExposed[1]<90,
    'NPC occlusion probe did not appear when both smoke layers were removed: '+
      JSON.stringify({cfg:cfg.name,enemyExposed,enemyCovered}));
  await page.evaluate(()=>{
    document.getElementById('fog').style.visibility='';
    const edge=document.getElementById('ui-edge-fog');
    edge.style.backgroundColor='';
    edge.hidden=false;
    document.getElementById('enemy-fog-probe').remove();
    document.getElementById('player-fog-probe').remove();
  });
  await page.screenshot({path:'artifacts/fog-layer/'+cfg.name+'-protagonist-outside-enemy-inside.png'});
  await page.evaluate(()=>document.getElementById('novel-ui').hidden=true);
  await page.waitForFunction(()=>document.getElementById('ui-edge-fog').hidden,
    null,{timeout:5000});
  await page.evaluate(()=>document.getElementById('novel-ui').hidden=false);
  await page.waitForFunction(()=>!document.getElementById('ui-edge-fog').hidden,
    null,{timeout:5000});
  // In the 3D DEV editor the CSS z-indices are disabled on purpose, hence
  // the SAME semantic layer separation must be enforced by real world Z.
  await page.locator('#menu-toggle').click();
  await page.locator('#game-dev').click();
  await page.locator('#dev-layer').selectOption('enemy');
  await page.evaluate(()=>{
    const z=document.getElementById('dev-z');z.value='300';
    z.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.getElementById('dev-rig')
    .dataset.depthOrderValid==='true');
  let dev=await page.evaluate(()=>{
    const rig=document.getElementById('dev-rig');
    const depth=x=>parseFloat(rig.style.getPropertyValue('--dev-depth-'+x));
    return {enemy:depth('enemy'),fog:depth('fog'),player:depth('player'),
      isDev:document.getElementById('view').classList.contains('dev-mode'),
      edgeHidden:getComputedStyle(document.getElementById('ui-edge-fog')).display==='none'};
  });
  assert.ok(dev.isDev&&dev.edgeHidden&&dev.enemy<dev.fog&&dev.fog<dev.player,
    'DEV enemy crossed IN FRONT OF world fog: '+JSON.stringify(dev));
  await page.locator('#dev-layer').selectOption('player');
  await page.evaluate(()=>{
    const z=document.getElementById('dev-z');z.value='-300';
    z.dispatchEvent(new Event('input',{bubbles:true}));
  });
  dev=await page.evaluate(()=>{
    const rig=document.getElementById('dev-rig');
    const depth=x=>parseFloat(rig.style.getPropertyValue('--dev-depth-'+x));
    return {enemy:depth('enemy'),fog:depth('fog'),player:depth('player'),
      valid:rig.dataset.depthOrderValid};
  });
  assert.ok(dev.enemy<dev.fog&&dev.fog<dev.player&&dev.valid==='true',
    'DEV protagonist went BEHIND world fog: '+JSON.stringify(dev));
  await page.screenshot({path:'artifacts/fog-layer/'+cfg.name+'-3d-depth-protected.png'});
  await page.locator('#dev-exit').click();
  await page.waitForFunction(()=>getComputedStyle(
    document.getElementById('ui-edge-fog')).display!=='none',null,{timeout:6000});
  assert.deepEqual(errors,[],errors.join('; '));
  console.log('PASS '+cfg.name+' actual PNG compositor: heroine bright over opaque fog; enemy blacked out; DEV Z protection, UI lifecycle');
  await page.close();
 }
}finally{
 await browser.close();
 await new Promise(ok=>server.close(ok));
}
