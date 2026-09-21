
/* ================= HUD, story and flow ================= */
let state = 'title', gameT = 0; const stat = { shots: 0 };
const feedEl = $('#feed');
function addFeed(text, gold) { const d = document.createElement('div'); d.textContent = text; if (gold) d.style.color = '#ffb84a'; feedEl.appendChild(d); while (feedEl.children.length > 4) feedEl.removeChild(feedEl.firstChild); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 600); }, 2600); }
function hudAmmo() { const a = P.ammo[P.weapon]; $('#am').textContent = a.mag; $('#ar').textContent = '/ ' + a.res; $('#wn').textContent = W[P.weapon].name; }
function hudHp() { $('#hp .bar i').style.width = Math.max(0, P.hp) + '%'; }
let msgT = 0; function msg(t, ms = 2200) { const m = $('#msg'); m.textContent = t; m.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => m.classList.remove('on'), ms); }
function setObj(t) { $('#obj').textContent = t; }
/* voice lines: durations are measured from the clips when available */
const DUR = {}; for (const k in VOICE) { try { const a = new Audio(VOICE[k]); a.addEventListener('loadedmetadata', () => { DUR[k] = a.duration; }); } catch (e) {} }
const lineDur = t => { const d = DUR[hashText(t)]; return d ? d + 0.5 : 0.9 + t.length * 0.075; };
let subT = 0;
function say(who, text) { const s = $('#sub'); s.innerHTML = '<b>' + who + ':</b>' + text; clearTimeout(subT); const d = lineDur(text); subT = setTimeout(() => { s.innerHTML = ''; }, d * 1000 + 300); speak(who, text, 1); return d; }
function sequence(lines, done) { let i = 0; const next = () => { if (i >= lines.length) { if (done) done(); return; } const [who, text, gap] = lines[i++]; const d = say(who, text); setTimeout(next, (d + (gap || 0.25)) * 1000); }; next(); }

/* every spoken line is written as { who, text } so the voice tool can find it */
const L = {
  intro: [
    { who: 'سيد', text: 'الساعة تلاتة الفجر، والمطر مش راضي يقف.' },
    { who: 'سيد', text: 'الشنطة اللي وصّلتها امبارح للحاج صلاح مكانتش هدوم.' },
    { who: 'سيد', text: 'كانت أدوية مضروبة. وشحتة شافها، فاتمسك.' },
    { who: 'الأسطى فتحي', text: 'سيد! إنت رايح فين؟ ده مخزن الحاج صلاح، الحراس فيه أكتر من الفيران!' },
    { who: 'سيد', text: 'شحتة عيّل يا أسطى. مش هسيبه.' },
    { who: 'الأسطى فتحي', text: 'طب خد بالك. في سلاح جنب الصناديق اللي عند الباب، وأنا معاك على الخط.' }
  ],
  rifle: [{ who: 'سيد', text: 'كلاشن. يعني الليلة دي مش هتعدّي بالساهل.' }],
  gate: [{ who: 'الحاج صلاح', text: 'أهلاً يا سيد. كنت فاكرك سواق توكتوك وبس. يا رجالة، خلّصوا عليه!' }],
  yardDone: [{ who: 'الأسطى فتحي', text: 'الباب اتفتح! ادخل المخزن، بس بحذر، لسه ناس جواه.' }],
  enter: [{ who: 'الحاج صلاح', text: 'بلاش تدخل جوّه. الصقر مستنيك.' }],
  whDone: [{ who: 'سيد', text: 'شحتة! اتفضل... المكتب هناك.' }, { who: 'الصقر', text: 'جاي تلعب البطل؟ الحاج صلاح قالّي أخلّص عليك، وأنا مبخسرش.' }],
  phase2: [{ who: 'الصقر', text: 'كفاية لعب! يا رجالة، تعالوا!' }],
  end: [{ who: 'سيد', text: 'خلاص يا شحتة، خلاص. خرّجنا من هنا.' }, { who: 'شحتة', text: 'أنا كنت هموت. الأدوية دي كتير أوي يا سيد.' }, { who: 'سيد', text: 'صوّرت كل حاجة. الشنطة هتوصل، بس للنيابة.' }]
};
const BARK_LINES = [{ who: 'حارس', text: 'في حد هنا!' }, { who: 'حارس', text: 'مين هناك؟' }, { who: 'حارس', text: 'ده الغريب!' }, { who: 'حارس', text: 'ضربوه!' }, { who: 'حارس', text: 'امسكوه!' }, { who: 'حارس', text: 'آه!' }, { who: 'حارس', text: 'اتصاب!' }, { who: 'حارس', text: 'ياااه!' }, { who: 'حارس', text: 'حاصروه!' }, { who: 'حارس', text: 'من الشمال!' }, { who: 'حارس', text: 'خلاص!' }];
const play = (arr, done) => sequence(arr.map(l => [l.who, l.text]), done);

