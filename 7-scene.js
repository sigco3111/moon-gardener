// 달의 정원사 - Three.js 복셀 정원 장면
import * as THREE from 'three';
import { PLANT_MAP, PLOT_ORDER, TERRAINS, DAY_LEN } from './data.js';

const U = 0.32; // 식물 복셀 단위
const BOX = new THREE.BoxGeometry(1, 1, 1);
const matCache = new Map();
const emissiveMats = [];
function mat(color, emissive = 0) {
  const key = color + '|' + emissive;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, emissive: emissive ? color : 0x000000, emissiveIntensity: emissive });
    if (emissive) { m.userData.base = emissive; emissiveMats.push(m); }
    matCache.set(key, m);
  }
  return m;
}
function box(g, w, h, d, x, y, z, color, em = 0) {
  const m = new THREE.Mesh(BOX, mat(color, em));
  m.scale.set(w, h, d); m.position.set(x, y + h / 2, z);
  g.add(m); return m;
}
function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}
function lerp(a, b, t) { return a + (b - a) * t; }
const KEYS = [
  [0.00, '#f0b3a0', 0.55, 0.5, 0.1, 0.2], [0.08, '#8fd3ff', 0.95, 1.0, 0.0, 0.0], [0.36, '#8fd3ff', 0.95, 1.0, 0.0, 0.0],
  [0.46, '#ff9a6a', 0.65, 0.65, 0.0, 0.0], [0.52, '#5a3a7a', 0.38, 0.12, 0.25, 0.3], [0.60, '#0b1238', 0.32, 0.0, 0.65, 1.0],
  [0.90, '#0b1238', 0.32, 0.0, 0.65, 1.0], [0.96, '#45406c', 0.38, 0.1, 0.3, 0.5], [1.00, '#f0b3a0', 0.55, 0.5, 0.1, 0.2],
].map((k) => ({ p: k[0], c: new THREE.Color(k[1]), hemi: k[2], sun: k[3], moon: k[4], stars: k[5] }));
function sky(phase) {
  let i = 0; while (i < KEYS.length - 2 && phase >= KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1]; const t = (phase - a.p) / (b.p - a.p);
  return { c: a.c.clone().lerp(b.c, t), hemi: lerp(a.hemi, b.hemi, t), sun: lerp(a.sun, b.sun, t), moon: lerp(a.moon, b.moon, t), stars: lerp(a.stars, b.stars, t) };
}

// ---------- 식물 빌더 ----------
function buildPlant(pd, stage, bloom, shiny) {
  const g = new THREE.Group();
  const green = '#4fae63', dgreen = '#2f8450';
  let c1 = pd.c1, c2 = pd.c2;
  if (shiny) { c1 = '#fff6b0'; c2 = '#ff9ae8'; }
  const H = pd.h || 1;
  if (stage === 'seed') {
    box(g, U * 3, U * 1.2, U * 3, 0, 0, 0, '#7a5530'); box(g, U, U, U, 0, U * 1.2, 0, '#e8d28a', 0.2);
    return g;
  }
  if (stage === 'sprout') {
    box(g, U, U * 3, U, 0, 0, 0, green);
    box(g, U * 2, U, U, -U * 1.5, U * 2.5, 0, '#6bd07c'); box(g, U * 2, U, U, U * 1.5, U * 3, 0, '#6bd07c');
    return g;
  }
  if (pd.id === 'weed') {
    for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; box(g, U, U * (2 + (i % 3)), U, Math.cos(a) * U * 1.6, 0, Math.sin(a) * U * 1.6, i % 2 ? '#5d7a3a' : '#7d8f4a'); }
    box(g, U * 1.5, U * 3.5, U * 1.5, 0, 0, 0, '#4a6a30'); return g;
  }
  const open = stage === 'mature' && bloom;
  const stemH = Math.round(5 * H);
  const col = open ? c1 : shade(c1, 0.55); const col2 = open ? c2 : shade(c2, 0.55);
  const em = open ? 0.55 : 0.05;
  const sh = pd.shape;
  const top = () => stemH * U;
  const stem = (n = stemH, c = green) => { for (let i = 0; i < n; i++) box(g, U, U, U, 0, i * U, 0, i % 2 ? c : dgreen); };
  const leaves = () => { box(g, U * 2, U, U, -U * 1.5, U * 2, 0, green); box(g, U * 2, U, U, U * 1.5, U * 3, 0, green); };
  if (sh === 'daisy') {
    stem(); leaves(); const y = top();
    if (open) {
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) box(g, U, U * 0.8, U, dx * U * 1.5, y, dz * U * 1.5, col, em);
      box(g, U * 1.6, U, U * 1.6, 0, y, 0, col2, em + 0.2);
    } else { box(g, U * 2, U * 2, U * 2, 0, y, 0, col, em); }
  } else if (sh === 'puff') {
    stem(); leaves(); const y = top();
    const r = open ? 1 : 0.6;
    for (let x = -1; x <= 1; x++) for (let yy = 0; yy <= 2; yy++) for (let z = -1; z <= 1; z++) {
      if (Math.abs(x) + Math.abs(z) + Math.abs(yy - 1) > 3) continue;
      box(g, U * r, U * r, U * r, x * U * r * 1.1, y + yy * U * r, z * U * r * 1.1, ((x + z + yy) & 1) ? col : col2, em);
    }
  } else if (sh === 'bush') {
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
      if (Math.abs(x) + Math.abs(z) > 3) continue; const hh = (Math.abs(x) + Math.abs(z) < 2 ? 3 : 2);
      box(g, U, U * hh, U, x * U, 0, z * U, (x + z) & 1 ? green : dgreen);
    }
    const n = open ? 9 : 3;
    for (let i = 0; i < n; i++) { const a = i * 2.4; box(g, U * 1.1, U * 1.1, U * 1.1, Math.cos(a) * U * (0.8 + (i % 3) * 0.5), U * 3, Math.sin(a) * U * (0.8 + (i % 3) * 0.5), i % 2 ? col : col2, em); }
  } else if (sh === 'tulip') {
    stem(); leaves(); const y = top();
    box(g, U * 2, U * 1.5, U * 2, 0, y, 0, col2, em);
    if (open) { for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) box(g, U, U * 2.2, U, dx * U * 1.4, y + U * 0.5, dz * U * 1.4, col, em); box(g, U * 1.4, U * 1.6, U * 1.4, 0, y + U * 1.5, 0, col, em + 0.2); }
    else box(g, U * 1.6, U * 2, U * 1.6, 0, y + U * 1.5, 0, col, em);
  } else if (sh === 'bell') {
    stem(); leaves(); const y = top();
    box(g, U * 3, U, U * 3, 0, y, 0, col, em); box(g, U * 2, U * 1.5, U * 2, 0, y - U * 1.5, 0, col2, em);
    if (open) box(g, U * 3.4, U * 0.6, U * 3.4, 0, y - U * 2.1, 0, col, em + 0.3);
    box(g, U * 0.8, U * 0.8, U * 0.8, 0, y - U * 2.4, 0, '#ffffff', open ? 1 : 0.1);
  } else if (sh === 'tree') {
    const th = Math.round(5 * H); for (let i = 0; i < th; i++) box(g, U * 1.6, U, U * 1.6, 0, i * U, 0, i % 2 ? '#7a5a3a' : '#6a4a2e');
    const y = th * U; const r = open ? 1 : 0.7;
    for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) for (let yy = 0; yy < 3; yy++) {
      const d = Math.abs(x) + Math.abs(z) + (yy === 2 ? 2 : yy === 1 ? 0 : 1);
      if (d > 3) continue;
      const lc = ((x * 3 + z * 5 + yy * 7) % 4 === 0) ? col2 : col;
      box(g, U * 1.05 * r, U * 1.05 * r, U * 1.05 * r, x * U * r, y - U * 0.5 + yy * U * r, z * U * r, open ? lc : shade(green, 1), open ? 0.35 : 0.0);
    }
    if (!open) box(g, U * 2, U * 2, U * 2, 0, y + U * 2, 0, col, 0.1);
  } else if (sh === 'tall') {
    for (const [dx, dz, hh] of [[0, 0, 6], [U * 1.6, U * 0.6, 4.5], [-U * 1.4, -U * 0.8, 5]]) {
      const n = Math.round(hh * H);
      for (let i = 0; i < n; i++) box(g, U * 1.1, U, U * 1.1, dx, i * U, dz, i % 3 === 0 ? dgreen : col, open ? 0.25 : 0);
      box(g, U * 3, U * 0.8, U * 1.2, dx, n * U - U * 1.5, dz, open ? col2 : dgreen, open ? 0.3 : 0);
    }
  } else if (sh === 'lotus') {
    box(g, U * 6, U * 0.5, U * 6, 0, 0, 0, '#3f9e66');
    box(g, U * 3, U * 1.2, U * 3, 0, U * 0.5, 0, col2, em);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) box(g, U * 1.3, open ? U * 2.6 : U * 1.5, U * 1.3, dx * U * 1.8, U * 0.5, dz * U * 1.8, col, em);
    if (open) for (const [dx, dz] of [[1, 1], [-1, -1], [1, -1], [-1, 1]]) box(g, U * 1.2, U * 1.8, U * 1.2, dx * U * 1.5, U * 0.5, dz * U * 1.5, col2, em);
    box(g, U, U, U, 0, U * 1.7, 0, '#ffffff', open ? 1 : 0.1);
  } else if (sh === 'star') {
    stem(); leaves(); const y = top();
    const pts = [[0, 0], [0, 1], [0, 2], [0, -1], [1, 0], [2, 0], [-1, 0], [-2, 0], [1, 1], [-1, 1], [0, 3], [1, -1], [-1, -1]];
    for (const [px, py] of pts) box(g, U, U, U, px * U * (open ? 1.1 : 0.7), y + (py + 1) * U * (open ? 1.1 : 0.7), 0, (px === 0 && py === 0) ? col2 : col, em + 0.1);
  } else if (sh === 'mushroom') {
    for (let i = 0; i < 3; i++) box(g, U * 1.4, U, U * 1.4, 0, i * U, 0, '#f6efe0');
    const y = 3 * U; box(g, U * 5, U, U * 5, 0, y, 0, col, em); box(g, U * 3, U, U * 3, 0, y + U, 0, col, em);
    box(g, U * 1.2, U * 1.2, U * 1.2, U * 1.2, y + U * 2, 0, col2, em + 0.3); box(g, U, U, U, -U * 1.2, y + U * 2, U * 0.8, col2, em + 0.3);
    if (open) box(g, U * 5.4, U * 0.4, U * 5.4, 0, y - U * 0.2, 0, col2, em);
  } else if (sh === 'crystal') {
    const sp = [[0, 0, 7], [U * 1.4, U, 5], [-U * 1.4, 0, 4.5], [U * 0.4, -U * 1.5, 3.5], [-U * 0.6, U * 1.5, 3]];
    sp.forEach(([dx, dz, hh], i) => { const n = open ? hh : hh * 0.6; box(g, U * 1.3, U * n, U * 1.3, dx, 0, dz, i % 2 ? col : col2, em + 0.15); box(g, U * 0.7, U, U * 0.7, dx, U * n, dz, '#ffffff', open ? 0.9 : 0.1); });
  }
  return g;
}
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }

