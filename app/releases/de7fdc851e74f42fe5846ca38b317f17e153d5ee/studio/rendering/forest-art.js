/** Shared cut-paper silhouettes. Their outlines carry the design, not tessellation. */
export const CROWN_OUTLINES=Object.freeze([
  [[-1.50,.14],[-1.73,.30],[-1.79,.55],[-1.66,.83],[-1.37,.94],[-1.31,1.24],
    [-1.06,1.43],[-.74,1.45],[-.53,1.76],[-.17,1.84],[.14,1.70],[.44,1.86],
    [.75,1.78],[.94,1.50],[1.25,1.38],[1.41,1.14],[1.39,.90],[1.64,.65],
    [1.57,.33],[1.28,.14],[.96,.19],[.57,-.04],[.14,.07],[-.25,-.09],[-.70,.10],[-1.10,.03]],
  [[-1.49,.14],[-1.65,.37],[-1.51,.58],[-1.21,.68],[-1.04,.91],[-.71,.97],
    [-.40,.87],[-.16,1.11],[.19,1.13],[.43,.93],[.72,1.02],[1.01,.89],
    [1.08,.67],[1.36,.57],[1.49,.32],[1.29,.11],[.96,.15],[.69,-.04],
    [.33,.02],[.04,-.12],[-.38,.04],[-.78,-.02],[-1.13,.12]],
]);

const TRUNK_OUTLINE=[[-.32,0],[-.21,.24],[-.15,1.75],[-.40,2.36],[-.86,2.84],
  [-.78,2.94],[-.25,2.60],[-.13,2.30],[-.09,3.67],[-.47,4.08],[-.39,4.17],
  [.04,3.80],[.30,4.19],[.39,4.11],[.11,3.60],[.12,2.48],[.56,2.91],
  [.88,3.08],[.93,2.98],[.63,2.71],[.17,2.14],[.22,.32],[.34,0]];

