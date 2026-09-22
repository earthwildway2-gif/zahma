
/* ================= structure: difficulty, chapters, perks, checkpoints, throwables, silent takedowns, alarm, ranking, backlot set ================= */
let DIFFI = 1;
const DIFFS = [{ name: 'سهل', dmg: 0.6, acc: 0.75, aware: 0.7, regen: 1.6 }, { name: 'عادي', dmg: 1, acc: 1, aware: 1, regen: 1 }, { name: 'صعب', dmg: 1.4, acc: 1.25, aware: 1.3, regen: 0.6 }];
const DF = () => DIFFS[DIFFI];
const RUN = { stealthKills: 0, headshots: 0, alarms: 0, deaths: 0, throws: 0, perks: [], alarmT: 0, headMul: 0, quiet: 1, boomR: 1, regenCap: 60, regenRate: 4 };
const W0 = W.map(w => Object.assign({}, w));
function resetRun() { Object.assign(RUN, { stealthKills: 0, headshots: 0, alarms: 0, deaths: 0, throws: 0, perks: [], alarmT: 0, headMul: 0, quiet: 1, boomR: 1, regenCap: 60, regenRate: 4 }); W.forEach((w, i) => Object.assign(w, W0[i])); P.maxhp = 100; }
let CP = null;

/* ---------- perks (chosen between chapters) ---------- */
const PERKS = [
  { id: 'hp', name: 'جلد أقوى', desc: 'الصحة القصوى +30 وبتتعالج', apply() { P.maxhp += 30; P.hp = P.maxhp; hudHp(); } },
  { id: 'ammo', name: 'جيوب ذخيرة', desc: 'خزنات أكبر وذخيرة احتياطي أكتر', apply() { W[0].mag = 15; W[1].mag = 40; W[2].mag = 8; P.ammo.forEach(a => { a.res = Math.round(a.res * 1.5 + 10); }); hudAmmo(); } },
  { id: 'hands', name: 'إيد خفيفة', desc: 'تعمير أسرع 35%', apply() { W.forEach(w => { w.reload *= 0.65; }); } },
  { id: 'eagle', name: 'عين الصقر', desc: 'ضربة الراس أقوى وانتشار أقل', apply() { RUN.headMul = 3.6; W.forEach(w => { w.spread *= 0.7; }); } },
  { id: 'shadow', name: 'ظل الليل', desc: 'صوتك أهدى وهما بيلاحظوك أبطأ', apply() { RUN.quiet = 0.65; } },
  { id: 'boom', name: 'حقيبة المفرقعات', desc: '+2 قنابل و+3 زجاجات وانفجار أوسع', apply() { P.gren += 2; P.bottles += 3; RUN.boomR = 1.25; hudGear(); } },
  { id: 'adren', name: 'أدرينالين', desc: 'الصحة بتتجدد بسرعة لحد الآخر', apply() { RUN.regenCap = 999; RUN.regenRate = 9; } }
];
function applyPerk(id) { const p = PERKS.find(x => x.id === id); if (!p || RUN.perks.includes(id)) return; RUN.perks.push(id); p.apply(); }
function openChoiceN(title, opts) {
  state = 'choice'; document.exitPointerLock && document.exitPointerLock(); inp.fire = false; inp.mx = inp.my = 0; $('#chT').textContent = title; $('#choice').classList.remove('hidden');
  ['#ch1', '#ch2', '#ch3'].forEach((sel, i) => { const b = $(sel), o = opts[i]; if (!o) { b.classList.add('hidden'); return; } b.classList.remove('hidden'); b.innerHTML = o[0] + (o[2] ? '<br><small style="font-weight:500;opacity:.8">' + o[2] + '</small>' : ''); b.onclick = () => { $('#choice').classList.add('hidden'); state = 'play'; o[1](); }; });
}
function offerPerks(done) {
  const pool = PERKS.filter(p => !RUN.perks.includes(p.id)).sort(() => Math.random() - 0.5).slice(0, 3);
  if (!pool.length) { done(); return; }
  openChoiceN('اختار ميزة تكمّل بيها الليلة', pool.map(p => [p.name, () => { applyPerk(p.id); msg('ميزة جديدة: ' + p.name, 1800); done(); }, p.desc]));
}
function chapter(title, sub) { const c = $('#chap'); c.innerHTML = '<b>' + title + '</b><span>' + sub + '</span>'; c.classList.add('on'); clearTimeout(chapter.t); chapter.t = setTimeout(() => c.classList.remove('on'), 3600); }
function hudGear() { $('#gear').textContent = '🧨 ' + P.gren + '   🍾 ' + P.bottles; }

