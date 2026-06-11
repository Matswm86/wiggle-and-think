/* ============================================================
   sonic3d.js — 3D Sonic for the standing exercises, animated with
   REAL Mixamo motion-capture, baked onto a CLEAN Mixamo re-rig of
   Sonic in Blender (assets/anim/sonic_anim.glb holds the mesh +
   textures + 8 baked actions). The clips are native to this exact
   skeleton, so we just interpolate each clip's rotation tracks onto
   the bones by name (an AnimationMixer blanks this skinned mesh).

   Shared-renderer pattern like hands3d.js: ONE offscreen WebGL ctx,
   live on the player stage, static snapshots for cards/thumbnails.
   Exercises in window.SONIC_MAP render as Sonic; the rest fall back
   to the SVG mascot (PipStage) — floor/animal moves stay clear.

   window.Sonic3D .mount(canvas,exId,opts) · .has(exId) · .DURATION · .whenReady
   ============================================================ */
import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";

const MODEL_URL = "assets/anim/sonic_anim.glb";
const RES = 640;
const MAP = window.SONIC_MAP || {};          // exId -> clip name
const DURATION = {};

let renderer = null, scene = null, camera = null, root = null, keyLight = null;
let clipData = {}, clipDur = {};             // clipName -> {dur, binds:[{bone, interp}]}
let ready = false; const readyCbs = []; let liveLoop = null;
let frameCtr = null, frameDist = 0;          // stored from frameCamera, for per-move view angles

// per-move camera angle (degrees): az = rotate around vertical, el = elevate.
// Sagittal moves (knee-ups, arm swings, steps) collapse on a straight-front camera,
// so they get a 3/4 view; frontal poses stay at the default front (0,0).
const SONIC_VIEW = {
  march: { az: 40 }, tightrope: { az: 42 }, flamingo: { az: 24, el: 6 },
  airplane: { az: 70, el: 6 }, windmill: { az: 40, el: 4 }, drum: { az: 36 }, kanga: { az: 18 },
};
function applyView(exId) {
  if (!frameCtr) return;
  const vu = SONIC_VIEW[exId] || {};
  const az = (vu.az || 0) * Math.PI / 180, el = (vu.el || 0) * Math.PI / 180;
  const D = frameDist;
  camera.position.set(
    frameCtr.x + Math.sin(az) * Math.cos(el) * D,
    frameCtr.y + Math.sin(el) * D,
    frameCtr.z + Math.cos(az) * Math.cos(el) * D);
  camera.lookAt(frameCtr.x, frameCtr.y, frameCtr.z);
}

function has(exId) { return !!MAP[exId] && !!clipData[MAP[exId]]; }

// ---- procedural root motion ----------------------------------------
// The retarget bake zeroes hips translation (the clips are rotation-only),
// so the body's physical travel — jump lift-off, march bob, balance sway —
// is re-added here on top of each clip. Heights are fractions of model height;
// windows are normalized clip time, matched to each clip's leg phases.
const easeArc = (p) => 4 * p * (1 - p);              // parabolic flight arc
const MOTION = {
  kanga:    { hops: [[0.38, 0.72, 0.16]] },          // one big jump per cycle
  starjump: { hops: [[0.33, 0.78, 0.13]] },          // airborne through the X
  flamingo: { hops: [[0.36, 0.72, 0.06]] },          // light one-leg hop
  jacks:    { bounce: { freq: 2, h: 0.045 } },       // continuous two-touch bounce
  march:    { bob: { freq: 2, h: 0.022 } },          // rise on each knee lift
  breathe:  { bob: { freq: 1, h: 0.012 } },          // slow rise on the inhale
  drum:     { dips: [[0.05, 0.20, 0.025], [0.30, 0.45, 0.025]] },  // stomp dips
  windmill: { dips: [[0.12, 0.42, 0.04], [0.62, 0.92, 0.04]] },    // sink into each reach
  tree:      { sway: 1 },                            // balance micro-corrections
  airplane:  { sway: 0.8 },
  tightrope: { sway: 1.3 },
};
let modelH = 0, baseY = 0;
function applyMotion(exId, t) {
  const m = MOTION[exId];
  let y = 0, rz = 0;
  if (m && modelH) {
    if (m.hops) for (const [s, e, h] of m.hops) if (t >= s && t <= e) y += h * easeArc((t - s) / (e - s));
    if (m.dips) for (const [s, e, h] of m.dips) if (t >= s && t <= e) y -= h * easeArc((t - s) / (e - s));
    if (m.bounce) y += m.bounce.h * Math.abs(Math.sin(Math.PI * m.bounce.freq * t));
    if (m.bob) y += m.bob.h * (0.5 - 0.5 * Math.cos(2 * Math.PI * m.bob.freq * t));
    if (m.sway) {
      const T = performance.now() / 1000;
      rz = 0.014 * m.sway * (0.6 * Math.sin(0.9 * T) + 0.4 * Math.sin(2.07 * T));
    }
  }
  root.position.y = baseY + y * modelH;
  root.rotation.z = rz;
}

