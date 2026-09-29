import {PhotonWaterPass} from './PhotonWaterPass.js?v=photon-r1';
function installPhotonPCSS(THREE){
  const key='shadowmap_pars_fragment',source=THREE.ShaderChunk?.[key];if(!source||source.includes('PAPERCHALK_PHOTON_PCSS'))return false;
  const a=source.indexOf('#elif defined( SHADOWMAP_TYPE_PCF_SOFT )'),b=source.indexOf('#elif defined( SHADOWMAP_TYPE_VSM )',a);if(a<0||b<0)return false;
  const branch=`#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
            // PAPERCHALK_PHOTON_PCSS: blocker search + variable penumbra filtering.
            vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
            float seed = fract( sin( dot( gl_FragCoord.xy, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
            float searchRadius = 2.0 + max( 0.0, shadowRadius ) * 1.65;
            float blockerDepth = 0.0;
            float blockerCount = 0.0;
            for ( int i = 0; i < 8; i ++ ) {
                float fi = float( i );
                float ang = fi * 2.39996323 + seed * 6.2831853;
                float rad = sqrt( ( fi + 0.5 ) / 8.0 ) * searchRadius;
                vec2 off = vec2( cos( ang ), sin( ang ) ) * texelSize * rad;
                float d = unpackRGBAToDepth( texture2D( shadowMap, shadowCoord.xy + off ) );
                float blocked = step( d + 0.00004, shadowCoord.z );
                blockerDepth += d * blocked;
                blockerCount += blocked;
            }
            if ( blockerCount < 0.5 ) {
                shadow = 1.0;
            } else {
                float avgBlocker = blockerDepth / blockerCount;
                float receiverGap = max( 0.0, shadowCoord.z - avgBlocker );
                float penumbra = clamp( receiverGap / max( avgBlocker, 0.0005 ) * ( 18.0 + shadowRadius * 7.0 ), 1.0, 12.0 );
                shadow = 0.0;
                for ( int i = 0; i < 16; i ++ ) {
                    float fi = float( i );
                    float ang = fi * 2.39996323 + seed * 6.2831853;
                    float rad = sqrt( ( fi + 0.5 ) / 16.0 ) * penumbra;
                    vec2 off = vec2( cos( ang ), sin( ang ) ) * texelSize * rad;
                    shadow += texture2DCompare( shadowMap, shadowCoord.xy + off, shadowCoord.z );
                }
                shadow *= 0.0625;
            }
        `;
  THREE.ShaderChunk[key]=source.slice(0,a)+branch+source.slice(b);
  return true;
}

const FS_VERT=`
varying vec2 vUv;
void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
`;

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function halton(i,b){let f=1,r=0;for(let n=i;n>0;n=Math.floor(n/b)){f/=b;r+=f*(n%b)}return r}

function makeTarget(THREE,w=1,h=1,{depth=false,linear=true}={}){
  const t=new THREE.WebGLRenderTarget(w,h,{
    minFilter:linear?THREE.LinearFilter:THREE.NearestFilter,
    magFilter:linear?THREE.LinearFilter:THREE.NearestFilter,
    format:THREE.RGBAFormat,
    type:THREE.UnsignedByteType,
    depthBuffer:!!depth,
    stencilBuffer:false
  });
  if(depth){
    t.depthTexture=new THREE.DepthTexture(w,h,THREE.UnsignedIntType);
    t.depthTexture.format=THREE.DepthFormat;
    t.depthTexture.type=THREE.UnsignedIntType;
    t.depthTexture.minFilter=THREE.NearestFilter;
    t.depthTexture.magFilter=THREE.NearestFilter;
  }
  return t;
}

function fullScreenScene(THREE,material){
  const scene=new THREE.Scene();
  const geometry=new THREE.PlaneGeometry(2,2);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.frustumCulled=false;scene.add(mesh);
  return {scene,geometry,mesh};
}

