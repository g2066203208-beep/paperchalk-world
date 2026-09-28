#!/usr/bin/env python3
from pathlib import Path
import sys

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

# Professional armature: render tapered bone bodies between joints (a real
# bone chain visual), joint heads, and generous invisible touch hit targets.
s = read("src/components/canvas/SkeletonOverlay.jsx")
s = must_replace(
    s,
    "const LINE_COLOUR   = 'rgba(34,211,238,0.55)';",
    """const LINE_COLOUR   = 'rgba(34,211,238,0.72)';
const BONE_FILL_EDIT = 'rgba(250,204,21,0.30)';
const BONE_FILL_NORMAL = 'rgba(34,211,238,0.22)';
const BONE_STROKE_EDIT = 'rgba(250,204,21,0.95)';
const BONE_STROKE_NORMAL = 'rgba(34,211,238,0.90)';
const ROLE_ZH = {
  root:'骨盆/根', torso:'躯干', neck:'颈部', head:'头部', eyes:'眼睛',
  leftArm:'左上臂', rightArm:'右上臂', leftElbow:'左前臂', rightElbow:'右前臂', bothArms:'双臂',
  leftLeg:'左大腿', rightLeg:'右大腿', leftKnee:'左小腿', rightKnee:'右小腿', bothLegs:'双腿'
};""",
    "bone palette"
)

old_lines = """  const lines = [];
  for (const [fromRole, toRole] of SKELETON_CONNECTIONS) {
    const from = boneNodes[fromRole];
    const to   = boneNodes[toRole];
    if (!from || !to) continue;
    const [x1, y1] = pivotScreenPos(from);
    const [x2, y2] = pivotScreenPos(to);
    lines.push(
      <line key={`${fromRole}-${toRole}`}
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={LINE_COLOUR} strokeWidth={skeletonEditMode ? 2 : 1.5}
        strokeLinecap="round" pointerEvents="none"
      />
    );
  }
"""
new_lines = """  const boneShapes = [];
  for (const [fromRole, toRole] of SKELETON_CONNECTIONS) {
    const from = boneNodes[fromRole];
    const to   = boneNodes[toRole];
    if (!from || !to) continue;
    const [x1, y1] = pivotScreenPos(from);
    const [x2, y2] = pivotScreenPos(to);
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const px = -dy / len, py = dx / len;
    const baseW = Math.max(6, Math.min(12, len * 0.10));
    const neckW = Math.max(3, baseW * 0.34);
    const shoulderX = x1 + dx * 0.22, shoulderY = y1 + dy * 0.22;
    const tipInset = Math.min(0.08, 8 / len);
    const tipX = x2 - dx * tipInset, tipY = y2 - dy * tipInset;
    const points = [
      `${x1 + px*neckW},${y1 + py*neckW}`,
      `${shoulderX + px*baseW},${shoulderY + py*baseW}`,
      `${tipX + px*2.4},${tipY + py*2.4}`,
      `${x2},${y2}`,
      `${tipX - px*2.4},${tipY - py*2.4}`,
      `${shoulderX - px*baseW},${shoulderY - py*baseW}`,
      `${x1 - px*neckW},${y1 - py*neckW}`,
    ].join(' ');
    boneShapes.push(
      <g key={`bone-${fromRole}-${toRole}`} pointerEvents="none">
        <polygon points={points}
          fill={skeletonEditMode ? BONE_FILL_EDIT : BONE_FILL_NORMAL}
          stroke={skeletonEditMode ? BONE_STROKE_EDIT : BONE_STROKE_NORMAL}
          strokeWidth={1.5} strokeLinejoin="round" />
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={LINE_COLOUR} strokeWidth={1} strokeLinecap="round" />
      </g>
    );
  }
"""
s = must_replace(s, old_lines, new_lines, "bone segment rendering")

old_circle = """      <circle key={role}
        cx={cx} cy={cy} r={radius}
        fill={fill} stroke="#000" strokeWidth={1.5}
        style={{ cursor: skeletonEditMode ? 'grab' : 'pointer', pointerEvents: 'auto' }}
        onPointerDown={(e) => onPointerDown(e, node.id, 'joint')}
        onClick={() => !skeletonEditMode && setSelection([node.id])}
      />"""
new_circle = """      <g key={role}>
        <circle cx={cx} cy={cy} r={Math.max(20, radius + 11)}
          fill="transparent"
          style={{ cursor: skeletonEditMode ? 'grab' : 'pointer', pointerEvents: 'auto', touchAction: 'none' }}
          onPointerDown={(e) => onPointerDown(e, node.id, 'joint')}
          onClick={() => !skeletonEditMode && setSelection([node.id])}
        />
        <circle cx={cx} cy={cy} r={radius}
          fill={fill} stroke="#111827" strokeWidth={2} pointerEvents="none" />
        <circle cx={cx} cy={cy} r={Math.max(1.8, radius*0.28)}
          fill="#111827" opacity={0.72} pointerEvents="none" />
      </g>"""
s = must_replace(s, old_circle, new_circle, "touch joint heads")
s = s.replace("{role}\n          </text>", "{ROLE_ZH[role] ?? role}\n          </text>")
s = s.replace("{arcs}\n        {lines}", "{arcs}\n        {boneShapes}")
s = s.replace(">Adjust Joints</span>", ">调整骨骼</span>")
s = s.replace("Drag yellow dots to reposition joints.", "拖动关节端点调整骨骼位置；骨骼实体表示父子骨段。")
s = s.replace(">Iris Offset</text>", ">眼球偏移</text>")
write("src/components/canvas/SkeletonOverlay.jsx", s)

print("[patch_stretchy] OK")
