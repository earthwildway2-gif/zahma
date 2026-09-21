'use strict';
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, rand = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
const V3 = THREE.Vector3;
/*VOICE_BEGIN*/const VOICE = {};/*VOICE_END*/
const hashText = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (Math.imul(h, 33) ^ t.charCodeAt(i)) >>> 0; return h.toString(16); };

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

/* ================= audio (procedural) + voices ================= */
const AU = { ac: null, master: null, rev: null, revG: null, noise: null, voice: true, sound: true, combat: 0, nextPulse: 0, footT: 0, warned: false };
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
    const rg = ac.createGain(); rg.gain.value = 0.035; rain.connect(rf); rf.connect(rg); rg.connect(AU.master); rain.start();
    // tension drone
    AU.droneG = ac.createGain(); AU.droneG.gain.value = 0.03; const df = ac.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 180; df.connect(AU.droneG); AU.droneG.connect(AU.master);
    for (const f of [55, 55.7, 82.4]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(df); o.start(); }
    AU.nextPulse = ac.currentTime + 0.5;
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
function sfxShot(kind, vol = 1, pan = 0, lp = 0) {
  if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime, p = SHOTS[kind];
  const out = g => chain(g, vol * p[5], pan, 0.9, lp);
  burst(t, p[0], 0.9, 'bandpass', p[1], 0.8, out); burst(t, p[0] * 2.2, 0.35, 'lowpass', 700, 0.5, out); thump(t, p[2], p[3], p[4], 1.0, out);
}
function sfxTick(f, vol, dur = 0.05) { if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime, o = AU.ac.createOscillator(), g = AU.ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.02); }
function sfxClick(vol = 0.4, hp = 2500) { if (!AU.ac || !AU.sound) return; burst(AU.ac.currentTime, 0.035, vol, 'highpass', hp, 0.7, g => chain(g, 1, 0, 0.1, 0)); }
function sfxStep(sprint) { if (!AU.ac || !AU.sound) return; burst(AU.ac.currentTime, 0.07, sprint ? 0.16 : 0.09, 'lowpass', 500, 0.6, g => chain(g, 1, rand(-0.1, 0.1), 0.15, 0)); }
function sfxImpact(pan, vol, metal) { if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime; burst(t, 0.06, 0.25 * vol, 'bandpass', metal ? 3200 : 900, 1, g => chain(g, 1, pan, 0.3, 0)); if (metal) sfxTick(rand(1500, 2600), 0.05 * vol, 0.09); }
function sfxBoom(vol = 1, pan = 0) {
  if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime, out = g => chain(g, vol, pan, 0.8, 0);
  burst(t, 1.3, 1.0, 'lowpass', 500, 0.5, out); burst(t, 0.25, 0.7, 'bandpass', 1400, 0.6, out); thump(t, 70, 18, 1.4, 1.2, out);
}
function sfxHeart() { if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime, o = g => chain(g, 0.7, 0, 0, 0); thump(t, 62, 40, 0.13, 0.5, o); thump(t + 0.2, 56, 38, 0.13, 0.4, o); }
function sfxMetal() { if (!AU.ac || !AU.sound) return; const t = AU.ac.currentTime, o = g => chain(g, 0.9, 0, 0.6, 0); burst(t, 0.5, 0.7, 'bandpass', 700, 2, o); thump(t, 220, 60, 0.4, 0.8, o); }
function musicTick() {
  if (!AU.ac) return; const t = AU.ac.currentTime; AU.droneG.gain.setTargetAtTime(0.03 + AU.combat * 0.05, t, 0.4);
  while (AU.nextPulse < t + 0.2) { if (AU.combat > 0.15) { const o = g => chain(g, 0.35 * AU.combat, 0, 0.1, 0); thump(AU.nextPulse, 90, 40, 0.16, 1, o); } AU.nextPulse += 60 / (96 + AU.combat * 30) / 2; }
}
let voiceEl = null;
function estDur(text) { return 0.9 + text.length * 0.07; }
function speak(who, text, vol = 1) {
  if (!AU.voice || !text) return;
  const clip = VOICE[hashText(text)];
  if (clip && typeof Audio !== 'undefined') { try { if (voiceEl && vol >= 1) voiceEl.pause(); const a = new Audio(clip); a.volume = clamp(vol, 0, 1); if (vol >= 1) voiceEl = a; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} return; }
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined' || vol < 1) return;
  try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-EG'; u.volume = vol; window.speechSynthesis.speak(u); } catch (e) {}
}
