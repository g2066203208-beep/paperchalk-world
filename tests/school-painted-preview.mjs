// Capture the REAL 3D classroom WebGL surface after loading both painted
// user-authored image textures. No speculative mockup or screenshot compositor.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('artifacts/painted-school-room',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
page.setDefaultTimeout(45000);
page.on('pageerror',e=>console.error('GAME_PAGE_ERROR',String(e)));
try{
  await page.goto('http://127.0.0.1:8765/?storyCapture=1',{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#menu-start').click();
  const n=await page.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
  for(let i=0;i<n;i++)await page.locator('#next-line').click();
  await page.waitForFunction(()=>window.PaperWorldDailyLifeUI?.isModeActive());
  await page.evaluate(()=>window.PaperWorldQuickTools?.phone?.close?.());
  const travel=async dest=>{
    const r=await page.evaluate(d=>window.PaperWorldDailyLifeUI.navigate(d),dest);
    assert.equal(r?.ok,true,'Travel '+dest+' failed: '+JSON.stringify(r));
  };
  await travel('entrance');
  await travel('school');
  await page.waitForFunction(()=> {
    const s=window.PaperWorldSchoolRoomRenderer?.inspect?.();
    return s?.active&&s?.faceTextures?.back?.ready&&s?.faceTextures?.floor?.ready;
  },null,{timeout:60000});
  const status=await page.evaluate(()=>{
    window.PaperWorldSchoolRoomRenderer.render(0,0);
    return window.PaperWorldSchoolRoomRenderer.inspect();
  });
  assert.equal(status.error,null);
  assert.match(status.faceTextures.back.src,/back-painted\.png$/);
  assert.match(status.faceTextures.floor.src,/floor-painted\.png$/);
  assert.equal(status.faceTextures.back.ready,true);
  assert.equal(status.faceTextures.floor.ready,true);
  assert.equal(status.faceTextures.left.ready,true);
  assert.match(status.faceTextures.left.src,/left-windows-alpha\.svg$/);
  assert.ok(status.exterior.geometryTriangles>0,'Exterior should be actual WebGL geometry');
  assert.ok(status.exterior.skyX<status.exterior.windowWallX,'Sky must be behind the wall');
  const alphaProof=await page.evaluate(async()=>{
    // Check the source wall pixels, not a white preview or an opaque mockup.
    const src=window.PaperWorldSchoolRoomRenderer.inspect().faceTextures.left.src;
    const image=new Image();
    image.src=src;
    await image.decode();
    const plane=document.createElement('canvas');
    plane.width=image.naturalWidth;plane.height=image.naturalHeight;
    const ctx=plane.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0);
    const alpha=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
    return {
      transparentTop:alpha(180,180),transparentBottom:alpha(180,420),
      secondPane:alpha(650,180),thirdPane:alpha(1125,420),
      fourthPane:alpha(1630,180),
      structuralFrame:alpha(305,180),opaqueWall:alpha(40,650)
    };
  });
  assert.equal(alphaProof.transparentTop,0,'Window glass must be alpha=0');
  assert.equal(alphaProof.transparentBottom,0,'Lower glass must be alpha=0');
  assert.equal(alphaProof.secondPane,0);
  assert.equal(alphaProof.thirdPane,0);
  assert.equal(alphaProof.fourthPane,0);
  assert.equal(alphaProof.structuralFrame,255,'Keep frame opaque');
  assert.equal(alphaProof.opaqueWall,255,'Keep classroom wall opaque');
  console.log('SCHOOL_WINDOW_ALPHA_PROOF',JSON.stringify(alphaProof));
  // Captures the literal canvas pixels from the already-assembled WebGL
  // 2.5D scene, with textures on their real 3D geometry.
  const data=await page.evaluate(()=>window.PaperWorldSchoolRoomRenderer.canvas.toDataURL('image/png'));
  assert.ok(data.startsWith('data:image/png;base64,')&&data.length>20000,'Failed to extract real scene canvas');
  const bytes=Buffer.from(data.split(',')[1],'base64');
  const target='artifacts/painted-school-room/painted-classroom-live-canvas.png';
  writeFileSync(target,bytes);
  console.log('PAINTED_CLASSROOM_CAPTURE',JSON.stringify({target,bytes:bytes.length,textureCount:status.textureCount,materials:status.faceTextures,drawFrames:status.frame}));
}finally{await browser.close();}