/* ---------- throwables: frag grenade and a bottle to lure guards ---------- */
const thrown = [];
function throwItem(kind) {
  if (P.dead || state !== 'play' || P.frozen) return;
  if (kind === 'gren') { if (P.gren <= 0) { msg('مفيش قنابل', 900); return; } P.gren--; } else { if (P.bottles <= 0) { msg('مفيش زجاجات', 900); return; } P.bottles--; }
  hudGear(); RUN.throws++; const o = camera.getWorldPosition(new V3()), d = camera.getWorldDirection(new V3());
  const m = new THREE.Mesh(kind === 'gren' ? new THREE.SphereGeometry(0.09, 8, 6) : new THREE.CylinderGeometry(0.04, 0.045, 0.24, 6), phong({ color: kind === 'gren' ? 0x2f4a2a : 0x6fc78a, transparent: kind !== 'gren', opacity: kind === 'gren' ? 1 : 0.75 })); effG.add(m);
  const v = d.clone().multiplyScalar(kind === 'gren' ? 13 : 16); v.y += 3.4; thrown.push({ m, p: o.clone().addScaledVector(d, 0.5), v, kind, t: kind === 'gren' ? 2.3 : 6 }); sfxClick(0.45, 700);
}
function shatter(th) { sparks(th.p, 12, new V3(0, 1, 0), 3, 0.8, [0.7, 1, 0.85]); if (AU.ac && AU.sound) { const t = AU.ac.currentTime; burst(t, 0.16, 0.5, 'highpass', 3800, 0.8, g => chain(g, 1, 0, 0.4, 0)); burst(t + 0.05, 0.1, 0.3, 'highpass', 5200, 1, g => chain(g, 1, 0, 0.4, 0)); } emitNoise(th.p.x, th.p.z, 24, 'lure'); }
function thrownUpdate(dt) {
  for (let i = thrown.length - 1; i >= 0; i--) {
    const th = thrown[i]; th.t -= dt; th.v.y -= 13 * dt; const np = th.p.clone().addScaledVector(th.v, dt), seg = np.clone().sub(th.p), L = seg.length(); let gone = false;
    if (L > 1e-4) { seg.multiplyScalar(1 / L); const out = {}, t = rayBoxes(th.p.x, th.p.y, th.p.z, seg.x, seg.y, seg.z, L, out);
      if (t < L) { th.p.addScaledVector(seg, Math.max(0, t - 0.02)); const n = new V3(out.nx, out.ny, out.nz); th.v.addScaledVector(n, -2 * th.v.dot(n)).multiplyScalar(0.45); if (th.kind === 'bottle') { shatter(th); gone = true; } else sfxImpact(0, 0.4, true); } else th.p.copy(np); }
    if (!gone && th.p.y < 0.1) { th.p.y = 0.1; if (Math.abs(th.v.y) > 1.2) { th.v.y *= -0.4; th.v.x *= 0.7; th.v.z *= 0.7; if (th.kind === 'bottle') { shatter(th); gone = true; } else sfxImpact(0, 0.3, false); } else { th.v.y = 0; th.v.x *= 0.85; th.v.z *= 0.85; } }
    th.m.position.copy(th.p); th.m.rotation.x += dt * 8;
    if (!gone && th.t <= 0) { if (th.kind === 'gren') { explode(th.p.x, th.p.z, 7.5 * RUN.boomR, 150); gone = true; } else { shatter(th); gone = true; } }
    if (gone) { effG.remove(th.m); thrown.splice(i, 1); }
  }
}

/* ---------- silent takedown ---------- */
function takedownTarget() {
  for (const e of enemies) {
    if (e.dead || (e.state !== 'patrol' && e.state !== 'suspicious')) continue; const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz); if (d > 1.9) continue;
    const fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw); if ((fx * dx + fz * dz) / d > -0.15 || Math.hypot(P.vx, P.vz) > 4.8) continue; return e;
  }
  return null;
}
function silentTakedown(e) { RUN.stealthKills++; e.die(new V3(0, 0, 1), false, true); msg('اخنقته بصمت', 1200); sfxThud && sfxThud(0.4, 260); emitNoise(P.x, P.z, 3.5, 'step'); }

