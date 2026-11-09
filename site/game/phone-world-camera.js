/* Paperchalk World — in-world phone viewfinder, NEVER a device camera.
 * Samples the active game scene's visual layers, not OS camera, tab video,
 * player face, phone UI or developer interface. Shared by Photo and Live.
 * Perspective/scene renderer remains the authority for visible pixels.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.PaperWorldPhoneWorldCamera=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,Number(n)||0));
  function cropFor(sourceWidth,sourceHeight,targetWidth,targetHeight,zoom=1,aimX=0,aimY=0){
    const sw=Math.max(1,sourceWidth),sh=Math.max(1,sourceHeight);
    const tw=Math.max(1,targetWidth),th=Math.max(1,targetHeight);
    const scale=Math.min(sw/tw,sh/th)/clamp(zoom,1,3);
    const w=tw*scale,h=th*scale;
    const x=clamp((sw-w)/2+clamp(aimX,-1,1)*(sw-w)/2,0,sw-w);
    const y=clamp((sh-h)/2+clamp(aimY,-1,1)*(sh-h)/2,0,sh-h);
    return Object.freeze({x,y,width:w,height:h});
  }
  function readable(node){
    if(!node||node.hidden||node.closest('[hidden],#novel-ui,#dev-tools,#pw-world-surface,#ring-arena-controls'))return false;
    const style=getComputedStyle(node),rect=node.getBoundingClientRect();
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&
      rect.width>1&&rect.height>1;
  }
  function copyVisual(ctx,node,viewport){
    if(!readable(node))return false;
    const r=node.getBoundingClientRect();
    const dx=r.left-viewport.left,dy=r.top-viewport.top;
    const visible=dx<viewport.width&&dy<viewport.height&&dx+r.width>0&&dy+r.height>0;
    if(!visible)return false;
    if(node instanceof HTMLImageElement){
      if(!node.complete||!node.naturalWidth)return false;
    }else if(node instanceof HTMLCanvasElement){
      if(!node.width||!node.height)return false;
    }else return false;
    const style=getComputedStyle(node),mode=style.objectFit;
    let x=dx,y=dy,w=r.width,h=r.height;
    if(node instanceof HTMLImageElement&&(mode==='contain'||mode==='scale-down')){
      const ratio=Math.min(r.width/node.naturalWidth,r.height/node.naturalHeight);
      w=node.naturalWidth*ratio;h=node.naturalHeight*ratio;
      x+=(r.width-w)/2;y+=(r.height-h)/2;
    }
    try{
      ctx.save();
      ctx.globalAlpha=clamp(parseFloat(style.opacity)||1,0,1);
      ctx.drawImage(node,x,y,w,h);
      ctx.restore();
      return true;
    }catch(_){ctx.restore();return false}
  }
  function create({canvas,view=null,phone=null,getWorld=null,onFrame=null}={}){
    if(!canvas||typeof canvas.getContext!=='function')throw TypeError('Canvas required');
    const gameView=view||document.getElementById('view');
    const ctx=canvas.getContext('2d',{alpha:false});
    const buffer=document.createElement('canvas');
    const bufferCtx=buffer.getContext('2d',{alpha:false});
    let enabled=false,frameId=0,aimX=0,aimY=0,zoom=1,frames=0;
    let lastAt=0,crop=null,frameObjects=[];
    const identity=()=>typeof getWorld==='function'?getWorld()||{}:{};
    function update(){
      if(!gameView||!ctx)return false;
      const vr=gameView.getBoundingClientRect();
      if(vr.width<1||vr.height<1)return false;
      // Render in viewport pixel space; only game-world drawing surfaces
      // are sampled. HTML controls and device camera feeds are excluded.
      const fullW=Math.max(1,Math.min(1280,Math.round(vr.width)));
      const fullH=Math.max(1,Math.min(720,Math.round(vr.height)));
      if(buffer.width!==fullW||buffer.height!==fullH){buffer.width=fullW;buffer.height=fullH;}
      bufferCtx.setTransform(fullW/vr.width,0,0,fullH/vr.height,0,0);
      bufferCtx.fillStyle='#08090c';bufferCtx.fillRect(0,0,vr.width,vr.height);
      // Scene first; world-space character, effects and environment after.
      const nodes=[...gameView.querySelectorAll(
        '#scene img,#scene canvas,#enemy-depth-root img,#enemy-depth-root canvas,'+
        '.room-extra-enemy img,.room-extra-enemy canvas,'+
        '#camera-player-root img,#camera-player-root canvas,'+
        '#overworld-city-stage img,#overworld-city-stage canvas,'+
        '#pw-metro-cabin canvas,#pw-metro-cabin img,'+
        '#pw-transit-scene img,#pw-transit-scene canvas,'+
        '#fog,#ui-edge-fog'
      )];
      // If the active scene is rendered by an independent WebGL canvas,
      // its pixels are copied here alongside the illustrated 2.5D layers.
      const sceneCanvas=document.getElementById('ring-arena-canvas');
      if(sceneCanvas&&!nodes.includes(sceneCanvas))nodes.push(sceneCanvas);
      // Place city images above base scene and fog in the correct pass.
      nodes.sort((a,b)=>{
        const depth=n=>{
          if(n.id==='source')return 0;
          if(n.id==='ring-arena-canvas')return 1;
          if(n.closest('#enemy-depth-root,.room-extra-enemy'))return 2;
          if(n.closest('#overworld-city-stage,#pw-metro-cabin,#pw-transit-scene'))return 3;
          if(n.id==='fog'||n.id==='ui-edge-fog')return 4;
          if(n.closest('#camera-player-root'))return 5;
          return 2;
        };
        return depth(a)-depth(b);
      });
      let painted=0;
      for(const node of nodes)if(copyVisual(bufferCtx,node,vr))painted++;
      const phys=phone?.getBoundingClientRect?.();
      // Moving the handset across the full game viewport changes the
      // optical center; dragging inside the viewfinder refines the aim.
      const relativeX=phys?clamp((phys.left+phys.width/2-vr.left)/vr.width*2-1,-1,1):0;
      const relativeY=phys?clamp((phys.top+phys.height/2-vr.top)/vr.height*2-1,-1,1):0;
      const ax=clamp(relativeX*.62+aimX,-1,1);
      const ay=clamp(relativeY*.35+aimY,-1,1);
      const sourceCrop=cropFor(fullW,fullH,canvas.width,canvas.height,zoom,ax,ay);
      crop=sourceCrop;
      ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#070809';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(buffer,sourceCrop.x,sourceCrop.y,
        sourceCrop.width,sourceCrop.height,0,0,canvas.width,canvas.height);
      // Optional in-world identity detection: strictly from visible, authored
      // capture hotspots, never from the entire NPC roster at this location.
      frameObjects=[];
      const bounds=(node)=>{
        const r=node.getBoundingClientRect();
        return {x:(r.left-vr.left)*fullW/vr.width,y:(r.top-vr.top)*fullH/vr.height,
          width:r.width*fullW/vr.width,height:r.height*fullH/vr.height};
      };
      for(const node of gameView.querySelectorAll('[data-capture-id]')){
        if(!readable(node))continue;
        const r=bounds(node);
        const intersect=r.x<crop.x+crop.width&&r.y<crop.y+crop.height&&
          r.x+r.width>crop.x&&r.y+r.height>crop.y;
        if(intersect)frameObjects.push({
          id:String(node.dataset.captureId).slice(0,70),
          kind:String(node.dataset.captureKind||'object').slice(0,30)
        });
      }
      frames++;onFrame?.({painted,frames,location:identity().location||null});
      return painted>0;
    }
    function tick(now){
      if(!enabled)return;
      if(now-lastAt>=66){update();lastAt=now;}
      frameId=requestAnimationFrame(tick);
    }
    function start(){if(enabled)return;enabled=true;update();frameId=requestAnimationFrame(tick);}
    function stop(){enabled=false;if(frameId)cancelAnimationFrame(frameId);frameId=0;}
    function move(dx,dy){aimX=clamp(aimX+dx,-1,1);aimY=clamp(aimY+dy,-1,1);update();}
    function setZoom(value){zoom=clamp(value,1,3);update();}
    function shot(){
      if(!update())return {ok:false,reason:'当前场景画面尚未就绪'};
      const w=identity();
      // Keep saved photos small enough for the existing persistent gallery.
      const out=document.createElement('canvas');
      out.width=320;out.height=480;
      out.getContext('2d').drawImage(canvas,0,0,out.width,out.height);
      return {ok:true,data:out.toDataURL('image/jpeg',.53),
        meta:{kind:'game-scene',scene:document.getElementById('scene')?.dataset.scene||'',
          location:String(w.location||'').slice(0,90),
          aim:{x:Math.round(aimX*100)/100,y:Math.round(aimY*100)/100,zoom},
          subjects:frameObjects.slice(0,12)}};
    }
    return Object.freeze({start,stop,move,setZoom,shot,update,
      snapshot:()=>({active:enabled,frames,aimX,aimY,zoom,crop,subjects:[...frameObjects]})});
  }
  return Object.freeze({create,cropFor});
});
