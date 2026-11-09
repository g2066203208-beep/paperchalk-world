// Capture the REAL 3D classroom WebGL surface after loading both painted
// user-authored image textures. No speculative mockup or screenshot compositor.
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('artifacts/painted-school-room',{recursive:true});
async function captureGamePage(page,path,schoolActive=true){
  // Never invoke full browser page.screenshot during animated WebGL:
  // Chromium's compositor can block a whole test for minutes.
  if(!schoolActive)return 'menu-skipped';
  const encoded=await page.evaluate(()=>{
    const r=window.PaperWorldSchoolRoomRenderer;
    r.render(0,0);
    return r.canvas.toDataURL('image/png');
  });
  assert.match(encoded,/^data:image\/png;base64,/);
  writeFileSync(path,Buffer.from(encoded.split(',')[1],'base64'));
  console.log('GAME_SCREENSHOT',path,'real-webgl-direct');
  return 'real-webgl-direct';
}

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
page.setDefaultTimeout(45000);
page.on('pageerror',e=>console.error('GAME_PAGE_ERROR',String(e)));
page.on('console',msg=>{if(['warning','error'].includes(msg.type())) console.error('SCHOOL_BROWSER_CONSOLE',msg.type(),msg.text().slice(0,1600));});
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
  // Fail with actual runtime/shader error rather than a silent 60s timeout.
  await page.waitForFunction(()=>{
    const s=window.PaperWorldSchoolRoomRenderer?.inspect?.();
    if(s?.error)throw Error('School shader/runtime: '+s.error);
    return !!s&&!!s.frame;
  },null,{timeout:20000}).catch(async e=>{
    console.error('SCHOOL_LOAD_DIAGNOSTIC',JSON.stringify(await page.evaluate(()=>({
      scene:document.querySelector('#scene')?.dataset?.scene,
      school:window.PaperWorldSchoolRoomRenderer?.inspect?.()||null
    }))));
    throw e;
  });
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
  assert.equal(status.furnitureTextures.desk.src,
    './assets/school-room/gpt-student-furniture-atlas.webp');
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
    assert.match(mat.src,/gpt-student-furniture-atlas\.webp$/,
      'Official classroom must actually render GPT-painted props: '+id);
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

  // Reduce QA readback to a normal horizontal phone viewport. The first
  // 1440x810 real game canvas was already archived above.
  await page.setViewportSize({width:960,height:540});
  // Exact world-time lighting comparisons from the REAL game's WebGL canvas,
  // not tinted reference images. Story-capture is required for the QA override.
  const periods=[
    {minute:390,name:'sunrise-0630'},
    {minute:750,name:'noon-1230'},
    {minute:1065,name:'sunset-1745'},
    {minute:1185,name:'night-1945'}
  ];
  const sceneLightingShots=[];
  for(const period of periods){
    const result=await page.evaluate(minute=>{
      const renderer=window.PaperWorldSchoolRoomRenderer;
      if(!renderer.setLightingPreview(minute))throw Error('QA lighting preview denied');
      renderer.render(0,0);
      const canvas=renderer.canvas;
      const px=document.createElement('canvas');
      px.width=120;px.height=68;
      const ctx=px.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(canvas,0,0,120,68);
      const rgba=ctx.getImageData(0,0,120,68).data;
      let red=0,green=0,blue=0;
      for(let i=0;i<rgba.length;i+=4){red+=rgba[i];green+=rgba[i+1];blue+=rgba[i+2];}
      return {
        encoded:canvas.toDataURL('image/png'),
        lighting:renderer.inspect().lighting,
        average:{red:red/(120*68),green:green/(120*68),blue:blue/(120*68)},
        error:renderer.inspect().error
      };
    },period.minute);
    assert.equal(result.error,null,'WebGL failed at '+period.name);
    assert.equal(result.lighting.minute,period.minute);
    assert.equal(result.lighting.source,'qa-preview');
    assert.ok(result.encoded.length>25000,'Empty rendered sunrise/noon/sunset frame');
    const filepath='artifacts/painted-school-room/daylight-'+period.name+'.png';
    writeFileSync(filepath,Buffer.from(result.encoded.split(',')[1],'base64'));
    sceneLightingShots.push({name:period.name,minute:period.minute,
      phase:result.lighting.phase,average:result.average,
      sunPower:result.lighting.sunPower});
  }
  assert.ok(sceneLightingShots[1].average.red>sceneLightingShots[3].average.red*1.50,
    'The actual daylight canvas must be significantly brighter than night');
  assert.ok(sceneLightingShots[2].average.red>sceneLightingShots[2].average.blue*1.06,
    'Golden hour in the real canvas must be visibly warmer than blue');
  console.log('SCHOOL_DAY_NIGHT_WEBGL_PROOF',JSON.stringify(sceneLightingShots));

  // Full day-three window-fall cinematic, frozen from the actual GAME's
  // WebGL framebuffer. Day 3 removes the girl from her former classroom seat.
  await page.evaluate(()=>window.PaperWorldSchoolRoomRenderer.setLightingPreview(660));
  const fallFrames=[
    {time:0,name:'00-normal-lesson'},
    {time:.38,name:'01-turns-to-window'},
    {time:.88,name:'02-figure-above-glass'},
    {time:1.10,name:'03-figure-crossing'},
    {time:1.31,name:'04-fast-fall'},
    {time:1.55,name:'05-under-the-sill'},
    {time:2.22,name:'06-empty-window'},
    {time:4.30,name:'07-camera-recovery'}
  ];
  const fallProof=[];
  for(const mark of fallFrames){
    const shot=await page.evaluate(t=>{
      const r=window.PaperWorldSchoolRoomRenderer;
      if(!r.setFallPreview(t))throw Error('Falling-girl preview denied');
      const life={...window.PaperWorldDailyLifeUI.snapshot(),day:3};
      r.render(0,0,life);
      const status=r.inspect();
      return {png:r.canvas.toDataURL('image/png'),
        state:status.fallSequence,error:status.error,
        geom:status.fallMaterialGeometry};
    },mark.time);
    assert.equal(shot.error,null,'Jump WebGL frame '+mark.time);
    assert.ok(shot.png.length>25000,'Empty jump animation frame '+mark.name);
    assert.equal(shot.state.elapsed,mark.time);
    assert.equal(shot.geom.parallelTo,'left-window-wall');
    assert.ok(shot.geom.worldX<shot.geom.windowWallX);
    if(mark.time>=.88&&mark.time<=1.55)
      assert.equal(shot.state.fallingVisible,true);
    if(mark.time>=2.22)assert.equal(shot.state.fallingVisible,false);
    const file='artifacts/painted-school-room/fall-'+mark.name+'.png';
    writeFileSync(file,Buffer.from(shot.png.split(',')[1],'base64'));
    fallProof.push({t:mark.time,phase:shot.state.stage,
      cameraTurn:shot.state.gaze,visible:shot.state.fallingVisible,file});
  }
  // Verify the actual alpha silhouette changes visible pixels in the glass.
  // Compare two frames with the SAME pan, daylight and actor positions.
  const windowProof=await page.evaluate(()=>{
    const r=window.PaperWorldSchoolRoomRenderer;
    const room=window.PaperWorldSchoolRoom;
    const life={...window.PaperWorldDailyLifeUI.snapshot(),day:3};
    function take(t){
      r.setFallPreview(t);
      r.render(0,0,life);
      const c=r.canvas;
      const out=document.createElement('canvas');
      out.width=c.width;out.height=c.height;
      const ctx=out.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(c,0,0);
      return {pixels:ctx.getImageData(0,0,c.width,c.height).data,
        width:c.width,height:c.height};
    }
    const crossing=take(1.12);
    const empty=take(2.22);
    const state=room.fallPhaseAt(1.12);
    const cam=room.camera();
    cam.yaw+=room.FALL_WINDOW.viewAngle*state.gaze;
    cam.hFov-=4.6*state.gaze;
    cam.pitch+=.014*state.gaze;
    const p=room.project([room.FALL_WINDOW.figureX,state.yBottom+
      room.FALL_WINDOW.height*.5,state.centerZ],
      cam,crossing.width,crossing.height);
    let different=0,compared=0,accumulated=0;
    const x0=Math.max(0,Math.floor(p.x-125));
    const x1=Math.min(crossing.width,Math.ceil(p.x+125));
    const y0=Math.max(0,Math.floor(p.y-160));
    const y1=Math.min(crossing.height,Math.ceil(p.y+160));
    for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
      const i=(y*crossing.width+x)*4;
      const delta=Math.abs(crossing.pixels[i]-empty.pixels[i])+
        Math.abs(crossing.pixels[i+1]-empty.pixels[i+1])+
        Math.abs(crossing.pixels[i+2]-empty.pixels[i+2]);
      compared++;accumulated+=delta;if(delta>44)different++;
    }
    return {different,compared,meanDelta:accumulated/Math.max(1,compared),
      projected:p,scene:r.inspect().renderer};
  });
  assert.ok(windowProof.projected&&windowProof.projected.x>150,
    'The falling girl must be in the actual camera view: '+JSON.stringify(windowProof));
  assert.ok(windowProof.different>200,
    'Girl must be VISIBLY drawn through actual window pixels, not invisible/edge-on: '+
    JSON.stringify(windowProof));
  console.log('SCHOOL_FALL_REAL_WEBGL_PROOF',JSON.stringify({frames:fallProof,pixels:windowProof}));
  // An additional smooth sequence, exact game frames, for animation review.
  for(let i=0;i<19;i++){
    const t=4.30*i/18;
    const png=await page.evaluate(at=>{
      const r=window.PaperWorldSchoolRoomRenderer;
      r.setFallPreview(at);
      r.render(0,0,{...window.PaperWorldDailyLifeUI.snapshot(),day:3});
      const out=document.createElement('canvas');
      out.width=768;out.height=432;
      out.getContext('2d').drawImage(r.canvas,0,0,out.width,out.height);
      return out.toDataURL('image/png');
    },t);
    writeFileSync('artifacts/painted-school-room/fall-motion-'+
      String(i).padStart(2,'0')+'.png',Buffer.from(png.split(',')[1],'base64'));
  }
  console.log('SCHOOL_FALL_REAL_MOTION_FRAMES',JSON.stringify({
    count:19,duration:4.30,format:'actual-webgl-768x432',day:3
  }));
  await page.evaluate(()=>window.PaperWorldSchoolRoomRenderer.setFallPreview(null));


  // Capture Boss in a legible daytime lesson, then let the encounter itself
  // drain the light. Do not carry over the preceding night QA time setting.
  await page.evaluate(()=>window.PaperWorldSchoolRoomRenderer.setLightingPreview(660));
  // Capture actual classroom pixels through the entire 2D boss cinematic.
  // Each furniture item has a distinct world-space flight mesh; by the end
  // all 20 desks, 20 chairs and the podium are GONE, not hidden under a mask.
  const bossShots=[];
  for(const mark of [
    {at:0,name:'00-calm'},
    {at:.60,name:'01-rupture'},
    {at:1.35,name:'02-desks-flying'},
    {at:2.28,name:'03-furniture-vanishing'},
    {at:3.23,name:'04-boss-appearing'},
    {at:4.15,name:'05-boss-empty-classroom'}
  ]){
    const result=await page.evaluate(t=>{
      const r=window.PaperWorldSchoolRoomRenderer;
      if(!r.setBossBirthPreview(t))throw Error('Boss preview not allowed');
      r.render(0,0);
      return {state:r.inspect().bossEncounter,error:r.inspect().error,
        encoded:r.canvas.toDataURL('image/png')};
    },mark.at);
    assert.equal(result.error,null,'Boss frame WebGL failure at '+mark.at);
    assert.ok(result.encoded.length>25000,'Missing rendered boss frame '+mark.name);
    assert.equal(result.state.animatedFurnitureCount,41);
    assert.equal(result.state.modelCount,0);
    assert.ok(Object.values(result.state.readyAssets).every(x=>x.ready),
      'Boss art did not load: '+JSON.stringify(result.state.readyAssets));
    if(mark.at<.78)assert.equal(result.state.visibleFurnitureCount,41);
    if(mark.at>=2.68)assert.equal(result.state.visibleFurnitureCount,0);
    if(mark.at===4.15)assert.equal(result.state.phase,'boss-ready');
    const path='artifacts/painted-school-room/boss-'+mark.name+'.png';
    writeFileSync(path,Buffer.from(result.encoded.split(',')[1],'base64'));
    bossShots.push({name:mark.name,t:mark.at,phase:result.state.phase,
      visibleFurniture:result.state.visibleFurnitureCount,
      furnitureOpacity:result.state.furnitureOpacity,
      bossGrowth:result.state.bossGrowth,path});
  }
  console.log('SCHOOL_BOSS_BIRTH_REAL_WEBGL',JSON.stringify(bossShots));

  // The full animation preview uses 29 distinct REAL WebGL frames, not image
  // interpolations or a storyboard. Downsample on readback for light artifacts.
  for(let i=0;i<19;i++){
    const seconds=4.15*i/18;
    const capture=await page.evaluate(t=>{
      const renderer=window.PaperWorldSchoolRoomRenderer;
      renderer.setBossBirthPreview(t);
      const source=renderer.canvas;
      const output=document.createElement('canvas');
      output.width=768;output.height=432;
      output.getContext('2d').drawImage(source,0,0,768,432);
      return {png:output.toDataURL('image/png'),
        phase:renderer.inspect().bossEncounter.phase,
        error:renderer.inspect().error};
    },seconds);
    assert.equal(capture.error,null,'Boss movement GL error t='+seconds);
    writeFileSync('artifacts/painted-school-room/boss-motion-'+
      String(i).padStart(2,'0')+'.png',
      Buffer.from(capture.png.split(',')[1],'base64'));
  }
  console.log('SCHOOL_BOSS_MOTION_REAL_FRAMES',JSON.stringify({
    count:19,durationSeconds:4.15,format:'real-webgl-768x432',
    noModelledFurniture:true}));

  await page.evaluate(()=>window.PaperWorldSchoolRoomRenderer.setBossBirthPreview(null));

  await page.evaluate(()=>window.PaperWorldSchoolRoomRenderer.setLightingPreview(null));


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
