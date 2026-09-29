#!/usr/bin/env python3
from pathlib import Path
import sys
import re

root = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/stretchystudio")

def read(rel):
    return (root / rel).read_text()

def write(rel, text):
    p = root / rel
    p.write_text(text)

def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f"[patch_stretchy] required pattern missing: {label}")
    return text.replace(old, new, 1)

# Vite assets must use relative URLs inside WebView appassets.
s = read("vite.config.js")
if "base: './'" not in s:
    s = must_replace(s, "export default defineConfig({", "export default defineConfig({\n  base: './',", "vite base")
write("vite.config.js", s)

# Expose stores / MediaPipe constructors to the native Android bridge.
s = read("src/main.jsx")
needle = "import { ThemeProvider } from './contexts/ThemeProvider.jsx'\n"
if "__PAPERCHALK_MEDIAPIPE__" not in s:
    s = must_replace(
        s, needle,
        needle + "import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'\n",
        "mediapipe import"
    )
    s += """
if (typeof window !== 'undefined') {
  window.__PAPERCHALK_MEDIAPIPE__ = { FilesetResolver, PoseLandmarker };
}
"""
write("src/main.jsx", s)

for rel, line in [
    ("src/store/projectStore.js", "\nif (typeof window !== 'undefined') window.__PAPERCHALK_PROJECT_STORE__ = useProjectStore;\n"),
    ("src/store/animationStore.js", "\nif (typeof window !== 'undefined') window.__PAPERCHALK_ANIMATION_STORE__ = useAnimationStore;\n"),
    ("src/store/parameterStore.js", "\nif (typeof window !== 'undefined') window.__PAPERCHALK_PARAMETER_STORE__ = useParameterStore;\n"),
    ("src/store/editorStore.js", "\nif (typeof window !== 'undefined') window.__PAPERCHALK_EDITOR_STORE__ = useEditorStore;\n"),
]:
    s = read(rel)
    if line.strip() not in s:
        s += line
    write(rel, s)

# DWPose: force CPU/WASM-only ONNX Runtime. The default ORT bundle may pick
# a JSEP build and dynamically import *.jsep.mjs, which is exactly what failed
# on Android WebView. Both module and model are shipped inside the APK.
s = read("src/io/armatureOrganizer.js")
s = must_replace(
    s,
    "const module = await import('onnxruntime-web');",
    "const module = await import('onnxruntime-web/wasm');",
    "ORT wasm-only import"
)
s = must_replace(
    s,
    "instance.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';",
    """instance.env.wasm.numThreads = 1;
    instance.env.wasm.proxy = false;
    instance.env.wasm.wasmPaths = {
      mjs: 'https://appassets.androidplatform.net/assets/studio/ort/ort-wasm-simd-threaded.mjs',
      wasm: 'https://appassets.androidplatform.net/assets/studio/ort/ort-wasm-simd-threaded.wasm',
    };""",
    "local ORT paths"
)
s = must_replace(
    s,
    "export const DWPOSE_URL = 'https://huggingface.co/yzd-v/DWPose/resolve/main/dw-ll_ucoco_384.onnx';",
    "export const DWPOSE_URL = 'https://appassets.androidplatform.net/assets/studio/models/dw-ll_ucoco_384.onnx';",
    "local DWPose URL"
)
write("src/io/armatureOrganizer.js", s)

# Upgrade the default auto-rig to separate left/right limb chains. Merged PSD
# artwork may remain attached to torso/root, but the skeleton itself never
# collapses into "bothArms"/"bothLegs".
s = read("src/io/armatureOrganizer.js")
s = s.replace("if (tag === 'handwear')                             return 'bothArms';",
              "if (tag === 'handwear')                             return 'torso';")
s = s.replace("if (tag === 'legwear'   || tag === 'footwear')      return 'bothLegs';",
              "if (tag === 'legwear'   || tag === 'footwear')      return 'root';")

