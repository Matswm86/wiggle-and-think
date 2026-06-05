/* ============================================================
   sonic3d.js — 3D character (rigged glTF) for the NON-finger
   exercises, driven by Mixamo bone rotations. Same shared-renderer
   pattern as hands3d.js: ONE offscreen WebGL context, live on the
   player stage, static snapshots for cards + step thumbnails.

   Exercises with an entry in ANIM are rendered as the 3D character;
   anything else falls back to the SVG mascot (PipStage handles that),
   so the live site never regresses while coverage grows.

   window.Sonic3D
     .mount(canvas2d, exId, {speed, pausedAt, frozen}) -> {stop}
     .has(exId)            // is this exercise animated yet?
     .DURATION[exId]
     .whenReady(fn)
   ============================================================ */
import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";

const MODEL_URL = "assets/models/sonic.glb";
const RES = 640;
let renderer = null, scene = null, camera = null, root = null, hips = null;
let B = {}, REST = {}, restHipsY = 0;
let ready = false; const readyCbs = []; let liveLoop = null;

function bone(seg) { return B[Object.keys(B).find((n) => n.includes(seg + "_")) || ""] || null; }

// reset every driven bone to its bind rotation + hips to its bind position
const DRIVEN = ["Spine", "Spine1", "Spine2", "Neck", "Head",
  "LeftArm", "LeftForeArm", "RightArm", "RightForeArm",
  "LeftUpLeg", "LeftLeg", "LeftFoot", "RightUpLeg", "RightLeg", "RightFoot"];
function reset() {
  DRIVEN.forEach((k) => { const b = bone(k); if (b && REST[k]) b.rotation.copy(REST[k]); });
  if (hips) hips.position.y = restHipsY;
}
// add a rotation delta to a bone (local axes: see calibration)
function rot(k, x, y, z) { const b = bone(k); if (b) { b.rotation.x += x || 0; b.rotation.y += y || 0; b.rotation.z += z || 0; } }
const sin = (t, ph) => Math.sin((t + (ph || 0)) * Math.PI * 2);

// ---- archetype animations (t 0..1) --------------------------------
// Axes (calibrated): Arm.z raises (L +, R -); Arm.x swings fwd/back;
// ForeArm.x bends elbow; UpLeg.x lifts knee fwd; Leg.x(-) bends knee;
// Spine.x leans forward; Hips.y for hops.
const ANIM = {
  // marching in place — opposite arm & knee, gentle bob
  march(t) {
    const s = sin(t); hips.position.y = restHipsY + Math.abs(s) * 0.04;
    rot("LeftUpLeg", Math.max(0, s) * 1.1, 0, 0); rot("LeftLeg", -Math.max(0, s) * 0.9);
    rot("RightUpLeg", Math.max(0, -s) * 1.1, 0, 0); rot("RightLeg", -Math.max(0, -s) * 0.9);
    rot("RightArm", -Math.max(0, s) * 0.7, 0, 0.18); rot("LeftArm", -Math.max(0, -s) * 0.7, 0, -0.18);
    rot("Spine", 0.05, sin(t) * 0.05, 0);
  },
  // jumping jacks — arms sweep up overhead, legs open, hop on the open beat
  jacks(t) {
    const o = (1 - Math.cos(t * Math.PI * 2)) / 2;           // 0→1→0 open amount
    hips.position.y = restHipsY + o * 0.13;
    rot("LeftArm", -o * 0.45, 0, 0.35 + o * 2.35); rot("RightArm", -o * 0.45, 0, -(0.35 + o * 2.35)); // up overhead
    rot("LeftUpLeg", 0, 0, o * 0.42); rot("RightUpLeg", 0, 0, -o * 0.42);  // legs open apart
  },
  // big two-foot jump — squat, leap, soft land
  jump(t) {
    const p = t % 1; let y, sq;
    if (p < 0.22) { sq = p / 0.22; y = -sq * 0.18; }
    else if (p < 0.55) { const k = (p - 0.22) / 0.33; y = -0.18 + (Math.sin(k * Math.PI)) * 0.9; sq = 1 - k; }
    else if (p < 0.72) { const k = (p - 0.55) / 0.17; y = -0.18 * (1 - k); sq = 0.5 - k * 0.5; }
    else { y = 0; sq = 0; }
    hips.position.y = restHipsY + y;
    rot("LeftUpLeg", sq * 0.7, 0, 0); rot("LeftLeg", -sq * 1.1);
    rot("RightUpLeg", sq * 0.7, 0, 0); rot("RightLeg", -sq * 1.1);
    const air = Math.max(0, y) ; rot("LeftArm", 0, 0, 0.3 + air * 1.2); rot("RightArm", 0, 0, -(0.3 + air * 1.2));
  },
  // happy bounce + arm sway (freeze dance / clap / drum / simon)
  bounce(t) {
    hips.position.y = restHipsY + Math.abs(sin(t)) * 0.09;
    rot("LeftArm", sin(t) * 0.5, 0, 0.4); rot("RightArm", -sin(t) * 0.5, 0, -0.4);
    rot("LeftForeArm", -0.6); rot("RightForeArm", -0.6);
    rot("Spine", 0, sin(t) * 0.12, 0); rot("Head", 0, sin(t) * 0.1, 0);
  },
  // one-leg balance, arms out like wings, slight sway (tree / airplane / flamingo)
  balance(t) {
    rot("LeftArm", 0, 0, 1.35); rot("RightArm", 0, 0, -1.35);
    rot("RightUpLeg", 0.5, 0, 0.2); rot("RightLeg", -1.4);
    rot("Spine", 0, 0, sin(t) * 0.04);
  },
  // arms sweep up overhead and back down (breathe / windmill / lazy8 / reaches)
  reach(t) {
    const u = (1 - Math.cos(t * Math.PI * 2)) / 2;
    rot("LeftArm", -u * 0.5, 0, 0.2 + u * 2.5); rot("RightArm", -u * 0.5, 0, -(0.2 + u * 2.5));
    hips.position.y = restHipsY + u * 0.03;
  },
  // bend forward, hands toward floor (animal walks / cat-cow / dog approximation)
  bend(t) {
    const d = 0.6 + Math.abs(sin(t)) * 0.25;
    rot("Spine", d * 0.6, 0, 0); rot("Spine1", d * 0.5, 0, 0); rot("Spine2", d * 0.4, 0, 0);
    rot("LeftArm", 1.2, 0, 0.2); rot("RightArm", 1.2, 0, -0.2);
    rot("LeftUpLeg", 0.2, 0, 0); rot("RightUpLeg", 0.2, 0, 0);
    rot("Head", -0.3, 0, 0);
  },
};

