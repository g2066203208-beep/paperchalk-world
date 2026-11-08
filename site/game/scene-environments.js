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
   geometry:Object.freeze({shape:'strip',widthMeters:8.5,depthMeters:3.85,
    heightMeters:2.85,backZ:8.0}),
   // Per-scene staging is data, not a separate game-mode rendering path.
   camera:Object.freeze({
    // Passenger eye sees a believable 2.85m-high train, not the battle
    // over-shoulder lens/giant foreground heroine.
    // Keep the 1.63m heroine physically real, but move the passenger
    // camera closer and aim low enough for her actual shoes to remain visible.
    // Portrait devices crop the carriage horizontally, not the human vertically.
    // Corrected seated-passenger 3/4 camera: a modest 12-degree view
    // along the carriage, not a flat perpendicular elevation of a box.
    // The coach stays perfectly rigid; travel NEVER tilts or pans the eye.
    mode:'fixed',eye:Object.freeze({x:-1.15,y:1.50,z:10.60}),
    focus:Object.freeze({x:-.55,y:.95,z:7.70}),fov:66,lensShift:.09,
    fovMode:'vertical',
    phoneEye:Object.freeze({x:-1.55,y:1.50,z:10.60}),
    phoneFocus:Object.freeze({x:-.95,y:.95,z:7.70})
   }),
   actors:Object.freeze({
    visible:Object.freeze(['hero']),
    positions:Object.freeze({
     hero:Object.freeze({x:-1.6,y:0,z:8.94,height:1.63})
    })
   }),
   ends:'./assets/metro/side/metro-gangway.svg',
   wall:Object.freeze({url:'./assets/metro/side/cabin-master-illustrated.webp',
    width:2172,height:724,repeats:1,heightMeters:2.85,
    alphaWindows:true,exterior:'animated-tunnel'}),
   // Geometry is different, renderer/shaders/lighting/shadows are identical.
   floor:'./assets/metro/side/metro-floor.svg',
   ceiling:'./assets/metro/side/metro-ceiling.svg',
   lighting:'fluorescent',
   // Four real world-space station light sources: three across the visible
   // left/right glass groups, one from the opposite (off-camera) platform.
   // No baked window glow or flat screen overlay. Their radiation reaches
   // the same floor, wall and live L2D lighting code as the ceiling fixtures.
   platformLighting:Object.freeze({
    backZ:8.0,
    positions:Object.freeze([
     -2.85,2.55,7.02,
     0.92,2.56,7.06,
     2.62,2.48,7.00,
     -1.92,2.55,12.66
    ]),
    colors:Object.freeze([
     3.40,3.22,2.80,
     3.15,3.41,3.48,
     3.28,3.44,3.34,
     2.44,2.82,3.20
    ]),
    visibleSide:'rear-window-and-door-glass',
    oppositeSide:'off-camera-side-platform-windows'
   })
  })
 });
 function get(id){return environments[id]||null}
 return Object.freeze({get,all:environments});
});
