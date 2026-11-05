/* Browser proof: free-painted per-part Z masks survive save/reload and
 * alter real ArtMesh output without modifying any original source bitmap. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1380,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8134/character-editor/?character=protagonist&side=front',
    {waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active&&
   window.PaperchalkStudio?.current==='protagonist'&&
   window.PaperchalkPartRigStudio.state.model?.parts?.rear_hair,
   null,{timeout:45000});
  assert.ok(await page.locator('#rig-mask-panel').isVisible());
  // Find an actually overlapping source/target pair in the final skinned
  // compositor. Avoid assumptions about PNG crops or transparent padding.
  const sample=await page.evaluate(()=>{
   const st=window.PaperchalkPartRigStudio.state,core=window.PaperchalkPartRigCore,
    S=window.characterEditor.S,m=st.model,all=S.layers.front;
   const pairs=[['rear_hair','jacket'],['sleeves_and_hands','jacket'],
    ['face','front_hair'],['legs','skirt']];
   const preview=(id)=>{
    const c=document.createElement('canvas');c.width=c.height=1024;
    core.draw(c.getContext('2d'),all.filter(p=>p.partId===id),m,st.phase);
    return c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,1024,1024).data;
   };
   for(const [source,target] of pairs){
    if(!m.parts[source]||!m.parts[target])continue;
    if(m.layerOrder.indexOf(source)>=m.layerOrder.indexOf(target))continue;
    const a=preview(source),b=preview(target);
    let choice=null,score=0;
    for(let y=80;y<950;y+=3)for(let x=80;x<950;x+=3){
     const i=(y*1024+x)*4;
     if(a[i+3]<140||b[i+3]<140)continue;
     const contrast=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+
      Math.abs(a[i+2]-b[i+2]);
     const pos={x:S.px+x*S.zoom,y:S.py+y*S.zoom};
     const view=document.getElementById('stage');
     if(pos.x<105||pos.x>view.clientWidth-130||pos.y<50||pos.y>view.clientHeight-40)continue;
     if(contrast>score){score=contrast;choice={source,target,x,y,contrast};}
    }
    if(choice&&score>25)return choice;
   }
   return null;
  });
  assert.ok(sample,'need visible overlap for mask occlusion test');
  await page.locator('#rig-part').selectOption(sample.source);
  await page.locator('#rig-mask-target').selectOption(sample.target);
  assert.equal(await page.evaluate(()=>window.characterEditor.S.tool),'pan');
  const original=await page.evaluate(id=>
   window.characterEditor.S.layers.front.find(p=>p.partId===id).canvas.toDataURL(),
   sample.source);
  await page.locator('#rig-mask-size').fill('96');
  await page.locator('#rig-mask-paint').click();
  assert.equal(await page.evaluate(()=>window.characterEditor.S.tool),'mask');
  const coords=await page.evaluate(({x,y})=>{
   const s=window.characterEditor.S,b=document.getElementById('stage').getBoundingClientRect();
   return {x:b.x+s.px+x*s.zoom,y:b.y+s.py+y*s.zoom};
  },sample);
  await page.mouse.click(coords.x,coords.y);
  const painted=await page.evaluate(({source,target})=>{
   const m=window.PaperchalkPartRigStudio.state.model,
    mask=m.occlusionMasks?.find(x=>x.source===source&&x.target===target);
   if(!mask)return null;
   const c=mask._canvas,bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let pixels=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>0)pixels++;
   return {pixels,png:mask.png?.slice(0,22)};
  },sample);
  assert.ok(painted?.pixels>50,'manual mask brush must paint real foreground alpha');
  assert.equal(painted.png,'data:image/png;base64,');
  const diff=await page.evaluate(({source,target})=>{
   const st=window.PaperchalkPartRigStudio.state,S=window.characterEditor.S,
    core=window.PaperchalkPartRigCore,m=st.model,entries=m.occlusionMasks;
   const render=()=>{
    const c=document.createElement('canvas');c.width=c.height=1024;
    const ctx=c.getContext('2d',{willReadFrequently:true});
    core.draw(ctx,S.layers.front,m,st.phase);
    return ctx.getImageData(0,0,1024,1024).data;
   };
   const withMask=render();
   m.occlusionMasks=entries.filter(x=>x.source!==source||x.target!==target);
   const without=render();m.occlusionMasks=entries;
   let changed=0;
   for(let i=0;i<withMask.length;i+=4){
    if(withMask[i]!==without[i]||withMask[i+1]!==without[i+1]||
     withMask[i+2]!==without[i+2]||withMask[i+3]!==without[i+3])changed++;
   }
   return changed;
  },sample);
  assert.ok(diff>0,'manual mask must change actual ArtMesh Z compositing');
  await page.locator('#rig-mask-undo').click();
  const erased=await page.evaluate(({source,target})=>{
   const m=window.PaperchalkPartRigStudio.state.model.occlusionMasks
    .find(m=>m.source===source&&m.target===target);
   const p=m._canvas.getContext('2d').getImageData(0,0,m._canvas.width,m._canvas.height).data;
   let nonempty=0;for(let i=3;i<p.length;i+=4)if(p[i])nonempty++;
   return nonempty;
  },sample);
  assert.equal(erased,0,'mask undo restores previous alpha');
  await page.mouse.click(coords.x,coords.y);
  await page.locator('#rig-mask-toggle').click();
  await page.locator('#btnSave').click();
  await page.waitForFunction(async ({source,target})=>{
   const stored=await window.PaperchalkStudio.readPartRig('protagonist','front');
   return stored?.occlusionMasks?.some(m=>m.source===source&&m.target===target&&
    m.png?.startsWith('data:image/png;base64,'));
  },sample,{timeout:25000});
  const unchanged=await page.evaluate(id=>
   window.characterEditor.S.layers.front.find(p=>p.partId===id).canvas.toDataURL(),
   sample.source);
  assert.equal(unchanged,original,'painting mask never edits source PSD art');
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>window.PaperchalkPartRigStudio?.state?.active,
   null,{timeout:45000});
  assert.ok(await page.evaluate(({source,target})=>
   window.PaperchalkPartRigStudio.state.model.occlusionMasks?.some(m=>
    m.source===source&&m.target===target&&m.png?.startsWith('data:image/png;base64,')),
   sample),'saved mask must survive reload');
  assert.deepEqual(errors,[],'page javascript errors');
  console.log('PASS per-part mask drawing / real occlusion / undo / source preservation / save-reload',sample,diff);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
