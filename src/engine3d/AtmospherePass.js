/* Paperchalk atmosphere v2.
 * Minecraft-shader-inspired structure: cheap occlusion/depth-style light shafts,
 * dithered radial sampling, low-resolution filtering, atmospheric fog, graded sky.
 * Original implementation; no third-party shader code is copied.
 */
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

export class AtmospherePass{
  constructor(THREE,scene,{mobileLike=false}={}){
    this.THREE=THREE;this.scene=scene;this.mobileLike=!!mobileLike;
    this.settings={
      enabled:true,godRays:true,
      rayIntensity:this.mobileLike?.62:.76,
      rayDensity:.90,rayDecay:.965,rayWeight:.16,
      fogDensity:this.mobileLike?.0062:.0072,
      qualityScale:this.mobileLike?.27:.40,
      blur:true
    };
    this.state={strength:0,daylight:0,twilight:0,night:0,skyExposure:1,underground:0,time:0};
    this.size={width:1,height:1,pixelRatio:1,bufferWidth:1,bufferHeight:1};
    this.sunWorld=new THREE.Vector3();this.sunNdc=new THREE.Vector3();this.sunUv=new THREE.Vector2(.5,.5);
    this.clearColor=new THREE.Color();this.fogColor=new THREE.Color(0x8191a8);
    this.scene.fog=new THREE.FogExp2(this.fogColor,this.settings.fogDensity);

    this.skyCanvas=document.createElement('canvas');this.skyCanvas.width=32;this.skyCanvas.height=256;
    this.skyCtx=this.skyCanvas.getContext('2d');
    this.skyTexture=new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.colorSpace=THREE.SRGBColorSpace;
    this.skyTexture.minFilter=THREE.LinearFilter;this.skyTexture.magFilter=THREE.LinearFilter;
    this.skyKey='';this.scene.background=this.skyTexture;

    const rt={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false};
    this.occlusionTarget=new THREE.WebGLRenderTarget(1,1,rt);
    this.raysTarget=new THREE.WebGLRenderTarget(1,1,{...rt,depthBuffer:false});
    this.blurTarget=new THREE.WebGLRenderTarget(1,1,{...rt,depthBuffer:false});
    this.occlusionTarget.texture.name='paperchalk-atmosphere-occlusion';
    this.raysTarget.texture.name='paperchalk-atmosphere-rays';
    this.blurTarget.texture.name='paperchalk-atmosphere-blur';

    this.blockerMaterial=new THREE.MeshBasicMaterial({color:0x000000,side:THREE.DoubleSide,fog:false,toneMapped:false});

    const sourceCanvas=document.createElement('canvas');sourceCanvas.width=sourceCanvas.height=128;
    const ctx=sourceCanvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.12,'rgba(255,255,255,.98)');
    g.addColorStop(.34,'rgba(255,255,255,.60)');g.addColorStop(.70,'rgba(255,255,255,.13)');
    g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
    this.sourceTexture=new THREE.CanvasTexture(sourceCanvas);this.sourceTexture.colorSpace=THREE.SRGBColorSpace;
    this.sourceMaterial=new THREE.SpriteMaterial({map:this.sourceTexture,color:0xffffff,transparent:true,depthTest:true,depthWrite:false,fog:false,toneMapped:false});
    this.sourceSprite=new THREE.Sprite(this.sourceMaterial);this.sourceScene=new THREE.Scene();this.sourceScene.add(this.sourceSprite);

