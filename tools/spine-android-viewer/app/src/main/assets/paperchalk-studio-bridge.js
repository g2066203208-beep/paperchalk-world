(() => {
  'use strict';

  const MP_VERSION = '0.10.35';
  const POSE_MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

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

  async function exportPortableMotion() {
    const motion = portableMotionFromCurrent();
    const filename = safeFileStem(motion.name) + '.pcmotion.json';
    const json = JSON.stringify(motion);
    const bytes = new TextEncoder().encode(json);

    if (!AndroidStudio.beginMotionFile(filename)) throw new Error('android-output-open-failed');
    try {
      const chunkSize = 96 * 1024;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        AndroidStudio.appendMotionChunk(bytesToBase64(bytes.subarray(i, Math.min(bytes.length, i + chunkSize))));
        if ((i / chunkSize) % 8 === 0) await new Promise(r => setTimeout(r, 0));
      }
      AndroidStudio.endMotionFile();
      toast('动作已保存：' + filename);
      androidStatus('动作文件已导出，可按 bone-role 重定向到游戏骨架：' + filename);
      return filename;
    } catch (e) {
      throw e;
    }
  }

  async function ensureMediaPipe() {
    if (state.landmarker) return state.landmarker;
    androidStatus('正在加载 MediaPipe Pose Landmarker…');
    const mp = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + MP_VERSION + '/+esm');
    const vision = await mp.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + MP_VERSION + '/wasm'
    );
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
  androidStatus('PaperChalk Android 扩展已就绪：面捕 / 动作录制 / 流式视频导出');
})();