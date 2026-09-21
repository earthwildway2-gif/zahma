import re, pathlib, sys
sys.path.insert(0, '/tmp/sh')
from patchlib import replace_func, find_func
d = pathlib.Path('/tmp/sh')
rd = lambda n: (d / n).read_text(encoding='utf-8')
wr = lambda n, s: (d / n).write_text(s, encoding='utf-8')
def rep(s, old, new, count=1):
    assert old in s, "missing: " + old[:90]
    return s.replace(old, new, count)

# ---------------- shell.html ----------------
h = rd('shell.html')
h = rep(h, '<div id="title" class="screen">', '<div id="prompt" class="hidden"></div>\n<button class="btn touch hidden" id="bE" style="display:none">تفاعل</button>\n<div id="choice" class="screen hidden"><h2 id="chT"></h2><button class="go" id="ch1"></button><button class="go" id="ch2"></button></div>\n<div id="title" class="screen">')
h = rep(h, '</style>', '#prompt{position:absolute;left:50%;bottom:30%;transform:translateX(-50%);background:var(--panel);border:1px solid var(--accent);border-radius:10px;padding:6px 14px;font-weight:700;font-size:15px;pointer-events:none;z-index:6}\n#bE{right:130px;bottom:92px;width:64px;height:64px;font-size:14px;background:rgba(255,138,43,.35);border-color:var(--accent)}\n#choice .go{margin-top:12px;width:min(420px,88vw);font-size:18px}\n</style>')
wr('shell.html', h)

# ---------------- core1.js (audio + AI textures) ----------------
c = rd('core1.js')
c = rep(c, '/*SFX_BEGIN*/const SFX = {};/*SFX_END*/', '/*SFX_BEGIN*/const SFX = {};/*SFX_END*/\n/*AISFX_BEGIN*/const AISFX = {};/*AISFX_END*/\n/*AITEX_BEGIN*/const AITEX = {};/*AITEX_END*/')
c = rep(c, "rg.gain.value = 0.035; rain.connect(rf); rf.connect(rg); rg.connect(AU.master); rain.start();", "rg.gain.value = 0.035; AU.rainG = rg; rain.connect(rf); rf.connect(rg); rg.connect(AU.master); rain.start();")
c = replace_func(c, 'loadSounds', '''async function loadSounds() {
  for (const k in SFX) { try { BUF[k] = await b64buf(SFX[k]); } catch (e) {} }
  for (const k in AISFX) { try { BUF[k] = await b64buf(AISFX[k]); } catch (e) {} }
  for (const k in VOICE) { try { VBUF[k] = await b64buf(VOICE[k]); } catch (e) {} }
  startBeds();
}
function startBeds() {           // AI-generated ambience: overlapping cross-faded loops
  if (!AU.ac) return;
  for (const [n, gain] of [['amb_rain', 0.55], ['amb_wind', 0.3]]) {
    const b = BUF[n]; if (!b) continue; if (AU.rainG && n === 'amb_rain') AU.rainG.gain.value = 0.008;
    const play = () => { const ac = AU.ac, s = ac.createBufferSource(), g = ac.createGain(), t = ac.currentTime, d = b.duration; s.buffer = b; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 1.6); g.gain.setValueAtTime(gain, t + d - 1.8); g.gain.linearRampToValueAtTime(0.0001, t + d - 0.1); s.connect(g); g.connect(AU.master); s.start(t); };
    play(); setInterval(play, (b.duration - 2) * 1000);
  }
}''')
# wrappers: keep the synthesized versions as fallbacks
for name in ('sfxStep', 'sfxMetal', 'sfxImpact', 'sfxHeart'):
    c = rep(c, 'function ' + name + '(', 'function ' + name + 'Synth(')
