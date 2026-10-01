const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export class OrbitCameraController{
  constructor({camera,domElement,target,yaw=.02,pitch=.18,distance=19.2,minDistance=8,maxDistance=32,onChange=()=>{}}){
    this.camera=camera;this.domElement=domElement;this.target=target;
    this.yaw=yaw;this.pitch=pitch;this.distance=distance;
    this.minDistance=minDistance;this.maxDistance=maxDistance;this.onChange=onChange;
    this.pitchLimit=Math.PI*.5-.015;
    this.pointers=new Map();this.dragging=false;this.lastX=0;this.lastY=0;
    this.pinchStartDistance=0;this.pinchStartCameraDistance=distance;
    this.place();this.bind();
  }
  place(){
    const {camera,target}=this,c=Math.cos(this.pitch);
    camera.position.set(
      target.x+Math.sin(this.yaw)*c*this.distance,
      target.y+Math.sin(this.pitch)*this.distance,
      target.z+Math.cos(this.yaw)*c*this.distance
    );
    camera.up.set(0,1,0);camera.lookAt(target);
  }
  changed(){this.place();this.onChange(this.snapshot())}
  pointerDistance(){
    const p=[...this.pointers.values()];if(p.length<2)return 0;
    return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
  }
  beginPinch(){
    if(this.pointers.size<2)return;
    this.pinchStartDistance=Math.max(1,this.pointerDistance());
    this.pinchStartCameraDistance=this.distance;this.dragging=false;
  }
  finishPointer(id){
    this.pointers.delete(id);
    if(this.pointers.size===1){
      const p=this.pointers.values().next().value;
      this.lastX=p.x;this.lastY=p.y;this.dragging=true;
    }else this.dragging=false;
    if(this.pointers.size<2)this.pinchStartDistance=0;
  }
  bind(){
    const el=this.domElement;
    el.addEventListener('pointerdown',e=>{
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture(e.pointerId);
      if(this.pointers.size===1){this.dragging=true;this.lastX=e.clientX;this.lastY=e.clientY}
      else if(this.pointers.size===2)this.beginPinch();
    });
    el.addEventListener('pointermove',e=>{
      if(!this.pointers.has(e.pointerId))return;
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(this.pointers.size>=2){
        if(!this.pinchStartDistance)this.beginPinch();
        const current=Math.max(1,this.pointerDistance());
        this.distance=clamp(this.pinchStartCameraDistance*(this.pinchStartDistance/current),this.minDistance,this.maxDistance);
        this.changed();return;
      }
      if(!this.dragging)return;
      this.yaw-=(e.clientX-this.lastX)*.006;
      this.pitch=clamp(this.pitch+(e.clientY-this.lastY)*.005,-this.pitchLimit,this.pitchLimit);
      this.lastX=e.clientX;this.lastY=e.clientY;this.changed();
    });
    el.addEventListener('pointerup',e=>this.finishPointer(e.pointerId));
    el.addEventListener('pointercancel',e=>this.finishPointer(e.pointerId));
    el.addEventListener('lostpointercapture',e=>{if(this.pointers.has(e.pointerId))this.finishPointer(e.pointerId)});
    el.addEventListener('wheel',e=>{
      this.distance=clamp(this.distance+e.deltaY*.012,this.minDistance,this.maxDistance);this.changed();
    },{passive:true});
  }
  snapshot(){return{yaw:this.yaw,pitch:this.pitch,distance:this.distance,target:{x:this.target.x,y:this.target.y,z:this.target.z}}}
}
