
/* ================= HUD, story and flow ================= */
let state = 'title', gameT = 0; const stat = { shots: 0 };
const feedEl = $('#feed');
function addFeed(text, gold) { const d = document.createElement('div'); d.textContent = text; if (gold) d.style.color = '#ffb84a'; feedEl.appendChild(d); while (feedEl.children.length > 4) feedEl.removeChild(feedEl.firstChild); setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 600); }, 2600); }
function hudAmmo() { if (typeof P.gren === 'number') hudGear(); const a = P.ammo[P.weapon]; $('#am').textContent = a.mag; $('#ar').textContent = '/ ' + a.res; $('#wn').textContent = W[P.weapon].name; }
function hudHp() { $('#hp .bar i').style.width = Math.max(0, P.hp / (P.maxhp || 100) * 100) + '%'; }
let msgT = 0; function msg(t, ms = 2200) { const m = $('#msg'); m.textContent = t; m.classList.add('on'); clearTimeout(msgT); msgT = setTimeout(() => m.classList.remove('on'), ms); }
function setObj(t) { $('#obj').textContent = t; }
/* voice lines: durations are measured from the clips when available */
const lineDur = (who, text) => { const b = VBUF[voiceKey(who, text)]; return b ? b.duration + 0.45 : 0.9 + text.length * 0.075; };
let subT = 0;
function say(who, text) { const s = $('#sub'); s.innerHTML = '<b>' + who.replace(/\d+$/, '') + ':</b>' + text; clearTimeout(subT); const d = lineDur(who, text); subT = setTimeout(() => { s.innerHTML = ''; }, d * 1000 + 300); speak(who, text, 1); return d; }
function sequence(lines, done) { let i = 0; const next = () => { if (i >= lines.length) { if (done) done(); return; } const [who, text, gap] = lines[i++]; const d = say(who, text); setTimeout(next, (d + (gap || 0.25)) * 1000); }; next(); }