/* enemy placement */
function spawnEnemies() {
  enemies.forEach(e => worldG.remove(e.m.g)); enemies.length = 0;
  const E = (type, x, z, zone, patrol) => { const e = new Enemy(type, x, z, patrol); e.zone = zone; return e; };
  E('guard', -12, 15, 'yard', [[-12, 15], [-12, 27]]); E('guard', 12, 14, 'yard', [[12, 14], [20, 27]]); E('guard', 0, 3, 'yard', [[0, 3], [-8, -3], [8, -3]]);
  E('guard', -26, 4, 'yard', [[-26, 4], [-26, -12]]); E('guard', 27, -2, 'yard', [[27, -2], [27, -14]]); E('guard', -6, -11, 'yard', [[-6, -11], [6, -11]]);
  E('guard', 19, 8, 'yard', [[19, 8], [24, 0]]); E('guard', -20, -6, 'yard', [[-20, -6], [-14, -12]]); E('heavy', 2, 9, 'yard', [[2, 9], [-2, 9]]);
  E('guard', -16, -20, 'wh', [[-16, -20], [-16, -30]]); E('guard', 16, -20, 'wh', [[16, -20], [16, -30]]); E('guard', 0, -24, 'wh', [[-6, -24], [6, -24]]);
  E('guard', -16, -33, 'wh', [[-16, -33], [-6, -33]]); E('guard', 16, -33, 'wh', [[16, -33], [6, -33]]); E('guard', -4, -33, 'wh', [[-4, -33], [4, -33]]);
  E('heavy', 10, -22, 'wh', [[10, -22], [10, -28]]); E('heavy', -10, -30, 'wh', [[-10, -30], [-10, -24]]);
}
const S = { stage: 0 };
function resetWorld() {
  for (const b of barrels) { b.alive = true; b.mesh.visible = true; b.solid.solid = true; }
  for (const l of lamps) { l.alive = true; l.glow.visible = true; l.pool.visible = true; l.head.material = MAT.hi; if (l.light) l.light.intensity = 1.25; }
  items.forEach(i => worldG.remove(i.mesh)); items.length = 0;
  addItem('rifle', 5, 24); addItem('health', -6, 29); addItem('health', 0, -18); addItem('shotgun', -3, -17.5); addItem('health', -16, -36); addItem('ammo', 20, 12); addItem('ammo', -20, 16); addItem('ammo', 12, -30); addItem('health', 26, -30);
  rollDoor.solid = true; rollDoor.mesh.visible = true; rollDoor.mesh.position.y = 1.8; officeDoor.solid = true; officeDoor.mesh.visible = true; officeDoor.mesh.position.y = 1.5;
  gate.solid = false; gate.mesh.visible = false; decals.forEach(d => d.visible = false); shehata.visible = true;
  Object.assign(P, { x: 0, z: 32, vx: 0, vz: 0, yaw: 0, pitch: 0, hp: 100, dead: false, weapon: 0, unlocked: [true, false, false], reloadT: 0, fireT: 0, kick: 0, swap: 0, frozen: false });
  P.ammo = [{ mag: 12, res: 48 }, { mag: 0, res: 0 }, { mag: 0, res: 0 }]; showWeapon(); hudAmmo(); hudHp();
  kills = 0; stat.shots = 0; gameT = 0; S.stage = 0; S.bossDead = false; FX.slowT = 0; FX.dmgT = 0; spawnEnemies();
}
function playerDie() { P.dead = true; state = 'over'; document.exitPointerLock && document.exitPointerLock(); $('#endT').textContent = 'اتقتلت'; $('#endT').style.color = '#ff5a5a'; $('#endP').textContent = 'الحرس لحقوك. حاول تاني بحذر أكتر.'; $('#stats').innerHTML = 'عدد اللي خلّصتهم: ' + kills; $('#again').textContent = 'حاول تاني'; $('#end').classList.remove('hidden'); $('#hud').classList.add('hidden'); }
function winGame() {
  state = 'over'; document.exitPointerLock && document.exitPointerLock(); $('#endT').textContent = 'خلّصت الليلة'; $('#endT').style.color = '#5fe0a0'; $('#endP').textContent = 'شحتة معاك، وكل الأدلة في إيدك. الحاج صلاح لسه هارب... الفصل الجاي قريب.';
  $('#stats').innerHTML = 'اللي خلّصتهم: ' + kills + '<br>الوقت: ' + Math.floor(gameT / 60) + ':' + String(Math.floor(gameT % 60)).padStart(2, '0') + '<br>صحتك: ' + Math.round(P.hp) + '%'; $('#again').textContent = 'العب تاني'; $('#end').classList.remove('hidden'); $('#hud').classList.add('hidden');
}
function sfxSiren(dur = 6) { if (!AU.ac) return; const ac = AU.ac, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; o.connect(f); f.connect(g); g.connect(AU.master); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 1); g.gain.linearRampToValueAtTime(0, t + dur);
  for (let i = 0; i < dur * 2; i++) o.frequency.setValueAtTime(i % 2 ? 620 : 860, t + i * 0.5); o.start(t); o.stop(t + dur); }
