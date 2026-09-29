/**
 * PaperChalk mobile/professional SkeletonOverlay.
 *
 * Key differences from upstream:
 * - arbitrary bone roles and arbitrary hierarchy (no fixed SKELETON_CONNECTIONS)
 * - tapered professional bone bodies + large touch joints
 * - all custom bones get rotation handles
 * - joint rigging drag is previewed locally and committed once on pointer-up,
 *   avoiding full Immer/project rebuilds for every touch-move event
 * - generic mesh joint binding: any bone may drive a mesh with jointBoneId
 */
import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useAnimationStore } from '@/store/animationStore';
import { computeWorldMatrices, mat3Identity } from '@/renderer/transforms';
import { computePoseOverrides } from '@/renderer/animationEngine';
import { beginBatch, endBatch } from '@/store/undoHistory';

const COLOUR_NORMAL = '#ef4444';
const COLOUR_EDIT   = '#facc15';
const COLOUR_DRAG   = '#22d3ee';
const LINE_COLOUR   = 'rgba(34,211,238,0.72)';
const BONE_FILL_EDIT = 'rgba(250,204,21,0.30)';
const BONE_FILL_NORMAL = 'rgba(34,211,238,0.22)';
const BONE_STROKE_EDIT = 'rgba(250,204,21,0.95)';
const BONE_STROKE_NORMAL = 'rgba(34,211,238,0.90)';

const JOINT_RADIUS_NORMAL = 5.5;
const JOINT_RADIUS_EDIT = 8.5;
const TOUCH_RADIUS = 22;
const ARC_RADIUS = 30;
const ARC_SWEEP_DEG = 270;
const ARC_COLOUR = 'rgba(251,191,36,0.55)';
const ARC_ACTIVE = 'rgba(251,191,36,0.98)';
const ARC_STROKE_W = 7;

const ROLE_ZH = {
  root: '根/骨盆', torso: '躯干', neck: '颈部', head: '头部', eyes: '眼睛',
  leftArm: '左上臂', rightArm: '右上臂',
  leftElbow: '左前臂', rightElbow: '右前臂',
  leftHand: '左手', rightHand: '右手',
  leftLeg: '左大腿', rightLeg: '右大腿',
  leftKnee: '左小腿', rightKnee: '右小腿',
  leftFoot: '左脚', rightFoot: '右脚',
};

function toImage(cssX, cssY, zoom, panX, panY) {
  return [(cssX - panX) / zoom, (cssY - panY) / zoom];
}