/* every spoken line is written as { who, text } so the voice tool can find it */
const L = {
  ev1: [{ who: 'ليلى', text: 'الصورة وصلتني. الأدوية دي عليها ختم مزوّر. كمّل.' }],
  ev2: [{ who: 'ليلى', text: 'مخزن كامل من العلب دي. صوّر كمان.' }],
  ev3: [{ who: 'ليلى', text: 'كده الأدلة كاملة. دلوقتي روح لشحتة.' }],
  gAsk: [{ who: 'سيد', text: 'الصقر فين؟ قول بسرعة.' }, { who: 'دوبلير', text: 'جوّه المكتب. ومعاه الموبايل اللي فيه كل حاجة.' }],
  gSpare: [{ who: 'سيد', text: 'امشي، ومتقولش إنك شفتني.' }, { who: 'دوبلير', text: 'ربنا يخليك. المكتب مقفول من جوّه، خد بالك.' }],
  endSpare: [{ who: 'ليلى', text: 'شفت رحمتك مع اللي استسلموا. ده اللي بيفرق بينك وبينهم.' }],
  endEvid: [{ who: 'ليلى', text: 'الأدلة كاملة. الحاج صلاح مش هيفلت المرة دي.' }],
  intro: [
    { who: 'سيد', text: 'الساعة تلاتة الفجر، والمطر مش راضي يقف.' },
    { who: 'سيد', text: 'امبارح وصّلت شنطة للحاج صلاح في استوديو الأحلام. قالوا لي هدوم للمسلسل.' },
    { who: 'سيد', text: 'بس شحتة كلّمني الفجر وهو بيعيّط: الشنطة فيها أدوية مضروبة، وهما شافوه.' },
    { who: 'الأسطى فتحي', text: 'سيد! إنت رايح فين؟ ده استوديو الحاج صلاح، ومليان نجوم... نجوم معاهم سلاح!' },
    { who: 'سيد', text: 'شحتة عيّل يا أسطى. مش هسيبه.' },
    { who: 'الأسطى فتحي', text: 'طب خد بالك. في سلاح جنب الصناديق اللي عند الباب، وأنا معاك على الخط.' }
  ],
  rifle: [{ who: 'سيد', text: 'كلاشن. يعني الليلة دي مش هتعدّي بالساهل.' }],
  laylaHello: [
    { who: 'ليلى', text: 'سيد؟ أنا ليلى، صحفية. بتابع الاستوديو ده من شهور.' },
    { who: 'ليلى', text: 'الحراس اللي جوّه مش حراس. دول نجوم كبار شغّالين عند الحاج صلاح.' },
    { who: 'سيد', text: 'نجوم؟ يعني هضرب نار على ناس الناس بتحبها؟' },
    { who: 'ليلى', text: 'الناس بتحبهم لأنها مبتعرفش الحقيقة. خلّينا نوريها.' }
  ],
  gate: [
    { who: 'الحاج صلاح', text: 'أهلاً يا سيد. كنت فاكرك سواق توكتوك وبس. يا نجوم، الضيف وصل... استقبلوه!' },
    { who: 'الحاج صلاح', text: 'وبالمناسبة، الأسطى فتحي هو اللي قالّي إنك جاي. تسلم إيده.' }
  ],
  yardDone: [{ who: 'ليلى', text: 'الباب اتفتح! ادخل المخزن. بس الأسطى فتحي بيرن عليك... رد عليه.' }],
  fathyCall: [{ who: 'الأسطى فتحي', text: 'سيد... أنا كنت مضغوط. الحاج صلاح كان هيسحب الورشة بسبب الديون.' }],
  fathyTrust: [{ who: 'سيد', text: 'اللي فات مات. ركّز معايا وساعدني.' }, { who: 'الأسطى فتحي', text: 'وعد. دخّلت على كاميرات الاستوديو، وهبعتلك أماكن الأدلة على الخريطة.' }],
  fathyCut: [{ who: 'سيد', text: 'مش عايز أسمعك تاني يا أسطى. الخط اتقفل.' }, { who: 'ليلى', text: 'أنا معاك يا سيد. الأدلة مخبّية جوّه، هتحتاج تدوّر عليها بنفسك.' }],
  enter: [
    { who: 'الحاج صلاح', text: 'بلاش تدخل جوّه. جوّه النجم سيف الصقر... اللي ستين مليون بيتفرجوا عليه كل رمضان.' },
    { who: 'ليلى', text: 'لو مات الصقر من غير دليل، البلد كلها هتتقلب عليك. صوّر الأدلة يا سيد.' }
  ],
  whDone: [{ who: 'سيد', text: 'شحتة! اتفضل... المكتب هناك.' }, { who: 'الصقر', text: 'جاي تلعب البطل؟ أنا النجم سيف الصقر، وإنت مجرد كومبارس في فيلمي.' }],
  phase2: [
    { who: 'الصقر', text: 'كفاية لعب! يا نجوم، الكاميرا شغّالة... مثّلوا الدور كويس!' },
    { who: 'الحاج صلاح', text: 'سيد، الدين اللي عليك للمعلم حمودة؟ أنا اللي رتّبته من الأول. كنت محتاج سواق مديون يسكت.' },
    { who: 'سيد', text: 'يعني كل ده كان تمثيلية عليّا؟' }
  ],
  end: [{ who: 'سيد', text: 'خلاص يا شحتة، خلاص. خرّجنا من هنا.' }, { who: 'شحتة', text: 'أنا كنت هموت. الأدوية دي كتير أوي يا سيد.' }],
  layla: [
    { who: 'ليلى', text: 'سيد! أنا ليلى. صوّرت كل حاجة من الصبح.' },
    { who: 'ليلى', text: 'الكاميرات لسه شغّالة. الكل هيصدّق مين؟ النجوم ولا إحنا؟' }
  ],
  liveYes: [{ who: 'ليلى', text: 'بث مباشر... دلوقتي الكل بيشوف!' }, { who: 'سيد', text: 'خلّي البلد كلها تعرف مين كان ورا الشنطة.' }],
  liveNo: [{ who: 'ليلى', text: 'حاضر. الأدلة رايحة للنيابة بس.' }, { who: 'سيد', text: 'أهم حاجة إن شحتة يبقى في أمان.' }]
};
const play = (arr, done) => sequence(arr.map(l => [l.who, l.text]), done);
const EXTRA_P = { id: 's1', arch: 'دوبلير', name: 'الدوبلير مصطفى الجريء', title: 'من الصف التاني', t: [0.3, 0.3, 0.3, 0.2], alert: { who: 'دوبلير', text: 'أنا استسلمت، بلاش تضرب!' }, pain: { who: 'دوبلير', text: 'أنا بس دوبلير!' } };

