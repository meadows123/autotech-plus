// Live 3D hero: three cinematic shots that loop behind the hero copy.
//   0. Alloy wheel spinning down, brake disc glowing hot, amber caliper
//   1. Meshing gearbox gears
//   2. Tachometer sweeping to the redline while the remap power curve draws
// Built with Three.js, bundled to js/hero3d.js by `npm run build`.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const AMBER = 0xf2ab41;
const INK = 0x0d0f14;
const SHOT_LEN = 8;     // seconds per shot
const FADE = 0.7;       // seconds of fade in/out at each end of a shot
const HEAD_FONT = '"Barlow Condensed", "Arial Narrow", sans-serif';

const TAU = Math.PI * 2;
const clamp01 = x => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

// Colour brighter than 1.0 so unlit materials push through the bloom threshold.
function glow(hex, boost) {
  const c = new THREE.Color(hex);
  return c.multiplyScalar(boost);
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function radialTexture(stops) {
  return canvasTexture(256, 256, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

// A flat text label; `height` is its height in world units.
function label(text, { height = 0.2, color = '#ffffff', weight = 600, spacing = 0, px = 96, glowAmt = 1 } = {}) {
  const font = `${weight} ${px}px ${HEAD_FONT}`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const textW = probe.measureText(text).width + spacing * px * text.length;
  const w = Math.ceil(textW + px * 0.4), h = Math.ceil(px * 1.3);
  const tex = canvasTexture(w, h, (ctx) => {
    ctx.font = font;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing * px}px`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2 + (spacing * px) / 2, h / 2 + px * 0.05);
  });
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: glowAmt === 1 });
  if (glowAmt !== 1) mat.color.setScalar(glowAmt);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * (w / h), height), mat);
  return mesh;
}

// Revolve a 2D (radius, z) profile around the Z axis.
function lathe(points, segments = 128) {
  const geo = new THREE.LatheGeometry(points.map(([r, z]) => new THREE.Vector2(r, z)), segments);
  geo.rotateX(Math.PI / 2);
  return geo;
}

// Tube along a curve whose drawRange can grow from start to end.
function growingTube(curve, segments, radius, material, radial = 8) {
  const geo = new THREE.TubeGeometry(curve, segments, radius, radial, false);
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.perSegment = radial * 6;
  mesh.userData.segments = segments;
  mesh.setProgress = p => geo.setDrawRange(0, Math.floor(clamp01(p) * segments) * radial * 6);
  return mesh;
}

/* ------------------------------------------------------------------ */
/*  Materials                                                          */
/* ------------------------------------------------------------------ */

function makeMaterials() {
  return {
    chrome: new THREE.MeshStandardMaterial({ color: 0xdfe2e6, metalness: 1, roughness: 0.12 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x6f737b, metalness: 0.9, roughness: 0.5 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x3f434b, metalness: 0.9, roughness: 0.45 }),
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x30343b, metalness: 0.95, roughness: 0.32, side: THREE.DoubleSide }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0, roughness: 0.82, side: THREE.DoubleSide }),
    amberPaint: new THREE.MeshPhysicalMaterial({ color: AMBER, metalness: 0.15, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.15 }),
    blackGloss: new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, metalness: 0.3, roughness: 0.25, clearcoat: 1 }),
    plate: new THREE.MeshStandardMaterial({ color: 0x171a20, metalness: 0.75, roughness: 0.5 }),
    amberGlow: new THREE.MeshBasicMaterial({ color: glow(AMBER, 2.4), toneMapped: false }),
  };
}

/* ------------------------------------------------------------------ */
/*  Shot 0: wheel & brake                                              */
/* ------------------------------------------------------------------ */

function buildWheel(M) {
  const root = new THREE.Group();
  const spin = new THREE.Group();
  root.add(spin);

  // Tyre with two circumferential grooves
  const tyre = new THREE.Mesh(lathe([
    [1.20, 0.40], [1.32, 0.445], [1.50, 0.46], [1.64, 0.43], [1.73, 0.36], [1.77, 0.26],
    [1.775, 0.17], [1.752, 0.158], [1.752, 0.112], [1.775, 0.10], [1.78, 0],
    [1.775, -0.10], [1.752, -0.112], [1.752, -0.158], [1.775, -0.17],
    [1.77, -0.26], [1.73, -0.36], [1.64, -0.43], [1.50, -0.46], [1.32, -0.445], [1.20, -0.40],
  ], 180), M.rubber);
  spin.add(tyre);

  // Sidewall lettering, mapped around the ring with polar UVs
  {
    const seg = 256, r0 = 1.36, r1 = 1.6, pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * TAU;
      pos.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
      uv.push(1 - i / seg, 0, 1 - i / seg, 1);
      if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = canvasTexture(4096, 160, (ctx, w, h) => {
      ctx.font = `700 92px ${HEAD_FONT}`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '18px';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      const words = ['AUTOTECH PLUS', 'BRISTOL', 'AUTOTECH PLUS', 'MOT · REPAIRS'];
      words.forEach((t, i) => {
        ctx.fillStyle = i % 2 ? '#6c707a' : '#9a9ea8';
        ctx.fillText(t, (i + 0.5) * (w / words.length), h / 2);
      });
      ctx.fillStyle = '#f2ab41';
      ctx.fillRect(0, h - 10, w, 4);
    });
    const ring = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex, transparent: true, roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2,
    }));
    ring.position.z = 0.465;
    spin.add(ring);
  }

  // Rim barrel + polished lip
  spin.add(new THREE.Mesh(lathe([
    [1.30, 0.42], [1.31, 0.40], [1.23, 0.36], [1.19, 0.30], [1.19, -0.38], [1.24, -0.42], [1.27, -0.40],
  ], 160), M.gunmetal));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.255, 0.032, 16, 180), M.chrome);
  lip.position.z = 0.405;
  spin.add(lip);

  // Five twin spokes, concave towards the hub
  const L = 0.9;
  const armShape = new THREE.Shape();
  armShape.moveTo(0, -0.085); armShape.lineTo(L, -0.05); armShape.lineTo(L, 0.05); armShape.lineTo(0, 0.085); armShape.closePath();
  const armGeo = new THREE.ExtrudeGeometry(armShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.022, bevelSegments: 4, curveSegments: 4 });
  armGeo.translate(0, 0, -0.04);
  const tilt = Math.atan2(0.2, L);
  for (let k = 0; k < 5; k++) {
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.rotation.z = (k / 5) * TAU + side * 0.085;
      const arm = new THREE.Mesh(armGeo, M.gunmetal);
      arm.position.set(0.3, 0, 0.16);
      arm.rotation.y = -tilt;
      pivot.add(arm);
      spin.add(pivot);
    }
  }

  // Hub, centre cap with amber ring, lug nuts
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.37, 0.18, 48).rotateX(Math.PI / 2), M.gunmetal);
  hub.position.z = 0.15;
  spin.add(hub);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 48).rotateX(Math.PI / 2), M.blackGloss);
  cap.position.z = 0.255;
  spin.add(cap);
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.013, 12, 64), M.amberGlow);
  capRing.position.z = 0.28;
  spin.add(capRing);
  const nutGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.07, 6).rotateX(Math.PI / 2);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU + Math.PI / 5;
    const nut = new THREE.Mesh(nutGeo, M.chrome);
    nut.position.set(Math.cos(a) * 0.245, Math.sin(a) * 0.245, 0.25);
    spin.add(nut);
  }

  // Brake disc with cross-drilled holes and a heat glow
  const disc = new THREE.Group();
  disc.position.z = -0.12;
  disc.add(new THREE.Mesh(lathe([[0.42, -0.045], [1.04, -0.045], [1.04, 0.045], [0.42, 0.045], [0.42, -0.045]], 128),
    new THREE.MeshStandardMaterial({ color: 0x9a9da3, metalness: 1, roughness: 0.34, side: THREE.DoubleSide })));
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.2, 48).rotateX(Math.PI / 2), M.darkSteel);
  bell.position.z = 0.1;
  disc.add(bell);
  const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.024, 14), new THREE.MeshBasicMaterial({ color: 0x050506 }), 60);
  {
    const m = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 3; j++) {
        const a = (i / 20) * TAU + j * 0.07, r = 0.66 + j * 0.12;
        m.makeTranslation(Math.cos(a) * r, Math.sin(a) * r, 0.047);
        holes.setMatrixAt(n++, m);
      }
    }
  }
  disc.add(holes);
  const heatMat = new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [0.74, 'rgba(255,120,30,0.9)'], [0.9, 'rgba(255,170,60,1)'], [1, 'rgba(255,90,20,0.3)']]),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0,
  });
  heatMat.color.setScalar(2.2);
  const heat = new THREE.Mesh(new THREE.CircleGeometry(1.04, 96), heatMat);
  heat.position.z = 0.05;
  disc.add(heat);
  spin.add(disc);

  // Amber caliper (does not spin), with brand lettering
  const alpha = 2.3, span = 0.95, ri = 0.8, ro = 1.1;
  const cs = new THREE.Shape();
  cs.moveTo(Math.cos(alpha - span / 2) * ro, Math.sin(alpha - span / 2) * ro);
  cs.absarc(0, 0, ro, alpha - span / 2, alpha + span / 2, false);
  cs.absarc(0, 0, ri, alpha + span / 2, alpha - span / 2, true);
  const caliper = new THREE.Mesh(
    new THREE.ExtrudeGeometry(cs, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 5, curveSegments: 32 }),
    M.amberPaint);
  caliper.position.z = -0.27;
  root.add(caliper);
  const calLabel = label('AUTOTECH', { height: 0.085, color: '#16120a', weight: 700, spacing: 0.12 });
  calLabel.position.set(Math.cos(alpha) * 0.95, Math.sin(alpha) * 0.95, 0.052);
  calLabel.rotation.z = alpha - Math.PI / 2;
  root.add(calLabel);

  return {
    group: root,
    enter() { spin.rotation.z = 0; },
    update(t, dt, k) {
      // Spins fast, then brakes hard: speed falls while the disc heats up
      const brake = ease(clamp01((k - 0.15) / 0.55));
      const speed = lerp(15, 1.1, brake);
      spin.rotation.z -= speed * dt;
      heatMat.opacity = Math.sin(brake * Math.PI) * 0.7 + brake * 0.15;
    },
    camera(k) {
      const e = ease(k);
      const a = lerp(0.62, 0.12, e), r = lerp(10.5, 8.6, e);
      return { pos: new THREE.Vector3(Math.sin(a) * r, lerp(1.8, 0.5, e), Math.cos(a) * r), target: new THREE.Vector3(0, 0, 0) };
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Shot 1: gearbox                                                    */
/* ------------------------------------------------------------------ */

function gearGeometry(N, m, depth) {
  const r = (m * N) / 2, ra = r + m, rr = r - 1.25 * m, p = TAU / N;
  const shape = new THREE.Shape();
  const profile = [[rr, -0.5], [rr, -0.27], [r, -0.19], [ra, -0.1], [ra, 0.1], [r, 0.19], [rr, 0.27]];
  for (let i = 0; i < N; i++) {
    profile.forEach(([rad, f], j) => {
      const a = (i + f) * p;
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0 && j === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
  }
  shape.closePath();

  const bore = Math.max(0.12, rr * 0.16);
  const borePath = new THREE.Path();
  borePath.absarc(0, 0, bore, 0, TAU, true);
  shape.holes.push(borePath);
  if (rr > 0.65) {
    const holeR = rr * 0.18, ringR = rr * 0.58;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + p / 2;
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * ringR, Math.sin(a) * ringR, holeR, 0, TAU, true);
      shape.holes.push(h);
    }
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.018, bevelSegments: 2, curveSegments: 24 });
  geo.translate(0, 0, -depth / 2);
  return { geo, r, bore, pitch: p };
}

function buildGearbox(M) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  rig.rotation.set(-0.28, 0.32, 0);
  root.add(rig);
  const m = 0.1, depth = 0.32;

  // Machined casing plate behind the gears
  {
    const w = 9.5, h = 6, rad = 0.4;
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + rad, -h / 2);
    s.lineTo(w / 2 - rad, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad);
    s.lineTo(w / 2, h / 2 - rad); s.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2);
    s.lineTo(-w / 2 + rad, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad);
    s.lineTo(-w / 2, -h / 2 + rad); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2);
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 }), M.plate);
    plate.position.set(0.6, -0.2, -1.25);
    rig.add(plate);
    const boltGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 6).rotateX(Math.PI / 2);
    for (let i = 0; i < 8; i++) {
      const x = -w / 2 + 0.35 + (i % 4) * ((w - 0.7) / 3), y = i < 4 ? -h / 2 + 0.35 : h / 2 - 0.35;
      const b = new THREE.Mesh(boltGeo, M.darkSteel);
      b.position.set(x + 0.6, y - 0.2, -0.98);
      rig.add(b);
    }
  }

  const gears = [];
  function addGear({ N, mat, pos, z = 0, driver = null, phi = 0, shaftOf = null }) {
    const { geo, r, bore, pitch } = gearGeometry(N, m, depth);
    const mesh = new THREE.Mesh(geo, mat);
    const g = { N, r, pitch, mesh, theta: 0, driver, phi, shaftOf };
    if (shaftOf) pos = shaftOf.mesh.position;
    else if (driver) pos = new THREE.Vector3(Math.cos(phi), Math.sin(phi), 0).multiplyScalar(driver.r + r).add(driver.mesh.position);
    mesh.position.set(pos.x, pos.y, z);
    rig.add(mesh);

    // Shaft through the bore with a glowing amber end ring
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(bore * 0.92, bore * 0.92, 1.6, 32).rotateX(Math.PI / 2), M.chrome);
    shaft.position.set(pos.x, pos.y, -0.45);
    rig.add(shaft);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(bore * 1.25, 0.012, 10, 48), M.amberGlow);
    ring.position.set(pos.x, pos.y, z + depth / 2 + 0.03);
    rig.add(ring);

    gears.push(g);
    return g;
  }

  const g1 = addGear({ N: 28, mat: M.steel, pos: new THREE.Vector3(0, 0, 0) });
  const g2 = addGear({ N: 14, mat: M.amberPaint, driver: g1, phi: 0.38 });
  addGear({ N: 20, mat: M.darkSteel, driver: g1, phi: 3.55 });
  const g4 = addGear({ N: 24, mat: M.darkSteel, z: -0.55, shaftOf: g2 });
  addGear({ N: 16, mat: M.steel, z: -0.55, driver: g4, phi: -1.05 });

  // Mesh phase: the driven gear presents a gap where the driver presents a tooth.
  function solve(theta1) {
    for (const g of gears) {
      if (g === g1) g.theta = theta1;
      else if (g.shaftOf) g.theta = g.shaftOf.theta;
      else {
        const d = g.driver;
        g.theta = g.phi + Math.PI + g.pitch / 2 - (d.N / g.N) * (d.theta - g.phi);
      }
      g.mesh.rotation.z = g.theta;
    }
  }

  let theta = 0;
  return {
    group: root,
    exposure: 0.7,
    enter() { theta = 0; },
    update(t, dt, k) {
      theta += dt * lerp(0.35, 0.7, ease(k));
      solve(theta);
    },
    camera(k) {
      const e = ease(k);
      return {
        pos: new THREE.Vector3(lerp(5.5, -3, e), lerp(-2.4, 2.6, e), lerp(12.5, 11.2, e)),
        target: new THREE.Vector3(0.5, -0.2, 0),
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Shot 2: tachometer + remap power curve                             */
/* ------------------------------------------------------------------ */

function buildGauge(M) {
  const root = new THREE.Group();
  const gauge = new THREE.Group();
  root.add(gauge);
  const A0 = 1.25 * Math.PI, SWEEP = 1.5 * Math.PI;
  const angleAt = v => A0 - v * SWEEP;

  // Body
  const back = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.16, 96).rotateX(Math.PI / 2), M.plate);
  back.position.z = -0.08;
  gauge.add(back);
  gauge.add(new THREE.Mesh(new THREE.CircleGeometry(1.95, 96),
    new THREE.MeshStandardMaterial({ color: 0x0f1217, roughness: 0.4, metalness: 0.3 })));
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(2.03, 0.085, 24, 180), M.chrome);
  bezel.position.z = 0.02;
  gauge.add(bezel);

  // Track: dim base + glowing fill that grows with the needle
  const arc = new THREE.Curve();
  arc.getPoint = (u, out = new THREE.Vector3()) => {
    const a = angleAt(u);
    return out.set(Math.cos(a) * 1.86, Math.sin(a) * 1.86, 0.02);
  };
  gauge.add(new THREE.Mesh(new THREE.TubeGeometry(arc, 200, 0.02, 8, false), new THREE.MeshBasicMaterial({ color: 0x252a33 })));
  const trackFill = growingTube(arc, 200, 0.026, new THREE.MeshBasicMaterial({ color: glow(AMBER, 2.6), toneMapped: false }));
  gauge.add(trackFill);

  // Ticks + numerals
  const ticks = [];
  const majorGeo = new THREE.BoxGeometry(0.05, 0.26, 0.03), minorGeo = new THREE.BoxGeometry(0.024, 0.13, 0.03);
  for (let i = 0; i <= 40; i++) {
    const v = i / 40, a = angleAt(v), major = i % 5 === 0, red = v > 0.8;
    const mat = new THREE.MeshBasicMaterial({ color: red ? 0x5a2418 : 0x3d424c, toneMapped: false });
    const tick = new THREE.Mesh(major ? majorGeo : minorGeo, mat);
    const rr = major ? 1.62 : 1.68;
    tick.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0.02);
    tick.rotation.z = a - Math.PI / 2;
    gauge.add(tick);
    ticks.push({ v, mat, on: glow(red ? 0xff4a1f : AMBER, 2.6), off: mat.color.clone() });
    if (major) {
      const n = label(String(i / 5), { height: 0.26, color: red ? '#ff6a3d' : '#e8e9ec', weight: 600 });
      n.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0.02);
      gauge.add(n);
    }
  }
  const unit = label('RPM × 1000', { height: 0.13, color: '#8b909b', weight: 500, spacing: 0.14 });
  unit.position.set(0, 0.62, 0.02);
  gauge.add(unit);

  // Digital readout (redrawn when the value changes)
  const ro = document.createElement('canvas');
  ro.width = 512; ro.height = 256;
  const roCtx = ro.getContext('2d');
  const roTex = new THREE.CanvasTexture(ro);
  roTex.colorSpace = THREE.SRGBColorSpace;
  let lastKey = '';
  function drawReadout(bhp, gain) {
    if (`${bhp}/${gain}` === lastKey) return;
    lastKey = `${bhp}/${gain}`;
    roCtx.clearRect(0, 0, 512, 256);
    roCtx.textAlign = 'center';
    roCtx.fillStyle = '#ffffff';
    roCtx.font = `700 132px ${HEAD_FONT}`;
    roCtx.fillText(String(bhp), 256, 128);
    roCtx.fillStyle = '#f2ab41';
    roCtx.font = `600 44px ${HEAD_FONT}`;
    if ('letterSpacing' in roCtx) roCtx.letterSpacing = '6px';
    roCtx.fillText(gain > 0 ? `BHP  ·  +${gain}%` : 'BHP', 256, 196);
    if ('letterSpacing' in roCtx) roCtx.letterSpacing = '0px';
    roTex.needsUpdate = true;
  }
  drawReadout(0, 0);
  const readout = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65),
    new THREE.MeshBasicMaterial({ map: roTex, transparent: true, depthWrite: false }));
  readout.position.set(0, -0.82, 0.02);
  gauge.add(readout);

  // Needle
  const needlePivot = new THREE.Group();
  needlePivot.position.z = 0.07;
  const ns = new THREE.Shape();
  ns.moveTo(-0.04, -0.28); ns.lineTo(0.04, -0.28); ns.lineTo(0.012, 1.68); ns.lineTo(-0.012, 1.68); ns.closePath();
  const needle = new THREE.Mesh(new THREE.ExtrudeGeometry(ns, { depth: 0.02, bevelEnabled: false }),
    new THREE.MeshBasicMaterial({ color: glow(0xff8a2a, 2.8), toneMapped: false }));
  needlePivot.add(needle);
  gauge.add(needlePivot);
  const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.12, 48).rotateX(Math.PI / 2), M.chrome);
  capMesh.position.z = 0.12;
  gauge.add(capMesh);
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 10, 48), M.amberGlow);
  capRing.position.z = 0.185;
  gauge.add(capRing);

  // Dyno graph: stock vs remapped power
  const dyno = new THREE.Group();
  dyno.position.set(3.3, 0.15, -1.7);
  dyno.rotation.y = -0.42;
  root.add(dyno);
  const GW = 4.4, GH = 2.6;
  {
    const pts = [];
    for (let i = 0; i <= 8; i++) { const x = (i / 8) * GW; pts.push(x, 0, 0, x, GH, 0); }
    for (let j = 0; j <= 5; j++) { const y = (j / 5) * GH; pts.push(0, y, 0, GW, y, 0); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x2a303b, transparent: true, opacity: 0.9 }));
    grid.position.set(-GW / 2, -GH / 2, 0);
    dyno.add(grid);
  }
  const title = label('STAGE 1 REMAP', { height: 0.3, color: '#ffffff', weight: 700, spacing: 0.08 });
  title.position.set(-GW / 2 + 1.05, GH / 2 + 0.38, 0);
  dyno.add(title);
  const gainLabel = label('+24% POWER', { height: 0.3, color: '#f2ab41', weight: 700, spacing: 0.06, glowAmt: 1.6 });
  gainLabel.position.set(GW / 2 - 0.95, GH / 2 + 0.38, 0);
  gainLabel.material.opacity = 0;
  dyno.add(gainLabel);
  const axisX = label('ENGINE SPEED', { height: 0.12, color: '#6f7480', weight: 500, spacing: 0.16 });
  axisX.position.set(0, -GH / 2 - 0.2, 0);
  dyno.add(axisX);

  const powerAt = (x, boost) => {
    const rise = Math.pow(Math.sin(Math.min(x / 0.8, 1) * Math.PI / 2), 1.25 - boost * 0.3);
    const fall = x > 0.8 ? (x - 0.8) * 1.1 : 0;
    return (0.22 + 0.78 * rise - fall) * (1 + boost * 0.24);
  };
  const curveFor = boost => new THREE.CatmullRomCurve3(
    Array.from({ length: 41 }, (_, i) => {
      const x = i / 40;
      return new THREE.Vector3(-GW / 2 + x * GW, -GH / 2 + powerAt(x, boost) * GH * 0.72, 0.01);
    }));
  const stock = growingTube(curveFor(0), 160, 0.014, new THREE.MeshBasicMaterial({ color: 0x777d88 }));
  const remapCurve = curveFor(1);
  const remap = growingTube(remapCurve, 160, 0.026, new THREE.MeshBasicMaterial({ color: glow(AMBER, 2.8), toneMapped: false }));
  dyno.add(stock, remap);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 20), new THREE.MeshBasicMaterial({ color: glow(0xffd28a, 4), toneMapped: false }));
  dyno.add(head);
  const peak = powerAt(0.8, 1);

  let value = 0;
  return {
    group: root,
    enter() { value = 0.05; },
    update(t, dt, k) {
      const sweep = ease(clamp01((k - 0.1) / 0.5));
      value = 0.06 + 0.86 * sweep + (sweep > 0.98 ? Math.sin(t * 38) * 0.006 : 0);
      needlePivot.rotation.z = angleAt(value) - Math.PI / 2;
      trackFill.setProgress(value);
      for (const tk of ticks) tk.mat.color.copy(tk.v <= value + 0.001 ? tk.on : tk.off);

      stock.setProgress(easeOut(clamp01((k - 0.02) / 0.3)));
      const rp = clamp01((k - 0.1) / 0.5);
      remap.setProgress(ease(rp));
      remapCurve.getPoint(ease(rp), head.position);
      head.visible = rp > 0 && rp < 1;
      gainLabel.material.opacity = easeOut(clamp01((k - 0.58) / 0.12));

      const bhp = Math.round((powerAt(Math.min(value, 0.8), 1) / peak) * 186);
      drawReadout(bhp, k > 0.6 ? 24 : 0);
    },
    camera(k) {
      const e = ease(k);
      return {
        pos: new THREE.Vector3(lerp(-1.4, 3.6, e), lerp(0.5, 1.4, e), lerp(7.2, 14.8, e)),
        target: new THREE.Vector3(lerp(0, 2.0, e), lerp(0, 0.1, e), lerp(0, -0.9, e)),
      };
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Stage                                                              */
/* ------------------------------------------------------------------ */

function init() {
  const canvas = document.getElementById('hero-canvas');
  const hero = canvas.closest('.hero');
  const fadeEl = document.getElementById('hero-fade');
  const tabs = [...document.querySelectorAll('.scene-tab')];
  const bars = tabs.map(t => t.querySelector('.scene-tab__bar i'));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    document.documentElement.classList.add('no-webgl');
    return;
  }
  document.documentElement.classList.add('has-webgl');

  const mobile = matchMedia('(max-width: 860px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(INK, 16, 36);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  scene.add(new THREE.HemisphereLight(0x8899bb, INK, 0.2));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.8);
  key.position.set(4, 5, 6);
  const rim = new THREE.DirectionalLight(AMBER, 4);
  rim.position.set(-5, 2.5, -4);
  const fill = new THREE.DirectionalLight(0xaab8d8, 0.25);
  fill.position.set(-6, -1, 3);
  scene.add(key, rim, fill);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  // Warm glow behind the subject
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({
    map: radialTexture([[0, 'rgba(242,171,65,0.42)'], [0.35, 'rgba(242,140,40,0.12)'], [1, 'rgba(0,0,0,0)']]),
    transparent: true, depthWrite: false, fog: false,
  }));
  scene.add(backdrop);

  // Floating dust motes catching the light
  const DUST = mobile ? 220 : 480;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 16;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    dustPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.04, map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,220,160,0.6)'], [1, 'rgba(0,0,0,0)']]),
    color: 0xffd9a0, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  const M = makeMaterials();
  // RoomEnvironment is bright; keep reflections moody so the amber reads
  for (const m of Object.values(M)) if ('envMapIntensity' in m) m.envMapIntensity = 0.45;
  M.chrome.envMapIntensity = 0.7;
  M.steel.envMapIntensity = M.darkSteel.envMapIntensity = M.plate.envMapIntensity = 0.3;
  const shots = [buildWheel(M), buildGearbox(M), buildGauge(M)];
  shots.forEach(s => { s.group.visible = false; scene.add(s.group); });

  // Post-processing: MSAA render target + bloom for the amber glows
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.45, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Shift the frame so the subject sits beside (desktop) or above (mobile) the copy
  const debug = new URLSearchParams(location.search);
  let frameShift = { x: 0, y: 0 }, distScale = 1;
  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    const aspect = w / h;
    if (debug.has('center')) { frameShift = { x: 0, y: 0 }; distScale = Number(debug.get('dist') || 1); }
    else if (aspect > 1.15) { frameShift = { x: -0.17 * w, y: 0 }; distScale = 1; }
    else { frameShift = { x: 0, y: 0.27 * h }; distScale = aspect < 0.7 ? 1.75 : 1.35; }
    camera.setViewOffset(w, h, frameShift.x, frameShift.y, w, h);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(hero);

  // Pointer parallax
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', e => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // Timeline
  let current = -1, t = 0, queued = null;
  function show(i) {
    if (current >= 0) shots[current].group.visible = false;
    current = i;
    t = 0;
    shots[i].group.visible = true;
    shots[i].enter();
    tabs.forEach((tab, j) => {
      tab.classList.toggle('is-active', j === i);
      tab.setAttribute('aria-selected', j === i);
      bars[j].style.transform = `scaleX(${j < i ? 1 : 0})`;
    });
  }
  tabs.forEach((tab, i) => tab.addEventListener('click', () => {
    if (i === current) return;
    queued = i;
    t = Math.max(t, SHOT_LEN - FADE * 0.5); // quick fade-out, then cut
  }));
  show(0);

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
  let elapsed = 0;

  // Debug: ?frame=<shot>,<progress 0-1> renders one still frame (for screenshots)
  const still = new URLSearchParams(location.search).get('frame');
  if (still) {
    const [i, p] = still.split(',').map(Number);
    show(i);
    for (let s = 0; s < 120; s++) { elapsed += (p * SHOT_LEN) / 120; t = elapsed; shots[i].update(elapsed, (p * SHOT_LEN) / 120, clamp01(t / SHOT_LEN)); }
    t = Math.min(t, SHOT_LEN - FADE - 0.01);
    t = Math.max(t, FADE);
    elapsed -= 1e-6;
    visible = true;
    frame(true);
    window.__heroReady = true;
    return;
  }

  function frame(once) {
    if (once !== true) requestAnimationFrame(frame);
    const dt = once === true ? 0 : Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    elapsed += dt;

    const autoAdvance = !reduceMotion || queued !== null;
    t += dt;
    if (t >= SHOT_LEN) {
      if (autoAdvance) show(queued !== null ? queued : (current + 1) % shots.length);
      else t = SHOT_LEN - FADE;
      queued = null;
    }
    const k = clamp01(t / SHOT_LEN);
    const shot = shots[current];
    shot.update(elapsed, dt, k);
    renderer.toneMappingExposure = shot.exposure ?? 0.95;

    // Camera path + parallax
    pointer.sx = lerp(pointer.sx, pointer.x, 0.04);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.04);
    const { pos, target } = shot.camera(k);
    camPos.copy(pos).sub(target).multiplyScalar(distScale).add(target);
    camPos.x += pointer.sx * 0.35;
    camPos.y -= pointer.sy * 0.22;
    camTarget.copy(target);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    backdrop.position.copy(camTarget).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 5);
    backdrop.quaternion.copy(camera.quaternion);

    dust.rotation.y = elapsed * 0.02;
    dust.position.y = Math.sin(elapsed * 0.3) * 0.15;

    // Fade to black at both ends of each shot
    const fade = Math.max(1 - t / FADE, (t - (SHOT_LEN - FADE)) / FADE);
    fadeEl.style.opacity = clamp01(fade).toFixed(3);
    bars[current].style.transform = `scaleX(${k.toFixed(4)})`;

    composer.render();
  }
  frame();
}

const fontsReady = document.fonts
  ? Promise.race([
      Promise.all([
        document.fonts.load(`700 64px ${HEAD_FONT}`),
        document.fonts.load(`600 64px ${HEAD_FONT}`),
        document.fonts.load(`500 64px ${HEAD_FONT}`),
      ]),
      new Promise(r => setTimeout(r, 1500)),
    ]).catch(() => {})
  : Promise.resolve();
fontsReady.then(init);
