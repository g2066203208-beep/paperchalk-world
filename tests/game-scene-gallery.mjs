import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
const root=resolve('site'),types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.css':'text/css'};
const server=createServer((req,res)=>{
 let path=new URL(req.url,'http://localhost').pathname;
 if(path.endsWith('/'))path+='index.html';
 const absolute=resolve(root,'.'+path);
 if(!absolute.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{const data=readFileSync(absolute);res.writeHead(200,{'content-type':types[extname(absolute)]||'application/octet-stream'});res.end(data)}
 catch{if(!res.headersSent)res.writeHead(404);res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const catalog=JSON.parse(readFileSync('site/scene-catalog.generated.json','utf8')).scenes;
const scenes=['menu','school',...catalog.map(e=>e.id)],base='http://127.0.0.1:'+server.address().port+'/';
mkdirSync('artifacts/game-scene-gallery',{recursive:true});
const results=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
try{
 for(const cfg of [{id:'desktop',width:1280,height:720,isMobile:false},{id:'mobile-landscape',width:844,height:390,isMobile:true}]){
  for(const id of scenes){
   const page=await browser.newPage({viewport:{width:cfg.width,height:cfg.height},deviceScaleFactor:1,isMobile:cfg.isMobile,hasTouch:cfg.isMobile});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.goto(base+(id==='menu'?'':'?scene='+encodeURIComponent(id)),{waitUntil:'domcontentloaded',timeout:40000});
    await page.waitForFunction(id=>document.querySelector('#scene')?.dataset.scene===id,id,{timeout:20000});
    await page.waitForFunction(()=>document.querySelector('#source')?.naturalWidth>0&&Number(document.querySelector('#fog')?.dataset.frames||0)>6,null,{timeout:30000});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(1100);
    const state=await page.evaluate(()=>{
      const img=document.getElementById('source'),fog=document.getElementById('fog');
      return {scene:document.getElementById('scene').dataset.scene,width:img.naturalWidth,height:img.naturalHeight,src:img.getAttribute('src'),fog:fog.dataset.renderer,frames:fog.dataset.frames,playerVisible:!document.getElementById('camera-player-root').hidden};
    });
    if(state.scene!==id)throw Error('wrong scene '+id);
    const filename=cfg.id+'-'+id+'.png';
    await page.screenshot({path:'artifacts/game-scene-gallery/'+filename,animations:'disabled'});
    results.push({...state,profile:cfg.id,filename,errors});
    console.log('CAPTURED',cfg.id,id,state.width+'x'+state.height);
   }finally{await page.close();}
  }
 }
 writeFileSync('artifacts/game-scene-gallery/metadata.json',JSON.stringify(results,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
