/* ============================================================
   floor3d.js — 3D floor-move character (a 3D "Pip") for the
   all-fours exercises (bear, crab, inch, cat-cow, dog). Sonic's
   oversized head reads as a blob on all fours; this procedurally
   built kid-creature has normal proportions and works grounded.
   LEFT limb = orange, RIGHT limb = blue (the app's learning rule).

   Same shared-renderer pattern as sonic3d.js / hands3d.js: ONE
   offscreen WebGL ctx, blit to a plain 2D canvas; live loop on the
   player stage, a single static frame for cards / step thumbnails.

   Adapted from the "3D Floor Moves" prototype (procedural rig +
   MOVES + auto-grounding kept verbatim); the per-instance renderer
   + OrbitControls were replaced by the shared blit engine.

   window.Floor3D .mount(canvas,exId,opts) · .DURATION · .whenReady
   ============================================================ */
import * as THREE from "./vendor/three.module.min.js";

const d = THREE.MathUtils.degToRad;
const RES = 640;
const IDS = ["bear", "crab", "inch", "catcow", "dog"];
const DURATION = { bear: 2.2, crab: 2.4, inch: 3.0, catcow: 3.4, dog: 3.0 };

const COL = {
  body: 0x2cb6a3, bodyD: 0x1f8779, belly: 0xfff1d6,
  left: 0xff7b54, leftD: 0xe8633c, right: 0x4d96ff, rightD: 0x2f78e0,
  face: 0xfff6e6, ink: 0x26343c,
};

let renderer = null, scene = null, camera = null, keyLight = null;
let char = null, ready = false; const readyCbs = []; let liveLoop = null;

function mat(color, rough = 0.62) { return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 }); }
function segment(parent, offset, length, radius, material) {
  const joint = new THREE.Group();
  joint.position.set(offset.x || 0, offset.y || 0, offset.z || 0); parent.add(joint);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 16), material);
  mesh.position.y = -length / 2; mesh.castShadow = true; mesh.receiveShadow = true; joint.add(mesh);
  const end = new THREE.Group(); end.position.y = -length; joint.add(end);
  return { joint, end, mesh };
}
function ball(parent, offset, radius, material) {
  const g = new THREE.Group(); g.position.set(offset.x || 0, offset.y || 0, offset.z || 0);
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 18), material);
  m.castShadow = true; m.receiveShadow = true; g.add(m); parent.add(g); return g;
}