s = s.replace(
"""    leftArm:   groups.arms === 'split' || (groups.arms === 'partial' && layers.some(l => matchTag(l.name) === 'handwear-l')),
    rightArm:  groups.arms === 'split' || (groups.arms === 'partial' && layers.some(l => matchTag(l.name) === 'handwear-r')),
    bothArms:  groups.arms === 'merged',
    leftElbow: groups.arms === 'split' || (groups.arms === 'partial' && layers.some(l => matchTag(l.name) === 'handwear-l')),
    rightElbow:groups.arms === 'split' || (groups.arms === 'partial' && layers.some(l => matchTag(l.name) === 'handwear-r')),
    leftLeg:   groups.legs === 'split' || (groups.legs === 'partial' && layers.some(l => matchTag(l.name) === 'legwear-l')),
    rightLeg:  groups.legs === 'split' || (groups.legs === 'partial' && layers.some(l => matchTag(l.name) === 'legwear-r')),
    leftKnee:  groups.legs === 'split' || (groups.legs === 'partial' && layers.some(l => matchTag(l.name) === 'legwear-l')),
    rightKnee: groups.legs === 'split' || (groups.legs === 'partial' && layers.some(l => matchTag(l.name) === 'legwear-r')),
    bothLegs:  groups.legs === 'merged',
""",
"""    leftArm:   groups.arms !== 'missing',
    rightArm:  groups.arms !== 'missing',
    leftElbow: groups.arms !== 'missing',
    rightElbow:groups.arms !== 'missing',
    leftHand:  groups.arms !== 'missing',
    rightHand: groups.arms !== 'missing',
    leftLeg:   groups.legs !== 'missing' || groups.feet !== 'missing',
    rightLeg:  groups.legs !== 'missing' || groups.feet !== 'missing',
    leftKnee:  groups.legs !== 'missing' || groups.feet !== 'missing',
    rightKnee: groups.legs !== 'missing' || groups.feet !== 'missing',
    leftFoot:  groups.legs !== 'missing' || groups.feet !== 'missing',
    rightFoot: groups.legs !== 'missing' || groups.feet !== 'missing',
"""
)

s = s.replace(
"""    leftElbow: kp.lElbow,
    rightElbow:kp.rElbow,
    bothArms:  kp.shoulderMid,  // actual shoulder midpoint
    leftLeg:   kp.lHip,
    rightLeg:  kp.rHip,
    leftKnee:  kp.lKnee,
    rightKnee: kp.rKnee,
    bothLegs:  kp.pelvis,       // hip line
""",
"""    leftElbow: kp.lElbow,
    rightElbow:kp.rElbow,
    leftHand:  kp.lWrist ?? kp.lElbow,
    rightHand: kp.rWrist ?? kp.rElbow,
    leftLeg:   kp.lHip,
    rightLeg:  kp.rHip,
    leftKnee:  kp.lKnee,
    rightKnee: kp.rKnee,
    leftFoot:  kp.lAnkle ?? kp.lKnee,
    rightFoot: kp.rAnkle ?? kp.rKnee,
"""
)

s = s.replace(
"""    leftElbow: needGroup.leftArm ? 'leftArm' : (needGroup.torso ? 'torso' : 'root'),
    rightElbow:needGroup.rightArm ? 'rightArm' : (needGroup.torso ? 'torso' : 'root'),
    bothArms:  needGroup.torso ? 'torso' : 'root',
    leftLeg:   'root',
    rightLeg:  'root',
    leftKnee:  needGroup.leftLeg ? 'leftLeg' : 'root',
    rightKnee: needGroup.rightLeg ? 'rightLeg' : 'root',
    bothLegs:  'root',
""",
"""    leftElbow: needGroup.leftArm ? 'leftArm' : (needGroup.torso ? 'torso' : 'root'),
    rightElbow:needGroup.rightArm ? 'rightArm' : (needGroup.torso ? 'torso' : 'root'),
    leftHand:  needGroup.leftElbow ? 'leftElbow' : (needGroup.leftArm ? 'leftArm' : 'root'),
    rightHand: needGroup.rightElbow ? 'rightElbow' : (needGroup.rightArm ? 'rightArm' : 'root'),
    leftLeg:   'root',
    rightLeg:  'root',
    leftKnee:  needGroup.leftLeg ? 'leftLeg' : 'root',
    rightKnee: needGroup.rightLeg ? 'rightLeg' : 'root',
    leftFoot:  needGroup.leftKnee ? 'leftKnee' : (needGroup.leftLeg ? 'leftLeg' : 'root'),
    rightFoot: needGroup.rightKnee ? 'rightKnee' : (needGroup.rightLeg ? 'rightLeg' : 'root'),
"""
)