/* enemy placement */
function spawnEnemies() {
  enemies.forEach(e => worldG.remove(e.m.g)); enemies.length = 0; fallen.length = 0;
  const E = (type, x, z, zone, patrol, pid) => { const e = new Enemy(type, x, z, patrol, { persona: PBY[pid] }); e.zone = zone; return e; };
  E('guard', -12, 15, 'yard', [[-12, 15], [-12, 27]], 'y1'); E('guard', 12, 14, 'yard', [[12, 14], [20, 27]], 'y3'); E('guard', 0, 3, 'yard', [[0, 3], [-8, -3], [8, -3]], 'y4');
  E('guard', -26, 4, 'yard', [[-26, 4], [-26, -12]], 'y5'); E('guard', 27, -2, 'yard', [[27, -2], [27, -14]], 'y6'); E('guard', -6, -11, 'yard', [[-6, -11], [6, -11]], 'y7');
  E('guard', 19, 8, 'yard', [[19, 8], [24, 0]], 'y8'); E('guard', -20, -6, 'yard', [[-20, -6], [-14, -12]], 'y9'); E('heavy', 2, 9, 'yard', [[2, 9], [-2, 9]], 'y2');
  E('guard', -16, -20, 'wh', [[-16, -20], [-16, -30]], 'w1'); E('guard', 16, -20, 'wh', [[16, -20], [16, -30]], 'w2'); E('guard', 0, -24, 'wh', [[-6, -24], [6, -24]], 'w3');
  E('guard', -16, -33, 'wh', [[-16, -33], [-6, -33]], 'w4'); E('guard', 16, -33, 'wh', [[16, -33], [6, -33]], 'w5'); E('guard', -4, -33, 'wh', [[-4, -33], [4, -33]], 'w6');
  E('heavy', 10, -22, 'wh', [[10, -22], [10, -28]], 'w7'); E('heavy', -10, -30, 'wh', [[-10, -30], [-10, -24]], 'w8');
}
const S = { stage: 0 };
function resetWorld() {
  for (const b of barrels) { b.alive = true; b.mesh.visible = true; b.solid.solid = true; }
  for (const l of lamps) { l.alive = true; l.glow.visible = true; l.pool.visible = true; l.head.material = MAT.hi; if (l.light) l.light.intensity = 1.25; }
  items.forEach(i => worldG.remove(i.mesh)); items.length = 0;
  addItem('rifle', 5, 24); addItem('health', -6, 29); addItem('health', 0, -18); addItem('shotgun', -3, -17.5); addItem('health', -16, -36); addItem('ammo', 20, 12); addItem('ammo', -20, 16); addItem('ammo', 12, -30); addItem('health', 26, -30);
  rollDoor.solid = true; rollDoor.mesh.visible = true; rollDoor.mesh.position.y = 1.8; officeDoor.solid = true; officeDoor.mesh.visible = true; officeDoor.mesh.position.y = 1.5;
  gate.solid = false; gate.mesh.visible = false; decals.forEach(d => d.visible = false); shehata.visible = true;
  Object.assign(P, { x: 0, z: 32, vx: 0, vz: 0, yaw: 0, pitch: 0, hp: P.maxhp || 100, gren: 2, bottles: 3, dead: false, weapon: 0, unlocked: [true, false, false], reloadT: 0, fireT: 0, kick: 0, swap: 0, frozen: false });
  P.ammo = [{ mag: 12, res: 48 }, { mag: 0, res: 0 }, { mag: 0, res: 0 }]; showWeapon(); hudAmmo(); hudHp();
  kills = 0; stat.shots = 0; gameT = 0; S.stage = 0; S.bossDead = false; S.fathy = null; S.live = false; S.mercy = 0; FX.slowT = 0; FX.dmgT = 0; spawnEnemies();
  resetInter();
}
function playerDie() { P.dead = true; state = 'over'; document.exitPointerLock && document.exitPointerLock(); $('#endT').textContent = 'اتقتلت'; $('#endT').style.color = '#ff5a5a'; $('#endP').textContent = 'الحرس لحقوك. حاول تاني بحذر أكتر.'; $('#stats').innerHTML = 'عدد اللي خلّصتهم: ' + kills; $('#again').textContent = CP ? 'كمّل من آخر نقطة حفظ' : 'حاول تاني'; $('#end').classList.remove('hidden'); $('#hud').classList.add('hidden'); }
function winGame() {
  state = 'over'; document.exitPointerLock && document.exitPointerLock(); const full = evidence >= 3;
  $('#endT').textContent = S.live ? (full ? 'ليلة النجوم: الحقيقة اتذاعت' : 'البث انتشر... بس الشك فضل') : 'الأدلة وصلت للنيابة'; $('#endT').style.color = '#5fe0a0';
  const a = S.live ? (full ? 'ستين مليون متفرج شافوا النجوم وهما بيتقبض عليهم، والحاج صلاح اتحاصر. شحتة في أمان، وسيد بقى بطل حقيقي.' : 'البث انتشر، بس الأدلة الناقصة خلّت ناس كتير تشكّك. الحاج صلاح لسه بيحاول يهرب.') : 'الأدلة وصلت للنيابة بهدوء. الحاج صلاح هرب في الزحمة... والفصل الجاي هيطارده.';
  const f = S.fathy === 'trust' ? ' وفتحي رجع لورشته وبقى في ضهرك.' : (S.fathy === 'cut' ? ' وفتحي اختفى من حياتك.' : '');
  $('#endP').textContent = a + f + (S.spared || S.mercy ? ' ورحمتك مع اللي استسلموا اتحكت في البلد.' : '');
  const names = fallen.map(x => x.name); $('#stats').innerHTML = 'النجوم اللي وقعوا: ' + kills + (names.length ? ' (' + names.slice(0, 6).join('، ') + (names.length > 6 ? '...' : '') + ')' : '') + '<br>الأدلة: ' + evidence + '/3<br>التصنيف: <b style="color:#ffb84a;font-size:22px">' + rankOf().r + '</b> (' + rankOf().score + ' نقطة)<br>خنق صامت: ' + RUN.stealthKills + ' | إنذارات: ' + RUN.alarms + ' | ضربات راس: ' + RUN.headshots + '<br>الوقت: ' + Math.floor(gameT / 60) + ':' + String(Math.floor(gameT % 60)).padStart(2, '0') + '<br>صحتك: ' + Math.round(P.hp) + '%';
  $('#again').textContent = 'العب تاني'; $('#end').classList.remove('hidden'); $('#hud').classList.add('hidden');
}
function sfxSiren(dur = 6) { if (!AU.ac) return; const ac = AU.ac, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; o.connect(f); f.connect(g); g.connect(AU.master); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 1); g.gain.linearRampToValueAtTime(0, t + dur);
  for (let i = 0; i < dur * 2; i++) o.frequency.setValueAtTime(i % 2 ? 620 : 860, t + i * 0.5); o.start(t); o.stop(t + dur); }
