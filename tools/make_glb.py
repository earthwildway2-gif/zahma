#!/usr/bin/env python3
"""Generate the low-poly vehicle models (GLB, vertex-coloured boxes) used by cairo.html. Prints JSON of base64 strings."""
import base64, json, struct, sys

def lin(c):  # sRGB hex -> linear 0..255
    r, g, b = (int(c[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda v: (v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4)
    return [round(f(v) * 255) for v in (r, g, b)] + [255]

def glb(boxes):
    """boxes are given in 'three.js car space' (forward +X, up +Y, right +Z, metres); converted to glTF (forward +Z, up +Y)."""
    pos, nor, col, idx = [], [], [], []
    faces = [((1, 0, 0), [(1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)]), ((-1, 0, 0), [(-1, -1, 1), (-1, 1, 1), (-1, 1, -1), (-1, -1, -1)]),
             ((0, 1, 0), [(-1, 1, -1), (-1, 1, 1), (1, 1, 1), (1, 1, -1)]), ((0, -1, 0), [(-1, -1, 1), (-1, -1, -1), (1, -1, -1), (1, -1, 1)]),
             ((0, 0, 1), [(-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)]), ((0, 0, -1), [(1, -1, -1), (-1, -1, -1), (-1, 1, -1), (1, 1, -1)])]
    for cx, cy, cz, sx, sy, sz, color in boxes:
        c = lin(color)
        for n, verts in faces:
            base = len(pos)
            for vx, vy, vz in verts:
                x, y, z = cx + vx * sx / 2, cy + vy * sy / 2, cz + vz * sz / 2
                pos.append((-z, y, x))                       # (x,y,z)_car -> (-z, y, x)_gltf
                nor.append((-n[2], n[1], n[0])); col.append(c)
            idx += [base, base + 1, base + 2, base, base + 2, base + 3]
    pb = b"".join(struct.pack("<3f", *p) for p in pos); nb = b"".join(struct.pack("<3f", *n) for n in nor)
    cb = bytes(v for c in col for v in c); ib = struct.pack(f"<{len(idx)}H", *idx)
    ib += b"\0" * (-len(ib) % 4)
    views, off = [], 0
    for blob, target in ((pb, 34962), (nb, 34962), (cb, 34962), (ib, 34963)):
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(blob), "target": target}); off += len(blob)
    mn = [min(p[i] for p in pos) for i in range(3)]; mx = [max(p[i] for p in pos) for i in range(3)]
    js = {"asset": {"version": "2.0", "generator": "zahma"}, "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
          "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1, "COLOR_0": 2}, "indices": 3, "material": 0}]}],
          "materials": [{"pbrMetallicRoughness": {"baseColorFactor": [1, 1, 1, 1], "metallicFactor": 0.05, "roughnessFactor": 0.75}, "doubleSided": True}],
          "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(pos), "type": "VEC3", "min": mn, "max": mx},
                        {"bufferView": 1, "componentType": 5126, "count": len(pos), "type": "VEC3"},
                        {"bufferView": 2, "componentType": 5121, "normalized": True, "count": len(pos), "type": "VEC4"},
                        {"bufferView": 3, "componentType": 5123, "count": len(idx), "type": "SCALAR"}],
          "bufferViews": views, "buffers": [{"byteLength": off}]}
    j = json.dumps(js, separators=(",", ":")).encode(); j += b" " * (-len(j) % 4)
    binc = pb + nb + cb + ib
    total = 12 + 8 + len(j) + 8 + len(binc)
    return struct.pack("<4sII", b"glTF", 2, total) + struct.pack("<I4s", len(j), b"JSON") + j + struct.pack("<I4s", len(binc), b"BIN\0") + binc

def car(L, W, body, roof, tall=1.0):
    return [(0, 0.95, 0, L, 1.0, W, body), (-L * 0.06, 1.95 * tall, 0, L * 0.5, 0.95 * tall, W * 0.92, roof), (L * 0.2, 1.95 * tall, 0, L * 0.03, 0.5 * tall, W * 0.8, "#9fc9ee"),
            *[(L * sx, 0.45, sz * W / 2, 0.9, 0.9, 0.35, "#161616") for sx in (-0.32, 0.32) for sz in (-1, 1)],
            (L / 2, 1.0, W * 0.3, 0.1, 0.35, 0.5, "#fff2b8"), (L / 2, 1.0, -W * 0.3, 0.1, 0.35, 0.5, "#fff2b8"),
            (-L / 2, 1.0, W * 0.3, 0.1, 0.3, 0.5, "#d02020"), (-L / 2, 1.0, -W * 0.3, 0.1, 0.3, 0.5, "#d02020")]

tuk = [(-0.3, 0.75, 0, 3.2, 0.55, 1.5, "#1f5fa8"), (1.55, 0.85, 0, 1.0, 0.7, 1.1, "#f0b429"), (1.95, 0.6, 0, 0.7, 0.3, 1.2, "#f0b429"),
       *[(sx, 1.7, sz, 0.12, 1.3, 0.12, "#25272b") for sx in (0.55, -1.5) for sz in (-0.68, 0.68)],
       (-0.45, 2.4, 0, 2.6, 0.14, 1.7, "#f0b429"), (-0.45, 2.52, 0, 2.2, 0.1, 1.5, "#f0b429"), (0.6, 1.75, 0, 0.08, 0.9, 1.3, "#a9d3f5"),
       (-1.05, 1.15, 0, 0.9, 0.5, 1.3, "#25272b"), (-1.75, 1.85, 0, 0.08, 0.5, 1.2, "#a9d3f5"),
       (1.9, 0.4, 0, 0.8, 0.8, 0.28, "#161616"), (-1.1, 0.4, 0.85, 0.8, 0.8, 0.3, "#161616"), (-1.1, 0.4, -0.85, 0.8, 0.8, 0.3, "#161616"),
       (2.3, 1.0, 0, 0.08, 0.28, 0.35, "#fff2b8"), (-1.85, 0.9, 0.55, 0.06, 0.2, 0.3, "#ff2a2a"), (-1.85, 0.9, -0.55, 0.06, 0.2, 0.3, "#ff2a2a")]
cop = car(4.6, 1.9, "#f2f2f2", "#2452a8") + [(-0.3, 2.6, 0.55, 0.6, 0.35, 0.9, "#ff3b30"), (-0.3, 2.6, -0.55, 0.6, 0.35, 0.9, "#2d6cff")]
MODELS = {"tuk": tuk, "cop": cop, "taxi": car(4.4, 1.8, "#1b1b1b", "#e8e8e8"), "micro": car(5.2, 2.0, "#e9edf0", "#3d6fb5", 1.25),
          "carA": car(4.2, 1.8, "#b23a3a", "#3a2a2a"), "carB": car(4.2, 1.8, "#3a6db2", "#26303a"), "carC": car(4.2, 1.8, "#8a8f94", "#2a2a2a")}
if __name__ == "__main__":
    out = {k: base64.b64encode(glb(v)).decode() for k, v in MODELS.items()}
    print(json.dumps(out, separators=(",", ":"))) if "--json" in sys.argv else print({k: len(v) for k, v in out.items()})