function buildCharacter() {
  const root = new THREE.Group();                 // faces +X
  const bodyMat = mat(COL.body), leftMat = mat(COL.left), rightMat = mat(COL.right);
  const pelvis = new THREE.Group(); pelvis.position.y = 1.7; root.add(pelvis);
  const hipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 18), bodyMat);
  hipMesh.scale.set(1.15, 0.8, 1.0); hipMesh.castShadow = true; hipMesh.receiveShadow = true; pelvis.add(hipMesh);
  const spineLow = new THREE.Group(); pelvis.add(spineLow);
  const lowMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.5, 6, 16), bodyMat);
  lowMesh.position.y = 0.32; lowMesh.castShadow = true; lowMesh.receiveShadow = true; spineLow.add(lowMesh);
  const chest = new THREE.Group(); chest.position.y = 0.62; spineLow.add(chest);
  const chestMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.46, 6, 16), bodyMat);
  chestMesh.position.y = 0.28; chestMesh.scale.set(1.12, 1, 0.92); chestMesh.castShadow = true; chestMesh.receiveShadow = true; chest.add(chestMesh);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 18), mat(COL.belly, 0.7));
  belly.position.set(0.3, 0.1, 0); belly.scale.set(0.6, 1.15, 1.05); chest.add(belly);
  const bellyLow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 16), mat(COL.belly, 0.7));
  bellyLow.position.set(0.28, 0.05, 0); bellyLow.scale.set(0.55, 0.9, 1.0); pelvis.add(bellyLow);
  const neck = new THREE.Group(); neck.position.y = 0.62; chest.add(neck);
  const head = new THREE.Group(); head.position.y = 0.18; neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 26, 22), bodyMat);
  skull.scale.set(1, 1.02, 1); skull.castShadow = true; skull.receiveShadow = true; head.add(skull);
  const facePlate = new THREE.Mesh(new THREE.SphereGeometry(0.5, 26, 22), mat(COL.face, 0.7));
  facePlate.scale.set(0.55, 0.78, 0.86); facePlate.position.set(0.22, -0.02, 0); head.add(facePlate);
  for (const z of [-0.17, 0.17]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 14), mat(0xffffff, 0.4));
    white.position.set(0.42, 0.08, z); head.add(white);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 12), mat(COL.ink, 0.3));
    pupil.position.set(0.49, 0.08, z); head.add(pupil);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 10, 24, Math.PI), mat(COL.ink, 0.4));
  smile.position.set(0.45, -0.12, 0); smile.rotation.set(Math.PI / 2, 0, Math.PI); smile.rotation.y = Math.PI / 2; head.add(smile);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), mat(COL.bodyD));
  tuft.position.set(-0.05, 0.46, 0); tuft.scale.set(0.7, 0.9, 0.7); head.add(tuft);
  for (const z of [-0.34, 0.34]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), bodyMat);
    ear.position.set(-0.02, 0.34, z); ear.scale.set(0.7, 1, 0.55); ear.castShadow = true; head.add(ear);
  }
  const tailRoot = new THREE.Group(); tailRoot.position.set(-0.4, 0.1, 0); pelvis.add(tailRoot);
  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 5, 12), bodyMat);
  tail.position.y = 0.22; tail.castShadow = true; tailRoot.add(tail);
  function arm(side, material, matD) {
    const z = side === "L" ? 0.5 : -0.5;
    const shoulder = new THREE.Group(); shoulder.position.set(0.05, 0.42, z); chest.add(shoulder);
    const up = segment(shoulder, {}, 0.6, 0.17, material);
    const fore = segment(up.end, {}, 0.56, 0.15, material);
    const hand = ball(fore.end, { y: -0.04 }, 0.2, matD);
    return { shoulder, elbow: fore.joint, wrist: fore.end, hand, up: up.joint };
  }
  const armL = arm("L", leftMat, mat(COL.leftD)), armR = arm("R", rightMat, mat(COL.rightD));
  function leg(side, material, matD) {
    const z = side === "L" ? 0.26 : -0.26;
    const hip = new THREE.Group(); hip.position.set(0, -0.2, z); pelvis.add(hip);
    const thigh = segment(hip, {}, 0.72, 0.2, material);
    const shin = segment(thigh.end, {}, 0.68, 0.17, material);
    const footAnchor = new THREE.Group(); shin.end.add(footAnchor);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.26, 5, 12), matD);
    foot.rotation.z = Math.PI / 2; foot.position.set(0.12, -0.04, 0); foot.castShadow = true; footAnchor.add(foot);
    return { hip, knee: shin.joint, ankle: shin.end, foot: footAnchor, thigh: thigh.joint };
  }
  const legL = leg("L", leftMat, mat(COL.leftD)), legR = leg("R", rightMat, mat(COL.rightD));
  const joints = { root, pelvis, spineLow, chest, neck, head, armL, armR, legL, legR, tailRoot };
  const contacts = [armL.hand, armR.hand, legL.foot, legR.foot, legL.knee, legR.knee];
  return { root, joints, contacts };
}

function reset(j) {
  for (const g of [j.pelvis, j.spineLow, j.chest, j.neck, j.head, j.tailRoot]) g.rotation.set(0, 0, 0);
  for (const limb of [j.armL, j.armR]) { limb.shoulder.rotation.set(0, 0, 0); limb.elbow.rotation.set(0, 0, 0); }
  for (const limb of [j.legL, j.legR]) { limb.hip.rotation.set(0, 0, 0); limb.knee.rotation.set(0, 0, 0); limb.ankle.rotation.set(0, 0, 0); }
  j.pelvis.position.set(0, 1.7, 0);
}