export class PhotonPipeline{
  constructor(THREE,{renderer,scene,camera,mobileLike=false}={}){
    this.THREE=THREE;this.renderer=renderer;this.scene=scene;this.camera=camera;this.mobileLike=!!mobileLike;this.pcssInstalled=installPhotonPCSS(THREE);
    this.settings={
      enabled:true,
      taa:!this.mobileLike,
      gtao:true,
      bloom:true,
      clouds:true,
      fxaa:true,
      cas:true,
      dof:false,
      motionBlur:false,
      water:true,
      ssr:true,
      aoStrength:this.mobileLike?.42:.55,
      aoRadius:this.mobileLike?.75:1.05,
      bloomStrength:this.mobileLike?.12:.18,
      bloomThreshold:.82,
      sharpen:this.mobileLike?.22:.32,
      cloudCoverage:.46,
      cloudDensity:this.mobileLike?.58:.72,
      cloudSteps:this.mobileLike?10:18,
      cloudShadowSteps:this.mobileLike?2:4,
      taaHistory:.88,
      focusDistance:12,
      focusRange:7,
      motionBlurStrength:.45,
      pcssLightSize:this.mobileLike?1.8:2.8
    };
    this.size={width:1,height:1,pixelRatio:1,bufferWidth:1,bufferHeight:1};
    this.frame=0;this.historyValid=false;this.renderCount=0;
    this.prevViewProj=new THREE.Matrix4();this.currentViewProj=new THREE.Matrix4();this.invViewProj=new THREE.Matrix4();
    this.savedProjection=new THREE.Matrix4();this.savedProjectionInverse=new THREE.Matrix4();
    this.clearColor=new THREE.Color();
    this.fsCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);

    this.waterPass=new PhotonWaterPass(THREE,{renderer,scene,camera,mobileLike:this.mobileLike});
    this.sceneTarget=makeTarget(THREE,1,1,{depth:true});
    this.sceneTarget.texture.name='paperchalk-photon-scene';
    this.workA=makeTarget(THREE);this.workB=makeTarget(THREE);
    this.aoA=makeTarget(THREE);this.aoB=makeTarget(THREE);
    this.bloomA=makeTarget(THREE);this.bloomB=makeTarget(THREE);
    this.cloudTarget=makeTarget(THREE);this.cloudTarget.texture.name='paperchalk-photon-clouds';
    this.historyA=makeTarget(THREE);this.historyB=makeTarget(THREE);

    this.copyMaterial=new THREE.ShaderMaterial({
      uniforms:{tInput:{value:null}},depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:FS_VERT,
      fragmentShader:`varying vec2 vUv;uniform sampler2D tInput;void main(){gl_FragColor=texture2D(tInput,vUv);}`
    });
    this.copyPass=fullScreenScene(THREE,this.copyMaterial);

    this.aoMaterial=new THREE.ShaderMaterial({
      uniforms:{
        tDepth:{value:this.sceneTarget.depthTexture},uInvProjection:{value:new THREE.Matrix4()},
        uResolution:{value:new THREE.Vector2(1,1)},uRadius:{value:this.settings.aoRadius},uStrength:{value:this.settings.aoStrength},uFrame:{value:0}
      },depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,
      fragmentShader:`
        precision highp float;varying vec2 vUv;uniform sampler2D tDepth;uniform mat4 uInvProjection;uniform vec2 uResolution;uniform float uRadius,uStrength,uFrame;
        float depthAt(vec2 uv){return texture2D(tDepth,clamp(uv,vec2(.001),vec2(.999))).x;}
        vec3 viewPos(vec2 uv,float d){vec4 c=vec4(uv*2.0-1.0,d*2.0-1.0,1.0);vec4 v=uInvProjection*c;return v.xyz/max(1e-6,v.w);}
        float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
        void main(){
          float d=depthAt(vUv);if(d>=.99998){gl_FragColor=vec4(1.0);return;}
          vec2 px=1.0/uResolution;vec3 p=viewPos(vUv,d);
          vec3 pr=viewPos(vUv+vec2(px.x,0.0),depthAt(vUv+vec2(px.x,0.0)));
          vec3 pu=viewPos(vUv+vec2(0.0,px.y),depthAt(vUv+vec2(0.0,px.y)));
          vec3 n=normalize(cross(pr-p,pu-p));if(n.z>0.0)n=-n;
          float angle=6.2831853*hash21(gl_FragCoord.xy+uFrame*13.7);float occ=0.0;float taps=0.0;
          for(int dir=0;dir<8;dir++){
            float a=angle+float(dir)*.78539816;vec2 dv=vec2(cos(a),sin(a));
            for(int stepI=1;stepI<=3;stepI++){
              float sf=float(stepI)/3.0;float screenRadius=uRadius*(.018+.022*sf)/max(.7,abs(p.z)*.075);
              vec2 suv=vUv+dv*screenRadius;float sd=depthAt(suv);if(sd>=.99998)continue;
              vec3 q=viewPos(suv,sd);vec3 delta=q-p;float dist=length(delta);if(dist<1e-4)continue;
              float horizon=max(0.0,dot(n,delta/dist)-.035);float falloff=exp(-dist*1.35/uRadius);
              occ+=horizon*falloff;taps+=1.0;
            }
          }
          float ao=1.0-uStrength*clamp(occ/max(1.0,taps)*3.2,0.0,1.0);ao=clamp(ao,.32,1.0);gl_FragColor=vec4(vec3(ao),1.0);
        }`
    });
    this.aoPass=fullScreenScene(THREE,this.aoMaterial);

