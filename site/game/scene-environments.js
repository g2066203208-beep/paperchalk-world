/* One authored environment registry shared by combat and transit.
 * Each environment uses the same 3D wall/floor/ceiling geometry and lights;
 * replacing an artist's image needs only the asset path, not new renderer code. */
(function(root,factory){
 const result=factory();
 if(typeof module==='object'&&module.exports)module.exports=result;
 if(root)root.PaperWorldEnvironments=result;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const environments=Object.freeze({
  convenience:Object.freeze({
   id:'convenience',name:'便利店 · 圆环场景',
   wall:Object.freeze({url:'./assets/ring-arena/convenience-wall.webp',
    width:2172,height:724,repeats:9,heightMeters:2.85}),
   floor:'./assets/ring-arena/convenience-floor.svg',
   ceiling:'./assets/ring-arena/convenience-ceiling.svg',
   lighting:'commercial'
  }),
  metro:Object.freeze({
   id:'metro',name:'地铁车厢 · 圆环场景',
   wall:Object.freeze({url:'./assets/metro/side/cabin-master.webp',
    width:2048,height:1024,repeats:13,heightMeters:2.85}),
   floor:'./assets/metro/side/metro-floor.svg',
   ceiling:'./assets/metro/side/metro-ceiling.svg',
   lighting:'fluorescent'
  })
 });
 function get(id){return environments[id]||null}
 return Object.freeze({get,all:environments});
});