s = s.replace(
"const CREATE_ORDER = ['root','torso','neck','head','eyes','leftArm','rightArm','leftElbow','rightElbow','bothArms','leftLeg','rightLeg','leftKnee','rightKnee','bothLegs'];",
"const CREATE_ORDER = ['root','torso','neck','head','eyes','leftArm','rightArm','leftElbow','rightElbow','leftHand','rightHand','leftLeg','rightLeg','leftKnee','rightKnee','leftFoot','rightFoot'];"
)

s = s.replace(
"""  ['leftArm', 'leftElbow'],
  ['rightArm', 'rightElbow'],
  ['torso',  'leftLeg'],
  ['torso',  'rightLeg'],
  ['leftLeg', 'leftKnee'],
  ['rightLeg', 'rightKnee'],
  // merged variants
  ['torso', 'bothArms'],
  ['torso',  'bothLegs'],
""",
"""  ['leftArm', 'leftElbow'],
  ['rightArm', 'rightElbow'],
  ['leftElbow', 'leftHand'],
  ['rightElbow', 'rightHand'],
  ['root',  'leftLeg'],
  ['root',  'rightLeg'],
  ['leftLeg', 'leftKnee'],
  ['rightLeg', 'rightKnee'],
  ['leftKnee', 'leftFoot'],
  ['rightKnee', 'rightFoot'],
"""
)
write("src/io/armatureOrganizer.js", s)

# Auto-start bundled DWPose when user enters the AI rig step. Keep the local
# file picker as an offline fallback, but never require a download/login.
s = read("src/components/canvas/PsdImportWizard.jsx")
s = s.replace(
    "import { useState, useCallback, useEffect } from 'react';",
    "import { useState, useCallback, useEffect, useRef } from 'react';"
)
anchor = "  const [performSplit, setPerformSplit] = useState(true);\n"
if "autoDwposeAttempted" not in s:
    s = must_replace(
        s, anchor,
        anchor + "  const autoDwposeAttempted = useRef(false);\n",
        "DWPose attempt ref"
    )
run_end = """  }, [step, effectiveLayers, psdW, psdH, partIds, meshAllParts, onFinalize, onApplyRig, onnxSessionRef]);

  /* ── Effect: Auto-rearrange eye layers ────────────────────────────────── */
"""
if "APK 内置 DWPose" not in s:
    auto_effect = """  }, [step, effectiveLayers, psdW, psdH, partIds, meshAllParts, onFinalize, onApplyRig, onnxSessionRef]);

  // Android build: entering the AI-rig step immediately uses the model bundled
  // inside the APK. No login, browser download, or Internet permission.
  useEffect(() => {
    if (step !== 'dwpose') {
      autoDwposeAttempted.current = false;
      return;
    }
    if (autoDwposeAttempted.current) return;
    autoDwposeAttempted.current = true;
    setRigStatus('正在加载 APK 内置 DWPose 模型…');
    runArmatureRig(DWPOSE_URL);
  }, [step, runArmatureRig]);

  /* ── Effect: Auto-rearrange eye layers ────────────────────────────────── */
"""
    s = must_replace(s, run_end, auto_effect, "DWPose auto-start effect")

