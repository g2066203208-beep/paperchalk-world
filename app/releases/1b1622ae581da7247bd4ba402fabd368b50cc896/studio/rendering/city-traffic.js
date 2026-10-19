/** One quiet paper car on a separate foreground road; simulation pauses with dt=0. */
export function createCityTraffic({THREE,scene}){
  const group=new THREE.Group();group.name='Paper city traffic';group.position.set(-5,.05,3.5);scene.add(group);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext('2d');ctx.translate(256,245);ctx.scale(140,-190);
  const body=[[-1.7,.32],[-1.31,.26],[-1.25,.09],[-1.08,.01],[-.91,.09],[-.85,.24],[.80,.24],
    [.85,.09],[1.03,.01],[1.20,.09],[1.27,.27],[1.7,.30],[1.67,.58],[1.20,.68],[.62,1.10],[-.55,1.14],[-1.10,.74],[-1.63,.63]];
  function path(points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
  function fill(points,color){path(points);ctx.fillStyle=color;ctx.fill();}
  function line(points,color,width=.014){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.stroke();}
  function oval(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  fill(body,'#8eaaae');
  fill([[-1.67,.32],[1.68,.31],[1.65,.45],[-1.64,.47]],'#67878e');
  fill([[-1.56,.57],[-1.06,.66],[1.16,.65],[1.59,.57],[1.61,.53],[-1.56,.53]],'#b8c8c2');
  fill([[-.96,.74],[-.48,1.07],[.53,1.035],[1.05,.71]],'#344d63');
  fill([[-.89,.76],[-.45,1.035],[-.17,1.025],[-.28,.755]],'#59788a');
  fill([[-.095,1.025],[.50,1.004],[.935,.742],[-.14,.747]],'#627e8b');
  fill([[-.42,1.028],[.05,1.025],[-.15,.753],[-.31,.754]],'#829aa3');
  line([[-.15,.72],[-.13,.40]],'#56747c',.012);
  line([[1.03,.68],[1.10,.47]],'#66868d',.012);
  line([[-1.05,.71],[-1.17,.52]],'#66868d',.012);
  line([[-.31,.63],[-.16,.63]],'#d3d9cc',.018);line([[.62,.62],[.76,.62]],'#d3d9cc',.018);
  for(const x of [-1.08,1.03]){
    oval(x,.24,.23,.23,'#293745');oval(x,.24,.137,.137,'#849498');oval(x,.24,.072,.072,'#b8c1b9');
    oval(x-.023,.27,.043,.040,'#d1d4c5');
  }
  fill([[1.40,.48],[1.66,.46],[1.65,.59],[1.43,.60]],'#f4d9a2');
  fill([[-1.69,.46],[-1.50,.47],[-1.50,.58],[-1.65,.59]],'#cd8871');
  line([[-1.64,.32],[-1.38,.32]],'#c6cec4',.025);line([[1.32,.31],[1.66,.32]],'#c6cec4',.025);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
  texture.name='Paper city car shared atlas';
  const faceMaterial=new THREE.MeshLambertMaterial({map:texture,color:0xffffff,emissive:0x34434d,emissiveIntensity:.20});
  const edgeMaterial=new THREE.MeshLambertMaterial({color:0x65777c});
  const pieces=[{positions:[],uvs:[]},{positions:[],uvs:[]}];
  const vectors=body.map(p=>new THREE.Vector2(...p)),triangles=THREE.ShapeUtils.triangulateShape(vectors,[]),depth=.055;
  function triangle(points,batch){for(const [x,y,z] of points){pieces[batch].positions.push(x,y,z);pieces[batch].uvs.push((256+x*140)/512,1-(245-y*190)/256);}}
  for(const ids of triangles){triangle(ids.map(i=>[...body[i],depth]),0);triangle([...ids].reverse().map(i=>[...body[i],0]),1);}
  for(let i=0;i<body.length;i++){
    const a=body[i],b=body[(i+1)%body.length];triangle([[...a,0],[...b,0],[...b,depth]],1);triangle([[...a,0],[...b,depth],[...a,depth]],1);
  }
  let geometryTriangles=0;
  pieces.forEach((piece,i)=>{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(piece.positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(piece.uvs,2));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    geometryTriangles+=piece.positions.length/9;
    const mesh=new THREE.Mesh(geometry,i?edgeMaterial:faceMaterial);mesh.name=i?'Car cut edge':'Painted paper car';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  });
  // A very dim painted pool on the road suggests headlights without another light/shadow map.
  const lightGeometry=new THREE.BufferGeometry();
  lightGeometry.setAttribute('position',new THREE.Float32BufferAttribute([1.45,.008,.025,3.85,.008,-.45,3.85,.008,.62],3));
  lightGeometry.setAttribute('alpha',new THREE.Float32BufferAttribute([.075,0,0],1));
  const lightMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{tint:{value:new THREE.Color(0xf0d7a3)}},
    vertexShader:'attribute float alpha; varying float vAlpha; void main(){vAlpha=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 tint; varying float vAlpha; void main(){gl_FragColor=vec4(tint,vAlpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
  });
  const light=new THREE.Mesh(lightGeometry,lightMaterial);light.name='Restrained car light on road';group.add(light);geometryTriangles++;
  let travelled=0,loops=0;const minX=-22,maxX=35,speed=3.2;
  return {group,
    update(dt){
      if(!Number.isFinite(dt)||dt<=0)return false;
      const distance=speed*Math.min(dt,.1),next=group.position.x+distance;
      group.position.x=next>maxX?minX+(next-maxX):next;
      if(next>maxX)loops++;
      travelled+=distance;return true;
    },
    stats:()=>({cars:1,batches:3,triangles:geometryTriangles,atlasWidth:512,atlasHeight:256,x:group.position.x,
      roadZ:group.position.z,roadY:group.position.y,speed,travelled,loops}),
  };
}
