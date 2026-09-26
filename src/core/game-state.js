/* Paperchalk World finite-state runtime for top-level application lifecycle. */
(function(global){
'use strict';

class StateMachine{
  constructor({initial,transitions,onTransition=null}){
    if(!initial)throw new Error('StateMachine requires an initial state');
    this.state=initial;
    this.transitions=new Map();
    this.listeners=new Set();
    this.version=0;
    this.onTransition=typeof onTransition==='function'?onTransition:null;
    for(const [from,to] of Object.entries(transitions||{})){
      this.transitions.set(from,new Set(Array.isArray(to)?to:[to]));
    }
  }
  can(next){
    if(next===this.state)return true;
    return this.transitions.get(this.state)?.has(next)||false;
  }
  transition(next,context={}){
    if(next===this.state)return {changed:false,from:this.state,to:next,version:this.version,context};
    if(!this.can(next))throw new Error('Invalid state transition: '+this.state+' -> '+next);
    const from=this.state;
    this.state=next;
    this.version++;
    const change=Object.freeze({changed:true,from,to:next,version:this.version,context});
    if(this.onTransition)this.onTransition(change);
    for(const listener of [...this.listeners])listener(change);
    return change;
  }
  subscribe(listener){
    if(typeof listener!=='function')throw new TypeError('state listener must be a function');
    this.listeners.add(listener);
    return ()=>this.listeners.delete(listener);
  }
  snapshot(){return Object.freeze({state:this.state,version:this.version})}
}

const app=new StateMachine({
  initial:'boot',
  transitions:{
    boot:['menu'],
    menu:['auth','settings','world'],
    auth:['menu','world'],
    settings:['menu'],
    world:['menu']
  },
  onTransition(change){
    global.PaperchalkEvents?.emit('app:state-changed',change);
  }
});

global.PaperchalkStateMachine=StateMachine;
global.PaperchalkAppState=app;
})(window);
