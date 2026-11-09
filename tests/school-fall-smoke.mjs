import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const dir='artifacts/school-window-fall';
mkdirSync(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
page.setDefaultTimeout(35000);
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
  await page.goto('http://127.0.0.1:8765/?scene=school&storyCapture=1',
    {waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{
    const s=window.PaperWorldSchoolRoomRenderer?.inspect?.();
    if(s?.error)throw Error(s.error);
    return s?.active&&s?.textureCount===s?.expectedTextures;
  },null,{timeout:60000});
  const frames=[];
  const scene=window=>window.PaperWorldSchoolRoomRenderer;
  for(const [sec,label] of [
    [0,'01-normal-school'],[.55,'02-turning'],
    [.92,'03-first-glimpse'],[1.12,'04-window-crossing'],
    [1.31,'05-falling'],[1.50,'06-vanishing'],
    [2.22,'07-empty-window'],[4.25,'08-back-in-class']
  ]){
    const response=await page.evaluate(t=>{
      const r=window.PaperWorldSchoolRoomRenderer;
      r.setLightingPreview(660);
      if(!r.setFallPreview(t))throw Error('QA preview denied');
      r.render(0,0,{...(window.PaperWorldDailyLifeUI?.snapshot?.()||{}),day:3});
      return {png:r.canvas.toDataURL('image/png'),
        stage:r.inspect().fallSequence.stage,geometry:r.inspect().fallMaterialGeometry,
        error:r.inspect().error};
    },sec);
    assert.equal(response.error,null,'WebGL error at '+sec);
    assert.equal(response.geometry.parallelTo,'left-window-wall');
    assert.ok(response.png.length>25000,'Real frame missing '+label);
    writeFileSync(dir+'/'+label+'.png',Buffer.from(response.png.split(',')[1],'base64'));
    frames.push({time:sec,label,stage:response.stage});
  }
  const diff=await page.evaluate(()=>{
    const r=window.PaperWorldSchoolRoomRenderer;
    const room=window.PaperWorldSchoolRoom;
    function capture(t){
      r.setFallPreview(t);
      r.render(0,0,{...(window.PaperWorldDailyLifeUI?.snapshot?.()||{}),day:3});
      const c=r.canvas,s=document.createElement('canvas');
      s.width=c.width;s.height=c.height;
      const x=s.getContext('2d',{willReadFrequently:true});
      x.drawImage(c,0,0);
      return x.getImageData(0,0,c.width,c.height).data;
    }
    const a=capture(1.12),b=capture(2.22),c=r.canvas;
    const phase=room.fallPhaseAt(1.12);
    const cam=room.camera();
    cam.yaw+=room.FALL_WINDOW.viewAngle*phase.gaze;
    cam.hFov-=4.6*phase.gaze;cam.pitch+=.014*phase.gaze;
    const center=room.project([room.FALL_WINDOW.figureX,phase.yBottom+
      room.FALL_WINDOW.height*.5,phase.centerZ],cam,c.width,c.height);
    let count=0,checked=0;
    for(let y=Math.max(0,Math.floor(center.y-110));
      y<Math.min(c.height,Math.ceil(center.y+110));y+=2)
      for(let x=Math.max(0,Math.floor(center.x-95));
        x<Math.min(c.width,Math.ceil(center.x+95));x+=2){
        const i=(y*c.width+x)*4;
        const delta=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+
          Math.abs(a[i+2]-b[i+2]);
        checked++;if(delta>44)count++;
      }
    return {differentPixels:count,samples:checked,center};
  });
  assert.ok(diff.differentPixels>120,
    'Fall silhouette must be visible behind real transparent glass: '+
    JSON.stringify(diff));
  console.log('SCHOOL_WINDOW_FALL_FAST_REAL_WEBGL',JSON.stringify({frames,diff}));
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
