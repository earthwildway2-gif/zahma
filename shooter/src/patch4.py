import re, pathlib, sys
sys.path.insert(0, '/tmp/sh')
from patchlib import replace_func, find_func
d = pathlib.Path('/tmp/sh')
rd = lambda n: (d / n).read_text(encoding='utf-8')
wr = lambda n, s: (d / n).write_text(s, encoding='utf-8')
def rep(s, old, new, count=1):
    assert old in s, "missing: " + old[:100]
    return s.replace(old, new, count)

# ---- build order: mind.js right after core4.js ----
b = rd('build.py')
b = rep(b, "'core4.js','chars.js'", "'core4.js','mind.js','chars.js'")
wr('build.py', b)

# ---- shell: title text + name tag ----
h = rd('shell.html')
h = rep(h, "الفصل الثاني — الشنطة", "الفصل الثاني — استوديو النجوم")
h = re.sub(r"<p>اللي وصّلته امبارح.*?</p>", "<p>الشنطة اللي وصّلتها امبارح لاستوديو الحاج صلاح كانت مليانة أدوية مضروبة، وشحتة اتمسك عشان شاف. والحراس؟ نجوم حقيقيين بيحبّهم الجمهور... ومعاهم سلاح. سيد ماشي لوحده الساعة تلاتة الفجر.</p>", h, count=1, flags=re.S)
h = rep(h, '<div id="prompt" class="hidden"></div>', '<div id="prompt" class="hidden"></div>\n<div id="tag" class="hidden"><b></b><small></small><i></i></div>')
h = rep(h, '</style>', '#tag{position:absolute;transform:translate(-50%,-100%);background:rgba(10,13,22,.82);border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:3px 9px;text-align:center;pointer-events:none;z-index:5;white-space:nowrap}\n#tag b{display:block;font-size:14px;color:#fff}#tag small{display:block;font-size:11px;color:var(--accent)}#tag i{display:block;font-size:11px;font-style:normal;color:var(--dim)}\n</style>')
wr('shell.html', h)

# ---- core3a: explosions frighten everyone ----
a = rd('core3a.js')
a = rep(a, "sfxBoom(1, 0);", "sfxBoom(1, 0); emitNoise(x, z, 60, 'boom'); moraleShock(x, z, 24, 20);")
wr('core3a.js', a)
# ---- core3b: weapon-dependent gunshot noise ----
c3 = rd('core3b.js')
c3 = rep(c3, "alertEnemies(P.x, P.z, 34);", "emitNoise(P.x, P.z, { pistol: 26, rifle: 38, shotgun: 46 }[w.kind] || 34, 'shot');")
wr('core3b.js', c3)