c += '''
function sfxStep(sprint) {
  if (!AU.ac || !AU.sound) return; const indoor = P.z < -14 && Math.abs(P.x) < 22, set = indoor ? ['step_metal1', 'step_metal2'] : ['step_wet1', 'step_wet2', 'step_wet3'];
  if (BUF[set[0]]) { playBuf(pickOf(set), { vol: sprint ? 0.9 : 0.6, pan: rand(-0.08, 0.08), rate: (sprint ? 1.08 : 0.97) * (0.96 + Math.random() * 0.08), wet: AU.wetNow * 0.6 }); return; }
  sfxStepSynth(sprint);
}
function sfxMetal(kind) {
  if (!AU.ac || !AU.sound) return; const nm = kind === 'gate' ? 'gate_slam' : 'door_roll';
  if (BUF[nm]) { playBuf(nm, { vol: 1, wet: 0.7 }); if (kind === 'gate') playBuf('gate_slam', { vol: 0.4, rate: 0.7, delay: 0.12, wet: 0.8 }); return; }
  sfxMetalSynth();
}
function sfxImpact(pan, vol, metal) {
  if (!AU.ac || !AU.sound) return;
  if (metal && BUF.ping1) { playBuf(pickOf(['ping1', 'ping2']), { vol: 0.5 * vol, pan, wet: 0.5, rate: 0.95 + Math.random() * 0.1 }); return; }
  if (!metal && BUF.chip) { playBuf('chip', { vol: 0.6 * vol, pan, wet: 0.3, rate: 0.95 + Math.random() * 0.1 }); return; }
  sfxImpactSynth(pan, vol, metal);
}
function sfxHeart() { if (!AU.ac || !AU.sound) return; if (BUF.heart) { playBuf('heart', { vol: 0.8, wet: 0.05 }); return; } sfxHeartSynth(); }
function sfxThunder() { if (!AU.ac || !AU.sound) return; if (BUF.thunder) playBuf('thunder', { vol: 0.9, wet: 0.6, delay: 0.3 }); else { const t = AU.ac.currentTime + 0.3, o = g => chain(g, 1, 0, 0.6, 0); burst(t, 3.5, 0.5, 'lowpass', 190, 0.5, o); thump(t, 48, 24, 2.2, 0.5, o); } setTimeout(() => { FX.flashT = Math.max(FX.flashT, 0.5); }, 250); setTimeout(() => { FX.flashT = Math.max(FX.flashT, 0.3); }, 420); }
function sfxReload(kind, total) {
  if (!AU.ac || !AU.sound) return;
  if (BUF.mag_in && kind !== 'shotgun') { playBuf('mag_in', { vol: 0.8, delay: 0.1, wet: AU.wetNow }); if (BUF.bolt) playBuf('bolt', { vol: 0.75, delay: Math.max(0.5, total * 0.62), wet: AU.wetNow }); return; }
  if (BUF.bolt && kind === 'shotgun') { playBuf('bolt', { vol: 0.8, delay: total * 0.5, rate: 0.8, wet: AU.wetNow }); return; }
  sfxClick(0.6, 1500); setTimeout(() => sfxClick(0.7, 900), total * 500);
}
'''
c = rep(c, "AU.nextPulse += 60 / (96 + AU.combat * 30) / 2; }", "AU.nextPulse += 60 / (96 + AU.combat * 30) / 2; }\n  AU.thunderT = (AU.thunderT == null ? 22 : AU.thunderT) - (dt || 0.016); if (AU.thunderT <= 0) { AU.thunderT = rand(26, 50); sfxThunder(); }")
c = c.replace('function musicTick() {', 'function musicTick(dt) {', 1)
# AI textures on the materials + a night-sky dome
c = rep(c, "hi: new THREE.MeshBasicMaterial({ color: 0xffd98a })\n};", '''hi: new THREE.MeshBasicMaterial({ color: 0xffd98a })
};
const AIL = new THREE.TextureLoader();
function aiTex(name, rx, ry) { if (!AITEX[name]) return null; const t = AIL.load(AITEX[name]); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; }
{
  const set = (m, t, col) => { if (!t) return; m.map = t; if (col != null) m.color.setHex(col); m.needsUpdate = true; };
  set(MAT.ground, aiTex('ground_wet', 30, 30), 0xdddddd); set(MAT.concrete, aiTex('concrete_wall', 5, 2), 0xffffff); set(MAT.crate, aiTex('wood_crate', 1, 1), 0xffffff); set(MAT.wall, aiTex('warehouse_wall', 9, 3), 0xdddddd);
  const mp = aiTex('metal_panel', 2, 1); if (mp) { set(MAT.metalGreen, mp, 0x5f8a6b); set(MAT.metalBlue, mp, 0x4a76a3); set(MAT.metalRed, mp, 0xb05646); set(MAT.metalGrey, mp, 0xc2c8cf); }
  if (AITEX.night_sky) { const t = AIL.load(AITEX.night_sky); const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, color: 0x8c99b0, depthWrite: false })); sky.renderOrder = -10; scene.add(sky); }
}''')
wr('core1.js', c)

