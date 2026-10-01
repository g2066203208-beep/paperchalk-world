export class GameRuntime{
  constructor(){this.systems=[];this.frame=0;this.time=0}
  register(system){
    if(!system||typeof system.update!=='function')throw new TypeError('runtime system must implement update(dt,ctx)');
    this.systems.push(system);return system;
  }
  unregister(system){
    const i=this.systems.indexOf(system);if(i>=0)this.systems.splice(i,1);
  }
  update(dt,ctx={}){
    this.frame++;this.time+=dt;
    let changed=false;
    for(const system of this.systems)changed=system.update(dt,ctx)===true||changed;
    return changed;
  }
  stats(){return{frame:this.frame,time:this.time,systems:this.systems.length}}
}