# ---- core5: story, roster spawn, endings, tags ----
s = rd('core5.js')
a0 = s.index('const L = {'); a1 = s.index('const play = ')
NEWL = r'''const L = {
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
'''
s = s[:a0] + NEWL + s[a1:]
s = rep(s, "const play = (arr, done) => sequence(arr.map(l => [l.who, l.text]), done);", "const play = (arr, done) => sequence(arr.map(l => [l.who, l.text]), done);\nconst EXTRA_P = { id: 's1', arch: 'دوبلير', name: 'الدوبلير مصطفى الجريء', title: 'من الصف التاني', t: [0.3, 0.3, 0.3, 0.2], alert: { who: 'دوبلير', text: 'أنا استسلمت، بلاش تضرب!' }, pain: { who: 'دوبلير', text: 'أنا بس دوبلير!' } };")
s = replace_func(s, 'spawnEnemies', '''function spawnEnemies() {
  enemies.forEach(e => worldG.remove(e.m.g)); enemies.length = 0; fallen.length = 0;
  const E = (type, x, z, zone, patrol, pid) => { const e = new Enemy(type, x, z, patrol, { persona: PBY[pid] }); e.zone = zone; return e; };
  E('guard', -12, 15, 'yard', [[-12, 15], [-12, 27]], 'y1'); E('guard', 12, 14, 'yard', [[12, 14], [20, 27]], 'y3'); E('guard', 0, 3, 'yard', [[0, 3], [-8, -3], [8, -3]], 'y4');
  E('guard', -26, 4, 'yard', [[-26, 4], [-26, -12]], 'y5'); E('guard', 27, -2, 'yard', [[27, -2], [27, -14]], 'y6'); E('guard', -6, -11, 'yard', [[-6, -11], [6, -11]], 'y7');
  E('guard', 19, 8, 'yard', [[19, 8], [24, 0]], 'y8'); E('guard', -20, -6, 'yard', [[-20, -6], [-14, -12]], 'y9'); E('heavy', 2, 9, 'yard', [[2, 9], [-2, 9]], 'y2');
  E('guard', -16, -20, 'wh', [[-16, -20], [-16, -30]], 'w1'); E('guard', 16, -20, 'wh', [[16, -20], [16, -30]], 'w2'); E('guard', 0, -24, 'wh', [[-6, -24], [6, -24]], 'w3');
  E('guard', -16, -33, 'wh', [[-16, -33], [-6, -33]], 'w4'); E('guard', 16, -33, 'wh', [[16, -33], [6, -33]], 'w5'); E('guard', -4, -33, 'wh', [[-4, -33], [4, -33]], 'w6');
  E('heavy', 10, -22, 'wh', [[10, -22], [10, -28]], 'w7'); E('heavy', -10, -30, 'wh', [[-10, -30], [-10, -24]], 'w8');
}''')
s = rep(s, "S.stage = 0; S.bossDead = false;", "S.stage = 0; S.bossDead = false; S.fathy = null; S.live = false; S.mercy = 0;")
s = replace_func(s, 'winGame', '''function winGame() {
  state = 'over'; document.exitPointerLock && document.exitPointerLock(); const full = evidence >= 3;
  $('#endT').textContent = S.live ? (full ? 'ليلة النجوم: الحقيقة اتذاعت' : 'البث انتشر... بس الشك فضل') : 'الأدلة وصلت للنيابة'; $('#endT').style.color = '#5fe0a0';
  const a = S.live ? (full ? 'ستين مليون متفرج شافوا النجوم وهما بيتقبض عليهم، والحاج صلاح اتحاصر. شحتة في أمان، وسيد بقى بطل حقيقي.' : 'البث انتشر، بس الأدلة الناقصة خلّت ناس كتير تشكّك. الحاج صلاح لسه بيحاول يهرب.') : 'الأدلة وصلت للنيابة بهدوء. الحاج صلاح هرب في الزحمة... والفصل الجاي هيطارده.';
  const f = S.fathy === 'trust' ? ' وفتحي رجع لورشته وبقى في ضهرك.' : (S.fathy === 'cut' ? ' وفتحي اختفى من حياتك.' : '');
  $('#endP').textContent = a + f + (S.spared || S.mercy ? ' ورحمتك مع اللي استسلموا اتحكت في البلد.' : '');
  const names = fallen.map(x => x.name); $('#stats').innerHTML = 'النجوم اللي وقعوا: ' + kills + (names.length ? ' (' + names.slice(0, 6).join('، ') + (names.length > 6 ? '...' : '') + ')' : '') + '<br>الأدلة: ' + evidence + '/3<br>الوقت: ' + Math.floor(gameT / 60) + ':' + String(Math.floor(gameT % 60)).padStart(2, '0') + '<br>صحتك: ' + Math.round(P.hp) + '%';
  $('#again').textContent = 'العب تاني'; $('#end').classList.remove('hidden'); $('#hud').classList.add('hidden');
}''')
# boss death -> Layla arrives -> final choice (live broadcast or quiet hand-over)
s = re.sub(r"killHook = \(e\) => \{.*?\n", '''killHook = (e) => { if (e.type === 'boss') { S.bossDead = true; setTimeout(() => { S.stage = 6; startLayla(); play(L.end.concat(S.spared || S.mercy ? L.endSpare : [], evidence >= 3 ? L.endEvid : []), () => { play(L.layla, () => { openChoice('الكاميرات شغّالة... تعمل إيه؟', ['اذيع لايف على الهواء', () => { S.live = true; play(L.liveYes, () => { sfxSiren(6); setTimeout(winGame, 2600); }); }], ['سلّم الأدلة للنيابة بس', () => { S.live = false; play(L.liveNo, () => { sfxSiren(6); setTimeout(winGame, 2600); }); }]); }); }); }, 2200); } };
''', s, count=1, flags=re.S)
s = re.sub(r"storyHook\.bossPhase = .*?\n", '''storyHook.bossPhase = (boss) => { play(L.phase2); const E2 = (x, z, pid) => { const e = new Enemy('guard', x, z, null, { persona: PBY[pid] }); e.zone = 'boss'; e.state = 'combat'; e.role = 'push'; e.lastKnown = [P.x, P.z]; }; E2(-6, -24, 'b3'); E2(6, -24, 'b4'); msg('الصقر بيطلب دعم!'); };
''', s, count=1, flags=re.S)
s = replace_func(s, 'storyUpdate', '''function storyUpdate() {
  const aliveZone = z => aliveCount(e => e.zone === z);
  if (S.stage === 0) { if (P.unlocked[1]) { S.stage = 1; play(L.rifle, () => play(L.laylaHello)); } }
  if (S.stage <= 1 && P.z < 26) { S.stage = 2; gate.solid = true; gate.mesh.visible = true; gate.mesh.position.y = 1.5; sfxMetal('gate'); msg('البوابة اتقفلت!'); play(L.gate); enemies.forEach(e => { if (e.zone === 'yard' && !e.dead) { e.state = 'alert'; e.alertT = 0.5 + Math.random() * 1.6; e.lastKnown = [P.x, P.z]; } }); }
  if (S.stage === 2) { setObj('وقّع نجوم الحوش: ' + aliveZone('yard')); if (aliveZone('yard') === 0) { S.stage = 3; rollDoor.solid = false; rollDoor.mesh.visible = false; sfxMetal('door'); msg('الباب اتفتح'); setObj('ادخل المخزن'); spawnSurrender();
      play(L.yardDone, () => play(L.fathyCall, () => openChoice('الأسطى فتحي بيكلّمك... تعمل إيه؟', ['سامحه وخليه يساعدك', () => { S.fathy = 'trust'; play(L.fathyTrust); }], ['اقفل الخط', () => { S.fathy = 'cut'; play(L.fathyCut); }]))); } }
  if (S.stage === 3 && P.z < -15) { S.stage = 4; play(L.enter); enemies.forEach(e => { if (e.zone === 'wh' && !e.dead && e.state === 'patrol' && Math.random() < 0.5) { e.state = 'suspicious'; e.aware = 0.6; e.inv = [P.x, P.z]; e.invT = 6; } }); }
  if (S.stage === 4) { setObj('وقّع نجوم المخزن: ' + aliveZone('wh') + ' | أدلة: ' + evidence + '/3'); if (aliveZone('wh') === 0) { S.stage = 5; officeDoor.solid = false; officeDoor.mesh.visible = false; sfxMetal('door'); const mk = (t, x, z, pid) => { const e = new Enemy(t, x, z, null, { persona: PBY[pid] }); e.zone = 'boss'; e.state = 'alert'; e.alertT = 3.5 + Math.random(); e.lastKnown = [P.x, P.z]; return e; }; mk('boss', 0, -37, 'boss'); mk('guard', -3, -35, 'b1'); mk('guard', 3, -35, 'b2'); play(L.whDone); setObj('اقتل النجم سيف الصقر وخد شحتة'); } }
  if (S.stage === 5) { const boss = enemies.find(e => e.type === 'boss'); if (boss && !boss.dead) setObj('النجم سيف الصقر: ' + Math.max(0, Math.round(boss.hp / boss.maxhp * 100)) + '%'); }
}''')
# spontaneous surrenders + scripted guard uses a persona
s = replace_func(s, 'spawnSurrender', '''function spawnSurrender() { const e = new Enemy('guard', 0, -11, null, { persona: EXTRA_P }); e.zone = 'surr'; e.state = 'surrender'; const it = { x: 0, z: -11, r: 2.2, label: 'كلّم ' + e.name, kind: 'guard', done: false, mesh: new THREE.Group(), e }; worldG.add(it.mesh); inter.push(it); }
function surrTalk(it) {
  it.done = true; const e = it.e;
  openChoice(e.name + ' رفع إيديه ومتوسّل. تعمل إيه؟',
    ['خد سلاحه (ذخيرة)', () => { P.ammo.forEach((a, i) => { if (P.unlocked[i]) a.res += [10, 24, 5][i]; }); hudAmmo(); msg('+ ذخيرة', 1200); releaseGuard(it); }],
    ['سيبه يهرب', () => { S.mercy = (S.mercy || 0) + 1; P.hp = Math.min(100, P.hp + 15); hudHp(); msg('رحمتك... ' + e.name + ' جري', 1600); releaseGuard(it); }]);
}''')
s = rep(s, "else if (it.kind === 'guard') guardTalk(it); }", "else if (it.kind === 'guard') guardTalk(it); else if (it.kind === 'surr') surrTalk(it); }")
# evidence markers on the minimap only if Fathy is trusted
s = rep(s, "for (const it of inter) { if (it.done) continue; mmG.fillStyle = '#4fd8ff';", "for (const it of inter) { if (it.done || (it.kind === 'evidence' && S.fathy !== 'trust')) continue; mmG.fillStyle = '#4fd8ff';")
# name tag above whoever you aim at
s = rep(s, "function screenFx(dt) {", '''const _tv = new V3(), _tf = new V3(), _tag = $('#tag');
function tagUpdate() {
  camera.getWorldPosition(_tv); camera.getWorldDirection(_tf); let best = null, ba = 0.075;
  for (const e of enemies) { if (e.dead) continue; const dx = e.x - _tv.x, dz = e.z - _tv.z, dy = 1.5 - _tv.y, d = Math.hypot(dx, dy, dz); if (d > 34) continue; const ang = Math.acos(clamp((dx * _tf.x + dy * _tf.y + dz * _tf.z) / d, -1, 1)); if (ang < ba && rayBoxes(_tv.x, _tv.y, _tv.z, dx / d, dy / d, dz / d, d) === Infinity) { ba = ang; best = e; } }
  if (!best || state !== 'play') { _tag.classList.add('hidden'); return; }
  const p = new V3(best.x, 2.0 * best.c.scale, best.z).project(camera); if (p.z > 1) { _tag.classList.add('hidden'); return; }
  _tag.classList.remove('hidden'); _tag.style.left = ((p.x * 0.5 + 0.5) * innerWidth) + 'px'; _tag.style.top = ((-p.y * 0.5 + 0.5) * innerHeight - 8) + 'px';
  _tag.children[0].textContent = best.name; _tag.children[1].textContent = best.title; _tag.children[2].textContent = best.mood();
}
function screenFx(dt) {''')
s = rep(s, "if (state === 'play') mmDraw(); renderer.render(scene, camera);", "if (state === 'play') mmDraw(); renderer.render(scene, camera); tagUpdate();")
wr('core5.js', s)

