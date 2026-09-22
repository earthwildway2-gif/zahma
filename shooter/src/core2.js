
/* ================= level: the yard and the warehouse ================= */
const solids = [], lamps = [], barrels = [], items = [];
const worldG = new THREE.Group(); scene.add(worldG);
function addSolid(x, z, w, d, h, mat, o = {}) {
  const y0 = o.y || 0, m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y0 + h / 2, z); m.castShadow = h < 8; m.receiveShadow = true; worldG.add(m);
  const s = { minx: x - w / 2, maxx: x + w / 2, minz: z - d / 2, maxz: z + d / 2, y0, y1: y0 + h, mesh: m, solid: o.solid !== false, metal: !!o.metal };
  solids.push(s); return s;
}
function glowTex(rgb) { return ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.25, 'rgba(' + rgb + ',.55)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }); }
const GLOW = glowTex('255,214,150'), GLOW_ORANGE = glowTex('255,150,60'), GLOW_SMOKE = ctex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(200,200,200,.9)'); gr.addColorStop(1, 'rgba(200,200,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
function sprite(tex, size, opacity, additive = true) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity, depthWrite: false, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); s.scale.set(size, size, 1); return s; }

// ground
const ground = new THREE.Mesh(new THREE.PlaneGeometry(170, 170), MAT.ground); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; worldG.add(ground);
// perimeter (west, east, north, south with a gate)
addSolid(-34, -3, 0.5, 74, 3.4, MAT.concrete); addSolid(34, -3, 0.5, 74, 3.4, MAT.concrete);
addSolid(0, -40, 68.5, 0.6, 8, MAT.wall);
addSolid(-18.75, 34, 30.5, 0.5, 3.4, MAT.concrete); addSolid(18.75, 34, 30.5, 0.5, 3.4, MAT.concrete);
const gate = addSolid(0, 34.1, 7, 0.4, 3.0, MAT.metalGrey, { metal: true }); gate.mesh.visible = false; gate.solid = false;
// warehouse shell
addSolid(-22, -27, 0.7, 26, 8, MAT.wall, { metal: true }); addSolid(22, -27, 0.7, 26, 8, MAT.wall, { metal: true });
addSolid(-12.25, -14, 19.5, 0.7, 8, MAT.wall, { metal: true }); addSolid(12.25, -14, 19.5, 0.7, 8, MAT.wall, { metal: true });
addSolid(0, -14, 5, 0.7, 4.4, MAT.wall, { y: 3.6, metal: true });
addSolid(0, -27, 44, 26, 0.4, MAT.dark, { y: 8 });
if (AITEX.warehouse_floor) { const ft = aiTex('warehouse_floor', 8, 5); const fl = new THREE.Mesh(new THREE.PlaneGeometry(44, 26), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.3, metalness: 0.15 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.015, -27); fl.receiveShadow = true; worldG.add(fl); }
const rollDoor = addSolid(0, -14, 5, 0.5, 3.6, MAT.metalGrey, { metal: true });
// office at the back
addSolid(-4.5, -31, 7, 0.4, 3.4, MAT.concrete); addSolid(4.5, -31, 7, 0.4, 3.4, MAT.concrete);
addSolid(-8, -35.5, 0.4, 9, 3.4, MAT.concrete); addSolid(8, -35.5, 0.4, 9, 3.4, MAT.concrete);
addSolid(0, -35.5, 16, 9, 0.3, MAT.dark, { y: 3.4 });
const officeDoor = addSolid(0, -31, 2, 0.35, 3.0, MAT.metalRed, { metal: true });
// yard cover: containers and crates
const CONT = [[-14, 22, 6, 2.5, 'metalGreen'], [15, 20, 2.5, 6, 'metalBlue'], [-11, 8, 6, 2.5, 'metalRed'], [11, 6, 6, 2.5, 'metalGrey'], [0, -6, 2.5, 6, 'metalGreen'], [-28, -20, 2.5, 6, 'metalBlue'], [28, -26, 2.5, 6, 'metalRed'], [-27, 12, 2.5, 6, 'metalGrey'], [27, 10, 6, 2.5, 'metalGreen']];
CONT.forEach(c => addSolid(c[0], c[1], c[2], c[3], 2.6, MAT[c[4]], { metal: true }));
[[-4, 26], [5, 25.5], [-20, 14], [22, 14], [0, 16], [-6, -9.5], [8, -9.5], [-28, 0], [28, 2], [-26, -34], [26, -36]].forEach(([x, z]) => { const s = 1 + Math.random() * 0.4; addSolid(x, z, s, s, s, MAT.crate); if (Math.random() < 0.6) addSolid(x + rand(-0.15, 0.15), z, s * 0.8, s * 0.8, s * 0.8, MAT.crate, { y: s }); });
addSolid(24, 26, 2.0, 4.6, 1.5, phong({ color: 0x7a1f1f }), { metal: true }); addSolid(24, 27, 1.8, 1.9, 0.7, phong({ color: 0x151517 }), { y: 1.5, solid: false });
// warehouse interior cover
[[-12, -20], [12, -20], [-12, -28], [12, -28], [-12, -36], [12, -36]].forEach(([x, z]) => addSolid(x, z, 0.9, 0.9, 8, MAT.concrete));
[[-16, -24, 8, 1], [16, -24, 8, 1], [-16, -33, 8, 1], [16, -33, 8, 1]].forEach(([x, z, w, d]) => { addSolid(x, z, w, d, 3, MAT.metalGrey, { metal: true }); addSolid(x, z, w * 0.94, d * 0.8, 0.9, MAT.crate, { y: 3 }); });
[[-4, -20], [3, -22], [-3, -27], [5, -26]].forEach(([x, z]) => { addSolid(x, z, 1.3, 1.3, 1.3, MAT.crate); });
[[-19, -18], [19, -19], [-19, -38], [19, -38]].forEach(([x, z]) => addSolid(x, z, 2.2, 1.2, 0.5, MAT.crate));
// office props
addSolid(0, -37.5, 3, 1.1, 0.9, phong({ color: 0x3a2a1a }));
const chair = addSolid(-4.5, -35, 0.6, 0.6, 0.5, phong({ color: 0x222 }), { solid: false });

