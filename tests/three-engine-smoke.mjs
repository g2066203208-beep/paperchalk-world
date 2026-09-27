import process from 'node:process';
import {chromium} from 'playwright-core';

function assert(condition,message){
  if(!condition)throw new Error(message);
}

const errors=[];
const browser=await chromium.launch({
  executablePath:process.env.CHROME_PATH,
  headless:true,
  args:[
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]
});

try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',error=>errors.push('PAGE '+String(error)));
  page.on('console',message=>{
    if(message.type()==='error')errors.push('CONSOLE '+message.text());
  });
  page.on('response',response=>{
    if(response.status()>=400)errors.push('HTTP '+response.status()+' '+response.url());
  });
  page.on('requestfailed',request=>errors.push('REQUEST '+request.url()+' '+JSON.stringify(request.failure())));

  await page.goto('http://127.0.0.1:8080/?ci=three-engine-smoke',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>!!window.Paperchalk3D&&!!window.PaperchalkRuntime,{timeout:5000});

  const cold=await page.evaluate(()=>({
    active:window.Paperchalk3D.active,
    ready:window.Paperchalk3D.ready,
    threeResources:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/vendor/three/')).length
  }));
  assert(cold.active===false&&cold.ready===false,'3D engine should stay cold on menu '+JSON.stringify(cold));
  assert(cold.threeResources===0,'Three.js vendor loaded before 3D scene was requested '+JSON.stringify(cold));

  await page.locator('#authBtn').click();
  await page.waitForTimeout(450);
  await page.locator('#tabRegister').click();
  await page.locator('#regUser').fill('three_audit');
  await page.locator('#regName').fill('3D审计');
  await page.locator('#regPass').fill('test1234');
  await page.locator('#registerForm button[type=submit]').click();
  await page.waitForFunction(()=>document.getElementById('uiShell')?.classList.contains('is-hidden'),{timeout:3000});

  const enabled=await page.evaluate(()=>window.Paperchalk3D.enable());
  assert(enabled===true,'3D engine refused to enable');
  await page.waitForFunction(()=>window.Paperchalk3D.ready&&window.Paperchalk3D.active,{timeout:12000});
  await page.waitForTimeout(300);

  const live=await page.evaluate(()=>{
    const canvas=document.querySelector('#threeWorldLayer canvas');
    const host=document.getElementById('threeWorldLayer');
    const stats=window.Paperchalk3D.stats;
    return {
      stats,
      canvas:{
        exists:!!canvas,
        width:canvas?.width||0,
        height:canvas?.height||0,
        context:!!(canvas?.getContext('webgl2')||canvas?.getContext('webgl'))
      },
      hostHidden:host.hidden,
      hostVisibility:getComputedStyle(host).visibility,
      stageClass:document.getElementById('world').className,
      vendorResources:performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/vendor/three/')).map(entry=>entry.name)
    };
  });

  assert(live.stats.engine==='three-r180-webgl','wrong 3D engine '+JSON.stringify(live.stats));
  assert(live.stats.ready&&live.stats.active&&live.stats.loopActive,'3D loop is not active '+JSON.stringify(live.stats));
  assert(live.stats.renderer.includes('WebGL'),'renderer is not WebGL '+JSON.stringify(live.stats));
  assert(live.canvas.exists&&live.canvas.width>700&&live.canvas.height>400&&live.canvas.context,'WebGL canvas invalid '+JSON.stringify(live.canvas));
  assert(live.hostHidden===false&&live.hostVisibility==='visible'&&live.stageClass.includes('three-test-active'),'3D surface is not visible '+JSON.stringify(live));
  assert(live.vendorResources.some(url=>url.includes('three.module.js'))&&live.vendorResources.some(url=>url.includes('three.core.js')),
    'pinned Three.js module/core pair did not load '+JSON.stringify(live.vendorResources));
  assert(live.stats.voxelCount>=60&&live.stats.carCount>=4&&live.stats.sceneChildren>=8,
    '3D test scene content is incomplete '+JSON.stringify(live.stats));
  assert(live.stats.drawCalls>0&&live.stats.triangles>0,'renderer produced no 3D draw work '+JSON.stringify(live.stats));

  const before=await page.evaluate(()=>window.Paperchalk3D.stats.player);
  await page.keyboard.down('KeyW');
  const after=await page.evaluate(()=>window.Paperchalk3D.debugStep(12));
  await page.keyboard.up('KeyW');
  assert(Math.hypot(after.x-before.x,after.z-before.z)>.5,'WASD did not move the 3D player '+JSON.stringify({before,after}));

  const airborne=await page.evaluate(()=>{
    const started=window.Paperchalk3D.jump();
    const stepped=window.Paperchalk3D.debugStep(6);
    return {started,...stepped};
  });
  assert(airborne.started&&airborne.y>.05&&!airborne.grounded,'3D jump/gravity state did not activate '+JSON.stringify(airborne));

  const touchControls=await page.evaluate(()=>{
    window.Paperchalk3D.resetPlayer();
    const forward=document.querySelector('[data-three-key="KeyW"]');
    const jump=document.querySelector('[data-three-jump]');
    if(!forward||!jump)return {exists:false};
    forward.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:77}));
    const moved=window.Paperchalk3D.debugStep(10);
    forward.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:77}));
    jump.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:78}));
    const jumped=window.Paperchalk3D.debugStep(4);
    jump.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:78}));
    return {exists:true,moved,jumped};
  });
  assert(touchControls.exists&&Math.hypot(touchControls.moved.x,touchControls.moved.z-12.5)>.35,
    '3D mobile movement controls failed '+JSON.stringify(touchControls));
  assert(touchControls.jumped.y>.02&&!touchControls.jumped.grounded,
    '3D mobile jump control failed '+JSON.stringify(touchControls));

  const voxel=await page.evaluate(()=>{
    const before=window.Paperchalk3D.stats.voxelCount;
    const added=window.Paperchalk3D.debugAddVoxel();
    const middle=window.Paperchalk3D.stats.voxelCount;
    const removed=window.Paperchalk3D.debugRemoveVoxel();
    const after=window.Paperchalk3D.stats.voxelCount;
    return {before,added,middle,removed,after};
  });
  assert(voxel.added&&voxel.middle===voxel.before+1&&voxel.removed&&voxel.after===voxel.before,
    'voxel add/remove path failed '+JSON.stringify(voxel));

  await page.evaluate(()=>window.Paperchalk3D.disable());
  await page.waitForTimeout(80);
  const stopped=await page.evaluate(()=>({
    active:window.Paperchalk3D.active,
    loop:window.Paperchalk3D.stats.loopActive,
    hidden:document.getElementById('threeWorldLayer').hidden,
    className:document.getElementById('world').className
  }));
  assert(!stopped.active&&!stopped.loop&&stopped.hidden&&!stopped.className.includes('three-test-active'),
    '3D engine did not suspend cleanly '+JSON.stringify(stopped));

  assert(errors.length===0,'runtime errors:\n'+errors.join('\n'));
  console.log(JSON.stringify({ok:true,cold,live:live.stats,before,after,airborne,voxel,stopped},null,2));
}finally{
  await browser.close();
}