killHook = (e) => { if (e.type === 'boss') { S.bossDead = true; setTimeout(() => { S.stage = 6; play(L.end, () => { sfxSiren(6); setTimeout(winGame, 2600); }); }, 2200); } };
storyHook.bossPhase = (boss) => { play(L.phase2); const E2 = (x, z) => { const e = new Enemy('guard', x, z); e.zone = 'boss'; e.state = 'combat'; e.lastKnown = [P.x, P.z]; }; E2(-6, -24); E2(6, -24); msg('الصقر بيطلب دعم!'); };
function storyUpdate() {
  const aliveZone = z => aliveCount(e => e.zone === z);
  if (S.stage === 0) { if (P.unlocked[1]) { S.stage = 1; play(L.rifle); } }
  if (S.stage <= 1 && P.z < 26) { S.stage = 2; gate.solid = true; gate.mesh.visible = true; gate.mesh.position.y = 1.5; sfxMetal(); msg('البوابة اتقفلت!'); play(L.gate); enemies.forEach(e => { if (e.zone === 'yard' && !e.dead) { e.state = 'alert'; e.alertT = 0.5 + Math.random() * 1.2; e.lastKnown = [P.x, P.z]; } }); }
  if (S.stage === 2) { setObj('خلّص الحرس اللي في الحوش: ' + aliveZone('yard')); if (aliveZone('yard') === 0) { S.stage = 3; rollDoor.solid = false; rollDoor.mesh.visible = false; sfxMetal(); msg('الباب اتفتح'); play(L.yardDone); setObj('ادخل المخزن'); } }
  if (S.stage === 3 && P.z < -15) { S.stage = 4; play(L.enter); enemies.forEach(e => { if (e.zone === 'wh' && !e.dead && e.state === 'patrol' && Math.random() < 0.6) { e.state = 'alert'; e.alertT = 0.6 + Math.random() * 1.5; e.lastKnown = [P.x, P.z]; } }); }
  if (S.stage === 4) { setObj('خلّص اللي جوه المخزن: ' + aliveZone('wh')); if (aliveZone('wh') === 0) { S.stage = 5; officeDoor.solid = false; officeDoor.mesh.visible = false; sfxMetal(); const b = new Enemy('boss', 0, -37); b.zone = 'boss'; b.state = 'alert'; b.alertT = 3.5; b.lastKnown = [P.x, P.z]; const g1 = new Enemy('guard', -3, -35); g1.zone = 'boss'; g1.state = 'alert'; g1.alertT = 4; const g2 = new Enemy('guard', 3, -35); g2.zone = 'boss'; g2.state = 'alert'; g2.alertT = 4.5; play(L.whDone); setObj('اقتل الصقر وخد شحتة'); } }
  if (S.stage === 5) { const boss = enemies.find(e => e.type === 'boss'); if (boss && !boss.dead) setObj('الصقر: ' + Math.max(0, Math.round(boss.hp / boss.maxhp * 100)) + '%'); }
}
function itemsUpdate(dt) {
  for (const it of items) { if (it.taken) continue; it.mesh.rotation.y += dt * 1.5; it.mesh.position.y = 0.75 + Math.sin(performance.now() * 0.003 + it.x) * 0.08; if (Math.hypot(it.x - P.x, it.z - P.z) > 1.3) continue;
    if (it.type === 'health') { if (P.hp >= 100) continue; P.hp = Math.min(100, P.hp + 40); hudHp(); msg('+ صحة', 900); }
    else if (it.type === 'ammo') { for (let i = 0; i < 3; i++) if (P.unlocked[i]) P.ammo[i].res += [24, 45, 8][i]; msg('+ ذخيرة', 900); }
    else if (it.type === 'rifle') { P.unlocked[1] = true; P.ammo[1].mag = 30; P.ammo[1].res = 90; switchWeapon(1); msg('كلاشن!', 1200); }
    else if (it.type === 'shotgun') { P.unlocked[2] = true; P.ammo[2].mag = 6; P.ammo[2].res = 18; switchWeapon(2); msg('شوتجن!', 1200); }
    it.taken = true; it.mesh.visible = false; hudAmmo(); sfxTick(700, 0.12, 0.15); sfxTick(1000, 0.1, 0.18); }
}