    this.fsCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.fsGeometry=new THREE.PlaneGeometry(2,2);
    this.radialUniforms={
      tOcclusion:{value:this.occlusionTarget.texture},uLightPos:{value:this.sunUv},
      uDensity:{value:this.settings.rayDensity},uDecay:{value:this.settings.rayDecay},
      uWeight:{value:this.settings.rayWeight},uStrength:{value:0},uTime:{value:0},uAspect:{value:1}
    };
    this.radialMaterial=new THREE.ShaderMaterial({
      uniforms:this.radialUniforms,depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tOcclusion;
        uniform vec2 uLightPos;
        uniform float uDensity,uDecay,uWeight,uStrength,uTime,uAspect;
        float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
        void main(){
          const int SAMPLES=28;
          vec2 toLight=uLightPos-vUv;
          vec2 delta=toLight*(uDensity/float(SAMPLES));
          float jitter=hash21(gl_FragCoord.xy+floor(uTime*17.0))-.5;
          vec2 uv=vUv+delta*(jitter*.85);
          float illumination=1.0;
          float scatter=0.0;
          for(int i=0;i<SAMPLES;i++){
            uv+=delta;
            float openSky=texture2D(tOcclusion,clamp(uv,vec2(.001),vec2(.999))).r;
            scatter+=openSky*illumination*uWeight;
            illumination*=uDecay;
          }
          vec2 ar=vec2((vUv.x-uLightPos.x)*uAspect,vUv.y-uLightPos.y);
          float sunDistance=length(ar);
          float forwardPhase=exp(-sunDistance*2.35);
          float halo=exp(-sunDistance*sunDistance*18.0);
          float air=0.94+hash21(vUv*vec2(713.,421.)+floor(uTime*5.0))*.06;
          float shafts=scatter*(.72+forwardPhase*.28)+halo*.10;
          float v=clamp(shafts*uStrength*air,0.,1.15);
          gl_FragColor=vec4(vec3(v),1.);
        }
      `
    });
    this.radialScene=new THREE.Scene();this.radialScene.add(new THREE.Mesh(this.fsGeometry,this.radialMaterial));

    this.blurUniforms={tInput:{value:this.raysTarget.texture},uTexel:{value:new THREE.Vector2(1,1)},uDirection:{value:new THREE.Vector2(1,0)}};
    this.blurMaterial=new THREE.ShaderMaterial({
      uniforms:this.blurUniforms,depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,
      fragmentShader:`
        precision highp float;varying vec2 vUv;uniform sampler2D tInput;uniform vec2 uTexel,uDirection;
        void main(){
          vec2 o=uTexel*uDirection;
          vec3 c=texture2D(tInput,vUv).rgb*.28;
          c+=texture2D(tInput,vUv+o).rgb*.22;c+=texture2D(tInput,vUv-o).rgb*.22;
          c+=texture2D(tInput,vUv+o*2.2).rgb*.11;c+=texture2D(tInput,vUv-o*2.2).rgb*.11;
          c+=texture2D(tInput,vUv+o*3.8).rgb*.03;c+=texture2D(tInput,vUv-o*3.8).rgb*.03;
          gl_FragColor=vec4(c,1.);
        }
      `
    });
    this.blurScene=new THREE.Scene();this.blurScene.add(new THREE.Mesh(this.fsGeometry,this.blurMaterial));

    this.compositeMaterial=new THREE.MeshBasicMaterial({
      map:this.raysTarget.texture,color:0xffdfaa,transparent:true,opacity:1,
      blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,toneMapped:false
    });
    this.compositeScene=new THREE.Scene();this.compositeScene.add(new THREE.Mesh(this.fsGeometry,this.compositeMaterial));
    this.exclusions=[];this.renderCount=0;this.lastVisible=false;this._updateSky(1,0,0);
  }

  setExclusions(objects=[]){this.exclusions=(objects||[]).filter(Boolean);return this}
  configure(patch={}){
    Object.assign(this.settings,patch||{});
    this.settings.rayIntensity=clamp(Number(this.settings.rayIntensity)||0,0,1.6);
    this.settings.rayDensity=clamp(Number(this.settings.rayDensity)||.9,.45,1.2);
    this.settings.rayDecay=clamp(Number(this.settings.rayDecay)||.965,.90,.992);
    this.settings.rayWeight=clamp(Number(this.settings.rayWeight)||.16,.04,.30);
    this.settings.fogDensity=clamp(Number(this.settings.fogDensity)||0,0,.025);
    this.settings.qualityScale=clamp(Number(this.settings.qualityScale)||.35,.18,.55);
    this.radialUniforms.uDensity.value=this.settings.rayDensity;this.radialUniforms.uDecay.value=this.settings.rayDecay;this.radialUniforms.uWeight.value=this.settings.rayWeight;
    this.resize(this.size.width,this.size.height,this.size.pixelRatio);return this.stats();
  }

  resize(width,height,pixelRatio=1){
    const w=Math.max(1,Math.round(width||1)),h=Math.max(1,Math.round(height||1));
    const pr=clamp(Number(pixelRatio)||1,1,2),q=this.settings.qualityScale;
    const bw=Math.max(96,Math.round(w*pr*q)),bh=Math.max(64,Math.round(h*pr*q));
    if(bw!==this.size.bufferWidth||bh!==this.size.bufferHeight){
      this.occlusionTarget.setSize(bw,bh);this.raysTarget.setSize(bw,bh);this.blurTarget.setSize(bw,bh);
      this.blurUniforms.uTexel.value.set(1/bw,1/bh);
    }
    this.radialUniforms.uAspect.value=w/Math.max(1,h);this.size={width:w,height:h,pixelRatio:pr,bufferWidth:bw,bufferHeight:bh};
  }

  _mixColor(a,b,t){return new this.THREE.Color(a).lerp(new this.THREE.Color(b),clamp(t,0,1))}
  _updateSky(daylight,twilight,night){
    const key=[daylight,twilight,night].map(v=>Math.round(v*30)).join(':');if(key===this.skyKey)return;this.skyKey=key;
    const d=clamp(daylight,0,1),tw=clamp(twilight,0,1),n=clamp(night,0,1);
    let top=this._mixColor(0x202d4c,0x7087aa,d),horizon=this._mixColor(0x40506b,0xa8bcc4,d);
    top.lerp(new this.THREE.Color(0x596a91),tw*.52);horizon.lerp(new this.THREE.Color(0xe3ae7f),tw*.82);
    top.multiplyScalar(1-n*.18);horizon.multiplyScalar(1-n*.12);
    const ctx=this.skyCtx,g=ctx.createLinearGradient(0,0,0,this.skyCanvas.height);
    g.addColorStop(0,'#'+top.getHexString());g.addColorStop(.55,'#'+top.clone().lerp(horizon,.42).getHexString());g.addColorStop(1,'#'+horizon.getHexString());
    ctx.fillStyle=g;ctx.fillRect(0,0,this.skyCanvas.width,this.skyCanvas.height);
    for(let y=0;y<256;y+=2){const a=.008+((y*37)%17)/5000;ctx.fillStyle='rgba(255,255,255,'+a.toFixed(4)+')';ctx.fillRect(0,y,32,1)}
    this.skyTexture.needsUpdate=true;this.scene.background=this.skyTexture;
  }

  update({sunPosition,daylight=0,twilight=0,night=0,skyExposure=1,underground=0,time=0}={}){
    if(sunPosition)this.sunWorld.copy(sunPosition);
    const d=clamp(daylight,0,1),tw=clamp(twilight,0,1),n=clamp(night,0,1),sky=clamp(skyExposure,0,1),under=clamp(underground,0,1);
    const lowSun=1-clamp((d-.18)/.70,0,1);
    const atmospheric=d*(.30+lowSun*.66+tw*.22)*sky*(1-under);
    this.state={strength:atmospheric*this.settings.rayIntensity,daylight:d,twilight:tw,night:n,skyExposure:sky,underground:under,time:Number(time)||0};
    const fogBoost=1+tw*.34+lowSun*.15+n*.10;
    this.scene.fog.density=this.settings.enabled?this.settings.fogDensity*fogBoost*(1-under*.72):0;
    const warm=clamp(tw+lowSun*.36,0,1);this.fogColor.setRGB(.46+warm*.09,.54+warm*.045,.66-warm*.045);this.scene.fog.color.copy(this.fogColor);
    this._updateSky(d,tw,n);
  }

  _projectSun(camera){
    this.sunNdc.copy(this.sunWorld).project(camera);
    const edgeFade=clamp((1.30-Math.max(Math.abs(this.sunNdc.x),Math.abs(this.sunNdc.y)))/.30,0,1);
    const visible=this.sunNdc.z>=-1&&this.sunNdc.z<=1;this.sunUv.set(this.sunNdc.x*.5+.5,this.sunNdc.y*.5+.5);return visible?edgeFade:0;
  }

  render(renderer,scene,camera){
    const strength=this.settings.enabled&&this.settings.godRays?this.state.strength*this._projectSun(camera):0;
    this.lastVisible=strength>.002;if(!this.lastVisible)return false;
    const oldTarget=renderer.getRenderTarget(),oldAutoClear=renderer.autoClear,oldOverride=scene.overrideMaterial,oldBackground=scene.background;
    renderer.getClearColor(this.clearColor);const oldAlpha=renderer.getClearAlpha(),visibility=this.exclusions.map(o=>[o,o.visible]);
    try{
      for(const [o] of visibility)o.visible=false;
      scene.overrideMaterial=this.blockerMaterial;scene.background=null;
      renderer.setRenderTarget(this.occlusionTarget);renderer.setClearColor(0x000000,1);renderer.autoClear=true;renderer.clear(true,true,true);renderer.render(scene,camera);
      scene.overrideMaterial=oldOverride;this.sourceSprite.position.copy(this.sunWorld);this.sourceSprite.scale.setScalar(12+this.state.twilight*5);
      renderer.autoClear=false;renderer.render(this.sourceScene,camera);for(const [o,v] of visibility)o.visible=v;

      this.radialUniforms.uLightPos.value.copy(this.sunUv);this.radialUniforms.uStrength.value=strength;this.radialUniforms.uTime.value=this.state.time;
      renderer.setRenderTarget(this.raysTarget);renderer.setClearColor(0x000000,0);renderer.autoClear=true;renderer.clear(true,false,false);renderer.render(this.radialScene,this.fsCamera);
      if(this.settings.blur){
        this.blurUniforms.tInput.value=this.raysTarget.texture;this.blurUniforms.uDirection.value.set(1,0);
        renderer.setRenderTarget(this.blurTarget);renderer.clear(true,false,false);renderer.render(this.blurScene,this.fsCamera);
        this.blurUniforms.tInput.value=this.blurTarget.texture;this.blurUniforms.uDirection.value.set(0,1);
        renderer.setRenderTarget(this.raysTarget);renderer.clear(true,false,false);renderer.render(this.blurScene,this.fsCamera);
      }
      renderer.setRenderTarget(oldTarget);renderer.autoClear=false;
      const warm=clamp(this.state.twilight+(1-this.state.daylight)*.20,0,1);
      this.compositeMaterial.opacity=clamp(.64+this.state.twilight*.16,.58,.84);this.compositeMaterial.color.setRGB(1,.90-warm*.06,.76-warm*.08);
      renderer.render(this.compositeScene,this.fsCamera);this.renderCount++;return true;
    }finally{
      scene.overrideMaterial=oldOverride;scene.background=oldBackground;for(const [o,v] of visibility)o.visible=v;
      renderer.setRenderTarget(oldTarget);renderer.autoClear=oldAutoClear;renderer.setClearColor(this.clearColor,oldAlpha);
    }
  }

  stats(){
    return {
      enabled:!!this.settings.enabled,godRays:!!this.settings.godRays,
      technique:'minecraft-style-depth-occlusion-radial-scattering-v2',
      samples:28,blurPasses:this.settings.blur?2:0,qualityScale:this.settings.qualityScale,
      buffer:[this.size.bufferWidth,this.size.bufferHeight],rayIntensity:this.settings.rayIntensity,currentStrength:this.state.strength,
      fog:'dynamic-FogExp2-air-perspective',fogDensity:this.scene.fog?.density||0,sky:'graded-paper-sky',
      dynamicSun:true,terrainOcclusion:true,dithered:true,filtered:true,additiveComposite:true,
      mobileOptimized:this.mobileLike,visibleLastFrame:this.lastVisible,renders:this.renderCount
    };
  }

  dispose(){
    this.occlusionTarget.dispose();this.raysTarget.dispose();this.blurTarget.dispose();this.blockerMaterial.dispose();
    this.sourceMaterial.dispose();this.sourceTexture.dispose();this.radialMaterial.dispose();this.blurMaterial.dispose();this.compositeMaterial.dispose();
    this.fsGeometry.dispose();this.skyTexture.dispose();if(this.scene.fog)this.scene.fog=null;
  }
}