# ---- voice tool: new cast keys ----
v = pathlib.Path('/tmp/zrepo/tools/voice_html.py'); t = v.read_text(encoding='utf-8')
a0 = t.index('CAST = {'); a1 = t.index('FX = {')
NEWCAST = '''CAST = {
    "سيد":     (["ar-EG-ShakirNeural"], "+5%", "+0Hz", 1.00, None),
    "الأسطى":  (["ar-EG-ShakirNeural"], "-4%", "-10Hz", 0.90, None),
    "الحاج":   (["ar-EG-ShakirNeural"], "-14%", "-25Hz", 0.82, None),
    "شحتة":    (["ar-EG-ShakirNeural"], "+14%", "+20Hz", 1.25, None),
    "ليلى":    (["ar-EG-SalmaNeural"], "+3%", "+0Hz", 1.00, None),
    "الصقر":   (["ar-SA-HamedNeural", "ar-AE-HamdanNeural"], "-6%", "-14Hz", 0.88, None),
    "نجم":     (["ar-SA-HamedNeural", "ar-AE-HamdanNeural"], "-6%", "-14Hz", 0.88, None),
    "مطرب":    (["ar-LB-RamiNeural", "ar-SY-LaithNeural"], "+6%", "+12Hz", 1.06, None),
    "كابتن":   (["ar-OM-AbdullahNeural", "ar-YE-SalehNeural"], "-8%", "-15Hz", 0.92, None),
    "ممثل":    (["ar-AE-HamdanNeural", "ar-QA-MoazNeural"], "-4%", "-12Hz", 0.95, None),
    "مذيع":    (["ar-JO-TaimNeural", "ar-IQ-BasselNeural"], "+14%", "+4Hz", 1.02, None),
    "بيزنس":   (["ar-KW-FahedNeural", "ar-BH-AliNeural"], "-6%", "-18Hz", 0.88, None),
    "دوبلير":  (["ar-SY-LaithNeural", "ar-LY-OmarNeural", "ar-TN-HediNeural"], "+8%", "+0Hz", 1.0, None),
    "مؤثرة":   (["ar-JO-SanaNeural", "ar-LB-LaylaNeural", "ar-EG-SalmaNeural"], "+10%", "+6Hz", 1.05, None),
}
'''
t = t[:a0] + NEWCAST + t[a1:]
t = t.replace('voice_shooter_v3', 'voice_shooter_v5')
v.write_text(t, encoding='utf-8')
print('patched')
