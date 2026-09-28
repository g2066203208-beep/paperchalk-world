(() => {
  'use strict';

  const POSE_MODEL = './models/pose_landmarker_lite.task';

  const state = {
    stream: null,
    video: null,
    overlay: null,
    running: false,
    raf: 0,
    landmarker: null,
    baseline: null,
    record: false,
    recordStart: 0,
    samples: [],
    lastSampleAt: 0,
    mirror: true,
    latestAnimationId: null,
  };

  function androidStatus(msg) {
    try { AndroidStudio.status(String(msg)); } catch (_) {}
    console.log('[PaperChalk]', msg);
  }
  function toast(msg) {
    try { AndroidStudio.toast(String(msg)); } catch (_) {}
  }

  function normalizeDeg(v) {
    let x = v;
    while (x > 180) x -= 360;
    while (x < -180) x += 360;
    return x;
  }

  function point(lm, idx) {
    const p = lm[idx];
    return { x: state.mirror ? 1 - p.x : p.x, y: p.y, z: p.z ?? 0 };
  }
  function mid(a, b) {
    return { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
  }
  function angle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  }

  function rawPose(lm) {
    const nose = point(lm, 0);
    const lEar = point(lm, 7), rEar = point(lm, 8);
    const lShoulder = point(lm, 11), rShoulder = point(lm, 12);
    const lElbow = point(lm, 13), rElbow = point(lm, 14);
    const lWrist = point(lm, 15), rWrist = point(lm, 16);
    const lHip = point(lm, 23), rHip = point(lm, 24);
    const lKnee = point(lm, 25), rKnee = point(lm, 26);
    const lAnkle = point(lm, 27), rAnkle = point(lm, 28);
    const shoulderMid = mid(lShoulder, rShoulder);
    const hipMid = mid(lHip, rHip);

    const lUpper = angle(lShoulder, lElbow);
    const rUpper = angle(rShoulder, rElbow);
    const lLower = angle(lElbow, lWrist);
    const rLower = angle(rElbow, rWrist);
    const lThigh = angle(lHip, lKnee);
    const rThigh = angle(rHip, rKnee);
    const lShin = angle(lKnee, lAnkle);
    const rShin = angle(rKnee, rAnkle);

    return {
      rotations: {
        torso: angle(hipMid, shoulderMid),
        head: angle(lEar, rEar),
        leftArm: lUpper,
        rightArm: rUpper,
        leftElbow: normalizeDeg(lLower - lUpper),
        rightElbow: normalizeDeg(rLower - rUpper),
        leftLeg: lThigh,
        rightLeg: rThigh,
        leftKnee: normalizeDeg(lShin - lThigh),
        rightKnee: normalizeDeg(rShin - rThigh),
      },
      root: { x: hipMid.x, y: hipMid.y },
      headPoint: nose,
    };
  }

  function getStores() {
    return {
      project: window.__PAPERCHALK_PROJECT_STORE__,
      animation: window.__PAPERCHALK_ANIMATION_STORE__,
    };
  }

  function boneNodes() {
    const stores = getStores();
    const project = stores.project?.getState?.().project;
    if (!project) return {};
    const map = {};
    for (const n of project.nodes ?? []) {
      if (n.type === 'group' && n.boneRole) map[n.boneRole] = n;
    }
    return map;
  }

  function applyPose(pose) {
    const stores = getStores();
    const a = stores.animation;
    const p = stores.project;
    if (!a?.getState || !p?.getState) return false;

    if (!state.baseline) {
      state.baseline = pose;
      toast('面捕基准姿势已建立');
    }

    const nodes = boneNodes();
    const aset = a.getState();
    const b = state.baseline;

    for (const [role, raw] of Object.entries(pose.rotations)) {
      const node = nodes[role];
      const baseRaw = b.rotations[role];
      if (!node || baseRaw == null) continue;
      const delta = normalizeDeg(raw - baseRaw);
      aset.setDraftPose(node.id, { rotation: delta });
    }

    const rootNode = nodes.root;
    if (rootNode) {
      const canvas = p.getState().project.canvas ?? { width: 800, height: 600 };
      const dx = (pose.root.x - b.root.x) * (canvas.width ?? 800) * 0.75;
      const dy = (pose.root.y - b.root.y) * (canvas.height ?? 600) * 0.75;
      aset.setDraftPose(rootNode.id, { x: dx, y: dy });
    }

    return true;
  }

  function snapshotPose(pose, now) {
    if (!state.record) return;
    if (now - state.lastSampleAt < 32) return;
    state.lastSampleAt = now;

    const b = state.baseline;
    if (!b) return;

    const sample = {
      time: Math.max(0, Math.round(now - state.recordStart)),
      rotations: {},
      root: {
        x: pose.root.x - b.root.x,
        y: pose.root.y - b.root.y,
      }
    };
    for (const [role, raw] of Object.entries(pose.rotations)) {
      sample.rotations[role] = normalizeDeg(raw - b.rotations[role]);
    }
    state.samples.push(sample);
  }

  function compressKeyframes(samples, getter, epsilon, maxGapMs = 250) {
    const out = [];
    let lastValue = null;
    let lastTime = -Infinity;
    for (const s of samples) {
      const value = getter(s);
      if (value == null || Number.isNaN(value)) continue;
      if (lastValue == null || Math.abs(value - lastValue) >= epsilon || s.time - lastTime >= maxGapMs) {
        out.push({ time: s.time, value, easing: 'linear' });
        lastValue = value;
        lastTime = s.time;
      }
    }
    if (samples.length) {
      const s = samples[samples.length - 1];
      const value = getter(s);
      if (value != null && !Number.isNaN(value) && (!out.length || out[out.length - 1].time !== s.time)) {
        out.push({ time: s.time, value, easing: 'linear' });
      }
    }
    return out;
  }

  function commitRecording() {
    if (!state.samples.length) {
      toast('没有捕获到动作');
      return;
    }
    const stores = getStores();
    const ps = stores.project;
    const as = stores.animation;
    if (!ps?.getState || !as?.getState) {
      toast('工作室状态尚未就绪');
      return;
    }

    const pstate = ps.getState();
    const nodes = {};
    for (const n of pstate.project.nodes ?? []) {
      if (n.type === 'group' && n.boneRole) nodes[n.boneRole] = n;
    }

    pstate.createAnimation('Mocap ' + new Date().toLocaleTimeString());
    let project = ps.getState().project;
    const anim = project.animations[project.animations.length - 1];
    if (!anim) return;

    const duration = Math.max(1, state.samples[state.samples.length - 1].time);
    ps.getState().updateProject((proj) => {
      const target = proj.animations.find(a => a.id === anim.id);
      if (!target) return;
      target.duration = duration;
      target.fps = 30;
      target.tracks = target.tracks ?? [];

      for (const role of Object.keys(state.samples[0].rotations)) {
        const node = nodes[role];
        if (!node) continue;
        const keyframes = compressKeyframes(state.samples, s => s.rotations[role], 0.25);
        target.tracks.push({ nodeId: node.id, property: 'rotation', keyframes });
      }

      const rootNode = nodes.root;
      if (rootNode) {
        const canvas = proj.canvas ?? { width: 800, height: 600 };
        const sx = (canvas.width ?? 800) * 0.75;
        const sy = (canvas.height ?? 600) * 0.75;
        target.tracks.push({
          nodeId: rootNode.id,
          property: 'x',
          keyframes: compressKeyframes(state.samples, s => s.root.x * sx, 0.5)
        });
        target.tracks.push({
          nodeId: rootNode.id,
          property: 'y',
          keyframes: compressKeyframes(state.samples, s => s.root.y * sy, 0.5)
        });
      }
    });

    project = ps.getState().project;
    const committed = project.animations.find(a => a.id === anim.id);
    if (committed) {
      state.latestAnimationId = committed.id;
      as.getState().switchAnimation(committed);
      as.getState().setActiveAnimationId(committed.id);
    }
    toast('动作已写入时间轴：' + Math.round(duration / 100) / 10 + ' 秒');
    androidStatus('动作录制完成，已生成时间轴动画。关键帧：' +
      (committed?.tracks?.reduce((n,t)=>n+(t.keyframes?.length||0),0) ?? 0));
  }

  function jsonSafeValue(value) {
    if (value == null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
    if (ArrayBuffer.isView(value)) return Array.from(value);
    if (Array.isArray(value)) return value.map(jsonSafeValue);
    if (typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) out[k] = jsonSafeValue(v);
      return out;
    }
    return null;
  }

  function portableMotionFromCurrent() {
    const stores = getStores();
    const ps = stores.project;
    const as = stores.animation;
    if (!ps?.getState) throw new Error('project-store-unavailable');

    const project = ps.getState().project;
    const animations = project.animations ?? [];
    const activeId = as?.getState?.().activeAnimationId ?? state.latestAnimationId;
    const anim = animations.find(a => a.id === activeId) ||
      animations.find(a => a.id === state.latestAnimationId) ||
      animations[animations.length - 1];
    if (!anim) throw new Error('no-animation');

    const byId = new Map((project.nodes ?? []).map(n => [n.id, n]));
    const bones = (project.nodes ?? [])
      .filter(n => n.type === 'group' && n.boneRole)
      .map(n => {
        const parent = n.parent ? byId.get(n.parent) : null;
        return {
          name: n.boneRole,
          sourceNode: n.name ?? n.id,
          parent: parent?.boneRole ?? null,
          rest: {
            x: Number(n.transform?.x ?? 0),
            y: Number(n.transform?.y ?? 0),
            rotation: Number(n.transform?.rotation ?? 0),
            scaleX: Number(n.transform?.scaleX ?? 1),
            scaleY: Number(n.transform?.scaleY ?? 1),
            pivotX: Number(n.transform?.pivotX ?? 0),
            pivotY: Number(n.transform?.pivotY ?? 0),
          }
        };
      });

    const tracks = (anim.tracks ?? []).map(track => {
      const node = byId.get(track.nodeId);
      return {
        target: node?.boneRole ?? node?.name ?? track.nodeId,
        targetType: node?.boneRole ? 'bone' : (node?.type ?? 'node'),
        sourceNodeId: track.nodeId,
        property: track.property,
        keyframes: (track.keyframes ?? []).map(k => ({
          timeMs: Number(k.time ?? 0),
          value: jsonSafeValue(k.value),
          easing: k.easing ?? 'linear'
        }))
      };
    });

    return {
      schema: 'paperchalk.motion.v1',
      kind: '2d-skeletal-animation',
      name: anim.name ?? 'Animation',
      fps: Number(anim.fps ?? 30),
      durationMs: Number(anim.duration ?? 0),
      coordinateSystem: {
        axes: 'x-right,y-down',
        rotation: 'degrees',
        rotationAxis: '+z',
        units: 'authoring-pixels'
      },
      retargeting: {
        key: 'bone-role',
        note: 'Match tracks by stable bone role names; source node IDs are informational only.'
      },
      bones,
      tracks,
      metadata: {
        exportedAt: new Date().toISOString(),
        producer: 'PaperChalk SpineStudio',
        version: 1
      }
    };
  }

  function bytesToBase64(bytes) {
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    }
    return btoa(binary);
  }

  function safeFileStem(name) {
    return String(name || 'motion')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 80) || 'motion';
  }

  function motionToGltf(motion) {
    const boneIndex = new Map(motion.bones.map((b, i) => [b.name, i]));
    const nodes = motion.bones.map(b => {
      const r = Number(b.rest?.rotation ?? 0) * Math.PI / 180;
      return {
        name: b.name,
        translation: [Number(b.rest?.x ?? 0), -Number(b.rest?.y ?? 0), 0],
        rotation: [0, 0, Math.sin(r / 2), Math.cos(r / 2)],
        scale: [Number(b.rest?.scaleX ?? 1), Number(b.rest?.scaleY ?? 1), 1],
        extras: { boneRole: b.name, sourceNode: b.sourceNode ?? null }
      };
    });

    const roots = [];
    motion.bones.forEach((b, i) => {
      if (b.parent && boneIndex.has(b.parent)) {
        const p = nodes[boneIndex.get(b.parent)];
        (p.children ??= []).push(i);
      } else roots.push(i);
    });

    const chunks = [];
    const bufferViews = [];
    const accessors = [];
    let byteLength = 0;

    function pad4() {
      const pad = (4 - (byteLength % 4)) % 4;
      if (pad) {
        chunks.push(new Uint8Array(pad));
        byteLength += pad;
      }
    }

    function addFloatAccessor(values, type, count, includeMinMax = false) {
      pad4();
      const arr = Array.from(values, Number);
      const bytes = new Uint8Array(arr.length * 4);
      const dv = new DataView(bytes.buffer);
      for (let i = 0; i < arr.length; i++) dv.setFloat32(i * 4, arr[i], true);
      const viewIndex = bufferViews.length;
      bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.byteLength });
      chunks.push(bytes);
      byteLength += bytes.byteLength;

      const accessor = { bufferView: viewIndex, componentType: 5126, count, type };
      if (includeMinMax && arr.length) {
        accessor.min = [Math.min(...arr)];
        accessor.max = [Math.max(...arr)];
      }
      const accessorIndex = accessors.length;
      accessors.push(accessor);
      return accessorIndex;
    }

    const tracksByBone = new Map();
    for (const track of motion.tracks) {
      if (track.targetType !== 'bone' || !boneIndex.has(track.target)) continue;
      let obj = tracksByBone.get(track.target);
      if (!obj) tracksByBone.set(track.target, obj = {});
      obj[track.property] = track;
    }

    const samplers = [];
    const channels = [];

    function addChannel(nodeIndex, path, timesMs, values, gltfType, components) {
      if (!timesMs.length) return;
      const timesSec = timesMs.map(t => Number(t) / 1000);
      const input = addFloatAccessor(timesSec, 'SCALAR', timesSec.length, true);
      const output = addFloatAccessor(values, gltfType, timesSec.length, false);
      const samplerIndex = samplers.length;
      samplers.push({ input, output, interpolation: 'LINEAR' });
      channels.push({ sampler: samplerIndex, target: { node: nodeIndex, path } });
    }

    for (const [boneName, set] of tracksByBone) {
      const nodeIndex = boneIndex.get(boneName);

      if (set.rotation?.keyframes?.length) {
        const times = set.rotation.keyframes.map(k => k.timeMs);
        const values = [];
        for (const k of set.rotation.keyframes) {
          const rad = Number(k.value ?? 0) * Math.PI / 180;
          values.push(0, 0, Math.sin(rad / 2), Math.cos(rad / 2));
        }
        addChannel(nodeIndex, 'rotation', times, values, 'VEC4', 4);
      }

      if (set.x?.keyframes?.length || set.y?.keyframes?.length) {
        const times = [...new Set([
          ...(set.x?.keyframes ?? []).map(k => Number(k.timeMs)),
          ...(set.y?.keyframes ?? []).map(k => Number(k.timeMs))
        ])].sort((a,b) => a-b);
        const values = [];
        const bone = motion.bones[nodeIndex];
        for (const t of times) {
          const x = set.x ? Number(sampleKeyframes(set.x.keyframes, t) ?? 0) : Number(bone.rest?.x ?? 0);
          const y = set.y ? Number(sampleKeyframes(set.y.keyframes, t) ?? 0) : Number(bone.rest?.y ?? 0);
          values.push(x, -y, 0);
        }
        addChannel(nodeIndex, 'translation', times, values, 'VEC3', 3);
      }

      if (set.scaleX?.keyframes?.length || set.scaleY?.keyframes?.length) {
        const times = [...new Set([
          ...(set.scaleX?.keyframes ?? []).map(k => Number(k.timeMs)),
          ...(set.scaleY?.keyframes ?? []).map(k => Number(k.timeMs))
        ])].sort((a,b) => a-b);
        const values = [];
        const bone = motion.bones[nodeIndex];
        for (const t of times) {
          const sx = set.scaleX ? Number(sampleKeyframes(set.scaleX.keyframes, t) ?? 1) : Number(bone.rest?.scaleX ?? 1);
          const sy = set.scaleY ? Number(sampleKeyframes(set.scaleY.keyframes, t) ?? 1) : Number(bone.rest?.scaleY ?? 1);
          values.push(sx, sy, 1);
        }
        addChannel(nodeIndex, 'scale', times, values, 'VEC3', 3);
      }
    }

    const all = new Uint8Array(byteLength);
    let cursor = 0;
    for (const chunk of chunks) {
      all.set(chunk, cursor);
      cursor += chunk.byteLength;
    }

    const binaryUri = 'data:application/octet-stream;base64,' + bytesToBase64(all);
    return {
      asset: {
        version: '2.0',
        generator: 'PaperChalk SpineStudio',
        extras: {
          note: 'Motion-only glTF skeleton. Mesh deformation/custom 2D node tracks remain in the companion .pcmotion.json file.',
          sourceSchema: motion.schema
        }
      },
      scene: 0,
      scenes: [{ name: motion.name, nodes: roots }],
      nodes,
      animations: [{
        name: motion.name,
        samplers,
        channels,
        extras: { fps: motion.fps, durationMs: motion.durationMs }
      }],
      buffers: [{ byteLength, uri: binaryUri }],
      bufferViews,
      accessors
    };
  }

  async function streamTextFile(filename, text) {
    const bytes = new TextEncoder().encode(text);
    if (!AndroidStudio.beginMotionFile(filename)) throw new Error('android-output-open-failed');
    const chunkSize = 96 * 1024;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      AndroidStudio.appendMotionChunk(bytesToBase64(bytes.subarray(i, Math.min(bytes.length, i + chunkSize))));
      if ((i / chunkSize) % 8 === 0) await new Promise(r => setTimeout(r, 0));
    }
    AndroidStudio.endMotionFile();
  }

  async function exportPortableMotion() {
    const motion = portableMotionFromCurrent();
    const stem = safeFileStem(motion.name);
    const nativeName = stem + '.pcmotion.json';
    const gltfName = stem + '.gltf';

    await streamTextFile(nativeName, JSON.stringify(motion));
    const gltf = motionToGltf(motion);
    await streamTextFile(gltfName, JSON.stringify(gltf));

    toast('动作已保存：' + nativeName + ' + ' + gltfName);
    androidStatus('动作已导出两个版本：PaperChalk直接运行格式 + glTF 2.0通用骨骼动作');
    return nativeName + ' + ' + gltfName;
  }

  async function ensureMediaPipe() {
    if (state.landmarker) return state.landmarker;
    androidStatus('正在加载本地 MediaPipe Pose Landmarker…');
    const mp = window.__PAPERCHALK_MEDIAPIPE__;
    if (!mp?.FilesetResolver || !mp?.PoseLandmarker) {
      throw new Error('本地 MediaPipe 模块未打包');
    }
    const vision = await mp.FilesetResolver.forVisionTasks('./mediapipe');
    state.landmarker = await mp.PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    return state.landmarker;
  }

  function ensureCameraOverlay() {
    if (state.overlay) return;
    const wrap = document.createElement('div');
    wrap.id = 'paperchalk-camera-wrap';
    Object.assign(wrap.style, {
      position: 'fixed', right: '12px', top: '64px', width: '240px', height: '180px',
      zIndex: '2147483646', border: '1px solid rgba(255,255,255,.35)',
      borderRadius: '10px', overflow: 'hidden', background: '#111',
      boxShadow: '0 4px 20px rgba(0,0,0,.35)'
    });
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    Object.assign(video.style, {
      width: '100%', height: '100%', objectFit: 'cover',
      transform: state.mirror ? 'scaleX(-1)' : 'none'
    });
    const badge = document.createElement('div');
    badge.textContent = 'PaperChalk Mocap';
    Object.assign(badge.style, {
      position: 'absolute', left: '6px', bottom: '5px', padding: '2px 6px',
      color: 'white', background: 'rgba(0,0,0,.55)', borderRadius: '5px',
      font: '11px sans-serif'
    });
    wrap.appendChild(video);
    wrap.appendChild(badge);
    document.body.appendChild(wrap);
    state.overlay = wrap;
    state.video = video;
  }

  async function startMocap() {
    if (state.running) return true;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前 WebView 不支持摄像头媒体接口');
    ensureCameraOverlay();
    const landmarker = await ensureMediaPipe();
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    state.video.srcObject = state.stream;
    await state.video.play();
    state.running = true;
    state.baseline = null;
    androidStatus('摄像头面捕运行中：身体骨骼实时驱动 Stretchy 骨架');

    const loop = () => {
      if (!state.running) return;
      const now = performance.now();
      try {
        if (state.video.readyState >= 2) {
          const result = landmarker.detectForVideo(state.video, now);
          if (result?.landmarks?.length) {
            const pose = rawPose(result.landmarks[0]);
            applyPose(pose);
            snapshotPose(pose, now);
          }
        }
      } catch (e) {
        console.warn('[PaperChalk mocap frame]', e);
      }
      state.raf = requestAnimationFrame(loop);
    };
    state.raf = requestAnimationFrame(loop);
    return true;
  }

  function stopMocap() {
    state.running = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (state.stream) {
      for (const t of state.stream.getTracks()) t.stop();
      state.stream = null;
    }
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
      state.video = null;
    }
    const stores = getStores();
    try { stores.animation?.getState?.().clearDraftPose(); } catch (_) {}
    androidStatus('摄像头面捕已停止');
  }

  window.PaperChalkMocap = {
    async toggle() {
      try {
        if (state.running) stopMocap();
        else await startMocap();
        return state.running ? 'mocap-on' : 'mocap-off';
      } catch (e) {
        toast('面捕启动失败：' + e.message);
        androidStatus('面捕错误：' + e.message);
        return 'error';
      }
    },
    async toggleRecord() {
      if (!state.record) {
        try {
          if (!state.running) await startMocap();
          state.samples = [];
          state.recordStart = performance.now();
          state.lastSampleAt = 0;
          state.record = true;
          toast('开始录制动作（不设软件时长上限）');
          androidStatus('动作录制中…');
          return 'recording';
        } catch (e) {
          toast('无法开始录制：' + e.message);
          return 'error';
        }
      } else {
        state.record = false;
        commitRecording();
        return 'saved-to-timeline';
      }
    },
    async exportCurrentMotion() {
      try {
        return await exportPortableMotion();
      } catch (e) {
        toast('保存动作失败：' + e.message);
        androidStatus('保存动作失败：' + e.message);
        return 'error';
      }
    },
    recalibrate() {
      state.baseline = null;
      toast('下一帧将重新标定基准姿势');
    },
    shutdown() {
      if (state.record) {
        state.record = false;
        commitRecording();
      }
      stopMocap();
      try { state.landmarker?.close?.(); } catch (_) {}
      state.landmarker = null;
    }
  };

  const recorder = {
    mediaRecorder: null,
    stream: null,
    queue: Promise.resolve(),
    mime: '',
    active: false,

    findCanvas() {
      const canvases = [...document.querySelectorAll('canvas')];
      return canvases.sort((a,b) => (b.width*b.height)-(a.width*a.height))[0] || null;
    },

    toBase64(arrayBuffer) {
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      const step = 0x8000;
      for (let i = 0; i < bytes.length; i += step) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
      }
      return btoa(binary);
    },

    async sendBlob(blob) {
      if (!blob || blob.size === 0) return;
      const ab = await blob.arrayBuffer();
      AndroidStudio.appendVideoChunk(this.toBase64(ab));
    },

    async start() {
      if (this.active) return 'already-recording';
      const canvas = this.findCanvas();
      if (!canvas || !canvas.captureStream) {
        toast('当前渲染画布不支持直接视频采集');
        return 'no-canvas';
      }
      const candidates = [
        'video/mp4;codecs=avc1.42E01E',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      this.mime = candidates.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
      if (!window.MediaRecorder) {
        toast('当前 WebView 不支持 MediaRecorder');
        return 'unsupported';
      }

      this.stream = canvas.captureStream(30);
      const opts = this.mime ? { mimeType: this.mime, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 };
      this.mediaRecorder = new MediaRecorder(this.stream, opts);
      const actualMime = this.mediaRecorder.mimeType || this.mime || 'video/webm';
      if (!AndroidStudio.beginVideo(actualMime)) {
        toast('Android 无法创建视频输出');
        return 'output-error';
      }

      this.queue = Promise.resolve();
      this.mediaRecorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) {
          this.queue = this.queue.then(() => this.sendBlob(ev.data)).catch(err => console.error(err));
        }
      };
      this.mediaRecorder.onstop = () => {
        this.queue.then(() => {
          AndroidStudio.endVideo();
          if (this.stream) this.stream.getTracks().forEach(t => t.stop());
          this.stream = null;
          this.mediaRecorder = null;
          this.active = false;
        });
      };
      this.mediaRecorder.start(1000);
      this.active = true;
      toast('开始导出画布视频；录制数据持续写盘，不在内存累计');
      return 'video-recording';
    },

    stop() {
      if (!this.active || !this.mediaRecorder) return 'not-recording';
      try { this.mediaRecorder.requestData(); } catch (_) {}
      this.mediaRecorder.stop();
      return 'stopping';
    }
  };

  window.PaperChalkRecorder = recorder;
  androidStatus('PaperChalk 全离线扩展已就绪：PSD / 自动绑定 / 面捕 / 动作录制 / 视频导出');
})();