killHook = (e) => { if (e.type === 'boss') { S.bossDead = true; setTimeout(() => { S.stage = 6; startLayla(); play(L.end.concat(S.spared || S.mercy ? L.endSpare : [], evidence >= 3 ? L.endEvid : []), () => { play(L.layla, () => { openChoice('الكاميرات شغّالة... تعمل إيه؟', ['اذيع لايف على الهواء', () => { S.live = true; play(L.liveYes, () => { sfxSiren(6); setTimeout(winGame, 2600); }); }], ['سلّم الأدلة للنيابة بس', () => { S.live = false; play(L.liveNo, () => { sfxSiren(6); setTimeout(winGame, 2600); }); }]); }); }); }, 2200); } };
storyHook.bossPhase = (boss) => { play(L.phase2); const E2 = (x, z, pid) => { const e = new Enemy('guard', x, z, null, { persona: PBY[pid] }); e.zone = 'boss'; e.state = 'combat'; e.role = 'push'; e.lastKnown = [P.x, P.z]; }; E2(-6, -24, 'b3'); E2(6, -24, 'b4'); msg('الصقر بيطلب دعم!'); };
function spawnBossGroup() { const mk = (t, x, z, pid) => { const e = new Enemy(t, x, z, null, { persona: PBY[pid] }); e.zone = 'boss'; e.state = 'alert'; e.alertT = 3.5 + Math.random(); e.lastKnown = [P.x, P.z]; return e; }; mk('boss', 0, -37, 'boss'); mk('guard', -3, -35, 'b1'); mk('guard', 3, -35, 'b2'); }
function storyUpdate() {
  const aliveZone = z => aliveCount(e => e.zone === z);
  if (S.stage === 0) { if (P.unlocked[1]) { S.stage = 1; play(L.rifle, () => play(L.laylaHello)); } }
  if (S.stage <= 1 && P.z < 26) { S.stage = 2; gate.solid = true; gate.mesh.visible = true; gate.mesh.position.y = 1.5; sfxMetal('gate'); msg('البوابة اتقفلت!'); play(L.gate); enemies.forEach(e => { if (e.zone === 'yard' && !e.dead && e.state !== 'combat') { e.state = 'suspicious'; e.aware = 0.7; e.inv = [P.x, P.z]; e.invT = 10; } }); }
  if (S.stage === 2) { setObj('وقّع نجوم الحوش: ' + aliveZone('yard') + '  (اخنق بصمت أو اقتحم)'); if (aliveZone('yard') === 0) { S.stage = 3; rollDoor.solid = false; rollDoor.mesh.visible = false; sfxMetal('door'); msg('الباب اتفتح'); setObj('ادخل المخزن'); spawnSurrender(); chapter('الفصل الثاني', 'المخزن... النجوم مستنّيينك');
      offerPerks(() => { saveCheckpoint(); play(L.yardDone, () => play(L.fathyCall, () => openChoice('الأسطى فتحي بيكلّمك... تعمل إيه؟', ['سامحه وخليه يساعدك', () => { S.fathy = 'trust'; play(L.fathyTrust); }], ['اقفل الخط', () => { S.fathy = 'cut'; play(L.fathyCut); }]))); }); } }
  if (S.stage === 3 && P.z < -15) { S.stage = 4; play(L.enter); enemies.forEach(e => { if (e.zone === 'wh' && !e.dead && e.state === 'patrol' && Math.random() < 0.5) { e.state = 'suspicious'; e.aware = 0.6; e.inv = [P.x, P.z]; e.invT = 6; } }); }
  if (S.stage === 4) { setObj('وقّع نجوم المخزن: ' + aliveZone('wh') + ' | أدلة: ' + evidence + '/3'); if (aliveZone('wh') === 0) { S.stage = 5; officeDoor.solid = false; officeDoor.mesh.visible = false; sfxMetal('door'); chapter('الفصل الثالث', 'النجم سيف الصقر');
      offerPerks(() => { saveCheckpoint(); spawnBossGroup(); play(L.whDone); setObj('اقتل النجم سيف الصقر وخد شحتة'); }); } }
  if (S.stage === 5) { const boss = enemies.find(e => e.type === 'boss'); if (boss && !boss.dead) setObj('النجم سيف الصقر: ' + Math.max(0, Math.round(boss.hp / boss.maxhp * 100)) + '%'); }
}
function itemsUpdate(dt) {
  for (const it of items) { if (it.taken) continue; it.mesh.rotation.y += dt * 1.5; it.mesh.position.y = 0.75 + Math.sin(performance.now() * 0.003 + it.x) * 0.08; if (Math.hypot(it.x - P.x, it.z - P.z) > 1.3) continue;
    if (it.type === 'health') { if (P.hp >= P.maxhp) continue; P.hp = Math.min(P.maxhp, P.hp + 40); hudHp(); msg('+ صحة', 900); }
    else if (it.type === 'ammo') { for (let i = 0; i < 3; i++) if (P.unlocked[i]) P.ammo[i].res += [24, 45, 8][i]; msg('+ ذخيرة', 900); }
    else if (it.type === 'rifle') { P.unlocked[1] = true; P.ammo[1].mag = 30; P.ammo[1].res = 90; switchWeapon(1); msg('كلاشن!', 1200); }
    else if (it.type === 'shotgun') { P.unlocked[2] = true; P.ammo[2].mag = 6; P.ammo[2].res = 18; switchWeapon(2); msg('شوتجن!', 1200); }
    it.taken = true; it.mesh.visible = false; hudAmmo(); sfxTick(700, 0.12, 0.15); sfxTick(1000, 0.1, 0.18); }
}


