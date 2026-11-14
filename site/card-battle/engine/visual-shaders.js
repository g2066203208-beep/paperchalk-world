/* WebGL1 stylized 6-layer material+lighting shader.
 * This is LIVE WebGL geometry shading, NOT a composited picture.
 * Material atlas, contact AO, tree shadows, hemisphere light, paper/gold
 * response, sunlight filtering and understated filmic color treatment.
 */
(function(root){'use strict';
const fragment=\`precision highp float;
varying vec3 vN,vP;varying vec2 vUV;varying vec4 vLightPos;
uniform vec4 uColor,uBoardBounds;
uniform sampler2D uTex,uShadowMap,uMaterialAtlas;
uniform float uTexEnabled,uUnlit,uTerrain,uUseShadow;
uniform float uAmbient,uSunIntensity,uTerrainDetail,uMetal,uMaterialKind;
uniform float uVisualMix,uGroundY;
uniform vec2 uShadowTexel,uResolution;
uniform vec3 uSoil,uSunDirection,uSkyFill,uSunColor,uCameraEye;
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
 float diffuse=max(0.,dot(normal,light));
 vec3 illumination=uSkyFill*uAmbient*(.72+.28*visibility)
                   +uSunColor*(uSunIntensity*diffuse*visibility);
 // Hemisphere illumination approximates terrain-to-object reflected skylight.
 vec3 bounce=mix(vec3(.17,.26,.13),vec3(.26,.28,.20),clamp(normal.y*.5+.5,0.,1.));
 illumination+=bounce*(.30+max(0.,1.-diffuse)*.18)*uVisualMix;
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
 float subtleSpec=pow(max(0.,dot(reflect(-light,normal),normalize(vec3(0.,1.,1.)))),45.)*.035;
 vec3 finalColor=uUnlit>.5?base.rgb:base.rgb*(illumination+vec3(subtleSpec));
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
  float fog=clamp((distance(uCameraEye,vP)-66.)/125.,0.,.07);
  finalColor=mix(finalColor,vec3(.38,.47,.31),fog);
  vec2 q=gl_FragCoord.xy/max(uResolution,vec2(1.))-.5;
  finalColor*=1.-dot(q*vec2(1.,.82),q*vec2(1.,.82))*.17;
 }
 gl_FragColor=vec4(clamp(finalColor,0.,1.),base.a);
}\`;
root.PaperchalkVisualShaders=Object.freeze({version:'1.0.0',fragment});
})(window);
