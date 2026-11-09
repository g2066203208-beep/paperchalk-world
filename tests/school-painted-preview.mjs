// Capture the REAL 3D classroom WebGL surface after loading both painted
// user-authored image textures. No speculative mockup or screenshot compositor.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('artifacts/painted-school-room',{recursive:true});
async function captureGamePage(page,path,schoolActive=true){
  // Chromium may stall on a full-page screenshot when long-running WebGL and
  // continuously animated fog coexist. Keep the capture optional, but never
  // let a screenshot-compositor timeout invalidate verified classroom geometry.
  try{
    await page.screenshot({path,animations:'allow',timeout:15000});
    console.log('GAME_SCREENSHOT',path,'full-page');
    return 'full-page';
  }catch(e){
    if(!schoolActive){
      console.warn('MENU_SCREENSHOT_SKIPPED',String(e).slice(0,140));
      return 'skipped';
    }
    // This is the real frame buffer from the active game WebGL, not mock art.
    const pixels=await page.evaluate(()=>{
      const r=window.PaperWorldSchoolRoomRenderer;
      r.render(0,0);
      return r.canvas.toDataURL('image/png');
    });
    assert.match(pixels,/^data:image\/png;base64,/);
    writeFileSync(path,Buffer.from(pixels.split(',')[1],'base64'));
    console.log('GAME_SCREENSHOT',path,'real-webgl-fallback');
    return 'real-webgl-fallback';
  }
}
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
    return s?.active&&s?.faceTextures?.back?.ready&&s?.faceTextures?.floor?.ready
      &&s?.faceTextures?.right?.ready
      &&Object.values(s?.furnitureTextures||{}).length===3
      &&Object.values(s.furnitureTextures).every(v=>v.ready)
      &&Object.values(s?.exterior?.materials||{}).length===2
      &&Object.values(s.exterior.materials).every(v=>v.ready)
      &&s?.fallingTexture?.ready;
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
  assert.equal(status.faceTextures.right.ready,true);
  assert.match(status.faceTextures.right.src,/right-door-painted\.svg$/);
  assert.equal(status.deskCount,20);
  assert.equal(status.chairCount,20);
  assert.ok(status.actorArtwork&&Object.keys(status.actorArtwork).length===6);
  const artCalibration={};
  for(const [id,art] of Object.entries(status.actorArtwork)){
    assert.equal(art.ready,true,'Character source failed to load: '+id);
    assert.ok(art.sourcePixels.width>0&&art.sourcePixels.height>0);
    assert.ok(art.fit&&art.fit.ink.bottom>art.fit.ink.top);
    assert.ok(Math.abs(art.fit.sourceAspect-art.fit.planeAspect)<1e-9,
      'Source aspect must be preserved for '+id);
    assert.ok(Math.abs(art.fit.visibleHeight-art.physicalHeight)<1e-6,
      'Visible original ink height must agree with character world height: '+id);
    artCalibration[id]={source:art.source,sourcePixels:art.sourcePixels,
      visibleInk:art.fit.ink,visibleWorldHeight:art.fit.visibleHeight,
      planeWidth:art.fit.planeWidth,planeHeight:art.fit.planeHeight};
  }
  console.log('SCHOOL_ORIGINAL_CHARACTER_SIZES',JSON.stringify(artCalibration));
  const projectedHero=await page.evaluate(()=>{
    const api=window.PaperWorldSchoolRoomRenderer,actor=window.PaperWorldSchoolRoom.ACTORS.find(a=>a.id==='girl');
    // The same camera used for the full WebGL scene, not CSS portrait scaling.
    const cam=window.PaperWorldSchoolRoom.camera();
    const foot=window.PaperWorldSchoolRoom.project([actor.x,0,actor.z],cam,1440,810);
    const head=window.PaperWorldSchoolRoom.project([actor.x,actor.h,actor.z],cam,1440,810);
    return {heightFraction:(foot.y-head.y)/810,cam};
  });
  assert.ok(projectedHero.heightFraction>.49&&projectedHero.heightFraction<.69,
    'Girl must appear human-size in the real classroom: '+JSON.stringify(projectedHero));
  console.log('SCHOOL_HUMAN_SCALE_CAMERA',JSON.stringify(projectedHero));
  assert.equal(status.propRendering,'painted-2d-standees');
  assert.equal(status.geometryPolicy,'textured-2d-planes-only');
  assert.equal(status.solidMeshes,0);
  assert.equal(status.textureCount,status.expectedTextures);
  assert.equal(status.exterior.mode,'textured-2d-planes');
  assert.equal(status.exterior.materials.sky.ready,true);
  assert.equal(status.exterior.materials.facade.ready,true);
  assert.match(status.exterior.materials.sky.src,/exterior-overcast-sky\.svg$/);
  assert.match(status.exterior.materials.facade.src,/exterior-school-facade\.svg$/);
  assert.equal(status.fallingTexture.ready,true);
  assert.match(status.fallingTexture.src,/falling-schoolgirl-silhouette\.svg$/);
  assert.equal(status.propCount,41);
  assert.deepEqual(status.propTriangles,{desk:40,chair:40,podium:2});
  assert.equal(Object.keys(status.furnitureTextures).length,3);
  assert.deepEqual(status.classroomLayout.columns,[-3.48,-1.22,1.22,3.48]);
  assert.deepEqual(status.classroomLayout.rows,[2.15,3.3,4.45,5.6,6.75]);
  for(const [id,mat] of Object.entries(status.furnitureTextures)){
    assert.equal(mat.ready,true,'Student furniture material failed '+id);
    assert.match(mat.src,/^(?:\.\/assets\/school-room\/)(?:student-(?:desk|chair)-standee|teacher-podium-standee)\.svg$/);
  }
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

  // These are real game screenshots, not cropped WebGL samples or mockups.
  // Confirm the phone menu matches the user's actual path into daily life.
  await captureGamePage(page,'artifacts/painted-school-room/desktop-actual-game-school.png');
  const mobile=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true
  });
  mobile.setDefaultTimeout(45000);
  mobile.on('pageerror',e=>console.error('MOBILE_GAME_PAGE_ERROR',String(e)));
  await mobile.goto('http://127.0.0.1:8765/?storyCapture=1',{waitUntil:'domcontentloaded',timeout:60000});
  await captureGamePage(mobile,'artifacts/painted-school-room/mobile-00-real-menu.png',false);
  await mobile.locator('#menu-start').click();
  const mobileDialogueCount=await mobile.evaluate(()=>window.PaperWorldStoryContent.wakeup.length);
  for(let i=0;i<mobileDialogueCount;i++)await mobile.locator('#next-line').click();
  await mobile.waitForFunction(()=>window.PaperWorldDailyLifeUI?.isModeActive());
  await mobile.evaluate(()=>window.PaperWorldQuickTools?.phone?.close?.());
  for(const dest of ['entrance','school']){
    const travelResult=await mobile.evaluate(place=>window.PaperWorldDailyLifeUI.navigate(place),dest);
    assert.equal(travelResult?.ok,true,'Mobile game travel to '+dest+' failed: '+JSON.stringify(travelResult));
  }
  await mobile.waitForFunction(()=>{
    const s=window.PaperWorldSchoolRoomRenderer?.inspect?.();
    return s?.active&&s?.error===null&&s?.faceTextures?.left?.ready
      &&Object.values(s?.exterior?.materials||{}).every(v=>v.ready)
      &&s?.fallingTexture?.ready
      &&s?.faceTextures?.right?.ready
      &&Object.values(s?.furnitureTextures||{}).every(v=>v.ready);
  },null,{timeout:60000});
  const mobileScene=await mobile.evaluate(()=>{
    window.PaperWorldSchoolRoomRenderer.render(0,0);
    return {scene:document.querySelector('#scene')?.dataset?.scene,
      view:window.PaperWorldSchoolRoomRenderer.inspect(),
      viewport:{width:innerWidth,height:innerHeight}
    };
  });
  assert.equal(mobileScene.scene,'school','Game must really open the 3D classroom on phone');
  assert.match(mobileScene.view.faceTextures.left.src,/left-windows-alpha\.svg$/);
  await captureGamePage(mobile,'artifacts/painted-school-room/mobile-01-actual-game-school.png');
  console.log('MOBILE_SCHOOL_GAME_SCREENSHOT',JSON.stringify({
    scene:mobileScene.scene,renderer:mobileScene.view.renderer,
    leftWallLoaded:mobileScene.view.faceTextures.left.ready,
    viewport:mobileScene.viewport,textureCount:mobileScene.view.textureCount
  }));
  await mobile.close();

  // Landscape phone dimensions, separately from the portrait UI rotation.
  const landscape=await browser.newPage({
    viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true
  });
  await landscape.goto('http://127.0.0.1:8765/?storyCapture=1',{waitUntil:'domcontentloaded',timeout:60000});
  await landscape.locator('#menu-start').click();
  for(let i=0;i<n;i++)await landscape.locator('#next-line').click();
  await landscape.waitForFunction(()=>window.PaperWorldDailyLifeUI?.isModeActive());
  await landscape.evaluate(()=>window.PaperWorldQuickTools?.phone?.close?.());
  for(const dest of ['entrance','school']){
    const result=await landscape.evaluate(place=>window.PaperWorldDailyLifeUI.navigate(place),dest);
    assert.equal(result?.ok,true,'Landscape travel to '+dest+' failed');
  }
  await landscape.waitForFunction(()=>{
    const s=window.PaperWorldSchoolRoomRenderer?.inspect?.();
    return s?.faceTextures?.left?.ready&&s?.fallingTexture?.ready
      &&Object.values(s?.exterior?.materials||{}).every(v=>v.ready);
  });
  await captureGamePage(landscape,'artifacts/painted-school-room/mobile-02-landscape-game-school.png');
  console.log('LANDSCAPE_GAME_SCHOOL_PROOF',JSON.stringify(
    await landscape.evaluate(()=>({scene:document.querySelector('#scene')?.dataset.scene,
      renderer:window.PaperWorldSchoolRoomRenderer.inspect().renderer}))
  ));
  await landscape.close();

}finally{await browser.close();}
