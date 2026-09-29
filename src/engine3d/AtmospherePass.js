/* Lightweight atmospheric scattering for the paper diorama.
 * Technique: low-resolution occlusion mask + radial light scattering, then
 * additive upscale over the already-rendered scene. No heavy full-screen
 * volumetric raymarch is used on the default/mobile path.
 */
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

export class AtmospherePass{
  constructor(THREE,scene,{mobileLike=false}={}){
    this.THREE=THREE;this.scene=scene;this.mobileLike=!!mobileLike;
    this.settings={
      enabled:true,
      godRays:true,
      rayIntensity:.78,
      rayDensity:.93,
      rayDecay:.965,
      rayWeight:.17,
      fogDensity:.0085,
      qualityScale:this.mobileLike?.28:.42
    };
    this.state={strength:0,daylight:0,twilight:0,skyExposure:1,underground:0};
    this.size={width:1,height:1,pixelRatio:1,bufferWidth:1,bufferHeight:1};
    this.sunWorld=new THREE.Vector3();
    this.sunNdc=new THREE.Vector3();
    this.sunUv=new THREE.Vector2(.5,.5);
    this.clearColor=new THREE.Color();
    this.fogColor=new THREE.Color(0x7487a5);
    this.scene.fog=new THREE.FogExp2(this.fogColor,this.settings.fogDensity);

    const rtOpts={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat,type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false};
    this.occlusionTarget=new THREE.WebGLRenderTarget(1,1,rtOpts);
    this.occlusionTarget.texture.name='paperchalk-godray-occlusion';
    this.raysTarget=new THREE.WebGLRenderTarget(1,1,{...rtOpts,depthBuffer:false});
    this.raysTarget.texture.name='paperchalk-godray-scattering';

    this.blockerMaterial=new THREE.MeshBasicMaterial({
      color:0x000000,side:THREE.DoubleSide,fog:false,toneMapped:false
    });

    const sourceCanvas=document.createElement('canvas');sourceCanvas.width=sourceCanvas.height=128;
    const ctx=sourceCanvas.getContext('2d');
    const g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');
    g.addColorStop(.18,'rgba(255,255,255,.96)');
    g.addColorStop(.48,'rgba(255,255,255,.48)');
    g.addColorStop(.78,'rgba(255,255,255,.12)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
    this.sourceTexture=new THREE.CanvasTexture(sourceCanvas);
    this.sourceTexture.colorSpace=THREE.SRGBColorSpace;
    this.sourceMaterial=new THREE.SpriteMaterial({
      map:this.sourceTexture,color:0xffffff,transparent:true,depthTest:true,depthWrite:false,
      fog:false,toneMapped:false
    });
    this.sourceSprite=new THREE.Sprite(this.sourceMaterial);
    this.sourceSprite.name='atmosphere-sun-scattering-source';
    this.sourceSprite.scale.set(15,15,1);
    this.sourceScene=new THREE.Scene();this.sourceScene.add(this.sourceSprite);

    this.fsCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.fsScene=new THREE.Scene();
    this.fsGeometry=new THREE.PlaneGeometry(2,2);
    this.radialUniforms={
      tOcclusion:{value:this.occlusionTarget.texture},
      uLightPos:{value:this.sunUv},
      uDensity:{value:this.settings.rayDensity},
      uDecay:{value:this.settings.rayDecay},
      uWeight:{value:this.settings.rayWeight},
      uStrength:{value:0},
      uTime:{value:0}
    };
    this.radialMaterial=new THREE.ShaderMaterial({
      uniforms:this.radialUniforms,depthTest:false,depthWrite:false,toneMapped:false,
      vertexShader:`
        varying vec2 vUv;
        void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
      `,
      fragmentShader:`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tOcclusion;
        uniform vec2 uLightPos;
        uniform float uDensity;
        uniform float uDecay;
        uniform float uWeight;
        uniform float uStrength;
        uniform float uTime;
        float hash21(vec2 p){
          p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);
        }
        void main(){
          const int SAMPLES=24;
          vec2 delta=(vUv-uLightPos)*(uDensity/float(SAMPLES));
          float jitter=(hash21(gl_FragCoord.xy+uTime*13.0)-.5);
          vec2 sampleUv=vUv-delta*jitter;
          float illumination=1.0;
          float light=0.0;
          for(int i=0;i<SAMPLES;i++){
            sampleUv-=delta;
            float s=texture2D(tOcclusion,clamp(sampleUv,vec2(.001),vec2(.999))).r;
            light+=s*illumination*uWeight;
            illumination*=uDecay;
          }
          float core=texture2D(tOcclusion,vUv).r*.16;
          float v=clamp((light+core)*uStrength,0.0,1.35);
          gl_FragColor=vec4(vec3(v),1.0);
        }
      `
    });
    this.radialQuad=new THREE.Mesh(this.fsGeometry,this.radialMaterial);
    this.fsScene.add(this.radialQuad);

    this.compositeMaterial=new THREE.MeshBasicMaterial({
      map:this.raysTarget.texture,color:0xffe2ad,transparent:true,opacity:1,
      blending:THREE.AdditiveBlending,depthTest:false,depthWrite:false,toneMapped:false
    });
    this.compositeQuad=new THREE.Mesh(this.fsGeometry,this.compositeMaterial);
    this.compositeScene=new THREE.Scene();this.compositeScene.add(this.compositeQuad);
    this.exclusions=[];
    this.renderCount=0;this.lastVisible=false;
  }

  setExclusions(objects=[]){this.exclusions=(objects||[]).filter(Boolean);return this}
  configure(patch={}){
    Object.assign(this.settings,patch||{});
    this.settings.rayIntensity=clamp(Number(this.settings.rayIntensity)||0,0,2);
    this.settings.rayDensity=clamp(Number(this.settings.rayDensity)||.93,.3,1.3);
    this.settings.rayDecay=clamp(Number(this.settings.rayDecay)||.965,.88,.995);
    this.settings.rayWeight=clamp(Number(this.settings.rayWeight)||.17,.04,.35);
    this.settings.fogDensity=clamp(Number(this.settings.fogDensity)||0,0,.04);
    this.radialUniforms.uDensity.value=this.settings.rayDensity;
    this.radialUniforms.uDecay.value=this.settings.rayDecay;
    this.radialUniforms.uWeight.value=this.settings.rayWeight;
    this.resize(this.size.width,this.size.height,this.size.pixelRatio);
    return this.stats();
  }

  resize(width,height,pixelRatio=1){
    const w=Math.max(1,Math.round(width||1)),h=Math.max(1,Math.round(height||1));
    const pr=clamp(Number(pixelRatio)||1,1,2);
    const q=clamp(Number(this.settings.qualityScale)||.35,.18,.6);
    const bw=Math.max(96,Math.round(w*pr*q)),bh=Math.max(64,Math.round(h*pr*q));
    if(bw!==this.size.bufferWidth||bh!==this.size.bufferHeight){
      this.occlusionTarget.setSize(bw,bh);this.raysTarget.setSize(bw,bh);
    }
    this.size={width:w,height:h,pixelRatio:pr,bufferWidth:bw,bufferHeight:bh};
  }

  update({sunPosition,daylight=0,twilight=0,skyExposure=1,underground=0,time=0}={}){
    if(sunPosition)this.sunWorld.copy(sunPosition);
    const d=clamp(daylight,0,1),tw=clamp(twilight,0,1),sky=clamp(skyExposure,0,1),under=clamp(underground,0,1);
    // Stronger near sunrise/sunset and in hazier air, but never visible underground.
    const lowSun=clamp(1-Math.max(0,(d-.18)/.82),0,1);
    const atmospheric=(d*.72+tw*.28)*(.48+lowSun*.52)*sky*(1-under);
    this.state={strength:atmospheric*this.settings.rayIntensity,daylight:d,twilight:tw,skyExposure:sky,underground:under,time:Number(time)||0};
    const fogBoost=1+tw*.38+lowSun*.18;
    this.scene.fog.density=this.settings.enabled?this.settings.fogDensity*fogBoost*(1-under*.72):0;
    const warm=clamp(tw+lowSun*.45,0,1);
    this.fogColor.setRGB(.43+warm*.09,.52+warm*.045,.65-warm*.035);
    this.scene.fog.color.copy(this.fogColor);
  }

  _projectSun(camera){
    this.sunNdc.copy(this.sunWorld).project(camera);
    const maxEdge=Math.max(Math.abs(this.sunNdc.x),Math.abs(this.sunNdc.y));
    const edgeFade=clamp((1.32-maxEdge)/.28,0,1);
    const depthVisible=this.sunNdc.z>=-1&&this.sunNdc.z<=1;
    this.sunUv.set(this.sunNdc.x*.5+.5,this.sunNdc.y*.5+.5);
    return depthVisible?edgeFade:0;
  }

  render(renderer,scene,camera){
    const edgeFade=this._projectSun(camera);
    const strength=this.settings.enabled&&this.settings.godRays?this.state.strength*edgeFade:0;
    this.lastVisible=strength>.002;
    if(!this.lastVisible)return false;

    const oldTarget=renderer.getRenderTarget();
    const oldAutoClear=renderer.autoClear;
    const oldOverride=scene.overrideMaterial;
    const oldBackground=scene.background;
    renderer.getClearColor(this.clearColor);
    const oldAlpha=renderer.getClearAlpha();
    const visibility=this.exclusions.map(o=>[o,o.visible]);

    try{
      for(const [o] of visibility)o.visible=false;
      scene.overrideMaterial=this.blockerMaterial;scene.background=null;
      renderer.setRenderTarget(this.occlusionTarget);
      renderer.setClearColor(0x000000,1);renderer.autoClear=true;renderer.clear(true,true,true);
      renderer.render(scene,camera);

      scene.overrideMaterial=oldOverride;
      this.sourceSprite.position.copy(this.sunWorld);
      this.sourceSprite.scale.setScalar(15+this.state.twilight*4);
      renderer.autoClear=false;
      renderer.render(this.sourceScene,camera);

      for(const [o,v] of visibility)o.visible=v;
      this.radialUniforms.uLightPos.value.copy(this.sunUv);
      this.radialUniforms.uStrength.value=strength;
      this.radialUniforms.uTime.value=this.state.time;
      renderer.setRenderTarget(this.raysTarget);
      renderer.setClearColor(0x000000,0);renderer.autoClear=true;renderer.clear(true,false,false);
      renderer.render(this.fsScene,this.fsCamera);

      renderer.setRenderTarget(oldTarget);
      renderer.autoClear=false;
      this.compositeMaterial.opacity=clamp(.72+this.state.twilight*.18,.6,.92);
      this.compositeMaterial.color.setRGB(1,.86+this.state.twilight*.02,.67+this.state.twilight*.08);
      renderer.render(this.compositeScene,this.fsCamera);
      this.renderCount++;
      return true;
    }finally{
      scene.overrideMaterial=oldOverride;scene.background=oldBackground;
      for(const [o,v] of visibility)o.visible=v;
      renderer.setRenderTarget(oldTarget);renderer.autoClear=oldAutoClear;
      renderer.setClearColor(this.clearColor,oldAlpha);
    }
  }

  stats(){
    return {
      enabled:!!this.settings.enabled,godRays:!!this.settings.godRays,
      technique:'quarter-res-occlusion-radial-scattering',
      samples:24,qualityScale:this.settings.qualityScale,
      buffer:[this.size.bufferWidth,this.size.bufferHeight],
      rayIntensity:this.settings.rayIntensity,currentStrength:this.state.strength,
      fog:'FogExp2-distance-air',fogDensity:this.scene.fog?.density||0,
      dynamicSun:true,terrainOcclusion:true,additiveComposite:true,
      mobileOptimized:this.mobileLike,visibleLastFrame:this.lastVisible,renders:this.renderCount
    };
  }

  dispose(){
    this.occlusionTarget.dispose();this.raysTarget.dispose();
    this.blockerMaterial.dispose();this.sourceMaterial.dispose();this.sourceTexture.dispose();
    this.radialMaterial.dispose();this.compositeMaterial.dispose();this.fsGeometry.dispose();
    if(this.scene.fog)this.scene.fog=null;
  }
}
