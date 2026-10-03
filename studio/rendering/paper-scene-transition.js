/**
 * A screen-space paper handoff used when the player enters or leaves transit.
 *
 * The effect deliberately lives above the WebGL canvas, but is not a UI panel:
 * it contains no text, captures no pointer events, and is hidden from the
 * accessibility tree.  The outgoing paper card slips down while a fresh card
 * grows from the centre crease and takes over the frame.  Keeping the effect
 * here makes it reusable for buses, subways, interiors, and any future scene
 * handoff without coupling it to the explorer controls.
 */

const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
const smoothstep=value=>{const t=clamp01(value);return t*t*(3-2*t);};

function makeElement(documentRef,tag,className){
  const element=documentRef.createElement(tag);
  element.className=className;
  return element;
}

/**
 * Create an inert, canvas-sized paper transition.
 *
 * `update(dt)` is intentionally pull-driven by the render loop.  This keeps
 * the animation paused with the game and avoids a second requestAnimationFrame
 * competing with the renderer.  `start` returns a promise that resolves after
 * the handoff has finished; the midpoint callback runs once when the new paper
 * reaches the centre seam.
 */
export function createPaperSceneTransition({container,documentRef=globalThis.document,duration=1080,reducedMotion}={}){
  if(!container||!documentRef?.createElement){
    return {start:()=>Promise.resolve(false),update:()=>false,isActive:()=>false,getState:()=>({active:false}),dispose:()=>{}};
  }

  const root=makeElement(documentRef,'div','paper-scene-transition');
  root.setAttribute('aria-hidden','true');
  root.setAttribute('role','presentation');
  Object.assign(root.style,{position:'absolute',inset:'0',overflow:'hidden',pointerEvents:'none',
    zIndex:'8',display:'none',contain:'strict',isolation:'isolate'});
  const oldSheet=makeElement(documentRef,'div','paper-scene-transition__old');
  const newSheet=makeElement(documentRef,'div','paper-scene-transition__new');
  const oldGrain=makeElement(documentRef,'div','paper-scene-transition__grain');
  const newGrain=makeElement(documentRef,'div','paper-scene-transition__grain');
  const crease=makeElement(documentRef,'div','paper-scene-transition__crease');
  const shadow=makeElement(documentRef,'div','paper-scene-transition__shadow');
  root.append(oldSheet,newSheet,oldGrain,newGrain,shadow,crease);
  container.appendChild(root);

  const styleDefaults={
    old:{position:'absolute',inset:'-7% -4%',background:'linear-gradient(145deg,#eadbbf 0%,#f9efda 45%,#d8c7a9 100%)',
      boxShadow:'0 18px 30px rgba(45,46,38,.20)',transformOrigin:'50% 50%',willChange:'transform'},
    fresh:{position:'absolute',inset:'-7% -4%',background:'linear-gradient(145deg,#f8ebcd 0%,#fff8e8 45%,#dfcda9 100%)',
      boxShadow:'0 -16px 30px rgba(45,46,38,.16)',transformOrigin:'50% 50%',willChange:'transform',clipPath:'polygon(0 50%,100% 50%,100% 50%,0 50%)'},
    grain:{position:'absolute',inset:'-20%',opacity:'.16',mixBlendMode:'multiply',pointerEvents:'none',
      backgroundImage:'repeating-linear-gradient(103deg,rgba(87,65,39,.16) 0 1px,transparent 1px 7px),repeating-linear-gradient(17deg,rgba(255,255,255,.20) 0 1px,transparent 1px 11px)',backgroundSize:'97px 83px,131px 107px',willChange:'transform,opacity'},
    crease:{position:'absolute',left:'-4%',right:'-4%',top:'50%',height:'2px',background:'linear-gradient(90deg,transparent,#8f7d61aa 25%,#fff8df 50%,#8f7d61aa 75%,transparent)',opacity:'0',transform:'translateY(-1px)',willChange:'opacity'},
    shadow:{position:'absolute',left:'-5%',right:'-5%',top:'50%',height:'20%',background:'radial-gradient(ellipse at center,rgba(47,44,35,.20),transparent 68%)',opacity:'0',filter:'blur(8px)',willChange:'opacity,transform'}
  };
  for(const [key,styles] of Object.entries(styleDefaults)){
    const target=key==='old'?oldSheet:key==='fresh'?newSheet:key==='crease'?crease:key==='shadow'?shadow:null;
    if(target)Object.assign(target.style,styles);
    else{Object.assign(oldGrain.style,styles);Object.assign(newGrain.style,styles);}
  }
  oldGrain.style.opacity='0';newGrain.style.opacity='0';
  oldGrain.style.zIndex='2';newGrain.style.zIndex='4';oldSheet.style.zIndex='1';newSheet.style.zIndex='3';shadow.style.zIndex='5';crease.style.zIndex='6';

  const motionReduced=reducedMotion??!!documentRef.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  let active=false,elapsed=0,totalDuration=Math.max(1,Number(duration)||1080),midpoint=false,resolveCurrent=null;
  let direction='up',palette='metro';

  function applyPalette(kind){
    palette=kind==='bus'?'bus':'metro';
    if(palette==='bus'){
      oldSheet.style.background='linear-gradient(145deg,#d9ead0 0%,#f4f2d4 45%,#b9d0b6 100%)';
      newSheet.style.background='linear-gradient(145deg,#e3f0d8 0%,#fffbe7 45%,#bfd6bf 100%)';
    }else{
      oldSheet.style.background='linear-gradient(145deg,#d5e0df 0%,#f2eee0 46%,#b4c4c2 100%)';
      newSheet.style.background='linear-gradient(145deg,#dcecea 0%,#fff6de 46%,#b9cfca 100%)';
    }
  }

  function render(progress){
    const p=clamp01(progress),e=smoothstep(p);
    // The outgoing card drops away, with a tiny hand-cut skew at the crease.
    const drop=(e*112).toFixed(3);
    const tilt=((direction==='down'?-1:1)*(1-e)*.8).toFixed(3);
    oldSheet.style.transform=`translate3d(0,${drop}%,0) rotate(${tilt}deg)`;
    oldGrain.style.transform=`translate3d(0,${drop*.82}%,0) rotate(${tilt}deg)`;
    oldGrain.style.opacity=String(Math.max(0,.20*(1-e)));
    // The incoming card starts as a pinched centre strip then expands upward
    // and downward.  It rises a few percent while the fold opens.
    const reveal=smoothstep(Math.min(1,p*2.02));
    const half=(50-reveal*50).toFixed(3);
    newSheet.style.clipPath=`polygon(0 ${half}%,100% ${half}%,100% ${(100-half)}%,0 ${(100-half)}%)`;
    newSheet.style.transform=`translate3d(0,${((1-reveal)*26).toFixed(3)}%,0) rotate(${((1-reveal)*tilt*.55).toFixed(3)}deg)`;
    newGrain.style.clipPath=newSheet.style.clipPath;
    newGrain.style.transform=newSheet.style.transform;
    newGrain.style.opacity=String(.12+.12*reveal);
    crease.style.opacity=String(p<.7?Math.min(1,p*3)*(1-p*.55):0);
    shadow.style.opacity=String(p<.65?Math.min(1,p*3)*.65:Math.max(0,(1-p)*.65));
    shadow.style.transform=`translateY(${((.5-reveal)*20).toFixed(2)}%) scaleX(${(1+reveal*.2).toFixed(3)})`;
  }

  function start({kind='metro',onMidpoint,onComplete}={}){
    if(active&&resolveCurrent){resolveCurrent(false);resolveCurrent=null;}
    direction=kind==='surface'?'down':'up';applyPalette(kind);elapsed=0;midpoint=false;active=true;
    totalDuration=motionReduced?1:Math.max(220,Number(duration)||1080);
    root.style.display='block';render(0);
    return new Promise(resolve=>{resolveCurrent=resolve;root.__midpoint=onMidpoint;root.__complete=onComplete;});
  }

  function update(dt){
    if(!active)return false;
    elapsed+=Math.max(0,Math.min(.1,Number(dt)||0))*1000;
    const p=clamp01(elapsed/totalDuration);render(p);
    if(!midpoint&&p>=.5){midpoint=true;try{root.__midpoint?.();}catch(error){queueMicrotask(()=>{throw error;});}}
    if(p>=1){
      active=false;root.style.display='none';root.__complete?.();
      const resolve=resolveCurrent;resolveCurrent=null;resolve?.(true);return true;
    }
    return true;
  }

  function cancel(){
    if(!active)return false;
    active=false;root.style.display='none';render(1);const resolve=resolveCurrent;resolveCurrent=null;resolve?.(false);return true;
  }
  function getState(){return {active,elapsed,duration:totalDuration,progress:clamp01(elapsed/totalDuration),kind:palette};}
  function dispose(){cancel();root.remove();}
  return {start,update,cancel,isActive:()=>active,getState,dispose,element:root};
}

export {clamp01 as clampTransitionProgress,smoothstep as transitionSmoothstep};
