#!/usr/bin/env python3
"""Embed assets/textures/facade_*.jpg into index.html (single self-contained file)."""
import base64, json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
p = root / "index.html"; html = p.read_text(encoding="utf-8")
tex = {f.stem: "data:image/jpeg;base64," + base64.b64encode(f.read_bytes()).decode()
       for f in sorted((root / "assets" / "textures").glob("facade_*.jpg"))}
block = "/*TEX_BEGIN*/const TEX = " + json.dumps(tex) + ";/*TEX_END*/"
html, n = re.subn(r"/\*TEX_BEGIN\*/.*?/\*TEX_END\*/", lambda m: block, html, flags=re.S)
assert n == 1
p.write_text(html, encoding="utf-8"); print(len(tex), "textures embedded,", round(p.stat().st_size / 1e6, 2), "MB")
