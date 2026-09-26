/* Paperchalk World event bus: deterministic, dependency-free cross-system messaging. */
(function(global){
'use strict';

class EventBus{
  constructor(){
    this.listeners=new Map();
    this.queue=[];
    this.flushing=false;
    this.sequence=0;
  }
  on(type,handler,{once=false}={}){
    if(typeof type!=='string'||!type)throw new TypeError('event type must be a non-empty string');
    if(typeof handler!=='function')throw new TypeError('event handler must be a function');
    const record={handler,once};
    let bucket=this.listeners.get(type);
    if(!bucket){bucket=new Set();this.listeners.set(type,bucket)}
    bucket.add(record);
    return ()=>this.off(type,record);
  }
  once(type,handler){return this.on(type,handler,{once:true})}
  off(type,handlerOrRecord){
    const bucket=this.listeners.get(type);
    if(!bucket)return false;
    let removed=false;
    for(const record of bucket){
      if(record===handlerOrRecord||record.handler===handlerOrRecord){
        bucket.delete(record);removed=true;
      }
    }
    if(!bucket.size)this.listeners.delete(type);
    return removed;
  }
  emit(type,payload,meta={}){
    const event=Object.freeze({
      type,
      payload,
      sequence:++this.sequence,
      time:typeof performance!=='undefined'&&performance.now?performance.now():Date.now(),
      ...meta
    });
    const bucket=this.listeners.get(type);
    if(!bucket||!bucket.size)return event;
    for(const record of [...bucket]){
      record.handler(event);
      if(record.once)this.off(type,record);
    }
    return event;
  }
  post(type,payload,meta={}){
    this.queue.push({type,payload,meta});
    return this.queue.length;
  }
  flush(limit=1000){
    if(this.flushing)return 0;
    this.flushing=true;
    let count=0;
    try{
      while(this.queue.length&&count<limit){
        const item=this.queue.shift();
        this.emit(item.type,item.payload,item.meta);
        count++;
      }
      if(this.queue.length)throw new Error('Paperchalk event queue exceeded flush limit');
      return count;
    }finally{this.flushing=false}
  }
  clear(type){
    if(type===undefined){this.listeners.clear();this.queue.length=0;return}
    this.listeners.delete(type);
  }
  stats(){
    let subscriptions=0;
    for(const bucket of this.listeners.values())subscriptions+=bucket.size;
    return {types:this.listeners.size,subscriptions,queued:this.queue.length,sequence:this.sequence};
  }
}

const bus=new EventBus();
global.PaperchalkEventBus=EventBus;
global.PaperchalkEvents=bus;
})(window);