function arcPath(cx, cy, r, startDeg, sweepDeg) {
  const half = sweepDeg / 2;
  const a1 = (startDeg - half) * Math.PI / 180;
  const a2 = (startDeg + half) * Math.PI / 180;
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

function displayLabel(node) {
  return ROLE_ZH[node.boneRole] || node.name || node.boneRole || '骨骼';
}

export default function SkeletonOverlay({ view, editorMode, showSkeleton, skeletonEditMode }) {
  const updateProject = useProjectStore(s => s.updateProject);
  const nodes = useProjectStore(s => s.project.nodes);
  const animations = useProjectStore(s => s.project.animations);

  const selection = useEditorStore(s => s.selection);
  const setSelection = useEditorStore(s => s.setSelection);
  const animCurrentTime = useAnimationStore(s => s.currentTime);
  const animActiveAnimationId = useAnimationStore(s => s.activeAnimationId);
  const animDraftPose = useAnimationStore(s => s.draftPose);
  const animLoopKeyframes = useAnimationStore(s => s.loopKeyframes);
  const animFps = useAnimationStore(s => s.fps);
  const animEndFrame = useAnimationStore(s => s.endFrame);
  const setDraftPose = useAnimationStore(s => s.setDraftPose);
  const clearDraftPoseForNode = useAnimationStore(s => s.clearDraftPoseForNode);

  const dragRef = useRef(null);
  const svgRef = useRef(null);
  const viewRef = useRef(view);
  const editorModeRef = useRef(editorMode);
  const setDraftPoseRef = useRef(setDraftPose);
  const clearDraftPoseForNodeRef = useRef(clearDraftPoseForNode);

  // Joint drag preview is local to this overlay. Project/renderer is updated once
  // on release rather than potentially hundreds of Immer writes per second.
  const [jointPreview, setJointPreview] = useState(null);
  const previewPendingRef = useRef(null);
  const previewRafRef = useRef(0);

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { editorModeRef.current = editorMode; }, [editorMode]);
  useEffect(() => { setDraftPoseRef.current = setDraftPose; }, [setDraftPose]);
  useEffect(() => { clearDraftPoseForNodeRef.current = clearDraftPoseForNode; }, [clearDraftPoseForNode]);

  useEffect(() => () => {
    if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
  }, []);

  const ANIM_KEYS = ['x', 'y', 'rotation', 'scaleX', 'scaleY'];
  const effectiveNodes = useMemo(() => {
    if (editorMode !== 'animation') return nodes;
    const activeAnim = animations.find(a => a.id === animActiveAnimationId) ?? null;
    const endMs = (animEndFrame / animFps) * 1000;
    const overrides = computePoseOverrides(activeAnim, animCurrentTime, animLoopKeyframes, endMs);
    const hasDraft = animDraftPose.size > 0;
    if (!overrides.size && !hasDraft) return nodes;
    return nodes.map(node => {
      const ov = overrides.get(node.id);
      const dr = animDraftPose.get(node.id);
      if (!ov && !dr) return node;
      const tr = { ...node.transform };
      if (ov) for (const k of ANIM_KEYS) if (ov[k] !== undefined) tr[k] = ov[k];
      if (dr) for (const k of ANIM_KEYS) if (dr[k] !== undefined) tr[k] = dr[k];
      return { ...node, transform: tr, opacity: dr?.opacity ?? ov?.opacity ?? node.opacity };
    });
  }, [editorMode, nodes, animations, animActiveAnimationId, animCurrentTime, animDraftPose, animLoopKeyframes, animFps, animEndFrame]);

  const displayNodes = useMemo(() => {
    if (!jointPreview) return effectiveNodes;
    return effectiveNodes.map(n => n.id === jointPreview.nodeId
      ? { ...n, transform: { ...n.transform, pivotX: jointPreview.x, pivotY: jointPreview.y } }
      : n);
  }, [effectiveNodes, jointPreview]);

  const boneNodes = useMemo(
    () => displayNodes.filter(n => n.type === 'group' && n.boneRole),
    [displayNodes]
  );
  const nodeById = useMemo(
    () => new Map(displayNodes.map(n => [n.id, n])),
    [displayNodes]
  );
  const boneById = useMemo(
    () => new Map(boneNodes.map(n => [n.id, n])),
    [boneNodes]
  );

  const nearestBoneParent = useCallback((node) => {
    let pid = node?.parent ?? null;
    const seen = new Set();
    while (pid && !seen.has(pid)) {
      seen.add(pid);
      if (boneById.has(pid)) return boneById.get(pid);
      pid = nodeById.get(pid)?.parent ?? null;
    }
    return null;
  }, [boneById, nodeById]);

  const onPointerDown = useCallback((e, nodeId, dragType = 'joint') => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    const currentNodes = displayNodes;
    const node = currentNodes.find(n => n.id === nodeId);
    if (!node) return;

    if (dragType === 'joint') {
      if (!skeletonEditMode) return;
      dragRef.current = {
        type: 'joint',
        nodeId,
        lastX: node.transform?.pivotX ?? 0,
        lastY: node.transform?.pivotY ?? 0,
      };
      setSelection([nodeId]);
      return;
    }

    if (dragType === 'trackpad') {
      if (skeletonEditMode) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cssX = e.clientX - rect.left, cssY = e.clientY - rect.top;
      const worldMap = computeWorldMatrices(currentNodes);
      let pwm = mat3Identity();
      if (node.parent && worldMap.has(node.parent)) pwm = worldMap.get(node.parent);
      const bx = pwm[0] * node.transform.pivotX + pwm[3] * node.transform.pivotY + pwm[6];
      const by = pwm[1] * node.transform.pivotX + pwm[4] * node.transform.pivotY + pwm[7];
      const { zoom, panX, panY } = viewRef.current;
      const tpx = bx * zoom + panX;
      const tpy = by * zoom + panY - 120;

      dragRef.current = {
        type: 'trackpad', nodeId, tpX: tpx, tpY: tpy,
        isAnimMode: editorModeRef.current === 'animation',
      };
      setSelection([nodeId]);
      if (editorModeRef.current === 'staging') beginBatch(useProjectStore.getState().project);

      const half = 40;
      const dx = Math.max(-half, Math.min(half, cssX - tpx));
      const dy = Math.max(-half, Math.min(half, cssY - tpy));
      const newX = dx, newY = dy;
      if (editorModeRef.current === 'animation') {
        setDraftPoseRef.current(nodeId, { x: newX, y: newY });
      } else {
        updateProject(proj => {
          const n = proj.nodes.find(x => x.id === nodeId);
          if (n) { n.transform.x = newX; n.transform.y = newY; }
        }, { skipHistory: true });
      }
      return;
    }

    if (dragType === 'rotate') {
      if (skeletonEditMode) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const worldMap = computeWorldMatrices(currentNodes);
      const wm = worldMap.get(nodeId) ?? mat3Identity();
      const wx = wm[0] * node.transform.pivotX + wm[3] * node.transform.pivotY + wm[6];
      const wy = wm[1] * node.transform.pivotX + wm[4] * node.transform.pivotY + wm[7];
      const { zoom, panX, panY } = viewRef.current;
      const pivotScreenX = wx * zoom + panX;
      const pivotScreenY = wy * zoom + panY;
      const dx = e.clientX - rect.left - pivotScreenX;
      const dy = e.clientY - rect.top - pivotScreenY;

      // Generic binding: every custom bone can drive meshes assigned to it.
      const dependentParts = [];
      const activeAnim = animations.find(a => a.id === animActiveAnimationId) ?? null;
      const endMs = (animEndFrame / animFps) * 1000;
      const overrides = computePoseOverrides(activeAnim, animCurrentTime, animLoopKeyframes, endMs);
      for (const pt of currentNodes) {
        if (pt.type !== 'part' || !pt.mesh || pt.mesh.jointBoneId !== node.id) continue;
        let startVerts = pt.mesh.vertices;
        if (editorModeRef.current === 'animation') {
          startVerts = animDraftPose.get(pt.id)?.mesh_verts ?? overrides?.get(pt.id)?.mesh_verts ?? pt.mesh.vertices;
        }
        dependentParts.push({
          partId: pt.id,
          startVerts: startVerts.map(v => ({ ...v })),
          boneWeights: pt.mesh.boneWeights,
          imgPivotX: node.transform.pivotX,
          imgPivotY: node.transform.pivotY,
        });
      }

      dragRef.current = {
        type: 'rotate', nodeId,
        startAngle: Math.atan2(dy, dx),
        startRotation: node.transform.rotation ?? 0,
        pivotScreenX, pivotScreenY,
        isAnimMode: editorModeRef.current === 'animation',
        dependentParts,
      };
      setSelection([nodeId]);
      if (editorModeRef.current === 'staging') beginBatch(useProjectStore.getState().project);
    }
  }, [displayNodes, skeletonEditMode, setSelection, updateProject, animations, animActiveAnimationId, animCurrentTime, animLoopKeyframes, animFps, animEndFrame, animDraftPose]);

  const scheduleJointPreview = useCallback((preview) => {
    previewPendingRef.current = preview;
    if (previewRafRef.current) return;
    previewRafRef.current = requestAnimationFrame(() => {
      previewRafRef.current = 0;
      const p = previewPendingRef.current;
      previewPendingRef.current = null;
      if (p) setJointPreview(p);
    });
  }, []);

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();

    if (drag.type === 'joint') {
      const cssX = e.clientX - rect.left, cssY = e.clientY - rect.top;
      const { zoom, panX, panY } = viewRef.current;
      const [imgX, imgY] = toImage(cssX, cssY, zoom, panX, panY);
      drag.lastX = imgX;
      drag.lastY = imgY;
      scheduleJointPreview({ nodeId: drag.nodeId, x: imgX, y: imgY });
      e.preventDefault();
      return;
    }

    if (drag.type === 'rotate') {
      const cssX = e.clientX - rect.left, cssY = e.clientY - rect.top;
      const dx = cssX - drag.pivotScreenX, dy = cssY - drag.pivotScreenY;
      const currentAngle = Math.atan2(dy, dx);
      let delta = (currentAngle - drag.startAngle) * 180 / Math.PI;
      if (e.shiftKey) delta = Math.round(delta / 15) * 15;
      const rotation = drag.startRotation + delta;

      if (drag.isAnimMode) {
        setDraftPoseRef.current(drag.nodeId, { rotation });
      } else {
        updateProject(proj => {
          const n = proj.nodes.find(x => x.id === drag.nodeId);
          if (n) n.transform.rotation = rotation;
        }, { skipHistory: true });
      }

      if (drag.dependentParts?.length) {
        const rad = delta * Math.PI / 180;
        for (const dep of drag.dependentParts) {
          const newVerts = dep.startVerts.map((v, i) => {
            const w = dep.boneWeights?.[i] ?? 0;
            if (!w) return { ...v };
            const vx = v.x - dep.imgPivotX, vy = v.y - dep.imgPivotY;
            const wr = rad * w, co = Math.cos(wr), si = Math.sin(wr);
            return {
              ...v,
              x: dep.imgPivotX + vx * co - vy * si,
              y: dep.imgPivotY + vx * si + vy * co,
            };
          });
          setDraftPoseRef.current(dep.partId, { mesh_verts: newVerts });
        }
      }
      return;
    }

    if (drag.type === 'trackpad') {
      const cssX = e.clientX - rect.left, cssY = e.clientY - rect.top;
      const half = 40;
      const newX = Math.max(-half, Math.min(half, cssX - drag.tpX));
      const newY = Math.max(-half, Math.min(half, cssY - drag.tpY));
      if (drag.isAnimMode) {
        setDraftPoseRef.current(drag.nodeId, { x: newX, y: newY });
      } else {
        updateProject(proj => {
          const n = proj.nodes.find(x => x.id === drag.nodeId);
          if (n) { n.transform.x = newX; n.transform.y = newY; }
        }, { skipHistory: true });
      }
    }
  }, [scheduleJointPreview, updateProject]);

  const onPointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;

    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = 0;
    }
    previewPendingRef.current = null;

    if (drag?.type === 'joint') {
      const x = drag.lastX, y = drag.lastY;
      setJointPreview(null);
      // One project mutation per completed drag gesture.
      updateProject((proj, vc) => {
        const n = proj.nodes.find(v => v.id === drag.nodeId);
        if (!n) return;
        n.transform.pivotX = x;
        n.transform.pivotY = y;
        if (vc) vc.transformVersion++;
      });
      return;
    }

    endBatch();

    if (drag?.type === 'rotate' && drag.dependentParts?.length && !drag.isAnimMode) {
      for (const dep of drag.dependentParts) {
        const latestVerts = useAnimationStore.getState().draftPose.get(dep.partId)?.mesh_verts;
        if (latestVerts) {
          updateProject(proj => {
            const pt = proj.nodes.find(n => n.id === dep.partId);
            if (pt?.mesh) pt.mesh.vertices = latestVerts.map(v => ({ ...v }));
          });
        }
        clearDraftPoseForNodeRef.current(dep.partId);
      }
    }

    if (drag && (drag.type === 'rotate' || drag.type === 'trackpad')) {
      if (useEditorStore.getState().autoKeyframe && editorModeRef.current === 'animation') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', code: 'KeyK' }));
      }
    }
  }, [updateProject]);

  if (!boneNodes.length || !showSkeleton) return null;
  if (editorMode !== 'staging' && editorMode !== 'animation') return null;

  const { zoom, panX, panY } = view;
  const worldMap = computeWorldMatrices(displayNodes);

  function pivotScreenPos(node) {
    const wm = worldMap.get(node.id) ?? mat3Identity();
    const wx = wm[0] * node.transform.pivotX + wm[3] * node.transform.pivotY + wm[6];
    const wy = wm[1] * node.transform.pivotX + wm[4] * node.transform.pivotY + wm[7];
    return [wx * zoom + panX, wy * zoom + panY];
  }

  const boneShapes = [];
  for (const child of boneNodes) {
    const parent = nearestBoneParent(child);
    if (!parent) continue;
    const [x1, y1] = pivotScreenPos(parent);
    const [x2, y2] = pivotScreenPos(child);
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const px = -dy / len, py = dx / len;
    const baseW = Math.max(6, Math.min(13, len * 0.10));
    const neckW = Math.max(3, baseW * 0.34);
    const sx = x1 + dx * 0.22, sy = y1 + dy * 0.22;
    const inset = Math.min(0.08, 8 / len);
    const tx = x2 - dx * inset, ty = y2 - dy * inset;
    const points = [
      `${x1 + px*neckW},${y1 + py*neckW}`,
      `${sx + px*baseW},${sy + py*baseW}`,
      `${tx + px*2.5},${ty + py*2.5}`,
      `${x2},${y2}`,
      `${tx - px*2.5},${ty - py*2.5}`,
      `${sx - px*baseW},${sy - py*baseW}`,
      `${x1 - px*neckW},${y1 - py*neckW}`,
    ].join(' ');
    boneShapes.push(
      <g key={`bone-${parent.id}-${child.id}`} pointerEvents="none">
        <polygon
          points={points}
          fill={skeletonEditMode ? BONE_FILL_EDIT : BONE_FILL_NORMAL}
          stroke={skeletonEditMode ? BONE_STROKE_EDIT : BONE_STROKE_NORMAL}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={LINE_COLOUR} strokeWidth={1} strokeLinecap="round" />
      </g>
    );
  }

  const joints = [];
  for (const node of boneNodes) {
    const [cx, cy] = pivotScreenPos(node);
    const isDragging = dragRef.current?.nodeId === node.id;
    const fill = isDragging ? COLOUR_DRAG : (skeletonEditMode ? COLOUR_EDIT : COLOUR_NORMAL);
    const radius = skeletonEditMode ? JOINT_RADIUS_EDIT : JOINT_RADIUS_NORMAL;
    const label = displayLabel(node);
    joints.push(
      <g key={`joint-${node.id}`}>
        <circle
          cx={cx} cy={cy} r={TOUCH_RADIUS}
          fill="transparent"
          style={{ cursor: skeletonEditMode ? 'grab' : 'pointer', pointerEvents: 'auto', touchAction: 'none' }}
          onPointerDown={(e) => onPointerDown(e, node.id, 'joint')}
          onClick={() => !skeletonEditMode && setSelection([node.id])}
        />
        <circle cx={cx} cy={cy} r={radius}
          fill={fill} stroke="#111827" strokeWidth={2} pointerEvents="none" />
        <circle cx={cx} cy={cy} r={Math.max(2, radius * 0.28)}
          fill="#111827" opacity={0.75} pointerEvents="none" />
        {skeletonEditMode && (
          <g pointerEvents="none">
            <rect
              x={cx - Math.max(28, label.length * 5.5) / 2}
              y={cy + radius + 2}
              width={Math.max(28, label.length * 5.5)}
              height={15} rx={5} fill="rgba(0,0,0,0.68)"
            />
            <text x={cx} y={cy + radius + 13}
              textAnchor="middle" fontSize={10} fill="white"
              style={{ userSelect: 'none', fontWeight: 600 }}>
              {label}
            </text>
          </g>
        )}
      </g>
    );
  }

  const arcs = [];
  const trackpads = [];
  for (const node of boneNodes) {
    const role = node.boneRole;
    if (role === 'eyes' && !skeletonEditMode) {
      const parentId = node.parent;
      let pwm = mat3Identity();
      if (parentId && worldMap.has(parentId)) pwm = worldMap.get(parentId);
      const bx = pwm[0] * node.transform.pivotX + pwm[3] * node.transform.pivotY + pwm[6];
      const by = pwm[1] * node.transform.pivotX + pwm[4] * node.transform.pivotY + pwm[7];
      const cx = bx * zoom + panX, cy = by * zoom + panY;
      const tpx = cx, tpy = cy - 120, half = 40;
      const ex = node.transform.x || 0, ey = node.transform.y || 0;
      const active = dragRef.current?.type === 'trackpad' && dragRef.current?.nodeId === node.id;
      trackpads.push(
        <g key={`trackpad-${node.id}`}>
          <text x={tpx} y={tpy-half-8} textAnchor="middle" fontSize={11}
            fill="rgba(255,255,255,.9)" pointerEvents="none">眼球偏移</text>
          <rect x={tpx-half} y={tpy-half} width={80} height={80} rx={8}
            fill="rgba(20,20,20,.75)" stroke="rgba(255,255,255,.25)"
            style={{ cursor:'crosshair', pointerEvents:'auto', touchAction:'none' }}
            onPointerDown={(e)=>onPointerDown(e,node.id,'trackpad')} />
          <circle cx={tpx + ex} cy={tpy + ey} r={active?9:7}
            fill={active?COLOUR_DRAG:COLOUR_EDIT} pointerEvents="none" />
        </g>
      );
      continue;
    }

    if (skeletonEditMode || role === 'root') continue;
    const [cx, cy] = pivotScreenPos(node);
    const wm = worldMap.get(node.id) ?? mat3Identity();
    const orient = Math.atan2(wm[4], wm[3]) * 180 / Math.PI - 90;
    const active = dragRef.current?.type === 'rotate' && dragRef.current?.nodeId === node.id;
    arcs.push(
      <path key={`arc-${node.id}`}
        d={arcPath(cx,cy,ARC_RADIUS,orient,ARC_SWEEP_DEG)}
        fill="none" stroke={active?ARC_ACTIVE:ARC_COLOUR}
        strokeWidth={ARC_STROKE_W} strokeLinecap="round"
        style={{ cursor:'alias', pointerEvents:'visibleStroke', touchAction:'none' }}
        onPointerDown={(e)=>onPointerDown(e,node.id,'rotate')} />
    );
  }

  return (
    <>
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents:'none', touchAction:'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={(e) => { if (e.buttons === 0) onPointerUp(); }}
      >
        {arcs}
        {boneShapes}
        {joints}
        {trackpads}
      </svg>

      {skeletonEditMode && (
        <div className="absolute top-0 inset-x-0 z-40 flex items-center gap-2 px-2 py-2
                        bg-background/92 border-b border-border backdrop-blur-sm overflow-x-auto">
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">调整骨骼</span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            拖动关节端点；骨段实时跟随。松手后一次性写入，减少手机卡顿。
          </span>
        </div>
      )}
    </>
  );
}
