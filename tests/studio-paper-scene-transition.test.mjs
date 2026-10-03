import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaperSceneTransition,clampTransitionProgress,transitionSmoothstep} from '../studio/rendering/paper-scene-transition.js';

function element(tag){
  return {
    tagName:tag.toUpperCase(),className:'',style:{},children:[],parentNode:null,
    append(...items){for(const item of items){item.parentNode=this;this.children.push(item);}},
    appendChild(item){this.append(item);return item;},
    setAttribute(name,value){this[name]=String(value);},
    remove(){this.parentNode?.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null;}
  };
}
function fixture(){
  const container=element('main');
  const documentRef={defaultView:{matchMedia:()=>({matches:false})},createElement:tag=>element(tag)};
  return {container,documentRef};
}

test('transition progress helpers stay finite and monotonic',()=>{
  assert.equal(clampTransitionProgress(-2),0);assert.equal(clampTransitionProgress(2),1);
  assert.equal(clampTransitionProgress(Number.NaN),0);
  assert.equal(transitionSmoothstep(0),0);assert.equal(transitionSmoothstep(1),1);
  assert.ok(transitionSmoothstep(.5)>.49&&transitionSmoothstep(.5)<.51);
});

test('paper handoff is inert, midpoint-driven, and resolves after the fold',async()=>{
  const {container,documentRef}=fixture();
  const transition=createPaperSceneTransition({container,documentRef,duration:100});
  assert.equal(container.children.length,1);
  const root=container.children[0];
  assert.equal(root['aria-hidden'],'true');assert.equal(root.role,'presentation');
  assert.equal(root.style.pointerEvents,'none');assert.equal(root.style.display,'none');
  let midpoint=0,complete=0;
  const done=transition.start({kind:'metro',onMidpoint:()=>midpoint++,onComplete:()=>complete++});
  assert.equal(transition.isActive(),true);assert.equal(root.style.display,'block');
  transition.update(.1);assert.equal(midpoint,0);assert.ok(transition.getState().progress>.3);
  transition.update(.1);assert.equal(midpoint,1);assert.ok(root.children.find(child=>child.className.includes('__new')).style.clipPath.includes('%'));
  transition.update(.1);assert.equal(transition.isActive(),false);assert.equal(midpoint,1);assert.equal(complete,1);
  assert.equal(await done,true);assert.equal(root.style.display,'none');
  transition.dispose();assert.equal(container.children.length,0);
});

test('a second handoff cancels the previous promise and changes palette',async()=>{
  const {container,documentRef}=fixture();
  const transition=createPaperSceneTransition({container,documentRef,duration:100});
  const first=transition.start({kind:'metro'});transition.update(.02);
  const second=transition.start({kind:'bus'});assert.equal(await first,false);
  transition.update(.1);transition.update(.1);transition.update(.1);assert.equal(await second,true);
  transition.dispose();
});