export function createPaperArtGeometry({THREE,parts}){
  const positions=[],normals=[],uvs=[],colors=[],stocks=[],indicesByMaterial=[[],[],[],[]];
  let uvBox={minX:0,minY:0,width:1,height:1};
  function triangle(a,b,c,material,shade=1){
    const start=positions.length/3,ab=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a));
    const ac=new THREE.Vector3().subVectors(new THREE.Vector3(...c),new THREE.Vector3(...a)),normal=ab.cross(ac).normalize();
    for(const point of [a,b,c]){
      positions.push(...point);normals.push(normal.x,normal.y,normal.z);
      const u=material===3?.5:(point[0]-uvBox.minX)/uvBox.width,v=material===3?.5:(point[1]-uvBox.minY)/uvBox.height;
      uvs.push((material%2)*.5+.012+u*.476,(material<2?.5:0)+.012+v*.476);
      colors.push(shade,shade,shade);stocks.push(material);
    }
    indicesByMaterial[material].push(start,start+1,start+2);
  }
  let outlineVertices=0;
  for(const {outline,depth=.035,material=0,x=0,y=0,z=0,scaleX=1,scaleY=1,shade=1} of parts){
    const points=outline.map(([px,py])=>new THREE.Vector2(px*scaleX+x,py*scaleY+y));
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    uvBox={minX:Math.min(...xs),minY:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
    // ShapeUtils accepts either winding, while every emitted face is made outward.
    if(THREE.ShapeUtils.isClockWise(points))points.reverse();
    const front=p=>[p.x,p.y,z+depth*.5],back=p=>[p.x,p.y,z-depth*.5];
    for(const face of THREE.ShapeUtils.triangulateShape(points,[])){
      const [a,b,c]=face.map(i=>points[i]);
      triangle(front(a),front(b),front(c),material,shade);
      triangle(back(a),back(c),back(b),material,shade*.97);
    }
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const edgeShade=b.y>a.y?.98:.87;
      triangle(front(a),back(a),back(b),3,edgeShade);
      triangle(front(a),back(b),front(b),3,edgeShade);
    }
    outlineVertices+=points.length;
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('paperStock',new THREE.Uint8BufferAttribute(stocks,1));
  geometry.setIndex(indicesByMaterial.flat());
  let offset=0;for(let i=0;i<indicesByMaterial.length;i++){
    const count=indicesByMaterial[i].length;if(count)geometry.addGroup(offset,count,i);offset+=count;
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.userData={paperSilhouette:true,parts:parts.length,outlineVertices,triangles:positions.length/9};
  return geometry;
}

export function createPaperTreeGeometry(THREE){
  const geometry=createPaperArtGeometry({THREE,parts:[
    {outline:TRUNK_OUTLINE,depth:.050,material:2,z:-.09},
    {outline:CROWN_OUTLINES[0],depth:.035,material:0,y:3.15,z:0},
    {outline:CROWN_OUTLINES[1],depth:.030,material:1,x:-.22,y:2.98,z:.07,scaleX:.87,scaleY:.78},
  ]});
  geometry.userData.crownSheets=2;return geometry;
}

/** Different paper stocks share position, normals, UVs and indices on the GPU. */
export function tintPaperArtGeometry(THREE,source,palette){
  const geometry=new THREE.BufferGeometry(),colors=new Float32Array(source.attributes.position.count*3);
  const pigments=palette.map(hex=>new THREE.Color(hex));
  for(const [name,attribute] of Object.entries(source.attributes))if(name!=='color')geometry.setAttribute(name,attribute);
  for(let i=0;i<source.attributes.position.count;i++){
    const pigment=pigments[source.attributes.paperStock.getX(i)],shade=source.attributes.color.getX(i);
    colors[i*3]=pigment.r*shade;colors[i*3+1]=pigment.g*shade;colors[i*3+2]=pigment.b*shade;
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(source.index);
  geometry.boundingBox=source.boundingBox;geometry.boundingSphere=source.boundingSphere;
  geometry.userData={...source.userData,palette:[...palette],singlePaperDraw:true};return geometry;
}

/** One restrained illustration atlas: foliage sprigs, broad folds and bark ink. */
export function createForestPaperAtlas(THREE){
  const size=512,tileSize=256,data=new Uint8Array(size*size*4);
  const paint=(tile,x,y,tone,alpha=1)=>{
    if(x<0||y<0||x>=tileSize||y>=tileSize)return;
    const px=x+(tile%2)*tileSize,py=y+(tile<2?tileSize:0),offset=(py*size+px)*4;
    const value=Math.max(0,Math.min(255,tone));
    for(let c=0;c<3;c++)data[offset+c]=Math.round(data[offset+c]*(1-alpha)+value*alpha);
    data[offset+3]=255;
  };
  for(let tile=0;tile<4;tile++)for(let y=0;y<tileSize;y++)for(let x=0;x<tileSize;x++){
    const u=x/(tileSize-1),v=y/(tileSize-1);
    let value=251;
    if(tile<2){
      const fold=u-(tile===0?.34+.24*v:.63-.29*v);
      value=247+(fold>0?5:-5)+(u+v>1.22?-4:0)+Math.sin(u*5.4+v*3.1)*1.2;
    }else if(tile===2)value=249-6*Math.cos((u-.49)*14)-2*Math.sin(v*9+u*3);
    paint(tile,x,y,value);
  }
  function polygon(tile,points,tone,opacity=1){
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.max(0,Math.floor(Math.min(...xs)*tileSize)),maxX=Math.min(tileSize-1,Math.ceil(Math.max(...xs)*tileSize));
    const minY=Math.max(0,Math.floor(Math.min(...ys)*tileSize)),maxY=Math.min(tileSize-1,Math.ceil(Math.max(...ys)*tileSize));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const px=(x+.5)/tileSize,py=(y+.5)/tileSize;let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++){
        const a=points[i],b=points[j];if((a[1]>py)!==(b[1]>py)&&px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      }
      if(inside)paint(tile,x,y,tone,opacity);
    }
  }
  function stroke(tile,a,b,width,tone,opacity=1){
    const minX=Math.max(0,Math.floor((Math.min(a[0],b[0])-width)*tileSize)),maxX=Math.min(tileSize-1,Math.ceil((Math.max(a[0],b[0])+width)*tileSize));
    const minY=Math.max(0,Math.floor((Math.min(a[1],b[1])-width)*tileSize)),maxY=Math.min(tileSize-1,Math.ceil((Math.max(a[1],b[1])+width)*tileSize));
    const dx=b[0]-a[0],dy=b[1]-a[1],lengthSq=dx*dx+dy*dy||1;
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const u=(x+.5)/tileSize,v=(y+.5)/tileSize,t=Math.max(0,Math.min(1,((u-a[0])*dx+(v-a[1])*dy)/lengthSq));
      const distance=Math.hypot(u-a[0]-dx*t,v-a[1]-dy*t),coverage=Math.max(0,Math.min(1,(width-distance)*tileSize+.5));
      if(coverage)paint(tile,x,y,tone,opacity*coverage);
    }
  }
  function leaf(tile,base,tip,width,tone){
    const dx=tip[0]-base[0],dy=tip[1]-base[1],length=Math.hypot(dx,dy),nx=-dy/length*width,ny=dx/length*width;
    const point=(t,side)=>[base[0]+dx*t+nx*side,base[1]+dy*t+ny*side];
    polygon(tile,[base,point(.35,1),point(.72,.75),tip,point(.66,-.67),point(.27,-.60)],tone,.68);
    stroke(tile,base,tip,.0018,tone-9,.40);
  }
  function sprig(tile,x,y,length,lean){
    const at=t=>[x+lean*t+.028*Math.sin(t*Math.PI),y+length*t];
    for(let j=1;j<=9;j++)stroke(tile,at((j-1)/9),at(j/9),.0027,211,.56);
    for(const [i,t] of [.26,.51,.75].entries()){
      const base=at(t),span=.10-i*.013;
      leaf(tile,base,[base[0]-span,base[1]+.10-i*.012],.023-i*.002,218+i*3);
      leaf(tile,[base[0]+.003,base[1]+.027],[base[0]+span*.88,base[1]+.115-i*.013],.021-i*.002,227-i*2);
    }
  }
  sprig(0,.24,.28,.32,-.025);sprig(0,.55,.40,.33,.045);sprig(0,.80,.21,.27,-.045);
  sprig(1,.22,.34,.25,.025);sprig(1,.55,.25,.34,-.045);sprig(1,.79,.34,.23,.022);
  // Tapered, interrupted vertical ink marks replace a flat sign-like trunk.
  for(const [u,start,end,width] of [[.445,.02,.43,.009],[.49,.11,.62,.004],[.55,.03,.54,.006],[.515,.62,.87,.003]]){
    for(let i=1;i<=14;i++){
      const a=start+(end-start)*(i-1)/14,b=start+(end-start)*i/14;
      stroke(2,[u+Math.sin(a*9)*.008,a],[u+Math.sin(b*9)*.008,b],width*(.6+.4*Math.sin(i/14*Math.PI)),216,.60);
    }
  }
  const knot=[[.497,.26],[.518,.31],[.510,.39],[.49,.43],[.476,.36],[.482,.30],[.497,.26]];
  for(let i=1;i<knot.length;i++)stroke(2,knot[i-1],knot[i],.0025,211,.55);
  for(let i=0;i<9;i++)stroke(3,[.1+i*.095,.15],[.105+i*.095,.85],.002,235,.22);
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);
  texture.name='Shared illustrated forest paper atlas';texture.colorSpace=THREE.SRGBColorSpace;
  texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;texture.needsUpdate=true;
  texture.userData={illustratedPaper:true,tiles:4,textureBytes:data.byteLength};return texture;
}
