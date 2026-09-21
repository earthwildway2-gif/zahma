
/* ================= player & weapons ================= */
const enemies = [];
const P = { x: 0, z: 32, vx: 0, vz: 0, yaw: 0, pitch: 0, hp: 100, dead: false, sprint: false, weapon: 0, unlocked: [true, false, false], ammo: [{ mag: 12, res: 48 }, { mag: 0, res: 0 }, { mag: 0, res: 0 }],
            reloadT: 0, fireT: 0, kick: 0, bob: 0, stepT: 0, lastHurt: -99, swap: 0, frozen: false, aimAssist: false };
const W = [
  { name: 'مسدس', kind: 'pistol', auto: false, rpm: 380, mag: 12, dmg: 30, spread: 0.004, recoil: 0.02, pel: 1, reload: 1.35, range: 90 },
  { name: 'كلاشن', kind: 'rifle', auto: true, rpm: 640, mag: 30, dmg: 22, spread: 0.011, recoil: 0.013, pel: 1, reload: 2.0, range: 130 },
  { name: 'شوتجن', kind: 'shotgun', auto: false, rpm: 78, mag: 6, dmg: 13, spread: 0.055, recoil: 0.085, pel: 9, reload: 2.3, range: 42 }
];
// viewmodels
const vm = new THREE.Group(); camera.add(vm); vm.position.set(0.19, -0.2, -0.4);
const gunMat = phong({ color: 0x24282d, shininess: 60, specular: 0x666a70 }), woodMat = phong({ color: 0x6b4423 });
function box(w, h, d, x, y, z, m, parent) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); parent.add(b); return b; }
function hand(x, y, z, parent) { return box(0.075, 0.075, 0.11, x, y, z, MAT.skin, parent); }
const VMS = [0, 1, 2].map(() => new THREE.Group()); VMS.forEach(g => { vm.add(g); g.visible = false; });
{ const g = VMS[0]; box(0.048, 0.062, 0.24, 0, 0.01, -0.1, gunMat, g); box(0.036, 0.1, 0.06, 0, -0.07, 0.0, gunMat, g).rotation.x = 0.25; box(0.02, 0.02, 0.06, 0, 0.055, -0.2, gunMat, g); hand(0, -0.1, 0.02, g); box(0.03, 0.03, 0.09, 0.05, -0.06, -0.06, MAT.skin, g); g.userData.muzzle = new THREE.Object3D(); g.userData.muzzle.position.set(0, 0.015, -0.26); g.add(g.userData.muzzle); }
{ const g = VMS[1]; box(0.06, 0.085, 0.5, 0, 0, -0.14, gunMat, g); box(0.04, 0.15, 0.075, 0, -0.11, -0.1, gunMat, g).rotation.x = 0.28; box(0.05, 0.09, 0.22, 0, -0.03, 0.22, woodMat, g); box(0.026, 0.026, 0.28, 0, 0.02, -0.52, gunMat, g); box(0.07, 0.07, 0.22, 0, -0.01, -0.36, woodMat, g); hand(-0.02, -0.075, -0.4, g); hand(0.02, -0.09, 0.0, g); g.userData.muzzle = new THREE.Object3D(); g.userData.muzzle.position.set(0, 0.02, -0.68); g.add(g.userData.muzzle); }
{ const g = VMS[2]; box(0.05, 0.05, 0.62, 0, 0.01, -0.28, gunMat, g); box(0.045, 0.045, 0.5, 0, -0.035, -0.22, gunMat, g); box(0.075, 0.06, 0.17, 0, -0.045, -0.32, woodMat, g); box(0.06, 0.1, 0.32, 0, -0.03, 0.02, gunMat, g); box(0.055, 0.09, 0.2, 0, -0.05, 0.28, woodMat, g); hand(0, -0.06, -0.32, g); hand(0.02, -0.1, 0.05, g); g.userData.muzzle = new THREE.Object3D(); g.userData.muzzle.position.set(0, 0.012, -0.6); g.add(g.userData.muzzle); }
const mflash = sprite(GLOW_ORANGE, 0.5, 0); camera.add(mflash); const mflash2 = sprite(GLOW, 0.9, 0); camera.add(mflash2);
function showWeapon() { VMS.forEach((g, i) => g.visible = i === P.weapon); }
showWeapon();

