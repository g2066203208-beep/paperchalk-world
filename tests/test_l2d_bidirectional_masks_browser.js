/* Regression for real front/behind per-part masks, cross-object targeting,
 * nondestructive Photoshop source art and persistent game-ready PartRig. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=male2&side=front',
    {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkStudio?.current==='male2'&&
    window.PaperchalkPartRigStudio?.state?.active===true&&
    window.characterEditor.S.layers.front.filter(p=>p.sourcePart).length===16,
    null,{timeout:45000});
  assert.equal(await page.locator('#rig-mask-front').isVisible(),true);
  assert.equal(await page.locator('#rig-mask-back').isVisible(),true);
  assert.equal(await page.locator('#rig-mask-behind').count(),0,'old manual base-Z repair removed');
  assert.equal(await page.locator('#rig-mask-toggle').isVisible(),false,
    'editing must never arm itself on mere selection');
  const sample=await page.evaluate(()=>{
   const core=window.PaperchalkPartRigCore,studio=window.PaperchalkPartRigStudio,
    S=window.characterEditor.S,m=studio.state.model,all=S.layers.front;
   const source='topwear',target='neck';
   const drawPart=(id)=>{
    const c=document.createElement('canvas');c.width=1024;c.height=1024;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    core.draw(ctx,all.filter(p=>p.partId===id),m,0);
    return ctx.getImageData(0,0,1024,1024).data;
   };
   const a=drawPart(source),b=drawPart(target),r=document.getElementById('stage');
   let best=null,score=0;
   for(let y=40;y<940;y+=2)for(let x=50;x<940;x+=2){
    const idx=(y*1024+x)*4;
    if(a[idx+3]<190||b[idx+3]<190)continue;
    const c=Math.abs(a[idx]-b[idx])+Math.abs(a[idx+1]-b[idx+1])+
      Math.abs(a[idx+2]-b[idx+2]);
    const sx=S.px+x*S.zoom,sy=S.py+y*S.zoom;
    if(sx<115||sx>r.clientWidth-120||sy<55||sy>r.clientHeight-45)continue;
    if(c>score){score=c;best={x,y,source,target,contrast:c};}
   }
   return best;
  });
  assert.ok(sample,'source topwear and neck need a visible overlapping patch');
  await page.locator('#rig-part').selectOption(sample.source);
  await page.locator('#rig-mask-target').selectOption(sample.target);
  await page.locator('#rig-mask-back').click();
  assert.equal(await page.locator('#rig-mask-back').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>window.characterEditor.S.tool),'select',
    'switching to behind must not start painting by accident');
  const original=await page.evaluate(id=>
   window.characterEditor.S.layers.front.find(p=>p.partId===id).canvas.toDataURL(),sample.source);
  await page.locator('#rig-mask-size').fill('80');
  await page.locator('#rig-mask-paint').click();
  assert.equal(await page.evaluate(()=>window.characterEditor.S.tool),'mask');
  const pos=await page.evaluate(({x,y})=>{
   const S=window.characterEditor.S,r=document.getElementById('stage').getBoundingClientRect();
   return {x:r.x+S.px+x*S.zoom,y:r.y+S.py+y*S.zoom};
  },sample);
  await page.mouse.click(pos.x,pos.y);
  const result=await page.evaluate(({source,target})=>{
   const m=window.PaperchalkPartRigStudio.state.model,
    mask=m.occlusionMasks.find(x=>x.source===source&&x.direction==='behind'&&
      (x.targets||[x.target]).includes(target));
   if(!mask)return null;
   const c=mask._canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let painted=0;for(let i=3;i<d.length;i+=4)if(d[i])painted++;
   return {direction:mask.direction,painted,png:mask.png?.slice(0,22)};
  },sample);
  assert.ok(result?.painted>100,'brush should paint behind-mask source alpha');
  assert.equal(result.direction,'behind');
  assert.equal(result.png,'data:image/png;base64,');
  const difference=await page.evaluate(({source,target})=>{
   const core=window.PaperchalkPartRigCore,st=window.PaperchalkPartRigStudio.state,
    art=window.characterEditor.S.layers.front,m=st.model;
   function draw(){
    const c=document.createElement('canvas');c.width=1024;c.height=1024;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    core.draw(ctx,art,m,st.phase);return ctx.getImageData(0,0,1024,1024).data;
   }
   const withMask=draw(),stored=m.occlusionMasks;
   m.occlusionMasks=stored.filter(x=>x.source!==source||
    x.direction!=='behind'||!(x.targets||[x.target]).includes(target));
   const withoutMask=draw();m.occlusionMasks=stored;
   let count=0;for(let i=0;i<withMask.length;i+=4){
    if(withMask[i]!==withoutMask[i]||withMask[i+1]!==withoutMask[i+1]||
     withMask[i+2]!==withoutMask[i+2]||withMask[i+3]!==withoutMask[i+3])count++;
   }
   return count;
  },sample);
  assert.ok(difference>20,'back mask must change actual composite pixels, not just its UI preview');
  await page.locator('#rig-mask-more').click();
  await page.locator('#rig-mask-target-list input[value="handwear"]').check();
  const multiple=await page.evaluate(({source})=>{
   const m=window.PaperchalkPartRigStudio.state.model;
   return m.occlusionMasks.find(e=>e.source===source&&e.direction==='behind')?.targets||[];
  },sample);
  assert.ok(multiple.includes('neck')&&multiple.includes('handwear'),
    'one mask must apply against multiple target ArtMeshes');
  await page.locator('#rig-mask-toggle').click();
  assert.equal(await page.evaluate(()=>window.characterEditor.S.tool),'select');
  await page.locator('#btnSave').click();
  await page.waitForFunction(async()=>{
   const rig=await window.PaperchalkStudio.readPartRig('male2','front');
   return rig?.occlusionMasks?.some(m=>m.source==='topwear'&&
    m.direction==='behind'&&m.targets?.includes('neck')&&m.targets?.includes('handwear')&&
    m.png?.startsWith('data:image/png;base64,'));
  },null,{timeout:25000});
  const after=await page.evaluate(id=>
   window.characterEditor.S.layers.front.find(p=>p.partId===id).canvas.toDataURL(),sample.source);
  assert.equal(after,original,'original cut PSD pixels untouched');
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
    window.PaperchalkPartRigStudio.state.model?.occlusionMasks?.some(m=>
     m.source==='topwear'&&m.direction==='behind'&&m.targets?.length===2),
    null,{timeout:45000});
  assert.deepEqual(errors,[]);
  console.log('PASS bidirectional behind-neck mask, multi-target, live Z composite, safe Select, source fidelity, save/reload; changed pixels:',difference);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
