"""Real optimizer, holdout evaluation, checkpoint, 64 independent-seed predictions.

Uses quarantined Mini36 AI-derived data only by explicit opt-in; no artistic
quality or foundation-model success claims. Invoke with python -m.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import platform
import random
import time
from pathlib import Path
import numpy as np
import torch
from PIL import Image
from .core import pilot_mini36,load_approved,gallery,save_native_and_nearest,decode_rgba
from .model import MaskedPixelNet,masked_loss,generate

SEED=20261101

def load_samples(args):
    if args.dataset=='mini36-pilot':
        if not args.allow_unapproved_pilot:
            raise ValueError('AI-derived mini36 requires --allow-unapproved-pilot')
        return pilot_mini36(),False
    if args.dataset=='approved':
        if not args.root or not args.manifest:
            raise ValueError('--root and --manifest required')
        return load_approved(args.root,args.manifest),True
    raise ValueError('Unknown dataset')

def evaluate(net,samples,rng,condition):
    net.eval();report=[]
    with torch.no_grad():
        for sample in samples:
            original=torch.tensor(sample['tokens'],dtype=torch.long)[None]
            mask=torch.from_numpy(rng.random((1,24,24))<.75)
            inp=original.clone();inp[mask]=15
            logits=net(inp,(original>0) if condition else None)
            predicted=logits.argmax(1)
            accuracy=float((predicted[mask]==original[mask]).float().mean().item())
            fg=mask & (original>0)
            fgacc=float((predicted[fg]==original[fg]).float().mean().item()) if bool(fg.any()) else None
            report.append({'identity_id':sample['id'],'masked_accuracy':round(accuracy,5),
                           'masked_foreground_accuracy':None if fgacc is None else round(fgacc,5)})
    net.train()
    return report

def train(args):
    if args.steps<1 or args.batch_size<1:
        raise ValueError('steps and batch_size must be positive')
    output=Path(args.out);output.mkdir(parents=True,exist_ok=True)
    torch.manual_seed(args.seed);random.seed(args.seed)
    rng=np.random.default_rng(args.seed)
    torch.set_num_threads(min(2,os.cpu_count() or 1))
    samples,artist_approved=load_samples(args)
    training=[s for s in samples if s['split']=='train']
    validation=[s for s in samples if s['split']=='val']
    testing=[s for s in samples if s['split']=='test']
    if not training or not validation or not testing:
        raise ValueError('All three splits required')
    device=torch.device('cuda' if torch.cuda.is_available() and not args.cpu else 'cpu')
    mode=args.mode;conditioned=mode=='structure'
    net=MaskedPixelNet(args.width,structure_condition=conditioned).to(device)
    optimizer=torch.optim.AdamW(net.parameters(),lr=args.lr)
    start=time.monotonic();losses=[]
    for step in range(args.steps):
        indices=rng.choice(len(training),size=args.batch_size,replace=True)
        batch=torch.from_numpy(np.stack([training[int(i)]['tokens'] for i in indices])).long().to(device)
        loss=masked_loss(net,batch,rng,conditioned)
        optimizer.zero_grad(set_to_none=True);loss.backward()
        torch.nn.utils.clip_grad_norm_(net.parameters(),1.)
        optimizer.step()
        if step==0 or (step+1)%max(1,args.steps//5)==0 or step==args.steps-1:
            losses.append({'step':step+1,'train_masked_ce':round(float(loss.item()),6)})
    validation_scores=evaluate(net,validation,np.random.default_rng(args.seed+7),conditioned)
    test_scores=evaluate(net,testing,np.random.default_rng(args.seed+17),conditioned)
    net.eval();generated=[];palettes=[]
    for i in range(64):
        # B explicitly receives test ground-truth silhouettes; not learned anatomy.
        structure=testing[i%len(testing)]['tokens']>0 if conditioned else None
        generated.append(generate(net,args.seed+1000+i,structure=structure,steps=12))
        palettes.append(training[i%len(training)]['palette'])
    preview=gallery(generated,palettes,columns=8)
    save_native_and_nearest(preview,output/f'{mode}-64-native.png')
    sample_dir=output/'sprites';sample_dir.mkdir(exist_ok=True)
    for i,(sprite,palette) in enumerate(zip(generated,palettes)):
        Image.fromarray(decode_rgba(sprite,palette),'RGBA').save(
            sample_dir/f'seed-{args.seed+1000+i}.png')
    val_mean=float(np.mean([x['masked_accuracy'] for x in validation_scores]))
    test_mean=float(np.mean([x['masked_accuracy'] for x in test_scores]))
    checkpoint={'model':net.cpu().state_dict(),'optimizer':optimizer.state_dict(),
                'config':{'width':args.width,'structure_condition':conditioned},
                'seed':args.seed,'steps':args.steps,'dataset':args.dataset,
                'identity_split':{s['id']:s['split'] for s in samples},
                'torch_rng':torch.get_rng_state(),'numpy_rng':rng.bit_generator.state}
    ckpt=output/f'{mode}-checkpoint.pt';torch.save(checkpoint,ckpt)
    data_hash=hashlib.sha256(b''.join(s['tokens'].tobytes() for s in samples)).hexdigest()
    report={
        'stage':'pilot' if not artist_approved else 'approved-dataset-experiment',
        'experimental':True,'foundation_model_accepted':False,'artist_quality_accepted':False,
        'trained_real_neural_weights':True,'mode':mode,'data_source':args.dataset,
        'training_data_artist_approved':artist_approved,
        'training_sample_count':len(training),'validation_count':len(validation),
        'test_count':len(testing),'independent_train_identities':len(set(s['id'] for s in training)),
        'data_token_sha256':data_hash,'steps':args.steps,'batch_size':args.batch_size,
        'parameters':sum(p.numel() for p in net.parameters()),'seed':args.seed,
        'cpu_or_gpu':str(device),'platform':platform.platform(),
        'torch_version':torch.__version__,'seconds':round(time.monotonic()-start,3),
        'train_loss_history':losses,'holdout_validation':validation_scores,
        'holdout_test':test_scores,'validation_masked_accuracy':round(val_mean,5),
        'test_masked_accuracy':round(test_mean,5),
        'generated_count':64,'generated_file':f'{mode}-64-native.png',
        'checkpoint_file':ckpt.name,
        'limitations':[
            'AI-concept reconstructed Mini36 is not independent artist gold.' if not artist_approved
              else 'Even approved data needs blind assessment of generated art.',
            'Local palette indices are NOT semantically aligned across sprites; colors are mapped from reference palettes.',
            'Masked token accuracy does not establish facial aesthetics or new identities.',
            'Structure mode receives actual test silhouettes; not an unconditional anatomy generator.',
            'No learned face, hair, body, expression controls or unseen-combination generalization demonstrated.'
        ]
    }
    (output/f'{mode}-report.json').write_text(
        json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    return report

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--dataset',choices=['mini36-pilot','approved'],default='approved')
    ap.add_argument('--allow-unapproved-pilot',action='store_true')
    ap.add_argument('--root');ap.add_argument('--manifest')
    ap.add_argument('--mode',choices=['masked','structure'],default='masked')
    ap.add_argument('--steps',type=int,default=250)
    ap.add_argument('--batch-size',type=int,default=12)
    ap.add_argument('--width',type=int,default=48)
    ap.add_argument('--lr',type=float,default=.001)
    ap.add_argument('--seed',type=int,default=SEED)
    ap.add_argument('--cpu',action='store_true')
    ap.add_argument('--out',default='artifacts/foundation24')
    args=ap.parse_args()
    result=train(args)
    print(json.dumps({k:result[k] for k in (
        'stage','mode','steps','training_sample_count','validation_masked_accuracy',
        'test_masked_accuracy','foundation_model_accepted')},ensure_ascii=False))

if __name__=='__main__':
    main()
