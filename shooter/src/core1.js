'use strict';
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, rand = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
const V3 = THREE.Vector3;
/*VOICE_BEGIN*/const VOICE = {};/*VOICE_END*/
const hashText = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 33) ^ t.charCodeAt(i)) >>> 0; return h.toString(16); };
const voiceKey = (who, text) => hashText(who + '|' + text);
/*SFX_BEGIN*/const SFX = {};/*SFX_END*/
/*AISFX_BEGIN*/const AISFX = {};/*AISFX_END*/
/*AITEX_BEGIN*/const AITEX = {};/*AITEX_END*/

/* ================= renderer / scene ================= */
const canvas = $('#c');
let renderer = null;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
const scene = new THREE.Scene();
scene.background = new THREE.Color('#04060c');
scene.fog = new THREE.FogExp2('#080d18', 0.024);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 220);
const yawObj = new THREE.Object3D(), pitchObj = new THREE.Object3D();
scene.add(yawObj); yawObj.add(pitchObj); pitchObj.add(camera);
const hemi = new THREE.HemisphereLight('#5468a0', '#1d1610', 0.62); scene.add(hemi);
const moon = new THREE.DirectionalLight('#7f9bd6', 0.32); moon.position.set(-30, 60, 20); scene.add(moon);
function resize() {
  if (!renderer) return;
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w / h < 1 ? 82 : 72; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

/* ================= procedural textures ================= */
function ctex(w, h, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t;
}
let sd = 12345; const srnd = () => { sd = (Math.imul(sd, 1664525) + 1013904223) >>> 0; return sd / 4294967296; };
const noiseFill = (g, w, h, base, n, spread) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { const v = Math.floor(srnd() * spread); g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.05 + srnd() * 0.14).toFixed(2) + ')'; g.fillRect(srnd() * w, srnd() * h, 1 + srnd() * 3, 1 + srnd() * 3); }
};
const TEX = {
  asphalt: ctex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#2b2a29', 2600, 120); g.strokeStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 9; i++) { g.beginPath(); let x = srnd() * w, y = srnd() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += srnd() * 40 - 20; y += srnd() * 40 - 20; g.lineTo(x, y); } g.stroke(); } }, 34, 34),
  concrete: ctex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#6d6b66', 2200, 210); g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 14; i++) g.fillRect(srnd() * w, 0, 1 + srnd() * 3, h * (0.3 + srnd() * 0.7)); }, 4, 2),
  crate: ctex(128, 128, (g, w, h) => { g.fillStyle = '#7a5a34'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, w, 2); for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(60,35,10,' + (0.1 + srnd() * 0.25).toFixed(2) + ')'; g.fillRect(srnd() * w, y + srnd() * 30, 10 + srnd() * 40, 1); } } g.strokeStyle = '#3d2a14'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(3, 3); g.lineTo(w - 3, h - 3); g.stroke(); }, 1, 1),
};
function metalTex(color, rx, ry, rust) {
  return ctex(128, 128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x, 0, 2, h); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x + 3, 0, 1, h); }
    for (let i = 0; i < rust; i++) { g.fillStyle = 'rgba(120,55,20,' + (0.06 + srnd() * 0.2).toFixed(2) + ')'; g.fillRect(srnd() * w, srnd() * h, 2 + srnd() * 14, 2 + srnd() * 30); }
  }, rx, ry);
}
const phong = (o) => new THREE.MeshPhongMaterial(Object.assign({ shininess: 10, specular: 0x222226 }, o));
const MAT = {
  ground: phong({ map: TEX.asphalt, color: 0xb0b0b0, shininess: 45, specular: 0x556070 }),
  concrete: phong({ map: TEX.concrete }),
  crate: phong({ map: TEX.crate }),
  metalGreen: phong({ map: metalTex('#3e5a48', 2, 1, 260) }), metalBlue: phong({ map: metalTex('#33506e', 2, 1, 260) }),
  metalRed: phong({ map: metalTex('#7a3328', 2, 1, 300) }), metalGrey: phong({ map: metalTex('#7f8790', 6, 2, 160) }),
  wall: phong({ map: metalTex('#8b8f94', 14, 3, 220) }), dark: phong({ color: 0x1b1d22 }), pole: phong({ color: 0x2a2c30 }),
  barrel: phong({ color: 0xb02a1e, shininess: 30, specular: 0x553322 }), barrelBand: phong({ color: 0x2b0d09 }),
  skin: phong({ color: 0xc6906a }), hi: new THREE.MeshBasicMaterial({ color: 0xffd98a })
};
const AIL = new THREE.TextureLoader();
function aiTex(name, rx, ry) { if (!AITEX[name]) return null; const t = AIL.load(AITEX[name]); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; return t; }
{
  const set = (m, t, col) => { if (!t) return; m.map = t; if (col != null) m.color.setHex(col); m.needsUpdate = true; };
  set(MAT.ground, aiTex('ground_wet', 30, 30), 0xdddddd); set(MAT.concrete, aiTex('concrete_wall', 5, 2), 0xffffff); set(MAT.crate, aiTex('wood_crate', 1, 1), 0xffffff); set(MAT.wall, aiTex('warehouse_wall', 9, 3), 0xdddddd);
  const mp = aiTex('metal_panel', 2, 1); if (mp) { set(MAT.metalGreen, mp, 0x5f8a6b); set(MAT.metalBlue, mp, 0x4a76a3); set(MAT.metalRed, mp, 0xb05646); set(MAT.metalGrey, mp, 0xc2c8cf); }
  if (AITEX.night_sky) { const t = AIL.load(AITEX.night_sky); const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false, color: 0x8c99b0, depthWrite: false })); sky.renderOrder = -10; scene.add(sky); }
}