# Direct Chinese copy in the most important mobile wizard surfaces.
repls = {
    "Review Layer Mapping": "检查图层识别",
    "Split merged parts (recommended)": "拆分合并部件（推荐）",
    "Mesh all parts after import": "导入后为全部部件生成网格",
    "Cancel Import": "取消导入",
    "Skip rigging": "跳过绑骨",
    "Continue →": "继续 →",
    "Step 2: Reorder Layers": "第2步：调整图层顺序",
    "Rearrange layers in the Layer Panel as needed to fix any ordering issues.": "在图层面板中调整前后顺序，修正遮挡关系。",
    "Next: Adjust Joints →": "下一步：调整骨骼 →",
    "Load DWPose model": "离线 DWPose 自动绑骨",
    "Download or upload the ~50 MB DWPose ONNX model for high-accuracy pose detection.": "APK 已内置 DWPose ONNX 模型，将自动进行高精度姿态检测，无需联网。",
    "Status:": "状态：",
    "Not loaded": "未加载",
    "Loaded ✓": "已加载 ✓",
    "Load Model": "模型",
    "Load .onnx file": "选择本地 .onnx",
    "Download": "重新运行内置模型",
    "Working…": "处理中…",
    "← Back": "← 返回",
    "Step 3: Adjust Joints": "第3步：调整骨骼",
    "Drag yellow dots to reposition joints.": "拖动关节端点调整骨骼位置；骨段会随关节一起更新。",
    "Mesh all parts": "为全部部件生成网格",
    "AI Auto-Rig (DWPose)": "离线 AI 自动绑骨",
    "Next: Setup Parameters →": "下一步：设置变形参数 →",
    "Step 4: Live2D Parameters": "第4步：变形参数",
    "Idle preview playing": "正在预览待机动作",
    "Generating…": "正在生成…",
    "Done →": "完成 →",
    "Skip": "跳过",
}
for a,b in repls.items():
    s = s.replace(a,b)
write("src/components/canvas/PsdImportWizard.jsx", s)

# Desktop-first editor top bar: allow horizontal scrolling on narrow phones.
s = read("src/app/layout/EditorLayout.jsx")
s = s.replace(
    'className="h-10 border-b flex items-center px-4 shrink-0 bg-card gap-3 relative"',
    'className="min-h-11 border-b flex items-center px-2 sm:px-4 shrink-0 bg-card gap-1 sm:gap-3 relative overflow-x-auto overflow-y-hidden"'
)
s = s.replace(
    'className="font-semibold text-sm select-none tracking-tight"',
    'className="font-semibold text-sm select-none tracking-tight hidden sm:inline"'
)
s = s.replace(
    'className="text-xs text-muted-foreground border border-border/50 px-1.5 py-0.5 font-mono"',
    'className="text-xs text-muted-foreground border border-border/50 px-1.5 py-0.5 font-mono hidden md:inline"'
)
s = s.replace(
    'className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/40"',
    'className="sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 flex items-center bg-muted/30 rounded-lg p-0.5 border border-border/40 shrink-0"'
)
s = s.replace(
    '<ResizablePanelGroup direction="horizontal">',
    '<ResizablePanelGroup direction="horizontal" className="pc-main-panels">',
    1
)
s = s.replace(
    '<ResizablePanel defaultSize={18} minSize={12} maxSize={28}>',
    '<ResizablePanel defaultSize={18} minSize={12} maxSize={28} className="pc-panel-layers">'
)
s = s.replace(
    '<ResizablePanel defaultSize={nodes.length > 0 ? 62 : 100}>',
    '<ResizablePanel defaultSize={nodes.length > 0 ? 62 : 100} className="pc-panel-canvas">'
)
s = s.replace(
    'className={cn("bg-card border-l transition-all duration-300", (!nodes.length || wizardStep) && "hidden")}',
    'className={cn("pc-panel-inspector bg-card border-l transition-all duration-300", (!nodes.length || wizardStep) && "hidden")}'
)
s = s.replace(">Staging</button>", ">布局</button>")
s = s.replace(">Animation</button>", ">动画</button>")
s = s.replace("Scroll to zoom · Alt+drag to pan", "手机：单指拖动画布 · 双指缩放/平移")
write("src/app/layout/EditorLayout.jsx", s)

# Remove external links/online wording in the embedded editor. The Android shell
# has no INTERNET permission, but we also remove misleading affordances.
for rel in [
    "src/components/canvas/CanvasViewport.jsx",
    "src/components/preferences/PreferencesModal.jsx",
]:
    s = read(rel)
    s = s.replace("https://huggingface.co/spaces/24yearsold/see-through-demo", "#offline-feature-disabled")
    s = s.replace("Free HuggingFace Space", "离线模式")
    s = s.replace("Download from HuggingFace", "使用 APK 内置模型")
    write(rel, s)

