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
const HALL=freeze({
 id:'hall',version:'1.0.0',stage:8,
 terrainDetail:.014,goldColor:FOREST.goldColor,
 terrainSide:freeze([.39,.39,.41,1]),
 background:freeze([.40,.43,.47,1]),
 terrainLight:freeze([.61,.59,.55,1]),
 terrainDark:freeze([.57,.56,.53,1]),
 terrainVariance:.005,ground:freeze([.43,.43,.46,1]),foliage:FOREST.foliage,
 sunDirection:freeze([-.40,.85,.32]),skyFill:freeze([.93,.88,.82]),
 sunColor:freeze([1.04,.92,.78]),ambient:.78,sunIntensity:.22
});
const COAST=freeze({
 id:'coast',version:'1.0',stage:9,terrainDetail:.043,goldColor:FOREST.goldColor,
 terrainSide:freeze([.51,.47,.38,1]),
 background:freeze([.47,.66,.74,1]),
 terrainLight:freeze([.78,.69,.53,1]),terrainDark:freeze([.735,.665,.520,1]),
 terrainVariance:.013,ground:freeze([.68,.62,.50,1]),
 foliage:FOREST.foliage,sunDirection:FOREST.sunDirection,
 skyFill:freeze([.84,.94,1.04]),sunColor:freeze([1.06,.99,.87]),
 ambient:.80,sunIntensity:.33
});
const CLIFF=freeze({
 id:'cliff',version:'1.0',stage:10,terrainDetail:.037,goldColor:FOREST.goldColor,
 terrainSide:freeze([.31,.34,.38,1]),
 background:freeze([.49,.59,.69,1]),
 terrainLight:freeze([.54,.56,.56,1]),terrainDark:freeze([.523,.544,.549,1]),
 terrainVariance:.018,ground:freeze([.40,.42,.44,1]),
 foliage:FOREST.foliage,sunDirection:FOREST.sunDirection,
 skyFill:freeze([.83,.91,1.00]),sunColor:freeze([1.00,.96,.86]),
 ambient:.71,sunIntensity:.36
});
const OCEAN=freeze({
 id:'ocean',version:'1.0',stage:11,terrainDetail:.016,goldColor:FOREST.goldColor,
 terrainSide:freeze([.28,.27,.27,1]),
 background:freeze([.36,.59,.73,1]),
 terrainLight:freeze([.57,.44,.33,1]),terrainDark:freeze([.546,.423,.322,1]),
 terrainVariance:.009,ground:freeze([.18,.39,.51,1]),
 foliage:FOREST.foliage,sunDirection:FOREST.sunDirection,
 skyFill:freeze([.86,.96,1.03]),sunColor:freeze([1.00,.97,.90]),
 ambient:.77,sunIntensity:.31
});
const CAVE=freeze({
 id:'cave',version:'1.0',stage:12,terrainDetail:.033,goldColor:FOREST.goldColor,
 terrainSide:freeze([.29,.30,.35,1]),
 background:freeze([.085,.115,.140,1]),
 terrainLight:freeze([.41,.43,.45,1]),terrainDark:freeze([.395,.414,.439,1]),
 terrainVariance:.014,ground:freeze([.24,.27,.31,1]),
 foliage:FOREST.foliage,sunDirection:FOREST.sunDirection,
 skyFill:freeze([.18,.24,.31]),sunColor:freeze([.52,.62,.72]),
 ambient:.25,sunIntensity:.08
});
const PRESETS=freeze({forest:FOREST,clearing:CLEARING,street:STREET,
 hall:HALL,coast:COAST,cliff:CLIFF,ocean:OCEAN,cave:CAVE});
function get(id){return PRESETS[id]||FOREST;}
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const mix=(a,b,t)=>a.map((v,i)=>lerp(v,b[i],t));
function evaluate(id,world){
 const v=get(id);
 if(!world)return {
  ...v,nightFactor:id==='street'||id==='hall'?1:0,
  fogDensity:id==='street'?.019:.003,fogColor:[.38,.47,.40],
  background:[...v.background]
 };
 const daylight=clamp(world.daylight),night=1-daylight;
 const skyNight=[.39,.51,.76],moon=[.53,.65,.93];
 const dusk=[1.14,.67,.38],sunColor=mix(v.sunColor,dusk,world.twilight*.78);
 const backgroundDay=id==='street'?[.435,.495,.565,1]:v.background;
 const backgroundNight=id==='forest'?[.032,.053,.077,1]:
  id==='clearing'?[.048,.063,.09,1]:id==='hall'?[.095,.103,.125,1]:id==='coast'?[.048,.092,.15,1]:id==='cliff'?[.075,.086,.105,1]:id==='ocean'?[.045,.08,.13,1]:id==='cave'?[.055,.075,.09,1]:[.055,.079,.122,1];
 const background=mix(backgroundNight,backgroundDay,daylight);
 const fogDay=id==='street'?.006:id==='hall'?.0025:id==='coast'?.006:id==='cliff'?.004:id==='ocean'?.004:id==='cave'?.014:id==='forest'?.0048:.0035;
 const fogNight=id==='street'?.020:id==='hall'?.005:id==='coast'?.014:id==='cliff'?.010:id==='ocean'?.009:id==='cave'?.018:id==='forest'?.010:.007;
 const fogColor=mix([.11,.17,.25],
  id==='street'?[.51,.55,.60]:id==='hall'?[.52,.50,.47]:id==='coast'?[.53,.66,.72]:id==='cliff'?[.48,.54,.61]:id==='ocean'?[.44,.60,.67]:id==='cave'?[.21,.29,.35]:id==='forest'?[.48,.56,.50]:[.56,.54,.50],daylight);
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