/* ================= audio (procedural) + voices ================= */
const AU = { wetNow: 0.32, dogT: 20, ac: null, master: null, rev: null, revG: null, noise: null, voice: true, sound: true, combat: 0, nextPulse: 0, footT: 0, warned: false };
function initAudio() {
  if (AU.ac) { try { AU.ac.resume(); } catch (e) {} return; }
  try {
    const ac = AU.ac = new (window.AudioContext || window.webkitAudioContext)();
    AU.master = ac.createGain(); AU.master.gain.value = 0.9; AU.master.connect(ac.destination);
    const n = ac.sampleRate * 2; AU.noise = ac.createBuffer(1, n, ac.sampleRate); const d = AU.noise.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const len = Math.floor(ac.sampleRate * 1.5), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    AU.rev = ac.createConvolver(); AU.rev.buffer = ir; AU.revG = ac.createGain(); AU.revG.gain.value = 0.34; AU.rev.connect(AU.revG); AU.revG.connect(AU.master);
    // rain bed
    const rain = ac.createBufferSource(); rain.buffer = AU.noise; rain.loop = true; const rf = ac.createBiquadFilter(); rf.type = 'lowpass'; rf.frequency.value = 2600;
    const rg = ac.createGain(); rg.gain.value = 0.035; AU.rainG = rg; rain.connect(rf); rf.connect(rg); rg.connect(AU.master); rain.start();
    // tension drone
    AU.droneG = ac.createGain(); AU.droneG.gain.value = 0.03; const df = ac.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 180; df.connect(AU.droneG); AU.droneG.connect(AU.master);
    for (const f of [55, 55.7, 82.4]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(df); o.start(); }
    AU.nextPulse = ac.currentTime + 0.5; AU.wetNow = 0.32; loadSounds();
  } catch (e) { AU.ac = null; }
}
function chain(node, vol, pan, wet, lp) {
  const ac = AU.ac; let n = node;
  if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; n.connect(f); n = f; }
  const g = ac.createGain(); g.gain.value = vol; n.connect(g); n = g;
  if (pan) { const p = ac.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); n.connect(p); n = p; }
  n.connect(AU.master); if (wet) { const w = ac.createGain(); w.gain.value = wet; n.connect(w); w.connect(AU.rev); }
}
function burst(t, dur, vol, type, freq, q, out) {
  const ac = AU.ac, s = ac.createBufferSource(); s.buffer = AU.noise; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(f); f.connect(g); out(g); s.start(t, Math.random()); s.stop(t + dur + 0.03);
}
function thump(t, f0, f1, dur, vol, out) {
  const ac = AU.ac, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); out(g); o.start(t); o.stop(t + dur + 0.03);
}
const SHOTS = { pistol: [0.08, 2400, 150, 55, 0.14, 0.9], rifle: [0.11, 1500, 120, 42, 0.17, 1.0], shotgun: [0.2, 900, 95, 28, 0.32, 1.25], enemy: [0.1, 1300, 110, 45, 0.16, 0.55] };

