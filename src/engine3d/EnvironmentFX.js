/* GPU precipitation + cheap atmospheric weather for the paper-stage world. */
export class EnvironmentFX{
  constructor(THREE,engine){
    this.THREE=THREE;this.engine=engine;this.scene=engine.scene;this.time=0;this.state='clear';this.epoch=-1;
    this.wind=.22;this.groundWetness=0;this.snowCover=0;this.mobile=!!engine.mobileLike;this._build();
  }
  _build(){
    const T=this.THREE;
    this.scene.fog=new T.FogExp2(0x9fb2bd,.0065);
    this.skyUniforms={
      uZenith:{value:new T.Color(0x6688aa)},uHorizon:{value:new T.Color(0xb7c5c9)},
      uSunDir:{value:new T.Vector3(0,1,.2)},uDaylight:{value:1},uCloud:{value:0}
    };
    this.skyGeometry=new T.SphereGeometry(470,this.mobile?20:32,this.mobile?12:18);
    this.skyMaterial=new T.ShaderMaterial({
      side:T.BackSide,depthWrite:false,depthTest:false,toneMapped:false,
      uniforms:this.skyUniforms,
      vertexShader:`varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`varying vec3 vDir;uniform vec3 uZenith;uniform vec3 uHorizon;uniform vec3 uSunDir;uniform float uDaylight;uniform float uCloud;
        void main(){float h=smoothstep(-.12,.82,vDir.y);vec3 col=mix(uHorizon,uZenith,h);
          float sun=pow(max(dot(normalize(vDir),normalize(uSunDir)),0.0),180.0);
          col+=vec3(1.0,.72,.35)*sun*uDaylight*(1.0-uCloud*.75);
          vec3 night=mix(vec3(.045,.060,.115),vec3(.105,.135,.205),h);
          col=mix(night,col,uDaylight);gl_FragColor=vec4(col,1.0);}`
    });
    this.sky=new T.Mesh(this.skyGeometry,this.skyMaterial);this.sky.name='atmosphere-sky-dome';this.sky.frustumCulled=false;this.sky.renderOrder=-1000;this.scene.add(this.sky);
    this.rain=this._precip(false,this.mobile?900:1900);
    this.snow=this._precip(true,this.mobile?550:1100);
    this.rain.visible=false;this.snow.visible=false;this.scene.add(this.rain,this.snow);

    this.clouds=new T.Group();this.clouds.name='weather-cloud-deck';
    const cloudCanvas=document.createElement('canvas');cloudCanvas.width=256;cloudCanvas.height=96;
    const ctx=cloudCanvas.getContext('2d');ctx.clearRect(0,0,256,96);
    const blobs=[[38,54,34],[75,42,42],[118,51,48],[164,39,38],[205,54,36],[137,31,30]];
    for(const [x,y,r] of blobs){
      const g=ctx.createRadialGradient(x,y,r*.10,x,y,r);
      g.addColorStop(0,'rgba(255,255,255,.96)');g.addColorStop(.58,'rgba(255,255,255,.72)');g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    }
    this.cloudTexture=new T.CanvasTexture(cloudCanvas);this.cloudTexture.colorSpace=T.SRGBColorSpace;
    this.cloudTexture.minFilter=T.LinearMipmapLinearFilter;this.cloudTexture.magFilter=T.LinearFilter;
    for(let i=0;i<(this.mobile?5:8);i++){
      const mat=new T.SpriteMaterial({map:this.cloudTexture,color:0xf2f0e7,transparent:true,opacity:.08,depthWrite:false,toneMapped:false,fog:true});
      const m=new T.Sprite(mat);
      m.position.set((i%4-1.5)*32+(i%2)*8,15+(i%3)*2.1,-34-(i%2)*6);
      const scale=18+(i%3)*5;m.scale.set(scale,scale*.34,1);this.clouds.add(m);
    }
    this.cloudGeometry=null;this.scene.add(this.clouds);
  }
  _precip(snow,count){
    const T=this.THREE,p=new Float32Array(count*3),seed=new Float32Array(count);
    for(let i=0;i<count;i++){
      const h=((i*1103515245+12345)>>>0)/4294967295;
      const h2=((i*2654435761+97)>>>0)/4294967295;
      const h3=((i*2246822519+313)>>>0)/4294967295;
      p[i*3]=(h-.5)*34;p[i*3+1]=h2*26;p[i*3+2]=(h3-.5)*22;seed[i]=(h+h2*.37+h3*.19)%1;
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('aSeed',new T.BufferAttribute(seed,1));
    const mat=new T.ShaderMaterial({
      transparent:true,depthWrite:false,fog:false,
      uniforms:{uTime:{value:0},uOrigin:{value:new T.Vector3()},uWind:{value:.22},uOpacity:{value:0}},
      vertexShader:`attribute float aSeed;uniform float uTime;uniform vec3 uOrigin;uniform float uWind;
        void main(){vec3 p=position;float fall=${snow?'1.25':'14.0'};
          p.y=mod(p.y-uTime*fall+aSeed*26.0,26.0)-5.0;
          p.x+=sin(uTime*${snow?'1.6':'0.75'}+aSeed*31.0)*${snow?'1.35':'.20'}+uWind*(21.0-p.y)*.10;
          p+=uOrigin;vec4 mv=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*mv;
          gl_PointSize=${snow?'4.6':'5.2'};}`,
      fragmentShader:`uniform float uOpacity;void main(){vec2 q=gl_PointCoord-.5;
        ${snow?'if(dot(q,q)>.24)discard;':'if(abs(q.x)>.20)discard;'}
        gl_FragColor=vec4(${snow?'0.95,0.98,1.0':'0.70,0.84,0.96'},uOpacity);}`
    });
    const points=new T.Points(g,mat);points.frustumCulled=false;points.renderOrder=90;return points;
  }
  _profile(name){
    return ({
      clear:{fog:.0065,cloud:.08,rain:0,snow:0,light:1,wind:.22,sky:0x7894b0},
      cloudy:{fog:.011,cloud:.48,rain:0,snow:0,light:.78,wind:.42,sky:0x8092a0},
      rain:{fog:.018,cloud:.72,rain:.68,snow:0,light:.62,wind:.78,sky:0x687c88},
      storm:{fog:.028,cloud:.92,rain:1,snow:0,light:.43,wind:1.3,sky:0x52636d},
      snow:{fog:.021,cloud:.66,rain:0,snow:.78,light:.78,wind:.48,sky:0xa8b7bf},
      blizzard:{fog:.038,cloud:.88,rain:0,snow:1,light:.56,wind:1.45,sky:0x9aa8ad},
      fog:{fog:.045,cloud:.35,rain:0,snow:0,light:.70,wind:.10,sky:0x9aa7a8}
    })[name]||this._profile('clear');
  }
  _hashText(text){
    let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967295;
  }
  _choose(snapshot,epoch){
    const w=snapshot?.world||{},b=String(w.biome||''),h=Number(w.elevation)||0;
    const r=this._hashText(b+'|'+Math.floor((Number(w.minutes)||0)/90)+'|'+epoch);
    const cold=b.includes('snow')||b.includes('alpine')||b.includes('pine')&&h>15;
    const wet=b==='ocean'||b==='marsh'||b==='forest';
    if(cold)return r<.18?'blizzard':r<.56?'snow':r<.76?'cloudy':'clear';
    if(wet)return r<.12?'storm':r<.48?'rain':r<.74?'cloudy':r<.80?'fog':'clear';
    return r<.07?'storm':r<.24?'rain':r<.46?'cloudy':r<.52?'fog':'clear';
  }
  update(dt,snapshot){
    dt=Math.max(0,Math.min(.05,Number(dt)||0));this.time+=dt;
    const epoch=Math.floor(this.time/75);
    if(epoch!==this.epoch){this.epoch=epoch;this.state=this._choose(snapshot,epoch)}
    const p=snapshot?.player||{x:0,y:0,z:0},q=this._profile(this.state),T=this.THREE;
    const minutes=((Number(snapshot?.world?.minutes)||0)%1440+1440)%1440;
    const angle=(minutes/1440-.25)*Math.PI*2,solar=Math.sin(angle);
    const daylight=Math.max(0,Math.min(1,(solar+.08)/.24));
    this.sky.position.set(p.x,p.y,p.z);
    this.skyUniforms.uSunDir.value.set(Math.cos(angle),solar,.28).normalize();
    this.skyUniforms.uDaylight.value=daylight;
    this.skyUniforms.uCloud.value=q.cloud;
    const zenith=new T.Color(q.sky),horizon=new T.Color(q.sky).lerp(new T.Color(0xe6c9a9),daylight*.28*(1-q.cloud));
    this.skyUniforms.uZenith.value.lerp(zenith,Math.min(1,dt*.45));
    this.skyUniforms.uHorizon.value.lerp(horizon,Math.min(1,dt*.45));
    this.wind+=(q.wind-this.wind)*Math.min(1,dt*1.2);
    this.scene.fog.density+=(q.fog-this.scene.fog.density)*Math.min(1,dt*.75);
    const fogTarget=new T.Color(q.sky);this.scene.fog.color.lerp(fogTarget,Math.min(1,dt*.65));
    this.engine.fixedBackgroundColor.lerp(fogTarget,Math.min(1,dt*.45));

    for(const o of [this.rain,this.snow]){
      o.material.uniforms.uTime.value=this.time;o.material.uniforms.uOrigin.value.set(p.x,p.y,p.z);
      o.material.uniforms.uWind.value=this.wind;
    }
    this.rain.material.uniforms.uOpacity.value+=(q.rain*.74-this.rain.material.uniforms.uOpacity.value)*Math.min(1,dt*4);
    this.snow.material.uniforms.uOpacity.value+=(q.snow*.90-this.snow.material.uniforms.uOpacity.value)*Math.min(1,dt*3);
    this.rain.visible=this.rain.material.uniforms.uOpacity.value>.01;this.snow.visible=this.snow.material.uniforms.uOpacity.value>.01;

    this.clouds.position.set(p.x,0,0);
    let i=0;for(const c of this.clouds.children){
      c.material.opacity+=(q.cloud*.42-c.material.opacity)*Math.min(1,dt*.8);
      c.position.x+=this.wind*dt*(.55+(i++%3)*.12);if(c.position.x>70)c.position.x=-70;
    }

    const L=this.engine.terrainLights;
    if(L?.sun)L.sun.intensity*=q.light;
    if(L?.skyFill)L.skyFill.intensity*=.68+.32*q.light;
    if(L?.ambient)L.ambient.intensity*=.78+.22*q.light;
    const wetTarget=Math.max(q.rain*.95,q.cloud*.12);
    const snowTarget=q.snow;
    const wetRate=wetTarget>this.groundWetness?dt*.55:dt*.08;
    const snowRate=snowTarget>this.snowCover?dt*.18:dt*.035;
    this.groundWetness+=(wetTarget-this.groundWetness)*Math.min(1,wetRate);
    this.snowCover+=(snowTarget-this.snowCover)*Math.min(1,snowRate);
    if(q.rain>.2)this.snowCover=Math.max(0,this.snowCover-dt*.06);
    this.engine.oceanRenderer?.setWeather?.(this.state,this.wind);
    this.engine.terrainRenderer?.setWeatherVisuals?.({wetness:this.groundWetness,snow:this.snowCover});
  }
  stats(){
    return {state:this.state,fogDensity:this.scene.fog?.density||0,wind:this.wind,
      rain:this.rain.visible,snow:this.snow.visible,groundWetness:this.groundWetness,snowCover:this.snowCover,particleMode:'gpu-vertex-shader',skyMode:'shader-gradient-dome',
      rainParticles:this.rain.geometry.attributes.position.count,snowParticles:this.snow.geometry.attributes.position.count};
  }
  dispose(){
    for(const o of [this.rain,this.snow]){this.scene.remove(o);o.geometry.dispose();o.material.dispose()}
    for(const c of [...this.clouds.children])c.material.dispose();
    this.cloudGeometry?.dispose?.();this.cloudTexture?.dispose?.();this.scene.remove(this.clouds);
    this.scene.remove(this.sky);this.skyGeometry.dispose();this.skyMaterial.dispose();
  }
}