// lamps
function addLamp(x, z, real) {
  addSolid(x, z, 0.22, 0.22, 7, MAT.pole);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.45), MAT.hi); head.position.set(x, 7.05, z); worldG.add(head);
  const glow = sprite(GLOW, 8, 0.9); glow.position.set(x, 6.8, z); worldG.add(glow);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ map: GLOW, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.03, z); worldG.add(pool);
  let light = null; if (real) { light = new THREE.PointLight('#ffb866', 1.25, 34, 1.6); light.position.set(x, 6.6, z); scene.add(light); }
  const l = { x, y: 7.05, z, alive: true, head, glow, pool, light }; lamps.push(l); return l;
}
addLamp(-19, 24, true); addLamp(19, 22, true); addLamp(-17, 2, false); addLamp(18, -6, false); addLamp(-28, -6, false); addLamp(28, -12, false); addLamp(10, 30, false);
// interior light
const inLight = new THREE.PointLight('#ffd7a0', 1.1, 30, 1.6); inLight.position.set(0, 6.5, -24); scene.add(inLight);
const officeLight = new THREE.PointLight('#ff5a3a', 0.7, 14, 1.8); officeLight.position.set(0, 3, -36); scene.add(officeLight);
for (let i = 0; i < 6; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 0.35), MAT.hi); t.position.set(i % 2 ? 9 : -9, 7.85, -18 - Math.floor(i / 2) * 8); worldG.add(t); }
const hazeIn = sprite(GLOW, 30, 0.10); hazeIn.position.set(0, 6.5, -24); worldG.add(hazeIn);

// explosive barrels
function addBarrel(x, z) {
  const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.95, 12), MAT.barrel); body.position.y = 0.475; g.add(body);
  for (const y of [0.2, 0.75]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.07, 12), MAT.barrelBand); b.position.y = y; g.add(b); }
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), new THREE.MeshBasicMaterial({ color: 0xffcc33 })); mark.position.set(0, 0.5, 0.305); g.add(mark);
  g.position.set(x, 0, z); worldG.add(g); const s = addSolid(x, z, 0.62, 0.62, 0.95, MAT.dark, {}); s.mesh.visible = false;
  const b = { x, z, alive: true, mesh: g, solid: s }; barrels.push(b); return b;
}
[[-8, 15], [9, 12], [-3, -8], [18, -12], [-26, -8], [-10, -22], [12, -26], [-16, -36], [26, 20]].forEach(([x, z]) => addBarrel(x, z));

// pickups
function addItem(type, x, z) {
  const g = new THREE.Group();
  const colors = { health: 0x2fd27a, ammo: 0xf0c040, rifle: 0x6a7480, shotgun: 0x8a6a40 };
  const box = new THREE.Mesh(new THREE.BoxGeometry(type === 'rifle' || type === 'shotgun' ? 0.9 : 0.5, 0.3, 0.35), new THREE.MeshPhongMaterial({ color: colors[type], emissive: colors[type], emissiveIntensity: 0.5 })); g.add(box);
  const halo = sprite(GLOW_ORANGE, 2.2, 0.55); g.add(halo); g.position.set(x, 0.75, z); worldG.add(g);
  const it = { type, x, z, mesh: g, taken: false }; items.push(it); return it;
}
addItem('rifle', 5, 24); addItem('health', -6, 29); addItem('health', 0, -18); addItem('shotgun', -3, -17.5); addItem('health', -16, -36); addItem('ammo', 20, 12); addItem('ammo', -20, 16); addItem('ammo', 12, -30); addItem('health', 26, -30);