/* ---- real recordings (CC0 firearm library + everyday sounds), decoded once ---- */
const BUF = {}, VBUF = {};
async function b64buf(b64) { const bin = Uint8Array.from(atob(b64.replace(/^data:audio\/mpeg;base64,/, '')), c => c.charCodeAt(0)); return await AU.ac.decodeAudioData(bin.buffer.slice(0)); }
async function loadSounds() {
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
}
function playBuf(name, o = {}) {
  const b = BUF[name]; if (!b || !AU.ac || !AU.sound) return false;
  const ac = AU.ac, s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = o.rate || 1; let n = s;
  if (o.hp) { const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; n.connect(f); n = f; }
  chain(n, o.vol == null ? 1 : o.vol, o.pan || 0, o.wet == null ? AU.wetNow : o.wet, o.lp || 0); s.start(ac.currentTime + (o.delay || 0)); return true;
}
const pickOf = a => a[Math.floor(Math.random() * a.length)];
function sfxShot(kind, vol = 1, pan = 0, lp = 0) {
  if (!AU.ac || !AU.sound) return;
  const set = { pistol: ['pistol1', 'pistol2'], rifle: ['ak1', 'ak2', 'ak3'], shotgun: ['sg1', 'sg2'], enemy: ['ak1', 'ak2', 'ak3'] }[kind];
  if (BUF[set[0]]) { const gain = { pistol: 0.85, rifle: 0.8, shotgun: 1.0, enemy: 0.7 }[kind];
    playBuf(pickOf(set), { vol: vol * gain, pan, lp, rate: (kind === 'enemy' ? 0.94 : 1) * (0.97 + Math.random() * 0.06), wet: AU.wetNow });
    if (kind === 'shotgun' || kind === 'rifle') { const t = AU.ac.currentTime; thump(t, 90, 38, 0.18, 0.35 * vol, g => chain(g, 1, 0, 0.1, 0)); } return; }
  const t = AU.ac.currentTime, p = SHOTS[kind], out = g => chain(g, vol * p[5], pan, 0.9, lp);
  burst(t, p[0], 0.9, 'bandpass', p[1], 0.8, out); burst(t, p[0] * 2.2, 0.35, 'lowpass', 700, 0.5, out); thump(t, p[2], p[3], p[4], 1.0, out);
}
function sfxStepSynth(sprint) {
  if (!AU.ac || !AU.sound) return;
  if (BUF.step1) { playBuf(Math.random() < 0.5 ? 'step1' : 'step2', { vol: sprint ? 0.7 : 0.42, pan: rand(-0.08, 0.08), rate: (sprint ? 1.12 : 0.95) * (0.95 + Math.random() * 0.1), wet: AU.wetNow * 0.6 }); return; }
  burst(AU.ac.currentTime, 0.07, sprint ? 0.16 : 0.09, 'lowpass', 500, 0.6, g => chain(g, 1, rand(-0.1, 0.1), 0.15, 0));
}
function sfxBoom(vol = 1, pan = 0) {
  if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime, out = g => chain(g, vol, pan, 0.8, 0);
  if (BUF.big) { playBuf('big', { vol: vol * 1.0, pan, rate: 0.42, lp: 1400, wet: 0.85 }); playBuf('sg1', { vol: vol * 0.7, pan, rate: 0.62, lp: 2600, wet: 0.7, delay: 0.02 }); playBuf('big', { vol: vol * 0.5, pan, rate: 0.85, wet: 0.6, delay: 0.05 }); }
  burst(t, 1.4, 0.8, 'lowpass', 420, 0.5, out); thump(t, 62, 16, 1.5, 1.1, out);
  for (let i = 0; i < 6; i++) burst(t + 0.5 + Math.random() * 1.2, 0.05, 0.14, 'bandpass', 1500 + Math.random() * 2500, 2, g => chain(g, 1, (Math.random() - 0.5) * 1.2, 0.5, 0));  // debris falling
}
function sfxMetalSynth() { if (!AU.ac || !AU.sound) return; if (BUF.slam) { playBuf('slam', { vol: 1, rate: 0.62, wet: 0.7, lp: 5000 }); playBuf('slam', { vol: 0.6, rate: 0.9, wet: 0.5, delay: 0.09 }); return; } const t = AU.ac.currentTime, o = g => chain(g, 0.9, 0, 0.6, 0); burst(t, 0.5, 0.7, 'bandpass', 700, 2, o); thump(t, 220, 60, 0.4, 0.8, o); }
function sfxWhiz(pan) {
  if (!AU.ac || !AU.sound) return; const ac = AU.ac, t = ac.currentTime, s = ac.createBufferSource(); s.buffer = AU.noise; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.16);
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18); s.connect(f); f.connect(g); chain(g, 1, pan, 0.2, 0); s.start(t, Math.random()); s.stop(t + 0.2);
}
function sfxBreath() { if (BUF.exhale && AU.sound) { playBuf(Math.random() < 0.5 ? 'exhale' : 'inhale', { vol: 0.55, wet: 0.1, rate: 0.9 + Math.random() * 0.1 }); } }
function sfxDog() { if (BUF.dog) playBuf('dog', { vol: 0.32, pan: rand(-0.8, 0.8), lp: 2600, wet: 0.8, rate: 0.85 + Math.random() * 0.3 }); }
const VOICE_FX = { 'الحاج صلاح': 'loud', 'الأسطى فتحي': 'phone' };
function speak(who, text, vol = 1, o = {}) {
  if (!AU.voice || !text) return; const key = voiceKey(who, text), buf = VBUF[key];
  if (buf && AU.ac) {
    const ac = AU.ac, s = ac.createBufferSource(); s.buffer = buf; s.playbackRate.value = o.rate || 1; let n = s; const fx = VOICE_FX[who];
    if (voiceEl && vol >= 1) { try { voiceEl.stop(); } catch (e) {} } if (vol >= 1) voiceEl = s;
    if (fx) { const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = fx === 'phone' ? 320 : 380; const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = fx === 'phone' ? 3000 : 3400;
      n.connect(hp); hp.connect(lpf); n = lpf; if (fx === 'loud') { const ws = ac.createWaveShaper(), c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 3.2); } ws.curve = c; n.connect(ws); n = ws; } }
    chain(n, vol * (fx === 'loud' ? 0.55 : 1), o.pan || 0, fx === 'loud' ? 0.7 : (o.wet == null ? 0.12 : o.wet), o.lp || 0); s.start(); return;
  }
  const clip = VOICE[key]; if (clip && typeof Audio !== 'undefined') { try { const a = new Audio(clip); a.volume = clamp(vol, 0, 1); const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} return; }
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined' || vol < 1) return;
  try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-EG'; u.volume = vol; window.speechSynthesis.speak(u); } catch (e) {}
}

