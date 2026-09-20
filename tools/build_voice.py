#!/usr/bin/env python3
"""Embed voice/<id>.mp3 clips into index.html (single self-contained file, works when published)."""
import base64, json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html_p = root / "index.html"
html = html_p.read_text(encoding="utf-8")
clips = {}
for f in sorted((root / "voice").glob("*.mp3")):
    clips[f.stem] = "data:audio/mpeg;base64," + base64.b64encode(f.read_bytes()).decode()
block = "/*VOICE_BEGIN*/const VOICE = " + json.dumps(clips) + ";/*VOICE_END*/"
html, n = re.subn(r"/\*VOICE_BEGIN\*/.*?/\*VOICE_END\*/", lambda m: block, html, flags=re.S)
assert n == 1, "voice markers not found in index.html"
html_p.write_text(html, encoding="utf-8")
print(len(clips), "clips embedded,", round(html_p.stat().st_size / 1e6, 2), "MB")
