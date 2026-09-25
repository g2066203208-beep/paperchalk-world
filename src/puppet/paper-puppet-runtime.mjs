/*
 * Paperchalk layered puppet runtime
 * Architecture inspired by the MIT-licensed Auto-live2D-beta / Anime2.5DRig browser workflow.
 * This file is an independent Pixi 8 adapter for Paperchalk World.
 */

const ROLE_DEFAULTS=Object.freeze({
  whole:{z:20,follow:0},
  backHair:{z:2,follow:.58,spring:.72},
  backhair:{z:2,follow:.58,spring:.72},
  bottomwear:{z:8,follow:.18,spring:.42},
  skirt:{z:8,follow:.18,spring:.46},
  legLeft:{z:9,follow:.12,spring:.22},
  legRight:{z:10,follow:.12,spring:.22},
  legwear:{z:9,follow:.12,spring:.22},
  neck:{z:11,follow:.48},
  topwear:{z:12,follow:.22,spring:.28},
  body:{z:12,follow:.22,spring:.28},
  handwear:{z:13,follow:.26,spring:.24},
  arms:{z:13,follow:.26,spring:.24},
  ears:{z:18,follow:.78},
  earwear:{z:19,follow:.82,spring:.40},
  face:{z:20,follow:1},
  eyes:{z:22,follow:1},
  eyewhite:{z:22,follow:1},
  irides:{z:23,follow:1},
  eyelash:{z:24,follow:1},
  eyebrow:{z:25,follow:1},
  mouth:{z:25,follow:1},
  nose:{z:25,follow:1},
  headwear:{z:28,follow:.90,spring:.34},
  frontHair:{z:30,follow:.78,spring:.88},
  fronthair:{z:30,follow:.78,spring:.88},
  sideHair:{z:29,follow:.72,spring:.84},
  midHair:{z:29,follow:.74,spring:.80},
  ahoge:{z:31,follow:.86,spring:1.0},
  neckwear:{z:26,follow:.45,spring:.76}
});

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function num(v,fallback=0){v=Number(v);return Number.isFinite(v)?v:fallback}
function pair(v,fallback=[0,0]){return Array.isArray(v)&&v.length>=2?[num(v[0]),num(v[1])]:fallback}
function roleKey(v){return String(v||'whole').replace(/[\s_-]+/g,'').toLowerCase()}
function roleInfo(role){
  const key=roleKey(role);
  if(key==='fronthair')return ROLE_DEFAULTS.frontHair;
  if(key==='backhair')return ROLE_DEFAULTS.backHair;
  if(key==='sidehair')return ROLE_DEFAULTS.sideHair;
  if(key==='midhair')return ROLE_DEFAULTS.midHair;
  if(key==='legleft')return ROLE_DEFAULTS.legLeft;
  if(key==='legright')return ROLE_DEFAULTS.legRight;
  return ROLE_DEFAULTS[key]||ROLE_DEFAULTS.whole;
}
function expFollow(current,target,dt,sharpness){
  const k=1-Math.exp(-Math.max(0,sharpness)*Math.max(0,dt));
  return current+(target-current)*k;
}
class Spring1D{
  constructor(value=0){this.x=value;this.v=0}
  step(target,dt,frequency=8,damping=.78){
    dt=Math.min(.05,Math.max(0,dt||0));
    const w=Math.max(.01,frequency)*Math.PI*2;
    const a=(target-this.x)*w*w-2*damping*w*this.v;
    this.v+=a*dt;
    this.x+=this.v*dt;
    return this.x;
  }
  snap(v=0){this.x=v;this.v=0}
}
async function fetchManifest(url){
  const res=await fetch(url,{cache:'no-cache'});
  if(!res.ok)throw new Error('PUPPET_MANIFEST_'+res.status);
  const data=await res.json();
  if(!data||Number(data.version)!==1)throw new Error('PUPPET_MANIFEST_VERSION');
  return data;
}
function safeAction(meta,action){
  const cards=meta.actionCards||{};
  return cards[action]||cards.idle||Object.values(cards)[0]||null;
}