# ---------------- core2.js: AI floor inside the warehouse ----------------
c2 = rd('core2.js')
c2 = rep(c2, "addSolid(0, -27, 44, 26, 0.4, MAT.dark, { y: 8 });", "addSolid(0, -27, 44, 26, 0.4, MAT.dark, { y: 8 });\nif (AITEX.warehouse_floor) { const ft = aiTex('warehouse_floor', 8, 5); const fl = new THREE.Mesh(new THREE.PlaneGeometry(44, 26), new THREE.MeshPhongMaterial({ map: ft, shininess: 60, specular: 0x445566 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.015, -27); worldG.add(fl); }")
wr('core2.js', c2)

# ---------------- core3a/3b: casings + reload ----------------
a = rd('core3a.js')
a = rep(a, "if (c.m.position.y < 0.02) { c.m.position.y = 0.02; c.v.y *= -0.35;", "if (c.m.position.y < 0.02) { if (!c.snd) { c.snd = true; playBuf(pickOf(['casing1', 'casing2']), { vol: 0.3, wet: 0.2, rate: 0.95 + Math.random() * 0.1 }); } c.m.position.y = 0.02; c.v.y *= -0.35;")
a = rep(a, "c.m.visible = true; c.life = 1.4;", "c.m.visible = true; c.life = 1.4; c.snd = false;")
wr('core3a.js', a)
b = rd('core3b.js')
b, n = re.subn(r"sfxClick\(0\.6, 1500\); setTimeout\(\(\) => sfxClick\(0\.7, 900\), w\.reload \* 500\);", "sfxReload(w.kind, w.reload);", b); assert n == 1
wr('core3b.js', b)

# ---------------- core4.js: surrendering guard pose ----------------
e = rd('core4.js')
e = rep(e, "    const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz), sees = this.sees() && !P.dead; let moving = false, sp = 0;",
 "    if (this.state === 'surrender') { const m = this.m; this.faceTo(P.x, P.z, dt, 4); m.armL.rotation.x = -2.8; m.armR.rotation.x = -2.8; m.armL.rotation.z = 0.3; m.armR.rotation.z = -0.3; m.legL.rotation.x = -1.4; m.legR.rotation.x = -1.4; if (m.legL.shin) { m.legL.shin.rotation.x = 2.4; m.legR.shin.rotation.x = 2.4; } m.gun.visible = false; m.g.position.set(this.x, -0.42, this.z); m.g.rotation.y = this.yaw; return; }\n    const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz), sees = this.sees() && !P.dead; let moving = false, sp = 0;")
wr('core4.js', e)