// exercise → archetype + durations live in data.js (window.SONIC_MAP / _DUR)
// so the classic-loaded PipStage can decide Sonic-vs-mascot synchronously.
// HYBRID: the floor/animal moves (bear, crab, inch, cat-cow, dog) are absent
// from the map, so PipStage keeps the SVG mascot for them.
const MAP = window.SONIC_MAP || {};
const DURATION = window.SONIC_DUR || {};
function has(exId) { return !!MAP[exId]; }

function setPose(exId, t) { reset(); const a = ANIM[MAP[exId]]; if (a) a(t); }

// ---- shared renderer ----------------------------------------------
function initGL() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(RES, RES); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c6d6, 1.0));
  const key = new THREE.DirectionalLight(0xfff6ea, 2.0); key.position.set(-4, 9, 7); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { near: 0.5, far: 30, left: -3, right: 3, top: 4, bottom: -3 }); key.shadow.bias = -0.0008;
  scene.add(key);
  scene.add(new THREE.DirectionalLight(0xbfe0ff, 0.4).translateX(5));
  camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
}

function frameCamera() {
  const box = new THREE.Box3().setFromObject(root); const s = new THREE.Vector3(); box.getSize(s);
  const ctr = new THREE.Vector3(); box.getCenter(ctr);
  const fitH = s.y + 0.9;                                  // headroom for raised arms / hops
  const dist = (fitH * 0.5) / Math.tan((30 * Math.PI / 180) / 2) * 1.04;
  camera.position.set(ctr.x, ctr.y + 0.05, ctr.z + dist); camera.lookAt(ctr.x, ctr.y, ctr.z);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.16 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = box.min.y + 0.001; sh.receiveShadow = true; scene.add(sh);
}

function loadModel() {
  new GLTFLoader().load(MODEL_URL, (gltf) => {
    root = gltf.scene; scene.add(root);
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; if (o.isBone) B[o.name] = o; });
    DRIVEN.forEach((k) => { const b = bone(k); if (b) REST[k] = b.rotation.clone(); });
    hips = bone("Hips"); if (hips) restHipsY = hips.position.y;
    frameCamera();
    ready = true; readyCbs.splice(0).forEach((fn) => fn());
  }, undefined, (e) => console.error("Sonic3D load failed:", e));
}

function renderTo(ctx, exId, t, w, h) {
  setPose(exId, t); renderer.render(scene, camera);
  ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, 0, w, h);
}
function mount(canvas, exId, opts) {
  opts = opts || {};
  const draw = () => {
    const w = canvas.width, h = canvas.height, ctx = canvas.getContext("2d");
    if (opts.pausedAt != null || opts.frozen) { renderTo(ctx, exId, opts.pausedAt != null ? opts.pausedAt : 0, w, h); }
    else {
      if (liveLoop) cancelAnimationFrame(liveLoop.raf);
      const dur = (DURATION[exId] || 2.0) / (opts.speed || 1); const t0 = performance.now();
      const loop = (now) => { renderTo(ctx, exId, (((now - t0) / 1000) % dur) / dur, w, h); liveLoop.raf = requestAnimationFrame(loop); };
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
