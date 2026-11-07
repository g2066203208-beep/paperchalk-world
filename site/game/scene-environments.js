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
   geometry:Object.freeze({shape:'arc'}),
   wall:Object.freeze({url:'./assets/ring-arena/convenience-wall.webp',
    width:2172,height:724,repeats:9,heightMeters:2.85}),
   floor:'./assets/ring-arena/convenience-floor.svg',
   ceiling:'./assets/ring-arena/convenience-ceiling.svg',
   lighting:'commercial'
  }),
  metro:Object.freeze({
   id:'metro',name:'地铁车厢 · 长条形场景',
   geometry:Object.freeze({shape:'strip',widthMeters:8.6,depthMeters:3.85,
    heightMeters:2.85,backZ:8.0}),
   // Per-scene staging is data, not a separate game-mode rendering path.
   camera:Object.freeze({
    // Passenger eye sees a believable 2.85m-high train, not the battle
    // over-shoulder lens/giant foreground heroine.
    mode:'fixed',eye:Object.freeze({x:0,y:1.52,z:15.1}),
    focus:Object.freeze({x:0,y:1.38,z:7.3}),fov:56,lensShift:.035
   }),
   actors:Object.freeze({
    visible:Object.freeze(['hero']),
    positions:Object.freeze({
     hero:Object.freeze({x:-1.9,y:0,z:10.1,height:1.63})
    })
   }),
   ends:'./assets/metro/side/metro-gangway.svg',
   wall:Object.freeze({url:'./assets/metro/side/cabin-master.webp',
    width:2048,height:1024,repeats:1,heightMeters:2.85}),
   // Geometry is different, renderer/shaders/lighting/shadows are identical.
   floor:'./assets/metro/side/metro-floor.svg',
   ceiling:'./assets/metro/side/metro-ceiling.svg',
   lighting:'fluorescent'
  })
 });
 function get(id){return environments[id]||null}
 return Object.freeze({get,all:environments});
});
