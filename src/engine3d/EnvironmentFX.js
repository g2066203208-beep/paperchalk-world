/* GPU precipitation + cheap atmospheric weather for the paper-stage world. */
export class EnvironmentFX{
  constructor(THREE,engine){
    this.THREE=THREE;this.engine=engine;this.scene=engine.scene;this.time=0;this.state='clear';this.epoch=-1;
    this.wind=.22;this.mobile=!!engine.mobileLike;this._build();
  }
  _build(){
    const T=this.THREE;
    this.scene.fog=new T.FogExp2(0x9fb2bd,.0065);
    this.rain=this._precip(false,this.mobile?900:1900);
    this.snow=this._precip(true,this.mobile?550:1100);
    this.rain.visible=false;this.snow.visible=false;this.scene.add(this.rain,this.snow);

    this.clouds=new T.Group();this.clouds.name='weather-cloud-deck';
    const geo=new T.PlaneGeometry(34,12);
    for(let i=0;i<(this.mobile?6:10);i++){
      const mat=new T.MeshBasicMaterial({color:0xd9dedf,transparent:true,opacity:.08,depthWrite:false,side:T.DoubleSide,toneMapped:false,fog:true});
      const m=new T.Mesh(geo,mat);m.rotation.x=-Math.PI/2;
      m.position.set((i%5-2)*26+(i%2)*7,24+(i%3)*1.3,Math.floor(i/5)*34-17);
      m.scale.set(1+(i%3)*.28,1,1);this.clouds.add(m);
    }
    this.cloudGeometry=geo;this.scene.add(this.clouds);
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
          gl_PointSize=${snow?'4.0':'2.0'};}`,
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

    this.clouds.position.set(p.x,0,p.z);
    let i=0;for(const c of this.clouds.children){
      c.material.opacity+=(q.cloud*.42-c.material.opacity)*Math.min(1,dt*.8);
      c.position.x+=this.wind*dt*(.55+(i++%3)*.12);if(c.position.x>70)c.position.x=-70;
    }

    const L=this.engine.terrainLights;
    if(L?.sun)L.sun.intensity*=q.light;
    if(L?.skyFill)L.skyFill.intensity*=.68+.32*q.light;
    if(L?.ambient)L.ambient.intensity*=.78+.22*q.light;
    this.engine.oceanRenderer?.setWeather?.(this.state,this.wind);
  }
  stats(){
    return {state:this.state,fogDensity:this.scene.fog?.density||0,wind:this.wind,
      rain:this.rain.visible,snow:this.snow.visible,particleMode:'gpu-vertex-shader',
      rainParticles:this.rain.geometry.attributes.position.count,snowParticles:this.snow.geometry.attributes.position.count};
  }
  dispose(){
    for(const o of [this.rain,this.snow]){this.scene.remove(o);o.geometry.dispose();o.material.dispose()}
    for(const c of [...this.clouds.children])c.material.dispose();
    this.cloudGeometry.dispose();this.scene.remove(this.clouds);
  }
}
