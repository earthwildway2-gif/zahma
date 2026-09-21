#!/usr/bin/env python3
"""Find every { who: '..', text: '..' } line in an HTML game, generate Egyptian-Arabic voice clips (edge-tts), and embed them.
Usage: python tools/voice_html.py shooter/index.html voice_shooter"""
import asyncio, base64, json, pathlib, re, sys

STYLE = {"سيد": ("+5%", "+0Hz"), "الأسطى": ("+0%", "-6Hz"), "الحاج": ("-10%", "-18Hz"), "الصقر": ("+8%", "-12Hz"), "شحتة": ("+12%", "+10Hz"), "حارس": ("+10%", "-4Hz")}

def hash_text(t):
    h = 5381
    for ch in t: h = ((h * 33) ^ ord(ch)) & 0xFFFFFFFF
    return format(h, "x")

async def main():
    import edge_tts
    html_p = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2]); out.mkdir(exist_ok=True)
    html = html_p.read_text(encoding="utf-8"); seen = {}
    for who, text in re.findall(r"who:\s*'([^']+)',\s*text:\s*'((?:[^'\\]|\\.)*)'", html):
        seen.setdefault(hash_text(text.replace("\\'", "'")), (who, text.replace("\\'", "'")))
    voices = [v for v in await edge_tts.list_voices() if v["Locale"] == "ar-EG"]
    male = [v["ShortName"] for v in voices if v["Gender"] == "Male"]
    print("ar-EG voices:", [(v["ShortName"], v["Gender"]) for v in voices], "| lines:", len(seen))
    voice = male[0] if male else "ar-EG-ShakirNeural"
    for h, (who, text) in seen.items():
        f = out / f"{h}.mp3"
        if f.exists(): continue
        rate, pitch = STYLE.get(who.split()[0], ("+0%", "+0Hz"))
        await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(f)); print("ok", who, text[:30])
    clips = {p.stem: "data:audio/mpeg;base64," + base64.b64encode(p.read_bytes()).decode() for p in sorted(out.glob("*.mp3")) if p.stem in seen}
    block = "/*VOICE_BEGIN*/const VOICE = " + json.dumps(clips) + ";/*VOICE_END*/"
    html, n = re.subn(r"/\*VOICE_BEGIN\*/.*?/\*VOICE_END\*/", lambda m: block, html, flags=re.S); assert n == 1
    html_p.write_text(html, encoding="utf-8"); print(len(clips), "clips embedded")

asyncio.run(main())