/* ================= Layla, the journalist (Tomb Raider-style adventurer) ================= */
let layla = null;
function startLayla() { if (layla) worldG.remove(layla.m.g); layla = { m: buildHuman(LAYLA), x: 0, z: -31.5, t: 0 }; layla.m.gun.visible = false; layla.m.g.position.set(0, 0, -31.5); worldG.add(layla.m.g); }
function laylaUpdate(dt) {
  if (!layla) return; const m = layla.m, tx = P.x + 1.4, tz = P.z + 0.6, dx = tx - layla.x, dz = tz - layla.z, d = Math.hypot(dx, dz); layla.t += dt; let moving = false;
  if (d > 1.2) { const sp = 2.2; layla.x += dx / d * sp * dt; layla.z += dz / d * sp * dt; moving = true; }
  const yaw = Math.atan2(-(P.x - layla.x), -(P.z - layla.z)); m.g.rotation.y = yaw; m.g.position.set(layla.x, 0, layla.z);
  const cyc = layla.t * 8, sw = moving ? Math.sin(cyc) * 0.6 : 0; m.legL.rotation.x = sw; m.legR.rotation.x = -sw; m.legL.shin.rotation.x = -Math.max(0, -sw) * 1.1 - 0.05; m.legR.shin.rotation.x = -Math.max(0, sw) * 1.1 - 0.05;
  m.armL.rotation.x = -sw * 0.6; m.armR.rotation.x = sw * 0.6; m.armL.fore.rotation.x = 0.3; m.armR.fore.rotation.x = 0.3; m.body.position.y = Math.sin(layla.t * 1.7) * 0.012;
}

/* ================= mini-map ================= */
const MM = { x0: -36, z0: -42, w: 72, h: 78, ppm: 3 }, mmC = $('#mm'), mmG = mmC.getContext('2d'), mmBase = document.createElement('canvas');
mmBase.width = MM.w * MM.ppm; mmBase.height = MM.h * MM.ppm;
function mmBuild() {
  const g = mmBase.getContext('2d'); g.fillStyle = '#10141b'; g.fillRect(0, 0, mmBase.width, mmBase.height);
  const X = x => (x - MM.x0) * MM.ppm, Z = z => (z - MM.z0) * MM.ppm; g.fillStyle = '#1b2029'; g.fillRect(X(-22), Z(-40), 44 * MM.ppm, 26 * MM.ppm);
  for (const s of solids) { if (s.y0 > 1.4 || s.y1 - s.y0 < 0.5 || !s.mesh.visible && s.mesh.material === MAT.dark) continue; const w = s.maxx - s.minx, d = s.maxz - s.minz, big = Math.max(w, d) > 12; g.fillStyle = big ? '#8b93a3' : (s.metal ? '#5b6577' : '#6b5a44'); g.fillRect(X(s.minx), Z(s.minz), Math.max(2, w * MM.ppm), Math.max(2, d * MM.ppm)); }
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let x = -36; x <= 36; x += 12) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), mmBase.height); g.stroke(); }
}
function mmDraw() {
  const R = 55, sc = 1.7 / MM.ppm; mmG.clearRect(0, 0, 110, 110); mmG.save(); mmG.beginPath(); mmG.arc(R, R, R - 1, 0, TAU); mmG.clip(); mmG.fillStyle = '#0b0e13'; mmG.fillRect(0, 0, 110, 110);
  const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw), rot = -Math.PI / 2 - Math.atan2(fz, fx);
  mmG.translate(R, R); mmG.rotate(rot); mmG.scale(sc, sc); mmG.translate(-(P.x - MM.x0) * MM.ppm, -(P.z - MM.z0) * MM.ppm); mmG.drawImage(mmBase, 0, 0);
  const px = x => (x - MM.x0) * MM.ppm, pz = z => (z - MM.z0) * MM.ppm;
  for (const e of enemies) { if (e.dead) continue; const near = Math.hypot(e.x - P.x, e.z - P.z) < 16; if (e.state === 'patrol' && !near) continue; mmG.fillStyle = e.state === 'combat' ? '#ff4b3a' : '#ffb03a'; mmG.beginPath(); mmG.arc(px(e.x), pz(e.z), 4.2 / sc * 0.55, 0, TAU); mmG.fill(); }
  for (const it of items) { if (it.taken) continue; if (Math.hypot(it.x - P.x, it.z - P.z) > 26) continue; mmG.fillStyle = it.type === 'health' ? '#3fe58a' : '#f0c040'; mmG.fillRect(px(it.x) - 3, pz(it.z) - 3, 6, 6); }
  for (const it of inter) { if (it.done || (it.kind === 'evidence' && S.fathy !== 'trust')) continue; mmG.fillStyle = '#4fd8ff'; mmG.beginPath(); mmG.arc(px(it.x), pz(it.z), 3.6 / sc * 0.55, 0, TAU); mmG.fill(); }
  mmG.restore();
  // objective marker, pinned to the edge when it is off the map
  if (S.obj) { const dx = S.obj[0] - P.x, dz = S.obj[1] - P.z, d = Math.hypot(dx, dz); let ax = dx * MM.ppm * sc, az = dz * MM.ppm * sc; const ca = Math.cos(rot), sa = Math.sin(rot), rx = ax * ca - az * sa, rz = ax * sa + az * ca; let ox = rx, oy = rz; const m = Math.hypot(ox, oy), lim = R - 8; if (m > lim) { ox = ox / m * lim; oy = oy / m * lim; }
    const pulse = 1 + Math.sin(performance.now() * 0.006) * 0.15; mmG.save(); mmG.translate(R + ox, R + oy); mmG.rotate(Math.PI / 4); mmG.fillStyle = '#ffcf3a'; mmG.strokeStyle = '#000'; mmG.lineWidth = 1.5; mmG.fillRect(-5 * pulse, -5 * pulse, 10 * pulse, 10 * pulse); mmG.strokeRect(-5 * pulse, -5 * pulse, 10 * pulse, 10 * pulse); mmG.restore(); }
  mmG.save(); mmG.translate(R, R); mmG.fillStyle = '#ffffff'; mmG.strokeStyle = '#000'; mmG.lineWidth = 1.5; mmG.beginPath(); mmG.moveTo(0, -8); mmG.lineTo(5.5, 6); mmG.lineTo(0, 3); mmG.lineTo(-5.5, 6); mmG.closePath(); mmG.fill(); mmG.stroke(); mmG.restore();
  mmG.strokeStyle = 'rgba(255,255,255,.35)'; mmG.lineWidth = 2; mmG.beginPath(); mmG.arc(R, R, R - 1, 0, TAU); mmG.stroke();
}
function nearestAlive(zone) { let best = null, bd = 1e9; for (const e of enemies) { if (e.dead || (zone && e.zone !== zone)) continue; const d = Math.hypot(e.x - P.x, e.z - P.z); if (d < bd) { bd = d; best = e; } } return best; }
function objectiveUpdate() {
  const st = S.stage; let o = null;
  if (st === 0) { const r = items.find(i => i.type === 'rifle' && !i.taken); o = r ? [r.x, r.z] : [0, 8]; }
  else if (st === 1 || st === 2) { const e = nearestAlive('yard'); o = e ? [e.x, e.z] : [0, -10]; }
  else if (st === 3) o = [0, -14]; else if (st === 4) { const e = nearestAlive('wh'); o = e ? [e.x, e.z] : [0, -26]; }
  else if (st === 5) { const b = enemies.find(e => e.type === 'boss' && !e.dead); o = b ? [b.x, b.z] : [0, -36]; }
  S.obj = o;
}
mmBuild();