class CardPuppet{
  constructor({Container,Sprite},manifest,textures){
    this.kind='card';
    this.manifest=manifest;
    this.textures=textures;
    this.root=new Container();
    this.root.eventMode='none';
    this.root.interactiveChildren=false;
    this.sprite=new Sprite(textures.idle||Object.values(textures)[0]);
    this.sprite.anchor.set(.5,1);
    this.root.addChild(this.sprite);
    this.action='idle';
    this.sourceFacing=1;
    this.scaleSpring=new Spring1D(1);
    this.rotSpring=new Spring1D(0);
    this.xSpring=new Spring1D(0);
    this.ySpring=new Spring1D(0);
    this.currentScale=1;
    this.baseFitX=1;
    this.baseFitY=1;
    const display=manifest.displaySize||manifest.designSize||{};
    this.displayW=Math.max(1,num(display.w,104));
    this.displayH=Math.max(1,num(display.h,156));
    this.stats={layers:1,mode:'card',action:'idle',displayW:this.displayW,displayH:this.displayH};
    this._applyCard('idle',true);
  }
  _applyCard(action,snap=false){
    const card=safeAction(this.manifest,action);
    if(!card)return;
    const tex=this.textures[action]||this.textures.idle||Object.values(this.textures)[0];
    if(tex&&this.sprite.texture!==tex)this.sprite.texture=tex;
    if(tex){
      this.baseFitX=this.displayW/Math.max(1,num(tex.width,1));
      this.baseFitY=this.displayH/Math.max(1,num(tex.height,1));
    }
    this.action=action;
    this.sourceFacing=num(card.sourceFacing,1)<0?-1:1;
    const target=Math.max(.2,num(card.scale,1));
    if(snap){
      this.scaleSpring.snap(target);
      this.currentScale=target;
    }
    this.targetScale=target;
    this.stats.action=action;
  }
  setAction(action){
    if(action!==this.action)this._applyCard(action,false);
  }
  setDisplaySize(w,h){
    w=Math.max(1,num(w,this.displayW));
    h=Math.max(1,num(h,this.displayH));
    if(Math.abs(w-this.displayW)<.01&&Math.abs(h-this.displayH)<.01)return;
    this.displayW=w;this.displayH=h;
    const tex=this.sprite.texture;
    if(tex){
      this.baseFitX=this.displayW/Math.max(1,num(tex.width,1));
      this.baseFitY=this.displayH/Math.max(1,num(tex.height,1));
    }
    this.stats.displayW=this.displayW*this.currentScale;
    this.stats.displayH=this.displayH*this.currentScale;
  }
  update(state,dt,now){
    this.setAction(state.action||'idle');
    const t=(now||performance.now())*.001;
    const moving=!!state.moving&&!!state.grounded;
    const crouch=state.action==='crouch';
    const air=!state.grounded;
    const walkPhase=t*10.5;
    let targetRot=0,targetX=0,targetY=0;
    if(moving){
      targetRot=Math.sin(walkPhase*.5)*.010;
      targetY=-1.3*(.5+.5*Math.sin(walkPhase));
      targetX=Math.sin(walkPhase)*.35;
    }else if(!air&&!crouch){
      targetRot=Math.sin(t*1.35)*.0022;
      targetY=-.5*(.5+.5*Math.sin(t*1.85));
    }else if(crouch&&!air){
      targetY=-.25*(.5+.5*Math.sin(t*2.0));
    }
    if(state.attacking){
      const p=clamp((.30-num(state.attackTimer,0))/.30,0,1);
      const s=Math.sin(p*Math.PI);
      targetX+=num(state.facing,1)*11*s;
      targetRot+=num(state.facing,1)*.12*s;
    }
    // Character-card scale must never overshoot: action swaps used to create a
    // visible size pop when a second-order spring crossed the target. Hair/skirt
    // retain spring dynamics, but whole-body card size uses critically calm,
    // monotonic exponential following.
    this.currentScale=expFollow(this.currentScale,this.targetScale,dt,13.5);
    this.scaleSpring.snap(this.currentScale);
    this.sprite.scale.set(this.baseFitX*this.currentScale,this.baseFitY*this.currentScale);
    this.root.rotation=this.rotSpring.step(targetRot,dt,8.5,.84);
    this.root.x=this.xSpring.step(targetX,dt,10,.90);
    this.root.y=this.ySpring.step(targetY,dt,10,.92);
    this.stats.scale=this.currentScale;
    this.stats.targetScale=this.targetScale;
    this.stats.displayW=this.displayW*this.currentScale;
    this.stats.displayH=this.displayH*this.currentScale;
    return this.stats;
  }
  destroy(){this.root.destroy({children:true})}
}

