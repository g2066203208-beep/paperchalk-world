/* Lightweight screen-space crepuscular rays for the paper diorama.
 * Main scene stays on the normal renderer path. A quarter-resolution depth
 * occlusion pass feeds a radial light-scattering pass; the result is upscaled
 * additively. This follows the classic low-resolution god-ray technique while
 * keeping mobile cost bounded.
 */
const VERT=`
varying vec2 vUv;
void main(){
  vUv=uv;
  gl_Position=vec4(position.xy,0.0,1.0);
}`;

export class AtmospherePostProcess{
  constructor(THREE,renderer,scene,{mobile=false}={}){
    this.THREE=THREE;this.renderer=renderer;this.scene=scene;this.mobile=!!mobile;
    this.settings={
      enabled:true,godRays:true,
      rayStrength:mobile?.34:.46,
      density:.92,decay:.965,weight:.070,
      fogDensity:.010,
      downsample:mobile?.20:.25
    };
    this.sunUv=new THREE.Vector2(.5,.5);
    this.sunNdc=new THREE.Vector3();
    this.cameraDir=new THREE.Vector3();
    this.sunDir=new THREE.Vector3();
    this.statsState={mode:'screen-space-depth-godrays-v1',enabled:true,godRays:true,visible:false};
    this.depthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.BasicDepthPacking});
    this.depthMaterial.blending=THREE.NoBlending;

    this.depthTarget=new THREE.WebGLRenderTarget(8,8,{
      minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,
      depthBuffer:true,stencilBuffer:false
    });
    this.depthTarget.texture.name='paperchalk-godray-depth-color';
    this.depthTarget.depthTexture=new THREE.DepthTexture(8,8,THREE.UnsignedIntType);
    this.depthTarget.depthTexture.name='paperchalk-godray-depth';

    this.rayTarget=new THREE.WebGLRenderTarget(8,8,{
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,
      depthBuffer:false,stencilBuffer:false
    });
    this.rayTarget.texture.name='paperchalk-godrays-lowres';

    const samples=mobile?18:28;
    this.rayMaterial=new THREE.ShaderMaterial({
      name:'PaperchalkCrepuscularRays',
      uniforms:{
        tDepth:{value:this.depthTarget.depthTexture},
        uSunUv:{value:this.sunUv},
        uDensity:{value:this.settings.density},
        uDecay:{value:this.settings.decay},
        uWeight:{value:this.settings.weight},
        uStrength:{value:0},
        uTime:{value:0}
      },
      vertexShader:VERT,
      fragmentShader:`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tDepth;
        uniform vec2 uSunUv;
        uniform float uDensity,uDecay,uWeight,uStrength,uTime;
        float hash12(vec2 p){
          vec3 p3=fract(vec3(p.xyx)*.1031);
          p3+=dot(p3,p3.yzx+33.33);
          return fract((p3.x+p3.y)*p3.z);
        }
        void main(){
          vec2 delta=(vUv-uSunUv)*(uDensity/float(${samples}));
          vec2 uv=vUv-delta*(hash12(gl_FragCoord.xy+uTime*17.0)-.5);
          float illumination=1.0;
          float rays=0.0;
          for(int i=0;i<${samples};i++){
            uv-=delta;
            float depth=texture2D(tDepth,clamp(uv,vec2(.001),vec2(.999))).x;
            float openSky=smoothstep(.9980,.99998,depth);
            float d=distance(uv,uSunUv);
            float source=(1.0-smoothstep(.018,.155,d))*openSky;
            rays+=source*illumination*uWeight;
            illumination*=uDecay;
          }
          rays=min(rays*uStrength,1.0);
          gl_FragColor=vec4(vec3(rays),1.0);
        }`,
      depthTest:false,depthWrite:false,toneMapped:false
    });

    this.overlayMaterial=new THREE.ShaderMaterial({
      name:'PaperchalkGodRayAdditiveComposite',
      uniforms:{
        tRays:{value:this.rayTarget.texture},
        uColor:{value:new THREE.Color(0xffdfae)}
      },
      vertexShader:VERT,
      fragmentShader:`
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tRays;
        uniform vec3 uColor;
        void main(){
          float ray=texture2D(tRays,vUv).r;
          gl_FragColor=vec4(uColor*ray,1.0);
        }`,
      transparent:true,blending:THREE.AdditiveBlending,
      depthTest:false,depthWrite:false,toneMapped:false
    });

    this.fsCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.fsScene=new THREE.Scene();
    this.fsQuad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.rayMaterial);
    this.fsQuad.frustumCulled=false;this.fsScene.add(this.fsQuad);

    this.fog=new THREE.FogExp2(0x7382a2,this.settings.fogDensity);
    this.scene.fog=this.fog;
    this._w=8;this._h=8;
  }

  configure(patch={}){
    Object.assign(this.settings,patch||{});
    this.settings.rayStrength=Math.max(0,Math.min(1.5,Number(this.settings.rayStrength)||0));
    this.settings.fogDensity=Math.max(0,Math.min(.04,Number(this.settings.fogDensity)||0));
    this.settings.downsample=Math.max(.125,Math.min(.5,Number(this.settings.downsample)||.25));
    this.rayMaterial.uniforms.uDensity.value=Math.max(.2,Math.min(1.4,Number(this.settings.density)||.92));
    this.rayMaterial.uniforms.uDecay.value=Math.max(.80,Math.min(.995,Number(this.settings.decay)||.965));
    this.rayMaterial.uniforms.uWeight.value=Math.max(.005,Math.min(.16,Number(this.settings.weight)||.07));
    this.fog.density=this.settings.fogDensity;
    this.resize(this._cssW||this._w,this._cssH||this._h,this._pixelRatio||1);
    return this.stats();
  }

  resize(width,height,pixelRatio=1){
    this._cssW=Math.max(1,width|0);this._cssH=Math.max(1,height|0);this._pixelRatio=Math.max(1,Number(pixelRatio)||1);
    const scale=this.settings.downsample;
    const w=Math.max(32,Math.round(this._cssW*this._pixelRatio*scale));
    const h=Math.max(18,Math.round(this._cssH*this._pixelRatio*scale));
    if(w===this._w&&h===this._h)return;
    this._w=w;this._h=h;
    this.depthTarget.setSize(w,h);this.rayTarget.setSize(w,h);
  }

  update({sunObject,camera,daylight=0,twilight=0,skyExposure=1,undergroundFactor=0,time=0}={}){
    if(!camera||!sunObject)return;
    const sunPos=sunObject.getWorldPosition(this.sunNdc);
    this.sunDir.copy(sunPos).sub(camera.position).normalize();
    camera.getWorldDirection(this.cameraDir);
    const facing=Math.max(0,Math.min(1,(this.cameraDir.dot(this.sunDir)-.02)/.28));
    this.sunNdc.copy(sunPos).project(camera);
    this.sunUv.set(this.sunNdc.x*.5+.5,this.sunNdc.y*.5+.5);
    const edgeFade=Math.max(0,Math.min(1,1-Math.max(Math.abs(this.sunNdc.x)-.82,Math.abs(this.sunNdc.y)-.82)/.42));
    const atmospheric=(daylight*.20+twilight*.60)*Math.max(.05,skyExposure)*(1-Math.max(0,Math.min(1,undergroundFactor)));
    const strength=this.settings.enabled&&this.settings.godRays?this.settings.rayStrength*atmospheric*facing*edgeFade:0;
    this.rayMaterial.uniforms.uStrength.value=strength;
    this.rayMaterial.uniforms.uTime.value=Number(time)||0;
    this.statsState={
      mode:'screen-space-depth-godrays-v1',enabled:!!this.settings.enabled,godRays:!!this.settings.godRays,
      visible:strength>.002,strength,daylight,twilight,skyExposure,undergroundFactor,
      sunUv:[this.sunUv.x,this.sunUv.y],samples:this.mobile?18:28,
      downsample:this.settings.downsample,buffer:[this._w,this._h],
      depthOcclusion:true,additiveComposite:true,fog:'FogExp2',fogDensity:this.fog.density,
      mobileQuality:this.mobile?'low-cost':'balanced'
    };
  }

  render({scene,camera,exclude=[]}={}){
    const renderer=this.renderer;
    renderer.setRenderTarget(null);
    renderer.render(scene,camera);
    const strength=this.rayMaterial.uniforms.uStrength.value;
    if(!this.settings.enabled||!this.settings.godRays||strength<=.002)return;

    const hidden=[];
    for(const o of exclude){
      if(!o)continue;hidden.push([o,o.visible]);o.visible=false;
    }
    const oldOverride=scene.overrideMaterial,oldAutoClear=renderer.autoClear;
    scene.overrideMaterial=this.depthMaterial;
    renderer.setRenderTarget(this.depthTarget);
    renderer.setClearColor(0xffffff,1);renderer.clear(true,true,true);
    renderer.render(scene,camera);
    scene.overrideMaterial=oldOverride;
    for(const [o,v] of hidden)o.visible=v;

    this.fsQuad.material=this.rayMaterial;
    renderer.setRenderTarget(this.rayTarget);
    renderer.setClearColor(0x000000,1);renderer.clear(true,false,false);
    renderer.render(this.fsScene,this.fsCamera);

    this.fsQuad.material=this.overlayMaterial;
    renderer.setRenderTarget(null);
    renderer.autoClear=false;
    renderer.render(this.fsScene,this.fsCamera);
    renderer.autoClear=oldAutoClear;
  }

  stats(){return {...this.statsState}}
  dispose(){
    if(this.scene.fog===this.fog)this.scene.fog=null;
    this.depthTarget.dispose();this.depthTarget.depthTexture?.dispose?.();this.rayTarget.dispose();
    this.depthMaterial.dispose();this.rayMaterial.dispose();this.overlayMaterial.dispose();this.fsQuad.geometry.dispose();
  }
}
