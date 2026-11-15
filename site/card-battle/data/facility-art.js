/* Facility art manifest. One lookup for both board props and card faces.
 * Upload a transparent PNG at the declared path; no battle/level code changes.
 * Occupancy and effects stay in CardCatalog, not in this visual manifest.
 */
(function(root){'use strict';
const entries=Object.freeze({
 'farm-field':Object.freeze({file:'farm-field.png',size:[1024,1024],name:'农田'}),
 'plant-tree':Object.freeze({file:'plant-tree.png',size:[1024,1024],name:'植树'}),
 'water-well':Object.freeze({file:'water-well.png',size:[1024,1024],name:'水井'}),
 'scarecrow':Object.freeze({file:'scarecrow.png',size:[1024,1024],name:'稻草人'}),
 'irrigated-field':Object.freeze({file:'irrigated-field.png',size:[1536,1536],name:'灌溉农田'})
});
const BASE='../assets/card-battle/farmer/';
function get(id){
 const def=entries[id];if(!def)return null;
 return Object.freeze({id,name:def.name,src:BASE+def.file,
  cardArt:BASE+def.file,size:[...def.size],alpha:true});
}
root.PaperchalkFacilityArt=Object.freeze({
 version:'1.0.0',get,
 get ids(){return Object.keys(entries);},
 get manifest(){return Object.freeze(Object.fromEntries(
  Object.keys(entries).map(id=>[id,get(id)]))); }
});
})(window);