class LayeredPuppet{
  constructor({Container,Sprite},manifest,loadedLayers){
    this.kind='layered';
    this.manifest=manifest;
    this.root=new Container();
    this.root.eventMode='none';
    this.root.interactiveChildren=false;
    this.layers=[];
    this.action='idle';
    this.headSpring=new Spring1D(0);
    this.hairSpring=new Spring1D(0);
    this.skirtSpring=new Spring1D(0);
    this.neckwearSpring=new Spring1D(0);
    this.bustXSpring=new Spring1D(0);
    this.bustYSpring=new Spring1D(0);
    this.scaleSpring=new Spring1D(1);
    for(const item of loadedLayers){
      const cfg=item.cfg;
      const wrapper=new Container();
      const sprite=new Sprite(item.texture);
      const anchor=pair(cfg.anchor,[.5,1]);
      sprite.anchor.set(anchor[0],anchor[1]);
      const offset=pair(cfg.offset,[0,0]);
      wrapper.position.set(offset[0],offset[1]);
      const baseScale=pair(cfg.scale,[1,1]);
      sprite.scale.set(baseScale[0],baseScale[1]);
      wrapper.addChild(sprite);
      const info=roleInfo(cfg.role);
      wrapper.zIndex=num(cfg.z,info.z);
      this.root.addChild(wrapper);
      this.layers.push({
        id:cfg.id||cfg.role||('layer-'+this.layers.length),
        role:cfg.role||'whole',key:roleKey(cfg.role),
        cfg,wrapper,sprite,info,baseScale,
        baseX:offset[0],baseY:offset[1],baseRot:num(cfg.rotation,0)
      });
    }
    this.root.sortableChildren=true;
    this.root.sortChildren();
    const design=manifest.designSize||{};
    const display=manifest.displaySize||design;
    this.designW=Math.max(1,num(design.w,display.w||104));
    this.designH=Math.max(1,num(design.h,display.h||156));
    this.displayW=Math.max(1,num(display.w,this.designW));
    this.displayH=Math.max(1,num(display.h,this.designH));
    this.root.scale.set(this.displayW/this.designW,this.displayH/this.designH);
    this.stats={layers:this.layers.length,mode:'layered',action:'idle',displayW:this.displayW,displayH:this.displayH};
  }
  setAction(action){this.action=action||'idle';this.stats.action=this.action}
  setDisplaySize(w,h){
    this.displayW=Math.max(1,num(w,this.displayW));
    this.displayH=Math.max(1,num(h,this.displayH));
    this.root.scale.set(this.displayW/this.designW,this.displayH/this.designH);
    this.stats.displayW=this.displayW;
    this.stats.displayH=this.displayH;
  }
  update(state,dt,now){
    this.setAction(state.action);
    const t=(now||performance.now())*.001;
    const moving=!!state.moving&&!!state.grounded;
    const facing=num(state.facing,1)>=0?1:-1;
    const walk=Math.sin(t*10.2);
    const walkAbs=.5+.5*Math.sin(t*10.2);
    const breath=.5+.5*Math.sin(t*1.75);
    const air=state.grounded?0:clamp(num(state.air,0)/180,0,1);
    const bodyTarget=moving?walk*.018:Math.sin(t*1.1)*.0025;
    const head=this.headSpring.step(-bodyTarget*.58,dt,6.8,.88);
    const hair=this.hairSpring.step(-bodyTarget*2.9-facing*num(state.vx,0)*.00032,dt,4.2,.62);
    const skirt=this.skirtSpring.step(-bodyTarget*2.2,dt,5.2,.70);
    const neckwear=this.neckwearSpring.step(-bodyTarget*2.7,dt,5.8,.66);
    const bustX=this.bustXSpring.step(bodyTarget*.85,dt,6.4,.58);
    const bustY=this.bustYSpring.step((breath-.5)*.012+(moving?(walkAbs-.5)*.008:0),dt,6.0,.62);
    const baseScale=this.scaleSpring.step(1,dt,10,.95);

    for(const layer of this.layers){
      const k=layer.key,follow=num(layer.info.follow,0);
      let rot=layer.baseRot+bodyTarget*follow;
      let x=layer.baseX,y=layer.baseY;
      let sx=layer.baseScale[0]*baseScale,sy=layer.baseScale[1]*baseScale;
      if(/face|eye|iris|lash|brow|mouth|nose|ear|headwear/.test(k)){
        rot+=head;
        y-=Math.abs(head)*2.2;
      }
      if(k.includes('hair')){
        const gain=num(layer.cfg.physicsGain,layer.info.spring||.7);
        rot+=hair*gain;
        x+=hair*15*gain;
      }
      if(k==='ahoge'){
        rot+=hair*1.25;
        x+=hair*18;
      }
      if(k.includes('skirt')||k==='bottomwear'){
        rot+=skirt*num(layer.cfg.physicsGain,.55);
        x+=skirt*7;
      }
      if(k==='neckwear'){
        rot+=neckwear*.8;
        x+=neckwear*8;
      }
      if(k==='topwear'||k==='body'){
        sx*=1+bustX*.10;
        sy*=1+bustY;
        y-=breath*.35;
      }
      if(k==='legleft')rot+=moving?walk*.045:0;
      if(k==='legright')rot-=moving?walk*.045:0;
      if(air)y-=air*num(layer.cfg.airLift,0);
      layer.wrapper.position.set(x,y);
      layer.wrapper.rotation=rot;
      layer.sprite.scale.set(sx,sy);
    }
    this.stats.head=head;this.stats.hair=hair;this.stats.skirt=skirt;
    return this.stats;
  }
  destroy(){this.root.destroy({children:true})}
}

