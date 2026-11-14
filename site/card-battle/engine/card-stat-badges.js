/* Paperchalk: physical card-frame statistics.
 * 3D-attached badges, not a DOM/screen overlay. Every badge inherits the
 * exact card model matrix (position, perspective, attack, flip, entry/exit).
 * Draws dynamic unit statistics from the level state; never paints over source
 * character artwork files. Usable by any battlefield/level.
 */
(function(root){'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function create({gl,makeFace,renderGeom,mul,T,S,cardW,cardH,cardD}){
 if(!gl||!makeFace||!renderGeom||!mul||!T)throw Error('Card stat badges need WebGL face adapter');
 const width=.47,height=.51,face=makeFace(width,height,.095,0);
 // A little of the colored metal number plate protrudes from the two
 // lower card corners, as if it were riveted onto the physical white rim.
 const anchors=Object.freeze({
  attack:Object.freeze({x:-cardW*.5+.145,y:-cardH*.5+.19,z:cardD*.5+.024}),
  health:Object.freeze({x: cardW*.5-.145,y:-cardH*.5+.19,z:cardD*.5+.024})
 });
 const textures=new Map();
 const cacheLimit=64;
 const source=(kind,value,max)=>{
  const v=Math.max(0,Math.floor(Number(value)||0));
  const cap=Math.max(0,Math.floor(Number(max)||0));
  return kind==='health'?'h:'+v+':'+cap:'a:'+v;
 };
 function drawSurface(kind,value,max){
  const cv=document.createElement('canvas');cv.width=256;cv.height=256;
  const ctx=cv.getContext('2d');
  const critical=kind==='health'&&max>0&&value/max<=.30;
  const primary=kind==='attack'?'#54748a':critical?'#a54b47':'#aa665c';
  const deep=kind==='attack'?'#263d50':critical?'#5e272a':'#653b3b';
  ctx.shadowColor='#17191776';ctx.shadowBlur=8;ctx.shadowOffsetY=4;
  ctx.fillStyle=deep;
  ctx.beginPath();ctx.roundRect(10,8,236,239,48);ctx.fill();
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  const fill=ctx.createLinearGradient(0,10,0,241);
  fill.addColorStop(0,'#f3e4ca');fill.addColorStop(.085,primary);
  fill.addColorStop(.73,deep);fill.addColorStop(1,'#263e42');
  ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(18,16,220,222,40);ctx.fill();
  ctx.strokeStyle='#f4e8ce';ctx.lineWidth=9;ctx.stroke();
  ctx.strokeStyle='#dbcba6a6';ctx.lineWidth=2;ctx.beginPath();
  ctx.roundRect(30,27,196,202,30);ctx.stroke();
  // Engraved icon sits above the numeric counter, not on the portrait.
  ctx.fillStyle='#f8efd7';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='bold 36px system-ui,"Segoe UI Symbol",sans-serif';
  ctx.fillText(kind==='attack'?'⚔':'♥',128,65);
  const text=String(Math.max(0,Math.floor(Number(value)||0)));
  ctx.shadowColor='#17222bad';ctx.shadowBlur=3;ctx.shadowOffsetY=3;
  ctx.fillStyle='#fffbea';
  const size=text.length>=3?100:text.length===2?117:142;
  ctx.font='900 '+size+'px system-ui,"Arial Black",sans-serif';
  ctx.fillText(text,128,157,186);
  ctx.shadowColor='transparent';ctx.shadowBlur=0;
  return cv;
 }
 function texture(kind,value,max){
  const key=source(kind,value,max);
  if(textures.has(key))return textures.get(key);
  const image=drawSurface(kind,value,max);
  const tex=gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);
  textures.set(key,tex);
  if(textures.size>cacheLimit){
   const oldest=textures.keys().next().value;
   gl.deleteTexture(textures.get(oldest));textures.delete(oldest);
  }
  return tex;
 }
 function draw(matrix,unit,emphasis={}){
  if(!unit||!unit.deployed)return 0;
  // Dynamically query alive/dead HP, including damage and healing. No stale
  // canvas/card illustration that requires regeneration on each attack.
  const values=[['attack',unit.attack,unit.attack],['health',unit.currentHp,unit.hp]];
  for(const [kind,value,max] of values){
   const anchor=anchors[kind];
   let model=mul(matrix,T(anchor.x,anchor.y,anchor.z));
   // Active combat only: a small local pop when attack/HP changes, attached
   // to the same card matrix. Absolutely no passive/idle badge animation.
   const pulse=clamp(Number(emphasis[kind])||0,0,.18);
   if(pulse&&S)model=mul(model,S(1+pulse,1+pulse,1));
   renderGeom(face,model,[1,1,1,1],texture(kind,value,max),true);
  }
  return values.length;
 }
 function dispose(){
  for(const tex of textures.values())gl.deleteTexture(tex);
  textures.clear();
 }
 return Object.freeze({draw,dispose,
  get snapshot(){return{attachedTo:'card-model-matrix',layout:'lower-left-attack_lower-right-health',
   anchor:{attack:{...anchors.attack},health:{...anchors.health}},
   size:{width,height},cachedTextures:textures.size,
   resolution:[256,256],unitOnly:true};}
 });
}
root.PaperchalkCardStatBadges=Object.freeze({version:'1.1.0',create});
})(window);