/* PAPERCHALK_MOBILE_V3
 * Phone/tablet interaction layer: Chinese UI translation, pane switching,
 * one-finger pan, two-finger pinch/pan, double-tap fit.
 */
(() => {
  'use strict';

  const ZH = new Map([
    ['Stretchy Studio','PaperChalk 动画工作室'],
    ['Layers','图层'], ['LAYERS','图层'], ['Draw Order','绘制顺序'], ['DRAW ORDER','绘制顺序'],
    ['Inspector','属性'], ['INSPECTOR','属性'], ['Parameters','参数'], ['PARAMETERS','参数'],
    ['Armature','骨骼'], ['ARMATURE','骨骼'], ['Animations','动画'], ['ANIMATIONS','动画'],
    ['Timeline','时间轴'], ['TIMELINE','时间轴'], ['Staging','布局'], ['Animation','动画'],
    ['New project','新建工程'], ['Save project','保存工程'], ['Load project','打开工程'],
    ['Export frames','导出帧'], ['Canvas Properties','画布设置'], ['Preferences','设置'],
    ['Adjust Joints','调整骨骼'], ['Drag yellow dots to reposition joints.','拖动关节端点调整骨骼位置。'],
    ['Step 2: Reorder Layers','第2步：调整图层顺序'],
    ['Rearrange layers in the Layer Panel as needed to fix any ordering issues.','在图层面板中拖动图层，修正前后遮挡顺序。'],
    ['Step 3: Adjust Joints','第3步：调整骨骼'],
    ['Mesh all parts','为全部部件生成网格'], ['AI Auto-Rig (DWPose)','离线 AI 自动绑骨（DWPose）'],
    ['Next: Adjust Joints →','下一步：调整骨骼 →'], ['Next: Setup Parameters →','下一步：设置参数 →'],
    ['Load DWPose model','内置 DWPose 自动绑骨'],
    ['Download or upload the ~50 MB DWPose ONNX model for high-accuracy pose detection.','使用 APK 内置 DWPose ONNX 模型进行高精度姿态检测，无需联网。'],
    ['Status:','状态：'], ['Not loaded','未加载'], ['Loaded ✓','已加载 ✓'], ['Load Model','模型'],
    ['Load .onnx file','选择本地 .onnx'], ['Download','使用内置模型'], ['Working…','处理中…'],
    ['← Back','← 返回'], ['Back','返回'], ['Cancel','取消'], ['Cancel Import','取消导入'],
    ['Continue →','继续 →'], ['Skip rigging','跳过绑骨'], ['Skip','跳过'], ['Done →','完成 →'],
    ['Review Layer Mapping','检查图层识别'], ['Split merged parts (recommended)','拆分合并部件（推荐）'],
    ['Mesh all parts after import','导入后为所有部件生成网格'],
    ['Step 4: Live2D Parameters','第4步：变形参数'], ['Idle preview playing','正在预览待机动作'],
    ['Generating…','正在生成…'], ['Face','脸部'], ['Eye','眼睛'], ['Eyeball','眼球'],
    ['Brow','眉毛'], ['Mouth','嘴部'], ['Body','身体'], ['Hair','头发'], ['Other','其他'],
    ['Group','组'], ['Warp','网格变形'], ['Visible','可见'], ['Opacity','透明度'],
    ['Position','位置'], ['Rotation','旋转'], ['Scale','缩放'], ['Mesh','网格'],
    ['Remesh','重新网格化'], ['Delete Mesh','删除网格'], ['Edit Mesh','编辑网格'],
    ['Show Skeleton','显示骨骼'], ['Hide Skeleton','隐藏骨骼'], ['Edit Joints','编辑关节'],
    ['Auto Keyframe','自动关键帧'], ['Play','播放'], ['Pause','暂停'], ['Loop','循环'],
    ['Add Animation','新建动画'], ['Delete','删除'], ['Rename','重命名'], ['Duration','时长'],
    ['FPS','帧率'], ['Save','保存'], ['Load','打开'], ['Export','导出'],
    ['Project','工程'], ['Library','工程库'], ['Settings','设置'],
    ['Drop or','拖放或'], ['click','点击'], ['to upload a','上传'],
    ['Character rigging and animation in seconds.','导入角色素材后即可绑骨、变形和制作动画。'],
    ["Don't have a layered PSD?",'没有分层 PSD？'],
    ['LAYER-IFY YOUR IMAGE','单图自动分层'], ['Offline mode','离线模式'],
    ['Wipe current project?','清空当前工程？'], ['Wipe & Load','清空并载入'],
    ['Replace current project?','替换当前工程？'], ['Replace Workspace','替换工作区'],
    ['Store imported project in Library?','将导入工程保存到本地工程库？'],
    ['Save to Library','保存到工程库'], ['Iris Offset','眼球偏移'],
    ['Scroll to zoom · Alt+drag to pan','手机：单指拖动画布 · 双指缩放/平移'],
    ['Limb mesh required','需要肢体网格'],
    ['No animation','无动画']
  ]);

  function trTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const raw = node.nodeValue;
    const t = raw.trim();
    if (!t) return;
    const z = ZH.get(t);
    if (z) node.nodeValue = raw.replace(t, z);
  }

  function translate(root = document.body) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(trTextNode);
    const attrs = ['title','placeholder','aria-label'];
    root.querySelectorAll?.('*').forEach(el => {
      for (const a of attrs) {
        const v = el.getAttribute(a);
        if (v && ZH.has(v)) el.setAttribute(a, ZH.get(v));
      }
    });
  }

  function stores() {
    return {
      editor: window.__PAPERCHALK_EDITOR_STORE__,
      project: window.__PAPERCHALK_PROJECT_STORE__,
      animation: window.__PAPERCHALK_ANIMATION_STORE__,
    };
  }

  function mainCanvas() {
    const cs = [...document.querySelectorAll('canvas')];
    return cs.sort((a,b) => (b.clientWidth*b.clientHeight)-(a.clientWidth*a.clientHeight))[0] || null;
  }

  function fitCanvas() {
    const { editor, project } = stores();
    const canvas = mainCanvas();
    const ps = project?.getState?.().project;
    if (!editor?.getState || !canvas || !ps?.canvas) return 'not-ready';
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Number(ps.canvas.width || 1));
    const h = Math.max(1, Number(ps.canvas.height || 1));
    const pad = 24;
    const zoom = Math.max(0.05, Math.min(20,
      Math.min(Math.max(1, rect.width-pad*2)/w, Math.max(1, rect.height-pad*2)/h)
    ));
    editor.getState().setView({
      zoom,
      panX: (rect.width - w*zoom)/2,
      panY: (rect.height - h*zoom)/2
    });
    return 'fit';
  }

  function classifyPanels() {
    const groups = [...document.querySelectorAll('[data-panel-group-direction="horizontal"]')];
    const main = groups.find(g => g.querySelector('canvas'));
    if (!main) return;
    main.classList.add('pc-main-panels');
    const panels = [...main.children].filter(el => el.hasAttribute?.('data-panel'));
    for (const p of panels) {
      p.classList.remove('pc-panel-layers','pc-panel-canvas','pc-panel-inspector');
      if (p.querySelector('canvas')) p.classList.add('pc-panel-canvas');
      else {
        const tx = (p.textContent || '').toLowerCase();
        if (tx.includes('layers') || tx.includes('图层') || tx.includes('draw order') || tx.includes('绘制顺序')) {
          p.classList.add('pc-panel-layers');
        } else {
          p.classList.add('pc-panel-inspector');
        }
      }
    }
    [...main.children].filter(el => el.hasAttribute?.('data-panel-resize-handle-enabled'))
      .forEach(el => el.classList.add('pc-panel-handle'));
  }

  function setPane(pane) {
    classifyPanels();
    document.documentElement.dataset.pcMobilePane = pane;
    setTimeout(classifyPanels, 50);
    return pane;
  }

  function setMode(mode) {
    const { editor, project, animation } = stores();
    if (!editor?.getState) return 'not-ready';
    if (mode === 'animation') {
      try { animation?.getState?.().captureRestPose(project?.getState?.().project?.nodes || []); } catch (_) {}
    }
    editor.getState().setEditorMode(mode);
    setPane('canvas');
    return mode;
  }

  const gesture = {
    one: null,
    pinch: null,
    lastTap: 0,
  };

  function canvasTarget(target) {
    const c = mainCanvas();
    if (!c) return null;
    if (target === c) return c;
    return target?.closest?.('canvas') === c ? c : null;
  }

  function centerOf(t0,t1) {
    return { x:(t0.clientX+t1.clientX)/2, y:(t0.clientY+t1.clientY)/2 };
  }
  function distance(t0,t1) {
    return Math.hypot(t0.clientX-t1.clientX,t0.clientY-t1.clientY);
  }

  function onTouchStart(e) {
    const { editor } = stores();
    if (!editor?.getState) return;
    const canvas = mainCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touches = e.touches;
    if (touches.length >= 2) {
      const a = touches[0], b = touches[1];
      const ctr = centerOf(a,b);
      const st = editor.getState();
      const v = st.view;
      gesture.pinch = {
        dist: Math.max(1, distance(a,b)),
        cx0: ctr.x - rect.left,
        cy0: ctr.y - rect.top,
        zoom0: v.zoom,
        panX0: v.panX,
        panY0: v.panY,
        worldX: ((ctr.x-rect.left)-v.panX)/v.zoom,
        worldY: ((ctr.y-rect.top)-v.panY)/v.zoom,
      };
      gesture.one = null;
      e.preventDefault();
      return;
    }
    if (touches.length === 1 && canvasTarget(e.target)) {
      const st = editor.getState();
      const t = touches[0];
      gesture.one = {
        x0:t.clientX, y0:t.clientY,
        panX0:st.view.panX, panY0:st.view.panY,
        moved:false,
        start:performance.now()
      };
    }
  }

  function onTouchMove(e) {
    const { editor } = stores();
    if (!editor?.getState) return;
    const canvas = mainCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touches = e.touches;

    if (touches.length >= 2 && gesture.pinch) {
      const a=touches[0], b=touches[1], ctr=centerOf(a,b);
      const p=gesture.pinch;
      const factor=distance(a,b)/p.dist;
      const zoom=Math.max(0.05,Math.min(20,p.zoom0*factor));
      const cx=ctr.x-rect.left, cy=ctr.y-rect.top;
      editor.getState().setView({
        zoom,
        panX: cx - p.worldX*zoom,
        panY: cy - p.worldY*zoom,
      });
      e.preventDefault();
      return;
    }

    if (touches.length === 1 && gesture.one) {
      const st = editor.getState();
      // In mesh/deformation editing, one finger belongs to the actual editor
      // tool. Outside mesh editing it is a direct canvas pan gesture.
      if (st.meshEditMode || st.blendShapeEditMode) return;
      const t=touches[0], g=gesture.one;
      const dx=t.clientX-g.x0, dy=t.clientY-g.y0;
      if (Math.hypot(dx,dy)>5) g.moved=true;
      editor.getState().setView({panX:g.panX0+dx,panY:g.panY0+dy});
      e.preventDefault();
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2) gesture.pinch = null;
    if (e.touches.length === 0 && gesture.one) {
      const g=gesture.one;
      const now=performance.now();
      if (!g.moved && now-g.start<280) {
        if (now-gesture.lastTap<320) {
          fitCanvas();
          gesture.lastTap=0;
        } else gesture.lastTap=now;
      }
      gesture.one=null;
    }
  }

  document.addEventListener('touchstart', onTouchStart, {capture:true, passive:false});
  document.addEventListener('touchmove', onTouchMove, {capture:true, passive:false});
  document.addEventListener('touchend', onTouchEnd, {capture:true, passive:false});
  document.addEventListener('touchcancel', onTouchEnd, {capture:true, passive:false});

  const observer = new MutationObserver(() => {
    translate(document.body);
    classifyPanels();
  });
  observer.observe(document.documentElement, {subtree:true, childList:true});
  translate(document.body);
  classifyPanels();
  setPane('canvas');

  window.PaperChalkMobile = {
    setPane, fit:fitCanvas, setMode,
    translate:() => translate(document.body),
    getView:() => stores().editor?.getState?.().view || null
  };

  try { AndroidStudio.status('手机模式已启用：单指拖动 · 双指缩放/平移 · 双击适应 · 中文界面'); } catch (_) {}
})();