async function loadCardPuppet(pixi,manifest){
  const cards=manifest.actionCards||{};
  const entries=await Promise.all(Object.entries(cards).map(async([name,cfg])=>{
    const src=typeof cfg==='string'?cfg:cfg?.src;
    if(!src)throw new Error('PUPPET_CARD_SRC_'+name);
    return [name,await pixi.Assets.load(src)];
  }));
  if(!entries.length)throw new Error('PUPPET_CARD_EMPTY');
  return new CardPuppet(pixi,manifest,Object.fromEntries(entries));
}
async function loadLayeredPuppet(pixi,manifest){
  const layers=Array.isArray(manifest.layers)?manifest.layers:[];
  if(!layers.length)throw new Error('PUPPET_LAYERS_EMPTY');
  const loaded=await Promise.all(layers.map(async cfg=>{
    if(!cfg?.src)throw new Error('PUPPET_LAYER_SRC');
    return {cfg,texture:await pixi.Assets.load(cfg.src)};
  }));
  return new LayeredPuppet(pixi,manifest,loaded);
}

export async function loadPaperPuppet(pixi,manifestUrl){
  if(!pixi?.Assets||!pixi?.Container||!pixi?.Sprite)throw new Error('PUPPET_PIXI_API');
  const manifest=await fetchManifest(manifestUrl);
  const kind=String(manifest.kind||'layered').toLowerCase();
  return kind==='card'?loadCardPuppet(pixi,manifest):loadLayeredPuppet(pixi,manifest);
}

export const PaperPuppetRoles=Object.freeze(Object.keys(ROLE_DEFAULTS));
