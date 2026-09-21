
/* ================= NPC minds: personality, perception, memory, morale, cover, squad tactics, banter ================= */
const ICONS = {};
function iconTex(ch) { if (ICONS[ch]) return ICONS[ch]; const t = ctex(64, 64, g => { g.font = '46px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 32, 36); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.repeat.set(1, 1); ICONS[ch] = t; return t; }
const fallen = [];                     // every star you brought down (shown at the end)
const MOOD = { patrol: 'هادي', suspicious: 'مستريّب', alert: 'اتفاجئ', flee: 'خايف', surrender: 'مستسلم', hide: 'متخبّي' };

/* every fictional "celebrity" has a name, a title, a personality [bravery, aggression, discipline, vanity] and two lines of his own.
   All names are invented; any resemblance to a real person is a coincidence. */
const PERSONAS = [
  { id: 'y1', arch: 'مطرب', name: 'المطرب كوكو الأسمر', title: 'أمير الأغنية الشعبية', t: [0.45, 0.55, 0.3, 0.9], idle: 'sing', alert: { who: 'مطرب', text: 'إنت داخل على كوكو الأسمر؟ جمهوري هيعرف!' }, pain: { who: 'مطرب', text: 'يا ساتر، حنجرتي!' } },
  { id: 'y2', arch: 'كابتن', name: 'الكابتن قرش الكورة', title: 'هدّاف الزمن الجميل', t: [0.85, 0.8, 0.4, 0.6], idle: 'stretch', alert: { who: 'كابتن', text: 'أنا لسه بسجّل يا شاطر!' }, pain: { who: 'كابتن', text: 'ده كان فاول يا حكم!' } },
  { id: 'y3', arch: 'مؤثرة', name: 'المؤثرة ميرو ستار', title: 'ملكة الفيديوهات', t: [0.3, 0.4, 0.4, 1.0], idle: 'selfie', alert: { who: 'مؤثرة', text: 'استنى، خليني أصوّرك الأول!' }, pain: { who: 'مؤثرة', text: 'إنت بتبوّظ الفلتر!' } },
  { id: 'y4', arch: 'ممثل', name: 'الفنان عادل التمثيل', title: 'نجم الدراما الرمضانية', t: [0.5, 0.5, 0.5, 0.8], idle: 'phone', alert: { who: 'ممثل', text: 'دي لقطة جديدة... أكشن!' }, pain: { who: 'ممثل', text: 'قطع! قطع!' } },
  { id: 'y5', arch: 'مذيع', name: 'المذيع لطفي آخر الليل', title: 'صاحب برنامج الأسرار', t: [0.35, 0.35, 0.6, 0.7], idle: 'notes', alert: { who: 'مذيع', text: 'خبر عاجل: في متسلل في الحوش!' }, pain: { who: 'مذيع', text: 'الهوا مقطوع!' } },
  { id: 'y6', arch: 'دوبلير', name: 'الدوبلير عم صبحي الخطر', title: 'أشهر دوبلير في البلد', t: [0.9, 0.6, 0.7, 0.2], idle: 'smoke', alert: { who: 'دوبلير', text: 'أنا وقعت من عمارات، مش هخاف منك!' }, pain: { who: 'دوبلير', text: 'ده مش في السيناريو!' } },
  { id: 'y7', arch: 'بيزنس', name: 'رجل الأعمال منير الذهب', title: 'ملك سلاسل المطاعم', t: [0.25, 0.3, 0.5, 0.6], idle: 'phone', alert: { who: 'بيزنس', text: 'الأمن! ده مش وقت شغل!' }, pain: { who: 'بيزنس', text: 'هتدفع التعويض!' } },
  { id: 'y8', arch: 'مطرب', name: 'المطرب دودو ستار', title: 'صاحب أغنية الصيف', t: [0.3, 0.45, 0.3, 0.9], idle: 'sing', alert: { who: 'مطرب', text: 'لاااا، دي مش البروفة!' }, pain: { who: 'مطرب', text: 'أغنيتي هتتأجل!' } },
  { id: 'y9', arch: 'كابتن', name: 'الكابتن سمعة الهداف', title: 'قائد الفريق سابقاً', t: [0.8, 0.7, 0.6, 0.5], idle: 'stretch', alert: { who: 'كابتن', text: 'ده جون في مرماك!' }, pain: { who: 'كابتن', text: 'أنا مصاب، أنا مصاب!' } },
  { id: 'w1', arch: 'ممثل', name: 'الفنان رشدي الدراما', title: 'الأب الحنون في المسلسلات', t: [0.4, 0.4, 0.5, 0.7], idle: 'phone', alert: { who: 'ممثل', text: 'يا ابني إحنا هنا بنصوّر!' }, pain: { who: 'ممثل', text: 'أنا طيّب بس الدور بيقسّى!' } },
  { id: 'w2', arch: 'مؤثرة', name: 'المؤثرة سوسو لايف', title: 'مليون متابع كل يوم', t: [0.3, 0.5, 0.35, 1.0], idle: 'selfie', alert: { who: 'مؤثرة', text: 'لايف! في حد داخل!' }, pain: { who: 'مؤثرة', text: 'نزّلوا الفيديو ده!' } },
  { id: 'w3', arch: 'دوبلير', name: 'الدوبلير زيزو الحديد', title: 'الراجل اللي مبيتخبطش', t: [0.9, 0.7, 0.7, 0.3], idle: 'smoke', alert: { who: 'دوبلير', text: 'هوريك أفلام الأكشن الحقيقية!' }, pain: { who: 'دوبلير', text: 'مش هتصدق إني وجعت.' } },
  { id: 'w4', arch: 'مذيع', name: 'المذيع نجيب الأخبار', title: 'صوت البلد', t: [0.4, 0.4, 0.6, 0.7], idle: 'notes', alert: { who: 'مذيع', text: 'سيداتي سادتي، الضيف وصل!' }, pain: { who: 'مذيع', text: 'ده بث مباشر!' } },
  { id: 'w5', arch: 'ممثل', name: 'الفنان نور الشاشة', title: 'وش الخير', t: [0.5, 0.55, 0.45, 0.8], idle: 'phone', alert: { who: 'ممثل', text: 'أنا ماسك دور البطل مش الحارس!' }, pain: { who: 'ممثل', text: 'مين المخرج ده؟' } },
  { id: 'w6', arch: 'مطرب', name: 'المطرب هيما شعبان', title: 'صوت الحارة', t: [0.5, 0.6, 0.3, 0.8], idle: 'sing', alert: { who: 'مطرب', text: 'أنا هغنّيلك أغنية الوداع!' }, pain: { who: 'مطرب', text: 'نشّزت من الوجع!' } },
  { id: 'w7', arch: 'بيزنس', name: 'رجل الأعمال فايز المصانع', title: 'إمبراطور الأجهزة', t: [0.55, 0.5, 0.6, 0.5], idle: 'phone', alert: { who: 'بيزنس', text: 'مصانعي مش هتقفل عشانك!' }, pain: { who: 'بيزنس', text: 'هبيعلك بالخسارة!' } },
  { id: 'w8', arch: 'كابتن', name: 'الكابتن هيثم الجدار', title: 'حارس مرمى المنتخب', t: [0.9, 0.5, 0.75, 0.5], idle: 'stretch', alert: { who: 'كابتن', text: 'مفيش كورة هتعدّي من هنا!' }, pain: { who: 'كابتن', text: 'الكورة دي دخلت!' } },
  { id: 'b1', arch: 'دوبلير', name: 'الدوبلير كمال المخاطر', title: 'ظل النجم', t: [0.9, 0.8, 0.8, 0.2], alert: { who: 'دوبلير', text: 'أنا الظل بتاع الصقر!' }, pain: { who: 'دوبلير', text: 'ظهري!' } },
  { id: 'b2', arch: 'مؤثرة', name: 'المؤثرة لولو التريند', title: 'ملكة التريند', t: [0.4, 0.6, 0.4, 1.0], alert: { who: 'مؤثرة', text: 'ده هيبقى تريند!' }, pain: { who: 'مؤثرة', text: 'كاميرتي!' } },
  { id: 'b3', arch: 'مطرب', name: 'المطرب جيمي الروح', title: 'نجم الحفلات', t: [0.5, 0.6, 0.4, 0.8], alert: { who: 'مطرب', text: 'الحفلة لسه شغّالة!' }, pain: { who: 'مطرب', text: 'قطعت النَّفَس!' } },
  { id: 'b4', arch: 'مذيع', name: 'المذيع طارق الحقيقة', title: 'ضيف كل بيت', t: [0.45, 0.5, 0.6, 0.7], alert: { who: 'مذيع', text: 'الحقيقة هتتقال دلوقتي!' }, pain: { who: 'مذيع', text: 'فاصل إعلاني!' } },
  { id: 'boss', arch: 'نجم', name: 'النجم سيف الصقر', title: 'ملك أفلام الأكشن', t: [1.0, 0.9, 0.9, 1.0], alert: { who: 'نجم', text: 'أنا النجم سيف الصقر، وإنت كومبارس!' }, pain: { who: 'نجم', text: 'مشهد الموت ده مش وقته!' } }
];
const PBY = {}; PERSONAS.forEach(p => { PBY[p.id] = p; });
const BANTER = [
  { a: 'مطرب', b: 'كابتن', lines: [{ who: 'مطرب', text: 'الجمهور طلب مني أغنية جديدة الليلة.' }, { who: 'كابتن', text: 'ركّز في الشغل يا فنان، الشوط لسه.' }] },
  { a: 'ممثل', b: 'مذيع', lines: [{ who: 'ممثل', text: 'لسه مش عارف أحفظ دوري في المسلسل.' }, { who: 'مذيع', text: 'ولا أنا حافظ اسم الضيف في البرنامج.' }] },
  { a: 'دوبلير', b: 'مؤثرة', lines: [{ who: 'دوبلير', text: 'أنا وقعت من الدور الخامس النهارده.' }, { who: 'مؤثرة', text: 'حصلت! صوّرت الوقعة وطلعت ترند.' }] },
  { a: 'بيزنس', b: 'مذيع', lines: [{ who: 'بيزنس', text: 'الأسهم نازلة والحاج صلاح مش داري.' }, { who: 'مذيع', text: 'ده هيبقى خبر عاجل بكرة.' }] }
];
const BARK_TEXT = ['في حد هنا!', 'ده الغريب!', 'حاصروه!', 'آه!', 'اتصاب!', 'مين هناك؟'];
const BARK_WHO = ['مطرب', 'كابتن', 'ممثل', 'مذيع', 'بيزنس', 'دوبلير', 'مؤثرة', 'نجم'];
const BARKS = { alert: [0, 1, 5], hurt: [3], flank: [2], body: [4] };
let barkCool = 0, banterCool = 8;
function bark(kind, e, personal = true) {
  if (barkCool > 0 || !e) return; const d = Math.hypot(e.x - P.x, e.z - P.z), pan = clamp(Math.sin(Math.atan2(e.x - P.x, e.z - P.z) - P.yaw + Math.PI) * 0.8, -0.9, 0.9);
  let text, who = e.voice; const pr = e.persona;
  if (personal && pr && ((kind === 'alert' && Math.random() < 0.6) || (kind === 'hurt' && Math.random() < 0.5))) { const l = kind === 'alert' ? pr.alert : pr.pain; text = l.text; who = l.who; if (d < 26) addFeed(e.name + ': ' + text, false); }
  else { const arr = BARKS[kind]; text = BARK_TEXT[arr[Math.floor(Math.random() * arr.length)]]; }
  barkCool = 1.1; speak(who, text, clamp(1 - d / 45, 0.2, 0.9), { rate: e.vrate, pan, lp: d > 22 ? 2600 : 0, wet: d > 14 ? 0.35 : 0.15 });
}
function emitNoise(x, z, r, kind) {          // what the NPCs can hear
  for (const e of enemies) { if (e.dead || e.state === 'surrender') continue; const d = Math.hypot(e.x - x, e.z - z); if (d < r * (e.hearing || 1)) e.hear(x, z, kind, d / r); }
}
function alertEnemies(x, z, r) { emitNoise(x, z, r, 'shot'); }
function moraleShock(x, z, r, amt) { for (const e of enemies) { if (e.dead || e.type === 'boss') continue; if (Math.hypot(e.x - x, e.z - z) < r) e.morale -= amt * (1.15 - e.traits.brave * 0.6); } }
function pointFree(x, z) { for (const s of solids) { if (!s.solid || s.y0 > 1.2 || s.y1 < 0.5) continue; if (x > s.minx - 0.4 && x < s.maxx + 0.4 && z > s.minz - 0.4 && z < s.maxz + 0.4) return false; } return true; }

class Enemy {
  constructor(type, x, z, patrol, opts = {}) {
    const pr = opts.persona || null; this.persona = pr; this.type = type; this.c = CFG[type]; this.female = !!opts.female || (pr && pr.arch === 'مؤثرة');
    this.name = pr ? pr.name : 'حارس'; this.title = pr ? pr.title : ''; this.voice = pr ? pr.arch : 'دوبلير'; const tr = pr ? pr.t : [0.5, 0.5, 0.5, 0.3];
    this.traits = { brave: tr[0], aggr: tr[1], disc: tr[2], vain: tr[3] }; this.idleAct = pr && pr.idle || null;
    this.vrate = 0.96 + Math.random() * 0.08; this.x = x; this.z = z; this.yaw = Math.PI; this.hp = this.c.hp; this.maxhp = this.c.hp; this.state = 'patrol'; this.dead = false; this.t = Math.random() * 6;
    this.patrol = patrol || [[x, z]]; this.pi = 0; this.alertT = 0; this.shootT = 1.0; this.burst = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.strafeT = rand(1, 2.5); this.lastKnown = null; this.lostT = 0; this.flashT = 0; this.hitFlash = 0; this.fall = 0; this.react = 0;
    this.morale = 100; this.aware = 0; this.mag = 30; this.reloadT = 0; this.role = null; this.roleT = 0; this.cover = null; this.coverT = 0; this.hiding = false; this.hideT = 0; this.peekT = 0; this.peekSide = 1;
    this.fleeT = 0; this.inv = null; this.invT = 0; this.waitT = 0; this.act = null; this.actT = 0; this.bantCool = rand(4, 14); this.saw = new Set(); this.crouch = 0; this.hearing = 0.8 + Math.random() * 0.5; this.iconCh = '';
    this.m = buildHuman(outfit(type, this.female)); this.m.g.position.set(x, 0, z); worldG.add(this.m.g);
    this.ico = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex('❓'), transparent: true, depthTest: false, fog: false, opacity: 0 })); this.ico.scale.set(0.42, 0.42, 1); this.ico.position.set(0, 2.15, 0); this.ico.renderOrder = 9; this.m.g.add(this.ico);
    enemies.push(this);
  }
  hitTest(o, d, maxT) {
    const s = this.c.scale, k = 1 - this.crouch * 0.28; let best = Infinity, head = false;
    const th = raySphere(o.x, o.y, o.z, d.x, d.y, d.z, this.x, 1.7 * s * k, this.z, 0.17 * s); if (th < best) { best = th; head = true; }
    const tb = rayAABB(o.x, o.y, o.z, d.x, d.y, d.z, { x: this.x - 0.3 * s, y: 0, z: this.z - 0.26 * s }, { x: this.x + 0.3 * s, y: 1.6 * s * k, z: this.z + 0.26 * s }); if (tb < best) { best = tb; head = false; }
    return best < maxT ? { t: best, head } : null;
  }
  setIcon(ch) { if (ch === this.iconCh) return; this.iconCh = ch; if (!ch) { this.ico.material.opacity = 0; return; } this.ico.material.map = iconTex(ch); this.ico.material.opacity = 1; this.ico.material.needsUpdate = true; }
  mood() { if (this.state === 'combat') return { strafe: 'بيتحرك ويضرب', cover: 'محتمي ورا سترة', flank: 'بيلفّ عليك', push: 'بيهجم' }[this.role] || 'بيقاتل'; if (this.act && this.state === 'patrol') return ({ sing: 'بيغنّي', stretch: 'بيسخّن', selfie: 'بيصوّر سيلفي', phone: 'في التليفون', notes: 'بيراجع ورقه', smoke: 'بيدخّن' })[this.act] || 'هادي'; return MOOD[this.state] || 'هادي'; }
  hear(x, z, kind, near) {
    if (this.state === 'combat' || this.state === 'flee' || this.state === 'surrender') { if (kind === 'shot') this.lastKnown = [P.x, P.z]; return; }
    if (kind === 'boom') { this.morale -= 18; this.inv = [x, z]; this.invT = 6; if (this.state === 'patrol') { this.state = 'suspicious'; this.aware = 0.6; } return; }
    if (kind === 'shot') { this.state = 'alert'; this.alertT = 0.3 + Math.random() * 0.5; this.lastKnown = [P.x, P.z]; bark('alert', this); return; }
    this.aware = Math.min(0.95, this.aware + 0.35 * (1.2 - near)); this.inv = [x, z]; this.invT = 5; if (this.state === 'patrol' && this.aware > 0.3) this.state = 'suspicious';
  }
  damage(n, dir, head, splash) {
    if (this.dead) return false; this.hp -= n; this.hitFlash = 0.12; this.morale -= 8 + n * 0.15;
    if (this.state === 'patrol' || this.state === 'suspicious') { this.state = 'alert'; this.alertT = 0.15; }
    this.x += dir.x * 0.05; this.z += dir.z * 0.05; this.lastKnown = [P.x, P.z];
    if (this.hp <= 0) { this.die(dir, head); return true; }
    bark('hurt', this); alertEnemies(this.x, this.z, 10);
    if (this.type === 'boss' && !this.phase2 && this.hp < this.maxhp * 0.5) { this.phase2 = true; this.c = Object.assign({}, this.c, { speed: 3.3, rate: 0.09 }); if (storyHook.bossPhase) storyHook.bossPhase(this); }
    return false;
  }
  die(dir, head) {
    this.dead = true; this.state = 'dead'; this.fall = 0; this.fdir = dir.clone ? dir.clone() : new V3(0, 0, 1); this.setIcon(''); sfxTick(140, 0.3, 0.2);
    kills++; fallen.push({ name: this.name, title: this.title, head }); addFeed((head ? 'ضربة راس: ' : 'وقّعت ') + this.name, head);
    if (this.persona && Math.random() < 0.7) { const l = this.persona.pain; speak(l.who, l.text, clamp(1 - Math.hypot(this.x - P.x, this.z - P.z) / 40, 0.2, 0.8), { rate: this.vrate }); }
    moraleShock(this.x, this.z, 16, 14); if (this.type === 'heavy') moraleShock(this.x, this.z, 40, 10);
    if (killHook) killHook(this);
    if (Math.random() < 0.4 && this.type !== 'boss') addItem(Math.random() < 0.5 ? 'ammo' : 'health', this.x, this.z);
    if (this.type === 'boss') { FX.slowT = 1.8; }
  }
  los() { const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz), inv = 1 / (dist || 1); return rayBoxes(this.x, 1.5, this.z, dx * inv, (1.35 - 1.5) * inv, dz * inv, dist) === Infinity; }
  sees() { const dx = P.x - this.x, dz = P.z - this.z; return Math.hypot(dx, dz) < 55 && this.los(); }
  move(dx, dz, sp, dt) { const l = Math.hypot(dx, dz) || 1; this.x += dx / l * sp * dt; this.z += dz / l * sp * dt; const p = { x: this.x, z: this.z }; collideCircle(p, 0.38); this.x = p.x; this.z = p.z; for (const o of enemies) { if (o === this || o.dead) continue; const ox = this.x - o.x, oz = this.z - o.z, d = Math.hypot(ox, oz); if (d < 0.8 && d > 0.001) { this.x += ox / d * (0.8 - d) * 0.5; this.z += oz / d * (0.8 - d) * 0.5; } } }
  faceTo(x, z, dt, k = 8) { const t = Math.atan2(-(x - this.x), -(z - this.z)); let d = t - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * k); }
  shoot() {
    const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz), s = this.c.scale; const from = new V3(this.x - Math.sin(this.yaw) * 0.6, 1.22 * s * (1 - this.crouch * 0.25), this.z - Math.cos(this.yaw) * 0.6);
    const err = 0.02 + dist * 0.0022 + (this.type === 'boss' ? -0.01 : 0) + (this.hiding ? 0.02 : 0), off = Math.sqrt(Math.random()) * err * dist;
    const a = rand(0, TAU), tgt = new V3(P.x + Math.cos(a) * off, 1.3 + Math.sin(a) * off * 0.7, P.z + Math.sin(a) * off);
    const hitP = off < 0.42 * (Math.hypot(P.vx, P.vz) > 3 ? 0.75 : 1); this.mag--;
    spawnTracer(from, hitP ? new V3(P.x, 1.3, P.z) : tgt, this.type === 'heavy' ? 0xffb070 : 0xff8a5a, 0.9); this.flashT = 0.05;
    const pan = clamp(Math.sin(Math.atan2(this.x - P.x, this.z - P.z) - P.yaw + Math.PI) * 0.8, -0.9, 0.9);
    sfxShot(this.type === 'heavy' ? 'shotgun' : 'enemy', clamp(1.1 - dist / 55, 0.2, 0.9), pan, dist > 25 ? 2600 : 0);
    if (hitP) hurtPlayer(this.c.dmg * (this.type === 'heavy' ? 1 : rand(0.8, 1.2)), from);
    else { if (off < 2.2) sfxWhiz(clamp(Math.sin(Math.atan2(this.x - P.x, this.z - P.z) - P.yaw + Math.PI), -0.9, 0.9)); const bd = tgt.clone().sub(from).normalize(), r = rayBoxes(from.x, from.y, from.z, bd.x, bd.y, bd.z, 60); if (r !== Infinity && r < dist + 3) { const p = from.clone().addScaledVector(bd, r); sparks(p, 3, bd.clone().negate(), 2, 0.6); } if (dist < 4) sfxTick(rand(2400, 3400), 0.1, 0.12); }
  }
  findCover() {
    let best = null, bd = 1e9;
    for (const s of solids) {
      if (!s.solid || s.y0 > 0.3 || s.y1 < 1.05) continue; const w = s.maxx - s.minx, d = s.maxz - s.minz, big = Math.max(w, d); if (big > 9) continue;
      const cx = (s.minx + s.maxx) / 2, cz = (s.minz + s.maxz) / 2, ddx = cx - P.x, ddz = cz - P.z, dl = Math.hypot(ddx, ddz) || 1; if (dl < 4 || dl > 36) continue;
      const px = cx + ddx / dl * (big / 2 + 0.9), pz = cz + ddz / dl * (big / 2 + 0.9), dme = Math.hypot(px - this.x, pz - this.z); if (dme > 18 || dme >= bd || !pointFree(px, pz)) continue;
      const L2 = Math.hypot(px - P.x, pz - P.z); if (rayBoxes(P.x, 1.3, P.z, (px - P.x) / L2, (1.0 - 1.3) / L2, (pz - P.z) / L2, L2 - 0.3) === Infinity) continue;
      best = [px, pz]; bd = dme;
    }
    return best;
  }
  pickRole() { const t = this.traits, r = Math.random(); this.roleT = rand(6, 10); if (this.type === 'boss') return t.aggr > 0.5 ? 'push' : 'strafe'; if (t.brave > 0.7 && r < 0.5) return 'push'; if (t.disc > 0.55 && r < 0.4) { bark('flank', this, false); return 'flank'; } if (r < 0.65 - t.brave * 0.2) return 'cover'; return 'strafe'; }
  update(dt) {
    const m = this.m; this.t += dt; const t = this.t;
    if (this.dead) { this.fall = Math.min(1, this.fall + dt * 2.2); const e = 1 - Math.pow(1 - this.fall, 3); m.g.rotation.x = -e * 1.5; m.g.position.y = -e * 0.35; m.legL.rotation.x = e * 0.4; m.armL.rotation.x = e * 1.2; m.armR.rotation.z = -e * 0.8; m.gun.visible = e < 0.6; return; }
    if (this.state === 'surrender') { this.setIcon('🙌'); this.faceTo(P.x, P.z, dt, 4); m.armL.rotation.x = -2.8; m.armR.rotation.x = -2.8; m.armL.rotation.z = 0.3; m.armR.rotation.z = -0.3; m.legL.rotation.x = -1.4; m.legR.rotation.x = -1.4; if (m.legL.shin) { m.legL.shin.rotation.x = 2.4; m.legR.shin.rotation.x = 2.4; } m.gun.visible = false; m.g.position.set(this.x, -0.42, this.z); m.g.rotation.y = this.yaw; return; }
    const dx = P.x - this.x, dz = P.z - this.z, dist = Math.hypot(dx, dz), engaged = this.state === 'combat' || this.state === 'alert' || this.state === 'flee';
    const ang = Math.atan2(-dx, -dz) - this.yaw, fov = engaged ? 2.4 : 1.15, inFov = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) < fov, los = !P.dead && dist < 48 && this.los(), sees = los && inFov;
    let moving = false, sp = 0, want = 0;                 // want = crouch target
    this.morale = Math.min(100, this.morale + dt * (this.state === 'combat' ? 0.5 : 2.2)); this.bantCool -= dt; this.mag = this.mag <= 0 && this.reloadT <= 0 ? 0 : this.mag;
    // bodies of fallen stars make the others suspicious and afraid
    if (!engaged) for (const o of enemies) { if (!o.dead || this.saw.has(o) || o === this) continue; const bd = Math.hypot(o.x - this.x, o.z - this.z); if (bd < 8) { this.saw.add(o); this.aware = Math.max(this.aware, 0.55); this.inv = [o.x, o.z]; this.invT = 6; this.morale -= 10; if (this.state === 'patrol') this.state = 'suspicious'; bark('body', this, false); alertEnemies(o.x, o.z, 9); } }

    if (this.state === 'patrol' || this.state === 'suspicious') {
      // vision fills an awareness meter (closer, faster or louder player = faster)
      if (sees && dist < 34) { const rate = (dist < 8 ? 3.4 : dist < 18 ? 1.5 : 0.65) * (Math.hypot(P.vx, P.vz) > 5 ? 1.5 : 1); this.aware += rate * dt; if (this.aware > 0.3 && this.state === 'patrol') { this.state = 'suspicious'; this.inv = [P.x, P.z]; this.invT = 6; } }
      else this.aware = Math.max(0, this.aware - 0.3 * dt);
      if (this.aware >= 1) { this.state = 'alert'; this.alertT = 0.3 + Math.random() * 0.3; this.lastKnown = [P.x, P.z]; bark('alert', this); alertEnemies(this.x, this.z, 20); }
      else if (this.state === 'suspicious') {
        this.setIcon('❓'); this.invT -= dt;
        if (this.inv) { const wx = this.inv[0] - this.x, wz = this.inv[1] - this.z; if (Math.hypot(wx, wz) > 1.6) { this.faceTo(this.inv[0], this.inv[1], dt, 6); this.move(wx, wz, 1.9, dt); moving = true; sp = 1.9; } else { this.yaw += Math.sin(t * 2.4) * dt * 1.6; } }
        if (this.invT <= 0 && this.aware < 0.3) { this.state = 'patrol'; this.inv = null; this.setIcon(''); }
      } else {
        this.setIcon(this.act ? { sing: '🎵', stretch: '💪', selfie: '📸', phone: '📱', notes: '📝', smoke: '🚬' }[this.act] || '' : '');
        if (this.waitT > 0) { this.waitT -= dt; this.actT += dt; if (this.waitT <= 0) { this.act = null; this.actT = 0; } }
        else { const w = this.patrol[this.pi]; const wx = w[0] - this.x, wz = w[1] - this.z;
          if (Math.hypot(wx, wz) < 0.8) { this.pi = (this.pi + 1) % this.patrol.length; if (this.idleAct && Math.random() < 0.55) { this.act = this.idleAct; this.waitT = rand(4, 9); this.actT = 0; } else if (Math.random() < 0.3) { this.waitT = rand(1.5, 3.5); } }
          else { this.faceTo(w[0], w[1], dt, 5); this.move(wx, wz, 1.3, dt); moving = true; sp = 1.3; } }
        // idle chat with a colleague
        if (this.waitT > 0 && this.bantCool <= 0 && banterCool <= 0 && dist < 26 && !engaged) this.tryBanter();
      }
    } else if (this.state === 'alert') {
      this.setIcon('❗'); this.faceTo(P.x, P.z, dt, 10); this.alertT -= dt; if (this.alertT <= 0) { this.state = 'combat'; this.react = 0.35 + (1 - this.traits.aggr) * 0.4; this.role = this.pickRole(); this.cover = null; }
    } else if (this.state === 'combat') {
      const tr = this.traits, c = this.c; if (!this.role) this.role = this.pickRole();
      this.setIcon(this.role === 'cover' && this.hiding ? '🛡️' : (tr.aggr > 0.6 ? '💢' : '😠'));
      this.roleT -= dt; if (this.roleT <= 0) { this.role = this.pickRole(); this.cover = null; }
      this.faceTo(sees ? P.x : (this.lastKnown ? this.lastKnown[0] : P.x), sees ? P.z : (this.lastKnown ? this.lastKnown[1] : P.z), dt, 9);
      // morale: break and run, or give up
      const breakAt = 20 + (1 - tr.brave) * 26 - (this.type === 'boss' ? 99 : 0);
      if (this.morale < breakAt && this.type !== 'boss') { if (this.morale < 8 && this.hp < this.maxhp * 0.75 && tr.brave < 0.7) { this.state = 'surrender'; registerSurrender(this); return; } this.state = 'flee'; this.fleeT = rand(4, 8); this.setIcon('😨'); bark('hurt', this, false); }
      if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.mag = 30; }
      else if (this.mag <= 0) { this.reloadT = 2.2; if (dist < 45) playBuf && playBuf('mag_in', { vol: clamp(0.7 - dist / 60, 0.1, 0.5), delay: 0.05 }); if (this.role !== 'cover') { this.role = 'cover'; this.cover = null; } }
      if (sees) { this.lastKnown = [P.x, P.z]; this.lostT = 0; this.react -= dt; } else this.lostT += dt;
      const ux = dx / (dist || 1), uz = dz / (dist || 1); let mx = 0, mz = 0, spd = c.speed * (this.type === 'boss' ? 0.85 : 0.72), fire = sees && this.react <= 0 && this.reloadT <= 0;
      if (this.role === 'cover') {
        this.coverT -= dt; if (!this.cover || this.coverT <= 0) { this.cover = this.findCover(); this.coverT = rand(3.5, 6); this.hiding = false; this.peekT = 0; }
        if (this.cover) { const cx = this.cover[0] - this.x, cz = this.cover[1] - this.z, cd = Math.hypot(cx, cz);
          if (cd > 0.7 && !this.hiding && this.peekT <= 0) { mx = cx; mz = cz; spd = c.speed * 1.15; fire = false; }
          else { if (!this.hiding && this.peekT <= 0) { this.hiding = true; this.hideT = rand(1.3, 3.0); }
            if (this.hiding) { want = 1; fire = false; this.hideT -= dt; if (this.hideT <= 0) { this.hiding = false; this.peekT = rand(1.0, 1.9); this.peekSide = Math.random() < 0.5 ? 1 : -1; this.burst = 0; } }
            else if (this.peekT > 0) { this.peekT -= dt; mx = -uz * this.peekSide * 1.2; mz = ux * this.peekSide * 1.2; spd = 1.6; if (this.peekT <= 0) { this.hiding = false; this.hideT = rand(1.2, 2.4); this.hiding = true; } } } }
        else { this.role = 'strafe'; }
      }
      if (this.role === 'flank') { const side = this.strafe, tx = P.x - uz * side * 10, tz = P.z + ux * side * 10, fx = tx - this.x, fz = tz - this.z; if (Math.hypot(fx, fz) > 3 && this.roleT > 2) { mx = fx; mz = fz; spd = c.speed * 1.05; } else this.role = 'strafe'; }
      if (this.role === 'push') { if (dist > 6.5) { mx = ux; mz = uz; spd = c.speed * 0.95; } else { mx = -uz * this.strafe * 0.6; mz = ux * this.strafe * 0.6; } }
      if (this.role === 'strafe') { this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = -this.strafe; this.strafeT = rand(1, 2.6); } const pref = c.pref; if (dist > pref + 3) { mx += ux; mz += uz; } else if (dist < pref - 4) { mx -= ux; mz -= uz; } mx += -uz * this.strafe * 0.7; mz += ux * this.strafe * 0.7; }
      if (!sees && this.lastKnown && this.role !== 'cover') { const wx = this.lastKnown[0] - this.x, wz = this.lastKnown[1] - this.z; if (Math.hypot(wx, wz) > 1.4) { mx = wx; mz = wz; spd = c.speed; } else this.lastKnown = null; }
      const l = Math.hypot(mx, mz); if (l > 0.05) { this.move(mx, mz, spd, dt); moving = true; sp = spd; }
      this.shootT -= dt;
      if (fire && this.shootT <= 0) { if (this.burst <= 0) this.burst = Math.round(rand(c.burst[0], c.burst[1])); this.shoot(); this.burst--; this.shootT = this.burst <= 0 ? rand(c.pause[0], c.pause[1]) : c.rate; if (this.mag <= 0) this.burst = 0; }
      if (this.lostT > 10 && !this.lastKnown) { this.state = 'suspicious'; this.inv = [P.x, P.z]; this.invT = 7; this.aware = 0.5; }
    } else if (this.state === 'flee') {
      this.setIcon('😨'); this.fleeT -= dt; const ux = dx / (dist || 1), uz = dz / (dist || 1); this.faceTo(this.x - ux * 5, this.z - uz * 5, dt, 6);
      if (this.fleeT > 0 && dist < 30) { this.move(-ux - uz * 0.35 * this.strafe, -uz + ux * 0.35 * this.strafe, this.c.speed * 1.3, dt); moving = true; sp = this.c.speed * 1.3; }
      else { want = 1; if (this.fleeT < -4) { this.morale += 30; this.state = 'combat'; this.react = 0.8; this.role = 'cover'; this.cover = null; } }
    }
    // stance and animation (positive x rotation swings a hanging limb forward)
    this.crouch += (want - this.crouch) * Math.min(1, dt * 9);
    if (this.state !== 'patrol' || !this.act) { m.body.rotation.z = 0; }
    const cyc = t * (4 + sp * 2), sw = moving ? Math.sin(cyc) * Math.min(0.75, sp * 0.3 + 0.2) : 0; m.legL.rotation.x = sw - this.crouch * 0.9; m.legR.rotation.x = -sw - this.crouch * 0.9;
    m.legL.shin.rotation.x = -Math.max(0, -sw) * 1.2 - 0.05 + this.crouch * 1.8; m.legR.shin.rotation.x = -Math.max(0, sw) * 1.2 - 0.05 + this.crouch * 1.8;
    const aim = (this.state === 'combat' && !this.hiding) || this.state === 'alert', br = Math.sin(t * 1.7) * 0.012;
    m.armR.rotation.set(aim ? 1.05 : -sw * 0.6, 0, aim ? 0.05 : 0); m.armR.fore.rotation.x = aim ? 0.85 : 0.25; m.armL.rotation.set(aim ? 1.32 : sw * 0.6, 0, aim ? -0.25 : 0); m.armL.fore.rotation.x = aim ? 0.35 : 0.25;
    if (this.state === 'flee' || (this.state === 'combat' && this.hiding)) { m.armR.rotation.set(1.9, 0, 0.3); m.armL.rotation.set(1.9, 0, -0.3); m.armR.fore.rotation.x = 1.4; m.armL.fore.rotation.x = 1.4; }
    if (this.state === 'patrol' && this.act && this.waitT > 0) this.actPose(m, t);
    m.gun.rotation.set(aim ? 0 : 0.7, 0, 0); m.gun.position.set(0.1, aim ? 1.27 - this.crouch * 0.3 : 1.05, aim ? -0.27 : -0.1); m.gun.visible = !(this.state === 'patrol' && this.act === 'phone' && this.waitT > 0) || true; m.body.position.y = br - this.crouch * 0.32;
    m.g.rotation.y = this.yaw; m.g.position.x = this.x; m.g.position.z = this.z; m.g.position.y = Math.abs(Math.sin(cyc)) * (moving ? 0.03 : 0) - this.crouch * 0.05;
    this.ico.visible = dist < 30; this.ico.position.y = 2.15 - this.crouch * 0.3 + Math.sin(t * 3) * 0.03;
    this.flashT = Math.max(0, this.flashT - dt); m.flash.material.opacity = this.flashT > 0 ? 1 : 0;
    this.hitFlash = Math.max(0, this.hitFlash - dt); const hf = this.hitFlash > 0; m.mats[0].emissive.setHex(hf ? 0x881111 : 0);
  }
  actPose(m, t) {                       // each star has a habit while waiting
    const a = this.act;
    if (a === 'phone' || a === 'selfie') { m.armR.rotation.set(1.7, 0, 0.2); m.armR.fore.rotation.x = 1.8; if (a === 'selfie') m.armR.rotation.x = 1.5 + Math.sin(t * 1.4) * 0.15; }
    else if (a === 'smoke') { m.armR.rotation.set(1.6, 0, 0.1); m.armR.fore.rotation.x = 1.9 + Math.sin(t * 0.7) * 0.2; }
    else if (a === 'stretch') { m.armR.rotation.set(-2.6 + Math.sin(t * 2) * 0.3, 0, 0.4); m.armL.rotation.set(-2.6 - Math.sin(t * 2) * 0.3, 0, -0.4); }
    else if (a === 'sing') { m.armR.rotation.set(1.2 + Math.sin(t * 3) * 0.4, 0, 0.5); m.armL.rotation.set(0.6, 0, -0.9 + Math.sin(t * 3) * 0.3); m.body.rotation.z = Math.sin(t * 3) * 0.04; }
    else if (a === 'notes') { m.armL.rotation.set(1.3, 0, -0.1); m.armL.fore.rotation.x = 1.1; m.armR.rotation.set(0.4 + Math.sin(t * 2) * 0.2, 0, 0.1); }
  }
  tryBanter() {
    for (const o of enemies) { if (o === this || o.dead || o.state !== 'patrol' || o.bantCool > 0 || Math.hypot(o.x - this.x, o.z - this.z) > 7) continue;
      const bt = BANTER.find(b => (b.a === this.voice && b.b === o.voice) || (b.b === this.voice && b.a === o.voice)); if (!bt) continue;
      const first = bt.lines[0].who === this.voice ? this : o, second = first === this ? o : this; banterCool = rand(20, 32); this.bantCool = o.bantCool = 45; first.waitT = Math.max(first.waitT, 6); second.waitT = Math.max(second.waitT, 6);
      const say1 = (e, l, delay) => setTimeout(() => { if (e.dead || e.state !== 'patrol') return; const d = Math.hypot(e.x - P.x, e.z - P.z); speak(l.who, l.text, clamp(1 - d / 36, 0.2, 0.75), { rate: e.vrate, pan: clamp(Math.sin(Math.atan2(e.x - P.x, e.z - P.z) - P.yaw + Math.PI) * 0.8, -0.9, 0.9) }); if (d < 20) addFeed(e.name + ': ' + l.text, false); }, delay);
      say1(first, bt.lines[0], 200); say1(second, bt.lines[1], 3200); return; }
  }
}
const surrendered = [];
function registerSurrender(e) {          // a broken star gives up: the player can disarm him or let him go
  e.setIcon('🙌'); addFeed(e.name + ' استسلم!', true);
  const it = { x: e.x, z: e.z, r: 2.4, label: 'كلّم ' + e.name, kind: 'surr', done: false, mesh: new THREE.Group(), e }; worldG.add(it.mesh); inter.push(it);
}
let kills = 0, killHook = null; const storyHook = {};
function aliveCount(pred) { let n = 0; for (const e of enemies) if (!e.dead && e.state !== 'surrender' && (!pred || pred(e))) n++; return n; }
