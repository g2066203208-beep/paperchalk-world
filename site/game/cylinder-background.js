/* Curved background surface for Paperchalk World.
 * Only replaces the final scene image's visible projection. Actors, fog, UI,
 * story and saved camera/ground settings remain owned by their existing code.
 * Ray/cylinder intersection is rendered as vertical image strips on one 2D
 * canvas; no 3D context, extra animation loop, or new image assets are needed.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PaperWorldCylinderBackground=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const FOV=78*Math.PI/180;
  const MAX_YAW=6*Math.PI/180;
  const MAX_PITCH=4.6*Math.PI/180;
  function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}
  // The ray intersects the inside of the cylinder at this wall azimuth.
  function projectU(screenX,yaw=0,fov=FOV){
    const angle=Math.atan((screenX*2-1)*Math.tan(fov/2));
    return .5+(angle+yaw)/fov;
  }
  function verticalFraction(screenX){
    const angle=Math.atan((screenX*2-1)*Math.tan(FOV/2));
    // Keep the already-approved 2D compositions recognisable. A full
    // cos(angle) factor makes their painted furniture stretch excessively.
    return 1-.35*(1-Math.cos(angle));
  }
  function create({stage,source}={}){
    if(!stage||!source)throw new Error('Cylinder needs #scene and #source');
    const canvas=document.createElement('canvas');
    canvas.className='scene-cylinder-surface';
    canvas.setAttribute('aria-hidden','true');
    canvas.hidden=true;
    source.insertAdjacentElement('afterend',canvas);
    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    let enabled=false,yaw=0,pitch=0,lastYaw=NaN,lastPitch=NaN;
    let imageIdentity='',width=0,height=0,ready=false,frames=0;
    function fallback(){
      ready=false;
      source.classList.remove('scene-cylinder-source-hidden');
      canvas.hidden=true;
      stage.dataset.backgroundSurface='flat-fallback';
    }
    function draw(force=false){
      if(!enabled||!ctx||!source.complete||!source.naturalWidth||
         !source.naturalHeight)return false;
      const cssW=stage.clientWidth,cssH=stage.clientHeight;
      if(cssW<=0||cssH<=0)return false;
      const id=source.currentSrc||source.src;
      const ratio=Math.min(2,window.devicePixelRatio||1,
        Math.sqrt(2073600/(cssW*cssH)));
      const w=Math.max(1,Math.round(cssW*ratio));
      const h=Math.max(1,Math.round(cssH*ratio));
      if(!force&&ready&&w===width&&h===height&&id===imageIdentity&&
         Math.abs(yaw-lastYaw)<.00012&&Math.abs(pitch-lastPitch)<.00012)
        return true;
      if(canvas.width!==w)canvas.width=w;
      if(canvas.height!==h)canvas.height=h;
      width=w;height=h;imageIdentity=id;lastYaw=yaw;lastPitch=pitch;
      try{
        ctx.clearRect(0,0,w,h);
        ctx.imageSmoothingEnabled=true;
        ctx.imageSmoothingQuality='medium';
      // Preserve object-fit:contain for non-16:9 artwork, including black bars.
      const sourceAspect=source.naturalWidth/source.naturalHeight;
      const frameAspect=w/h;
      const dw=sourceAspect>frameAspect?w:h*sourceAspect;
      const dh=sourceAspect>frameAspect?w/sourceAspect:h;
      const x0=(w-dw)/2,y0=(h-dh)/2;
      const step=3; // small strips: bounded CPU work, continuous curved surface
      for(let x=0;x<dw;x+=step){
        const strip=Math.min(step,dw-x);
        const u0=projectU(x/dw,yaw);
        const u1=projectU((x+strip)/dw,yaw);
        const sx=clamp(u0*source.naturalWidth,0,source.naturalWidth-1);
        const ex=clamp(u1*source.naturalWidth,0,source.naturalWidth);
        const sw=Math.max(.5,ex-sx);
        const f=verticalFraction((x+strip*.5)/dw);
        const shift=-(pitch/MAX_PITCH)*.067;
        const sy=source.naturalHeight*clamp((1-f)/2+shift,0,1-f);
        const sh=source.naturalHeight*f;
        ctx.drawImage(source,sx,sy,
          Math.min(sw,source.naturalWidth-sx),sh,
          x0+x,y0,strip+.35,dh);
        }
      }catch(_){
        // Never stop the existing black-fog/actor frame loop if the canvas
        // context is lost or a scene image becomes unavailable mid-frame.
        fallback();
        return false;
      }
      canvas.hidden=false;
      source.classList.add('scene-cylinder-source-hidden');
      stage.dataset.backgroundSurface='cylinder';
      frames++;ready=true;
      return true;
    }
    function setScene(name){
      enabled=name!=='menu';
      if(!enabled){fallback();return}
      fallback();
      draw(true);
    }
    function setView(x=0,y=0){
      const nextYaw=clamp(x,-1,1)*MAX_YAW;
      const nextPitch=clamp(y,-1,1)*MAX_PITCH;
      if(nextYaw===yaw&&nextPitch===pitch&&ready)return;
      yaw=nextYaw;pitch=nextPitch;
      draw();
    }
    source.addEventListener('load',()=>{if(enabled){fallback();draw(true)}});
    source.addEventListener('error',fallback);
    if(typeof ResizeObserver==='function'){
      const observer=new ResizeObserver(()=>draw(true));
      observer.observe(stage);
    }else window.addEventListener('resize',()=>draw(true),{passive:true});
    return Object.freeze({
      setScene,setView,refresh:()=>draw(true),
      inspect:()=>({enabled,ready,frames,width,height,
        yawDegrees:yaw*180/Math.PI,pitchDegrees:pitch*180/Math.PI,
        source:source.currentSrc||source.src})
    });
  }
  return Object.freeze({create,projectU,verticalFraction,FOV});
});