const v0 = new V3(), v1 = new V3(), fwd = new V3(), tmpQ = new THREE.Quaternion();
function muzzleWorld(out) { VMS[P.weapon].userData.muzzle.getWorldPosition(out); return out; }
function traceShot(o, d, range) {
  let best = range, res = { type: 'none', t: range }; const out = {};
  const ts = rayBoxes(o.x, o.y, o.z, d.x, d.y, d.z, best, out); if (ts < best) { best = ts; res = { type: 'solid', t: ts, solid: out.solid, nx: out.nx, ny: out.ny, nz: out.nz }; }
  for (const e of enemies) { if (e.dead) continue; const r = e.hitTest(o, d, best); if (r && r.t < best) { best = r.t; res = { type: 'enemy', t: r.t, enemy: e, head: r.head }; } }
  for (const b of barrels) { if (!b.alive) continue; const t = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, { x: b.x - 0.31, y: 0, z: b.z - 0.31 }, { x: b.x + 0.31, y: 0.95, z: b.z + 0.31 }); if (t < best) { best = t; res = { type: 'barrel', t, barrel: b }; } }
  for (const l of lamps) { if (!l.alive) continue; const t = raySphere(o.x, o.y, o.z, d.x, d.y, d.z, l.x, l.y, l.z, 0.65); if (t < best) { best = t; res = { type: 'lamp', t, lamp: l }; } }
  res.t = best; return res;
}
function hitMarker(head, kill) { FX.hitT = 0.16; const h = $('#hit'); h.className = head || kill ? 'head' : ''; h.style.opacity = 1; sfxTick(head ? 1800 : 1100, 0.1, 0.05); }
function surfaceFx(p, n, metal) {
  spawnDecal(p, n); sparks(p, metal ? 9 : 4, n, metal ? 4 : 2.2, 0.7, metal ? [1, 0.75, 0.35] : [0.7, 0.65, 0.55]);
  puff(p, 0.35, 0.7, n.clone().multiplyScalar(0.4).add(new V3(0, 0.3, 0)), 0.32, 2.5, metal ? 0x777777 : 0x8a8478);
  sfxImpact(clamp((p.x - P.x) * 0.02, -0.5, 0.5), clamp(1 - p.distanceTo(camera.position) / 60, 0.2, 1), metal);
}
function fire() {
  const w = W[P.weapon], a = P.ammo[P.weapon];
  if (P.dead || P.frozen || P.reloadT > 0 || P.fireT > 0 || P.swap > 0) return;
  if (a.mag <= 0) { sfxClick(0.5, 900); P.fireT = 0.25; if (a.res > 0) startReload(); return; }
  a.mag--; P.fireT = 60 / w.rpm; camera.getWorldPosition(v0); camera.getWorldDirection(fwd);
  muzzleWorld(v1); const from = v1.clone();
  const move = Math.min(1, Math.hypot(P.vx, P.vz) / 6), spreadK = w.spread * (1 + move * 1.4);
  for (let i = 0; i < w.pel; i++) {
    const d = fwd.clone(); const ang = rand(0, TAU), r = Math.sqrt(Math.random()) * spreadK; const right = new V3(1, 0, 0).applyQuaternion(camera.getWorldQuaternion(tmpQ)), up = new V3(0, 1, 0).applyQuaternion(tmpQ);
    d.addScaledVector(right, Math.cos(ang) * r).addScaledVector(up, Math.sin(ang) * r);
    if (P.aimAssist) { let bestA = 0.07, tgt = null; for (const e of enemies) { if (e.dead) continue; const c = new V3(e.x, 1.25, e.z), dir = c.clone().sub(v0), dist = dir.length(); dir.normalize(); const ang2 = Math.acos(clamp(dir.dot(fwd), -1, 1)); if (ang2 < bestA && dist < 60 && rayBoxes(v0.x, v0.y, v0.z, dir.x, dir.y, dir.z, dist) === Infinity) { bestA = ang2; tgt = dir; } } if (tgt) d.lerp(tgt, 0.55); }
    d.normalize(); const res = traceShot(v0, d, w.range), hp = v0.clone().addScaledVector(d, res.t);
    spawnTracer(from, hp, w.kind === 'shotgun' ? 0xffc890 : 0xffe6b0, w.kind === 'shotgun' ? 0.7 : 1);
    if (res.type === 'enemy') { const dmg = w.dmg * (res.head ? 2.6 : 1) * (w.kind === 'shotgun' ? Math.max(0.35, 1 - res.t / 30) : 1); const killed = res.enemy.damage(dmg, d, res.head, false); hitMarker(res.head, killed); sparks(hp, 5, d.clone().negate(), 2.5, 0.6, [0.9, 0.2, 0.15]); puff(hp, 0.3, 0.5, new V3(0, 0.3, 0), 0.25, 2, 0x7a1e1e); }
    else if (res.type === 'barrel') { detonate(res.barrel); hitMarker(false, false); }
    else if (res.type === 'lamp') { breakLamp(res.lamp); }
    else if (res.type === 'solid') surfaceFx(hp, new V3(res.nx, res.ny, res.nz), res.solid.metal);
  }
  sfxShot(w.kind, 1, 0, 0); emitNoise(P.x, P.z, { pistol: 26, rifle: 38, shotgun: 46 }[w.kind] || 34, 'shot');
  P.kick = Math.min(1, P.kick + w.recoil * 9); P.pitch += w.recoil * rand(0.8, 1.3); P.yaw += rand(-0.5, 0.5) * w.recoil * 0.6; FX.shake = Math.max(FX.shake, w.kind === 'shotgun' ? 0.55 : 0.16);
  mflash.material.opacity = 1; mflash2.material.opacity = 0.75; const mz = VMS[P.weapon].userData.muzzle.position; mflash.position.copy(mz).add(vm.position).add(new V3(0, 0, -0.02)); mflash2.position.copy(mflash.position);
  mflash.material.rotation = rand(0, TAU); muzzleLight.position.copy(from); muzzleLight.intensity = 6;
  puff(from.clone().addScaledVector(fwd, 0.4), 0.3, 0.9, fwd.clone().multiplyScalar(0.8).add(new V3(0, 0.3, 0)), 0.3, 3, 0x9a9a9a);
  if (w.kind !== 'shotgun') ejectCasing();
  if (w.kind === 'shotgun') setTimeout(() => { sfxClick(0.5, 500); ejectCasing(); }, 380);
  if (a.mag === 0 && a.res > 0) setTimeout(() => { if (P.ammo[P.weapon].mag === 0) startReload(); }, 200);
}
function startReload() { const w = W[P.weapon], a = P.ammo[P.weapon]; if (P.reloadT > 0 || a.mag >= w.mag || a.res <= 0) return; P.reloadT = w.reload; sfxReload(w.kind, w.reload); }
function finishReload() { const w = W[P.weapon], a = P.ammo[P.weapon], need = w.mag - a.mag, take = Math.min(need, a.res); a.mag += take; a.res -= take; sfxClick(0.7, 1200); }
function switchWeapon(i) { if (i === P.weapon || !P.unlocked[i] || P.dead) return; P.weapon = i; P.reloadT = 0; P.swap = 0.28; showWeapon(); hudAmmo(); sfxClick(0.5, 1400); }
function cycleWeapon() { for (let k = 1; k <= 3; k++) { const i = (P.weapon + k) % 3; if (P.unlocked[i]) { switchWeapon(i); return; } } }
function hurtPlayer(n, from) {
  if (P.dead || state !== 'play') return; P.hp = Math.max(0, P.hp - n); P.lastHurt = performance.now() / 1000; FX.dmgT = Math.min(1, FX.dmgT + 0.55 + n * 0.02); FX.shake = Math.max(FX.shake, 0.35 + n * 0.02);
  sfxTick(90, 0.4, 0.14); if (P.hp <= 0) playerDie();
}
