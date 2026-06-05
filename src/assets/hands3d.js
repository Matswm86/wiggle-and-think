/* ============================================================
   hands3d.js — realistic 3D hands for the "Clever Hands" finger
   moves (cards 21–25). Loads a rigged glTF hand, mirrors it for
   the left hand, and drives the real finger bones per exercise.

   ONE shared WebGL renderer (browsers cap WebGL contexts): every
   place that needs a hand (home cards, step thumbnails, the live
   player stage) blits from this single offscreen renderer onto a
   plain 2D canvas. Only the open player runs a per-frame loop.

   window.Hands3D
     .mount(canvas2d, exId, {speed, pausedAt, frozen}) -> {stop}
     .DURATION[exId]
     .whenReady(fn)
   ============================================================ */
import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/loaders/GLTFLoader.js";
import { clone as skeletonClone } from "./vendor/utils/SkeletonUtils.js";

const MODEL_URL = "assets/models/rigged_hand.glb";
const RES = 620;                          // offscreen render resolution
const FINGERS = ["index", "middle", "ring", "pinky"];

const DURATION = { fingertips: 4.4, openclose: 5.0, twirls: 3.4, tappairs: 2.4, thumbsinout: 2.6 };

let renderer = null, scene = null, camera = null;
let hands = null;                         // {l:{bones,rest}, r:{bones,rest}}
let ready = false;
const readyCbs = [];
let liveLoop = null;                      // {raf, exId, ctx, w, h, t0, dur}

// ---- bone helpers --------------------------------------------------
function collectBones(root) {
  const B = {};
  root.traverse((o) => { if (o.isBone) B[o.name] = o; });
  return B;
}
function phalanx(B, finger, joint) {
  // bones look like  index_01R_017 ; pick the plain phalange (not Ctrl/base/end)
  const key = Object.keys(B).find((n) =>
    n.startsWith(`${finger}_0${joint}R_`) && !/Ctrl|base|end/.test(n));
  return key ? B[key] : null;
}
function orientQuaternion(B, root) {
  root.updateWorldMatrix(true, true);
  const wp = (n) => { const b = B[n]; if (!b) return null; const v = new THREE.Vector3(); b.getWorldPosition(v); return v; };
  const tip = (f) => Object.keys(B).find((n) => n.startsWith(`${f}_03R_end`)) || Object.keys(B).find((n) => n.startsWith(`${f}_03R`));
  const wrist = wp("handR_02") || wp("pulseR_01");
  const midTip = wp(tip("middle"));
  const idxB = wp(phalanx(B, "index", 1) && phalanx(B, "index", 1).name);
  const pkB = wp(phalanx(B, "pinky", 1) && phalanx(B, "pinky", 1).name);
  const up = (midTip && wrist) ? midTip.clone().sub(wrist).normalize() : new THREE.Vector3(0, 1, 0);
  const across = (idxB && pkB) ? pkB.clone().sub(idxB).normalize() : new THREE.Vector3(1, 0, 0);
  const normal = new THREE.Vector3().crossVectors(up, across).normalize();
  const xAxis = new THREE.Vector3().crossVectors(up, normal).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis, up, normal);
  return new THREE.Quaternion().setFromRotationMatrix(m).invert();
}

// build one posable hand from a model instance; returns {group, bones, rest}
function buildHand(model, side, q) {
  const orient = new THREE.Group(); orient.quaternion.copy(q); orient.add(model);
  // recenter the oriented hand on the origin
  orient.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(orient); const ctr = new THREE.Vector3(); box.getCenter(ctr);
  orient.position.sub(ctr);
  const place = new THREE.Group(); place.add(orient);
  if (side === "l") place.scale.x = -1;                 // mirror → real left hand
  const B = collectBones(model);
  const bones = {};
  const rest = {};
  ["thumb", ...FINGERS].forEach((f) => {
    bones[f] = [1, 2, 3].map((j) => phalanx(B, f, j));
    bones[f].forEach((b, i) => { if (b) rest[`${f}${i}`] = b.rotation.clone(); });
  });
  const anchor = B["handR_02"] || B["pulseR_01"] || phalanx(B, "middle", 1);
  return { group: place, bones, rest, anchor };
}