/* ---------- alarm ---------- */
function raiseAlarm(src) {
  if (RUN.alarmT > 0) return; RUN.alarmT = 22; RUN.alarms++; msg('إنذار!', 1800); $('#alarm').classList.add('on'); sfxSiren(4);
  for (const e of enemies) { if (e.dead || e === src || e.zone !== src.zone) continue; if (e.state === 'patrol') { e.state = 'suspicious'; e.aware = Math.max(e.aware, 0.55); e.inv = [P.x, P.z]; e.invT = 12; } }
}
function structUpdate(dt) {
  if (RUN.alarmT > 0) { RUN.alarmT -= dt; if (RUN.alarmT <= 0) $('#alarm').classList.remove('on'); }
  let a = 0; for (const e of enemies) { if (e.dead || e.state === 'surrender') continue; if (e.state === 'combat' || e.state === 'alert') { a = 1; break; } if (e.state === 'suspicious' || e.state === 'patrol') a = Math.max(a, e.aware); }
  const eye = $('#eye'); eye.classList.toggle('hidden', state !== 'play'); const bar = eye.querySelector('i'); bar.style.width = Math.round(a * 100) + '%'; bar.style.background = a >= 1 ? '#ff3b3b' : a > 0.5 ? '#ffb030' : '#7fd66a'; eye.querySelector('span').textContent = a >= 1 ? '🔴' : (a > 0.05 ? '👁' : '🕶');
  thrownUpdate(dt);
  for (const s of SWEEP) s.rotation.y += dt * s.userData.sp; if (CRANE) CRANE.rotation.y = Math.sin(performance.now() * 0.0003) * 0.9;
}

/* ---------- checkpoints ---------- */
function saveCheckpoint() {
  CP = { stage: S.stage, fathy: S.fathy, mercy: S.mercy, evidence, kills, gameT, fallen: fallen.slice(), perks: RUN.perks.slice(), unlocked: P.unlocked.slice(), weapon: P.weapon, ammo: P.ammo.map(a => ({ mag: a.mag, res: Math.max(a.res, 30) })),
         gren: Math.max(P.gren, 1), bottles: Math.max(P.bottles, 2), pos: [P.x, P.z, P.yaw], dead: enemies.map(e => (e.dead ? 1 : 0)), taken: items.map(i => (i.taken ? 1 : 0)) };
}
function applyStageEnv(st) {
  if (st >= 2) { gate.solid = true; gate.mesh.visible = true; gate.mesh.position.y = 1.5; }
  if (st >= 3) { rollDoor.solid = false; rollDoor.mesh.visible = false; }
  if (st >= 5) { officeDoor.solid = false; officeDoor.mesh.visible = false; }
}
function restoreCheckpoint() {
  const c = CP; if (!c) return begin();
  const keep = { stealthKills: RUN.stealthKills, headshots: RUN.headshots, alarms: RUN.alarms, throws: RUN.throws, deaths: RUN.deaths + 1 };
  resetRun(); resetWorld(); Object.assign(RUN, keep); S.stage = c.stage; S.fathy = c.fathy; S.mercy = c.mercy; evidence = c.evidence; kills = c.kills; gameT = c.gameT; fallen.length = 0; c.fallen.forEach(x => fallen.push(x));
  c.perks.forEach(id => applyPerk(id)); P.hp = P.maxhp; P.unlocked = c.unlocked.slice(); P.ammo = c.ammo.map(a => Object.assign({}, a)); P.weapon = c.weapon; P.gren = c.gren; P.bottles = c.bottles; P.x = c.pos[0]; P.z = c.pos[1]; P.yaw = c.pos[2]; P.dead = false; P.frozen = false;
  enemies.forEach((e, i) => { if (c.dead[i]) { e.dead = true; e.state = 'dead'; e.m.g.visible = false; e.setIcon(''); } }); items.forEach((it, i) => { if (c.taken[i]) { it.taken = true; it.mesh.visible = false; } });
  applyStageEnv(c.stage); if (c.stage === 3) spawnSurrender(); if (c.stage === 5) spawnBossGroup();
  showWeapon(); hudAmmo(); hudHp(); hudGear(); $('#end').classList.add('hidden'); $('#hud').classList.remove('hidden'); state = 'play'; $('#alarm').classList.remove('on'); RUN.alarmT = 0;
  if (!inp.touch && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (e) {} } msg('رجعت من آخر نقطة حفظ', 2000);
}
function rankOf() {
  const t = gameT, score = 1000 + RUN.stealthKills * 150 + RUN.headshots * 60 + evidence * 300 + (S.mercy || 0) * 100 - RUN.alarms * 60 - RUN.deaths * 300 - Math.max(0, t - 900) * 0.5 + (S.live ? 200 : 0);
  const r = score >= 2700 ? 'S' : score >= 2100 ? 'A' : score >= 1500 ? 'B' : score >= 900 ? 'C' : 'D'; return { score: Math.round(score), r };
}

