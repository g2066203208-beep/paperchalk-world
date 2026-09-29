import React, { useMemo, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { Eye, EyeOff, Edit3, Check, Plus, Trash2, GitBranch, Link2, Wand2 } from 'lucide-react';

function uid(prefix='bone') {
  const r = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
  return `${prefix}-${r}`;
}

function makeTransform(x=0,y=0) {
  return { x:0, y:0, rotation:0, scaleX:1, scaleY:1, pivotX:x, pivotY:y };
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx-ax, vy = by-ay;
  const wx = px-ax, wy = py-ay;
  const vv = vx*vx + vy*vy;
  let t = vv > 1e-6 ? (wx*vx + wy*vy)/vv : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + vx*t, qy = ay + vy*t;
  return Math.hypot(px-qx, py-qy);
}

function descendants(nodes, rootId) {
  const out = [];
  const queue = [rootId];
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    const n = nodes.find(x => x.id === id);
    if (n && n.type === 'group' && n.boneRole) out.push(n);
    for (const c of nodes) if (c.parent === id && c.type === 'group' && c.boneRole) queue.push(c.id);
  }
  return out;
}

function createsCycle(nodes, nodeId, newParentId) {
  let cur = newParentId;
  const seen = new Set();
  while (cur) {
    if (cur === nodeId) return true;
    if (seen.has(cur)) return true;
    seen.add(cur);
    cur = nodes.find(n => n.id === cur)?.parent ?? null;
  }
  return false;
}