// reset a hand to its rest pose
function resetHand(h) {
  ["thumb", ...FINGERS].forEach((f) => h.bones[f].forEach((b, i) => {
    if (b && h.rest[`${f}${i}`]) b.rotation.copy(h.rest[`${f}${i}`]);
  }));
}

// apply a pose {fingers:[i,m,r,p] curl 0..1, thumb 0..1} to one hand
function poseHand(h, pose) {
  resetHand(h);
  // finger flexion: curl folds toward palm about local X; cascade across phalanges
  FINGERS.forEach((f, fi) => {
    const c = Math.max(-0.25, Math.min(1.1, pose.fingers[fi]));
    const seg = [1.0, 0.92, 0.6];      // proximal leads; tips don't over-fold/cross
    h.bones[f].forEach((b, j) => { if (b) b.rotation.x += c * 0.82 * seg[j]; });
  });
  // thumb: op 0 = out to the side, 1 = across the palm toward the fingers
  const op = Math.max(0, Math.min(1, pose.thumb));
  const tb = h.bones.thumb;
  if (tb[0]) { tb[0].rotation.x += 0.25 + op * 0.55; tb[0].rotation.z += -0.15 - op * 0.85; tb[0].rotation.y += op * 0.5; }
  if (tb[1]) tb[1].rotation.x += 0.1 + op * 0.6;
  if (tb[2]) tb[2].rotation.x += 0.1 + op * 0.4;
}

// ---- per-exercise pose timelines (t 0..1) --------------------------
const seqPulse = (t, c, w, peak) => { let d = Math.abs((t - c + 1) % 1); if (d > 0.5) d = 1 - d; return d < w ? peak * (1 - d / w) : 0; };
const ramp = (p, s, l) => Math.max(0, Math.min(1, (p - s) / l));
const POSES = {
  fingertips(t) {                                   // active finger curls to meet opposed thumb
    const centers = [0, 1 / 8, 2 / 8, 3 / 8];
    const f = [0, 1, 2, 3].map((i) => {
      const a = seqPulse(t, centers[i], 0.085, 0.7);
      const b = i < 3 ? seqPulse(t, 1 - centers[i] - 0.02, 0.085, 0.7) : 0;
      return 0.05 + Math.max(a, b);
    });
    return { L: { fingers: f, thumb: 0.85 }, R: { fingers: f.slice(), thumb: 0.85 } };
  },
  openclose(t) {                                    // L opens while R closes, then swap
    const open = (p) => ({ fingers: [1 - ramp(p, .16, .24), 1 - ramp(p, .32, .24), 1 - ramp(p, .48, .24), 1 - ramp(p, .64, .24)], thumb: 1 - ramp(p, 0, .24) });
    const close = (p) => ({ fingers: [ramp(p, .48, .24), ramp(p, .32, .24), ramp(p, .16, .24), ramp(p, 0, .24)], thumb: ramp(p, .64, .24) });
    if (t < 0.5) { const p = t / 0.5; return { L: open(p), R: close(p) }; }
    const p = (t - 0.5) / 0.5; return { L: close(p), R: open(p) };
  },
  twirls(t) {                                       // cupped; active pair eases out
    const cup = [0.5, 0.5, 0.5, 0.5];
    const phase = Math.floor(t * 4) % 4;
    const f = cup.slice(); if (phase >= 1) f[phase - 1] = 0.2;
    const thumb = phase === 0 ? 0.85 : 0.7;
    return { L: { fingers: f, thumb }, R: { fingers: f.slice(), thumb } };
  },
  tappairs(t) {                                     // resting; named pair pops up
    const rest = 0.4, up = 0.0, f = [rest, rest, rest, rest], ph = t % 1;
    const set = ph < 1 / 3 ? [0, 1] : ph < 2 / 3 ? [1, 2, 3] : [0, 3];
    set.forEach((i) => { f[i] = up; });
    return { L: { fingers: f, thumb: 0.45 }, R: { fingers: f.slice(), thumb: 0.45 } };
  },
  thumbsinout(t) {                                  // fists; thumbs out then tucked
    const fist = [1, 1, 1, 1], op = t < 0.5 ? 0 : 1;
    return { L: { fingers: fist, thumb: op }, R: { fingers: fist.slice(), thumb: op } };
  },
};
const NEUTRAL = () => ({ L: { fingers: [.1, .1, .1, .1], thumb: .2 }, R: { fingers: [.1, .1, .1, .1], thumb: .2 } });

