/* Minecraft-shader-inspired atmosphere for the paper diorama.
 * Default path is world-space volumetric scattering:
 * low-res camera depth + the real directional-light shadow map + jittered
 * raymarch + height haze + Henyey-Greenstein Mie phase.
 * This replaces the old screen-space radial-blur "god ray" look.
 */
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

export class AtmospherePass{
  constructor(THREE,scene,{mobileLike=false,sun=null}={}){
    this.THREE=THREE;this.scene=scene;this.sun=sun;this.mobileLike=!!mobileLike;
    this.settings={
      enabled:true,volumetric:true,
      intensity:this.mobileLike?.28:.36,
      fogDensity:this.mobileLike?.0032:.0038,
      heightFalloff:.14,anisotropy:.64,maxDistance:this.mobileLike?28:36,
      qualityScale:this.mobileLike?.30:.46,steps:this.mobileLike?11:19
    };
    this.state={strength:0,daylight:0,twilight:0,skyExposure:1,underground:0,time:0,fogBase:0};
    this.size={width:1,height:1,pixelRatio:1,bufferWidth:1,bufferHeight:1};
    this.clearColor=new THREE.Color();
    this.skyColor=new THREE.Color(0x7897be);
    this.zenithColor=new THREE.Color(0x6689b5);
    this.horizonColor=new THREE.Color(0xa8b8c4);
    this.dawnColor=new THREE.Color(0xd6a181);
    this.duskColor=new THREE.Color(0xc28f91);
    this.nightColor=new THREE.Color(0x18243d);
    this.nightHorizon=new THREE.Color(0x344158);
    this.sunDay=new THREE.Color(0xffedcf);
    this.sunHorizon=new THREE.Color(0xffb76c);
    this.fogColor=new THREE.Color(0x8da1b2);
    this.sunDirection=new THREE.Vector3(0,1,0);
    this.exclusions=[];
    this.renderCount=0;this.lastVisible=false;

    const lowOpts={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false};
    this.depthTarget=new THREE.WebGLRenderTarget(1,1,{...lowOpts,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
    this.depthTarget.texture.name='paperchalk-atmosphere-view-depth';
    this.volumeTarget=new THREE.WebGLRenderTarget(1,1,{...lowOpts,type:this.mobileLike?THREE.UnsignedByteType:THREE.HalfFloatType,depthBuffer:false});
    this.volumeTarget.texture.name='paperchalk-atmosphere-volume';
    this.depthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
    this.depthMaterial.blending=THREE.NoBlending;

    this.fsCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.fsGeometry=new THREE.PlaneGeometry(2,2);
    this.volumeUniforms={
      tDepth:{value:this.depthTarget.texture},tShadow:{value:null},
      uInvProjection:{value:new THREE.Matrix4()},uCameraWorld:{value:new THREE.Matrix4()},
      uCameraPos:{value:new THREE.Vector3()},uShadowMatrix:{value:new THREE.Matrix4()},
      uShadowMapSize:{value:new THREE.Vector2(1,1)},uSunDir:{value:this.sunDirection},
      uSunColor:{value:this.sunDay.clone()},uFogColor:{value:this.fogColor},
      uShadowBias:{value:-.0002},uIntensity:{value:0},
      uFogDensity:{value:this.settings.fogDensity},uFogBase:{value:0},
      uHeightFalloff:{value:this.settings.heightFalloff},uAnisotropy:{value:this.settings.anisotropy},
      uMaxDistance:{value:this.settings.maxDistance},uSteps:{value:this.settings.steps},
      uTime:{value:0},uResolution:{value:new THREE.Vector2(1,1)}
    };
    this.volumeMaterial=new THREE.ShaderMaterial({
      uniforms:this.volumeUniforms,depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:`
        varying vec2 vUv;
        void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
      `,
      fragmentShader:`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tDepth;
        uniform sampler2D tShadow;
        uniform mat4 uInvProjection;
        uniform mat4 uCameraWorld;
        uniform mat4 uShadowMatrix;
        uniform vec3 uCameraPos;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uFogColor;
        uniform vec2 uShadowMapSize;
        uniform vec2 uResolution;
        uniform float uShadowBias;
        uniform float uIntensity;
        uniform float uFogDensity;
        uniform float uFogBase;
        uniform float uHeightFalloff;
        uniform float uAnisotropy;
        uniform float uMaxDistance;
        uniform float uSteps;
        uniform float uTime;

        float unpackDepth(vec4 v){
          return dot(v,vec4(0.99609375,0.00389099121,0.00001519918,0.0000000596046));
        }
        float hash21(vec2 p){
          p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);
        }
        vec3 reconstructWorld(vec2 uv,float depth){
          vec4 clip=vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);
          vec4 view=uInvProjection*clip;view/=max(1e-6,view.w);
          return (uCameraWorld*view).xyz;
        }
        float shadowAt(vec3 p,float jitter){
          vec4 sc=uShadowMatrix*vec4(p,1.0);
          sc.xyz/=max(1e-6,sc.w);
          if(sc.x<=0.001||sc.x>=0.999||sc.y<=0.001||sc.y>=0.999||sc.z<=0.0||sc.z>=1.0)return 0.0;
          vec2 texel=1.0/max(uShadowMapSize,vec2(1.0));
          vec2 o=(vec2(fract(jitter*7.13),fract(jitter*13.71))-.5)*texel*1.35;
          float d0=unpackDepth(texture2D(tShadow,sc.xy+o));
          float d1=unpackDepth(texture2D(tShadow,sc.xy-o*.73));
          float cmp=sc.z+uShadowBias;
          return (step(cmp,d0)+step(cmp,d1))*.5;
        }
        float hg(float mu,float g){
          float g2=g*g;
          return (1.0-g2)/(12.56637*pow(max(0.025,1.0+g2-2.0*g*mu),1.5));
        }
        void main(){
          float depth=unpackDepth(texture2D(tDepth,vUv));
          vec3 endWorld=reconstructWorld(vUv,min(depth,.999999));
          vec3 delta=endWorld-uCameraPos;
          float surfaceDist=length(delta);
          vec3 rayDir=surfaceDist>1e-5?delta/surfaceDist:vec3(0.0,0.0,-1.0);
          float maxDist=min(uMaxDistance,depth>.9997?uMaxDistance:surfaceDist);
          float steps=max(1.0,uSteps);
          float stepLen=maxDist/steps;
          float noise=hash21(gl_FragCoord.xy+vec2(uTime*17.0,uTime*7.0));
          float t=(.22+noise*.72)*stepLen;
          float trans=1.0;
          float sunScatter=0.0;
          float mu=clamp(dot(rayDir,normalize(uSunDir)),-1.0,1.0);
          float phase=clamp(hg(mu,uAnisotropy),.018,.62);
          for(int i=0;i<20;i++){
            if(float(i)>=uSteps||t>=maxDist)break;
            vec3 p=uCameraPos+rayDir*t;
            float height=max(0.0,p.y-uFogBase);
            float density=uFogDensity*(.12+.88*exp(-height*uHeightFalloff));
            float lit=shadowAt(p,noise+float(i)*.6180339);
            lit*=lit;
            float absorb=exp(-density*stepLen*.58);
            sunScatter+=trans*lit*density*phase*stepLen;
            trans*=absorb;
            t+=stepLen;
          }
          float fogAlpha=clamp((1.0-trans)*.34,0.0,.115);
          float forwardBoost=smoothstep(.30,.97,mu);
          vec3 scatter=uSunColor*sunScatter*uIntensity*.16*(.74+forwardBoost*.62);
          float dither=(hash21(gl_FragCoord.xy*.713+vec2(uTime*.019,-uTime*.013))-.5)/255.0;
          fogAlpha=clamp(fogAlpha+dither*.42,0.0,.115);
          vec3 premul=uFogColor*fogAlpha+scatter+vec3(dither)*.18;
          gl_FragColor=vec4(max(premul,vec3(0.0)),fogAlpha);
        }
      `
    });
    this.volumeScene=new THREE.Scene();
    this.volumeScene.add(new THREE.Mesh(this.fsGeometry,this.volumeMaterial));

    this.compositeMaterial=new THREE.ShaderMaterial({
      uniforms:{tVolume:{value:this.volumeTarget.texture}},
      transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
      blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,
      blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
      vertexShader:`
        varying vec2 vUv;
        void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
      `,
      fragmentShader:`
        varying vec2 vUv;uniform sampler2D tVolume;
        vec3 toSRGB(vec3 c){
          vec3 lo=c*12.92;
          vec3 hi=1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055;
          return mix(lo,hi,step(vec3(.0031308),c));
        }
        void main(){
          vec4 v=texture2D(tVolume,vUv);
          gl_FragColor=vec4(toSRGB(max(v.rgb,vec3(0.0))),v.a);
        }
      `
    });
    this.compositeScene=new THREE.Scene();
    this.compositeScene.add(new THREE.Mesh(this.fsGeometry,this.compositeMaterial));

    this.skyUniforms={
      uZenith:{value:this.zenithColor},uHorizon:{value:this.horizonColor},
      uSunColor:{value:this.sunDay.clone()},uSunDir:{value:this.sunDirection},
      uTwilight:{value:0},uTime:{value:0}
    };
    this.skyMaterial=new THREE.ShaderMaterial({
      uniforms:this.skyUniforms,side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
      vertexShader:`
        varying vec3 vDir;
        void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
      `,
      fragmentShader:`
        precision highp float;
        varying vec3 vDir;
        uniform vec3 uZenith,uHorizon,uSunColor,uSunDir;
        uniform float uTwilight,uTime;
        float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}
        vec3 toSRGB(vec3 c){
          vec3 lo=c*12.92;vec3 hi=1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055;
          return mix(lo,hi,step(vec3(.0031308),c));
        }
        void main(){
          vec3 d=normalize(vDir);
          float h=clamp(d.y*.75+.40,0.0,1.0);
          float grad=smoothstep(.04,.92,pow(h,.76));
          vec3 col=mix(uHorizon,uZenith,grad);
          float mu=max(0.0,dot(d,normalize(uSunDir)));
          float glow=pow(mu,10.0)*(.105+uTwilight*.075);
          float disc=pow(mu,720.0)*.72;
          float grain=(hash21(floor(d.xz*850.0)+floor(d.y*410.0))-.5)*.012;
          col+=uSunColor*(glow+disc);
          col*=1.0+grain;
          gl_FragColor=vec4(toSRGB(max(col,vec3(0.0))),1.0);
        }
      `
    });
    this.skyMesh=new THREE.Mesh(new THREE.SphereGeometry(96,28,18),this.skyMaterial);
    this.skyMesh.name='minecraft-inspired-atmosphere-sky';
    this.skyMesh.frustumCulled=false;this.skyMesh.renderOrder=-10000;
    this.scene.add(this.skyMesh);

    this.scene.fog=new THREE.FogExp2(this.fogColor,.0015);
  }

  setExclusions(objects=[]){this.exclusions=(objects||[]).filter(Boolean);return this}
  configure(patch={}){
    Object.assign(this.settings,patch||{});
    this.settings.intensity=clamp(Number(this.settings.intensity)||0,0,1.6);
    this.settings.fogDensity=clamp(Number(this.settings.fogDensity)||0,0,.025);
    this.settings.heightFalloff=clamp(Number(this.settings.heightFalloff)||.1,.02,.35);
    this.settings.anisotropy=clamp(Number(this.settings.anisotropy)||.68,.0,.86);
    this.settings.maxDistance=clamp(Number(this.settings.maxDistance)||50,20,100);
    this.settings.qualityScale=clamp(Number(this.settings.qualityScale)||.35,.2,.65);
    this.settings.steps=Math.round(clamp(Number(this.settings.steps)||12,6,20));
    this.resize(this.size.width,this.size.height,this.size.pixelRatio);
    return this.stats();
  }

  resize(width,height,pixelRatio=1){
    const w=Math.max(1,Math.round(width||1)),h=Math.max(1,Math.round(height||1));
    const pr=clamp(Number(pixelRatio)||1,1,2),q=this.settings.qualityScale;
    const bw=Math.max(120,Math.round(w*pr*q)),bh=Math.max(72,Math.round(h*pr*q));
    if(bw!==this.size.bufferWidth||bh!==this.size.bufferHeight){
      this.depthTarget.setSize(bw,bh);this.volumeTarget.setSize(bw,bh);
    }
    this.size={width:w,height:h,pixelRatio:pr,bufferWidth:bw,bufferHeight:bh};
    this.volumeUniforms.uResolution.value.set(bw,bh);
  }

  update({sunPosition,daylight=0,twilight=0,skyExposure=1,underground=0,time=0,fogBaseHeight=0,sunLight=null,skyLight=null,sunDisc=null}={}){
    const d=clamp(daylight,0,1),tw=clamp(twilight,0,1),sky=clamp(skyExposure,0,1),under=clamp(underground,0,1);
    const minute=((Number(time)||0)%1440+1440)%1440,morning=minute<720;
    const lowSun=clamp(1-d*1.18,0,1);
    const active=d>.01?(d*.68+tw*.18)*(.64+lowSun*.58)*sky*(1-under):0;
    this.state={strength:active*this.settings.intensity,daylight:d,twilight:tw,skyExposure:sky,underground:under,time:Number(time)||0,fogBase:Number(fogBaseHeight)||0};

    const warm=morning?this.dawnColor:this.duskColor;
    const horizonDay=new this.THREE.Color(0x94afc3),zenithDay=new this.THREE.Color(0x527cab);
    const horizonMix=clamp((d-.06)/.48,0,1),zenithMix=clamp((d+.035)/.42,0,1);
    if(d>.005){
      this.horizonColor.copy(warm).lerp(horizonDay,horizonMix);
      this.zenithColor.copy(this.nightColor).lerp(zenithDay,zenithMix).lerp(warm,tw*.045);
    }else{
      this.horizonColor.copy(this.nightHorizon).lerp(warm,tw*.36);
      this.zenithColor.copy(this.nightColor).lerp(zenithDay,tw*.08);
    }
    this.skyColor.copy(this.horizonColor).lerp(this.zenithColor,.55);
    const sunColor=this.sunHorizon.clone().lerp(this.sunDay,clamp(d*1.35,0,1));
    this.fogColor.copy(this.horizonColor).lerp(this.zenithColor,.22);

    if(sunLight){
      sunLight.color.copy(sunColor);
      const target=sunLight.target?.position||new this.THREE.Vector3();
      this.sunDirection.copy(sunLight.position).sub(target).normalize();
    }else if(sunPosition)this.sunDirection.copy(sunPosition).normalize();
    if(skyLight){skyLight.color.copy(this.zenithColor);skyLight.groundColor.set(0x74604b)}
    if(sunDisc?.material?.color){
      sunDisc.material.color.copy(sunColor);
      sunDisc.visible=!this.settings.enabled&&d>.02;
    }

    this.skyUniforms.uSunColor.value.copy(sunColor);
    this.skyUniforms.uTwilight.value=tw;this.skyUniforms.uTime.value=Number(time)||0;
    this.volumeUniforms.uSunColor.value.copy(sunColor);
    this.volumeUniforms.uFogColor.value.copy(this.fogColor);
    this.volumeUniforms.uIntensity.value=this.state.strength;
    this.volumeUniforms.uFogDensity.value=this.settings.fogDensity*(1+tw*.14+lowSun*.08)*(1-under*.86);
    this.volumeUniforms.uFogBase.value=this.state.fogBase;
    this.volumeUniforms.uHeightFalloff.value=this.settings.heightFalloff;
    this.volumeUniforms.uAnisotropy.value=this.settings.anisotropy;
    this.volumeUniforms.uMaxDistance.value=this.settings.maxDistance;
    this.volumeUniforms.uSteps.value=this.settings.steps;
    this.volumeUniforms.uTime.value=this.state.time;
    this.scene.fog.density=this.settings.enabled?this.settings.fogDensity*.10*(1+tw*.12)*(1-under*.86):0;
    this.scene.fog.color.copy(this.fogColor);
  }

  render(renderer,scene,camera){
    this.skyMesh.position.copy(camera.position);
    if(!this.settings.enabled||!this.settings.volumetric||this.state.strength<=.001||!this.sun?.shadow?.map?.texture){
      this.lastVisible=false;return false;
    }

    const oldTarget=renderer.getRenderTarget(),oldAutoClear=renderer.autoClear;
    const oldOverride=scene.overrideMaterial,oldBackground=scene.background;
    const oldShadowAuto=renderer.shadowMap.autoUpdate;
    renderer.getClearColor(this.clearColor);const oldAlpha=renderer.getClearAlpha();
    const visibility=[this.skyMesh,...this.exclusions].map(o=>[o,o.visible]);

    try{
      for(const [o] of visibility)o.visible=false;
      scene.overrideMaterial=this.depthMaterial;scene.background=null;
      renderer.shadowMap.autoUpdate=false;
      renderer.setRenderTarget(this.depthTarget);renderer.autoClear=true;
      renderer.setClearColor(0xffffff,1);renderer.clear(true,true,true);
      renderer.render(scene,camera);

      for(const [o,v] of visibility)o.visible=v;
      scene.overrideMaterial=oldOverride;scene.background=oldBackground;

      const u=this.volumeUniforms;
      u.tShadow.value=this.sun.shadow.map.texture;
      u.uInvProjection.value.copy(camera.projectionMatrixInverse);
      u.uCameraWorld.value.copy(camera.matrixWorld);
      u.uCameraPos.value.copy(camera.position);
      u.uShadowMatrix.value.copy(this.sun.shadow.matrix);
      u.uShadowMapSize.value.copy(this.sun.shadow.mapSize);
      u.uShadowBias.value=this.sun.shadow.bias;
      u.uSunDir.value.copy(this.sunDirection);

      renderer.setRenderTarget(this.volumeTarget);renderer.autoClear=true;
      renderer.setClearColor(0x000000,0);renderer.clear(true,false,false);
      renderer.render(this.volumeScene,this.fsCamera);

      renderer.setRenderTarget(oldTarget);renderer.autoClear=false;
      renderer.render(this.compositeScene,this.fsCamera);
      this.renderCount++;this.lastVisible=true;return true;
    }finally{
      for(const [o,v] of visibility)o.visible=v;
      scene.overrideMaterial=oldOverride;scene.background=oldBackground;
      renderer.shadowMap.autoUpdate=oldShadowAuto;
      renderer.setRenderTarget(oldTarget);renderer.autoClear=oldAutoClear;
      renderer.setClearColor(this.clearColor,oldAlpha);
    }
  }

  stats(){
    return {
      enabled:!!this.settings.enabled,volumetric:!!this.settings.volumetric,
      technique:'shadowmap-worldspace-heightfog-mie-raymarch',
      samples:this.settings.steps,qualityScale:this.settings.qualityScale,
      buffer:[this.size.bufferWidth,this.size.bufferHeight],
      intensity:this.settings.intensity,currentStrength:this.state.strength,
      fog:'height+haze+FogExp2-fallback',fogDensity:this.settings.fogDensity,
      mieAnisotropy:this.settings.anisotropy,shadowMapOcclusion:true,
      jitteredRaymarch:true,premultipliedComposite:true,dynamicSky:true,
      minecraftShaderInspired:true,volumePrecision:this.mobileLike?'rgba8-dithered':'rgba16f',mobileOptimized:this.mobileLike,
      visibleLastFrame:this.lastVisible,renders:this.renderCount
    };
  }

  dispose(){
    this.scene.remove(this.skyMesh);
    this.skyMesh.geometry.dispose();this.skyMaterial.dispose();
    this.depthTarget.dispose();this.volumeTarget.dispose();this.depthMaterial.dispose();
    this.volumeMaterial.dispose();this.compositeMaterial.dispose();this.fsGeometry.dispose();
    if(this.scene.fog)this.scene.fog=null;
  }
}
