const FS_VERT=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function makeTarget(THREE){return new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:false,stencilBuffer:false})}

export class PhotonSkyWeatherPass{
  constructor(THREE,{renderer,camera,mobileLike=false}={}){
    this.THREE=THREE;this.renderer=renderer;this.camera=camera;this.mobileLike=!!mobileLike;
    this.settings={
      enabled:true,autoWeather:true,weather:0.18,cloudCoverage:.48,cloudDensity:this.mobileLike?.56:.72,
      lowCloudSteps:this.mobileLike?9:17,cloudShadowSteps:this.mobileLike?2:4,
      cirrus:true,altocumulus:true,noctilucent:true,cloudShadows:true,
      rain:true,aurora:true,rainbow:true,lightning:true
    };
    this.size={w:1,h:1};this.target=makeTarget(THREE);this.fsCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.geometry=new THREE.PlaneGeometry(2,2);this.invViewProj=new THREE.Matrix4();this.renderCount=0;this.lastWeather=0;
    this.uniforms={
      tScene:{value:null},tDepth:{value:null},uInvViewProj:{value:this.invViewProj},uCameraPos:{value:new THREE.Vector3()},
      uSunDir:{value:new THREE.Vector3(0,1,0)},uSunColor:{value:new THREE.Color(1,.9,.72)},uResolution:{value:new THREE.Vector2(1,1)},
      uTime:{value:0},uDaylight:{value:1},uTwilight:{value:0},uWeather:{value:.18},uCoverage:{value:.48},uDensity:{value:.72},
      uLowSteps:{value:17},uShadowSteps:{value:4},uCirrus:{value:1},uAlto:{value:1},uNoct:{value:1},uCloudShadows:{value:1},
      uRain:{value:1},uAurora:{value:1},uRainbow:{value:1},uLightning:{value:1}
    };
    this.material=new THREE.ShaderMaterial({uniforms:this.uniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,fragmentShader:`
precision highp float;
varying vec2 vUv;
uniform sampler2D tScene,tDepth;
uniform mat4 uInvViewProj;
uniform vec3 uCameraPos,uSunDir,uSunColor;
uniform vec2 uResolution;
uniform float uTime,uDaylight,uTwilight,uWeather,uCoverage,uDensity,uLowSteps,uShadowSteps,uCirrus,uAlto,uNoct,uCloudShadows,uRain,uAurora,uRainbow,uLightning;

float hash11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float hash21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1)),f.x),f.y);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash31(i),b=hash31(i+vec3(1,0,0)),c=hash31(i+vec3(0,1,0)),d=hash31(i+vec3(1,1,0)),e=hash31(i+vec3(0,0,1)),g=hash31(i+vec3(1,0,1)),h=hash31(i+vec3(0,1,1)),j=hash31(i+vec3(1));return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,j,f.x),f.y),f.z);}
float fbm2(vec2 p){float s=0.0,a=.55;s+=noise2(p)*a;p=p*2.03+17.7;a*=.5;s+=noise2(p)*a;p=p*2.11+7.3;a*=.5;s+=noise2(p)*a;p=p*2.07+31.2;a*=.5;s+=noise2(p)*a;return s;}
float fbm3(vec3 p){float s=0.0,a=.54;s+=noise3(p)*a;p=p*2.03+17.1;a*=.5;s+=noise3(p)*a;p=p*2.01+9.7;a*=.5;s+=noise3(p)*a;return s;}
vec3 worldFar(vec2 uv){vec4 c=vec4(uv*2.0-1.0,1.0,1.0);vec4 w=uInvViewProj*c;return w.xyz/max(1e-6,w.w);}
vec3 worldPos(vec2 uv,float d){vec4 c=vec4(uv*2.0-1.0,d*2.0-1.0,1.0);vec4 w=uInvViewProj*c;return w.xyz/max(1e-6,w.w);}

float lowCloud(vec3 p,float weather){
  float h=smoothstep(13.0,17.2,p.y)*(1.0-smoothstep(27.0,31.5,p.y));
  vec3 wind=vec3(uTime*.0065,0.0,uTime*.0022);
  float macro=fbm3(p*.052+wind),detail=fbm3(p*.137+wind*1.7+31.0);
  float threshold=mix(.75,.36,clamp(uCoverage+weather*.22,0.0,1.0));
  return max(0.0,macro+detail*.22-threshold)*uDensity*2.7*h;
}
float cloudLight(vec3 p){
  float trans=1.0;vec3 sp=p;float sd=2.25;
  for(int j=0;j<4;j++){if(float(j)>=uShadowSteps)break;sp+=normalize(uSunDir)*sd;trans*=exp(-lowCloud(sp,uWeather)*.78*sd);}
  return trans;
}
vec4 raymarchLowClouds(vec3 ro,vec3 rd){
  if(rd.y<=.01)return vec4(0.0);
  float t0=max(0.0,(13.0-ro.y)/rd.y),t1=(31.5-ro.y)/rd.y;if(t1<=t0)return vec4(0.0);
  float steps=max(1.0,uLowSteps),dt=max(.18,(t1-t0)/steps);
  float jitter=hash21(gl_FragCoord.xy+floor(uTime*31.0))-.5,t=t0+dt*(.5+jitter*.3),trans=1.0;vec3 col=vec3(0.0);
  for(int i=0;i<24;i++){
    if(float(i)>=uLowSteps||t>=t1||trans<.025)break;
    vec3 p=ro+rd*t;float den=lowCloud(p,uWeather);
    if(den>.002){
      float sh=cloudLight(p),mu=max(0.0,dot(rd,normalize(uSunDir))),phase=.38+.62*pow(mu,6.0);
      vec3 warm=mix(vec3(.34,.39,.47),uSunColor,.72),storm=mix(warm,vec3(.16,.19,.25),uWeather*.78);
      float silver=pow(max(0.0,dot(-rd,normalize(uSunDir))),10.0)*.32;
      vec3 light=storm*(.25+.75*sh)*phase+uSunColor*silver*sh;
      float a=1.0-exp(-den*dt*.74);col+=trans*light*a;trans*=1.0-a;
    }t+=dt;
  }
  return vec4(col,1.0-trans);
}
vec4 highClouds(vec3 rd){
  if(rd.y<=.025)return vec4(0.0);
  vec2 p=(uCameraPos.xz+rd.xz*(48.0/max(.035,rd.y)))*.012+vec2(uTime*.0032,-uTime*.0011);
  float cir=fbm2(p*1.15);cir=smoothstep(.58,.78,cir+noise2(p*4.1)*.18)*uCirrus;
  vec2 q=p*.72+vec2(19.2,-4.4);float cells=fbm2(q*3.0);float alto=smoothstep(.57,.72,cells)*smoothstep(.22,.65,noise2(q*.68))*uAlto;
  float night=clamp(1.0-uDaylight-uTwilight*.35,0.0,1.0);float nlc=smoothstep(.62,.82,fbm2(p*2.6+43.0))*uNoct*night;
  float a=clamp(cir*.28+alto*.24+nlc*.16,0.0,.48);
  vec3 dayCol=mix(vec3(.72,.78,.85),uSunColor,.38);vec3 nightCol=vec3(.28,.40,.65);
  vec3 c=mix(dayCol,nightCol,night*.75)+vec3(.16,.25,.52)*nlc;
  return vec4(c*a,a);
}
float cloudShadowAt(vec3 p){
  vec2 q=(p.xz+vec2(uTime*.39,uTime*.13))*.027;float n=fbm2(q);float cover=smoothstep(mix(.72,.44,uCoverage+uWeather*.18),.82,n+.17*noise2(q*3.2));return mix(1.0,.58,cover*(.45+.55*uWeather))*uCloudShadows+(1.0-uCloudShadows);
}
vec3 aurora(vec3 rd,float night){
  if(rd.y<=.04)return vec3(0.0);
  float north=smoothstep(-.1,.55,rd.z),h=smoothstep(.06,.32,rd.y)*(1.0-smoothstep(.58,.90,rd.y));
  vec2 uv=vec2(atan(rd.x,rd.z)*2.4+uTime*.012,rd.y*10.0);
  float curtains=pow(max(0.0,sin(uv.x*2.0+fbm2(vec2(uv.x*.42,uTime*.018))*5.0)),5.0);
  float folds=.35+.65*fbm2(vec2(uv.x*1.3,uv.y*.23-uTime*.01));
  vec3 c=mix(vec3(.16,.92,.58),vec3(.52,.28,1.0),fbm2(vec2(uv.x*.3,3.7)));
  return c*curtains*folds*h*north*night*.45*uAurora;
}
vec3 rainbow(vec3 rd,float weather){
  vec3 anti=-normalize(uSunDir);float mu=clamp(dot(rd,anti),-1.0,1.0);float ang=acos(mu);
  float primary=exp(-pow((ang-.733)/.018,2.0)),secondary=exp(-pow((ang-.89)/.026,2.0))*.28;
  float x=clamp((ang-.70)/.07,0.0,1.0);vec3 spectral=clamp(abs(mod(x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);
  float sunVisible=smoothstep(.04,.28,uDaylight),rainAmt=smoothstep(.28,.78,weather)*(1.0-smoothstep(.78,1.0,weather));
  return spectral*(primary+secondary)*rainAmt*sunVisible*.48*uRainbow;
}
vec3 rainStreaks(vec2 uv,float weather){
  if(weather<.52)return vec3(0.0);vec2 p=uv*uResolution/vec2(8.0,18.0);p.x+=p.y*.22;float id=floor(p.x);float y=fract(p.y+uTime*(1.8+hash11(id)*1.5)+hash11(id*7.31));float x=abs(fract(p.x)-.5);float streak=smoothstep(.08,.0,x)*smoothstep(.62,.08,y)*smoothstep(.0,.22,y);return vec3(.62,.72,.82)*streak*(weather-.5)*.24*uRain;
}
void main(){
  vec3 base=texture2D(tScene,vUv).rgb;float depth=texture2D(tDepth,vUv).x;
  vec3 farP=worldFar(vUv),rd=normalize(farP-uCameraPos);float night=clamp(1.0-uDaylight-uTwilight*.28,0.0,1.0);
  if(depth>.9995){
    vec4 low=raymarchLowClouds(uCameraPos,rd),high=highClouds(rd);vec3 c=mix(base,high.rgb,high.a);c=mix(c,low.rgb,low.a);
    c+=aurora(rd,night)+rainbow(rd,uWeather);float lightningPulse=0.0;
    if(uLightning>.5&&uWeather>.78){float cell=floor(uTime*.22);float chance=step(.965,hash11(cell*13.7));lightningPulse=chance*exp(-fract(uTime*.22)*18.0);}
    c+=vec3(.72,.80,1.0)*lightningPulse*.8;c+=rainStreaks(vUv,uWeather);gl_FragColor=vec4(c,1.0);return;
  }
  vec3 wp=worldPos(vUv,depth);float sh=cloudShadowAt(wp);base*=mix(1.0,sh,.62);
  float rainy=smoothstep(.35,.9,uWeather);base=mix(base,base*vec3(.78,.87,.96),rainy*.16);base+=rainStreaks(vUv,uWeather);
  gl_FragColor=vec4(base,1.0);
}`});
    this.scene=new THREE.Scene();this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
  }
  configure(patch={}){
    Object.assign(this.settings,patch||{});
    this.settings.weather=clamp(Number(this.settings.weather)||0,0,1);
    this.settings.cloudCoverage=clamp(Number(this.settings.cloudCoverage)||.48,.05,.95);
    this.settings.cloudDensity=clamp(Number(this.settings.cloudDensity)||.7,.05,2);
    this.settings.lowCloudSteps=Math.round(clamp(Number(this.settings.lowCloudSteps)||12,6,24));
    this.settings.cloudShadowSteps=Math.round(clamp(Number(this.settings.cloudShadowSteps)||3,1,4));
    return this.stats();
  }
  resize(w,h){w=Math.max(1,Math.round(w||1));h=Math.max(1,Math.round(h||1));if(w===this.size.w&&h===this.size.h)return;this.size={w,h};this.target.setSize(w,h);this.uniforms.uResolution.value.set(w,h)}
  _weather(time,daylight){
    const t=Number(time)||0;if(!this.settings.autoWeather)return this.settings.weather;
    const slow=.5+.5*Math.sin(t*.0071+1.7),front=.5+.5*Math.sin(t*.0193-2.4),noise=.5+.5*Math.sin(t*.0037+Math.sin(t*.00091)*4.0);
    return clamp(this.settings.weather*.55+slow*.22+front*.14+noise*.12-(daylight>.65?.03:0),0,1);
  }
  render({sceneTexture,sceneDepth,atmosphere=null}={}){
    if(!this.settings.enabled||!sceneTexture||!sceneDepth)return sceneTexture;
    this.camera.updateMatrixWorld();this.invViewProj.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse).invert();
    const a=atmosphere?.state||{},u=this.uniforms,time=(Number(a.time)||0)/60,weather=this._weather(time,Number(a.daylight)||0);this.lastWeather=weather;
    u.tScene.value=sceneTexture;u.tDepth.value=sceneDepth;u.uInvViewProj.value.copy(this.invViewProj);u.uCameraPos.value.copy(this.camera.position);
    u.uTime.value=time;u.uDaylight.value=Number(a.daylight)||0;u.uTwilight.value=Number(a.twilight)||0;u.uWeather.value=weather;u.uCoverage.value=this.settings.cloudCoverage;u.uDensity.value=this.settings.cloudDensity;
    u.uLowSteps.value=this.settings.lowCloudSteps;u.uShadowSteps.value=this.settings.cloudShadowSteps;u.uCirrus.value=this.settings.cirrus?1:0;u.uAlto.value=this.settings.altocumulus?1:0;u.uNoct.value=this.settings.noctilucent?1:0;u.uCloudShadows.value=this.settings.cloudShadows?1:0;u.uRain.value=this.settings.rain?1:0;u.uAurora.value=this.settings.aurora?1:0;u.uRainbow.value=this.settings.rainbow?1:0;u.uLightning.value=this.settings.lightning?1:0;
    if(atmosphere){u.uSunDir.value.copy(atmosphere.sunDirection||u.uSunDir.value);u.uSunColor.value.copy(atmosphere.volumeUniforms?.uSunColor?.value||u.uSunColor.value)}
    const old=this.renderer.getRenderTarget(),auto=this.renderer.autoClear;this.renderer.setRenderTarget(this.target);this.renderer.autoClear=true;this.renderer.setClearColor(0x000000,1);this.renderer.clear(true,false,false);this.renderer.render(this.scene,this.fsCamera);this.renderer.setRenderTarget(old);this.renderer.autoClear=auto;this.renderCount++;return this.target.texture;
  }
  stats(){return {enabled:!!this.settings.enabled,mode:'photon-multilayer-weather-sky-r1',weather:this.lastWeather,autoWeather:!!this.settings.autoWeather,cloudTypes:['cumulus','cirrus','altocumulus','noctilucent'],volumetricLowClouds:true,cloudSelfShadow:true,groundCloudShadows:!!this.settings.cloudShadows,rain:!!this.settings.rain,lightning:!!this.settings.lightning,aurora:!!this.settings.aurora,rainbow:!!this.settings.rainbow,renders:this.renderCount}}
  dispose(){this.target.dispose();this.material.dispose();this.geometry.dispose()}
}
