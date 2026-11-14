/* Shared world-space anchor transforms for ALL 3D scene renderers.
 * Geometry authored in world coordinates must use a full pivot sandwich:
 *  T(root) × S(scale) × T(-root). Objects authored in local coordinates
 * already use T(root) × S(scale). Neither operation shifts the root.
 */
(function(root){'use strict';
function atRoot(anchor,scale,{T,S,mul}={}){
 if(!Array.isArray(anchor)||anchor.length!==3||anchor.some(v=>!Number.isFinite(v))||
  !Number.isFinite(scale)||scale<0||!T||!S||!mul)
  throw Error('Invalid anchored transform');
 const [x,y,z]=anchor;
 return mul(mul(T(x,y,z),S(scale,scale,scale)),T(-x,-y,-z));
}
function localAtRoot(anchor,scale,{T,S,mul}={}){
 if(!Array.isArray(anchor)||anchor.length!==3||anchor.some(v=>!Number.isFinite(v))||
  !Number.isFinite(scale)||scale<0||!T||!S||!mul)
  throw Error('Invalid local anchored transform');
 return mul(T(...anchor),S(scale,scale,scale));
}
root.PaperchalkObjectAnchor=Object.freeze({version:'1.0.0',atRoot,localAtRoot});
})(window);
