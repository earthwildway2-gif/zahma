#!/usr/bin/env python3
"""Extract every spoken dialogue line from index.html -> voice/lines.json (id = same hash the game uses)."""
import re, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent

def hash_text(t):
    h = 5381
    for ch in t:
        h = ((h * 33) ^ ord(ch)) & 0xFFFFFFFF
    return format(h, 'x')

def extract(html):
    seen, out = set(), []
    for who, text in re.findall(r"who:\s*'([^']+)',\s*text:\s*'((?:[^'\\]|\\.)*)'", html):
        text = text.replace("\\'", "'")
        i = hash_text(text)
        if i not in seen:
            seen.add(i); out.append({"id": i, "who": who, "text": text})
    return out

if __name__ == "__main__":
    lines = extract((root / "index.html").read_text(encoding="utf-8"))
    (root / "voice").mkdir(exist_ok=True)
    (root / "voice" / "lines.json").write_text(json.dumps(lines, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(lines), "lines ->", root / "voice" / "lines.json")