# ---------------- core5.js: story interactions ----------------
s = rd('core5.js')
s = rep(s, "s.innerHTML = '<b>' + who + ':</b>' + text;", "s.innerHTML = '<b>' + who.replace(/\\d+$/, '') + ':</b>' + text;")
s = rep(s, "const L = {", """const L = {
  ev1: [{ who: 'ليلى', text: 'الصورة وصلتني. الأدوية دي عليها ختم مزوّر. كمّل.' }],
  ev2: [{ who: 'ليلى', text: 'مخزن كامل من العلب دي. صوّر كمان.' }],
  ev3: [{ who: 'ليلى', text: 'كده الأدلة كاملة. دلوقتي روح لشحتة.' }],
  gAsk: [{ who: 'سيد', text: 'الصقر فين؟ قول بسرعة.' }, { who: 'حارس0', text: 'جوّه المكتب. ومعاه الموبايل اللي فيه كل حاجة.' }],
  gSpare: [{ who: 'سيد', text: 'امشي، ومتقولش إنك شفتني.' }, { who: 'حارس0', text: 'ربنا يخليك. المكتب مقفول من جوّه، خد بالك.' }],
  endSpare: [{ who: 'ليلى', text: 'شفت رحمتك مع الحارس. ده اللي بيفرق بينك وبينهم.' }],
  endEvid: [{ who: 'ليلى', text: 'الأدلة كاملة. الحاج صلاح مش هيفلت المرة دي.' }],""")