// snap a hand so its wrist bone sits at (x,y) in scene space (robust placement)
function placeHand(h, x, y) {
  h.group.updateWorldMatrix(true, true);
  const a = new THREE.Vector3(); h.anchor.getWorldPosition(a);
  h.group.position.x += x - a.x;
  h.group.position.y += y - a.y;
}
function setPose(exId, t) {
  const pose = (POSES[exId] || NEUTRAL)(t);
  poseHand(hands.l, pose.L);
  poseHand(hands.r, pose.R);
  const near = exId === "twirls" ? 0.5 : 0.98;  // wrist x; hands fan up & inward
  hands.l.group.rotation.z = -0.13; hands.r.group.rotation.z = 0.13;  // slight inward tilt
  placeHand(hands.l, -near, -1.45);
  placeHand(hands.r, near, -1.45);
}

// ---- shared renderer ----------------------------------------------
function initGL() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(RES, RES); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb6c8, 1.05));
  const key = new THREE.DirectionalLight(0xfff4e8, 2.0); key.position.set(-5, 9, 8); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 60;
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); key.shadow.bias = -0.0008;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xbfe0ff, 0.45); fill.position.set(6, 2, -5); scene.add(fill);
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  camera.position.set(0, -0.15, 6.6); camera.lookAt(0, -0.15, 0);
  // soft contact shadow
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.18 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = -1.45; sh.receiveShadow = true; scene.add(sh);
}

function loadModel() {
  new GLTFLoader().load(MODEL_URL, (gltf) => {
    const right = gltf.scene;
    // replace the dark, veiny photo texture (reads as "undead") with a clean,
    // warm LIGHT skin material — smoother and friendlier for kids.
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf2c9a6, roughness: 0.66, metalness: 0.0, side: THREE.DoubleSide });
    right.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material = skinMat; } });
    const B = collectBones(right);
    const q = orientQuaternion(B, right);
    const left = buildHand(skeletonClone(right), "l", q);
    const rgt = buildHand(right, "r", q);
    scene.add(left.group, rgt.group);
    hands = { l: left, r: rgt };
    ready = true; readyCbs.splice(0).forEach((fn) => fn());
  }, undefined, (e) => { console.error("Hands3D model load failed:", e); });
}

function renderTo(ctx, exId, t, w, h) {
  setPose(exId, t);
  renderer.render(scene, camera);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(renderer.domElement, 0, 0, w, h);
}

function mount(canvas, exId, opts) {
  opts = opts || {};
  const draw = () => {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext("2d");
    if (opts.pausedAt != null || opts.frozen) {
      renderTo(ctx, exId, opts.pausedAt != null ? opts.pausedAt : 0, w, h);
    } else {
      if (liveLoop) cancelAnimationFrame(liveLoop.raf);
      const dur = (DURATION[exId] || 3.4) / (opts.speed || 1);
      const t0 = performance.now();
      const loop = (now) => {
        const t = (((now - t0) / 1000) % dur) / dur;
        renderTo(ctx, exId, t, w, h);
        liveLoop.raf = requestAnimationFrame(loop);
      };
      liveLoop = { raf: requestAnimationFrame(loop), ctx };
    }
  };
  if (ready) draw(); else readyCbs.push(draw);
  return { stop() { if (liveLoop && liveLoop.ctx === canvas.getContext("2d")) { cancelAnimationFrame(liveLoop.raf); liveLoop = null; } } };
}

function whenReady(fn) { if (ready) fn(); else readyCbs.push(fn); }

initGL();
loadModel();
window.Hands3D = { mount, whenReady, DURATION, get ready() { return ready; } };
// PipStage may have rendered before this deferred module ran — tell it we're here
window.dispatchEvent(new Event("hands3d-ready"));