export function ArmaturePanel() {
  const project = useProjectStore(s => s.project);
  const updateProject = useProjectStore(s => s.updateProject);
  const deleteNode = useProjectStore(s => s.deleteNode);
  const editorState = useEditorStore();
  const setSelection = useEditorStore(s => s.setSelection);
  const setShowSkeleton = useEditorStore(s => s.setShowSkeleton);
  const setSkeletonEditMode = useEditorStore(s => s.setSkeletonEditMode);

  const [activeBoneId, setActiveBoneId] = useState(null);
  const [newBoneName, setNewBoneName] = useState('新骨骼');
  const [chainCount, setChainCount] = useState(3);

  const nodes = project.nodes ?? [];
  const bones = useMemo(() => nodes.filter(n => n.type === 'group' && n.boneRole), [nodes]);
  const selected = editorState.selection.map(id => nodes.find(n => n.id === id)).filter(Boolean);
  const selectedBone = selected.length === 1 && selected[0].type === 'group' && selected[0].boneRole ? selected[0] : null;
  const selectedParts = selected.filter(n => n.type === 'part');
  const activeBone = nodes.find(n => n.id === activeBoneId && n.type === 'group' && n.boneRole) ?? selectedBone ?? null;
  const hasArmature = bones.length > 0;

  function addBone(parentId, name, dx=0, dy=70) {
    let created = null;
    updateProject((proj) => {
      const parent = parentId ? proj.nodes.find(n => n.id === parentId) : null;
      const px = parent?.transform?.pivotX ?? (proj.canvas?.width ?? 800)/2;
      const py = parent?.transform?.pivotY ?? (proj.canvas?.height ?? 600)/2;
      const id = uid();
      const role = `custom:${id}`;
      created = {
        id,
        type:'group',
        name: name || '新骨骼',
        parent: parent?.id ?? null,
        boneRole: role,
        boneKind:'custom',
        transform: makeTransform(px+dx, py+dy),
        visible:true,
        opacity:1,
      };
      proj.nodes.push(created);
    });
    if (created) {
      setActiveBoneId(created.id);
      setSelection([created.id]);
      setShowSkeleton(true);
      setSkeletonEditMode(true);
    }
    return created;
  }

  function addChain(count) {
    let parent = activeBone?.id ?? selectedBone?.id ?? null;
    const n = Math.max(1, Math.min(12, Number(count)||1));
    for (let i=0;i<n;i++) {
      const bone = addBone(parent, `${newBoneName || '骨骼'} ${i+1}`, 0, 56);
      parent = bone?.id ?? parent;
    }
  }

  function addFingerFan() {
    const parent = activeBone?.id ?? selectedBone?.id;
    if (!parent) return;
    updateProject((proj) => {
      const p = proj.nodes.find(n => n.id === parent);
      if (!p) return;
      const baseX = p.transform?.pivotX ?? 0;
      const baseY = p.transform?.pivotY ?? 0;
      for (let f=0; f<5; f++) {
        let par = p.id;
        const spread = (f-2)*14;
        for (let j=0; j<3; j++) {
          const id=uid();
          proj.nodes.push({
            id, type:'group',
            name:`手指${f+1}-${j+1}`,
            parent:par,
            boneRole:`custom:${id}`,
            boneKind:'finger',
            transform:makeTransform(baseX + spread*(j+1)/3, baseY + 28*(j+1)),
            visible:true, opacity:1
          });
          par=id;
        }
      }
    });
    setShowSkeleton(true);
    setSkeletonEditMode(true);
  }

  function addToeFan() {
    const parent = activeBone?.id ?? selectedBone?.id;
    if (!parent) return;
    updateProject((proj) => {
      const p = proj.nodes.find(n => n.id === parent);
      if (!p) return;
      const baseX=p.transform?.pivotX??0, baseY=p.transform?.pivotY??0;
      for (let f=0;f<5;f++) {
        let par=p.id;
        const spread=(f-2)*12;
        for (let j=0;j<2;j++) {
          const id=uid();
          proj.nodes.push({
            id,type:'group',name:`脚趾${f+1}-${j+1}`,parent:par,
            boneRole:`custom:${id}`,boneKind:'toe',
            transform:makeTransform(baseX+spread*(j+1)/2,baseY+24*(j+1)),
            visible:true,opacity:1
          });
          par=id;
        }
      }
    });
    setShowSkeleton(true);
    setSkeletonEditMode(true);
  }

  function renameActive(value) {
    if (!activeBone) return;
    updateProject((proj) => {
      const n=proj.nodes.find(x=>x.id===activeBone.id);
      if (n) n.name=value || n.name;
    });
  }

  function reparentActive(parentId) {
    if (!activeBone) return;
    const next = parentId || null;
    if (next && createsCycle(nodes, activeBone.id, next)) return;
    updateProject((proj) => {
      const n=proj.nodes.find(x=>x.id===activeBone.id);
      if (n) n.parent=next;
    });
  }

  function deleteBoneKeepChildren() {
    if (!activeBone) return;
    const id=activeBone.id;
    updateProject((proj) => {
      const n=proj.nodes.find(x=>x.id===id);
      if (!n) return;
      const parent=n.parent??null;
      for (const c of proj.nodes) if (c.parent===id) c.parent=parent;
      proj.nodes=proj.nodes.filter(x=>x.id!==id);
      for (const a of proj.animations??[]) a.tracks=(a.tracks??[]).filter(t=>t.nodeId!==id);
      for (const part of proj.nodes) {
        if (!part.mesh) continue;
        if (part.mesh.jointBoneId===id) {
          delete part.mesh.jointBoneId;
          delete part.mesh.boneWeights;
        }
        if (Array.isArray(part.mesh.skinBones)) {
          part.mesh.skinBones=part.mesh.skinBones.filter(sb=>sb.id!==id);
        }
      }
    });
    setActiveBoneId(null);
    setSelection([]);
  }

  function autoWeightsForSelectedParts() {
    const rootBone = activeBone;
    if (!rootBone || !selectedParts.length) return;
    updateProject((proj) => {
      const branch = descendants(proj.nodes, rootBone.id);
      if (!branch.length) return;
      const byId = new Map(proj.nodes.map(n=>[n.id,n]));
      for (const part of proj.nodes) {
        if (!selectedParts.some(p=>p.id===part.id) || !part.mesh?.vertices?.length) continue;
        const verts = part.mesh.vertices;
        const weightsByBone = new Map(branch.map(b=>[b.id,new Array(verts.length).fill(0)]));

        for (let vi=0; vi<verts.length; vi++) {
          const v=verts[vi];
          const scored=[];
          for (const b of branch) {
            const parent = b.parent ? byId.get(b.parent) : null;
            const ax = parent?.transform?.pivotX ?? b.transform?.pivotX ?? 0;
            const ay = parent?.transform?.pivotY ?? b.transform?.pivotY ?? 0;
            const bx = b.transform?.pivotX ?? ax;
            const by = b.transform?.pivotY ?? ay;
            const len=Math.max(18,Math.hypot(bx-ax,by-ay));
            const d=pointSegmentDistance(v.x,v.y,ax,ay,bx,by);
            const sigma=Math.max(18,len*0.55);
            const score=Math.exp(-(d*d)/(2*sigma*sigma));
            scored.push([b.id,score]);
          }
          scored.sort((a,b)=>b[1]-a[1]);
          const top=scored.slice(0,4);
          const sum=top.reduce((s,x)=>s+x[1],0)||1;
          for (const [bid,score] of top) weightsByBone.get(bid)[vi]=score/sum;
        }

        part.mesh.skinBones=[...weightsByBone.entries()]
          .map(([id,weights])=>({id,weights}))
          .filter(sb=>sb.weights.some(w=>w>0.001));

        // Keep legacy fields for exporters that only understand one weighted bone.
        const strongest=part.mesh.skinBones
          .map(sb=>({sb,total:sb.weights.reduce((a,b)=>a+b,0)}))
          .sort((a,b)=>b.total-a.total)[0]?.sb;
        if (strongest) {
          part.mesh.jointBoneId=strongest.id;
          part.mesh.boneWeights=[...strongest.weights];
        }
      }
    });
  }

  if (!hasArmature && !selectedParts.length) return null;

  return (
    <div className="flex flex-col border-b bg-card text-xs">
      <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between gap-2">
        <b>通用骨骼</b>
        <span className="text-muted-foreground">{bones.length} 根</span>
      </div>

      <div className="p-2 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button className="pc-bone-btn" onClick={()=>setShowSkeleton(!editorState.showSkeleton)}>
            {editorState.showSkeleton ? <EyeOff size={15}/> : <Eye size={15}/>}
            {editorState.showSkeleton ? '隐藏骨骼':'显示骨骼'}
          </button>
          <button className="pc-bone-btn" onClick={()=>{
            setShowSkeleton(true);
            setSkeletonEditMode(!editorState.skeletonEditMode);
          }}>
            {editorState.skeletonEditMode ? <Check size={15}/> : <Edit3 size={15}/>}
            {editorState.skeletonEditMode ? '完成编辑':'编辑骨骼'}
          </button>
        </div>

        <div className="rounded border border-border p-2 space-y-2">
          <div className="text-muted-foreground">当前骨骼</div>
          <select className="pc-mobile-input" value={activeBone?.id ?? ''} onChange={e=>{
            const id=e.target.value||null;
            setActiveBoneId(id);
            if(id) setSelection([id]);
          }}>
            <option value="">— 选择骨骼 —</option>
            {bones.map(b=><option key={b.id} value={b.id}>{b.name || b.boneRole}</option>)}
          </select>

          {activeBone && <>
            <input className="pc-mobile-input" defaultValue={activeBone.name} key={activeBone.id}
              onBlur={e=>renameActive(e.target.value)} />
            <select className="pc-mobile-input" value={activeBone.parent ?? ''} onChange={e=>reparentActive(e.target.value)}>
              <option value="">根级</option>
              {bones.filter(b=>b.id!==activeBone.id && !createsCycle(nodes,activeBone.id,b.id))
                .map(b=><option key={b.id} value={b.id}>父级：{b.name || b.boneRole}</option>)}
            </select>
          </>}
        </div>

        <div className="rounded border border-border p-2 space-y-2">
          <div className="text-muted-foreground">任意新增 / 骨链</div>
          <input className="pc-mobile-input" value={newBoneName} onChange={e=>setNewBoneName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <button className="pc-bone-btn" onClick={()=>addBone(activeBone?.id ?? null,newBoneName)}><Plus size={15}/>新增子骨</button>
            <button className="pc-bone-btn" onClick={()=>addBone(null,newBoneName)}><Plus size={15}/>新增根骨</button>
          </div>
          <div className="flex gap-2 items-center">
            <input className="pc-mobile-input flex-1" type="number" min="1" max="12" value={chainCount}
              onChange={e=>setChainCount(e.target.value)} />
            <button className="pc-bone-btn flex-1" onClick={()=>addChain(chainCount)}><GitBranch size={15}/>连续骨链</button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="pc-bone-btn" onClick={addFingerFan}>手指 5×3</button>
            <button className="pc-bone-btn" onClick={addToeFan}>脚趾 5×2</button>
            <button className="pc-bone-btn" onClick={()=>{setNewBoneName('头发');addChain(4)}}>头发链×4</button>
          </div>
        </div>

        {activeBone && <div className="grid grid-cols-2 gap-2">
          <button className="pc-bone-btn pc-danger" onClick={deleteBoneKeepChildren}><Trash2 size={15}/>删本骨/留子骨</button>
          <button className="pc-bone-btn pc-danger" onClick={()=>{
            const id=activeBone.id;
            deleteNode(id);
            setActiveBoneId(null);
            setSelection([]);
          }}><Trash2 size={15}/>删除整条分支</button>
        </div>}

        <div className="rounded border border-border p-2 space-y-2">
          <div className="text-muted-foreground">图层 / 网格绑定</div>
          <div>{selectedParts.length ? `已选 ${selectedParts.length} 个图层` : '先在图层面板选择一个或多个图层'}</div>
          <button className="pc-bone-btn w-full" disabled={!activeBone || !selectedParts.length} onClick={()=>{
            if(!activeBone) return;
            updateProject(proj=>{
              for(const p of proj.nodes){
                if(selectedParts.some(s=>s.id===p.id)) p.parent=activeBone.id;
              }
            });
          }}><Link2 size={15}/>绑定到当前骨骼</button>
          <button className="pc-bone-btn w-full" disabled={!activeBone || !selectedParts.some(p=>p.mesh)} onClick={autoWeightsForSelectedParts}>
            <Wand2 size={15}/>为所选网格自动生成多骨骼权重
          </button>
          <div className="text-[10px] text-muted-foreground leading-relaxed">
            每个网格顶点最多取附近 4 根骨骼权重。可用于手指、脚趾、头发、衣摆、尾巴、耳朵等任意骨链，不再限制为“手臂/双腿”模板。
          </div>
        </div>
      </div>
    </div>
  );
}