/* ---------- backlot set dressing: fake Cairo street facades, studio lights, crane, pyramids on the horizon ---------- */
const SWEEP = []; let CRANE = null;
(function buildBacklot() {
  const facs = ['facade_downtown', 'facade_imbaba_paint', 'facade_haram'].map(n => AITEX[n] ? aiTex(n, 1, 1) : null);
  [[-32.6, 22, 1], [-32.6, 6, 0], [-32.6, -12, 2], [32.6, 26, 0], [32.6, 4, 2], [32.6, -14, 1]].forEach(([x, z, k], i) => {
    const t = facs[k % 3]; const mat = t ? new THREE.MeshPhongMaterial({ map: t, shininess: 6, color: 0xc8c8d0 }) : MAT.concrete;
    addSolid(x, z, 0.5, 9, 6.6, mat, {}); const s = solids[solids.length - 1]; s.mesh.rotation.y = 0;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 9.2), MAT.dark); roof.position.set(x + (x < 0 ? 0.2 : -0.2), 6.7, z); worldG.add(roof);
    const w = sprite(GLOW, 5, 0.25); w.position.set(x + (x < 0 ? 1.5 : -1.5), 3.5, z); worldG.add(w);
  });
  const cone = new THREE.MeshBasicMaterial({ color: 0xbcd8ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  [[-4, 20, 0.0], [14, 26, 2.1], [-22, 8, 4.2], [20, -20, 1.0]].forEach(([x, z, ph], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 5.2, 6), MAT.pole); stand.position.y = 2.6; g.add(stand);
    const arm = new THREE.Group(); arm.position.y = 5.2; arm.rotation.z = 0.55; const head = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.7), MAT.dark); arm.add(head);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 14, 14, 1, true), cone); beam.position.set(0, -7.4, 0); arm.add(beam); const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.5), MAT.hi); lens.position.set(0, -0.36, 0); lens.rotation.x = Math.PI / 2; arm.add(lens); g.add(arm); g.rotation.y = ph; g.userData.sp = 0.25 + i * 0.05; worldG.add(g); SWEEP.push(g);
  });
  const crane = new THREE.Group(); crane.position.set(24, 0, -18); const base = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 2), MAT.metalGrey); base.position.y = 0.6; crane.add(base); const mast = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.5, 0.4), MAT.pole); mast.position.y = 3.4; crane.add(mast);
  const boom = new THREE.Mesh(new THREE.BoxGeometry(9, 0.3, 0.3), MAT.metalGrey); boom.position.set(3.5, 5.6, 0); crane.add(boom); const cam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.6), MAT.dark); cam.position.set(8, 5.3, 0); crane.add(cam); worldG.add(crane); CRANE = crane;
  const pyr = (x, z, s, c) => { const p = new THREE.Mesh(new THREE.ConeGeometry(s, s * 0.62, 4, 1), new THREE.MeshLambertMaterial({ color: c })); p.rotation.y = Math.PI / 4; p.position.set(x, s * 0.31, z); worldG.add(p); };
  pyr(70, 26, 34, 0x6b6248); pyr(98, -12, 52, 0x625a41); pyr(-84, -40, 30, 0x5d553d);
  const palm = (x, z) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 5, 7), phong({ color: 0x5b4327 })); t.position.set(x, 2.5, z); worldG.add(t); for (let k = 0; k < 6; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 2.6), phong({ color: 0x2d6a35 })); f.position.set(x + Math.cos(k * 1.05) * 1.1, 5.1, z + Math.sin(k * 1.05) * 1.1); f.rotation.y = -k * 1.05; f.rotation.z = 0.5; worldG.add(f); } };
  [[-30, -26], [-30, 30], [30, 30], [30, -32], [-2, 30]].forEach(([x, z]) => palm(x, z));
})();
