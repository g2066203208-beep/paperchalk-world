/* Paperchalk World lightweight ECS runtime.
 * Sparse-set component storage + named systems.
 * Kept as a classic script so the existing non-module game runtime can adopt ECS incrementally.
 */
(function(global){
  'use strict';

  class SparseSetStore{
    constructor(name){
      this.name=name;
      this.dense=[];
      this.values=[];
      this.sparse=[];
      this.version=0;
    }
    has(entity){
      const index=this.sparse[entity];
      return index!==undefined&&this.dense[index]===entity;
    }
    get(entity){
      const index=this.sparse[entity];
      return index!==undefined&&this.dense[index]===entity?this.values[index]:undefined;
    }
    set(entity,value=true){
      const index=this.sparse[entity];
      if(index!==undefined&&this.dense[index]===entity){
        this.values[index]=value;
        return value;
      }
      const next=this.dense.length;
      this.sparse[entity]=next;
      this.dense.push(entity);
      this.values.push(value);
      this.version++;
      return value;
    }
    delete(entity){
      const index=this.sparse[entity];
      if(index===undefined||this.dense[index]!==entity)return false;
      const lastIndex=this.dense.length-1;
      const lastEntity=this.dense[lastIndex];
      if(index!==lastIndex){
        this.dense[index]=lastEntity;
        this.values[index]=this.values[lastIndex];
        this.sparse[lastEntity]=index;
      }
      this.dense.pop();
      this.values.pop();
      this.sparse[entity]=undefined;
      this.version++;
      return true;
    }
    clear(){
      this.dense.length=0;
      this.values.length=0;
      this.sparse.length=0;
      this.version++;
    }
    get size(){return this.dense.length}
  }

  class World{
    constructor(){
      this.nextEntity=1;
      this.alive=new SparseSetStore('$alive');
      this.components=new Map();
      this.systems=new Map();
      this.systemOrder=[];
      this.iterationDepth=0;
      this.pendingDestroy=[];
    }
    ensureStore(name){
      const key=String(name);
      let store=this.components.get(key);
      if(!store){
        store=new SparseSetStore(key);
        this.components.set(key,store);
      }
      return store;
    }
    create(initial){
      const entity=this.nextEntity++;
      this.alive.set(entity,true);
      if(initial&&typeof initial==='object'){
        for(const [name,value] of Object.entries(initial))this.add(entity,name,value);
      }
      return entity;
    }
    destroy(entity){
      if(!this.alive.has(entity))return false;
      if(this.iterationDepth>0){
        if(!this.pendingDestroy.includes(entity))this.pendingDestroy.push(entity);
        return true;
      }
      this.alive.delete(entity);
      for(const store of this.components.values())store.delete(entity);
      return true;
    }
    flushDestroy(){
      if(!this.pendingDestroy.length)return;
      const list=this.pendingDestroy.splice(0);
      for(const entity of list)this.destroy(entity);
    }
    add(entity,name,value=true){
      if(!this.alive.has(entity))throw new Error('ECS_ENTITY_NOT_ALIVE '+entity);
      return this.ensureStore(name).set(entity,value);
    }
    remove(entity,name){
      return this.components.get(String(name))?.delete(entity)||false;
    }
    get(entity,name){
      return this.components.get(String(name))?.get(entity);
    }
    has(entity,name){
      return !!this.components.get(String(name))?.has(entity);
    }
    each(required,callback){
      const names=Array.isArray(required)?required:[required];
      if(!names.length||typeof callback!=='function')return 0;
      const stores=names.map(name=>this.components.get(String(name)));
      if(stores.some(store=>!store||store.size===0))return 0;
      let primary=stores[0];
      for(const store of stores)if(store.size<primary.size)primary=store;
      let count=0;
      this.iterationDepth++;
      try{
        const dense=primary.dense;
        for(let i=0;i<dense.length;i++){
          const entity=dense[i];
          if(!this.alive.has(entity))continue;
          let matches=true;
          for(const store of stores){
            if(!store.has(entity)){matches=false;break}
          }
          if(!matches)continue;
          callback(entity,this);
          count++;
        }
      }finally{
        this.iterationDepth--;
        if(this.iterationDepth===0)this.flushDestroy();
      }
      return count;
    }
    registerSystem(name,{require=[],phase='fixed',priority=0,update}={}){
      const key=String(name);
      if(typeof update!=='function')throw new TypeError('ECS_SYSTEM_UPDATE_REQUIRED '+key);
      const system={name:key,require:Array.isArray(require)?require.slice():[require],phase:String(phase),priority:Number(priority)||0,update};
      this.systems.set(key,system);
      this.systemOrder=[...this.systems.values()].sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name));
      return system;
    }
    unregisterSystem(name){
      const removed=this.systems.delete(String(name));
      if(removed)this.systemOrder=[...this.systems.values()].sort((a,b)=>a.priority-b.priority||a.name.localeCompare(b.name));
      return removed;
    }
    run(name,dt,context){
      const system=this.systems.get(String(name));
      if(!system)return 0;
      return this.each(system.require,(entity,world)=>system.update(entity,world,dt,context));
    }
    runPhase(phase,dt,context){
      let count=0;
      for(const system of this.systemOrder){
        if(system.phase===phase)count+=this.run(system.name,dt,context);
      }
      return count;
    }
    stats(){
      const componentCounts={};
      for(const [name,store] of this.components)componentCounts[name]=store.size;
      return {
        entities:this.alive.size,
        components:componentCounts,
        systems:this.systemOrder.map(system=>({name:system.name,phase:system.phase,priority:system.priority,require:system.require.slice()}))
      };
    }
  }

  global.PaperchalkECS=Object.freeze({
    version:1,
    createWorld(){return new World()},
    SparseSetStore,
    World
  });
})(window);
