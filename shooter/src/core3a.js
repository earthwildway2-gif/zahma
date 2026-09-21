
/* ================= effects ================= */
const FX = { time: 1, shake: 0, hitT: 0, dmgT: 0, flashT: 0, slowT: 0 };
const effG = new THREE.Group(); scene.add(effG);
// tracers
const tracers = []; { const geo = new THREE.CylinderGeometry(0.012, 0.012, 1, 4); geo.rotateX(Math.PI / 2);
  for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.visible = false; effG.add(m); tracers.push({ m, life: 0 }); } }
let trI = 0;
function spawnTracer(a, b, col = 0xffd9a0, w = 1) {
  const t = tracers[trI++ % tracers.length], len = a.distanceTo(b); if (len < 0.5) return;
  t.m.visible = true; t.m.position.copy(a).lerp(b, 0.5); t.m.lookAt(b); t.m.scale.set(w, w, len); t.m.material.color.setHex(col); t.m.material.opacity = 0.9; t.life = 0.07;
}
// bullet holes
const decals = []; { const tex = ctex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 1, 16, 16, 15); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(0.5, 'rgba(10,10,10,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  for (let i = 0; i < 70; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.visible = false; effG.add(m); decals.push(m); } }
let dcI = 0;
function spawnDecal(p, n) { const m = decals[dcI++ % decals.length]; m.visible = true; m.position.copy(p).addScaledVector(n, 0.012); m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z); m.rotation.z = rand(0, TAU); const s = rand(0.7, 1.3); m.scale.set(s, s, 1); }
// sparks (additive points)
const SP = { n: 360, pos: null, col: null, vel: [], life: [], geo: null, pts: null, i: 0 };
{ SP.pos = new Float32Array(SP.n * 3); SP.col = new Float32Array(SP.n * 3); for (let i = 0; i < SP.n; i++) { SP.vel.push(new V3()); SP.life.push(0); SP.pos[i * 3 + 1] = -999; }
  SP.geo = new THREE.BufferGeometry(); SP.geo.setAttribute('position', new THREE.BufferAttribute(SP.pos, 3)); SP.geo.setAttribute('color', new THREE.BufferAttribute(SP.col, 3));
  SP.pts = new THREE.Points(SP.geo, new THREE.PointsMaterial({ size: 0.16, map: GLOW, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); SP.pts.frustumCulled = false; effG.add(SP.pts); }
function sparks(p, n, dir, speed, spread, color = [1, 0.75, 0.35]) {
  for (let k = 0; k < n; k++) { const i = SP.i++ % SP.n; SP.pos[i * 3] = p.x; SP.pos[i * 3 + 1] = p.y; SP.pos[i * 3 + 2] = p.z;
    SP.vel[i].set(dir.x + rand(-spread, spread), dir.y + rand(-spread, spread * 0.6) + 0.15, dir.z + rand(-spread, spread)).multiplyScalar(speed * rand(0.4, 1)); SP.life[i] = rand(0.25, 0.6); SP.col[i * 3] = color[0]; SP.col[i * 3 + 1] = color[1]; SP.col[i * 3 + 2] = color[2]; }
}
// smoke / fire sprites
const puffs = []; for (let i = 0; i < 46; i++) { const s = sprite(GLOW_SMOKE, 1, 0, false); s.visible = false; effG.add(s); puffs.push({ s, life: 0, max: 1, vel: new V3(), size: 1, grow: 1, op: 0.4 }); }
let pfI = 0;
function puff(p, size, life, vel, op = 0.4, grow = 2.2, tint = 0x8a8a8a, additive = false) {
  const q = puffs[pfI++ % puffs.length]; q.s.visible = true; q.s.position.copy(p); q.s.material.color.setHex(tint); q.s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending; q.s.material.needsUpdate = true;
  q.size = size; q.grow = grow; q.life = q.max = life; q.vel.copy(vel); q.op = op; q.s.scale.set(size, size, 1);
}
// shell casings
const casings = []; { const geo = new THREE.BoxGeometry(0.018, 0.018, 0.055), mat = new THREE.MeshPhongMaterial({ color: 0xd8a830, shininess: 80 });
  for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(geo, mat); m.visible = false; effG.add(m); casings.push({ m, v: new V3(), life: 0, spin: new V3() }); } }
let csI = 0;
function ejectCasing() {
  const c = casings[csI++ % casings.length], p = new V3(0.16, -0.16, -0.5); camera.localToWorld(p); c.m.position.copy(p); c.m.visible = true; c.life = 1.4; c.snd = false;
  const r = new V3(1, 0.7, 0.1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion())); c.v.copy(r).multiplyScalar(rand(1.6, 2.6)); c.v.y += rand(0.8, 1.6); c.spin.set(rand(-20, 20), rand(-20, 20), rand(-20, 20));
}
// debris chunks (explosions)
const debris = []; { const mat = new THREE.MeshPhongMaterial({ color: 0x3a1a14 }); for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.3), mat); m.visible = false; effG.add(m); debris.push({ m, v: new V3(), life: 0, spin: new V3() }); } }
let dbI = 0;
// shockwave + fire light
const shock = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xffcc88, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); shock.rotation.x = -Math.PI / 2; effG.add(shock);
const boomLight = new THREE.PointLight('#ff8a3a', 0, 26, 1.5); scene.add(boomLight);
const muzzleLight = new THREE.PointLight('#ffc070', 0, 18, 1.6); scene.add(muzzleLight);
const boom = { t: 0 };
function explode(x, z, radius = 6.5, dmg = 130) {
  const p = new V3(x, 0.7, z);
  sfxBoom(1, 0); emitNoise(x, z, 60, 'boom'); moraleShock(x, z, 24, 20); FX.flashT = Math.max(FX.flashT, clamp(0.9 - Math.hypot(P.x - x, P.z - z) / 9, 0, 0.6)); FX.shake = Math.max(FX.shake, 1.0 / (1 + p.distanceTo(new V3(P.x, 1.6, P.z)) * 0.05)); boom.t = 0.7; boomLight.position.set(x, 2.2, z); boomLight.intensity = 9;
  puff(p.clone().setY(1.2), 5, 0.55, new V3(0, 1.2, 0), 0.95, 2.4, 0xffb060, true); puff(p.clone().setY(1.0), 3.4, 0.4, new V3(0, 0.6, 0), 1, 2.8, 0xfff0c0, true);
  for (let i = 0; i < 9; i++) puff(p.clone().add(new V3(rand(-1.2, 1.2), rand(0.4, 2.2), rand(-1.2, 1.2))), rand(2.5, 4.2), rand(1.6, 2.8), new V3(rand(-0.6, 0.6), rand(0.8, 1.8), rand(-0.6, 0.6)), 0.55, 2.4, 0x2b2b2b);
  sparks(p, 90, new V3(0, 1, 0), 9, 1.2, [1, 0.6, 0.2]); shock.position.set(x, 0.1, z); shock.userData.t = 0.5; shock.scale.set(1, 1, 1);
  for (let i = 0; i < 8; i++) { const d = debris[dbI++ % debris.length]; d.m.visible = true; d.m.position.copy(p); d.v.set(rand(-1, 1), rand(1.2, 2.4), rand(-1, 1)).multiplyScalar(rand(4, 7)); d.life = 1.8; d.spin.set(rand(-12, 12), rand(-12, 12), rand(-12, 12)); }
  const at = new V3(P.x, 1, P.z).sub(p); const dp = at.length(); if (dp < radius && !P.dead) hurtPlayer(dmg * (1 - dp / radius) * 0.7, p);
  for (const e of enemies) { if (e.dead) continue; const d = Math.hypot(e.x - x, e.z - z); if (d < radius) e.damage(dmg * (1 - d / radius) + 20, new V3(e.x - x, 0, e.z - z).normalize(), false, true); }
  for (const b of barrels) { if (b.alive && Math.hypot(b.x - x, b.z - z) < radius * 0.75 && b.alive) setTimeout(() => detonate(b), 120 + Math.random() * 150); }
  for (const l of lamps) if (l.alive && Math.hypot(l.x - x, l.z - z) < radius * 1.5) breakLamp(l);
}
function detonate(b) { if (!b.alive) return; b.alive = false; b.mesh.visible = false; b.solid.solid = false; explode(b.x, b.z); }
function breakLamp(l) {
  if (!l.alive) return; l.alive = false; l.glow.visible = false; l.pool.visible = false; l.head.material = MAT.dark; if (l.light) l.light.intensity = 0;
  sparks(new V3(l.x, l.y, l.z), 40, new V3(0, -0.4, 0), 5, 1.2, [1, 0.9, 0.6]); sfxImpact(0, 1, true);
}
// rain
const RAIN = { n: 900, pos: new Float32Array(900 * 3), geo: null };
{ for (let i = 0; i < RAIN.n; i++) { RAIN.pos[i * 3] = rand(-18, 18); RAIN.pos[i * 3 + 1] = rand(0, 16); RAIN.pos[i * 3 + 2] = rand(-18, 18); }
  RAIN.geo = new THREE.BufferGeometry(); RAIN.geo.setAttribute('position', new THREE.BufferAttribute(RAIN.pos, 3)); const rp = new THREE.Points(RAIN.geo, new THREE.PointsMaterial({ color: 0x9db4d8, size: 0.09, map: GLOW, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })); rp.frustumCulled = false; effG.add(rp); RAIN.pts = rp; }