function buildClips(gltf) {
  const byName = {};
  root.traverse((o) => { if (o.isBone) byName[o.name] = o; });
  const wanted = new Set(Object.values(MAP));
  for (const clip of gltf.animations) {
    if (!wanted.has(clip.name)) continue;     // skip the export's extra/duplicate actions
    const binds = [];
    for (const tr of clip.tracks) {
      const dot = tr.name.lastIndexOf(".");
      if (tr.name.slice(dot + 1) !== "quaternion") continue;
      const bone = byName[tr.name.slice(0, dot)];
      if (bone) binds.push({ bone, interp: tr.createInterpolant() });
    }
    clipData[clip.name] = { dur: clip.duration, binds }; clipDur[clip.name] = clip.duration;
  }
  Object.keys(MAP).forEach((ex) => { DURATION[ex] = clipDur[MAP[ex]] || 2.0; });
}

// pose the rig at normalized time t (0..1) by interpolating the clip's tracks
function poseAt(exId, t) {
  const cd = clipData[MAP[exId]]; if (!cd) return;
  const time = (((t % 1) + 1) % 1) * cd.dur;
  for (const b of cd.binds) { const v = b.interp.evaluate(time); b.bone.quaternion.set(v[0], v[1], v[2], v[3]); }
}

function initGL() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(RES, RES); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c6d6, 1.05));
  keyLight = new THREE.DirectionalLight(0xfff6ea, 2.0); keyLight.position.set(-4, 9, 7); keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024); keyLight.shadow.bias = -0.0008;
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight(0xbfe0ff, 0.4); fill.position.set(5, 2, -5); scene.add(fill);
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 10000);
}

function frameCamera() {
  const box = new THREE.Box3().setFromObject(root); const s = new THREE.Vector3(); box.getSize(s);
  const ctr = new THREE.Vector3(); box.getCenter(ctr);
  const fitH = s.y * 1.32;                 // extra headroom for overhead-arm poses
  const dist = (fitH * 0.5) / Math.tan((30 * Math.PI / 180) / 2);
  ctr.y += s.y * 0.08;                     // bias down a touch so raised arms aren't cropped
  modelH = s.y; baseY = root.position.y;   // reference for the root-motion layer
  camera.position.set(ctr.x, ctr.y, ctr.z + dist); camera.lookAt(ctr.x, ctr.y, ctr.z);
  frameCtr = ctr.clone(); frameDist = dist;
  // size the key light's shadow frustum + a ground plane to the model
  keyLight.position.set(ctr.x - s.y, ctr.y + s.y * 1.3, ctr.z + s.y);
  Object.assign(keyLight.shadow.camera, { near: 0.1, far: s.y * 6, left: -s.y, right: s.y, top: s.y, bottom: -s.y });
  keyLight.shadow.camera.updateProjectionMatrix();
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(s.y * 6, s.y * 6), new THREE.ShadowMaterial({ opacity: 0.16 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = box.min.y + s.y * 0.001; sh.receiveShadow = true; scene.add(sh);
}

function loadModel() {
  new GLTFLoader().load(MODEL_URL, (gltf) => {
    root = gltf.scene; scene.add(root);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    buildClips(gltf);
    frameCamera();
    ready = true; readyCbs.splice(0).forEach((fn) => fn());
  }, undefined, (e) => console.error("Sonic3D load failed:", e));
}

function blit(ctx, w, h) { ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, 0, w, h); }

function mount(canvas, exId, opts) {
  opts = opts || {};
  const name = MAP[exId];
  const draw = () => {
    const w = canvas.width, h = canvas.height, ctx = canvas.getContext("2d");
    if (!name || !clipData[name]) return;
    applyView(exId);                       // per-move camera angle (3/4 for sagittal moves)
    if (opts.pausedAt != null || opts.frozen) {
      const pt = opts.pausedAt != null ? opts.pausedAt : 0.3;
      poseAt(exId, pt); applyMotion(exId, pt);
      renderer.render(scene, camera); blit(ctx, w, h);
    } else {
      if (liveLoop) cancelAnimationFrame(liveLoop.raf);
      const dur = clipDur[name] || 2, spd = opts.speed || 1, t0 = performance.now();
      const loop = (now) => {
        const t = ((now - t0) / 1000 * spd / dur) % 1;
        poseAt(exId, t); applyMotion(exId, t);
        renderer.render(scene, camera); blit(ctx, w, h);
        liveLoop.raf = requestAnimationFrame(loop);
      };
      liveLoop = { raf: requestAnimationFrame(loop), ctx };
    }
  };
  if (ready) draw(); else readyCbs.push(draw);
  return { stop() { if (liveLoop && liveLoop.ctx === canvas.getContext("2d")) { cancelAnimationFrame(liveLoop.raf); liveLoop = null; } } };
}

function whenReady(fn) { if (ready) fn(); else readyCbs.push(fn); }

initGL(); loadModel();
window.Sonic3D = { mount, has, whenReady, DURATION, get ready() { return ready; } };
window.dispatchEvent(new Event("sonic3d-ready"));
