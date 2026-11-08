/* Genuine 3D subway PLATFORM and four motorized sliding door leaves.
 * The carriage wall is 8.5m x 2.85m at z=8.0. Camera and train stay fixed;
 * the raised platform, ceramic back wall, soffit and columns live BEHIND
 * the cut-out carriage glass and door openings in one shared depth buffer.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.PaperWorldMetroPlatform3D=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const WIDTH=8.5,BACK_Z=8,HEIGHT=2.85;
 // Coordinates measured on the real 2172 x 724 authored wall image. This
 // source defines the art; no independently painted fake replacement doors.
 const DOORS=Object.freeze([
  Object.freeze({min:.0975,center:.186,max:.2735}),
  Object.freeze({min:.7265,center:.815,max:.9055})
 ]);
 const worldX=u=>(u-.5)*WIDTH;
 const meshes=()=>({
  platformFloor:[],platformBack:[],platformCeiling:[],
  platformColumns:[],platformLightboxes:[],
  doorLeafLeft:[],doorLeafRight:[]
 });
 const vertex=(x,y,z,u=0,v=0)=>[x,y,z,u,v];
 function quad(out,a,b,c,d){
  out.push(...a,...b,...c,...a,...c,...d);
 }
 function box(out,x0,x1,y0,y1,z0,z1,uvScale=1){
  quad(out,vertex(x0,y0,z0,x0*uvScale,y0*uvScale),
   vertex(x1,y0,z0,x1*uvScale,y0*uvScale),
   vertex(x1,y1,z0,x1*uvScale,y1*uvScale),
   vertex(x0,y1,z0,x0*uvScale,y1*uvScale));
  quad(out,vertex(x1,y0,z1,x1*uvScale,y0*uvScale),
   vertex(x0,y0,z1,x0*uvScale,y0*uvScale),
   vertex(x0,y1,z1,x0*uvScale,y1*uvScale),
   vertex(x1,y1,z1,x1*uvScale,y1*uvScale));
  for(const x of [x0,x1])
   quad(out,vertex(x,y0,z0,z0*uvScale,y0*uvScale),
    vertex(x,y0,z1,z1*uvScale,y0*uvScale),
    vertex(x,y1,z1,z1*uvScale,y1*uvScale),
    vertex(x,y1,z0,z0*uvScale,y1*uvScale));
  quad(out,vertex(x0,y0,z1,x0*uvScale,z1*uvScale),
   vertex(x1,y0,z1,x1*uvScale,z1*uvScale),
   vertex(x1,y0,z0,x1*uvScale,z0*uvScale),
   vertex(x0,y0,z0,x0*uvScale,z0*uvScale));
  quad(out,vertex(x0,y1,z0,x0*uvScale,z0*uvScale),
   vertex(x1,y1,z0,x1*uvScale,z0*uvScale),
   vertex(x1,y1,z1,x1*uvScale,z1*uvScale),
   vertex(x0,y1,z1,x0*uvScale,z1*uvScale));
 }
 function build(){
  const out=meshes();
  // Full physical box volume: 4.05m back wall, platform from 4.4 to 7.85,
  // near floor threshold 0.13m below carriage y=0, ceiling at y=3.00m.
  quad(out.platformBack,
   vertex(-7.25,-.18,4.42,-7.25,-.18),
   vertex( 7.25,-.18,4.42, 7.25,-.18),
   vertex( 7.25,3.02,4.42, 7.25,3.02),
   vertex(-7.25,3.02,4.42,-7.25,3.02));
  quad(out.platformFloor,
   vertex(-7.25,-.16,7.86,-7.25,7.86),
   vertex( 7.25,-.16,7.86, 7.25,7.86),
   vertex( 7.25,-.16,4.42, 7.25,4.42),
   vertex(-7.25,-.16,4.42,-7.25,4.42));
  quad(out.platformCeiling,
   vertex(-7.25,3.02,4.42,-7.25,4.42),
   vertex( 7.25,3.02,4.42, 7.25,4.42),
   vertex( 7.25,3.02,7.86, 7.25,7.86),
   vertex(-7.25,3.02,7.86,-7.25,7.86));
  for(const x of [-5.65,-2.05,1.6,5.3]){
   box(out.platformColumns,x-.135,x+.135,-.16,3.02,6.12,6.42);
   // An actual suspended fluorescent lightbox in front of the back wall.
   box(out.platformLightboxes,x-.70,x+.70,2.75,2.81,5.54,6.01);
  }
  // Architectural side returns close the box (the photo only shows a
  // section). No second station picture; these are real 3D polygons.
  box(out.platformColumns,-7.28,-7.08,-.16,3.04,4.4,7.85);
  box(out.platformColumns,7.08,7.28,-.16,3.04,4.4,7.85);
  // Door leaf meshes are separate physical 3D planes at z 8.035 and
  // sampled from the EXACT existing illustration. The motor translates
  // both pairs in the vertex shader. Visible glass keeps its alpha holes.
  for(const door of DOORS){
   for(const [which,a,b] of [
    ['doorLeafLeft',door.min,door.center],
    ['doorLeafRight',door.center,door.max]]){
    quad(out[which],
     vertex(worldX(a),0,8.045,a,0),
     vertex(worldX(b),0,8.045,b,0),
     vertex(worldX(b),HEIGHT*.735,8.045,b,.735),
     vertex(worldX(a),HEIGHT*.735,8.045,a,.735));
   }
  }
  return Object.freeze(out);
 }
 const leafTravelMeters=(DOORS[0].center-DOORS[0].min)*WIDTH;
 return Object.freeze({WIDTH,BACK_Z,HEIGHT,DOORS,leafTravelMeters,build});
});
