/* Atmosphere v2 — Minecraft-shader-inspired world-space atmosphere.
 * Low-resolution camera depth + real directional-light shadow map + jittered
 * height-fog raymarch. Direct sunlight uses a forward Mie phase; a broad
 * secondary phase approximates multiple scattering so shadows stay soft
 * instead of becoming black voids.
 */
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
export class AtmospherePass{
  constructor(THREE,scene,{mobileLike=false,sun=null}={}){
    this.THREE=THREE;this.scene=scene;this.sun=sun;this.mobileLike=!!mobileLike;
    this.settings={
      enabled:true,volumetric:true,
      intensity:this.mobileLike?.48:.66,
      fogDensity:this.mobileLike?.0060:.0068,
      heightFalloff:.095,anisotropy:.70,multiScattering:.32,
      maxDistance:this.mobileLike?44:60,
      qualityScale:this.mobileLike?.28:.44,
      steps:this.mobileLike?10:18
    };
    this.state={strength:0,daylight:0,twilight:0,skyExposure:1,underground:0,time:0,fogBase:0};
    this.size={width:1,height:1,pixelRatio:1,bufferWidth:1,bufferHeight:1};
    this.clearColor=new THREE.Color();
    this.skyColor=new THREE.Color(0x7791b2);
    this.zenithColor=new THREE.Color(0x688bb6);
    this.horizonColor=new THREE.Color(0xb7c0bd);
    this.dawnColor=new THREE.Color(0xd6a27d);
    this.duskColor=new THREE.Color(0xc48e91);
    this.nightColor=new THREE.Color(0x18243c);
    this.nightHorizon=new THREE.Color(0x38455d);
    this.sunDay=new THREE.Color(0xffedcf);
    this.sunHorizon=new THREE.Color(0xffb66d);
    this.fogColor=new THREE.Color(0x91a3b0);
    this.sunDirection=new THREE.Vector3(0,1,0);
    this.exclusions=[];this.renderCount=0;this.lastVisible=false;

    const low={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false};
    this.depthTarget=new THREE.WebGLRenderTarget(1,1,{...low,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
    this.depthTarget.texture.name='paperchalk-atmosphere-view-depth';
    this.volumeTarget=new THREE.WebGLRenderTarget(1,1,{...low,depthBuffer:false});
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
      uMulti:{value:this.settings.multiScattering},uMaxDistance:{value:this.settings.maxDistance},
      uSteps:{value:this.settings.steps},uTime:{value:0}
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
        uniform sampler2D tDepth,tShadow;
        uniform mat4 uInvProjection,uCameraWorld,uShadowMatrix;
        uniform vec3 uCameraPos,uSunDir,uSunColor,uFogColor;
        uniform vec2 uShadowMapSize;
        uniform float uShadowBias,uIntensity,uFogDensity,uFogBase,uHeightFalloff,uAnisotropy,uMulti,uMaxDistance,uSteps,uTime;

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
        float shadowCmp(vec2 uv,float compare){
          float d=unpackDepth(texture2D(tShadow,uv));
          return step(compare,d);
        }
        float shadowAt(vec3 p,float jitter){
          vec4 sc=uShadowMatrix*vec4(p,1.0);sc.xyz/=max(1e-6,sc.w);
          if(sc.x<=.002||sc.x>=.998||sc.y<=.002||sc.y>=.998||sc.z<=0.0||sc.z>=1.0)return 1.0;
          vec2 texel=1.0/max(uShadowMapSize,vec2(1.0));
          float a=jitter*6.2831853;vec2 o=vec2(cos(a),sin(a))*texel*1.25;
          float cmp=sc.z+uShadowBias;
          return (shadowCmp(sc.xy+o,cmp)+shadowCmp(sc.xy-o,cmp)+
                  shadowCmp(sc.xy+o.yx*vec2(1.0,-1.0),cmp)+shadowCmp(sc.xy-o.yx*vec2(1.0,-1.0),cmp))*.25;
        }
        float hg(float mu,float g){
          float g2=g*g;
          return (1.0-g2)/(12.56637*pow(max(.025,1.0+g2-2.0*g*mu),1.5));
        }
        vec3 toSRGB(vec3 c){
          vec3 lo=c*12.92,hi=1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055;
          return mix(lo,hi,step(vec3(.0031308),c));
        }
        void main(){
          float depth=unpackDepth(texture2D(tDepth,vUv));
          vec3 endWorld=reconstructWorld(vUv,min(depth,.999999));
          vec3 delta=endWorld-uCameraPos;
          float surfaceDist=length(delta);
          vec3 rayDir=surfaceDist>1e-5?delta/surfaceDist:vec3(0.0,0.0,-1.0);
          float maxDist=min(uMaxDistance,depth>.9997?uMaxDistance:surfaceDist);
          float steps=max(1.0,uSteps),stepLen=maxDist/steps;
          float noise=hash21(gl_FragCoord.xy+vec2(uTime*11.7,uTime*4.3));
          float t=(.18+noise*.78)*stepLen;
          float trans=1.0,sunScatter=0.0,ambientScatter=0.0;
          float mu=clamp(dot(rayDir,normalize(uSunDir)),-1.0,1.0);
          float forward=hg(mu,uAnisotropy);
          float broad=hg(mu,.22);
          for(int i=0;i<20;i++){
            if(float(i)>=uSteps||t>=maxDist)break;
            vec3 p=uCameraPos+rayDir*t;
            float rel=p.y-uFogBase;
            float heightDensity=exp(-max(rel,-5.0)*uHeightFalloff);
            float distanceLift=mix(.82,1.12,smoothstep(0.0,uMaxDistance,t));
            float density=uFogDensity*heightDensity*distanceLift;
            float lit=shadowAt(p,noise+float(i)*.6180339);
            float absorb=exp(-density*stepLen*1.12);
            float directPhase=forward*(.74+.26*lit);
            sunScatter+=trans*lit*density*directPhase*stepLen;
            ambientScatter+=trans*density*broad*stepLen*(.42+.58*(1.0-lit)*uMulti);
            trans*=absorb;t+=stepLen;
          }
          float fogAlpha=clamp(1.0-trans,0.0,.46);
          float shaft=clamp(sunScatter*uIntensity*8.0,0.0,.72);
          float ambient=clamp(ambientScatter*(.62+uMulti*.8),0.0,.32);
          vec3 linear=uFogColor*(fogAlpha*.72+ambient)+uSunColor*shaft;
          gl_FragColor=vec4(toSRGB(max(linear,vec3(0.0))),fogAlpha);
        }
      `
    });
    this.volumeScene=new THREE.Scene();this.volumeScene.add(new THREE.Mesh(this.fsGeometry,this.volumeMaterial));

    this.compositeMaterial=new THREE.ShaderMaterial({
      uniforms:{tVolume:{value:this.volumeTarget.texture}},depthTest:false,depthWrite:false,toneMapped:false,
      transparent:true,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,
      blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor,
      vertexShader:`
        varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
      `,
      fragmentShader:`
        varying vec2 vUv;uniform sampler2D tVolume;
        void main(){gl_FragColor=texture2D(tVolume,vUv);}
      `
    });
    this.compositeScene=new THREE.Scene();this.compositeScene.add(new THREE.Mesh(this.fsGeometry,this.compositeMaterial));

    this.skyUniforms={
      uZenith:{value:this.zenithColor},uHorizon:{value:this.horizonColor},
      uSunColor:{value:this.sunDay.clone()},uSunDir:{value:this.sunDirection},uTwilight:{value:0}
    };
    this.skyMaterial=new THREE.ShaderMaterial({
      uniforms:this.skyUniforms,side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false,toneMapped:false,
      vertexShader:`
        varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
      `,
      fragmentShader:`
        precision highp float;
        varying vec3 vDir;uniform vec3 uZenith,uHorizon,uSunColor,uSunDir;uniform float uTwilight;
        vec3 toSRGB(vec3 c){vec3 lo=c*12.92,hi=1.055*pow(max(c,vec3(0.0)),vec3(1.0/2.4))-.055;return mix(lo,hi,step(vec3(.0031308),c));}
        void main(){
          vec3 d=normalize(vDir);
          float horizon=pow(clamp(1.0-abs(d.y),0.0,1.0),2.2);
          float grad=smoothstep(-.12,.72,d.y);
          vec3 col=mix(uHorizon,uZenith,grad);
          float mu=max(0.0,dot(d,normalize(uSunDir)));
          float mieGlow=pow(mu,7.0)*(.25+uTwilight*.34);
          float sunDisc=pow(mu,620.0)*1.18;
          col+=uSunColor*(mieGlow+sunDisc);
          col+=uHorizon*horizon*.08;
          gl_FragColor=vec4(toSRGB(max(col,vec3(0.0))),1.0);
        }
      `
    });
    this.skyMesh=new THREE.Mesh(new THREE.SphereGeometry(96,30,18),this.skyMaterial);
    this.skyMesh.name='atmosphere-sky-scattering';this.skyMesh.frustumCulled=false;this.skyMesh.renderOrder=-10000;
    this.scene.add(this.skyMesh);
    this.scene.fog=new THREE.FogExp2(this.fogColor,.0014);
  }

  setExclusions(objects=[]){this.exclusions=(objects||[]).filter(Boolean);return this}
  configure(patch={}){
    Object.assign(this.settings,patch||{});
    this.settings.intensity=clamp(Number(this.settings.intensity)||0,0,1.4);
    this.settings.fogDensity=clamp(Number(this.settings.fogDensity)||0,0,.022);
    this.settings.heightFalloff=clamp(Number(this.settings.heightFalloff)||.095,.02,.30);
    this.settings.anisotropy=clamp(Number(this.settings.anisotropy)||.70,0,.86);
    this.settings.multiScattering=clamp(Number(this.settings.multiScattering)||.32,0,.8);
    this.settings.maxDistance=clamp(Number(this.settings.maxDistance)||52,20,90);
    this.settings.qualityScale=clamp(Number(this.settings.qualityScale)||.35,.20,.62);
    this.settings.steps=Math.round(clamp(Number(this.settings.steps)||12,6,20));
    this.resize(this.size.width,this.size.height,this.size.pixelRatio);
    return this.stats();
  }
  resize(width,height,pixelRatio=1){
    const w=Math.max(1,Math.round(width||1)),h=Math.max(1,Math.round(height||1));
    const pr=clamp(Number(pixelRatio)||1,1,2),q=this.settings.qualityScale;
    const bw=Math.max(112,Math.round(w*pr*q)),bh=Math.max(72,Math.round(h*pr*q));
    if(bw!==this.size.bufferWidth||bh!==this.size.bufferHeight){this.depthTarget.setSize(bw,bh);this.volumeTarget.setSize(bw,bh)}
    this.size={width:w,height:h,pixelRatio:pr,bufferWidth:bw,bufferHeight:bh};
  }
  update({sunPosition,daylight=0,twilight=0,skyExposure=1,underground=0,time=0,fogBaseHeight=0,sunLight=null,skyLight=null,sunDisc=null}={}){
    const d=clamp(daylight,0,1),tw=clamp(twilight,0,1),sky=clamp(skyExposure,0,1),under=clamp(underground,0,1);
    const minute=((Number(time)||0)%1440+1440)%1440,morning=minute<720,lowSun=clamp(1-d*1.18,0,1);
    const active=d>.005?(d*.70+tw*.16)*(.66+lowSun*.52)*sky*(1-under):0;
    this.state={strength:active*this.settings.intensity,daylight:d,twilight:tw,skyExposure:sky,underground:under,time:Number(time)||0,fogBase:Number(fogBaseHeight)||0};
    const warm=morning?this.dawnColor:this.duskColor,dayMix=clamp((d-.04)/.82,0,1);
    if(d>.004){
      this.horizonColor.copy(warm).lerp(new this.THREE.Color(0xb0bec3),dayMix);
      this.zenithColor.copy(warm).lerp(new this.THREE.Color(0x6489b8),dayMix);
    }else{
      this.horizonColor.copy(this.nightHorizon).lerp(warm,tw*.44);
      this.zenithColor.copy(this.nightColor).lerp(warm,tw*.18);
    }
    this.skyColor.copy(this.horizonColor).lerp(this.zenithColor,.56);
    const sunColor=this.sunHorizon.clone().lerp(this.sunDay,clamp(d*1.36,0,1));
    this.fogColor.copy(this.horizonColor).lerp(this.zenithColor,.24);
    if(sunLight){
      sunLight.color.copy(sunColor);
      const target=sunLight.target?.position||new this.THREE.Vector3();
      this.sunDirection.copy(sunLight.position).sub(target).normalize();
    }else if(sunPosition)this.sunDirection.copy(sunPosition).normalize();
    if(skyLight){skyLight.color.copy(this.zenithColor).lerp(this.sunDay,.08);skyLight.groundColor.set(0x765f49)}
    if(sunDisc?.material?.color)sunDisc.material.color.copy(sunColor);
    this.skyUniforms.uSunColor.value.copy(sunColor);this.skyUniforms.uTwilight.value=tw;this.skyUniforms.uSunDir.value.copy(this.sunDirection);
    this.volumeUniforms.uSunColor.value.copy(sunColor);this.volumeUniforms.uFogColor.value.copy(this.fogColor);
    this.volumeUniforms.uIntensity.value=this.state.strength;
    this.volumeUniforms.uFogDensity.value=this.settings.fogDensity*(1+tw*.18+lowSun*.12)*(1-under*.84);
    this.volumeUniforms.uFogBase.value=this.state.fogBase;
    this.volumeUniforms.uHeightFalloff.value=this.settings.heightFalloff;this.volumeUniforms.uAnisotropy.value=this.settings.anisotropy;
    this.volumeUniforms.uMulti.value=this.settings.multiScattering;this.volumeUniforms.uMaxDistance.value=this.settings.maxDistance;
    this.volumeUniforms.uSteps.value=this.settings.steps;this.volumeUniforms.uTime.value=this.state.time;
    this.scene.fog.density=this.settings.enabled?this.settings.fogDensity*.16*(1+tw*.16)*(1-under*.86):0;
    this.scene.fog.color.copy(this.fogColor);
  }
  render(renderer,scene,camera){
    this.skyMesh.position.copy(camera.position);
    if(!this.settings.enabled||!this.settings.volumetric||this.state.strength<=.001||!this.sun?.shadow?.map?.texture){
      this.lastVisible=false;return false;
    }
    const oldTarget=renderer.getRenderTarget(),oldAutoClear=renderer.autoClear,oldOverride=scene.overrideMaterial,oldBackground=scene.background;
    const oldShadowAuto=renderer.shadowMap.autoUpdate;renderer.getClearColor(this.clearColor);const oldAlpha=renderer.getClearAlpha();
    const visibility=[this.skyMesh,...this.exclusions].map(o=>[o,o.visible]);
    try{
      for(const [o] of visibility)o.visible=false;
      scene.overrideMaterial=this.depthMaterial;scene.background=null;renderer.shadowMap.autoUpdate=false;
      renderer.setRenderTarget(this.depthTarget);renderer.autoClear=true;renderer.setClearColor(0xffffff,1);renderer.clear(true,true,true);renderer.render(scene,camera);
      for(const [o,v] of visibility)o.visible=v;scene.overrideMaterial=oldOverride;scene.background=oldBackground;
      const u=this.volumeUniforms;
      u.tShadow.value=this.sun.shadow.map.texture;u.uInvProjection.value.copy(camera.projectionMatrixInverse);
      u.uCameraWorld.value.copy(camera.matrixWorld);u.uCameraPos.value.copy(camera.position);
      u.uShadowMatrix.value.copy(this.sun.shadow.matrix);u.uShadowMapSize.value.copy(this.sun.shadow.mapSize);
      u.uShadowBias.value=this.sun.shadow.bias;u.uSunDir.value.copy(this.sunDirection);
      renderer.setRenderTarget(this.volumeTarget);renderer.autoClear=true;renderer.setClearColor(0x000000,0);renderer.clear(true,false,false);renderer.render(this.volumeScene,this.fsCamera);
      renderer.setRenderTarget(oldTarget);renderer.autoClear=false;renderer.render(this.compositeScene,this.fsCamera);
      this.renderCount++;this.lastVisible=true;return true;
    }finally{
      for(const [o,v] of visibility)o.visible=v;scene.overrideMaterial=oldOverride;scene.background=oldBackground;
      renderer.shadowMap.autoUpdate=oldShadowAuto;renderer.setRenderTarget(oldTarget);renderer.autoClear=oldAutoClear;renderer.setClearColor(this.clearColor,oldAlpha);
    }
  }
  stats(){
    return {
      enabled:!!this.settings.enabled,volumetric:!!this.settings.volumetric,
      technique:'shadowmap-worldspace-heightfog-mie-raymarch',
      samples:this.settings.steps,qualityScale:this.settings.qualityScale,buffer:[this.size.bufferWidth,this.size.bufferHeight],
      intensity:this.settings.intensity,currentStrength:this.state.strength,fog:'height+haze+FogExp2-fallback',fogDensity:this.settings.fogDensity,
      mieAnisotropy:this.settings.anisotropy,multiScattering:this.settings.multiScattering,
      shadowMapOcclusion:true,jitteredRaymarch:true,premultipliedComposite:true,dynamicSky:true,
      minecraftShaderInspired:true,mobileOptimized:this.mobileLike,visibleLastFrame:this.lastVisible,renders:this.renderCount
    };
  }
  dispose(){
    this.scene.remove(this.skyMesh);this.skyMesh.geometry.dispose();this.skyMaterial.dispose();
    this.depthTarget.dispose();this.volumeTarget.dispose();this.depthMaterial.dispose();this.volumeMaterial.dispose();this.compositeMaterial.dispose();this.fsGeometry.dispose();
    if(this.scene.fog)this.scene.fog=null;
  }
}