/* ================= input ================= */
const cap = (el, id) => { try { el.setPointerCapture(id); } catch (e) {} };
const keys = {}; const inp = { lookX: 0, lookY: 0, mx: 0, my: 0, fire: false, touch: false };
addEventListener('keydown', e => { keys[e.code] = true; if (state !== 'play') return; if (e.code === 'KeyR') startReload(); if (e.code === 'Digit1') switchWeapon(0); if (e.code === 'Digit2') switchWeapon(1); if (e.code === 'Digit3') switchWeapon(2); if (e.code === 'KeyQ') cycleWeapon(); });
addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousedown', e => { if (state !== 'play' || inp.touch) return; if (document.pointerLockElement !== canvas) { canvas.requestPointerLock && canvas.requestPointerLock(); } else inp.fire = true; });
addEventListener('mouseup', () => { if (!inp.touch) inp.fire = false; });
addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { inp.lookX += e.movementX * 0.0022; inp.lookY += e.movementY * 0.0022; } });
function enableTouch() { if (inp.touch) return; inp.touch = true; P.aimAssist = true; document.body.classList.remove('desk'); document.body.classList.add('touchmode'); document.querySelectorAll('.touch').forEach(e => e.classList.remove('hidden')); }
if (matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0) { enableTouch(); }
addEventListener('touchstart', enableTouch, { passive: true }); addEventListener('pointerdown', e => { if (e.pointerType === 'touch') enableTouch(); }, true);
{ const st = $('#stick'), knob = $('#knob'); let sid = null, ox = 0, oy = 0;
  st.addEventListener('pointerdown', e => { if (sid !== null) return; sid = e.pointerId; cap(st, sid); ox = e.clientX; oy = e.clientY; knob.style.display = 'block'; knob.style.left = (ox - 46) + 'px'; knob.style.top = (oy - 46) + 'px'; knob.style.position = 'fixed'; });
  st.addEventListener('pointermove', e => { if (e.pointerId !== sid) return; let dx = (e.clientX - ox) / 46, dy = (e.clientY - oy) / 46; const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } inp.mx = dx; inp.my = dy; knob.firstElementChild.style.transform = 'translate(' + dx * 30 + 'px,' + dy * 30 + 'px)'; });
  const up = e => { if (e.pointerId !== sid) return; sid = null; inp.mx = inp.my = 0; knob.style.display = 'none'; knob.firstElementChild.style.transform = ''; };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up); }
{ const lk = $('#look'); let lid = null, lx = 0, ly = 0;
  lk.addEventListener('pointerdown', e => { if (lid !== null) return; lid = e.pointerId; cap(lk, lid); lx = e.clientX; ly = e.clientY; });
  lk.addEventListener('pointermove', e => { if (e.pointerId !== lid) return; inp.lookX += (e.clientX - lx) * 0.0058; inp.lookY += (e.clientY - ly) * 0.0058; lx = e.clientX; ly = e.clientY; });
  const up = e => { if (e.pointerId === lid) lid = null; }; lk.addEventListener('pointerup', up); lk.addEventListener('pointercancel', up); }
