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
   // Formal, straight-on subway side-wall composition.
   // The actual 3D floor still exists for lighting and contact shadows, but
   // the frame crops BELOW the floor/wall joint instead of showing a grey
   // wedge of ground or diagonal gangway. Do not pan or orbit this camera.
   // A 49-degree vertical lens at 2.9m from the 2.85m wall fills the frame;
   // the painted door/window/bench art remains vertically undistorted.
   camera:Object.freeze({
    mode:'fixed',
    eye:Object.freeze({x:-0.95,y:1.45,z:10.90}),
    focus:Object.freeze({x:-0.95,y:1.45,z:8.0}),
    fov:49,lensShift:0,fovMode:'vertical',
    phoneEye:Object.freeze({x:-1.60,y:1.45,z:10.90}),
    phoneFocus:Object.freeze({x:-1.60,y:1.45,z:8.0}),
    composition:'front-elevation-no-floor'
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
     -2.85,2.82,5.85,
     0.92,2.82,5.85,
     2.62,2.80,5.85,
     -1.92,2.55,12.66
    ]),
    colors:Object.freeze([
     3.40,3.22,2.80,
     3.15,3.41,3.48,
     3.28,3.44,3.34,
     2.44,2.82,3.20
    ]),
    visibleSide:'3d-station-box-real-ceiling-luminaires-through-glass-and-open-doors',
    oppositeSide:'off-camera-side-platform-windows'
   })
  })
 });
 function get(id){return environments[id]||null}
 return Object.freeze({get,all:environments});
});
