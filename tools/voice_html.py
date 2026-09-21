#!/usr/bin/env python3
"""Generate Egyptian-Arabic voice clips (edge-tts) for every spoken line of an HTML game and embed them.
Lines are found as { who: '..', text: '..' } plus the cross product of BARK_TEXT x BARK_WHO (per-character bark voices).
Clip key = djb2(who + '|' + text), the same function the game uses.  Usage: python tools/voice_html.py shooter/index.html voice_shooter"""
import asyncio, base64, json, pathlib, re, sys

STYLE = {  # who -> (rate, pitch)
    "سيد": ("+5%", "+0Hz"), "الأسطى": ("+0%", "-6Hz"), "الحاج": ("-10%", "-18Hz"), "الصقر": ("+8%", "-14Hz"), "شحتة": ("+12%", "+10Hz"),
    "حارس0": ("+2%", "+2Hz"), "حارس1": ("-6%", "-14Hz"), "حارس2": ("+10%", "+9Hz"), "ثقيل": ("-14%", "-28Hz"), "زعيم": ("+6%", "-20Hz"),
    "حارسة": ("+2%", "+3Hz"), "ليلى": ("+4%", "+0Hz"),
}
FEMALE = {"حارسة", "ليلى"}

def hash_text(t):
    h = 5381
    for ch in t: h = ((h * 33) ^ ord(ch)) & 0xFFFFFFFF
    return format(h, "x")

def strings(block):
    return [m.replace("\\'", "'") for m in re.findall(r"'((?:[^'\\]|\\.)*)'", block)]

async def main():
    import edge_tts
    html_p = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(exist_ok=True)
    html = html_p.read_text(encoding="utf-8"); items = {}
    for who, text in re.findall(r"who:\s*'([^']+)',\s*text:\s*'((?:[^'\\]|\\.)*)'", html):
        text = text.replace("\\'", "'"); items[hash_text(who + "|" + text)] = (who, text)
    bt = re.search(r"const BARK_TEXT = \[(.*?)\];", html, re.S); bw = re.search(r"const BARK_WHO = \[(.*?)\];", html, re.S)
    if bt and bw:
        for who in strings(bw.group(1)):
            for text in strings(bt.group(1)): items[hash_text(who + "|" + text)] = (who, text)
    voices = await edge_tts.list_voices(); ar = [v for v in voices if v["Locale"] == "ar-EG"]
    male = next((v["ShortName"] for v in ar if v["Gender"] == "Male"), "ar-EG-ShakirNeural"); female = next((v["ShortName"] for v in ar if v["Gender"] == "Female"), "ar-EG-SalmaNeural")
    print("voices:", male, female, "| clips:", len(items))
    for key, (who, text) in items.items():
        f = out / f"{key}.mp3"
        if f.exists(): continue
        rate, pitch = STYLE.get(who.split()[0], ("+0%", "+0Hz"))
        await edge_tts.Communicate(text, female if who in FEMALE else male, rate=rate, pitch=pitch).save(str(f)); print("ok", who, text[:28])
    clips = {p.stem: "data:audio/mpeg;base64," + base64.b64encode(p.read_bytes()).decode() for p in sorted(out.glob("*.mp3")) if p.stem in items}
    block = "/*VOICE_BEGIN*/const VOICE = " + json.dumps(clips) + ";/*VOICE_END*/"
    html, n = re.subn(r"/\*VOICE_BEGIN\*/.*?/\*VOICE_END\*/", lambda m: block, html, flags=re.S); assert n == 1
    html_p.write_text(html, encoding="utf-8"); print(len(clips), "clips embedded")

asyncio.run(main())