    this.blurMaterial=new THREE.ShaderMaterial({
      uniforms:{tInput:{value:null},tDepth:{value:this.sceneTarget.depthTexture},uResolution:{value:new THREE.Vector2(1,1)},uDirection:{value:new THREE.Vector2(1,0)}},
      depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,
      fragmentShader:`
        varying vec2 vUv;uniform sampler2D tInput,tDepth;uniform vec2 uResolution,uDirection;
        void main(){vec2 px=uDirection/uResolution;float d0=texture2D(tDepth,vUv).x;float sum=0.0,wSum=0.0;
          for(int i=-4;i<=4;i++){float fi=float(i);vec2 uv=vUv+px*fi;float d=texture2D(tDepth,uv).x;float spatial=exp(-fi*fi*.18);float dw=exp(-abs(d-d0)*180.0);float w=spatial*dw;sum+=texture2D(tInput,uv).r*w;wSum+=w;}
          float v=sum/max(.0001,wSum);gl_FragColor=vec4(vec3(v),1.0);}
      `
    });
    this.blurPass=fullScreenScene(THREE,this.blurMaterial);

    this.bloomExtractMaterial=new THREE.ShaderMaterial({
      uniforms:{tInput:{value:this.sceneTarget.texture},uThreshold:{value:this.settings.bloomThreshold}},depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,
      fragmentShader:`varying vec2 vUv;uniform sampler2D tInput;uniform float uThreshold;void main(){vec3 c=texture2D(tInput,vUv).rgb;float l=max(max(c.r,c.g),c.b);float k=smoothstep(uThreshold,uThreshold+.22,l);gl_FragColor=vec4(c*k,1.0);}`
    });
    this.bloomExtractPass=fullScreenScene(THREE,this.bloomExtractMaterial);
    this.gaussMaterial=new THREE.ShaderMaterial({
      uniforms:{tInput:{value:null},uResolution:{value:new THREE.Vector2(1,1)},uDirection:{value:new THREE.Vector2(1,0)}},depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,
      fragmentShader:`varying vec2 vUv;uniform sampler2D tInput;uniform vec2 uResolution,uDirection;void main(){vec2 p=uDirection/uResolution;vec3 c=texture2D(tInput,vUv).rgb*.227027;c+=texture2D(tInput,vUv+p*1.384615).rgb*.316216;c+=texture2D(tInput,vUv-p*1.384615).rgb*.316216;c+=texture2D(tInput,vUv+p*3.230769).rgb*.070270;c+=texture2D(tInput,vUv-p*3.230769).rgb*.070270;gl_FragColor=vec4(c,1.0);}`
    });
    this.gaussPass=fullScreenScene(THREE,this.gaussMaterial);

