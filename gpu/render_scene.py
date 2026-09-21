"""Photoreal path-traced renders (Blender Cycles) of the real OpenStreetMap districts, using the AI facade textures.
Run with a Python that has the `bpy` module. Example:
  python render_scene.py --data data/districts.json --tex assets/textures --district 0 --out out --res 960x540 --samples 64 --stills 3 --video-frames 0
"""
import argparse, json, math, os, random, sys
import bpy
import bmesh
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("--data", required=True); ap.add_argument("--tex", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--district", type=int, default=0); ap.add_argument("--res", default="960x540"); ap.add_argument("--samples", type=int, default=64)
ap.add_argument("--stills", type=int, default=3); ap.add_argument("--video-frames", type=int, default=0); ap.add_argument("--device", default="GPU")
ap.add_argument("--topdown", default=""); ap.add_argument("--speed", type=float, default=9.0); ap.add_argument("--sun", type=float, default=4.0)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
W, H = (int(v) for v in a.res.split("x")); os.makedirs(a.out, exist_ok=True)
D = json.load(open(a.data, encoding="utf-8"))[a.district]
NAME = ["imbaba", "downtown", "haram"][a.district]
FACADE = {0: ["facade_imbaba_brick", "facade_imbaba_paint"], 1: ["facade_downtown"], 2: ["facade_haram"]}[a.district]
M = lambda x, y: (x * 0.1, -y * 0.1)          # game decimetres (y south) -> Blender metres (Y north)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = 100
cy = sc.cycles; cy.samples = a.samples; cy.use_denoising = True
try: cy.denoiser = "OPENIMAGEDENOISE"
except Exception: pass
cy.use_adaptive_sampling = True; cy.max_bounces = 5; cy.diffuse_bounces = 3; cy.glossy_bounces = 3; cy.caustics_reflective = False; cy.caustics_refractive = False
try: sc.view_settings.view_transform = "AgX"
except Exception: pass
sc.view_settings.exposure = -0.4
sc.render.use_persistent_data = True

def setup_device():
    if a.device.upper() != "GPU": return "CPU"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for t in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
        try:
            prefs.compute_device_type = t
            try: prefs.refresh_devices()
            except Exception: prefs.get_devices()
            gpus = [d for d in prefs.devices if d.type != "CPU"]
            if gpus:
                for d in prefs.devices: d.use = d.type != "CPU"
                cy.device = "GPU"; return f"GPU:{t}:" + ",".join(d.name for d in gpus)
        except Exception:
            continue
    cy.device = "CPU"; return "CPU (no GPU found)"
print("DEVICE", setup_device(), flush=True)

# ---- sky: physically based dawn ----
w = bpy.data.worlds.new("World"); sc.world = w; w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
sky = nt.nodes.new("ShaderNodeTexSky"); bg = nt.nodes.new("ShaderNodeBackground"); out = nt.nodes.new("ShaderNodeOutputWorld")
for st in ("MULTIPLE_SCATTERING", "SINGLE_SCATTERING", "NISHITA"):
    try: sky.sky_type = st; break
    except Exception: continue
for k, v in (("sun_elevation", math.radians(a.sun)), ("sun_rotation", math.radians(70)), ("sun_size", math.radians(0.8)), ("sun_intensity", 1.0),
             ("air_density", 1.1), ("dust_density", 2.2), ("ozone_density", 1.0), ("altitude", 20.0)):
    try: setattr(sky, k, v)
    except Exception: pass
bg.inputs["Strength"].default_value = 1.0
nt.links.new(sky.outputs[0], bg.inputs["Color"]); nt.links.new(bg.outputs[0], out.inputs["Surface"])

# ---- materials ----
def principled(mat):
    mat.use_nodes = True; nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL": nt.nodes.remove(n)
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"); bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs["Surface"]); return nt, bsdf
def proc_mat(name, dark, light, scale, rough, bump=0.15):
    m = bpy.data.materials.new(name); nt, bsdf = principled(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = scale; ns.inputs["Detail"].default_value = 12
    ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = dark; ramp.color_ramp.elements[1].color = light
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump
    nt.links.new(tc.outputs["Object"], ns.inputs["Vector"]); nt.links.new(ns.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(ns.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], bsdf.inputs["Normal"]); bsdf.inputs["Roughness"].default_value = rough
    return m
def photo_mat(key, tint=1.0):
    m = bpy.data.materials.new(key); nt, bsdf = principled(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / 14, 1 / 14, 1 / 14)
    im = nt.nodes.new("ShaderNodeTexImage"); path = os.path.join(a.tex, key + ".jpg")
    im.image = bpy.data.images.load(path); im.projection = "BOX"; im.projection_blend = 0.3; im.extension = "REPEAT"
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], im.inputs["Vector"]); nt.links.new(im.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.85; return m
asphalt = proc_mat("asphalt", (0.030, 0.030, 0.032, 1), (0.085, 0.083, 0.08, 1), 120, 0.82)
ground = proc_mat("ground", (0.20, 0.17, 0.13, 1), (0.36, 0.31, 0.24, 1), 25, 0.95, 0.3)
roof = proc_mat("roof", (0.16, 0.15, 0.14, 1), (0.30, 0.28, 0.26, 1), 40, 0.9)
paint = bpy.data.materials.new("paint"); _, pb = principled(paint); pb.inputs["Base Color"].default_value = (0.75, 0.68, 0.35, 1); pb.inputs["Roughness"].default_value = 0.6

def make_obj(name, verts, faces, mats):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    for m in mats: ob.data.materials.append(m)
    return ob

# ---- ground, roads, dashes ----
g = 1500.0
make_obj("ground", [(-g, -g, -0.05), (g, -g, -0.05), (g, g, -0.05), (-g, g, -0.05)], [(0, 1, 2, 3)], [ground])
rv, rf, dv, df = [], [], [], []
for r in D["roads"]:
    hw = r["w"] * 0.1 / 2; p = r["p"]
    for i in range(0, len(p) - 2, 2):
        ax, ay = M(p[i], p[i + 1]); bx, by = M(p[i + 2], p[i + 3]); dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy)
        if L < 0.05: continue
        ux, uy = dx / L, dy / L; nx, ny = -uy * hw, ux * hw; k = len(rv); zz = 0.02 + 0.0015 * (k // 4 % 12)     # tiny height steps: no coplanar overlaps
        rv += [(ax - nx, ay - ny, zz), (bx - nx, by - ny, zz), (bx + nx, by + ny, zz), (ax + nx, ay + ny, zz)]; rf.append((k, k + 1, k + 2, k + 3))
        for t in range(0, int(L) - 3, 6):
            if r["w"] < 90: break
            x0, y0, x1, y1 = ax + ux * (t + 1.5), ay + uy * (t + 1.5), ax + ux * (t + 4.5), ay + uy * (t + 4.5); q = 0.14; k = len(dv)
            dv += [(x0 + uy * q, y0 - ux * q, 0.05), (x1 + uy * q, y1 - ux * q, 0.05), (x1 - uy * q, y1 + ux * q, 0.05), (x0 - uy * q, y0 + ux * q, 0.05)]; df.append((k, k + 1, k + 2, k + 3))
make_obj("roads", rv, rf, [asphalt]); make_obj("dashes", dv, df, [paint])

# ---- buildings (one mesh per facade texture) ----
rng = random.Random(7); groups = {k: bmesh.new() for k in FACADE}
for i, b in enumerate(D["buildings"]):
    pts = [M(b["p"][j], b["p"][j + 1]) for j in range(0, len(b["p"]), 2)]
    bm = groups[FACADE[i % len(FACADE)]]
    try:
        vs = [bm.verts.new((x, y, 0)) for x, y in pts]; f = bm.faces.new(vs)
    except ValueError:
        continue
    res = bmesh.ops.extrude_face_region(bm, geom=[f]); top = [e for e in res["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, b["f"] * 3.5), verts=top)
for k, bm in groups.items():
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.material_index = 1 if abs(f.normal.z) > 0.5 else 0
    me = bpy.data.meshes.new(k); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(k, me); sc.collection.objects.link(ob); ob.data.materials.append(photo_mat(k)); ob.data.materials.append(roof)
print("SCENE", len(D["buildings"]), "buildings", len(D["roads"]), "roads", flush=True)

# ---- route + camera ----
path = [M(x, y) for x, y in D["path"]]; cum = [0.0]
for p0, p1 in zip(path, path[1:]): cum.append(cum[-1] + math.hypot(p1[0] - p0[0], p1[1] - p0[1]))
TOT = cum[-1]
def at(s):
    s = max(0.0, min(TOT, s)); k = 0
    while k < len(cum) - 2 and cum[k + 1] < s: k += 1
    t = (s - cum[k]) / max(1e-6, cum[k + 1] - cum[k]); return Vector((path[k][0] + (path[k + 1][0] - path[k][0]) * t, path[k][1] + (path[k + 1][1] - path[k][1]) * t, 0))
cam_data = bpy.data.cameras.new("cam"); cam_data.lens = 24; cam_data.sensor_width = 36; cam_data.clip_end = 2000
cam = bpy.data.objects.new("cam", cam_data); sc.collection.objects.link(cam); sc.camera = cam
def place(s, height=1.7, side=1.6, pitch=-0.02, back=0.0):
    p = at(s - back); f = (at(s + 8) - at(s - 8)); f.z = 0; f.normalize(); right = Vector((f.y, -f.x, 0))
    cam.location = p + right * side + Vector((0, 0, height)); d = Vector((f.x, f.y, pitch)); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
def render(path_out):
    sc.render.filepath = path_out; bpy.ops.render.render(write_still=True)

if a.topdown:
    tx, ty, th = (float(v) for v in a.topdown.split(","))
    cam.location = (tx, ty, th); cam.rotation_euler = (0, 0, 0); sc.render.image_settings.file_format = "JPEG"
    render(os.path.join(a.out, f"{NAME}_top.jpg")); print("TOPDOWN"); sys.exit(0)
stills = [(0.05, 1.7, 1.6), (0.25, 4.5, 0.0), (0.45, 1.7, 1.6), (0.65, 6.0, 0.0), (0.85, 1.7, 1.6), (0.97, 3.0, 0.0)][:a.stills]
sc.render.image_settings.file_format = "JPEG"; sc.render.image_settings.quality = 92
for n, (fr, hgt, side) in enumerate(stills):
    place(TOT * fr, hgt, side, pitch=-0.02 if hgt < 3 else -0.12); render(os.path.join(a.out, f"{NAME}_still{n + 1}.jpg")); print("STILL", n + 1, flush=True)
if a.video_frames:
    sc.render.image_settings.file_format = "PNG"; os.makedirs(os.path.join(a.out, "frames"), exist_ok=True)
    start = TOT * 0.12
    for n in range(a.video_frames):
        place(start + n * a.speed / 24.0, 1.7, 1.6); render(os.path.join(a.out, "frames", f"f{n:04d}.png"))
        if n % 10 == 0: print("FRAME", n, flush=True)
print("DONE", flush=True)