export class GardenScene {
  constructor(canvas, st) {
    this.canvas = canvas; this.st = st;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x8fd3ff, 45, 130);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    this.orbit = { theta: 0.78, phi: 1.0, radius: 27, target: new THREE.Vector3(0, 1.2, 0), idle: 0, drag: null };
    this.t = 0; this.plotViews = []; this.fireflyOn = 0; this.petalOn = 0.5; this.moonBoost = 0; this.meteors = []; this.swarm = []; this.ripples = [];
    this.clickables = []; this.onTap = null;
    this.glow = glowTexture();
    this.initLights(); this.initSky(); this.initIsland(); this.initPlots(); this.initBuildings(); this.initFx(); this.initSkillVisuals();
    this.bindInput(); this.resize(); window.addEventListener('resize', () => this.resize());
    this.setTerrain(st.terrain);
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.aspect = w / h;
  }
  initLights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.9); this.scene.add(this.hemi);
    this.sunL = new THREE.DirectionalLight(0xfff2d0, 1); this.scene.add(this.sunL);
    this.moonL = new THREE.DirectionalLight(0x9db8ff, 0.5); this.scene.add(this.moonL);
  }
  initSky() {
    // 별
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 6.283, v = Math.acos(Math.random() * 0.95 + 0.04 - 0.0);
      const r = 150; pos[i * 3] = r * Math.sin(v) * Math.cos(u); pos[i * 3 + 1] = r * Math.cos(v); pos[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat); this.scene.add(this.stars);
    // 해
    this.sun = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 2), new THREE.MeshBasicMaterial({ color: 0xfff0b0, fog: false }));
    this.scene.add(this.sun);
    // 달 (위상 캔버스)
    this.moonCanvas = document.createElement('canvas'); this.moonCanvas.width = this.moonCanvas.height = 128;
    this.moonTex = new THREE.CanvasTexture(this.moonCanvas);
    this.moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: this.moonTex, transparent: true, fog: false, depthWrite: false }));
    this.scene.add(this.moonMesh);
    this.moonHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xcfe0ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.moonHalo.scale.set(60, 60, 1); this.scene.add(this.moonHalo);
    this.moonPhaseDrawn = -1;
    // 구름
    this.clouds = [];
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group(); const n2 = 5 + Math.floor(Math.random() * 5);
      for (let k = 0; k < n2; k++) box(g, 3 + Math.random() * 3, 1.4 + Math.random(), 3 + Math.random() * 2, k * 2.6 - n2 * 1.3, Math.random() * 0.8, (Math.random() - 0.5) * 3, '#ffffff');
      g.position.set((Math.random() - 0.5) * 160, 28 + Math.random() * 14, -40 - Math.random() * 60);
      g.userData.v = 0.6 + Math.random() * 0.8; this.scene.add(g); this.clouds.push(g);
    }
    this.cloudMats = [...matCache.values()];
  }
  drawMoon(idx, boost) {
    const key = idx + (boost > 0.5 ? 'b' : '');
    if (this.moonPhaseDrawn === key) return; this.moonPhaseDrawn = key;
    const c = this.moonCanvas.getContext('2d'); c.clearRect(0, 0, 128, 128);
    const R = 52, cx = 64, cy = 64;
    // 픽셀(복셀) 느낌의 달
    const lit = [0.0, 0.18, 0.5, 1.0, 0.5, 0.18][idx]; const waning = idx >= 4;
    const full = boost > 0.5 ? 1 : lit;
    for (let y = -R; y <= R; y += 4) for (let x = -R; x <= R; x += 4) {
      if (x * x + y * y > R * R) continue;
      let on;
      if (full >= 0.99) on = true; else {
        const edge = Math.sqrt(R * R - y * y); const k = 1 - 2 * full; // k: 1(new)→-1(full)
        const xx = waning ? -x : x; // 우측이 밝은 쪽
        on = xx > k * edge * -1 + (full < 0.5 ? edge * (1 - 2 * full) * 0 : 0) ? (full < 0.5 ? xx > edge * (1 - 2 * full) : xx > -edge * (2 * full - 1)) : false;
      }
      c.fillStyle = on ? ((x + y) % 8 === 0 ? '#fff8d6' : '#fffbe8') : 'rgba(30,40,80,0.55)';
      c.fillRect(cx + x - 2, cy + y - 2, 4, 4);
    }
    this.moonTex.needsUpdate = true;
  }
  initIsland() {
    const layers = [[24, 0], [22, -1], [19, -2], [15, -3], [11, -4], [8, -5], [5, -6], [3, -7]];
    const list = [];
    for (const [size, y] of layers) {
      const h = size / 2; const r = h + 0.6 - (y === 0 ? 0 : 0.2);
      for (let x = 0; x < size; x++) for (let z = 0; z < size; z++) {
        const cx = x - h + 0.5, cz = z - h + 0.5;
        const d = Math.pow(Math.abs(cx) / h, 2.8) + Math.pow(Math.abs(cz) / h, 2.8);
        if (d > 1.02) continue;
        list.push([cx, y - 0.5, cz, y]);
      }
    }
    this.voxels = list;
    this.islandMesh = new THREE.InstancedMesh(BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), list.length);
    this.scene.add(this.islandMesh);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ visible: false }));
    this.ground.rotation.x = -Math.PI / 2; this.ground.position.y = 0; this.scene.add(this.ground);
  }
  setTerrain(id) {
    const t = TERRAINS[id] || TERRAINS.basic; this.terrainId = id;
    const m = new THREE.Matrix4(); const col = new THREE.Color();
    this.voxels.forEach((v, i) => {
      m.makeTranslation(v[0], v[1], v[2]); this.islandMesh.setMatrixAt(i, m);
      if (v[3] === 0) col.set(t.ground[(Math.abs(Math.floor(v[0] * 7 + v[2] * 13)) + i) % 3]);
      else if (v[3] >= -1) col.set(t.side); else col.set(t.deep).multiplyScalar(0.85 + ((i * 37) % 10) / 70);
      this.islandMesh.setColorAt(i, col);
    });
    this.islandMesh.instanceMatrix.needsUpdate = true; this.islandMesh.instanceColor.needsUpdate = true;
    if (this.decor) this.updateDecor(id);
  }
  initPlots() {
    this.plotGroup = new THREE.Group(); this.scene.add(this.plotGroup);
    this.pickables = [];
    this.selRing = new THREE.Group();
    const rc = '#ffe9a0'; box(this.selRing, 2.1, 0.08, 0.1, 0, 0, 1.0, rc, 1); box(this.selRing, 2.1, 0.08, 0.1, 0, 0, -1.0, rc, 1); box(this.selRing, 0.1, 0.08, 2.1, 1.0, 0, 0, rc, 1); box(this.selRing, 0.1, 0.08, 2.1, -1.0, 0, 0, rc, 1);
    this.selRing.visible = false; this.scene.add(this.selRing);
    for (const p of PLOT_ORDER) {
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z); this.plotGroup.add(g);
      const soil = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: '#8a6a44' }));
      soil.scale.set(1.9, 0.14, 1.9); soil.position.y = 0.07; soil.userData.plot = p.idx; g.add(soil);
      const locked = new THREE.Group();
      for (let k = 0; k < 6; k++) { const a = k * 1.1 + p.idx; box(locked, 0.3, 0.3 + (k % 3) * 0.15, 0.3, Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55, k % 2 ? '#3f8a52' : '#2f7a46'); }
      locked.children.forEach((c) => { c.userData.plot = p.idx; }); g.add(locked);
      const holder = new THREE.Group(); holder.position.y = 0.14; g.add(holder);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.set(2.2, 2.2, 1); glow.position.y = 1.0; g.add(glow);
      const water = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: '#7ad0ff', transparent: true, opacity: 0.0 }));
      water.scale.set(1.9, 0.02, 1.9); water.position.y = 0.16; g.add(water);
      this.pickables.push(soil, ...locked.children);
      this.plotViews.push({ g, soil, locked, holder, glow, water, key: '', obj: null, grow: 0 });
    }
  }
  initBuildings() {
    const b = (this.bld = {});
    // 연못
    b.pond = new THREE.Group(); b.pond.position.set(-9.3, 0, 1.6);
    box(b.pond, 4.6, 0.3, 6.4, 0, -0.05, 0, '#9a9a96'); // 테두리
    const wm = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color: '#4aa8e8', transparent: true, opacity: 0.85, emissive: '#2a6ab0', emissiveIntensity: 0.35 }));
    wm.scale.set(3.9, 0.12, 5.7); wm.position.y = 0.2; b.pond.add(wm); this.pondWater = wm;
    for (const [x, z] of [[-0.8, -1.5], [0.9, 1.8], [-0.6, 1.2]]) box(b.pond, 0.7, 0.06, 0.7, x, 0.26, z, '#3f9e66');
    box(b.pond, 0.3, 0.3, 0.3, -0.6, 0.32, 1.2, '#ffc4e0', 0.3);
    this.scene.add(b.pond);
    // 다리
    b.bridge = new THREE.Group(); b.bridge.position.set(-9.3, 0, 1.6);
    for (let i = -4; i <= 4; i++) { const hh = 0.45 - Math.abs(i) * 0.06 + 0.2; box(b.bridge, 1.6, 0.14, 0.62, 0, hh, i * 0.68, '#a8683a'); }
    for (const sx of [-0.85, 0.85]) for (let i = -4; i <= 4; i += 2) box(b.bridge, 0.12, 0.6, 0.12, sx, 0.6 - Math.abs(i) * 0.06, i * 0.68, '#7a4a28');
    for (const sx of [-0.85, 0.85]) box(b.bridge, 0.1, 0.1, 5.7, sx, 1.1, 0, '#c8884a');
    box(b.bridge, 0.1, 0.1, 0.1, 0, 0, 0, '#000000'); b.bridge.children.pop();
    this.scene.add(b.bridge);
    // 석등
    b.lanterns = [];
    [[7.6, 6.6], [-7.2, 7.6], [7.6, -6.4], [-7.2, -6.4]].forEach(([x, z]) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      box(g, 0.9, 0.3, 0.9, 0, 0, 0, '#9a9a98'); box(g, 0.4, 1.0, 0.4, 0, 0.3, 0, '#b4b4b0');
      box(g, 0.9, 0.7, 0.9, 0, 1.3, 0, '#ffd27a', 1.0); box(g, 1.3, 0.25, 1.3, 0, 2.0, 0, '#8a8a88'); box(g, 0.5, 0.3, 0.5, 0, 2.25, 0, '#a0a09c');
      const l = new THREE.PointLight(0xffc860, 0.0, 9, 1.6); l.position.y = 1.6; g.add(l); g.userData.light = l;
      g.visible = false; this.scene.add(g); b.lanterns.push(g);
    });
    // 탑
    b.pagoda = new THREE.Group(); b.pagoda.position.set(0, 0, -9.6); this.scene.add(b.pagoda);
    box(b.pagoda, 4.4, 0.5, 4.4, 0, 0, 0, '#8e8a84'); box(b.pagoda, 3.6, 0.3, 3.6, 0, 0.5, 0, '#a09c94');
    b.pagodaLv = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group(); const y = 0.8 + i * 1.7; const w = 3.0 - i * 0.4;
      box(g, w, 1.0, w, 0, y, 0, i % 2 ? '#c8402e' : '#b8362a'); box(g, w * 0.35, 0.7, 0.06, 0, y + 0.15, w / 2 + 0.01, '#ffd890', 0.8);
      box(g, w + 1.2, 0.18, w + 1.2, 0, y + 1.0, 0, '#3a3e5a'); box(g, w + 0.5, 0.25, w + 0.5, 0, y + 1.18, 0, '#4a4e72');
      box(g, w - 0.4, 0.2, w - 0.4, 0, y + 1.43, 0, '#5a5e84'); g.visible = false; b.pagoda.add(g); b.pagodaLv.push(g);
    }
    b.pagodaTop = new THREE.Group(); box(b.pagodaTop, 0.2, 1.2, 0.2, 0, 0, 0, '#ffd36b', 0.7); b.pagoda.add(b.pagodaTop);
    b.pagoda.visible = false;
    // 수호수
    b.guard = new THREE.Group(); b.guard.position.set(9, 0, -8.6); b.guard.scale.setScalar(0.65); this.scene.add(b.guard); b.guardLv = -1;
    // 연금술 솥
    b.cauldron = new THREE.Group(); b.cauldron.position.set(8.2, 0, 2.6);
    box(b.cauldron, 1.8, 0.2, 1.8, 0, 0, 0, '#555555'); box(b.cauldron, 1.5, 1.0, 1.5, 0, 0.2, 0, '#2d2d38'); box(b.cauldron, 1.7, 0.2, 1.7, 0, 1.2, 0, '#3a3a48');
    box(b.cauldron, 1.2, 0.1, 1.2, 0, 1.25, 0, '#7fffb0', 1.0); for (const [x, z] of [[-.7, -.7], [.7, -.7], [-.7, .7], [.7, .7]]) box(b.cauldron, 0.2, 0.3, 0.2, x, -0.0, z, '#3a2a1a');
    const cl = new THREE.PointLight(0x7fffb0, 0.0, 8, 1.6); cl.position.y = 1.6; b.cauldron.add(cl); b.cauldron.userData.light = cl;
    b.cauldron.visible = false; this.scene.add(b.cauldron);
    this.decor = new THREE.Group(); this.scene.add(this.decor); this.buildDecor();
  }
  buildDecor() {
    const mk = (name, fn) => { const g = new THREE.Group(); fn(g); g.visible = false; this.decor.add(g); this.decor[name] = g; };
    mk('moss', (g) => { for (let i = 0; i < 18; i++) { const a = i * 2.39, r = 7.4 + (i % 4) * 1.1; box(g, 1.2 + (i % 3) * 0.4, 0.5 + (i % 3) * 0.25, 1.2, Math.cos(a) * r, 0, Math.sin(a) * r, i % 2 ? '#3f8f52' : '#2f7a46'); if (i % 3 === 0) { box(g, 0.14, 0.4, 0.14, Math.cos(a) * r, 0.9, Math.sin(a) * r, '#f6efe0'); box(g, 0.5, 0.2, 0.5, Math.cos(a) * r, 1.25, Math.sin(a) * r, '#a6ffb8', 0.6); } } });
    mk('crystal', (g) => { for (let i = 0; i < 16; i++) { const a = i * 2.39 + 1, r = 7.8 + (i % 4) * 1.0; const h = 1 + (i % 4) * 0.8; box(g, 0.6, h, 0.6, Math.cos(a) * r, 0, Math.sin(a) * r, i % 2 ? '#bfe6ff' : '#8fd0ff', 0.7); } });
    mk('cloud', (g) => { for (let i = 0; i < 14; i++) { const a = i * 2.39, r = 8 + (i % 4) * 1.1; box(g, 1.6, 0.9, 1.6, Math.cos(a) * r, 0, Math.sin(a) * r, '#ffffff', 0.25); box(g, 1.0, 0.7, 1.0, Math.cos(a) * r + 0.4, 0.9, Math.sin(a) * r, '#ffffff', 0.25); } });
  }
  updateDecor(id) { for (const k of ['moss', 'crystal', 'cloud']) this.decor[k].visible = (k === id); }
  buildGuard(L) {
    const g = this.bld.guard; while (g.children.length) g.remove(g.children[0]);
    if (L <= 0) return; const s = 0.7 + L * 0.06; const th = 3 + L * 0.5;
    for (let i = 0; i < th * 2; i++) box(g, 1.1 * s, 0.5, 1.1 * s, 0, i * 0.5, 0, i % 2 ? '#7a5a3a' : '#6a4a2e');
    const y = th; const R = 1.6 + Math.min(L, 8) * 0.25;
    for (let x = -R; x <= R; x += 0.9) for (let z = -R; z <= R; z += 0.9) for (let yy = 0; yy < 3; yy++) {
      const d = Math.hypot(x, z) / R + yy * 0.25; if (d > 1) continue;
      box(g, 0.95, 0.95, 0.95, x, y + yy * 0.9, z, ((x * 3 + z * 5 + yy) | 0) % 3 === 0 ? '#8ff0c0' : '#4fc88a', 0.35);
    }
    const l = new THREE.PointLight(0x9fffd0, 0.7, 14, 1.5); l.position.y = y + 2; g.add(l);
  }
  syncBuildings(st) {
    const b = this.bld;
    b.pond.visible = st.buildings.pond > 0; b.bridge.visible = st.buildings.bridge > 0;
    b.lanterns.forEach((l, i) => { l.visible = st.buildings.lantern > i; });
    b.pagoda.visible = st.buildings.pagoda > 0;
    b.pagodaLv.forEach((l, i) => { l.visible = st.buildings.pagoda > i; });
    b.pagodaTop.position.y = 0.8 + st.buildings.pagoda * 1.7 + 0.5;
    if (b.guardLv !== st.auto.guard) { b.guardLv = st.auto.guard; this.buildGuard(st.auto.guard); }
    b.cauldron.visible = !!st.skills.a1;
    this.updateDecor(st.terrain);
    this.fireflyTarget = st.auto.firefly > 0 ? Math.min(60, 8 + st.auto.firefly * 4) : 6;
    this.syncSkillVisuals(st);
  }
  // ---------- 이펙트 ----------
  initFx() {
    // 벚꽃비
    const n = 260; this.petalN = n; this.petalPos = new Float32Array(n * 3); this.petalSeed = new Float32Array(n);
    for (let i = 0; i < n; i++) { this.petalPos[i * 3] = (Math.random() - 0.5) * 36; this.petalPos[i * 3 + 1] = Math.random() * 22; this.petalPos[i * 3 + 2] = (Math.random() - 0.5) * 36; this.petalSeed[i] = Math.random() * 6.28; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(this.petalPos, 3));
    this.petalMat = new THREE.PointsMaterial({ color: 0xffb8d4, size: 0.34, transparent: true, opacity: 0.9, depthWrite: false });
    this.petals = new THREE.Points(pg, this.petalMat); this.petals.frustumCulled = false; this.scene.add(this.petals); this.petalGeo = pg;
    // 반딧불
    const fn = 70; this.fireN = fn; this.firePos = new Float32Array(fn * 3); this.fireSeed = [];
    for (let i = 0; i < fn; i++) this.fireSeed.push({ a: Math.random() * 6.28, r: 3 + Math.random() * 10, y: 0.6 + Math.random() * 4, s: 0.2 + Math.random() * 0.5, p: Math.random() * 6.28 });
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(this.firePos, 3)); fg.setDrawRange(0, 6);
    this.fireMat = new THREE.PointsMaterial({ color: 0xd8ff7a, size: 0.7, map: this.glow, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.fires = new THREE.Points(fg, this.fireMat); this.fires.frustumCulled = false; this.scene.add(this.fires); this.fireGeo = fg;
    // 입자 풀
    const pn = 400; this.partN = pn; this.partPos = new Float32Array(pn * 3); this.partCol = new Float32Array(pn * 3); this.partVel = new Float32Array(pn * 3); this.partLife = new Float32Array(pn); this.partCur = 0;
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(this.partPos, 3)); gg.setAttribute('color', new THREE.BufferAttribute(this.partCol, 3));
    this.partMat = new THREE.PointsMaterial({ size: 0.55, map: this.glow, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.parts = new THREE.Points(gg, this.partMat); this.parts.frustumCulled = false; this.scene.add(this.parts); this.partGeo = gg;
    for (let i = 0; i < pn; i++) { this.partPos[i * 3 + 1] = -100; }
    // 큰 반딧불(보름달 이벤트)
    this.swarmGroup = new THREE.Group(); this.scene.add(this.swarmGroup);
  }
  burst(x, y, z, color = '#ffe8a0', n = 14, spread = 2.2, up = 2.5) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.partCur; this.partCur = (this.partCur + 1) % this.partN;
      this.partPos[i * 3] = x; this.partPos[i * 3 + 1] = y; this.partPos[i * 3 + 2] = z;
      const a = Math.random() * 6.283, r = Math.random() * spread;
      this.partVel[i * 3] = Math.cos(a) * r; this.partVel[i * 3 + 1] = up * (0.4 + Math.random()); this.partVel[i * 3 + 2] = Math.sin(a) * r;
      this.partCol[i * 3] = c.r; this.partCol[i * 3 + 1] = c.g; this.partCol[i * 3 + 2] = c.b; this.partLife[i] = 0.7 + Math.random() * 0.7;
    }
  }
  ripple(x, z, big = false, color = '#fff0b0') {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.3, z); m.userData = { t: 0, max: big ? 7 : 3 }; this.scene.add(m); this.ripples.push(m);
  }
  spawnMeteor() {
    const g = new THREE.Group();
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xbfe8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); head.scale.set(7, 7, 1); g.add(head);
    for (let i = 1; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0x9fd0ff, transparent: true, opacity: 0.7 - i * 0.08, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); s.scale.set(5 - i * 0.5, 5 - i * 0.5, 1); s.position.set(i * 2.2, i * 1.2, 0); g.add(s); }
    const x0 = (Math.random() - 0.2) * 70 - 10, z0 = -40 - Math.random() * 40;
    g.position.set(x0, 45 + Math.random() * 20, z0); g.userData = { v: new THREE.Vector3(-18 - Math.random() * 10, -12 - Math.random() * 6, 6), life: 5 };
    this.scene.add(g); this.meteors.push(g);
  }
  spawnSwarm() {
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xf4ff8a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.scale.set(2.6, 2.6, 1); g.userData = { a: Math.random() * 6.28, r: 5 + Math.random() * 7, y: 1.5 + Math.random() * 3, s: 0.3 + Math.random() * 0.3, life: 25 };
    this.swarmGroup.add(g); this.swarm.push(g);
  }
  // ---------- 스킬 시각 ----------
  initSkillVisuals() {
    const v = (this.sv = {}); const add = (id, obj) => { obj.visible = false; this.scene.add(obj); v[id] = obj; return obj; };
    // 달빛 강화
    const ring = new THREE.Mesh(new THREE.TorusGeometry(12, 0.12, 6, 90), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.28 })); ring.rotation.x = Math.PI / 2; ring.position.y = 9; add('m1', ring);
    const sp = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0.5, map: this.glow, color: 0xfff0b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const spp = new Float32Array(90 * 3); for (let i = 0; i < 90; i++) { spp[i * 3] = (Math.random() - 0.5) * 24; spp[i * 3 + 1] = Math.random() * 10 + 1; spp[i * 3 + 2] = (Math.random() - 0.5) * 24; } sp.geometry.setAttribute('position', new THREE.BufferAttribute(spp, 3)); sp.frustumCulled = false; add('m3', sp);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 2.2, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); pillar.position.y = 20; add('m5', pillar);
    const orbs = new THREE.Group(); for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xffe9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(2.2, 2.2, 1); orbs.add(s); } add('m6', orbs);
    // 정원술
    const moss = new THREE.Group(); for (const p of PLOT_ORDER) { box(moss, 0.5, 0.18, 0.5, p.x + 1.05, 0.0, p.z + 0.3, '#3f9a52'); box(moss, 0.4, 0.2, 0.4, p.x - 0.7, 0.0, p.z - 1.0, '#58b86a'); } add('g1', moss);
    const dew = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0.28, map: this.glow, color: 0xbfeaff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const dp = new Float32Array(120 * 3); for (let i = 0; i < 120; i++) { dp[i * 3] = (Math.random() - 0.5) * 20; dp[i * 3 + 1] = 0.25; dp[i * 3 + 2] = (Math.random() - 0.5) * 20; } dew.geometry.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dew.frustumCulled = false; add('g2', dew);
    const roots = new THREE.Group(); for (let i = 0; i < 6; i++) { box(roots, 11.5, 0.05, 0.12, 0, 0.17, (i - 2.5) * 2, '#8fffc0', 0.8); box(roots, 0.12, 0.05, 11.5, (i - 2.5) * 2, 0.17, 0, '#8fffc0', 0.8); } add('g5', roots);
    const path = new THREE.Group(); for (let i = 0; i < 9; i++) box(path, 1.1, 0.12, 0.8, Math.sin(i * 0.7) * 0.8, 0.0, -6.8 - i * 0.0 + (i - 3) * 0.0 + 8 + i * 0.7 - 12, '#b8b4a8'); path.position.set(0, 0, 0); add('g6', path);
    const lamps = new THREE.Group(); for (const [x, z] of [[-6.4, -6.4], [6.4, -6.4], [-6.4, 6.4], [6.4, 6.4], [0, 6.8], [0, -6.4]]) { box(lamps, 0.18, 0.7, 0.18, x, 0, z, '#8a8a88'); box(lamps, 0.4, 0.4, 0.4, x, 0.7, z, '#ffd890', 1); } lamps.position.y = 0; this.sv.g6.add(lamps);
    // 연금술
    const shelf = new THREE.Group(); shelf.position.set(10.2, 0, 2.2); box(shelf, 0.4, 1.6, 2.2, 0, 0, 0, '#7a5230'); for (let i = 0; i < 5; i++) box(shelf, 0.3, 0.4, 0.3, 0.3, 0.3 + (i % 2) * 0.7, -0.8 + i * 0.4, ['#ff6aa0', '#6affd0', '#ffd36b', '#8fa6ff', '#c98bff'][i], 0.7); add('a2', shelf);
    const twin = new THREE.Group(); for (let i = 0; i < 2; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: i ? 0xc59bff : 0x7fffb0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.set(1.4, 1.4, 1); twin.add(s); } twin.position.set(8.2, 0, 2.6); add('a3', twin);
    const runes = new THREE.Group(); for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xc59bff })); m.scale.set(0.3, 0.3, 0.3); runes.add(m); } runes.position.set(8.2, 0, 2.6); add('a4', runes);
    const comp = new THREE.Group(); comp.position.set(10.3, 0, -0.6); for (let i = 0; i < 9; i++) box(comp, 0.5 + (i % 3) * 0.2, 0.25, 0.5, (i % 3) * 0.4 - 0.4, Math.floor(i / 3) * 0.22, (i % 2) * 0.3, i % 2 ? '#4a3a22' : '#5a4a2a'); add('a5', comp);
    const circ = new THREE.Group(); const cr = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.1, 6, 80), new THREE.MeshBasicMaterial({ color: 0xc59bff, transparent: true, opacity: 0.8 })); cr.rotation.x = Math.PI / 2; cr.position.y = 0.22; circ.add(cr);
    const cr2 = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.07, 6, 70), new THREE.MeshBasicMaterial({ color: 0x7fffb0, transparent: true, opacity: 0.7 })); cr2.rotation.x = Math.PI / 2; cr2.position.y = 0.22; circ.add(cr2);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const rb = new THREE.Mesh(BOX, new THREE.MeshBasicMaterial({ color: 0xe6d0ff })); rb.scale.set(0.9, 0.05, 0.25); rb.position.set(Math.cos(a) * 9, 0.23, Math.sin(a) * 9); rb.rotation.y = -a; circ.add(rb); }
    add('a6', circ);
    // 액티브: 거대한 보름달 오라
    this.bigMoonAura = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0xffe9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.bigMoonAura.scale.set(90, 90, 1); this.scene.add(this.bigMoonAura);
  }
  syncSkillVisuals(st) { for (const id of Object.keys(this.sv)) this.sv[id].visible = !!st.skills[id]; }
  // ---------- 입력 ----------
  bindInput() {
    const c = this.canvas; const o = this.orbit; const pts = new Map();
    let pinch = 0;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      o.drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() }; o.idle = 0;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    c.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); o.idle = 0;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); o.radius = Math.min(45, Math.max(12, o.radius * (pinch / d))); pinch = d; if (o.drag) o.drag.moved = 99; return; }
      if (!o.drag) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y; o.drag.moved += Math.abs(dx) + Math.abs(dy);
      if (o.drag.moved > 8) { o.theta -= dx * 0.006; o.phi = Math.min(1.4, Math.max(0.3, o.phi - dy * 0.005)); }
    });
    const up = (e) => {
      const had = pts.has(e.pointerId); pts.delete(e.pointerId);
      if (had && o.drag && o.drag.moved <= 8 && e.type === 'pointerup') this.handleTap(e.clientX, e.clientY);
      if (pts.size === 0) o.drag = null;
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); o.radius = Math.min(45, Math.max(12, o.radius * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive: false });
  }
  screenOf(v) { const p = v.clone().project(this.camera); const r = this.canvas.getBoundingClientRect(); return { x: (p.x * 0.5 + 0.5) * r.width + r.left, y: (-p.y * 0.5 + 0.5) * r.height + r.top, z: p.z }; }
  handleTap(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    // 유성/큰 반딧불 우선
    const hitList = [];
    for (const m of this.meteors) hitList.push({ kind: 'meteor', obj: m, v: m.position });
    for (const s of this.swarm) hitList.push({ kind: 'swarm', obj: s, v: s.position });
    let best = null, bd = 56;
    for (const h of hitList) { const p = this.screenOf(h.v); if (p.z > 1) continue; const d = Math.hypot(p.x - cx, p.y - cy); if (d < bd) { bd = d; best = h; } }
    if (best) { if (this.onSpecial) this.onSpecial(best.kind, best.obj, cx, cy); return; }
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, this.camera);
    let plot = null, point = null;
    const hits = rc.intersectObjects(this.pickables, false);
    if (hits.length) { plot = hits[0].object.userData.plot; point = hits[0].point; }
    if (!point) { const gh = rc.intersectObject(this.ground, false); if (gh.length) point = gh[0].point; }
    // 식물 클릭도 화단으로 인식 (식물 메시는 화단 그룹의 자식)
    if (plot == null) {
      const ph = rc.intersectObjects(this.plotViews.map((v) => v.holder), true);
      if (ph.length) { let o = ph[0].object; while (o && !o.userData.plotIdx && o.parent) o = o.parent; }
    }
    if (plot == null && point) { // 가까운 화단 찾기
      let bi = -1, bdist = 1.6; for (const v of this.plotViews) { const d = Math.hypot(v.g.position.x - point.x, v.g.position.z - point.z); if (d < bdist) { bdist = d; bi = this.plotViews.indexOf(v); } }
      if (bi >= 0) plot = bi;
    }
    if (this.onTap) this.onTap({ plot, point, x: cx, y: cy });
  }
  // ---------- 갱신 ----------
  stageOf(pl) { if (pl.id === 'weed') return pl.prog >= 1 ? 'mature' : (pl.prog < 0.3 ? 'sprout' : 'bud'); return pl.prog < 0.2 ? 'seed' : pl.prog < 0.5 ? 'sprout' : pl.prog < 1 ? 'bud' : 'mature'; }
  update(dt, st, e, flags) {
    this.t += dt; const t = this.t; const o = this.orbit;
    // 카메라
    o.idle += dt; if (!o.drag && o.idle > 4) o.theta += dt * 0.025;
    const fit = Math.max(1, 0.85 / this.aspect); const rad = o.radius * fit;
    this.camera.position.set(o.target.x + rad * Math.sin(o.phi) * Math.sin(o.theta), o.target.y + rad * Math.cos(o.phi), o.target.z + rad * Math.sin(o.phi) * Math.cos(o.theta));
    this.camera.lookAt(o.target);
    // 하늘
    this.moonBoost += ((st.act.moon > 0 ? 1 : 0) - this.moonBoost) * Math.min(1, dt * 2);
    const sk = sky(e.phase); const night = Math.max(0, Math.min(1, sk.stars)); this.nightF = night;
    const bg = sk.c.clone(); if (this.moonBoost > 0.01) bg.lerp(new THREE.Color('#2a2a6a'), this.moonBoost * 0.5);
    this.scene.background = bg; this.scene.fog.color.copy(bg);
    this.hemi.intensity = sk.hemi * 1.15 + this.moonBoost * 0.3; this.hemi.color.copy(bg).lerp(new THREE.Color('#ffffff'), 0.6); this.hemi.groundColor.set('#556070');
    this.sunL.intensity = sk.sun * 1.0; this.sunL.color.set(e.tod === 'dusk' ? '#ffb070' : '#fff2d0');
    this.moonL.intensity = (sk.moon * (e.full ? 1.4 : 1) + this.moonBoost * 0.8) * 0.9;
    const ang = e.phase * Math.PI * 2; const R = 120;
    const sunP = new THREE.Vector3(Math.cos(ang) * R, Math.sin(ang) * R * 0.85, -45);
    const moonP = new THREE.Vector3(-Math.cos(ang) * R, -Math.sin(ang) * R * 0.85, -45);
    if (this.moonBoost > 0.05) moonP.lerp(new THREE.Vector3(-10, 62, -70), this.moonBoost);
    this.sun.position.copy(sunP); this.sun.visible = sunP.y > -10; this.sun.lookAt(this.camera.position);
    this.sunL.position.copy(sunP).normalize().multiplyScalar(50); this.moonL.position.copy(moonP).normalize().multiplyScalar(50);
    this.moonMesh.position.copy(moonP); this.moonMesh.lookAt(this.camera.position);
    const msc = 1 + this.moonBoost * 2.2 + (e.full ? 0.25 : 0) + (st.skills.m4 ? 0.1 : 0); this.moonMesh.scale.set(msc, msc, 1);
    this.moonMesh.visible = moonP.y > -12; this.drawMoon(e.moonIdx, this.moonBoost);
    this.moonHalo.position.copy(moonP); this.moonHalo.material.opacity = (sk.moon > 0.1 ? 0.35 : 0.1) * (e.full ? 1.6 : 1) + (st.skills.m4 ? 0.25 : 0) + this.moonBoost * 0.4;
    const hs = 45 + (st.skills.m4 ? 25 : 0) + this.moonBoost * 40 + (e.full ? 12 : 0); this.moonHalo.scale.set(hs, hs, 1);
    this.bigMoonAura.position.copy(moonP); this.bigMoonAura.material.opacity = this.moonBoost * 0.55;
    this.starMat.opacity = night * (0.8 + 0.2 * Math.sin(t * 2)); this.stars.rotation.y += dt * 0.004;
    this.clouds.forEach((c, i) => { c.position.x += c.userData.v * dt; if (c.position.x > 100) c.position.x = -100; c.children.forEach((m) => { m.material.emissive && m.material.emissive.setScalar(0); }); });
    const dayF = 1 - night; for (const m of this.cloudMats) { if (m.color && m.color.getHexString() === 'ffffff' && !m.emissiveIntensity) m.color.setScalar(0.25 + 0.75 * dayF); }
    // 발광 재질 (밤에 더 밝게)
    for (const m of emissiveMats) m.emissiveIntensity = m.userData.base * (0.55 + 0.9 * night);
    this.pondWater.material.emissiveIntensity = 0.25 + night * 0.5; this.pondWater.position.y = 0.2 + Math.sin(t * 1.5) * 0.015;
    for (const l of this.bld.lanterns) l.userData.light.intensity = (0.2 + night * 1.2 + (e.tod === 'dusk' ? 0.6 : 0)) * 1.5;
    this.bld.cauldron.userData.light.intensity = 0.6 + Math.sin(t * 3) * 0.2;
    // 화단
    for (let i = 0; i < this.plotViews.length; i++) this.updatePlot(i, st, e, t);
    // 선택
    if (flags.selected != null && flags.selected < st.plotCount) { const p = PLOT_ORDER[flags.selected]; this.selRing.visible = true; this.selRing.position.set(p.x, 0.17 + Math.sin(t * 5) * 0.03, p.z); const s = 1 + Math.sin(t * 4) * 0.02; this.selRing.scale.set(s, 1, s); } else this.selRing.visible = false;
    // 벚꽃비
    const petalTarget = (e.tod === 'night' ? 0.35 : 1) * (0.5 + 0.12 * (st.skills.g4 ? 3 : 0) + (st.skills.g4 ? 0.6 : 0)); this.petalOn += (petalTarget - this.petalOn) * dt;
    this.petalGeo.setDrawRange(0, Math.floor(this.petalN * Math.min(1, this.petalOn)));
    for (let i = 0; i < this.petalN; i++) {
      let y = this.petalPos[i * 3 + 1] - dt * (0.9 + (i % 5) * 0.12); const s = this.petalSeed[i];
      if (y < 0.2) { y = 18 + Math.random() * 6; this.petalPos[i * 3] = (Math.random() - 0.5) * 36; this.petalPos[i * 3 + 2] = (Math.random() - 0.5) * 36; }
      this.petalPos[i * 3 + 1] = y; this.petalPos[i * 3] += Math.sin(t * 0.8 + s) * dt * 0.7 + dt * 0.4; this.petalPos[i * 3 + 2] += Math.cos(t * 0.6 + s) * dt * 0.4;
      if (this.petalPos[i * 3] > 18) this.petalPos[i * 3] = -18;
    }
    this.petalGeo.attributes.position.needsUpdate = true; this.petalMat.opacity = 0.35 + 0.6 * dayF + 0.2 * night; this.petalMat.color.set(e.tod === 'night' ? '#c8a0e0' : '#ffb8d4');
    // 반딧불
    const wantF = this.fireflyTarget || 6; const active = Math.floor(wantF * (e.night ? 1 : e.tod === 'dusk' ? 0.7 : 0.15)); this.fireGeo.setDrawRange(0, Math.min(this.fireN, active));
    for (let i = 0; i < this.fireN; i++) { const s = this.fireSeed[i]; const a = s.a + t * s.s * 0.4; this.firePos[i * 3] = Math.cos(a) * s.r + Math.sin(t * 0.7 + s.p) * 1.2; this.firePos[i * 3 + 1] = s.y + Math.sin(t * s.s * 2 + s.p) * 0.8; this.firePos[i * 3 + 2] = Math.sin(a) * s.r + Math.cos(t * 0.5 + s.p) * 1.2; }
    this.fireGeo.attributes.position.needsUpdate = true; this.fireMat.opacity = 0.35 + 0.55 * Math.max(night, e.tod === 'dusk' ? 0.7 : 0) * (0.8 + 0.2 * Math.sin(t * 3));
    // 큰 반딧불
    for (let i = this.swarm.length - 1; i >= 0; i--) { const s = this.swarm[i]; const u = s.userData; u.life -= dt; u.a += dt * u.s * 0.35; s.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * 2 + u.a * 5) * 0.6, Math.sin(u.a) * u.r); s.scale.setScalar(2.4 + Math.sin(t * 6 + i) * 0.4); if (u.life <= 0) { this.swarmGroup.remove(s); this.swarm.splice(i, 1); } }
    // 유성
    for (let i = this.meteors.length - 1; i >= 0; i--) { const m = this.meteors[i]; m.position.addScaledVector(m.userData.v, dt); m.userData.life -= dt; if (m.userData.life <= 0) { this.scene.remove(m); this.meteors.splice(i, 1); } }
    // 파문
    for (let i = this.ripples.length - 1; i >= 0; i--) { const r = this.ripples[i]; r.userData.t += dt * 1.6; const k = r.userData.t; r.scale.setScalar(1 + k * r.userData.max); r.material.opacity = Math.max(0, 0.9 - k); if (k >= 1) { this.scene.remove(r); r.geometry.dispose(); r.material.dispose(); this.ripples.splice(i, 1); } }
    // 입자
    for (let i = 0; i < this.partN; i++) { if (this.partLife[i] <= 0) continue; this.partLife[i] -= dt; this.partVel[i * 3 + 1] -= 4.5 * dt; this.partPos[i * 3] += this.partVel[i * 3] * dt; this.partPos[i * 3 + 1] += this.partVel[i * 3 + 1] * dt; this.partPos[i * 3 + 2] += this.partVel[i * 3 + 2] * dt; if (this.partLife[i] <= 0) this.partPos[i * 3 + 1] = -100; }
    this.partGeo.attributes.position.needsUpdate = true; this.partGeo.attributes.color.needsUpdate = true;
    // 스킬 비주얼 애니메이션
    const sv = this.sv;
    if (sv.m1.visible) { sv.m1.rotation.z = t * 0.1; sv.m1.position.y = 9 + Math.sin(t) * 0.3; }
    if (sv.m3.visible) sv.m3.rotation.y = t * 0.05;
    if (sv.m5.visible) { sv.m5.material.opacity = 0.1 + 0.25 * Math.min(1, (flags.combo || 1) - 1) + 0.04 * Math.sin(t * 3); sv.m5.rotation.y = t; }
    if (sv.m6.visible) sv.m6.children.forEach((s, i) => { const a = t * 0.8 + i * 1.57; s.position.set(Math.cos(a) * 7, 8 + Math.sin(t + i) * 0.8, Math.sin(a) * 7); });
    if (sv.g2.visible) sv.g2.material.opacity = 0.5 + 0.4 * Math.sin(t * 2);
    if (sv.g5.visible) sv.g5.children.forEach((c) => { }), 0;
    if (sv.a3.visible) sv.a3.children.forEach((s, i) => { const a = t * 2 + i * 3.14; s.position.set(Math.cos(a) * 0.9, 1.8 + Math.sin(t * 3 + i) * 0.4, Math.sin(a) * 0.9); });
    if (sv.a4.visible) sv.a4.children.forEach((m, i) => { const a = -t * 0.9 + i * 1.256; m.position.set(Math.cos(a) * 1.8, 2.2 + Math.sin(t * 2 + i) * 0.3, Math.sin(a) * 1.8); m.rotation.y = t; });
    if (sv.a6.visible) { sv.a6.rotation.y = t * 0.15; }
    this.renderer.render(this.scene, this.camera);
  }
  updatePlot(i, st, e, t) {
    const v = this.plotViews[i]; const pl = st.plots[i]; const unlocked = i < st.plotCount;
    v.locked.visible = !unlocked; v.soil.visible = unlocked;
    if (!unlocked) { v.glow.material.opacity = 0; v.water.material.opacity = 0; if (v.obj) { v.holder.remove(v.obj); v.obj = null; v.key = ''; } return; }
    if (!pl) { if (v.obj) { v.holder.remove(v.obj); v.obj = null; v.key = ''; } v.glow.material.opacity = 0; const dry = 0; v.soil.material.color.set('#8a6a44'); v.water.material.opacity = 0; return; }
    const stage = this.stageOf(pl); const key = pl.id + '|' + stage + '|' + (pl.bloom ? 1 : 0) + '|' + (pl.shiny ? 1 : 0);
    if (key !== v.key) {
      if (v.obj) v.holder.remove(v.obj);
      const pd = pl.id === 'weed' ? { id: 'weed', shape: 'weed', c1: '#6a8a3a', c2: '#4a6a30', h: 1 } : PLANT_MAP[pl.id];
      v.obj = buildPlant(pd, stage, pl.bloom, pl.shiny); v.holder.add(v.obj); v.key = key; v.pd = pd; v.justBuilt = 0;
      if (v.prevStage && v.prevStage !== key) { this.burst(v.g.position.x, 0.9, v.g.position.z, pd.c1 || '#ffffff', 10, 1.2, 1.8); }
      v.prevStage = key;
    }
    // 성장 스케일
    let k = 1; if (stage === 'seed') k = 0.7 + pl.prog / 0.2 * 0.3; else if (stage === 'sprout') k = 0.7 + (pl.prog - 0.2) / 0.3 * 0.3; else if (stage === 'bud') k = 0.75 + (pl.prog - 0.5) / 0.5 * 0.25;
    const sw = pl.bloom ? 1 + Math.sin(t * 2 + i) * 0.02 : 1; v.obj.scale.set(k * sw, k * sw, k * sw); v.obj.rotation.z = Math.sin(t * 1.2 + i) * 0.02;
    // 물 상태
    const wet = pl.water / 100; v.soil.material.color.set(pl.water > 0 ? new THREE.Color('#9a7648').lerp(new THREE.Color('#4a3320'), wet) : new THREE.Color('#b89a68'));
    v.water.material.opacity = pl.id !== 'weed' && wet > 0.6 ? (wet - 0.6) * 0.25 : 0;
    // 개화 글로우
    const gp = v.pd; v.glow.material.color.set(pl.shiny ? '#ffd6f8' : (gp.c1 || '#fff'));
    v.glow.material.opacity = pl.bloom ? (0.28 + 0.5 * (this.nightF || 0)) * (pl.shiny ? 1.4 : 1) * (0.85 + 0.15 * Math.sin(t * 3 + i)) : 0;
    v.glow.position.y = 0.9 + (gp.h || 1) * 0.35; const gs = (pl.shiny ? 3.6 : 2.4) * (0.9 + (gp.h || 1) * 0.15); v.glow.scale.set(gs, gs, 1);
  }
  plotWorldPos(i) { const p = PLOT_ORDER[i]; return new THREE.Vector3(p.x, 1.0, p.z); }
}