    this.cloudMaterial=new THREE.ShaderMaterial({
      uniforms:{
        tDepth:{value:this.sceneTarget.depthTexture},uInvViewProj:{value:this.invViewProj},uCameraPos:{value:new THREE.Vector3()},uSunDir:{value:new THREE.Vector3(0,1,0)},uSunColor:{value:new THREE.Color(1,.88,.72)},
        uTime:{value:0},uCoverage:{value:this.settings.cloudCoverage},uDensity:{value:this.settings.cloudDensity},uSteps:{value:this.settings.cloudSteps},uShadowSteps:{value:this.settings.cloudShadowSteps}
      },transparent:true,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,
      fragmentShader:`
        precision highp float;varying vec2 vUv;uniform sampler2D tDepth;uniform mat4 uInvViewProj;uniform vec3 uCameraPos,uSunDir,uSunColor;uniform float uTime,uCoverage,uDensity,uSteps,uShadowSteps;
        float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
        float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float n000=hash31(i),n100=hash31(i+vec3(1,0,0)),n010=hash31(i+vec3(0,1,0)),n110=hash31(i+vec3(1,1,0));float n001=hash31(i+vec3(0,0,1)),n101=hash31(i+vec3(1,0,1)),n011=hash31(i+vec3(0,1,1)),n111=hash31(i+vec3(1,1,1));return mix(mix(mix(n000,n100,f.x),mix(n010,n110,f.x),f.y),mix(mix(n001,n101,f.x),mix(n011,n111,f.x),f.y),f.z);}
        float fbm(vec3 p){float a=.55,s=0.0;s+=noise3(p)*a;p=p*2.03+17.1;a*=.5;s+=noise3(p)*a;p=p*2.01+9.7;a*=.5;s+=noise3(p)*a;return s;}
        float cloudDensity(vec3 p){float h=smoothstep(15.0,18.5,p.y)*(1.0-smoothstep(27.0,31.0,p.y));vec3 q=p*.055+vec3(uTime*.006,0.0,uTime*.0025);float macro=fbm(q);float wisps=fbm(q*2.6+31.0)*.22;float threshold=mix(.72,.38,uCoverage);return max(0.0,(macro+wisps-threshold)*uDensity*2.5)*h;}
        vec3 worldAtFar(vec2 uv){vec4 c=vec4(uv*2.0-1.0,1.0,1.0);vec4 w=uInvViewProj*c;return w.xyz/max(1e-6,w.w);}
        void main(){
          float sceneDepth=texture2D(tDepth,vUv).x;if(sceneDepth<.9995){gl_FragColor=vec4(0.0);return;}
          vec3 farP=worldAtFar(vUv);vec3 rd=normalize(farP-uCameraPos);if(rd.y<=.015){gl_FragColor=vec4(0.0);return;}
          float t0=(15.0-uCameraPos.y)/rd.y,t1=(31.0-uCameraPos.y)/rd.y;if(t1<=0.0){gl_FragColor=vec4(0.0);return;}t0=max(0.0,t0);
          float steps=max(1.0,uSteps),dt=max(.18,(t1-t0)/steps);float jitter=hash31(vec3(gl_FragCoord.xy,fract(uTime)))-.5;float t=t0+dt*(.5+jitter*.35);float trans=1.0;vec3 col=vec3(0.0);
          for(int i=0;i<24;i++){if(float(i)>=uSteps||t>=t1||trans<.025)break;vec3 p=uCameraPos+rd*t;float den=cloudDensity(p);if(den>.002){float sh=1.0;vec3 sp=p;float sdt=2.25;for(int j=0;j<4;j++){if(float(j)>=uShadowSteps)break;sp+=normalize(uSunDir)*sdt;sh*=exp(-cloudDensity(sp)*.75*sdt);}float phase=.45+.55*pow(max(0.0,dot(rd,normalize(uSunDir))),6.0);vec3 light=mix(vec3(.34,.39,.47),uSunColor,.72)*(.28+.72*sh)*phase;float a=1.0-exp(-den*dt*.75);col+=trans*light*a;trans*=1.0-a;}t+=dt;}
          gl_FragColor=vec4(col,1.0-trans);
        }`
    });
    this.cloudPass=fullScreenScene(THREE,this.cloudMaterial);

    this.compositeMaterial=new THREE.ShaderMaterial({
      uniforms:{tScene:{value:this.sceneTarget.texture},tAO:{value:this.aoA.texture},tBloom:{value:this.bloomA.texture},tCloud:{value:this.cloudTarget.texture},uBloomStrength:{value:this.settings.bloomStrength},uUseAO:{value:1},uUseBloom:{value:1},uUseCloud:{value:1}},
      depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,
      fragmentShader:`varying vec2 vUv;uniform sampler2D tScene,tAO,tBloom,tCloud;uniform float uBloomStrength,uUseAO,uUseBloom,uUseCloud;void main(){vec3 c=texture2D(tScene,vUv).rgb;float ao=mix(1.0,texture2D(tAO,vUv).r,uUseAO);c*=ao;vec4 cloud=texture2D(tCloud,vUv);c=mix(c,cloud.rgb,cloud.a*uUseCloud);c+=texture2D(tBloom,vUv).rgb*uBloomStrength*uUseBloom;gl_FragColor=vec4(c,1.0);}`
    });
    this.compositePass=fullScreenScene(THREE,this.compositeMaterial);