function sfxTick(f, vol, dur = 0.05) { if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime, o = AU.ac.createOscillator(), g = AU.ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.02); }
function sfxClick(vol = 0.4, hp = 2500) { if (!AU.ac || !AU.sound) return; burst(AU.ac.currentTime, 0.035, vol, 'highpass', hp, 0.7, g => chain(g, 1, 0, 0.1, 0)); }

function sfxImpactSynth(pan, vol, metal) { if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime; burst(t, 0.06, 0.25 * vol, 'bandpass', metal ? 3200 : 900, 1, g => chain(g, 1, pan, 0.3, 0)); if (metal) sfxTick(rand(1500, 2600), 0.05 * vol, 0.09); }

function sfxHeartSynth() { if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime, o = g => chain(g, 0.7, 0, 0, 0); thump(t, 62, 40, 0.13, 0.5, o); thump(t + 0.2, 56, 38, 0.13, 0.4, o); }

function musicTick(dt) {
  if (!AU.ac) return; const t = AU.ac.currentTime; AU.droneG.gain.setTargetAtTime(0.03 + AU.combat * 0.05, t, 0.4);
  while (AU.nextPulse < t + 0.2) { if (AU.combat > 0.15) { const o = g => chain(g, 0.35 * AU.combat, 0, 0.1, 0); thump(AU.nextPulse, 90, 40, 0.16, 1, o); } AU.nextPulse += 60 / (96 + AU.combat * 30) / 2; }
  AU.thunderT = (AU.thunderT == null ? 22 : AU.thunderT) - (dt || 0.016); if (AU.thunderT <= 0) { AU.thunderT = rand(26, 50); sfxThunder(); }
}
let voiceEl = null;


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
