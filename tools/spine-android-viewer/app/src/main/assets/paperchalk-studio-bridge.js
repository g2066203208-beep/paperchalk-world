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


/* PAPERCHALK_BONE_MANAGER_V1
 * Arbitrary editable bone hierarchy for mobile:
 * add/remove/reparent/rename bones, quick chains for hair/fingers/toes/accessories,
 * and bind a selected meshed layer to any selected bone.
 */
(() => {
  'use strict';

  const state = {
    selectedBoneId: null,
    rememberedPartId: null,
    overlay: null,
  };

  function ps() { return window.__PAPERCHALK_PROJECT_STORE__; }
  function es() { return window.__PAPERCHALK_EDITOR_STORE__; }
  function project() { return ps()?.getState?.().project; }
  function boneNodes() { return (project()?.nodes || []).filter(n => n.type === 'group' && n.boneRole); }
  function nodeById(id) { return (project()?.nodes || []).find(n => n.id === id) || null; }
  function makeId() { return 'pcbone_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }

  function uniqueRole(base) {
    let raw = String(base || 'bone').trim().replace(/\s+/g, '_').replace(/[\\/:*?"<>|]/g, '_');
    if (!raw) raw = 'bone';
    const used = new Set(boneNodes().map(b => b.boneRole));
    if (!used.has(raw)) return raw;
    let i = 2;
    while (used.has(raw + '_' + i)) i++;
    return raw + '_' + i;
  }

  function currentSelected() {
    const ids = es()?.getState?.().selection || [];
    return ids.length ? nodeById(ids[0]) : null;
  }

  function rememberCurrentPart() {
    const n = currentSelected();
    if (n?.type === 'part') state.rememberedPartId = n.id;
    if (n?.type === 'group' && n.boneRole) state.selectedBoneId = n.id;
  }

  function boneParentId(node) {
    let pid = node?.parent ?? null;
    const map = new Map((project()?.nodes || []).map(n => [n.id,n]));
    const seen = new Set();
    while (pid && !seen.has(pid)) {
      seen.add(pid);
      const n = map.get(pid);
      if (!n) break;
      if (n.type === 'group' && n.boneRole) return n.id;
      pid = n.parent ?? null;
    }
    return null;
  }

  function selectedBone() {
    const bones = boneNodes();
    let b = bones.find(x => x.id === state.selectedBoneId);
    if (!b) {
      const n = currentSelected();
      if (n?.type === 'group' && n.boneRole) b = n;
    }
    if (!b) b = bones.find(x => x.boneRole === 'root') || bones[0] || null;
    if (b) state.selectedBoneId = b.id;
    return b;
  }

  function setSelectedBone(id) {
    state.selectedBoneId = id;
    const ed = es()?.getState?.();
    ed?.setSelection?.([id]);
    ed?.setShowSkeleton?.(true);
    ed?.setSkeletonEditMode?.(true);
    render();
  }

  function addBone({name='新骨骼', parentId=null, x=null, y=null}={}) {
    const p = parentId ? nodeById(parentId) : selectedBone();
    const canvas = project()?.canvas || {width:800,height:600};
    const px = x ?? Number(p?.transform?.pivotX ?? canvas.width/2);
    const py = y ?? (Number(p?.transform?.pivotY ?? canvas.height/2) + 70);
    const id = makeId();
    const role = uniqueRole(name);

    ps().getState().updateProject((proj, vc) => {
      proj.nodes.push({
        id,
        type:'group',
        name:String(name || role),
        boneRole:role,
        parent:p?.id ?? null,
        transform:{x:0,y:0,rotation:0,scaleX:1,scaleY:1,pivotX:px,pivotY:py},
        visible:true,
        opacity:1,
      });
      if (vc) vc.transformVersion++;
    });
    setSelectedBone(id);
    return id;
  }

  function removeBone(id=state.selectedBoneId) {
    const bone = nodeById(id);
    if (!bone || bone.type !== 'group' || !bone.boneRole) return false;
    if (bone.boneRole === 'root' && boneNodes().length > 1) {
      toast('根骨骼不能直接删除；请先删除或改挂其子骨骼');
      return false;
    }
    const parentId = boneParentId(bone) ?? bone.parent ?? null;

    ps().getState().updateProject((proj, vc) => {
      for (const n of proj.nodes) {
        if (n.parent === bone.id) n.parent = parentId;
        if (n.type === 'part' && n.mesh?.jointBoneId === bone.id) {
          delete n.mesh.jointBoneId;
          delete n.mesh.boneWeights;
        }
      }
      proj.nodes = proj.nodes.filter(n => n.id !== bone.id);
      for (const a of proj.animations || []) {
        a.tracks = (a.tracks || []).filter(t => t.nodeId !== bone.id);
      }
      for (const rule of proj.physicsRules || []) {
        if (rule.boneRole === bone.boneRole) rule.boneRole = null;
      }
      if (vc) vc.transformVersion++;
    });

    state.selectedBoneId = parentId;
    if (parentId) es()?.getState?.().setSelection?.([parentId]);
    else es()?.getState?.().setSelection?.([]);
    render();
    return true;
  }

  function renameBone(name) {
    const bone = selectedBone();
    if (!bone) return;
    const oldRole = bone.boneRole;
    const nextName = String(name || '').trim();
    if (!nextName) return;
    const role = uniqueRole(nextName === oldRole ? oldRole : nextName);
    ps().getState().updateProject((proj, vc) => {
      const n = proj.nodes.find(x => x.id === bone.id);
      if (!n) return;
      n.name = nextName;
      n.boneRole = role;
      for (const rule of proj.physicsRules || []) {
        if (rule.boneRole === oldRole) rule.boneRole = role;
      }
      if (vc) vc.transformVersion++;
    });
    render();
  }

  function reparentBone(parentId) {
    const bone = selectedBone();
    if (!bone) return;
    if (parentId === bone.id) return;

    // Prevent cycles.
    let p = nodeById(parentId);
    while (p) {
      if (p.id === bone.id) {
        toast('不能把骨骼挂到自己的子骨骼下面');
        return;
      }
      p = nodeById(boneParentId(p));
    }

    ps().getState().updateProject((proj, vc) => {
      const n = proj.nodes.find(x => x.id === bone.id);
      if (n) n.parent = parentId || null;
      if (vc) vc.transformVersion++;
    });
    render();
  }

  function addChain(prefix='骨骼', count=4, spacing=45, angleDeg=90) {
    const parent = selectedBone();
    if (!parent) return;
    let pid = parent.id;
    let x = Number(parent.transform?.pivotX ?? 0);
    let y = Number(parent.transform?.pivotY ?? 0);
    const a = angleDeg * Math.PI / 180;
    const created = [];

    ps().getState().updateProject((proj, vc) => {
      for (let i=1;i<=count;i++) {
        x += Math.cos(a)*spacing;
        y += Math.sin(a)*spacing;
        const id = makeId();
        const name = prefix + '_' + String(i).padStart(2,'0');
        const role = (() => {
          const used = new Set(proj.nodes.filter(n=>n.boneRole).map(n=>n.boneRole));
          let base = name.replace(/\s+/g,'_');
          let r = base, k=2;
          while(used.has(r)) r=base+'_'+k++;
          return r;
        })();
        proj.nodes.push({
          id,type:'group',name,boneRole:role,parent:pid,
          transform:{x:0,y:0,rotation:0,scaleX:1,scaleY:1,pivotX:x,pivotY:y},
          visible:true,opacity:1
        });
        created.push(id);
        pid=id;
      }
      if (vc) vc.transformVersion++;
    });
    if (created.length) setSelectedBone(created[created.length-1]);
  }

  function addFingerSet(side='left') {
    const hand = selectedBone();
    if (!hand) return;
    const baseX = Number(hand.transform?.pivotX ?? 0);
    const baseY = Number(hand.transform?.pivotY ?? 0);
    const dir = side === 'right' ? 1 : -1;
    const fingers = [
      ['拇指', -34, 18, 3, 24],
      ['食指', -16, 28, 4, 25],
      ['中指', 0, 32, 4, 27],
      ['无名指', 15, 29, 4, 25],
      ['小指', 29, 23, 4, 22],
    ];
    const sideName = side === 'right' ? '右' : '左';
    const created=[];

    ps().getState().updateProject((proj, vc) => {
      for (const [label, offX, offY, count, length] of fingers) {
        let pid=hand.id;
        let x=baseX + dir*offX*0.45;
        let y=baseY + offY*0.15;
        const angle = (side === 'right' ? 0 : 180) + (offX/34)*22;
        const a=angle*Math.PI/180;
        for(let i=1;i<=count;i++){
          x += Math.cos(a)*length;
          y += Math.sin(a)*length;
          const id=makeId();
          const name=`${sideName}${label}${i}`;
          let role=name; let k=2;
          const used=new Set(proj.nodes.filter(n=>n.boneRole).map(n=>n.boneRole));
          while(used.has(role)) role=name+'_'+k++;
          proj.nodes.push({id,type:'group',name,boneRole:role,parent:pid,
            transform:{x:0,y:0,rotation:0,scaleX:1,scaleY:1,pivotX:x,pivotY:y},
            visible:true,opacity:1});
          created.push(id); pid=id;
        }
      }
      if(vc) vc.transformVersion++;
    });
    if(created.length) setSelectedBone(created[0]);
  }

  function addToeSet(side='left') {
    const foot=selectedBone();
    if(!foot) return;
    const baseX=Number(foot.transform?.pivotX ?? 0);
    const baseY=Number(foot.transform?.pivotY ?? 0);
    const dir=side==='right'?1:-1;
    const names=['大脚趾','二脚趾','三脚趾','四脚趾','小脚趾'];
    const created=[];
    ps().getState().updateProject((proj,vc)=>{
      names.forEach((label,idx)=>{
        let pid=foot.id;
        let x=baseX + dir*(24+idx*7);
        let y=baseY + (idx-2)*5;
        for(let seg=1;seg<=2;seg++){
          x += dir*18;
          const id=makeId();
          const name=(side==='right'?'右':'左')+label+seg;
          let role=name,k=2;
          const used=new Set(proj.nodes.filter(n=>n.boneRole).map(n=>n.boneRole));
          while(used.has(role)) role=name+'_'+k++;
          proj.nodes.push({id,type:'group',name,boneRole:role,parent:pid,
            transform:{x:0,y:0,rotation:0,scaleX:1,scaleY:1,pivotX:x,pivotY:y},
            visible:true,opacity:1});
          created.push(id); pid=id;
        }
      });
      if(vc) vc.transformVersion++;
    });
    if(created.length) setSelectedBone(created[0]);
  }

  function bindRememberedPart() {
    const bone=selectedBone();
    const part=nodeById(state.rememberedPartId);
    if(!bone || !part || part.type!=='part'){
      toast('先在图层页选择一个要绑定的图层，再打开骨骼管理');
      return;
    }
    if(!part.mesh?.vertices?.length){
      toast('这个图层还没有网格，请先生成网格再绑定骨骼');
      return;
    }

    ps().getState().updateProject((proj,vc)=>{
      const p=proj.nodes.find(n=>n.id===part.id);
      const b=proj.nodes.find(n=>n.id===bone.id);
      if(!p?.mesh || !b) return;
      p.mesh.jointBoneId=b.id;
      const bx=Number(b.transform?.pivotX ?? 0), by=Number(b.transform?.pivotY ?? 0);
      const verts=p.mesh.vertices;
      let maxD=1;
      const ds=verts.map(v=>Math.hypot(v.x-bx,v.y-by));
      for(const d of ds) maxD=Math.max(maxD,d);
      // Smooth radial weights: near the selected joint gets full influence,
      // far edge blends toward zero instead of moving as a rigid card.
      p.mesh.boneWeights=ds.map(d=>{
        const t=Math.max(0,Math.min(1,1-d/maxD));
        return t*t*(3-2*t);
      });
      if(vc) vc.geometryVersion++;
    });
    toast('已绑定到：'+displayName(bone)+'。可旋转骨骼检查网格变形。');
  }

  function displayName(b){ return b?.name || b?.boneRole || '骨骼'; }

  function hierarchyRows() {
    const bones=boneNodes();
    const byParent=new Map();
    for(const b of bones){
      const pid=boneParentId(b) || '__root__';
      if(!byParent.has(pid)) byParent.set(pid,[]);
      byParent.get(pid).push(b);
    }
    const out=[];
    const walk=(pid,depth)=>{
      const list=byParent.get(pid)||[];
      list.sort((a,b)=>displayName(a).localeCompare(displayName(b),'zh-CN'));
      for(const b of list){
        out.push({b,depth});
        walk(b.id,depth+1);
      }
    };
    walk('__root__',0);
    return out;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function render() {
    if(!state.overlay) return;
    const box=state.overlay.querySelector('.pc-bone-sheet-body');
    const bone=selectedBone();
    const rows=hierarchyRows();
    const options=['<option value="">无父骨骼（根层）</option>'].concat(
      boneNodes().filter(b=>b.id!==bone?.id).map(b =>
        `<option value="${b.id}" ${boneParentId(bone)===b.id?'selected':''}>${escapeHtml(displayName(b))}</option>`
      )
    ).join('');

    box.innerHTML = `
      <div class="pc-bone-selected">
        <div><b>当前骨骼：</b>${bone?escapeHtml(displayName(bone)):'无'}</div>
        <div class="pc-muted">骨骼数量：${rows.length}。层级没有上限，可继续添加手指、脚趾、头发、耳朵、尾巴、衣物、饰品等辅助骨。</div>
      </div>
      <div class="pc-bone-fields">
        <input id="pc-bone-name" value="${bone?escapeHtml(displayName(bone)):''}" placeholder="骨骼名称">
        <button id="pc-bone-rename">重命名</button>
        <select id="pc-bone-parent">${options}</select>
        <button id="pc-bone-reparent">修改父骨骼</button>
      </div>
      <div class="pc-bone-actions">
        <button id="pc-bone-add">＋ 子骨骼</button>
        <button id="pc-bone-hair">＋ 发束链×5</button>
        <button id="pc-bone-lfinger">＋ 左手五指</button>
        <button id="pc-bone-rfinger">＋ 右手五指</button>
        <button id="pc-bone-ltoe">＋ 左脚趾</button>
        <button id="pc-bone-rtoe">＋ 右脚趾</button>
        <button id="pc-bone-bind">绑定先前选中的网格图层</button>
        <button id="pc-bone-delete" class="danger">删除当前骨骼</button>
      </div>
      <div class="pc-bone-tree">
        ${rows.map(({b,depth}) => `
          <button class="pc-bone-row ${b.id===bone?.id?'active':''}" data-id="${b.id}"
            style="padding-left:${10+depth*16}px">
            <span class="pc-bone-icon">◆</span>
            <span>${escapeHtml(displayName(b))}</span>
            <small>${escapeHtml(b.boneRole)}</small>
          </button>`).join('')}
      </div>
    `;

    box.querySelectorAll('.pc-bone-row').forEach(el => el.onclick=()=>setSelectedBone(el.dataset.id));
    box.querySelector('#pc-bone-add').onclick=()=>{
      const p=selectedBone(); addBone({name:'新骨骼',parentId:p?.id});
    };
    box.querySelector('#pc-bone-hair').onclick=()=>addChain('发束',5,42,90);
    box.querySelector('#pc-bone-lfinger').onclick=()=>addFingerSet('left');
    box.querySelector('#pc-bone-rfinger').onclick=()=>addFingerSet('right');
    box.querySelector('#pc-bone-ltoe').onclick=()=>addToeSet('left');
    box.querySelector('#pc-bone-rtoe').onclick=()=>addToeSet('right');
    box.querySelector('#pc-bone-bind').onclick=bindRememberedPart;
    box.querySelector('#pc-bone-delete').onclick=()=>removeBone();
    box.querySelector('#pc-bone-rename').onclick=()=>renameBone(box.querySelector('#pc-bone-name').value);
    box.querySelector('#pc-bone-reparent').onclick=()=>reparentBone(box.querySelector('#pc-bone-parent').value || null);
  }

  function open() {
    rememberCurrentPart();
    if(state.overlay){
      state.overlay.style.display='flex';
      render();
      return 'open';
    }
    const overlay=document.createElement('div');
    overlay.id='pc-bone-manager';
    overlay.innerHTML=`
      <div class="pc-bone-sheet">
        <div class="pc-bone-sheet-head">
          <div>
            <b>骨骼管理</b>
            <div class="pc-muted">任意添加、删除、改父级；不限制固定人体骨架。</div>
          </div>
          <button class="pc-bone-close">关闭</button>
        </div>
        <div class="pc-bone-sheet-body"></div>
      </div>`;
    document.body.appendChild(overlay);
    state.overlay=overlay;
    overlay.querySelector('.pc-bone-close').onclick=()=>{ overlay.style.display='none'; };
    overlay.onclick=(e)=>{ if(e.target===overlay) overlay.style.display='none'; };
    render();
    return 'open';
  }

  window.PaperChalkBones={
    open,
    addBone,
    removeBone,
    addChain,
    addFingerSet,
    addToeSet,
    bindRememberedPart,
    refresh:render,
  };
})();


/* PAPERCHALK_BONE_MANAGER_V4
 * General-purpose 2D armature editor for phones:
 * arbitrary add/delete/reparent, finger/toe/hair presets, rigid and weighted
 * mesh binding. No fixed human template is required.
 */
(() => {
  'use strict';

  const state = {
    overlay: null,
    activeBoneId: null,
    activePartId: null,
    reparentMode: false,
  };

  function stores() {
    return {
      project: window.__PAPERCHALK_PROJECT_STORE__,
      editor: window.__PAPERCHALK_EDITOR_STORE__,
    };
  }

  function projectState() {
    return stores().project?.getState?.();
  }

  function editorState() {
    return stores().editor?.getState?.();
  }

  function uid(prefix='bone') {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
  }

  function slug(s) {
    return String(s || 'bone')
      .trim()
      .replace(/\s+/g,'_')
      .replace(/[^\p{L}\p{N}_-]+/gu,'_')
      .replace(/^_+|_+$/g,'')
      .slice(0,48) || 'bone';
  }

  function uniqueRole(base) {
    const ps = projectState();
    const used = new Set((ps?.project?.nodes || [])
      .filter(n => n.type === 'group' && n.boneRole)
      .map(n => n.boneRole));
    let role = slug(base);
    if (!used.has(role)) return role;
    let i = 2;
    while (used.has(role + '_' + i)) i++;
    return role + '_' + i;
  }

  function bones() {
    return (projectState()?.project?.nodes || [])
      .filter(n => n.type === 'group' && n.boneRole);
  }

  function parts() {
    return (projectState()?.project?.nodes || [])
      .filter(n => n.type === 'part');
  }

  function boneById(id) {
    return bones().find(b => b.id === id) || null;
  }

  function selectedBone() {
    const ids = editorState()?.selection || [];
    return ids.map(boneById).find(Boolean) || boneById(state.activeBoneId);
  }

  function setActiveBone(id) {
    state.activeBoneId = id;
    const ed = editorState();
    ed?.setSelection?.(id ? [id] : []);
    ed?.setShowSkeleton?.(true);
    ed?.setSkeletonEditMode?.(true);
    render();
  }

  function defaultPivot(parentId) {
    const ps = projectState()?.project;
    const p = boneById(parentId);
    if (p) {
      return {
        x: Number(p.transform?.pivotX || 0),
        y: Number(p.transform?.pivotY || 0) + 70,
      };
    }
    return {
      x: Number(ps?.canvas?.width || 800) / 2,
      y: Number(ps?.canvas?.height || 600) / 2,
    };
  }

  function addBone({parentId=null,name='新骨骼',pivot=null}={}) {
    const ps = projectState();
    if (!ps?.updateProject) return null;
    const id = uid();
    const role = uniqueRole(name);
    const p = pivot || defaultPivot(parentId);
    ps.updateProject(proj => {
      proj.nodes.push({
        id,
        type:'group',
        name,
        parent: parentId || null,
        opacity:1,
        visible:true,
        boneRole:role,
        transform:{
          x:0,y:0,rotation:0,scaleX:1,scaleY:1,
          pivotX:p.x,pivotY:p.y
        }
      });
    });
    setActiveBone(id);
    return id;
  }

  function addChild() {
    const p = selectedBone();
    const n = document.getElementById('pc-bone-name')?.value?.trim() || '新子骨骼';
    addBone({parentId:p?.id || null,name:n});
  }

  function addSibling() {
    const p = selectedBone();
    const n = document.getElementById('pc-bone-name')?.value?.trim() || '新同级骨骼';
    addBone({parentId:p?.parent || null,name:n});
  }

  function addRoot() {
    const n = document.getElementById('pc-bone-name')?.value?.trim() || '新根骨骼';
    addBone({parentId:null,name:n});
  }

  function descendantsOf(id) {
    const all = bones();
    const out = new Set();
    let changed = true;
    while (changed) {
      changed = false;
      for (const b of all) {
        if (b.parent === id || (b.parent && out.has(b.parent))) {
          if (!out.has(b.id)) { out.add(b.id); changed=true; }
        }
      }
    }
    return out;
  }

  function setParent(childId, parentId) {
    if (!childId) return false;
    if (childId === parentId) return false;
    const desc = descendantsOf(childId);
    if (parentId && desc.has(parentId)) {
      toast('不能把骨骼挂到自己的子骨骼下面');
      return false;
    }
    const ps = projectState();
    ps.updateProject(proj => {
      const b = proj.nodes.find(n => n.id === childId);
      if (b) b.parent = parentId || null;
    });
    state.reparentMode = false;
    render();
    return true;
  }

  function deleteActiveBone() {
    const b = selectedBone();
    if (!b) return;
    const ps = projectState();
    const parent = b.parent || null;
    ps.updateProject(proj => {
      for (const n of proj.nodes) {
        if (n.parent === b.id) n.parent = parent;
        if (n.type === 'part' && n.mesh) {
          if (n.mesh.jointBoneId === b.id) {
            delete n.mesh.jointBoneId;
            delete n.mesh.boneWeights;
          }
          if (Array.isArray(n.mesh.skinBones)) {
            n.mesh.skinBones = n.mesh.skinBones.filter(sb => sb.id !== b.id);
          }
        }
      }
      proj.nodes = proj.nodes.filter(n => n.id !== b.id);
      for (const a of proj.animations || []) {
        a.tracks = (a.tracks || []).filter(t => t.nodeId !== b.id);
      }
    });
    state.activeBoneId = parent;
    const ed = editorState();
    ed?.setSelection?.(parent ? [parent] : []);
    render();
  }

  function renameActive() {
    const b = selectedBone();
    if (!b) return;
    const input = document.getElementById('pc-bone-name');
    const name = input?.value?.trim();
    if (!name) return;
    const ps = projectState();
    const oldRole = b.boneRole;
    let newRole = slug(name);
    const used = new Set(bones().filter(x => x.id !== b.id).map(x => x.boneRole));
    if (used.has(newRole)) newRole = uniqueRole(newRole);
    ps.updateProject(proj => {
      const node = proj.nodes.find(n => n.id === b.id);
      if (node) {
        node.name = name;
        node.boneRole = newRole;
      }
    });
    toast('已重命名：' + name);
    render();
  }

  function addChain(parentId, prefix, count, dx, dy) {
    let parent = parentId || selectedBone()?.id || null;
    let p = defaultPivot(parent);
    for (let i=1;i<=count;i++) {
      p = {x:p.x+dx, y:p.y+dy};
      parent = addBone({parentId:parent,name:prefix + i,pivot:p});
    }
    return parent;
  }

  function addFingerPreset() {
    const hand = selectedBone();
    if (!hand) { toast('先选择手部骨骼'); return; }
    const hp = {x:Number(hand.transform?.pivotX||0),y:Number(hand.transform?.pivotY||0)};
    const fingers = [
      ['拇指', -0.60],['食指',-0.30],['中指',0],['无名指',0.30],['小指',0.60]
    ];
    for (const [name,fan] of fingers) {
      let parent = hand.id;
      for (let i=1;i<=3;i++) {
        const p={x:hp.x + fan*35*i + (fan<0?-8:8)*i, y:hp.y + 36*i};
        parent=addBone({parentId:parent,name:name+i,pivot:p});
      }
    }
    toast('已添加 5 指 × 3 节骨链');
    render();
  }

  function addToePreset() {
    const foot = selectedBone();
    if (!foot) { toast('先选择脚部骨骼'); return; }
    const fp={x:Number(foot.transform?.pivotX||0),y:Number(foot.transform?.pivotY||0)};
    for (let t=1;t<=5;t++) {
      let parent=foot.id;
      const fan=(t-3)*0.22;
      for (let i=1;i<=2;i++) {
        const p={x:fp.x + 34*i, y:fp.y + fan*25*i};
        parent=addBone({parentId:parent,name:'脚趾'+t+'_'+i,pivot:p});
      }
    }
    toast('已添加 5 趾 × 2 节骨链');
    render();
  }

  function addHairPreset() {
    const rootBone=selectedBone();
    if (!rootBone) { toast('先选择头部或头发根骨'); return; }
    addChain(rootBone.id,'头发_',6,0,42);
    toast('已添加 6 节头发骨链');
    render();
  }

  function bindPartRigid(partId) {
    const bone = selectedBone();
    if (!bone || !partId) { toast('先选择骨骼和部件'); return; }
    projectState().updateProject(proj => {
      const pt=proj.nodes.find(n=>n.id===partId && n.type==='part');
      if (!pt) return;
      pt.parent=bone.id;
      if (pt.mesh) {
        delete pt.mesh.jointBoneId;
        delete pt.mesh.boneWeights;
        pt.mesh.skinBones=[];
      }
    });
    toast('部件已刚性绑定到：'+(bone.name||bone.boneRole));
    render();
  }

  function distToSegment(px,py,ax,ay,bx,by) {
    const vx=bx-ax,vy=by-ay,wx=px-ax,wy=py-ay;
    const vv=vx*vx+vy*vy;
    let t=vv>1e-6?(wx*vx+wy*vy)/vv:0;
    t=Math.max(0,Math.min(1,t));
    const qx=ax+vx*t,qy=ay+vy*t;
    return Math.hypot(px-qx,py-qy);
  }

  function addWeightedInfluence(partId) {
    const bone=selectedBone();
    if (!bone || !partId) { toast('先选择骨骼和部件'); return; }
    projectState().updateProject(proj => {
      const pt=proj.nodes.find(n=>n.id===partId && n.type==='part');
      const bn=proj.nodes.find(n=>n.id===bone.id);
      if (!pt?.mesh?.vertices?.length || !bn) return;
      const parent=bn.parent ? proj.nodes.find(n=>n.id===bn.parent) : null;
      const ax=Number(parent?.transform?.pivotX ?? bn.transform?.pivotX ?? 0);
      const ay=Number(parent?.transform?.pivotY ?? bn.transform?.pivotY ?? 0);
      const bx=Number(bn.transform?.pivotX ?? ax);
      const by=Number(bn.transform?.pivotY ?? ay);
      const len=Math.max(18,Math.hypot(bx-ax,by-ay));
      const sigma=Math.max(18,len*0.60);
      const verts=pt.mesh.vertices;
      const scores=verts.map(v=>{
        const d=distToSegment(v.x,v.y,ax,ay,bx,by);
        return Math.exp(-(d*d)/(2*sigma*sigma));
      });

      const skins=Array.isArray(pt.mesh.skinBones)
        ? pt.mesh.skinBones.filter(sb=>sb.id!==bn.id).map(sb=>({id:sb.id,weights:Array.from(sb.weights||[])}))
        : [];
      skins.push({id:bn.id,weights:scores});

      // Normalize all influences per vertex. Keep max 4 influences at each
      // vertex, which is the conventional real-time skinning budget.
      for (let i=0;i<verts.length;i++) {
        const ranked=skins.map((sb,idx)=>({idx,w:Number(sb.weights[i]||0)}))
          .sort((a,b)=>b.w-a.w);
        const keep=new Set(ranked.slice(0,4).map(x=>x.idx));
        let sum=0;
        ranked.forEach(x=>{ if(keep.has(x.idx)) sum+=x.w; });
        sum=sum||1;
        skins.forEach((sb,idx)=>{
          sb.weights[i]=keep.has(idx)?Number(sb.weights[i]||0)/sum:0;
        });
      }
      pt.mesh.skinBones=skins.filter(sb=>sb.weights.some(w=>w>0.001));
      const strongest=pt.mesh.skinBones
        .map(sb=>({sb,total:sb.weights.reduce((a,b)=>a+b,0)}))
        .sort((a,b)=>b.total-a.total)[0]?.sb;
      if (strongest) {
        pt.mesh.jointBoneId=strongest.id;
        pt.mesh.boneWeights=Array.from(strongest.weights);
      }
    });
    toast('已加入网格权重影响：'+(bone.name||bone.boneRole));
    render();
  }

  function unbindPart(partId) {
    if (!partId) return;
    projectState().updateProject(proj=>{
      const pt=proj.nodes.find(n=>n.id===partId && n.type==='part');
      if (!pt) return;
      pt.parent=null;
      if (pt.mesh) {
        delete pt.mesh.jointBoneId;
        delete pt.mesh.boneWeights;
        pt.mesh.skinBones=[];
      }
    });
    toast('已解除部件骨骼绑定');
    render();
  }

  function treeOrder() {
    const all=bones();
    const byParent=new Map();
    for(const b of all){
      const k=b.parent||'__root__';
      if(!byParent.has(k)) byParent.set(k,[]);
      byParent.get(k).push(b);
    }
    const out=[];
    const walk=(pid,depth)=>{
      for(const b of (byParent.get(pid)||[])){
        out.push({b,depth});
        walk(b.id,depth+1);
      }
    };
    walk('__root__',0);
    for(const b of all){
      if(!out.some(x=>x.b.id===b.id)) out.push({b,depth:0});
    }
    return out;
  }

  function btn(txt,fn,small=false) {
    const b=document.createElement('button');
    b.textContent=txt;
    Object.assign(b.style,{
      minHeight:small?'38px':'44px',padding:small?'6px 9px':'8px 12px',
      borderRadius:'9px',border:'1px solid #4b5563',background:'#272b35',
      color:'#f8fafc',fontSize:small?'12px':'13px',fontWeight:'600'
    });
    b.onclick=fn;
    return b;
  }

  function render() {
    if(!state.overlay) return;
    const panel=state.overlay.querySelector('#pc-bone-panel');
    if(!panel) return;
    const all=treeOrder();
    const b=selectedBone();
    if(b) state.activeBoneId=b.id;
    const activePart=parts().find(p=>p.id===state.activePartId)||null;

    panel.innerHTML='';

    const top=document.createElement('div');
    Object.assign(top.style,{display:'flex',alignItems:'center',gap:'8px'});
    const title=document.createElement('div');
    title.textContent='通用骨骼管理器 V4';
    Object.assign(title.style,{fontSize:'16px',fontWeight:'800',flex:'1'});
    top.appendChild(title);
    top.appendChild(btn('关闭',close,true));
    panel.appendChild(top);

    const desc=document.createElement('div');
    desc.textContent='骨骼数量不限；可任意父子层级。手指、脚趾、头发、衣摆、耳朵、尾巴等都使用同一种骨骼。';
    Object.assign(desc.style,{fontSize:'11px',color:'#aeb7c6',lineHeight:'1.5'});
    panel.appendChild(desc);

    const input=document.createElement('input');
    input.id='pc-bone-name';
    input.value=b?.name||'';
    input.placeholder='骨骼名称，例如：左手食指_1 / 前发_3';
    Object.assign(input.style,{height:'42px',padding:'0 10px',borderRadius:'8px',
      border:'1px solid #4b5563',background:'#11151c',color:'white',fontSize:'14px'});
    panel.appendChild(input);

    const row=document.createElement('div');
    Object.assign(row.style,{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'2px'});
    row.append(btn('+ 根骨',addRoot,true),btn('+ 子骨',addChild,true),btn('+ 同级',addSibling,true),
      btn('重命名',renameActive,true),btn('删除',deleteActiveBone,true),
      btn(state.reparentMode?'点一个目标父骨':'设父骨',()=>{state.reparentMode=!state.reparentMode;render();},true),
      btn('解除父级',()=>b&&setParent(b.id,null),true));
    panel.appendChild(row);

    const preset=document.createElement('div');
    Object.assign(preset.style,{display:'flex',gap:'6px',overflowX:'auto'});
    preset.append(btn('手指 5×3',addFingerPreset,true),btn('脚趾 5×2',addToePreset,true),
      btn('头发链 6',addHairPreset,true));
    panel.appendChild(preset);

    const split=document.createElement('div');
    split.textContent='骨骼树（点选骨骼；“设父骨”模式下点另一个骨骼即可重连）';
    Object.assign(split.style,{fontSize:'12px',fontWeight:'700',marginTop:'3px'});
    panel.appendChild(split);

    const tree=document.createElement('div');
    Object.assign(tree.style,{maxHeight:'30vh',overflow:'auto',border:'1px solid #343a46',
      borderRadius:'8px',background:'#12161d'});
    for(const {b:bone,depth} of all){
      const item=document.createElement('button');
      const selected=bone.id===state.activeBoneId;
      item.textContent='　'.repeat(Math.min(depth,6))+(depth?'↳ ':'')+(bone.name||bone.boneRole);
      Object.assign(item.style,{display:'block',width:'100%',textAlign:'left',minHeight:'40px',
        padding:'6px 8px',border:'0',borderBottom:'1px solid #262c36',
        background:selected?'#1e5262':'transparent',color:'white',fontSize:'13px'});
      item.onclick=()=>{
        if(state.reparentMode && state.activeBoneId && state.activeBoneId!==bone.id){
          setParent(state.activeBoneId,bone.id);
        }else setActiveBone(bone.id);
      };
      tree.appendChild(item);
    }
    panel.appendChild(tree);

    const partTitle=document.createElement('div');
    partTitle.textContent='部件绑定 / 网格权重';
    Object.assign(partTitle.style,{fontSize:'12px',fontWeight:'700',marginTop:'4px'});
    panel.appendChild(partTitle);

    const plist=document.createElement('div');
    Object.assign(plist.style,{maxHeight:'18vh',overflow:'auto',border:'1px solid #343a46',
      borderRadius:'8px',background:'#12161d'});
    for(const p of parts()){
      const item=document.createElement('button');
      const infl=p.mesh?.skinBones?.length||0;
      const parent=boneById(p.parent);
      item.textContent=(p.id===state.activePartId?'✓ ':'')+(p.name||p.id)+
        (parent?'　[父骨:'+parent.name+']':'')+(infl?'　[权重骨:'+infl+']':'');
      Object.assign(item.style,{display:'block',width:'100%',textAlign:'left',minHeight:'38px',
        padding:'5px 8px',border:'0',borderBottom:'1px solid #262c36',
        background:p.id===state.activePartId?'#3c315f':'transparent',color:'white',fontSize:'12px'});
      item.onclick=()=>{state.activePartId=p.id;render();};
      plist.appendChild(item);
    }
    panel.appendChild(plist);

    const bind=document.createElement('div');
    Object.assign(bind.style,{display:'flex',gap:'6px',overflowX:'auto'});
    bind.append(
      btn('刚性绑定到当前骨',()=>activePart&&bindPartRigid(activePart.id),true),
      btn('加入网格权重',()=>activePart&&addWeightedInfluence(activePart.id),true),
      btn('解除部件绑定',()=>activePart&&unbindPart(activePart.id),true)
    );
    panel.appendChild(bind);

    const note=document.createElement('div');
    note.textContent='提示：刚性绑定适合独立纸片；“加入网格权重”适合需要弯曲的网格，可对同一网格连续加入多根骨骼，单顶点最多保留 4 根影响骨。';
    Object.assign(note.style,{fontSize:'10px',color:'#9ca3af',lineHeight:'1.45'});
    panel.appendChild(note);
  }

  function open() {
    if(state.overlay){render();return 'open';}
    const ed=editorState();
    ed?.setEditorMode?.('staging');
    ed?.setShowSkeleton?.(true);
    ed?.setSkeletonEditMode?.(true);
    const sel=selectedBone();
    if(sel) state.activeBoneId=sel.id;

    const ov=document.createElement('div');
    ov.id='paperchalk-bone-manager-v4';
    Object.assign(ov.style,{position:'fixed',inset:'0',zIndex:'2147483647',
      background:'rgba(0,0,0,.58)',display:'flex',alignItems:'flex-end',
      justifyContent:'center',padding:'10px',boxSizing:'border-box'});
    ov.onclick=e=>{if(e.target===ov)close();};

    const panel=document.createElement('div');
    panel.id='pc-bone-panel';
    Object.assign(panel.style,{width:'min(720px,100%)',maxHeight:'88vh',overflow:'auto',
      display:'flex',flexDirection:'column',gap:'8px',padding:'12px',
      borderRadius:'16px 16px 10px 10px',background:'#1b1f27',color:'white',
      boxShadow:'0 8px 40px rgba(0,0,0,.55)',boxSizing:'border-box'});
    ov.appendChild(panel);
    document.body.appendChild(ov);
    state.overlay=ov;
    render();
    return 'open';
  }

  function close() {
    state.overlay?.remove();
    state.overlay=null;
    state.reparentMode=false;
    return 'closed';
  }

  window.PaperChalkBones={
    open,close,render,addBone,setParent,deleteActiveBone,
    addFingerPreset,addToePreset,addHairPreset
  };
})();