// a scared friend in the office
const shehata = new THREE.Group();
{ const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), phong({ color: 0x8a3a3a })); body.position.y = 0.95; const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.26), MAT.skin); head.position.y = 1.5; const legs = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.4), phong({ color: 0x223 })); legs.position.set(0, 0.5, 0.15);
  const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), MAT.dark); ch.position.y = 0.5; shehata.add(body, head, legs, ch); shehata.position.set(-4.5, 0, -35.5); shehata.rotation.y = 0.5; worldG.add(shehata); }

/* ================= geometry queries ================= */
const _n = new V3();
function rayBoxes(ox, oy, oz, dx, dy, dz, maxT, out) {
  let best = maxT, hit = null, nx = 0, ny = 0, nz = 0;
  for (const s of solids) {
    if (!s.solid) continue;
    let t0 = 0, t1 = best, ax = 0, ay = 0, az = 0, ok = true;
    // x
    if (Math.abs(dx) < 1e-9) { if (ox < s.minx || ox > s.maxx) continue; } else { let a = (s.minx - ox) / dx, b = (s.maxx - ox) / dx, sgn = -1; if (a > b) { const t = a; a = b; b = t; sgn = 1; } if (a > t0) { t0 = a; ax = sgn; ay = 0; az = 0; } if (b < t1) t1 = b; if (t0 > t1) continue; }
    if (Math.abs(dy) < 1e-9) { if (oy < s.y0 || oy > s.y1) continue; } else { let a = (s.y0 - oy) / dy, b = (s.y1 - oy) / dy, sgn = -1; if (a > b) { const t = a; a = b; b = t; sgn = 1; } if (a > t0) { t0 = a; ay = sgn; ax = 0; az = 0; } if (b < t1) t1 = b; if (t0 > t1) continue; }
    if (Math.abs(dz) < 1e-9) { if (oz < s.minz || oz > s.maxz) continue; } else { let a = (s.minz - oz) / dz, b = (s.maxz - oz) / dz, sgn = -1; if (a > b) { const t = a; a = b; b = t; sgn = 1; } if (a > t0) { t0 = a; az = sgn; ax = 0; ay = 0; } if (b < t1) t1 = b; if (t0 > t1) continue; }
    if (t0 > 0.0001 && t0 < best) { best = t0; hit = s; nx = ax; ny = ay; nz = az; }
  }
  if (out) { out.t = best; out.solid = hit; out.nx = nx; out.ny = ny; out.nz = nz; }
  return hit ? best : Infinity;
}
function collideCircle(p, r) {           // push a circle (x,z) out of the solid boxes (only things at body height)
  for (let iter = 0; iter < 2; iter++) for (const s of solids) {
    if (!s.solid || s.y0 > 1.4 || s.y1 < 0.3) continue;
    const cx = clamp(p.x, s.minx, s.maxx), cz = clamp(p.z, s.minz, s.maxz), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), push = r - d; p.x += dx / d * push; p.z += dz / d * push; }
    else { const l = p.x - s.minx, rr = s.maxx - p.x, t = p.z - s.minz, b = s.maxz - p.z, m = Math.min(l, rr, t, b); if (m === l) p.x = s.minx - r; else if (m === rr) p.x = s.maxx + r; else if (m === t) p.z = s.minz - r; else p.z = s.maxz + r; }
  }
}
function raySphere(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz, tca = lx * dx + ly * dy + lz * dz; if (tca < 0) return Infinity;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca; if (d2 > r * r) return Infinity; return tca - Math.sqrt(r * r - d2);
}
function rayAABB(ox, oy, oz, dx, dy, dz, min, max) {
  let t0 = 0, t1 = Infinity;
  for (const [o, d, a, b] of [[ox, dx, min.x, max.x], [oy, dy, min.y, max.y], [oz, dz, min.z, max.z]]) {
    if (Math.abs(d) < 1e-9) { if (o < a || o > b) return Infinity; } else { let p = (a - o) / d, q = (b - o) / d; if (p > q) { const t = p; p = q; q = t; } t0 = Math.max(t0, p); t1 = Math.min(t1, q); if (t0 > t1) return Infinity; }
  }
  return t0 > 0 ? t0 : Infinity;
}