# three sfxMetal calls: gate, roller door, office door
s = s.replace("gate.mesh.position.y = 1.5; sfxMetal();", "gate.mesh.position.y = 1.5; sfxMetal('gate');", 1)
parts = s.split("sfxMetal();"); assert len(parts) >= 3, len(parts)
s = "sfxMetal('door');".join(parts)
s = rep(s, "setObj('خلّص اللي جوه المخزن: ' + aliveZone('wh'))", "setObj('خلّص اللي جوه المخزن: ' + aliveZone('wh') + ' | أدلة: ' + evidence + '/3')")
s = rep(s, "setObj('ادخل المخزن'); }", "setObj('ادخل المخزن'); spawnSurrender(); }")
s = rep(s, "play(L.end, () => { play(L.layla,", "play(L.end.concat(S.spared ? L.endSpare : [], evidence >= 3 ? L.endEvid : []), () => { play(L.layla,")
s = rep(s, "$('#endP').textContent = 'شحتة معاك، وكل الأدلة في إيدك. الحاج صلاح لسه هارب... الفصل الجاي قريب.';", "$('#endP').textContent = (evidence >= 3 ? 'شحتة معاك، والأدلة كاملة في إيدك. ' : 'شحتة معاك، بس الأدلة ناقصة (' + evidence + '/3). ') + (S.spared ? 'ورحمتك مع الحارس هتفرق. ' : '') + 'الحاج صلاح لسه هارب... الفصل الجاي قريب.';")
s = rep(s, "if (e.code === 'KeyR') startReload();", "if (e.code === 'KeyE') useInter(); if (e.code === 'KeyR') startReload();")
s = rep(s, "bindHold('#bR', startReload);", "bindHold('#bR', startReload); bindHold('#bE', useInter);")
s = rep(s, "musicTick();", "musicTick(dt);")
s = rep(s, "  mmG.restore();\n  // objective marker", "  for (const it of inter) { if (it.done) continue; mmG.fillStyle = '#4fd8ff'; mmG.beginPath(); mmG.arc(px(it.x), pz(it.z), 3.6 / sc * 0.55, 0, TAU); mmG.fill(); }\n  mmG.restore();\n  // objective marker")
# resetWorld also resets interactions
a0, b0 = find_func(s, 'resetWorld')
s = s[:b0 - 1] + "  resetInter();\n" + s[b0 - 1:]
inter_code = '''
/* ================= interactions: evidence photos, a surrendering guard with a choice ================= */
const inter = []; let nearI = null, evidence = 0; S.spared = false;
function caseMesh(x, z) {
  const g = new THREE.Group(), b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.5), phong({ color: 0xe6e6de })); b.position.y = 0.2; g.add(b);
  for (const [w, h] of [[0.16, 0.05], [0.05, 0.16]]) { const c = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xc0202a })); c.position.set(0, 0.22, -0.252); c.rotation.y = Math.PI; g.add(c); }
  const halo = sprite(GLOW, 2.4, 0.5); halo.position.y = 0.45; g.add(halo); g.position.set(x, 0, z); worldG.add(g); return g;
}
function resetInter() {
  inter.forEach(i => worldG.remove(i.mesh)); inter.length = 0; evidence = 0; S.spared = false;
  [[-9, -26], [9, -24], [-9, -35]].forEach(([x, z]) => inter.push({ x, z, r: 1.9, label: 'صوّر الدليل', kind: 'evidence', done: false, mesh: caseMesh(x, z) }));
}
function photograph(it) { it.done = true; it.mesh.visible = false; evidence++; FX.flashT = Math.max(FX.flashT, 0.55); sfxClick(0.7, 1800); sfxClick(0.5, 900); msg('صوّرت دليل ' + evidence + '/3', 1600); play(L['ev' + evidence]); }
function spawnSurrender() { const e = new Enemy('guard', 0, -11); e.zone = 'surr'; e.state = 'surrender'; e.voice = 'حارس0'; const it = { x: 0, z: -11, r: 2.2, label: 'كلّم الحارس', kind: 'guard', done: false, mesh: new THREE.Group(), e }; worldG.add(it.mesh); inter.push(it); }
function openChoice(title, a, b) {
  state = 'choice'; document.exitPointerLock && document.exitPointerLock(); inp.fire = false; inp.mx = inp.my = 0; $('#chT').textContent = title; $('#ch1').textContent = a[0]; $('#ch2').textContent = b[0]; $('#choice').classList.remove('hidden');
  const go = fn => () => { $('#choice').classList.add('hidden'); state = 'play'; fn(); }; $('#ch1').onclick = go(a[1]); $('#ch2').onclick = go(b[1]);
}
function releaseGuard(it) { it.e.dead = true; it.e.state = 'dead'; it.e.m.g.visible = false; worldG.remove(it.mesh); }
function guardTalk(it) {
  it.done = true;
  openChoice('الحارس رافع إيديه ومتوسّل. تعمل إيه؟',
    ['اسأله عن الصقر', () => { play(L.gAsk, () => { P.ammo.forEach((a, i) => { if (P.unlocked[i]) a.res += [12, 30, 6][i]; }); hudAmmo(); msg('+ ذخيرة من الحارس', 1400); releaseGuard(it); }); }],
    ['سيبه يهرب', () => { S.spared = true; play(L.gSpare, () => { P.hp = Math.min(100, P.hp + 25); hudHp(); msg('+ صحة', 1200); releaseGuard(it); }); }]);
}
function interUpdate() {
  nearI = null; let best = 1e9;
  for (const it of inter) { if (it.e && it.e.dead) it.done = true; if (it.done) continue; const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < best) { best = d; nearI = it; } }
  const pr = $('#prompt'), be = $('#bE');
  if (nearI && state === 'play') { pr.textContent = (inp.touch ? 'اضغط "تفاعل": ' : 'اضغط E: ') + nearI.label; pr.classList.remove('hidden'); if (inp.touch) be.style.display = 'flex'; } else { pr.classList.add('hidden'); be.style.display = 'none'; }
}
function useInter() { if (!nearI || state !== 'play') return; const it = nearI; if (it.kind === 'evidence') photograph(it); else if (it.kind === 'guard') guardTalk(it); }

'''
s = rep(s, "/* ================= per-frame", inter_code + "/* ================= per-frame")
s = rep(s, "itemsUpdate(dt); storyUpdate();", "itemsUpdate(dt); storyUpdate(); interUpdate();")
s = re.sub(r"\} else \{ (yawObj\.position\.set\(0, 1\.65, 32\))", r"} else if (state !== 'choice') { \1", s, count=1)
wr('core5.js', s)
print('patched all')
