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
const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

const DURATION = { palmbeak: 2.8, fistpalm: 2.6, pointpalm: 2.8, peacepalm: 2.8, beakfist: 3.0, piano: 3.4 };

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

// Ground-truth bone poses sampled from the model's own "Open/Close" clip
// (the creator rigged it cleanly): openQ = flat hand, closedQ = fist, per bone name.
let openQ = {}, closedQ = {};
const _add = new THREE.Quaternion(), _eul = new THREE.Euler();
const sideSign = [1, 0.4, -0.4, -1];                // index..pinky squeeze toward a beak point

function sampleOpenClose(anims, rootObj) {
  const clip = (anims || []).find((a) => /open|clos/i.test(a.name)) || (anims || [])[0];
  if (!clip) return false;
  const mixer = new THREE.AnimationMixer(rootObj); mixer.clipAction(clip).play();
  // scan the whole clip; the curl metric = total flexion across all finger phalanges.
  const fbones = [];
  rootObj.traverse((o) => { if (o.isBone && /^(index|middle|ring|pinky)_0[23]R_/.test(o.name)) fbones.push(o.name); });
  const N = 30; let lo = { c: 1e9 }, hi = { c: -1e9 };
  for (let i = 0; i <= N; i++) {
    mixer.setTime(clip.duration * i / N); rootObj.updateMatrixWorld(true);
    const m = {}; rootObj.traverse((o) => { if (o.isBone) m[o.name] = o.quaternion.clone(); });
    let c = 0; fbones.forEach((n) => { if (m[n]) c += 2 * Math.acos(Math.min(1, Math.abs(m[n].w))); });
    if (c < lo.c) lo = { c, m }; if (c > hi.c) hi = { c, m };
  }
  mixer.stopAllAction(); mixer.uncacheRoot(rootObj);
  openQ = lo.m; closedQ = hi.m;
  return hi.c - lo.c > 0.5;   // false if the clip never actually folds (then poses stay open)
}

// blend a bone from open→closed by c (0..1)
function setBone(b, c) { const o = openQ[b.name], cl = closedQ[b.name]; if (o && cl) b.quaternion.copy(o).slerp(cl, c); }

// apply a pose to one hand. fingers[4]/thumb in 0..1 (0 = flat/open, 1 = fully folded).
// adduct 0..1 squeezes the fingers toward a point (for the beak shape).
function poseHand(h, pose) {
  FINGERS.forEach((f, fi) => {
    const c = clamp(pose.fingers[fi]);
    h.bones[f].forEach((b, j) => {
      if (!b) return;
      setBone(b, c);
      if (j === 0 && pose.adduct) { _add.setFromEuler(_eul.set(0, 0, sideSign[fi] * pose.adduct * 0.32)); b.quaternion.multiply(_add); }
    });
  });
  const op = clamp(pose.thumb);
  h.bones.thumb.forEach((b) => { if (b) setBone(b, op); });
}

// ---- bimanual shape-swap drills -----------------------------------
// Each hand holds a discrete, human-natural SHAPE; the two hands swap
// shapes simultaneously and rhythmically (palm/fist/beak/point/peace).
// fingers/thumb in 0..1 = blend from the model's OPEN (flat) to CLOSED (fist) pose
const SHAPES = {
  palm:  { fingers: [0, 0, 0, 0], thumb: 0 },                    // flat open hand
  fist:  { fingers: [1, 1, 1, 1], thumb: 1 },                    // fully closed fist
  beak:  { fingers: [0.6, 0.6, 0.6, 0.6], thumb: 0.85, adduct: 1 }, // fingers squeezed to a point
  point: { fingers: [0, 1, 1, 1], thumb: 1 },                    // ONLY index up, rest folded
  peace: { fingers: [0, 0, 1, 1], thumb: 1 },                    // index + middle up, rest folded
};
const smooth = (k) => k * k * (3 - 2 * k);
function lerpShape(a, b, k) {
  const aa = a.adduct || 0, ba = b.adduct || 0;
  return { fingers: a.fingers.map((v, i) => v + (b.fingers[i] - v) * k), thumb: a.thumb + (b.thumb - a.thumb) * k, adduct: aa + (ba - aa) * k };
}
// hold A, quick switch, hold B, quick switch back — both hands opposite
function swap(A, B) {
  return (t) => {
    const p = ((t % 1) + 1) % 1;
    let k;
    if (p < 0.40) k = 0;
    else if (p < 0.50) k = smooth((p - 0.40) / 0.10);
    else if (p < 0.90) k = 1;
    else k = 1 - smooth((p - 0.90) / 0.10);
    return { L: lerpShape(A, B, k), R: lerpShape(B, A, k) };
  };
}
// fine-motor finger isolation: one finger taps down at a time (index→pinky→back),
// both hands together. A single localized curl pulse travels across the four fingers.
function pianoWave() {
  const n = FINGERS.length;                              // 4
  return (t) => {
    const p = ((t % 1) + 1) % 1;
    const phase = p * n * 2;                             // 0..2n: down the row, then back
    const sweep = phase <= n ? phase : (2 * n - phase);  // 0→n→0
    const curlAt = (i) => clamp(1 - Math.abs(sweep - (i + 0.5)) * 1.8);
    const pose = { fingers: FINGERS.map((_, i) => curlAt(i)), thumb: 0 };
    return { L: pose, R: pose };
  };
}
const POSES = {
  palmbeak:  swap(SHAPES.palm,  SHAPES.beak),
  fistpalm:  swap(SHAPES.fist,  SHAPES.palm),
  pointpalm: swap(SHAPES.point, SHAPES.palm),
  peacepalm: swap(SHAPES.peace, SHAPES.palm),
  beakfist:  swap(SHAPES.beak,  SHAPES.fist),
  piano:     pianoWave(),
};
const NEUTRAL = () => ({ L: { ...SHAPES.palm }, R: { ...SHAPES.palm } });

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
  const near = 0.98;                            // wrist x; hands fan up & inward
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
    sampleOpenClose(gltf.animations, right);   // capture clean flat-palm & fist poses
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
