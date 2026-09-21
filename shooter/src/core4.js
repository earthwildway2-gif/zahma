
/* ================= enemies ================= */
const CFG = {
  guard: { hp: 55, speed: 2.4, jacket: 0x23282e, pants: 0x1a1c20, cap: 0x111, dmg: 6, rate: 0.14, burst: [3, 5], pause: [0.7, 1.5], pref: 15, weapon: 'rifle', scale: 1.0 },
  heavy: { hp: 150, speed: 1.8, jacket: 0x3a2a24, pants: 0x1d1a18, cap: 0x2a0d0d, dmg: 20, rate: 0.9, burst: [1, 1], pause: [0.9, 1.6], pref: 8, weapon: 'shotgun', scale: 1.12, vest: 0x2c3a2a },
  boss: { hp: 750, speed: 2.7, jacket: 0x14100e, pants: 0x14100e, cap: 0x8a1e1e, dmg: 8, rate: 0.11, burst: [6, 10], pause: [0.6, 1.1], pref: 13, weapon: 'rifle', scale: 1.14, scarf: 0xb02020 }
};
const BARKS = { alert: ['في حد هنا!', 'مين هناك؟', 'ده الغريب!', 'ضربوه!', 'امسكوه!'], hurt: ['آه!', 'اتصاب!', 'ياااه!'], flank: ['حاصروه!', 'من الشمال!'], die: ['خلاص!'] };
let barkCool = 0;
function bark(kind, x, z) { if (barkCool > 0) return; const arr = BARKS[kind]; const t = arr[Math.floor(Math.random() * arr.length)]; barkCool = 1.3; const d = Math.hypot(x - P.x, z - P.z); speak('', t, clamp(1 - d / 45, 0.15, 0.85)); }
function buildHuman(c) {
  const g = new THREE.Group(), jacket = phong({ color: c.jacket }), pants = phong({ color: c.pants });
  const body = box(0.5, 0.62, 0.28, 0, 1.13, 0, jacket, g), head = box(0.22, 0.24, 0.24, 0, 1.6, 0, MAT.skin, g); box(0.25, 0.09, 0.27, 0, 1.74, 0, phong({ color: c.cap }), g);
  if (c.vest) box(0.54, 0.4, 0.32, 0, 1.18, 0, phong({ color: c.vest }), g); if (c.scarf) box(0.28, 0.1, 0.28, 0, 1.45, 0, phong({ color: c.scarf }), g);
  const mkArm = (sx) => { const p = new THREE.Group(); p.position.set(sx * 0.33, 1.42, 0); box(0.14, 0.55, 0.14, 0, -0.27, 0, jacket, p); g.add(p); return p; };
  const mkLeg = (sx) => { const p = new THREE.Group(); p.position.set(sx * 0.12, 0.82, 0); box(0.17, 0.8, 0.18, 0, -0.4, 0, pants, p); g.add(p); return p; };
  const armL = mkArm(-1), armR = mkArm(1), legL = mkLeg(-1), legR = mkLeg(1);
  const gun = new THREE.Group(); box(0.06, 0.08, c.weapon === 'shotgun' ? 0.7 : 0.55, 0, 0, 0, gunMat, gun); box(0.05, 0.1, 0.2, 0, 0, 0.3, woodMat, gun); gun.position.set(0.17, 1.22, -0.35); g.add(gun);
  const flash = sprite(GLOW_ORANGE, 0.9, 0); flash.position.set(0.17, 1.24, -0.75); g.add(flash);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.45, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
  g.scale.setScalar(c.scale); return { g, body, head, armL, armR, legL, legR, gun, flash, mats: [jacket, pants] };
}
class Enemy {
  constructor(type, x, z, patrol) {
    this.type = type; this.c = CFG[type]; this.x = x; this.z = z; this.yaw = Math.PI; this.hp = this.c.hp; this.maxhp = this.c.hp; this.state = 'patrol'; this.dead = false; this.t = Math.random() * 6;
    this.patrol = patrol || [[x, z]]; this.pi = 0; this.alertT = 0; this.shootT = 1.0; this.burst = 0; this.pauseT = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = rand(1, 2.5); this.lastKnown = null; this.lostT = 0; this.flashT = 0; this.hitFlash = 0; this.fall = 0; this.group_ = null; this.react = 0;
    this.m = buildHuman(this.c); this.m.g.position.set(x, 0, z); worldG.add(this.m.g); enemies.push(this);
  }
  hitTest(o, d, maxT) {
    const s = this.c.scale; let best = Infinity, head = false;
    const th = raySphere(o.x, o.y, o.z, d.x, d.y, d.z, this.x, 1.6 * s, this.z, 0.2 * s); if (th < best) { best = th; head = true; }
    const tb = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, { x: this.x - 0.3 * s, y: 0, z: this.z - 0.26 * s }, { x: this.x + 0.3 * s, y: 1.5 * s, z: this.z + 0.26 * s }); if (tb < best) { best = tb; head = false; }
    return best < maxT ? { t: best, head } : null;
  }
  damage(n, dir, head, splash) {
    if (this.dead) return false; this.hp -= n; this.hitFlash = 0.12;
    if (this.state === 'patrol') { this.state = 'alert'; this.alertT = 0.15; }
    this.x += dir.x * 0.05; this.z += dir.z * 0.05;
    if (this.hp <= 0) { this.die(dir, head); return true; }
    if (Math.random() < 0.25) bark('hurt', this.x, this.z);
    if (this.type === 'boss' && !this.phase2 && this.hp < this.maxhp * 0.5) { this.phase2 = true; this.c = Object.assign({}, this.c, { speed: 3.3, rate: 0.09 }); if (storyHook.bossPhase) storyHook.bossPhase(this); }
    return false;
  }
  die(dir, head) {
    this.dead = true; this.state = 'dead'; this.fall = 0; this.fdir = dir.clone ? dir.clone() : new V3(0, 0, 1); sfxTick(140, 0.3, 0.2);
    kills++; if (killHook) killHook(this); addFeed(head ? 'ضربة راس' : 'إنت خلّصت واحد', head);
    if (Math.random() < 0.4 && this.type !== 'boss') addItem(Math.random() < 0.5 ? 'ammo' : 'health', this.x, this.z);
    if (this.type === 'boss') { FX.slowT = 1.8; }
  }
  sees() {
    const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz); if (dist > 55) return false;
    const inv = 1 / (dist || 1); return rayBoxes(this.x, 1.5, this.z, dx * inv, (1.35 - 1.5) * inv, dz * inv, dist) === Infinity;
  }
  move(dx, dz, sp, dt) { const l = Math.hypot(dx, dz) || 1; this.x += dx / l * sp * dt; this.z += dz / l * sp * dt; const p = { x: this.x, z: this.z }; collideCircle(p, 0.38); this.x = p.x; this.z = p.z; for (const o of enemies) { if (o === this || o.dead) continue; const ox = this.x - o.x, oz = this.z - o.z, d = Math.hypot(ox, oz); if (d < 0.8 && d > 0.001) { this.x += ox / d * (0.8 - d) * 0.5; this.z += oz / d * (0.8 - d) * 0.5; } } }
  faceTo(x, z, dt, k = 8) { const t = Math.atan2(-(x - this.x), -(z - this.z)); let d = t - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * k); }
  shoot() {
    const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz), s = this.c.scale; const from = new V3(this.x - Math.sin(this.yaw) * 0.6, 1.22 * s, this.z - Math.cos(this.yaw) * 0.6);
    const err = 0.02 + dist * 0.0022 + (this.type === 'boss' ? -0.01 : 0), off = Math.sqrt(Math.random()) * err * dist;
    const a = rand(0, TAU), tgt = new V3(P.x + Math.cos(a) * off, 1.3 + Math.sin(a) * off * 0.7, P.z + Math.sin(a) * off);
    const hitP = off < 0.42 * (Math.hypot(P.vx, P.vz) > 3 ? 0.75 : 1);
    spawnTracer(from, hitP ? new V3(P.x, 1.3, P.z) : tgt, this.type === 'heavy' ? 0xffb070 : 0xff8a5a, 0.9); this.flashT = 0.05;
    const pan = clamp(Math.sin(Math.atan2(this.x - P.x, this.z - P.z) - P.yaw + Math.PI) * 0.8, -0.9, 0.9);
    sfxShot(this.type === 'heavy' ? 'shotgun' : 'enemy', clamp(1.1 - dist / 55, 0.2, 0.9), pan, dist > 25 ? 2600 : 0);
    if (hitP) hurtPlayer(this.c.dmg * (this.type === 'heavy' ? 1 : rand(0.8, 1.2)), from);
    else { const bd = tgt.clone().sub(from).normalize(), r = rayBoxes(from.x, from.y, from.z, bd.x, bd.y, bd.z, 60); if (r !== Infinity && r < dist + 3) { const p = from.clone().addScaledVector(bd, r); sparks(p, 3, bd.clone().negate(), 2, 0.6); } if (dist < 4) sfxTick(rand(2400, 3400), 0.1, 0.12); }
  }
  update(dt) {
    const m = this.m; this.t += dt; barkCool = Math.max(0, barkCool - dt * 0.05);
    if (this.dead) {
      this.fall = Math.min(1, this.fall + dt * 2.2); const e = 1 - Math.pow(1 - this.fall, 3); m.g.rotation.x = -e * 1.5; m.g.position.y = -e * 0.35; m.legL.rotation.x = e * 0.4; m.armL.rotation.x = e * 1.2; m.armR.rotation.z = -e * 0.8; return;
    }
    const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz), sees = this.sees() && !P.dead; let moving = false, sp = 0;
    if (this.state === 'patrol') {
      const w = this.patrol[this.pi]; const wx = w[0] - this.x, wz = w[1] - this.z; if (Math.hypot(wx, wz) < 0.8) { this.pi = (this.pi + 1) % this.patrol.length; } else { this.faceTo(w[0], w[1], dt, 5); this.move(wx, wz, 1.3, dt); moving = true; sp = 1.3; }
      const ang = Math.atan2(-(dx), -(dz)) - this.yaw; const inFov = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) < 1.1;
      if (sees && (dist < 12 || (dist < 34 && inFov))) { this.state = 'alert'; this.alertT = 0.35 + Math.random() * 0.25; bark('alert', this.x, this.z); alertEnemies(this.x, this.z, 20); }
    } else if (this.state === 'alert') {
      this.faceTo(P.x, P.z, dt, 10); this.alertT -= dt; if (this.alertT <= 0) { this.state = 'combat'; this.react = 0.4; }
    } else if (this.state === 'combat') {
      this.faceTo(this.lastKnown ? this.lastKnown[0] : P.x, this.lastKnown ? this.lastKnown[1] : P.z, dt, 9);
      if (sees) { this.lastKnown = [P.x, P.z]; this.lostT = 0; this.react -= dt;
        this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rand(1, 2.6); }
        const pref = this.c.pref, ux = dx / (dist || 1), uz = dz / (dist || 1); let mx = 0, mz = 0;
        if (dist > pref + 3) { mx += ux; mz += uz; } else if (dist < pref - 4) { mx -= ux; mz -= uz; }
        mx += -uz * this.strafe * 0.7; mz += ux * this.strafe * 0.7; const l = Math.hypot(mx, mz); if (l > 0.05) { sp = this.c.speed * (this.type === 'boss' ? 0.8 : 0.7); this.move(mx, mz, sp, dt); moving = true; }
        this.shootT -= dt;
        if (this.react <= 0 && this.shootT <= 0) { if (this.burst <= 0 && this.pauseT <= 0) { this.burst = Math.round(rand(this.c.burst[0], this.c.burst[1])); }
          if (this.burst > 0) { this.shoot(); this.burst--; this.shootT = this.c.rate; if (this.burst <= 0) { this.pauseT = rand(this.c.pause[0], this.c.pause[1]); this.shootT = this.pauseT; this.pauseT = 0; } } }
      } else {
        this.lostT += dt; if (this.lastKnown) { const wx = this.lastKnown[0] - this.x, wz = this.lastKnown[1] - this.z; if (Math.hypot(wx, wz) > 1.2) { this.move(wx, wz, this.c.speed, dt); moving = true; sp = this.c.speed; } else this.lastKnown = [P.x, P.z]; }
        if (this.lostT > 8) { this.state = 'patrol'; this.lastKnown = null; }
      }
    }
    // animation
    const sw = moving ? Math.sin(this.t * (4 + sp * 2)) * Math.min(0.7, sp * 0.3 + 0.2) : 0; m.legL.rotation.x = sw; m.legR.rotation.x = -sw;
    const aim = this.state === 'combat' || this.state === 'alert'; m.armR.rotation.x = aim ? -1.35 : -0.2 + -sw * 0.6; m.armL.rotation.x = aim ? -1.25 : -0.2 + sw * 0.6; m.armL.rotation.z = aim ? 0.35 : 0; m.gun.rotation.x = aim ? 0 : 0.5; m.gun.position.y = aim ? 1.22 : 1.0;
    m.g.rotation.y = this.yaw; m.g.position.x = this.x; m.g.position.z = this.z; m.g.position.y = Math.abs(Math.sin(this.t * (4 + sp * 2))) * (moving ? 0.04 : 0);
    this.flashT = Math.max(0, this.flashT - dt); m.flash.material.opacity = this.flashT > 0 ? 1 : 0;
    this.hitFlash = Math.max(0, this.hitFlash - dt); const hf = this.hitFlash > 0; m.mats[0].emissive.setHex(hf ? 0x881111 : 0); m.mats[1].emissive.setHex(hf ? 0x551111 : 0);
  }
}
function alertEnemies(x, z, r) { for (const e of enemies) { if (e.dead || e.state !== 'patrol') continue; if (Math.hypot(e.x - x, e.z - z) < r) { e.state = 'alert'; e.alertT = 0.3 + Math.random() * 0.5; e.lastKnown = [P.x, P.z]; } } }
let kills = 0, killHook = null; const storyHook = {};
function aliveCount(pred) { let n = 0; for (const e of enemies) if (!e.dead && (!pred || pred(e))) n++; return n; }
