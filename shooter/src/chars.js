
/* ================= characters: merged smooth-shaded bodies (male and female) ================= */
class GB {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.idx = []; }
  add(geo, m, hex) {
    const g = geo.clone(); g.applyMatrix4(m); const c = new THREE.Color(hex), base = this.pos.length / 3, p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { this.pos.push(p.getX(i), p.getY(i), p.getZ(i)); this.nor.push(n.getX(i), n.getY(i), n.getZ(i)); this.col.push(c.r, c.g, c.b); }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.idx.push(base + g.index.getX(i)); else for (let i = 0; i < p.count; i++) this.idx.push(base + i);
    g.dispose();
  }
  mesh(mat) { const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); bg.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3)); bg.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); bg.setIndex(this.idx); const m = new THREE.Mesh(bg, mat); m.castShadow = true; m.receiveShadow = true; return m; }
}
const _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _ce = new THREE.Euler(), _cs = new V3(), _cp = new V3();
const GSPH = new THREE.SphereGeometry(1, 20, 15), GBOX = new THREE.BoxGeometry(1, 1, 1);
function ell(gb, x, y, z, rx, ry, rz, hex, ex = 0, ey = 0, ez = 0) { _ce.set(ex, ey, ez); _cq.setFromEuler(_ce); _cm.compose(_cp.set(x, y, z), _cq, _cs.set(rx, ry, rz)); gb.add(GSPH, _cm, hex); }
function cyl(gb, x, y, z, rt, rb, h, hex, ex = 0, ey = 0, ez = 0) { const g = new THREE.CylinderGeometry(rt, rb, h, 16, 1); _ce.set(ex, ey, ez); _cq.setFromEuler(_ce); _cm.compose(_cp.set(x, y, z), _cq, _cs.set(1, 1, 1)); gb.add(g, _cm, hex); g.dispose(); }
function bxx(gb, x, y, z, w, h, d, hex, ex = 0, ey = 0, ez = 0) { _ce.set(ex, ey, ez); _cq.setFromEuler(_ce); _cm.compose(_cp.set(x, y, z), _cq, _cs.set(w, h, d)); gb.add(GBOX, _cm, hex); }
const SKINS = ['#c9976f', '#b98058', '#9b6a46', '#dcb08a', '#a87752'];
function buildHuman(o) {
  const F = !!o.female, sh = F ? 0.235 : 0.285, mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.05 }), g = new THREE.Group();
  const top = o.top, skin = o.skin, sleeve = o.bare ? skin : (o.sleeve || top);
  const T = new GB();
  ell(T, 0, 0.93, 0, F ? 0.19 : 0.175, 0.13, F ? 0.135 : 0.125, o.pants);                       // hips
  cyl(T, 0, 1.12, 0, F ? 0.125 : 0.165, F ? 0.15 : 0.16, 0.3, F && o.crop ? skin : top);      // waist (bare midriff only for the crop option)
  ell(T, 0, 1.37, 0, F ? 0.17 : 0.24, F ? 0.2 : 0.265, F ? 0.115 : 0.15, top);                // chest
  if (F) { ell(T, -0.055, 1.335, -0.078, 0.082, 0.072, 0.07, top); ell(T, 0.055, 1.335, -0.078, 0.082, 0.072, 0.07, top); }
  ell(T, -sh, 1.47, 0, F ? 0.058 : 0.075, F ? 0.058 : 0.075, F ? 0.058 : 0.075, sleeve); ell(T, sh, 1.47, 0, F ? 0.058 : 0.075, F ? 0.058 : 0.075, F ? 0.058 : 0.075, sleeve);      // shoulders
  cyl(T, 0, 1.575, 0, 0.042, 0.05, 0.1, skin);                                                  // neck
  ell(T, 0, 1.71, 0, 0.098, 0.126, 0.11, skin); ell(T, 0, 1.655, -0.012, 0.082, 0.062, 0.088, skin);   // head + jaw
  for (const s of [-1, 1]) { ell(T, s * 0.038, 1.72, -0.096, 0.016, 0.011, 0.01, '#15100c'); bxx(T, s * 0.038, 1.742, -0.1, 0.042, 0.007, 0.01, o.hair, 0, 0, s * -0.12); ell(T, s * 0.098, 1.7, 0, 0.012, 0.03, 0.022, skin); }
  ell(T, 0, 1.688, -0.108, 0.014, 0.022, 0.014, skin); ell(T, 0, 1.652, -0.098, 0.028, 0.0075, 0.008, F ? '#a3373f' : '#6a382e');
  ell(T, 0, 1.755, 0.012, 0.104, 0.09, 0.117, o.hair); ell(T, 0, 1.71, 0.05, 0.1, 0.115, 0.07, o.hair);   // hair
  if (F) { cyl(T, 0, 1.6, 0.115, 0.032, 0.018, 0.24, o.hair, 0.55, 0, 0); ell(T, 0, 1.49, 0.185, 0.026, 0.05, 0.026, o.hair); }   // ponytail
  if (o.beard) ell(T, 0, 1.64, -0.05, 0.072, 0.052, 0.062, o.hair);
  if (o.cap) { ell(T, 0, 1.79, 0, 0.108, 0.05, 0.12, o.cap); bxx(T, 0, 1.775, -0.11, 0.115, 0.012, 0.075, o.cap); }
  if (o.helmet) ell(T, 0, 1.775, 0, 0.116, 0.085, 0.128, o.helmet);
  if (o.glasses) bxx(T, 0, 1.72, -0.105, 0.115, 0.026, 0.02, '#0a0a0a');
  if (o.vest) { ell(T, 0, 1.34, 0, F ? 0.19 : 0.255, 0.23, 0.165, o.vest); bxx(T, 0, 1.3, -0.15, 0.17, 0.12, 0.03, '#171a17'); }
  if (o.scarf) cyl(T, 0, 1.52, 0, 0.075, 0.085, 0.06, o.scarf);
  cyl(T, 0, 1.0, 0, 0.17, 0.175, 0.05, '#121212');                                              // belt
  if (o.pack) bxx(T, 0, 1.3, 0.16, F ? 0.26 : 0.32, 0.36, 0.13, o.pack);
  if (o.strap) { bxx(T, 0.06, 1.38, -0.02, 0.03, 0.62, 0.32, o.strap, 0, 0, -0.32); }
  const body = T.mesh(mat); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const mkArm = (sign) => {
    const A = new THREE.Group(); A.position.set(sign * sh, 1.47, 0);
    const U = new GB(); cyl(U, 0, -0.14, 0, F ? 0.043 : 0.052, F ? 0.036 : 0.043, 0.29, sleeve); A.add(U.mesh(mat));
    const fore = new THREE.Group(); fore.position.set(0, -0.29, 0); const Fb = new GB(); cyl(Fb, 0, -0.13, 0, F ? 0.036 : 0.043, F ? 0.029 : 0.034, 0.27, o.bare || o.shortSleeve ? skin : sleeve); ell(Fb, 0, -0.29, 0, F ? 0.029 : 0.035, F ? 0.04 : 0.045, F ? 0.026 : 0.031, o.glove || skin); fore.add(Fb.mesh(mat)); A.add(fore); A.fore = fore; g.add(A); return A;
  };
  const mkLeg = (sign) => {
    const L = new THREE.Group(); L.position.set(sign * (F ? 0.095 : 0.105), 0.9, 0);
    const Tb = new GB(); cyl(Tb, 0, -0.215, 0, F ? 0.088 : 0.094, 0.064, 0.44, o.pants); if (o.holster && sign > 0) bxx(Tb, 0.085, -0.2, 0, 0.04, 0.22, 0.09, '#2a1d12'); L.add(Tb.mesh(mat));
    const shin = new THREE.Group(); shin.position.set(0, -0.44, 0); const Sb = new GB(); cyl(Sb, 0, -0.2, 0, 0.062, 0.046, 0.4, o.pants); ell(Sb, 0, -0.415, -0.035, 0.052, 0.042, 0.115, o.boots); cyl(Sb, 0, -0.34, 0, 0.056, 0.056, 0.15, o.boots); shin.add(Sb.mesh(mat)); L.add(shin); L.shin = shin; g.add(L); return L;
  };
  const armL = mkArm(-1), armR = mkArm(1), legL = mkLeg(-1), legR = mkLeg(1);
  const gun = new THREE.Group(), G2 = new GB(), long = o.weapon === 'shotgun';
  bxx(G2, 0, 0, 0, 0.055, 0.08, long ? 0.62 : 0.5, '#1c1f23'); bxx(G2, 0, -0.005, 0.33, 0.05, 0.09, 0.2, '#5e3d20'); bxx(G2, 0, -0.1, -0.05, 0.04, 0.13, 0.06, '#1c1f23', 0.25); bxx(G2, 0, 0.02, -0.34, 0.024, 0.024, 0.2, '#15171a');
  gun.add(G2.mesh(mat)); gun.position.set(0.1, 1.27, -0.27); g.add(gun);
  const flash = sprite(GLOW_ORANGE, 0.9, 0); flash.position.set(0.1, 1.29, -0.75); g.add(flash);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 14), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.4, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.02; g.add(shadow);
  g.scale.setScalar(o.scale || 1);
  return { g, body, head: body, armL, armR, legL, legR, gun, flash, mats: [mat] };
}
function outfit(type, female) {
  const skin = pickOf(SKINS), dark = ['#23272d', '#2b2f26', '#1f2733', '#2e2a26'], hairs = ['#15100c', '#221812', '#2b1d14', '#101010'];
  const base = { female, skin, hair: pickOf(hairs), pants: pickOf(['#20242a', '#2a2e22', '#1c1f27', '#2b2924']), boots: '#12100e', top: pickOf(dark), cap: null, weapon: 'rifle', scale: 1 };
  if (type === 'guard') { base.cap = !female && Math.random() < 0.5 ? pickOf(['#141414', '#33352c', '#1e2836']) : null; base.beard = !female && Math.random() < 0.45; base.strap = Math.random() < 0.6 ? '#1d1d1d' : null; base.holster = Math.random() < 0.4; base.glove = '#151515'; }
  if (type === 'heavy') { Object.assign(base, { top: '#394239', vest: '#2a3329', helmet: '#2b332b', pants: '#1f231f', beard: true, weapon: 'shotgun', scale: 1.1, glove: '#111', pack: '#2a3025' }); }
  if (type === 'boss') { Object.assign(base, { female: false, top: '#17110d', sleeve: '#17110d', pants: '#111', scarf: '#a51d1d', glasses: true, beard: true, hair: '#0d0d0d', scale: 1.13, glove: '#0d0d0d', skin: '#b98058', holster: true }); }
  return base;
}
const LAYLA = { female: true, skin: '#c99a74', hair: '#2a1710', top: '#1f8f8a', pants: '#5c4c34', boots: '#2b2117', bare: true, glove: '#141414', pack: '#3a4a2a', holster: true, scale: 1.0 };
