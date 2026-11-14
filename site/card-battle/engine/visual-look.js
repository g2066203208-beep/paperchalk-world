/* Forest stage 01 / reusable biome-wide color and daylight palette.
 * Centralizes scene tint, topsoil, environment colors and directional light.
 * No extra geometry, no postprocessing, no shadows or material textures yet.
 */
(function(root){
'use strict';
const freeze=c=>Object.freeze(c);
const FOREST=freeze({
 id:'forest',version:'1.1.0',stage:2,
 terrainDetail:.031,
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
 id:'clearing',version:'1.1.0',stage:2,
 terrainDetail:.025,
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
const PRESETS=freeze({forest:FOREST,clearing:CLEARING});
function get(id){return PRESETS[id]||FOREST;}
function apply(gl,u,id){
 const v=get(id);
 gl.uniform3fv(u.sunDirection,v.sunDirection);
 gl.uniform3fv(u.skyFill,v.skyFill);
 gl.uniform3fv(u.sunColor,v.sunColor);
 gl.uniform1f(u.ambient,v.ambient);
 gl.uniform1f(u.sunIntensity,v.sunIntensity);
 gl.uniform1f(u.terrainDetail,v.terrainDetail);
 return v;
}
root.PaperchalkVisualLook=freeze({
 version:'1.1.0',get,apply,
 snapshot:id=>{const p=get(id);return {
   id:p.id,stage:p.stage,version:p.version,
   background:[...p.background],terrainLight:[...p.terrainLight],
   terrainDark:[...p.terrainDark],ground:[...p.ground],
   sunDirection:[...p.sunDirection],ambient:p.ambient,sunIntensity:p.sunIntensity,
   terrainDetail:p.terrainDetail
 }; }
});
})(window);