    this.temporalMaterial=new THREE.ShaderMaterial({
      uniforms:{tCurrent:{value:this.workA.texture},tHistory:{value:this.historyA.texture},tDepth:{value:this.sceneTarget.depthTexture},uInvViewProj:{value:this.invViewProj},uPrevViewProj:{value:this.prevViewProj},uResolution:{value:new THREE.Vector2(1,1)},uHistory:{value:this.settings.taaHistory},uHistoryValid:{value:0}},
      depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,
      fragmentShader:`
        precision highp float;varying vec2 vUv;uniform sampler2D tCurrent,tHistory,tDepth;uniform mat4 uInvViewProj,uPrevViewProj;uniform vec2 uResolution;uniform float uHistory,uHistoryValid;
        vec3 worldPos(vec2 uv,float d){vec4 c=vec4(uv*2.0-1.0,d*2.0-1.0,1.0);vec4 w=uInvViewProj*c;return w.xyz/max(1e-6,w.w);}
        void main(){vec3 curr=texture2D(tCurrent,vUv).rgb;if(uHistoryValid<.5){gl_FragColor=vec4(curr,1.0);return;}float d=texture2D(tDepth,vUv).x;vec3 wp=worldPos(vUv,d);vec4 pc=uPrevViewProj*vec4(wp,1.0);vec2 puv=pc.xy/max(1e-6,pc.w)*.5+.5;if(any(lessThan(puv,vec2(.002)))||any(greaterThan(puv,vec2(.998)))){gl_FragColor=vec4(curr,1.0);return;}vec3 hist=texture2D(tHistory,puv).rgb;vec2 px=1.0/uResolution;vec3 mn=curr,mx=curr;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec3 s=texture2D(tCurrent,vUv+vec2(float(x),float(y))*px).rgb;mn=min(mn,s);mx=max(mx,s);}hist=clamp(hist,mn,mx);float motion=length(puv-vUv);float keep=uHistory*mix(1.0,.45,smoothstep(.002,.035,motion));gl_FragColor=vec4(mix(curr,hist,keep),1.0);}`
    });
    this.temporalPass=fullScreenScene(THREE,this.temporalMaterial);