function fxUpdate(dt) {
  for (const t of tracers) if (t.life > 0) { t.life -= dt; t.m.material.opacity = Math.max(0, t.life / 0.07) * 0.9; if (t.life <= 0) t.m.visible = false; }
  let alive = false;
  for (let i = 0; i < SP.n; i++) if (SP.life[i] > 0) { alive = true; SP.life[i] -= dt; const v = SP.vel[i]; v.y -= 9 * dt; SP.pos[i * 3] += v.x * dt; SP.pos[i * 3 + 1] += v.y * dt; SP.pos[i * 3 + 2] += v.z * dt;
    if (SP.pos[i * 3 + 1] < 0.02) { SP.pos[i * 3 + 1] = 0.02; v.y *= -0.3; v.x *= 0.6; v.z *= 0.6; } const f = Math.max(0, SP.life[i] / 0.5); SP.col[i * 3] *= 0.97; SP.col[i * 3 + 1] *= 0.94; SP.col[i * 3 + 2] *= 0.9; if (SP.life[i] <= 0) SP.pos[i * 3 + 1] = -999; }
  if (alive) { SP.geo.attributes.position.needsUpdate = true; SP.geo.attributes.color.needsUpdate = true; }
  for (const q of puffs) if (q.life > 0) { q.life -= dt; const k = 1 - q.life / q.max; q.s.position.addScaledVector(q.vel, dt); q.s.material.opacity = q.op * (1 - k) * Math.min(1, k * 8 + 0.2); const s = q.size * (1 + k * q.grow); q.s.scale.set(s, s, 1); if (q.life <= 0) q.s.visible = false; }
  for (const c of casings) if (c.life > 0) { c.life -= dt; c.v.y -= 9.8 * dt; c.m.position.addScaledVector(c.v, dt); c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; if (c.m.position.y < 0.02) { if (!c.snd) { c.snd = true; playBuf(pickOf(['casing1', 'casing2']), { vol: 0.22, dur: 0.8, wet: 0.2, rate: 0.95 + Math.random() * 0.1 }); } c.m.position.y = 0.02; c.v.y *= -0.35; c.v.x *= 0.5; c.v.z *= 0.5; c.spin.multiplyScalar(0.4); } if (c.life <= 0) c.m.visible = false; }
  for (const d of debris) if (d.life > 0) { d.life -= dt; d.v.y -= 12 * dt; d.m.position.addScaledVector(d.v, dt); d.m.rotation.x += d.spin.x * dt; d.m.rotation.z += d.spin.z * dt; if (d.m.position.y < 0.05) { d.m.position.y = 0.05; d.v.multiplyScalar(0.3); d.spin.multiplyScalar(0.3); } if (d.life <= 0) d.m.visible = false; }
  if (boom.t > 0) { boom.t -= dt; boomLight.intensity = Math.max(0, boom.t / 0.7) * 9; } else boomLight.intensity = 0;
  if (shock.userData.t > 0) { shock.userData.t -= dt; const k = 1 - shock.userData.t / 0.5; shock.scale.set(1 + k * 8, 1 + k * 8, 1); shock.material.opacity = (1 - k) * 0.6; } else shock.material.opacity = 0;
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 60);
  // rain follows the player
  const px = P.x, pz = P.z, a = RAIN.pos;
  for (let i = 0; i < RAIN.n; i++) { a[i * 3 + 1] -= 14 * dt; if (a[i * 3 + 1] < 0) { a[i * 3] = px + rand(-18, 18); a[i * 3 + 1] = 15 + rand(0, 3); a[i * 3 + 2] = pz + rand(-18, 18); } else if (Math.abs(a[i * 3] - px) > 18) a[i * 3] = px + rand(-18, 18); else if (Math.abs(a[i * 3 + 2] - pz) > 18) a[i * 3 + 2] = pz + rand(-18, 18); }
  RAIN.geo.attributes.position.needsUpdate = true;
  for (const l of lamps) if (l.alive) { const fl = 0.9 + Math.sin(performance.now() * 0.02 + l.x) * 0.03 + (Math.random() < 0.01 ? -0.35 : 0); l.glow.material.opacity = 0.9 * fl; if (l.light) l.light.intensity = 1.25 * fl; }
  inLight.intensity = 1.05 + Math.sin(performance.now() * 0.013) * 0.04 + (Math.random() < 0.012 ? -0.5 : 0);
}
