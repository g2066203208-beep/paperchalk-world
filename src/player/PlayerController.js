export class PlayerController{
  constructor({mesh,contactShadow,input,terrain,speed=3.4,halfWidth=.56,halfDepth=.18}){
    this.mesh=mesh;this.contactShadow=contactShadow;this.input=input;this.terrain=terrain;
    this.speed=speed;this.halfWidth=halfWidth;this.halfDepth=halfDepth;
    this.baseCenterOffset=mesh.position.y-(terrain.surfaceY(mesh.position.x,mesh.position.z)??.5);
    this.facing=1;this.distance=0;
    this.syncShadow();
  }
  update(dt,{camera}={}){
    const axis=this.input.horizontal();
    if(!axis||!camera)return false;
    const forwardX=this.mesh.position.x-camera.position.x;
    const forwardZ=this.mesh.position.z-camera.position.z;
    const len=Math.max(.0001,Math.hypot(forwardX,forwardZ));
    const rightX=-forwardZ/len,rightZ=forwardX/len;
    const step=this.speed*dt*axis;
    const next=this.terrain.clamp(
      this.mesh.position.x+rightX*step,
      this.mesh.position.z+rightZ*step,
      Math.max(this.halfWidth,this.halfDepth)
    );
    const surface=this.terrain.surfaceY(next.x,next.z);
    if(surface==null)return false;
    const dx=next.x-this.mesh.position.x,dz=next.z-this.mesh.position.z;
    if(Math.abs(dx)+Math.abs(dz)<1e-6)return false;
    this.mesh.position.x=next.x;this.mesh.position.z=next.z;
    this.mesh.position.y=surface+this.baseCenterOffset;
    this.distance+=Math.hypot(dx,dz);this.facing=axis;
    this.syncShadow(surface);
    return true;
  }
  syncShadow(surface=this.terrain.surfaceY(this.mesh.position.x,this.mesh.position.z)??.5){
    if(!this.contactShadow)return;
    this.contactShadow.position.set(this.mesh.position.x,surface-.013,this.mesh.position.z-.02);
  }
  snapshot(){
    return{x:this.mesh.position.x,y:this.mesh.position.y,z:this.mesh.position.z,speed:this.speed,facing:this.facing,distance:this.distance};
  }
}