const TAU = Math.PI * 2;
const wave = (t, ph = 0) => Math.sin(t * TAU + ph);
const lerp = THREE.MathUtils.lerp;
function pick(sp, key, side) { const s = sp[key + side]; return s != null ? s : (sp[key] != null ? sp[key] : 0); }
function applySpec(j, sp) {
  const pelZ = sp.pelZ || 0, spineZ = sp.spineZ || 0, chestZ = sp.chestZ || 0;
  j.pelvis.rotation.z = d(pelZ); j.spineLow.rotation.z = d(spineZ); j.chest.rotation.z = d(chestZ);
  const torsoZ = pelZ + spineZ + chestZ;
  j.neck.rotation.z = d(sp.neckZ || 0); j.head.rotation.z = d(sp.headZ || 0);
  j.armL.shoulder.rotation.z = d(pick(sp, "armW", "L") - torsoZ);
  j.armR.shoulder.rotation.z = d(pick(sp, "armW", "R") - torsoZ);
  j.armL.elbow.rotation.z = d(pick(sp, "elbow", "L")); j.armR.elbow.rotation.z = d(pick(sp, "elbow", "R"));
  j.legL.hip.rotation.z = d(pick(sp, "legW", "L") - pelZ); j.legR.hip.rotation.z = d(pick(sp, "legW", "R") - pelZ);
  j.legL.knee.rotation.z = d(pick(sp, "knee", "L")); j.legR.knee.rotation.z = d(pick(sp, "knee", "R"));
  j.legL.ankle.rotation.z = d(pick(sp, "ankle", "L")); j.legR.ankle.rotation.z = d(pick(sp, "ankle", "R"));
  j.tailRoot.rotation.z = d(sp.tailZ || 0);
  if (sp.pelvisY != null) j.pelvis.position.y = sp.pelvisY;
}

const MOVES = {
  bear(j, t) {
    const sL = wave(t, 0), sR = wave(t, Math.PI), step = 22;
    applySpec(j, { pelZ: -10, spineZ: -64, chestZ: -6, neckZ: 60, headZ: 16,
      armWL: 2 + step * sL, armWR: 2 + step * sR,
      elbowL: 12 + 8 * Math.max(0, sL), elbowR: 12 + 8 * Math.max(0, sR),
      legWL: 16 - step * sL, legWR: 16 - step * sR,
      kneeL: -34 - 10 * Math.max(0, -sL), kneeR: -34 - 10 * Math.max(0, -sR),
      ankleL: 22, ankleR: 22, pelvisY: 1.55 + 0.03 * Math.abs(wave(t * 2)) });
  },
  catcow(j, t) {
    const s = wave(t);
    applySpec(j, { pelZ: 0, spineZ: -90 + 7 * s, chestZ: 15 * s, neckZ: 60 - 30 * s, headZ: 8 - 18 * s,
      armW: 0, elbow: 6, legW: 0, knee: -92, ankle: 44, tailZ: -18 + 38 * s + 7 * wave(t * 4), pelvisY: 1.0 });
  },
  dog(j, t) {
    applySpec(j, { pelZ: 0, spineZ: -52, chestZ: -2, neckZ: 40, headZ: -18,
      armW: 14, elbow: 3, legW: -16, knee: -3, ankle: 56, tailZ: 24 + 22 * wave(t * 3), pelvisY: 2.05 });
  },
  inch(j, t) {
    const tri = Math.abs((t % 1) * 2 - 1), p = tri * tri * (3 - 2 * tri);
    applySpec(j, { pelZ: 0, spineZ: lerp(-112, -90, p), chestZ: 0, neckZ: lerp(54, 36, p), headZ: lerp(4, -8, p),
      armW: 0, elbow: 4, legW: lerp(-14, -88, p), knee: lerp(-6, -2, p), ankle: lerp(34, 66, p), pelvisY: lerp(2.1, 1.05, p) });
  },
  crab(j, t) {
    const s = wave(t), s2 = wave(t, Math.PI);
    applySpec(j, { pelZ: 90, spineZ: 0, chestZ: -4, neckZ: -118, headZ: 10,
      armWL: 4 - 14 * Math.max(0, s), armWR: 4 - 14 * Math.max(0, s2), elbow: -6,
      legWL: 92 + 10 * Math.max(0, s2), legWR: 92 + 10 * Math.max(0, s), knee: -104, ankle: 34, pelvisY: 1.35 });
    j.root.position.z = 0.16 * s;
  },
};