/* ================= input ================= */
const cap = (el, id) => { try { el.setPointerCapture(id); } catch (e) {} };
const keys = {}; const inp = { lookX: 0, lookY: 0, mx: 0, my: 0, fire: false, touch: false };
addEventListener('keydown', e => { keys[e.code] = true; if (state !== 'play') return; if (e.code === 'KeyE') useInter(); if (e.code === 'KeyG') throwItem('gren'); if (e.code === 'KeyB') throwItem('bottle'); if (e.code === 'KeyR') startReload(); if (e.code === 'Digit1') switchWeapon(0); if (e.code === 'Digit2') switchWeapon(1); if (e.code === 'Digit3') switchWeapon(2); if (e.code === 'KeyQ') cycleWeapon(); });
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
bindHold('#bF', () => { inp.fire = true; }, () => { inp.fire = false; }); bindHold('#bR', startReload); bindHold('#bE', useInter); bindHold('#bGr', () => throwItem('gren')); bindHold('#bBt', () => throwItem('bottle')); bindHold('#bW', cycleWeapon); bindHold('#bS', () => { P.sprint = !P.sprint; });


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
function spawnSurrender() { const e = new Enemy('guard', 0, -11, null, { persona: EXTRA_P }); e.zone = 'surr'; e.state = 'surrender'; const it = { x: 0, z: -11, r: 2.2, label: 'كلّم ' + e.name, kind: 'guard', done: false, mesh: new THREE.Group(), e }; worldG.add(it.mesh); inter.push(it); }
function surrTalk(it) {
  it.done = true; const e = it.e;
  openChoice(e.name + ' رفع إيديه ومتوسّل. تعمل إيه؟',
    ['خد سلاحه (ذخيرة)', () => { P.ammo.forEach((a, i) => { if (P.unlocked[i]) a.res += [10, 24, 5][i]; }); hudAmmo(); msg('+ ذخيرة', 1200); releaseGuard(it); }],
    ['سيبه يهرب', () => { S.mercy = (S.mercy || 0) + 1; P.hp = Math.min(P.maxhp, P.hp + 15); hudHp(); msg('رحمتك... ' + e.name + ' جري', 1600); releaseGuard(it); }]);
}
function openChoice(title, a, b) {
  state = 'choice'; document.exitPointerLock && document.exitPointerLock(); inp.fire = false; inp.mx = inp.my = 0; $('#chT').textContent = title; $('#ch1').textContent = a[0]; $('#ch2').textContent = b[0]; $('#choice').classList.remove('hidden');
  const go = fn => () => { $('#choice').classList.add('hidden'); state = 'play'; fn(); }; $('#ch1').onclick = go(a[1]); $('#ch2').onclick = go(b[1]);
}
function releaseGuard(it) { it.e.dead = true; it.e.state = 'dead'; it.e.m.g.visible = false; worldG.remove(it.mesh); }
function guardTalk(it) {
  it.done = true;
  openChoice('الحارس رافع إيديه ومتوسّل. تعمل إيه؟',
    ['اسأله عن الصقر', () => { play(L.gAsk, () => { P.ammo.forEach((a, i) => { if (P.unlocked[i]) a.res += [12, 30, 6][i]; }); hudAmmo(); msg('+ ذخيرة من الحارس', 1400); releaseGuard(it); }); }],
    ['سيبه يهرب', () => { S.spared = true; play(L.gSpare, () => { P.hp = Math.min(P.maxhp, P.hp + 25); hudHp(); msg('+ صحة', 1200); releaseGuard(it); }); }]);
}
function interUpdate() {
  nearI = null; let best = 1e9;
  for (const it of inter) { if (it.e && it.e.dead) it.done = true; if (it.done) continue; const d = Math.hypot(it.x - P.x, it.z - P.z); if (d < it.r && d < best) { best = d; nearI = it; } }
  const tk = takedownTarget(); if (tk) nearI = { kind: 'takedown', e: tk, label: 'اخنقه بصمت: ' + tk.name };
  const pr = $('#prompt'), be = $('#bE');
  if (nearI && state === 'play') { pr.textContent = (inp.touch ? 'اضغط "تفاعل": ' : 'اضغط E: ') + nearI.label; pr.classList.remove('hidden'); if (inp.touch) be.style.display = 'flex'; } else { pr.classList.add('hidden'); be.style.display = 'none'; }
}
function useInter() { if (!nearI || state !== 'play') return; const it = nearI; if (it.kind === 'evidence') photograph(it); else if (it.kind === 'guard') guardTalk(it); else if (it.kind === 'surr') surrTalk(it); else if (it.kind === 'takedown') silentTakedown(it.e); }

