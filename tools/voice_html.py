#!/usr/bin/env python3
"""Generate distinct Arabic character voices (edge-tts: many Arabic voices + ffmpeg timbre/effects) for every spoken line of an HTML game and embed them.
Lines are found as { who: '..', text: '..' } plus the cross product of BARK_TEXT x BARK_WHO (per-character bark voices).
Clip key = djb2(who + '|' + text), the same function the game uses.  Usage: python tools/voice_html.py shooter/index.html voice_shooter"""
import asyncio, base64, json, pathlib, re, sys

# who -> preferred voices (first one that exists is used), rate, pitch, timbre shift (>1 = higher/younger, <1 = deeper/older), effect
CAST = {
    "سيد":     (["ar-EG-ShakirNeural"], "+5%", "+0Hz", 1.00, None),
    "الأسطى":  (["ar-EG-ShakirNeural"], "-4%", "-10Hz", 0.90, None),
    "الحاج":   (["ar-EG-ShakirNeural"], "-14%", "-25Hz", 0.82, None),
    "شحتة":    (["ar-EG-ShakirNeural"], "+14%", "+20Hz", 1.25, None),
    "ليلى":    (["ar-EG-SalmaNeural"], "+3%", "+0Hz", 1.00, None),
    "الصقر":   (["ar-SA-HamedNeural", "ar-AE-HamdanNeural"], "-6%", "-10Hz", 0.90, None),
    "زعيم":    (["ar-SA-HamedNeural", "ar-AE-HamdanNeural"], "-6%", "-10Hz", 0.90, None),
    "حارس0":   (["ar-LB-RamiNeural", "ar-SY-LaithNeural"], "+4%", "+0Hz", 1.00, None),
    "حارس1":   (["ar-JO-TaimNeural", "ar-IQ-BasselNeural"], "-4%", "-6Hz", 0.95, None),
    "حارس2":   (["ar-KW-FahedNeural", "ar-QA-MoazNeural", "ar-BH-AliNeural"], "+10%", "+8Hz", 1.06, None),
    "ثقيل":    (["ar-OM-AbdullahNeural", "ar-YE-SalehNeural", "ar-LY-OmarNeural"], "-12%", "-20Hz", 0.84, None),
    "حارسة":   (["ar-JO-SanaNeural", "ar-LB-LaylaNeural", "ar-EG-SalmaNeural"], "+2%", "+3Hz", 0.97, None),
}
FX = {
    "phone": "highpass=f=320,lowpass=f=3300,acompressor=threshold=0.05:ratio=6,volume=1.6",
    "loud": "highpass=f=260,lowpass=f=4300,aecho=0.8:0.55:70|140:0.35|0.2,acompressor=threshold=0.05:ratio=5,volume=1.5",
}
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
    import subprocess, shutil
    avail = {v["ShortName"]: v for v in await edge_tts.list_voices() if v["Locale"].startswith("ar-")}
    print("arabic voices available:", len(avail), "| clips:", len(items))
    male_pool = [n for n, v in avail.items() if v["Gender"] == "Male"]
    ff = shutil.which("ffmpeg") or "ffmpeg"
    for key, (who, text) in items.items():
        f = out / f"{key}.mp3"
        if f.exists(): continue
        prefs, rate, pitch, shift, fx = CAST.get(who.split()[0], (["ar-EG-ShakirNeural"], "+0%", "+0Hz", 1.0, None))
        voice = next((n for n in prefs if n in avail), None) or (male_pool[0] if male_pool else "ar-EG-ShakirNeural")
        tmp = out / f"{key}.raw.mp3"
        await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(tmp))
        chain = [f"asetrate=24000*{shift},aresample=24000,atempo={1 / shift:.4f}"] if abs(shift - 1) > 0.01 else []
        if fx: chain.append(FX[fx])
        if chain:
            subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(tmp), "-af", ",".join(chain), "-ac", "1", "-ar", "24000", "-b:a", "56k", str(f)], check=True); tmp.unlink()
        else: tmp.rename(f)
        print("ok", who, voice, text[:24])
    clips = {p.stem: "data:audio/mpeg;base64," + base64.b64encode(p.read_bytes()).decode() for p in sorted(out.glob("*.mp3")) if p.stem in items}
    block = "/*VOICE_BEGIN*/const VOICE = " + json.dumps(clips) + ";/*VOICE_END*/"
    html, n = re.subn(r"/\*VOICE_BEGIN\*/.*?/\*VOICE_END\*/", lambda m: block, html, flags=re.S); assert n == 1
    html_p.write_text(html, encoding="utf-8"); print(len(clips), "clips embedded")

asyncio.run(main())