function groundChar() {
  char.root.updateWorldMatrix(true, true);
  const v = new THREE.Vector3(); let min = Infinity;
  for (const a of char.contacts) { a.getWorldPosition(v); if (v.y < min) min = v.y; }
  if (isFinite(min)) char.root.position.y -= min - 0.02;
}
function poseMove(exId, t) {
  char.root.position.set(0, 0, 0);
  reset(char.joints);
  (MOVES[exId] || MOVES.bear)(char.joints, t);
  groundChar();
}

function initGL() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setSize(RES, RES); renderer.setPixelRatio(1);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe0a8, 0.95));
  keyLight = new THREE.DirectionalLight(0xffffff, 1.7); keyLight.position.set(5, 9, 6); keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048); keyLight.shadow.bias = -0.0004;
  Object.assign(keyLight.shadow.camera, { near: 1, far: 30, left: -6, right: 6, top: 6, bottom: -6 });
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight(0xbfe8ff, 0.4); fill.position.set(-6, 4, -3); scene.add(fill);
  // shadow-catcher (transparent) so the all-fours pose reads grounded on any stage tint
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), new THREE.ShadowMaterial({ opacity: 0.17 }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.0; sh.receiveShadow = true; scene.add(sh);
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
}

// frame the camera (3/4 elevated) to fit all five grounded poses
function frameCamera() {
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  for (const id of IDS) for (const t of [0, 0.5]) {
    poseMove(id, t); char.root.updateWorldMatrix(true, true);
    tmp.setFromObject(char.root); box.union(tmp);
  }
  const s = new THREE.Vector3(); box.getSize(s); const ctr = new THREE.Vector3(); box.getCenter(ctr);
  const fit = Math.max(s.x, s.y) * 1.15;
  const dist = (fit * 0.5) / Math.tan((32 * Math.PI / 180) / 2);
  const dir = new THREE.Vector3(0.62, 0.42, 0.78).normalize();
  camera.position.copy(ctr).addScaledVector(dir, dist * 1.15);
  camera.lookAt(ctr.x, ctr.y, ctr.z);
}

function loadModel() {
  char = buildCharacter(); scene.add(char.root);
  frameCamera();
  ready = true; readyCbs.splice(0).forEach((fn) => fn());
}
function blit(ctx, w, h) { ctx.clearRect(0, 0, w, h); ctx.drawImage(renderer.domElement, 0, 0, w, h); }

function mount(canvas, exId, opts) {
  opts = opts || {};
  const draw = () => {
    const w = canvas.width, h = canvas.height, ctx = canvas.getContext("2d");
    if (!MOVES[exId]) return;
    if (opts.pausedAt != null || opts.frozen) {
      poseMove(exId, opts.pausedAt != null ? opts.pausedAt : 0.3);
      renderer.render(scene, camera); blit(ctx, w, h);
    } else {
      if (liveLoop) cancelAnimationFrame(liveLoop.raf);
      const dur = DURATION[exId] || 2.6, spd = opts.speed || 1, t0 = performance.now();
      const loop = (now) => {
        poseMove(exId, ((now - t0) / 1000 * spd / dur) % 1);
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
window.Floor3D = { mount, whenReady, DURATION, IDS, get ready() { return ready; } };
window.FLOOR3D_IDS = new Set(IDS);
window.dispatchEvent(new Event("floor3d-ready"));
