#!/usr/bin/env python3
"""Genuine tabular Q-learning on reference-guided pixel stroke choice.
This optimizes brush operations, NOT aesthetic creativity. The reference
colour is visible to the agent and must never be marketed as generation.
"""
import collections
import json
from pathlib import Path
import random

ACTIONS=['pixel','horizontal','vertical','square','connected']
N=16
def key(state):
    return ':'.join(map(str,state))
def neighbors(p):
    x,y=p%N,p//N
    if x>0:yield p-1
    if x<15:yield p+1
    if y>0:yield p-16
    if y<15:yield p+16
def candidate(target,current,p,action):
    color=target[p]
    if color==0:return []
    x,y=p%N,p//N
    def valid(q):
        return 0<=q<256 and target[q]==color and current[q]!=color
    if action==0:return [p]
    if action==1:return [p+i for i in range(min(4,16-x)) if valid(p+i)]
    if action==2:return [p+i*16 for i in range(min(4,16-y)) if valid(p+i*16)]
    if action==3:return [q for q in [p,p+1,p+16,p+17]
        if q<256 and q%16>=x and q//16>=y and q%16<=x+1 and q//16<=y+1 and valid(q)]
    # Connected area of same palette token, at most 48 pixels.
    seen={p};stack=[p];result=[]
    while stack and len(result)<48:
        q=stack.pop()
        if valid(q):result.append(q)
        for n in neighbors(q):
            if n not in seen and target[n]==color:seen.add(n);stack.append(n)
    return result
def next_pixel(target,current):
    for p,(a,b) in enumerate(zip(target,current)):
        if a!=0 and a!=b:return p
    return None
def state(target,current,p):
    runs=[len(candidate(target,current,p,i)) for i in range(5)]
    # Learn from patterns rather than memorising sprite IDs or coordinates.
    return (min(4,runs[1]),min(4,runs[2]),min(4,runs[3]),min(4,runs[4]),
        int(target[p]>0))
def episode(target,q=None,train=False,rng=None,epsilon=0):
    rng=rng or random.Random(17)
    canvas=[0]*256
    strokes=0; rewards=0
    visits=[];time_limit=256
    for _ in range(time_limit):
        p=next_pixel(target,canvas)
        if p is None:break
        s=key(state(target,canvas,p))
        values=q.get(s,[0.0]*5) if q is not None else [1,0,0,0,0]
        if q is not None and train and rng.random()<epsilon:
            action=rng.randrange(5)
        else:
            action=max(range(5),key=lambda a:(values[a],-a))
        pixels=candidate(target,canvas,p,action)
        for k in pixels:canvas[k]=target[k]
        strokes+=1
        reward=len(pixels)-.35
        rewards+=reward
        new=next_pixel(target,canvas)
        next_state=key(state(target,canvas,new)) if new is not None else None
        visits.append((s,action,reward,next_state))
        if q is not None and train:
            row=q.setdefault(s,[0.0]*5)
            future=max(q.setdefault(next_state,[0.0]*5)) if next_state is not None else 0
            row[action]+=0.24*(reward+.85*future-row[action])
        if new is None:break
    return {'strokes':strokes,'reward':round(rewards,3),'pixels':sum(v!=0 for v in target),
      'complete':canvas==list(target),'visits':visits}
def main():
    targets=json.loads(Path('ml/targets.json').read_text())
    rng=random.Random(20261029)
    rng.shuffle(targets)
    split=max(4,int(len(targets)*.85))
    trainset=[sum(t,[]) if isinstance(t[0],list) else t for t in targets[:split]]
    valset=[sum(t,[]) if isinstance(t[0],list) else t for t in targets[split:]]
    q={}
    for i in range(1200):
        example=trainset[rng.randrange(len(trainset))]
        episode(example,q=q,train=True,rng=rng,epsilon=max(.05,.65*(1-i/1200)))
    results=[]
    for t in valset:
        agent=episode(t,q=q)
        pixel=episode(t)
        assert agent['complete'] and pixel['complete']
        results.append({'rl':agent['strokes'],'pencil':pixel['strokes'],'pixels':pixel['pixels']})
    mean=lambda k:round(sum(r[k] for r in results)/len(results),2)
    mean_pixel=mean('pencil');mean_agent=mean('rl')
    report={'algorithm':'tabular Q-learning','task':'reference-guided brush choice; not artistic image generation',
      'episodes':1200,'train_images':len(trainset),'validation_images':len(valset),
      'mean_pencil_strokes':mean_pixel,'mean_rl_strokes':mean_agent,
      'stroke_reduction':round(1-mean_agent/max(1,mean_pixel),4),
      'evaluation':'held-out CC0 sprite references; deterministic greedy policy'}
    output={'format':'pixel-lab-q-brush-v1','actions':ACTIONS,'q':{k:[round(x,4) for x in v] for k,v in q.items()},'metrics':report}
    Path('site/pixel-lab').mkdir(parents=True,exist_ok=True)
    Path('site/pixel-lab/brush-policy.json').write_text(json.dumps(output,separators=(',',':')))
    Path('ml/rl_metrics.json').write_text(json.dumps(report,indent=2))
    print('RL TRAINING COMPLETE:',report,flush=True)
if __name__=='__main__':main()