# Generic multi-bone skinning when a mesh is generated. Any custom bone branch
# (fingers, toes, hair, clothes, tail, ears...) can influence the mesh.
s = read("src/components/canvas/CanvasViewport.jsx")
skin_pat = re.compile(
    r"""          // Compute skin weights if this part belongs to a limb\n[\s\S]*?          \}\n\n          // If the pivot is at the default"""
)
new_skin = """          // Generic multi-bone weights for any armature branch.
          const parentGroup = proj.nodes.find(n => n.id === node.parent);
          if (parentGroup && parentGroup.boneRole) {
            const byId = new Map(proj.nodes.map(n => [n.id, n]));
            const branch = [];
            const queue = [parentGroup.id];
            const seen = new Set();
            while (queue.length) {
              const id = queue.shift();
              if (seen.has(id)) continue;
              seen.add(id);
              const bn = byId.get(id);
              if (bn?.type === 'group' && bn.boneRole) branch.push(bn);
              for (const ch of proj.nodes) {
                if (ch.parent === id && ch.type === 'group' && ch.boneRole) queue.push(ch.id);
              }
            }

            const pointSegDist = (px,py,ax,ay,bx,by) => {
              const vx=bx-ax, vy=by-ay, wx=px-ax, wy=py-ay;
              const vv=vx*vx+vy*vy;
              let t=vv>1e-6?(wx*vx+wy*vy)/vv:0;
              t=Math.max(0,Math.min(1,t));
              const qx=ax+vx*t, qy=ay+vy*t;
              return Math.hypot(px-qx,py-qy);
            };

            const weightsByBone = new Map(branch.map(b => [b.id, new Array(vertices.length).fill(0)]));
            for (let vi=0; vi<vertices.length; vi++) {
              const v=vertices[vi];
              const scored=[];
              for (const b of branch) {
                const p=b.parent ? byId.get(b.parent) : null;
                const ax=p?.transform?.pivotX ?? b.transform?.pivotX ?? 0;
                const ay=p?.transform?.pivotY ?? b.transform?.pivotY ?? 0;
                const bx=b.transform?.pivotX ?? ax;
                const by=b.transform?.pivotY ?? ay;
                const len=Math.max(18,Math.hypot(bx-ax,by-ay));
                const d=pointSegDist(v.x,v.y,ax,ay,bx,by);
                const sigma=Math.max(18,len*0.55);
                scored.push([b.id,Math.exp(-(d*d)/(2*sigma*sigma))]);
              }
              scored.sort((a,b)=>b[1]-a[1]);
              const top=scored.slice(0,4);
              const sum=top.reduce((acc,x)=>acc+x[1],0)||1;
              for (const [bid,score] of top) weightsByBone.get(bid)[vi]=score/sum;
            }
            node.mesh.skinBones=[...weightsByBone.entries()]
              .map(([id,weights])=>({id,weights}))
              .filter(sb=>sb.weights.some(w=>w>0.001));

            const strongest=node.mesh.skinBones
              .map(sb=>({sb,total:sb.weights.reduce((a,b)=>a+b,0)}))
              .sort((a,b)=>b.total-a.total)[0]?.sb;
            if (strongest) {
              node.mesh.jointBoneId=strongest.id;
              node.mesh.boneWeights=[...strongest.weights];
            }
          }

          // If the pivot is at the default"""
s, n = skin_pat.subn(new_skin, s, count=1)
if n != 1:
    raise SystemExit("[patch_stretchy] required pattern missing: generic skinning")
write("src/components/canvas/CanvasViewport.jsx", s)

# Save/load all multi-bone weights losslessly.
s = read("src/io/projectFile.js")
needle = """        ...(n.mesh.jointBoneId ? { jointBoneId: n.mesh.jointBoneId } : {}),
"""
if needle in s and "skinBones:" not in s:
    s=s.replace(needle, needle + """        ...(n.mesh.skinBones ? { skinBones: n.mesh.skinBones.map(sb => ({ id: sb.id, weights: Array.from(sb.weights ?? []) })) } : {}),
""",1)
write("src/io/projectFile.js", s)

# SkeletonOverlay is copied from the maintained Android/mobile implementation
# after this patch script. Keeping it outside the patcher avoids brittle source
# substitutions while allowing arbitrary hierarchy and smooth touch dragging.
print("[patch_stretchy] OK")