    this.finalMaterial=new THREE.ShaderMaterial({
      uniforms:{tInput:{value:this.workA.texture},tDepth:{value:this.sceneTarget.depthTexture},uResolution:{value:new THREE.Vector2(1,1)},uSharpen:{value:this.settings.sharpen},uFXAA:{value:1},uCAS:{value:1},uDOF:{value:0},uMotionBlur:{value:0},uFocusDistance:{value:this.settings.focusDistance},uFocusRange:{value:this.settings.focusRange},uMotionStrength:{value:this.settings.motionBlurStrength},uInvViewProj:{value:this.invViewProj},uPrevViewProj:{value:this.prevViewProj}},
      depthTest:false,depthWrite:false,toneMapped:false,vertexShader:FS_VERT,
      fragmentShader:`
        precision highp float;varying vec2 vUv;uniform sampler2D tInput,tDepth;uniform vec2 uResolution;uniform float uSharpen,uFXAA,uCAS,uDOF,uMotionBlur,uFocusDistance,uFocusRange,uMotionStrength;uniform mat4 uInvViewProj,uPrevViewProj;
        float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}vec3 toSRGB(vec3 c){vec3 lo=c*12.92;vec3 hi=1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055;return mix(lo,hi,step(vec3(.0031308),c));}
        vec3 sampleFxaa(vec2 uv){vec2 px=1.0/uResolution;vec3 c=texture2D(tInput,uv).rgb;float m=luma(c),n=luma(texture2D(tInput,uv+vec2(0,px.y)).rgb),s=luma(texture2D(tInput,uv-vec2(0,px.y)).rgb),e=luma(texture2D(tInput,uv+vec2(px.x,0)).rgb),w=luma(texture2D(tInput,uv-vec2(px.x,0)).rgb);float lo=min(m,min(min(n,s),min(e,w))),hi=max(m,max(max(n,s),max(e,w)));if(hi-lo<max(.035,hi*.125))return c;vec2 dir=vec2(-(n-s),e-w);dir=clamp(dir/(abs(dir.x)+abs(dir.y)+1e-5),vec2(-1),vec2(1))*px;return (texture2D(tInput,uv+dir*.5).rgb+texture2D(tInput,uv-dir*.5).rgb)*.5;}
        vec3 worldPos(vec2 uv,float d){vec4 c=vec4(uv*2.0-1.0,d*2.0-1.0,1.0);vec4 w=uInvViewProj*c;return w.xyz/max(1e-6,w.w);}
        void main(){vec2 px=1.0/uResolution;vec3 c=uFXAA>.5?sampleFxaa(vUv):texture2D(tInput,vUv).rgb;float d=texture2D(tDepth,vUv).x;
          if(uMotionBlur>.5&&d<.9999){vec3 wp=worldPos(vUv,d);vec4 pc=uPrevViewProj*vec4(wp,1.0);vec2 puv=pc.xy/max(1e-6,pc.w)*.5+.5;vec2 vel=clamp(vUv-puv,vec2(-.03),vec2(.03))*uMotionStrength;vec3 mb=c;for(int i=1;i<=4;i++)mb+=texture2D(tInput,vUv-vel*(float(i)/4.0)).rgb;c=mb/5.0;}
          if(uDOF>.5&&d<.9999){vec3 wp=worldPos(vUv,d);float dist=length(wp);float coc=clamp(abs(dist-uFocusDistance)/max(.1,uFocusRange),0.0,1.0);vec2 r=px*(1.0+4.0*coc);vec3 b=c;b+=texture2D(tInput,vUv+vec2(r.x,0)).rgb;b+=texture2D(tInput,vUv-vec2(r.x,0)).rgb;b+=texture2D(tInput,vUv+vec2(0,r.y)).rgb;b+=texture2D(tInput,vUv-vec2(0,r.y)).rgb;c=mix(c,b/5.0,coc*.7);}
          if(uCAS>.5){vec3 avg=(texture2D(tInput,vUv+vec2(px.x,0)).rgb+texture2D(tInput,vUv-vec2(px.x,0)).rgb+texture2D(tInput,vUv+vec2(0,px.y)).rgb+texture2D(tInput,vUv-vec2(0,px.y)).rgb)*.25;c+=clamp(c-avg,-.18,.18)*uSharpen;}
          gl_FragColor=vec4(toSRGB(max(c,vec3(0.0))),1.0);}
      `
    });
    this.finalPass=fullScreenScene(THREE,this.finalMaterial);this._syncShadowSoftness();
  }

  _syncShadowSoftness(){this.scene?.traverse?.(o=>{if(o?.isDirectionalLight&&o.castShadow&&o.shadow)o.shadow.radius=this.settings.pcssLightSize});}

  configure(patch={}){
    Object.assign(this.settings,patch||{});
    this.settings.aoStrength=clamp(Number(this.settings.aoStrength)||0,0,1.4);
    this.settings.aoRadius=clamp(Number(this.settings.aoRadius)||1,.25,3);
    this.settings.bloomStrength=clamp(Number(this.settings.bloomStrength)||0,0,1.2);
    this.settings.bloomThreshold=clamp(Number(this.settings.bloomThreshold)||.8,.25,1.5);
    this.settings.sharpen=clamp(Number(this.settings.sharpen)||0,0,1);
    this.settings.cloudCoverage=clamp(Number(this.settings.cloudCoverage)||.45,.05,.95);
    this.settings.cloudDensity=clamp(Number(this.settings.cloudDensity)||.7,.05,2);
    this.settings.cloudSteps=Math.round(clamp(Number(this.settings.cloudSteps)||12,6,24));
    this.settings.cloudShadowSteps=Math.round(clamp(Number(this.settings.cloudShadowSteps)||3,1,4));
    this.settings.taaHistory=clamp(Number(this.settings.taaHistory)||.88,.35,.97);
    this.waterPass.configure({enabled:this.settings.water!==false,ssr:this.settings.ssr!==false,...(patch.waterOptions||{})});
    this.settings.pcssLightSize=clamp(Number(this.settings.pcssLightSize)||2.4,.5,6);this._syncShadowSoftness();
    this.historyValid=false;return this.stats();
  }

  resize(width,height,pixelRatio=1){
    const w=Math.max(1,Math.round(width||1)),h=Math.max(1,Math.round(height||1)),pr=clamp(Number(pixelRatio)||1,1,2);
    const bw=Math.max(1,Math.round(w*pr)),bh=Math.max(1,Math.round(h*pr));if(bw===this.size.bufferWidth&&bh===this.size.bufferHeight)return;
    this.sceneTarget.setSize(bw,bh);this.waterPass.resize(bw,bh);this.workA.setSize(bw,bh);this.workB.setSize(bw,bh);this.historyA.setSize(bw,bh);this.historyB.setSize(bw,bh);
    const aw=Math.max(1,Math.round(bw*(this.mobileLike?.5:.65))),ah=Math.max(1,Math.round(bh*(this.mobileLike?.5:.65)));this.aoA.setSize(aw,ah);this.aoB.setSize(aw,ah);
    const blw=Math.max(1,Math.round(bw*.25)),blh=Math.max(1,Math.round(bh*.25));this.bloomA.setSize(blw,blh);this.bloomB.setSize(blw,blh);
    const cw=Math.max(1,Math.round(bw*(this.mobileLike?.32:.46))),ch=Math.max(1,Math.round(bh*(this.mobileLike?.32:.46)));this.cloudTarget.setSize(cw,ch);
    this.aoMaterial.uniforms.uResolution.value.set(aw,ah);this.blurMaterial.uniforms.uResolution.value.set(aw,ah);this.gaussMaterial.uniforms.uResolution.value.set(blw,blh);
    this.temporalMaterial.uniforms.uResolution.value.set(bw,bh);this.finalMaterial.uniforms.uResolution.value.set(bw,bh);
    this.size={width:w,height:h,pixelRatio:pr,bufferWidth:bw,bufferHeight:bh,ao:[aw,ah],bloom:[blw,blh],cloud:[cw,ch]};this.historyValid=false;
  }

  _renderPass(pass,target,{clear=true}={}){const r=this.renderer;r.setRenderTarget(target);if(clear){r.setClearColor(0x000000,0);r.clear(true,false,false)}r.render(pass.scene,this.fsCamera)}

  _jitterCamera(){
    if(!this.settings.taa)return;
    this.savedProjection.copy(this.camera.projectionMatrix);this.savedProjectionInverse.copy(this.camera.projectionMatrixInverse);
    const i=(this.frame%8)+1,jx=halton(i,2)-.5,jy=halton(i,3)-.5,e=this.camera.projectionMatrix.elements;
    e[8]+=jx*2/this.size.bufferWidth;e[9]+=jy*2/this.size.bufferHeight;this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }
  _restoreCamera(){if(!this.settings.taa)return;this.camera.projectionMatrix.copy(this.savedProjection);this.camera.projectionMatrixInverse.copy(this.savedProjectionInverse)}

  render({atmosphere=null}={}){
    if(!this.settings.enabled)return false;
    const r=this.renderer,oldTarget=r.getRenderTarget(),oldAutoClear=r.autoClear;atmosphere?.setLinearOutput?.(true);this._jitterCamera();
    this.camera.updateMatrixWorld();this.currentViewProj.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.invViewProj.copy(this.currentViewProj).invert();
    r.getClearColor(this.clearColor);const oldAlpha=r.getClearAlpha();
    try{
      r.setRenderTarget(this.sceneTarget);r.autoClear=true;r.clear(true,true,true);r.render(this.scene,this.camera);atmosphere?.render?.(r,this.scene,this.camera);
      const baseTexture=this.settings.water?this.waterPass.render({sceneTexture:this.sceneTarget.texture,sceneDepth:this.sceneTarget.depthTexture,time:(atmosphere?.state?.time||0)/60}):this.sceneTarget.texture;
      this.bloomExtractMaterial.uniforms.tInput.value=baseTexture;this.compositeMaterial.uniforms.tScene.value=baseTexture;

      if(this.settings.gtao){
        this.aoMaterial.uniforms.uInvProjection.value.copy(this.camera.projectionMatrixInverse);this.aoMaterial.uniforms.uRadius.value=this.settings.aoRadius;this.aoMaterial.uniforms.uStrength.value=this.settings.aoStrength;this.aoMaterial.uniforms.uFrame.value=this.frame;
        this._renderPass(this.aoPass,this.aoA);this.blurMaterial.uniforms.tInput.value=this.aoA.texture;this.blurMaterial.uniforms.uDirection.value.set(1,0);this._renderPass(this.blurPass,this.aoB);this.blurMaterial.uniforms.tInput.value=this.aoB.texture;this.blurMaterial.uniforms.uDirection.value.set(0,1);this._renderPass(this.blurPass,this.aoA);
      }
      if(this.settings.bloom){
        this.bloomExtractMaterial.uniforms.uThreshold.value=this.settings.bloomThreshold;this._renderPass(this.bloomExtractPass,this.bloomA);this.gaussMaterial.uniforms.tInput.value=this.bloomA.texture;this.gaussMaterial.uniforms.uDirection.value.set(1,0);this._renderPass(this.gaussPass,this.bloomB);this.gaussMaterial.uniforms.tInput.value=this.bloomB.texture;this.gaussMaterial.uniforms.uDirection.value.set(0,1);this._renderPass(this.gaussPass,this.bloomA);
      }
      if(this.settings.clouds){
        const au=this.cloudMaterial.uniforms;au.uInvViewProj.value.copy(this.invViewProj);au.uCameraPos.value.copy(this.camera.position);au.uCoverage.value=this.settings.cloudCoverage;au.uDensity.value=this.settings.cloudDensity;au.uSteps.value=this.settings.cloudSteps;au.uShadowSteps.value=this.settings.cloudShadowSteps;
        if(atmosphere){au.uSunDir.value.copy(atmosphere.sunDirection||au.uSunDir.value);au.uSunColor.value.copy(atmosphere.volumeUniforms?.uSunColor?.value||au.uSunColor.value);au.uTime.value=(atmosphere.state?.time||0)/60;}
        this._renderPass(this.cloudPass,this.cloudTarget);
      }

      const cu=this.compositeMaterial.uniforms;cu.uUseAO.value=this.settings.gtao?1:0;cu.uUseBloom.value=this.settings.bloom?1:0;cu.uUseCloud.value=this.settings.clouds?1:0;cu.uBloomStrength.value=this.settings.bloomStrength;this._renderPass(this.compositePass,this.workA);

      let finalTexture=this.workA.texture;
      if(this.settings.taa){
        const historyIn=(this.frame&1)?this.historyB:this.historyA,historyOut=(this.frame&1)?this.historyA:this.historyB,tu=this.temporalMaterial.uniforms;
        tu.tCurrent.value=this.workA.texture;tu.tHistory.value=historyIn.texture;tu.uInvViewProj.value.copy(this.invViewProj);tu.uPrevViewProj.value.copy(this.prevViewProj);tu.uHistory.value=this.settings.taaHistory;tu.uHistoryValid.value=this.historyValid?1:0;
        this._renderPass(this.temporalPass,historyOut);finalTexture=historyOut.texture;this.historyValid=true;
      }

      const fu=this.finalMaterial.uniforms;fu.tInput.value=finalTexture;fu.uSharpen.value=this.settings.sharpen;fu.uFXAA.value=this.settings.fxaa?1:0;fu.uCAS.value=this.settings.cas?1:0;fu.uDOF.value=this.settings.dof?1:0;fu.uMotionBlur.value=this.settings.motionBlur?1:0;fu.uFocusDistance.value=this.settings.focusDistance;fu.uFocusRange.value=this.settings.focusRange;fu.uMotionStrength.value=this.settings.motionBlurStrength;fu.uInvViewProj.value.copy(this.invViewProj);fu.uPrevViewProj.value.copy(this.prevViewProj);
      r.setRenderTarget(oldTarget);r.autoClear=true;r.setClearColor(0x000000,1);r.clear(true,false,false);r.render(this.finalPass.scene,this.fsCamera);
      this.prevViewProj.copy(this.currentViewProj);this.frame++;this.renderCount++;return true;
    }finally{
      atmosphere?.setLinearOutput?.(false);this._restoreCamera();r.setRenderTarget(oldTarget);r.autoClear=oldAutoClear;r.setClearColor(this.clearColor,oldAlpha);
    }
  }

  stats(){return {enabled:!!this.settings.enabled,mode:'photon-feature-port-r1',source:'sixthsurge/photon',featurePort:true,pcss:!!this.pcssInstalled,variablePenumbra:true,water:this.waterPass.stats(),taa:!!this.settings.taa,gtao:!!this.settings.gtao,bloom:!!this.settings.bloom,volumetricClouds:!!this.settings.clouds,fxaa:!!this.settings.fxaa,cas:!!this.settings.cas,dof:!!this.settings.dof,motionBlur:!!this.settings.motionBlur,historyReprojection:true,depthAwareAO:true,weatherCloudCoverage:this.settings.cloudCoverage,buffers:{scene:[this.size.bufferWidth,this.size.bufferHeight],ao:this.size.ao||[1,1],bloom:this.size.bloom||[1,1],cloud:this.size.cloud||[1,1]},renders:this.renderCount};}

  dispose(){this.waterPass.dispose();for(const t of [this.sceneTarget,this.workA,this.workB,this.aoA,this.aoB,this.bloomA,this.bloomB,this.cloudTarget,this.historyA,this.historyB])t.dispose();for(const p of [this.copyPass,this.aoPass,this.blurPass,this.bloomExtractPass,this.gaussPass,this.cloudPass,this.compositePass,this.temporalPass,this.finalPass])p.geometry.dispose();for(const m of [this.copyMaterial,this.aoMaterial,this.blurMaterial,this.bloomExtractMaterial,this.gaussMaterial,this.cloudMaterial,this.compositeMaterial,this.temporalMaterial,this.finalMaterial])m.dispose();}
}
