import * as THREE from 'three';

const canvas = document.getElementById('hero-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x121212, 0.035);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.PointLight(0xf2ab41, 90, 40); key.position.set(4, 5, 6); scene.add(key);
const rim = new THREE.PointLight(0x4a6cff, 50, 40); rim.position.set(-6, -3, 3); scene.add(rim);

// Procedural gear
function makeGear(teeth, inner, outer, depth, hole) {
  const s = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [[0, inner], [0.2, outer], [0.5, outer], [0.7, inner]];
    pts.forEach(([t, r], j) => {
      const ang = a + t * step;
      const x = Math.cos(ang) * r, y = Math.sin(ang) * r;
      (i === 0 && j === 0) ? s.moveTo(x, y) : s.lineTo(x, y);
    });
  }
  const h = new THREE.Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
  g.translate(0, 0, -depth / 2);
  return g;
}

const metal = (color, rough = 0.35) => new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: rough });
const amber = metal(0xf2ab41, 0.3), steel = metal(0x2a2e3a, 0.4), dark = metal(0x1a1c24, 0.5);

const group = new THREE.Group();
scene.add(group);

// Gear specs: teeth, inner r, outer r, depth, hole, position, material, direction
const specs = [
  { t: 24, i: 1.9, o: 2.25, d: 0.5, h: 0.8, p: [0, 0, 0], m: amber },
  { t: 12, i: 0.9, o: 1.15, d: 0.5, h: 0.35, p: [3.15, 0.2, 0], m: steel },
  { t: 16, i: 1.3, o: 1.58, d: 0.4, h: 0.5, p: [-2.4, -2.55, -0.3], m: dark },
  { t: 10, i: 0.75, o: 1.0, d: 0.4, h: 0.3, p: [1.6, -2.4, -0.2], m: amber },
  { t: 18, i: 1.45, o: 1.75, d: 0.35, h: 0.55, p: [-3.2, 2.8, -1.2], m: steel },
];
const gears = specs.map((s, idx) => {
  const mesh = new THREE.Mesh(makeGear(s.t, s.i, s.o, s.d, s.h), s.m);
  mesh.position.set(...s.p);
  mesh.userData.speed = (idx % 2 ? -1 : 1) * (0.5 / s.o) * 0.9;
  group.add(mesh);
  return mesh;
});

// Glowing ring behind main gear
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(3.1, 0.015, 16, 200),
  new THREE.MeshBasicMaterial({ color: 0xf2ab41 })
);
ring.position.z = -0.8; group.add(ring);

// Particle field
const N = 700, pos = new Float32Array(N * 3);
for (let i = 0; i < N; i++) {
  pos[i * 3] = (Math.random() - 0.5) * 30;
  pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
  pos[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
}
const pg = new THREE.BufferGeometry();
pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
const particles = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xf2ab41, size: 0.04, transparent: true, opacity: 0.7 }));
scene.add(particles);

// Layout and interaction
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const wide = w > 800;
  group.position.x = wide ? 3.2 : 0;
  group.scale.setScalar(wide ? 1 : 0.65);
  camera.position.set(0, 0, 13);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const mouse = { x: 0, y: 0 };
addEventListener('pointermove', e => {
  mouse.x = (e.clientX / innerWidth - 0.5) * 2;
  mouse.y = (e.clientY / innerHeight - 0.5) * 2;
});

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new THREE.Clock();
let visible = true;
new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

function frame() {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = clock.getDelta(), t = clock.elapsedTime;
  if (!reduced) {
    gears.forEach(g => (g.rotation.z += g.userData.speed * dt));
    particles.rotation.y += dt * 0.02;
    ring.rotation.z -= dt * 0.1;
  }
  const sy = Math.min(scrollY / innerHeight, 1);
  group.rotation.y += ((mouse.x * 0.45 - 0.35 + sy * 0.6) - group.rotation.y) * 0.05;
  group.rotation.x += ((mouse.y * 0.25) - group.rotation.x) * 0.05;
  group.position.y = Math.sin(t * 0.6) * 0.15 + sy * 1.5;
  key.position.x = 4 + Math.sin(t * 0.5) * 3;
  renderer.render(scene, camera);
}
frame();
