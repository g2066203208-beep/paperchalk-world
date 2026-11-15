/* Forest stage 01 / reusable biome-wide color and daylight palette.
 * Centralizes scene tint, topsoil, environment colors and directional light.
 * No extra geometry, no postprocessing, no shadows or material textures yet.
 */
(function(root){
'use strict';
const freeze=c=>Object.freeze(c);
const FOREST=freeze({
 id:'forest',version:'2.0.0',stage:6,
 terrainDetail:.031,
 goldColor:freeze([.82,.74,.49,1]),
 terrainSide:freeze([.52,.414,.302,1]),
 background:freeze([.43,.55,.36,1]),
 terrainLight:freeze([.57,.704,.386,1]),
 terrainDark:freeze([.449,.587,.323,1]),
 terrainVariance:.010,
 ground:freeze([.405,.522,.328,1]),
 foliage:freeze([
  freeze([.265,.397,.263,1]),freeze([.325,.462,.295,1]),
  freeze([.222,.362,.281,1]),freeze([.370,.491,.311,1])
 ]),
 sunDirection:freeze([-.45,.88,.34]),
 skyFill:freeze([.93,.99,.955]),
 sunColor:freeze([1.035,.993,.900]),
 ambient:.77,sunIntensity:.255
});
const CLEARING=freeze({
 id:'clearing',version:'1.2.0',stage:3,
 terrainDetail:.025,
 goldColor:FOREST.goldColor,
 terrainSide:freeze([.54,.455,.386,1]),
 background:freeze([.59,.571,.525,1]),
 terrainLight:freeze([.62,.454,.318,1]),
 terrainDark:freeze([.566,.408,.285,1]),
 terrainVariance:.012,
 ground:freeze([.622,.564,.478,1]),
 foliage:FOREST.foliage,
 sunDirection:freeze([-.42,.86,.31]),
 skyFill:freeze([.975,.979,1.0]),
 sunColor:freeze([1.035,.972,.87]),
 ambient:.79,sunIntensity:.24
});
const STREET=freeze({
 id:'street',version:'1.0.0',stage:7,
 terrainDetail:.027,goldColor:FOREST.goldColor,
 terrainSide:freeze([.255,.275,.305,1]),
 background:freeze([.075,.105,.150,1]),
 terrainLight:freeze([.375,.400,.430,1]),
 terrainDark:freeze([.369,.394,.425,1]),
 terrainVariance:.009,
 ground:freeze([.265,.292,.320,1]),foliage:FOREST.foliage,
 sunDirection:freeze([-.44,.76,.39]),skyFill:freeze([.58,.68,.90]),
 sunColor:freeze([.66,.77,.98]),ambient:.61,sunIntensity:.29
});
const PRESETS=freeze({forest:FOREST,clearing:CLEARING,street:STREET});
function get(id){return PRESETS[id]||FOREST;}
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
function evaluate(id,world){
 const v=get(id);
 if(!world)return {
  ...v,nightFactor:id==='street'?1:0,
  fogDensity:id==='street'?.019:.003,fogColor:[.38,.47,.40],
  background:[...v.background]
 };
 const daylight=clamp(world.daylight),night=1-daylight;
 const skyNight=[.39,.51,.76],moon=[.53,.65,.93];
 const dusk=[1.14,.67,.38],sunColor=mix(v.sunColor,dusk,world.twilight*.78);
 const backgroundDay=id==='street'?[.435,.495,.565,1]:v.background;
 const backgroundNight=id==='forest'?[.032,.053,.077,1]:
  id==='clearing'?[.048,.063,.09,1]:[.055,.079,.122,1];
 const background=mix(backgroundNight,backgroundDay,daylight);
 const fogDay=id==='street'?.006:id==='forest'?.0048:.0035;
 const fogNight=id==='street'?.020:id==='forest'?.010:.007;
 const fogColor=mix([.11,.17,.25],
  id==='street'?[.51,.55,.60]:id==='forest'?[.48,.56,.50]:[.56,.54,.50],daylight);
 return {
  ...v,background,
  sunDirection:world.lightDirection,
  skyFill:mix(skyNight,v.skyFill,daylight),
  sunColor:mix(moon,sunColor,daylight),
  ambient:v.ambient*(.35+.65*daylight),
  sunIntensity:v.sunIntensity*(.26+.74*daylight),
  nightFactor:world.nightFactor,
  fogDensity:lerp(fogNight,fogDay,daylight),
  fogColor
 };
}
function apply(gl,u,id,world){
 const v=evaluate(id,world);
 gl.uniform3fv(u.sunDirection,v.sunDirection);
 gl.uniform3fv(u.skyFill,v.skyFill);
 gl.uniform3fv(u.sunColor,v.sunColor);
 gl.uniform1f(u.ambient,v.ambient);
 gl.uniform1f(u.sunIntensity,v.sunIntensity);
 gl.uniform1f(u.terrainDetail,v.terrainDetail);
 return v;
}
root.PaperchalkVisualLook=freeze({
 version:'3.0.0',get,evaluate,apply,
 snapshot:id=>{const p=get(id);return {
   id:p.id,stage:p.stage,version:p.version,
   background:[...p.background],terrainLight:[...p.terrainLight],
   terrainDark:[...p.terrainDark],ground:[...p.ground],
   sunDirection:[...p.sunDirection],ambient:p.ambient,sunIntensity:p.sunIntensity,
   terrainDetail:p.terrainDetail,
   goldColor:[...p.goldColor],terrainSide:[...p.terrainSide]
 }; }
});
})(window);