function bindHold(id, on, off) { const el = $(id); el.addEventListener('pointerdown', e => { e.preventDefault(); cap(el, e.pointerId); el.classList.add('on'); on(); }); const up = e => { el.classList.remove('on'); if (off) off(); }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); }
bindHold('#bF', () => { inp.fire = true; }, () => { inp.fire = false; }); bindHold('#bR', startReload); bindHold('#bW', cycleWeapon); bindHold('#bS', () => { P.sprint = !P.sprint; });

/* ================= per-frame ================= */
function playerUpdate(dt) {
  if (P.dead) return;
  if (!P.frozen) { P.yaw -= inp.lookX; P.pitch = clamp(P.pitch - inp.lookY, -1.35, 1.35); } inp.lookX = inp.lookY = 0;
  let ax = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + inp.mx, az = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + inp.my;
  const mag = Math.hypot(ax, az); if (mag > 1) { ax /= mag; az /= mag; } if (P.frozen) { ax = az = 0; }
  const sprint = (keys.ShiftLeft || keys.ShiftRight || P.sprint) && mag > 0.3 && az < -0.2; const sp = sprint ? 6.4 : 4.1;
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), tx = (ax * cy + az * sy) * sp, tz = (-ax * sy + az * cy) * sp;
  const k = 1 - Math.exp(-13 * dt); P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k; P.x += P.vx * dt; P.z += P.vz * dt; collideCircle(P, 0.42);
  const speed = Math.hypot(P.vx, P.vz); P.bob += dt * speed * 1.9; P.stepT -= dt * speed; if (P.stepT <= 0 && speed > 1) { sfxStep(sprint); P.stepT = 2.1; }
  P.fireT = Math.max(0, P.fireT - dt); P.swap = Math.max(0, P.swap - dt); P.kick = Math.max(0, P.kick - dt * 7);
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; finishReload(); hudAmmo(); } }
  if (inp.fire && (W[P.weapon].auto || inp.touch || !P.wasFire)) { fire(); hudAmmo(); stat.shots++; } P.wasFire = inp.fire;
  if (performance.now() / 1000 - P.lastHurt > 6 && P.hp < 60) { P.hp = Math.min(60, P.hp + dt * 4); }
  hudHp();
  yawObj.position.set(P.x, 1.65 + Math.sin(P.bob) * 0.035 * Math.min(1, speed / 4), P.z); yawObj.rotation.y = P.yaw;
  camera.rotation.z = Math.sin(P.bob * 0.5) * 0.004 * speed + (Math.random() - 0.5) * FX.shake * 0.02;
  pitchObj.rotation.x = P.pitch;
  const base = new V3(0.19, -0.2, -0.4), rl = P.reloadT > 0 ? Math.sin((1 - P.reloadT / W[P.weapon].reload) * Math.PI) : 0, sw = P.swap / 0.28;
  vm.position.set(base.x + Math.sin(P.bob * 0.5) * 0.012 * Math.min(1, speed / 4) + (Math.random() - 0.5) * FX.shake * 0.004, base.y - rl * 0.16 - sw * 0.25 + Math.abs(Math.sin(P.bob)) * 0.012 * Math.min(1, speed / 4) - (sprint ? 0.03 : 0), base.z + P.kick * 0.07);
  vm.rotation.set(P.kick * 0.13 + rl * 0.55 + (sprint ? 0.25 : 0), (sprint ? -0.35 : 0) + Math.sin(P.bob * 0.5) * 0.01, rl * -0.2);
  const fov = (innerWidth / innerHeight < 1 ? 82 : 72) + (sprint ? 5 : 0) + P.kick * 2; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 10); camera.updateProjectionMatrix(); }
  mflash.material.opacity = Math.max(0, mflash.material.opacity - dt * 22); mflash2.material.opacity = Math.max(0, mflash2.material.opacity - dt * 16);
}
function screenFx(dt) {
  FX.shake = Math.max(0, FX.shake - dt * 3.2); FX.dmgT = Math.max(0, FX.dmgT - dt * 0.9); FX.flashT = Math.max(0, FX.flashT - dt * 2);
  const low = P.hp < 35 && !P.dead ? (35 - P.hp) / 35 * 0.55 : 0; $('#dmg').style.opacity = Math.min(1, Math.max(FX.dmgT, low)); $('#flash').style.opacity = FX.flashT;
  if (low > 0) { AU.heart = (AU.heart || 0) - dt; if (AU.heart <= 0) { sfxHeart(); AU.heart = 1.0; } }
  FX.hitT = Math.max(0, FX.hitT - dt); $('#hit').style.opacity = FX.hitT > 0 ? FX.hitT / 0.16 : 0;
  camera.position.x = (Math.random() - 0.5) * FX.shake * 0.05; camera.position.y = (Math.random() - 0.5) * FX.shake * 0.05;
  AU.combat = lerp(AU.combat, aliveCount(e => e.state === 'combat') > 0 ? 1 : 0, Math.min(1, dt * 1.5));
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); const raw = Math.min(0.05, (now - last) / 1000); last = now; if (!renderer) return;
  if (FX.slowT > 0) FX.slowT -= raw; const dt = raw * (FX.slowT > 0 ? 0.3 : 1);
  if (state === 'play') { gameT += dt; playerUpdate(dt); for (const e of enemies) e.update(dt); itemsUpdate(dt); storyUpdate(); barkCool = Math.max(0, barkCool - dt); musicTick(); }
  else { yawObj.position.set(0, 1.65, 32); yawObj.rotation.y = Math.sin(now * 0.0002) * 0.25; pitchObj.rotation.x = -0.02; }
  fxUpdate(dt); screenFx(dt); renderer.render(scene, camera);
}
function begin() {
  initAudio(); resetWorld(); $('#title').classList.add('hidden'); $('#end').classList.add('hidden'); $('#hud').classList.remove('hidden'); state = 'play'; hudAmmo(); hudHp();
  if (!inp.touch && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (e) {} }
  P.frozen = false; document.body.classList.remove('cine'); setObj('خد السلاح من جنب الصناديق قدامك'); msg(inp.touch ? 'العصا الشمال للحركة، واسحب يمين للفت' : 'WASD للحركة والماوس للفت', 4000);
  play(L.intro);
}
if (!renderer) { $('#start').classList.add('hidden'); $('#nogl').classList.remove('hidden'); $('#nogl').textContent = 'الـ 3D مش شغال على جهازك أو المتصفح ده.'; }
$('#start').addEventListener('click', begin); $('#again').addEventListener('click', begin);
document.addEventListener('visibilitychange', () => { inp.fire = false; for (const k in keys) keys[k] = false; });
resetWorld(); requestAnimationFrame(frame);
window.__g = { inp, hurt: hurtPlayer, P, W, enemies, S, kills: () => kills, get state() { return state; }, explode, spawnEnemies, begin, fire, storyUpdate, camera, sparks, FX, items, barrels, gate, rollDoor };
