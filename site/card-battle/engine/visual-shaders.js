/* WebGL1 stylized 6-layer material+lighting shader.
 * This is LIVE WebGL geometry shading, NOT a composited picture.
 * Material atlas, contact AO, tree shadows, hemisphere light, paper/gold
 * response, sunlight filtering and understated filmic color treatment.
 */
(function(root){'use strict';
const fragment=`precision highp float;
varying vec3 vN,vP;varying vec2 vUV;varying vec4 vLightPos;
uniform vec4 uColor,uBoardBounds;
uniform sampler2D uTex,uShadowMap,uMaterialAtlas,uCloudMap;
uniform float uTexEnabled,uUnlit,uTerrain,uUseShadow;
uniform float uAmbient,uSunIntensity,uTerrainDetail,uMetal,uMaterialKind;
uniform float uVisualMix,uGroundY,uCloudTime,uCloudStrength;
uniform vec2 uShadowTexel,uResolution;
uniform vec3 uSoil,uSunDirection,uSkyFill,uSunColor,uCameraEye;
uniform float uStreetMode,uStreetTime,uStreetFog;
uniform float uNightFactor,uWorldFog;
uniform float uIndoorMode,uHallDaylight,uCaveMode;
uniform vec3 uHallWindows[4];
uniform vec3 uWorldFogColor;
uniform vec3 uStreetLamps[4];
uniform vec3 uCardContacts[8];
float unpackDepth(vec4 rgba){return dot(rgba,vec4(1.,1./255.,1./65025.,1./16581375.));}
float shadowVisibility(vec3 normal,vec3 light){
 if(uUseShadow<.5)return 1.;
 vec3 sc=(vLightPos.xyz/vLightPos.w)*.5+.5;
 if(sc.x<=0.||sc.x>=1.||sc.y<=0.||sc.y>=1.||sc.z<=0.||sc.z>=1.)return 1.;
 float bias=max(.0012,.0032*(1.-max(0.,dot(normal,light))));
 float lit=0.;
 for(int ix=0;ix<2;ix++)for(int iy=0;iy<2;iy++){
  vec2 off=(vec2(float(ix),float(iy))-.5)*uShadowTexel*3.5;
  lit+=step(sc.z-bias,unpackDepth(texture2D(uShadowMap,sc.xy+off)));
 }
 return lit*.25;
}
vec2 matUV(float id){
 vec2 w=fract(vec2(vP.x*.137+vP.z*.015,vP.z*.141-vP.x*.019));
 vec2 offset=vec2(0.);
 if(id>1.5&&id<2.5)offset=vec2(.5,0.);
 if(id>2.5&&id<3.5)offset=vec2(0.,.5);
 if(id>3.5&&id<4.5)offset=vec2(.5,.5);
 return offset+vec2(.008)+w*.484;
}
void main(){
 vec4 base=uColor;
 if(uTexEnabled>.5){
  vec4 sampled=texture2D(uTex,vUV);
  if(sampled.a<.02)discard;
  base*=sampled;
 }
 vec3 normal=normalize(vN),light=normalize(uSunDirection);
 if(uTerrain>.5){
  float grassWeight=smoothstep(.20,.68,max(0.,normal.y));
  base.rgb=mix(uSoil,base.rgb,grassWeight);
  float broad=sin(vP.x*.42+sin(vP.z*.35))*cos(vP.z*.38-vP.x*.11);
  float fine=sin(vP.x*1.67+vP.z*.70)*sin(vP.z*1.92-vP.x*.32);
  base.rgb*=1.0+uTerrainDetail*(broad*.80+fine*.20)*grassWeight;
  // Every scene uses exactly the SAME physical battle-board material.
  // Street lamps, cave light and world weather may shade it; the scene may
  // never swap the board for a special stone/sand/deck surface.
 }
 // Shared 2x2 material atlas; seam-safe world-space sampling.
 if(uVisualMix>.5 && uMaterialKind>.5 && uMaterialKind<4.5){
  vec2 uv=matUV(uMaterialKind);
  vec3 tex=texture2D(uMaterialAtlas,uv).rgb;
  float luma=dot(tex,vec3(.25,.60,.15));
  float strength=uTerrain>.5?.23:.47;
  float broad=sin(vP.x*.24+sin(vP.z*.19))*cos(vP.z*.31-vP.x*.13);
  base.rgb*=clamp(1.+(luma-.50)*strength+
   (vP.y<uGroundY+.12?.10:.013)*broad,.73,1.25);
  float fx=dot(texture2D(uMaterialAtlas,uv+vec2(.004,0.)).rgb,vec3(.333));
  float fz=dot(texture2D(uMaterialAtlas,uv+vec2(0.,.004)).rgb,vec3(.333));
  normal=normalize(normal+vec3((luma-fx)*.85,0.,(luma-fz)*.85));
 }
 float visibility=uUnlit>.5?1.:shadowVisibility(normal,light);
 // Cloud cover projects on the receiving horizontal WORLD surface, not screen.
 // It drifts independently from the stationary sun/tree shadow map and keeps
 // all original paper/card artwork crisp and readable.
 float cloudShade=0.;
 if(uCloudStrength>.001&&
    (uTerrain>.5||(uMaterialKind>.5&&uMaterialKind<2.5))){
  // Branching on draw-level uniforms is safe for implicit mipmap derivatives.
  vec2 wind=vec2(.60,.23)*uCloudTime;
  float cover=texture2D(uCloudMap,(vP.xz-wind)/72.).r;
  cloudShade=smoothstep(.44,.67,cover)*uCloudStrength*
   smoothstep(.50,.76,normal.y);
 }
 float diffuse=max(0.,dot(normal,light));
 vec3 illumination=uSkyFill*uAmbient*(.72+.28*visibility)
                   +uSunColor*(uSunIntensity*diffuse*visibility);
 // Hemisphere illumination approximates terrain-to-object reflected skylight.
 vec3 bounce=mix(vec3(.17,.26,.13),vec3(.26,.28,.20),clamp(normal.y*.5+.5,0.,1.));
 illumination+=bounce*(.30+max(0.,1.-diffuse)*.18)*uVisualMix;
 illumination*=1.-cloudShade;
 if(uIndoorMode>.5&&uUnlit<.5){
  // Cutaway roof keeps sun and sky OUT of the room. Rebuild the daylight
  // contribution by mathematically projecting each actual rear-window
  // APERTURE along the real world-clock sun vector. The ray traverses a
  // different point in the opening as the sun travels east-west; there is
  // no fixed positional window-light decal.
  illumination=illumination*.17+vec3(.11,.105,.099);
  vec3 sunRay=normalize(uSunDirection);
  if(uHallDaylight>.001&&sunRay.z<-.055){
   for(int wi=0;wi<4;wi++){
    float t=(uHallWindows[wi].z-vP.z)/sunRay.z;
    vec3 hit=vP+sunRay*t;
    float insideX=1.-smoothstep(1.12,1.48,abs(hit.x-uHallWindows[wi].x));
    float insideY=1.-smoothstep(1.68,2.04,abs(hit.y-uHallWindows[wi].y));
    float inside=step(0.,t)*insideX*insideY;
    float receive=max(.08,dot(normal,sunRay));
    illumination+=vec3(1.13,.96,.78)*inside*
       uHallDaylight*receive*1.52;
   }
  }
 }
 if(uCaveMode>.5&&uUnlit<.5){
  // A real ceiling occludes exterior ambient. Cave crystals provide
  // separate local light via the shared four-light array below.
  illumination=illumination*.45+vec3(.29,.33,.37);
 }
 if((uStreetMode>.5||uIndoorMode>.5||uCaveMode>.5) && uUnlit<.5){
  // Shared lighting shader; local lamps illuminate real 3D receivers.
  // The existing directional moonlight uses the shadow map.
  for(int li=0;li<4;li++){
   vec3 delta=uStreetLamps[li]-vP;
   float sq=dot(delta,delta);
   float range=uCaveMode>.5?1./(1.+sq*.004+sq*sq*.000003):
    1./(1.+sq*.035+sq*sq*.00013);
   float facing=max(.12,dot(normal,normalize(delta)));
   vec3 localLight=uCaveMode>.5?vec3(.38,.76,.89):vec3(1.00,.64,.34);
   illumination+=localLight*range*facing*.98*
      (uCaveMode>.5?1.64:uIndoorMode>.5?.57+.43*uNightFactor:uNightFactor);
  }
 }
 if(uVisualMix>.5&&uMaterialKind>.5&&uMaterialKind<4.5){
  float ao=1.;
  if(vP.y<uGroundY+.14){
   vec2 edge=vec2(max(max(uBoardBounds.x-vP.x,vP.x-uBoardBounds.y),0.),
                  max(max(uBoardBounds.z-vP.z,vP.z-uBoardBounds.w),0.));
   ao-=.31*(1.-smoothstep(.04,2.7,length(edge)));
  }else if(uTerrain>.5){
   for(int i=0;i<8;i++){
    vec3 pos=uCardContacts[i];
    if(pos.z>0.){
     float d=distance(vP.xz,pos.xy);
     ao-=.12*(1.-smoothstep(.06,pos.z,d));
    }
   }
  }
  illumination*=clamp(ao,.58,1.);
  // Moving the foliage geometry changes the real cast shadow. This added
  // soft sun patch shading never substitutes for that physical shadow map.
  if(vP.y<uGroundY+.14&&uMaterialKind<1.5){
   float dapple=sin(vP.x*.40+sin(vP.z*.53))*cos(vP.z*.48+sin(vP.x*.27));
   illumination*=1.+.12*smoothstep(.10,.80,dapple)*visibility;
  }
 }
 // Material-specific roughness: grass/soil matte, stone satin, bark diffuse,
 // paper softly fibrous; separate high-intensity gold response below.
 float roughness=.78;
 if(uMaterialKind>.5&&uMaterialKind<1.5)roughness=.97;
 else if(uMaterialKind>1.5&&uMaterialKind<2.5)roughness=.95;
 else if(uMaterialKind>2.5&&uMaterialKind<3.5)roughness=.72;
 else if(uMaterialKind>3.5&&uMaterialKind<4.5)roughness=.86;
 else if(uMaterialKind>4.5&&uMaterialKind<5.5)roughness=.93;
 else if(uMetal>.5)roughness=.24;
 float glossExponent=mix(84.,8.,roughness);
 float glossStrength=mix(.12,.006,roughness);
 float subtleSpec=pow(max(0.,dot(reflect(-light,normal),normalize(vec3(0.,1.,1.)))),glossExponent)*glossStrength;
 vec3 finalColor=uUnlit>.5?base.rgb:base.rgb*(illumination+vec3(subtleSpec));
 // Card illustrations stay readable at night; all world meshes keep physical lighting.
 if(uMaterialKind>4.5&&uMaterialKind<5.5&&uUnlit<.5){
  finalColor=mix(finalColor,base.rgb*.82,uNightFactor*.41);
 }
 // Material 9: physical 3D ocean mesh. High frequency ripple normals,
 // specular sun glints and glancing-angle fresnel share the world sun clock.
 if(uMaterialKind>8.5&&uMaterialKind<9.5){
  float t=uStreetTime;
  float w1=sin(vP.x*.52+vP.z*.19+t*.49);
  float w2=cos(vP.x*.21-vP.z*.68-t*.72);
  float w3=sin(vP.x*1.64+vP.z*1.12+t*1.07);
  vec3 wn=normalize(vec3(.035*w1+.014*w3,1.,.042*w2+.014*w3));
  vec3 viewDir=normalize(uCameraEye-vP);
  float reflectivity=pow(1.-clamp(dot(wn,viewDir),0.,1.),3.);
  float glint=pow(max(0.,dot(reflect(-light,wn),viewDir)),64.);
  vec3 deep=base.rgb*(.91+.045*w1+.035*w2);
  vec3 sky=uSkyFill*uAmbient*(.28+.31*reflectivity);
  vec3 reflection=uSunColor*glint*.09;
  float spark=pow(max(0.,w3*w2),12.)*.025;
  finalColor=clamp(mix(deep,deep*.75+sky,reflectivity*.31)+
   reflection+vec3(spark),0.,1.);
 }
 // Material 10: foamy irregular moving breaker lines tied to the water,
 // kept on actual 3D shoreline ribbon geometry (never screen-space).
 if(uMaterialKind>9.5&&uMaterialKind<10.5){
  float breaking=.82+.13*sin(vP.x*3.6+uStreetTime*.85)+
   .05*sin(vP.x*8.1-vP.z*2.7-uStreetTime*.36);
  finalColor=clamp(base.rgb*breaking*(.75+.25*uAmbient),0.,1.);
 }
 // Material 7 is self-illuminating street glass. Dark by day, warm at night.
 if(uIndoorMode>.5 && uMaterialKind>7.5&&uMaterialKind<8.5){
  // Stained glass is bright from OUTSIDE by day, dark at midnight.
  finalColor=mix(base.rgb*.20,base.rgb*1.03,uHallDaylight);
 }
 if(uMaterialKind>6.5&&uMaterialKind<7.5){
  finalColor=mix(base.rgb*vec3(.28,.37,.52),base.rgb*1.12,max(uNightFactor,uCaveMode));
 }
 if(uMetal>.5&&uUnlit<.5){
  vec3 viewDir=normalize(uCameraEye-vP),halfVec=normalize(light+viewDir);
  float highlight=pow(max(dot(normal,halfVec),0.),52.)*.27;
  float rim=pow(1.-max(dot(normal,viewDir),0.),3.)*.09;
  finalColor+=uSunColor*(highlight+rim);
 }
 if(uVisualMix>.5&&uMaterialKind>4.5&&uMaterialKind<5.5){
  float fibers=sin(vP.x*41.+vP.z*17.)*sin(vP.z*53.-vP.x*23.);
  finalColor*=1.+fibers*.006;
 }
 if(uVisualMix>.5){
  vec3 x=max(vec3(0.),finalColor*1.04);
  vec3 film=(x*(2.51*x+.03))/(x*(2.43*x+.59)+.14);
  finalColor=mix(finalColor,film,.34);
  // One volumetric-distance haze model for EVERY biome, with weather/time
  // density and fog color driven by the shared clock. No street-only clock.
  float dist=max(0.,distance(uCameraEye,vP)-20.);
  float wave=sin(vP.x*.16+vP.z*.09+uStreetTime*.16)*.12;
  float low=1.-smoothstep(uGroundY+.12,uGroundY+7.,vP.y);
  float density=uWorldFog*(.80+.20*low)*(1.+wave);
  float fog=clamp(1.-exp(-dist*density),0.,.69);
  if(uMaterialKind>4.5||uUnlit>.5)fog*=.10;
  finalColor=mix(finalColor,uWorldFogColor,fog);
  vec2 q=gl_FragCoord.xy/max(uResolution,vec2(1.))-.5;
  finalColor*=1.-dot(q*vec2(1.,.82),q*vec2(1.,.82))*.17;
 }
 gl_FragColor=vec4(clamp(finalColor,0.,1.),base.a);
}`;
root.PaperchalkVisualShaders=Object.freeze({version:'2.0.0',fragment});
})(window);
