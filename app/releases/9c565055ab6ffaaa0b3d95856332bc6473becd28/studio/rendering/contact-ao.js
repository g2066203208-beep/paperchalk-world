/** Local, depth-tested ambient occlusion for overlapping paper and ground contact.
 * Half-resolution hemisphere sampling, depth-aware denoising, no temporal noise.
 * This supplements texture AO: the input is the current scene's actual depth.
 */
export const CONTACT_AO=Object.freeze({scale:.5,samples:16,radius:.32,bias:.008});

export function createContactAO({THREE,renderer,camera,screenCamera,screenGeometry}){
  let rawTarget=null,filteredTarget=null,width=1,height=1;
  const uniforms={
    sceneDepth:{value:null},projectionInverse:{value:new THREE.Matrix4()},
    projection:{value:new THREE.Matrix4()},depthTexel:{value:new THREE.Vector2()},
    radius:{value:CONTACT_AO.radius},bias:{value:CONTACT_AO.bias}
  };
  const vertexShader=`
    varying vec2 vUv;
    void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}
  `;
  const material=new THREE.ShaderMaterial({
    uniforms,depthWrite:false,depthTest:false,toneMapped:false,vertexShader,
    fragmentShader:`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D sceneDepth;
      uniform mat4 projectionInverse;
      uniform mat4 projection;
      uniform vec2 depthTexel;
      uniform float radius;
      uniform float bias;

      vec3 viewPosition(vec2 uv){
        // Depth uses nearest sampling. Reconstruct that texel's actual centre,
        // not an arbitrary point on its footprint (half-resolution AO otherwise
        // creates phase bands on perfectly planar oblique paper faces).
        uv=(floor(uv/depthTexel)+.5)*depthTexel;
        float depth=textureLod(sceneDepth,uv,0.0).x;
        vec4 view=projectionInverse*vec4(uv*2.0-1.0,depth*2.0-1.0,1.0);
        return view.xyz/view.w;
      }
      vec3 surfaceNormal(vec2 uv,vec3 p){
        vec3 left=p-viewPosition(uv-vec2(depthTexel.x,0.0));
        vec3 right=viewPosition(uv+vec2(depthTexel.x,0.0))-p;
        vec3 down=p-viewPosition(uv-vec2(0.0,depthTexel.y));
        vec3 up=viewPosition(uv+vec2(0.0,depthTexel.y))-p;
        // Choose the side belonging to this surface at a cut-paper silhouette.
        vec3 dx=abs(left.z)<abs(right.z)?left:right;
        vec3 dy=abs(down.z)<abs(up.z)?down:up;
        vec3 n=cross(dx,dy);
        return dot(n,n)>.0000000001?normalize(n):vec3(0.0,0.0,1.0);
      }
      void main(){
        vec2 receiverUv=(floor(vUv/depthTexel)+.5)*depthTexel;
        float depth=textureLod(sceneDepth,receiverUv,0.0).x;
        if(depth>=.99999){gl_FragColor=vec4(1.0,100.0,0.0,1.0);return;}
        vec3 p=viewPosition(receiverUv);
        vec3 n=surfaceNormal(receiverUv,p);
        vec3 axis=abs(n.z)<.95?vec3(0.0,0.0,1.0):vec3(0.0,1.0,0.0);
        vec3 tangent=normalize(cross(axis,n));
        vec3 bitangent=cross(n,tangent);
        float rotation=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453)*6.2831853;
        float blocked=0.0,valid=0.0;
        for(int i=0;i<16;i++){
          float t=(float(i)+.5)/16.0;
          float a=float(i)*2.3999632+rotation;
          float disk=sqrt(t);
          vec3 direction=tangent*cos(a)*disk+bitangent*sin(a)*disk+n*sqrt(1.0-t);
          float scale=.18+.82*t*t;
          vec3 q=p+direction*radius*scale;
          vec4 clip=projection*vec4(q,1.0);
          vec2 uv=clip.xy/clip.w*.5+.5;
          float inBounds=step(.001,uv.x)*step(uv.x,.999)*step(.001,uv.y)*step(uv.y,.999);
          vec2 sampleUv=clamp(uv,vec2(.001),vec2(.999));
          float sampledDepth=textureLod(sceneDepth,sampleUv,0.0).x;
          vec3 hit=viewPosition(sampleUv);
          float locality=1.0-smoothstep(radius*.45,radius*1.15,length(hit-p));
          // Reject the receiver itself. Nearest depth texels and narrow bevels
          // otherwise produce false seams across a flat, joined paper wall.
          float aboveSurface=smoothstep(bias*1.5,bias*4.0,dot(hit-p,n));
          blocked+=step(q.z+bias,hit.z)*locality*aboveSurface*inBounds*(1.0-step(.99999,sampledDepth));
          valid+=inBounds;
        }
        float ao=clamp(1.0-blocked/max(valid,1.0)*1.65,.24,1.0);
        gl_FragColor=vec4(ao,-p.z,0.0,1.0);
      }
    `
  });
  const filterUniforms={source:{value:null},texel:{value:new THREE.Vector2()}};
  const filter=new THREE.ShaderMaterial({
    uniforms:filterUniforms,depthWrite:false,depthTest:false,toneMapped:false,vertexShader,
    fragmentShader:`
      varying vec2 vUv;
      uniform sampler2D source;
      uniform vec2 texel;
      void main(){
        vec2 center=textureLod(source,vUv,0.0).rg;
        float sum=0.0,weight=0.0;
        for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
          vec2 sampleValue=textureLod(source,vUv+vec2(float(x),float(y))*texel,0.0).rg;
          float spatial=(x==0?2.0:1.0)*(y==0?2.0:1.0);
          float edge=exp(-abs(sampleValue.y-center.y)/max(.018,center.y*.003));
          float w=spatial*edge;
          sum+=sampleValue.x*w;weight+=w;
        }
        gl_FragColor=vec4(sum/max(weight,.0001),center.y,0.0,1.0);
      }
    `
  });
  const rawScene=new THREE.Scene(),filterScene=new THREE.Scene();
  rawScene.add(new THREE.Mesh(screenGeometry,material));
  filterScene.add(new THREE.Mesh(screenGeometry,filter));
  function resize(fullWidth,fullHeight){
    width=Math.max(2,Math.ceil(fullWidth*CONTACT_AO.scale));
    height=Math.max(2,Math.ceil(fullHeight*CONTACT_AO.scale));
    rawTarget?.dispose();filteredTarget?.dispose();
    const options={type:THREE.HalfFloatType,format:THREE.RGBAFormat,
      minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false};
    rawTarget=new THREE.WebGLRenderTarget(width,height,options);
    filteredTarget=new THREE.WebGLRenderTarget(width,height,options);
    rawTarget.texture.colorSpace=filteredTarget.texture.colorSpace=THREE.NoColorSpace;
    uniforms.depthTexel.value.set(1/fullWidth,1/fullHeight);
    filterUniforms.source.value=rawTarget.texture;
    filterUniforms.texel.value.set(1/width,1/height);
  }
  function render(depthTexture){
    uniforms.sceneDepth.value=depthTexture;
    uniforms.projectionInverse.value.copy(camera.projectionMatrixInverse);
    uniforms.projection.value.copy(camera.projectionMatrix);
    renderer.setRenderTarget(rawTarget);renderer.render(rawScene,screenCamera);
    renderer.setRenderTarget(filteredTarget);renderer.render(filterScene,screenCamera);
  }
  return {resize,render,get texture(){return filteredTarget?.texture;},
    get texel(){return filterUniforms.texel.value;},
    stats:()=>({width,height,...CONTACT_AO}),
    dispose(){rawTarget?.dispose();filteredTarget?.dispose();material.dispose();filter.dispose();}
  };
}