/* ================= per-frame ================= */
function playerUpdate(dt) {
  if (P.dead) return;
  if (!P.frozen) { P.yaw -= inp.lookX; P.pitch = clamp(P.pitch - inp.lookY, -1.35, 1.35); } inp.lookX = inp.lookY = 0;
  let ax = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + inp.mx, az = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + inp.my;
  const mag = Math.hypot(ax, az); if (mag > 1) { ax /= mag; az /= mag; } if (P.frozen) { ax = az = 0; }
  const sprint = (keys.ShiftLeft || keys.ShiftRight || P.sprint) && mag > 0.3 && az < -0.2; const sp = sprint ? 6.4 : 4.1;
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw), tx = (ax * cy + az * sy) * sp, tz = (-ax * sy + az * cy) * sp;
  const k = 1 - Math.exp(-13 * dt); P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k; P.x += P.vx * dt; P.z += P.vz * dt; collideCircle(P, 0.42);
  const speed = Math.hypot(P.vx, P.vz); P.bob += dt * speed * 1.9; P.stepT -= dt * speed; if (P.stepT <= 0 && speed > 1) { sfxStep(sprint); emitNoise(P.x, P.z, (sprint ? 9 : 3.5) * RUN.quiet, 'step'); P.stepT = 2.1; }
  P.fireT = Math.max(0, P.fireT - dt); P.swap = Math.max(0, P.swap - dt); P.kick = Math.max(0, P.kick - dt * 7);
  if (P.reloadT > 0) { P.reloadT -= dt; if (P.reloadT <= 0) { P.reloadT = 0; finishReload(); hudAmmo(); } }
  if (inp.fire && (W[P.weapon].auto || inp.touch || !P.wasFire)) { fire(); hudAmmo(); stat.shots++; } P.wasFire = inp.fire;
  if (performance.now() / 1000 - P.lastHurt > 6 && P.hp < Math.min(P.maxhp, RUN.regenCap)) { P.hp = Math.min(P.maxhp, RUN.regenCap, P.hp + dt * RUN.regenRate * DF().regen); }
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
const _tv = new V3(), _tf = new V3(), _tag = $('#tag');
function tagUpdate() {
  camera.getWorldPosition(_tv); camera.getWorldDirection(_tf); let best = null, ba = 0.075;
  for (const e of enemies) { if (e.dead) continue; const dx = e.x - _tv.x, dz = e.z - _tv.z, dy = 1.5 - _tv.y, d = Math.hypot(dx, dy, dz); if (d > 34) continue; const ang = Math.acos(clamp((dx * _tf.x + dy * _tf.y + dz * _tf.z) / d, -1, 1)); if (ang < ba && rayBoxes(_tv.x, _tv.y, _tv.z, dx / d, dy / d, dz / d, d) === Infinity) { ba = ang; best = e; } }
  if (!best || state !== 'play') { _tag.classList.add('hidden'); return; }
  const p = new V3(best.x, 2.0 * best.c.scale, best.z).project(camera); if (p.z > 1) { _tag.classList.add('hidden'); return; }
  _tag.classList.remove('hidden'); _tag.style.left = ((p.x * 0.5 + 0.5) * innerWidth) + 'px'; _tag.style.top = ((-p.y * 0.5 + 0.5) * innerHeight - 8) + 'px';
  _tag.children[0].textContent = best.name; _tag.children[1].textContent = best.title; _tag.children[2].textContent = best.mood();
}
function screenFx(dt) {
  FX.shake = Math.max(0, FX.shake - dt * 3.2); FX.dmgT = Math.max(0, FX.dmgT - dt * 0.9); FX.flashT = Math.max(0, FX.flashT - dt * 2);
  const low = P.hp < 35 && !P.dead ? (35 - P.hp) / 35 * 0.55 : 0; $('#dmg').style.opacity = Math.min(1, Math.max(FX.dmgT, low)); $('#flash').style.opacity = FX.flashT;
  if (low > 0) { AU.heart = (AU.heart || 0) - dt; if (AU.heart <= 0) { sfxHeart(); AU.heart = 1.0; } }
  FX.hitT = Math.max(0, FX.hitT - dt); $('#hit').style.opacity = FX.hitT > 0 ? FX.hitT / 0.16 : 0;
  camera.position.x = (Math.random() - 0.5) * FX.shake * 0.05; camera.position.y = (Math.random() - 0.5) * FX.shake * 0.05;
  if (AU.ac) { const indoor = P.z < -14 && Math.abs(P.x) < 22 ? 1 : 0; AU.wetNow += ((indoor ? 0.8 : 0.3) - AU.wetNow) * Math.min(1, dt * 3); AU.dogT -= dt; if (AU.dogT <= 0) { sfxDog(); AU.dogT = rand(16, 38); } if (P.hp < 40 && !P.dead) { AU.breathT = (AU.breathT || 0) - dt; if (AU.breathT <= 0) { sfxBreath(); AU.breathT = 1.7; } } }
  AU.combat = lerp(AU.combat, aliveCount(e => e.state === 'combat') > 0 ? 1 : 0, Math.min(1, dt * 1.5));
}
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame); const raw = Math.min(0.05, (now - last) / 1000); last = now; if (!renderer) return;
  if (FX.slowT > 0) FX.slowT -= raw; const dt = raw * (FX.slowT > 0 ? 0.3 : 1);
  if (state === 'play') { gameT += dt; playerUpdate(dt); for (const e of enemies) e.update(dt); itemsUpdate(dt); storyUpdate(); interUpdate(); structUpdate(dt); objectiveUpdate(); laylaUpdate(dt); barkCool = Math.max(0, barkCool - dt); musicTick(dt); }
  else { yawObj.position.set(0, 1.65, 32); yawObj.rotation.y = Math.sin(now * 0.0002) * 0.25; pitchObj.rotation.x = -0.02; }
  fxUpdate(dt); screenFx(dt); if (state === 'play') mmDraw(); renderFrame(performance.now()); tagUpdate();
}
function begin() {
  initAudio(); resetRun(); resetWorld(); saveCheckpoint(); chapter('الفصل الأول', 'ليل الحوش... تسلّل أو اقتحم، إنت اللي تختار'); $('#title').classList.add('hidden'); $('#end').classList.add('hidden'); $('#hud').classList.remove('hidden'); state = 'play'; hudAmmo(); hudHp();
  if (!inp.touch && canvas.requestPointerLock) { try { canvas.requestPointerLock(); } catch (e) {} }
  P.frozen = false; document.body.classList.remove('cine'); setObj('خد السلاح من جنب الصناديق قدامك'); msg(inp.touch ? 'العصا الشمال للحركة، واسحب يمين للفت' : 'WASD للحركة والماوس للفت', 4000);
  play(L.intro);
}
if (!renderer) { $('#start').classList.add('hidden'); $('#nogl').classList.remove('hidden'); $('#nogl').textContent = 'الـ 3D مش شغال على جهازك أو المتصفح ده.'; }
$('#start').addEventListener('click', begin); $('#again').addEventListener('click', () => { if (P.dead && CP) restoreCheckpoint(); else begin(); });
document.querySelectorAll('#diff button').forEach(b => b.addEventListener('click', () => { DIFFI = +b.dataset.d; document.querySelectorAll('#diff button').forEach(x => x.classList.toggle('sel', x === b)); }));
document.addEventListener('visibilitychange', () => { inp.fire = false; for (const k in keys) keys[k] = false; });
resetWorld(); requestAnimationFrame(frame);
window.__g = { interUpdate: () => interUpdate(), nearI: () => nearI, RUN, DF, throwItem, takedownTarget, saveCheckpoint, restoreCheckpoint, rankOf, applyPerk, PERKS, CP: () => CP, moraleShock, emitNoise, PERSONAS, fallen, banterNow: () => { banterCool = 0; }, BUF, VBUF, AU, useInter, inter, ev: () => evidence, layla: () => layla, startLayla, inp, hurt: hurtPlayer, P, W, enemies, S, kills: () => kills, get state() { return state; }, explode, spawnEnemies, begin, fire, storyUpdate, camera, sparks, FX, items, barrels, gate, rollDoor };
