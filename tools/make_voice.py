#!/usr/bin/env python3
"""Generate Egyptian-Arabic AI voice clips for every dialogue line.

Engines:
  edge        free Microsoft neural voices (ar-EG).   pip install edge-tts
  elevenlabs  paid/free-tier, very natural.           set ELEVENLABS_API_KEY and edit VOICES below

Usage:
  python tools/extract_lines.py
  python tools/make_voice.py --engine edge
  python tools/build_voice.py          # embeds the clips into index.html
"""
import argparse, asyncio, json, os, pathlib, sys, urllib.request

root = pathlib.Path(__file__).resolve().parent.parent
LINES = root / "voice" / "lines.json"

# speaker (first word of the "who" field) -> voice settings
VOICES = {
    "سيد":     {"edge": "ar-EG-ShakirNeural", "rate": "+5%",  "pitch": "+0Hz"},
    "المعلم":  {"edge": "ar-EG-ShakirNeural", "rate": "-5%",  "pitch": "-12Hz"},
    "الأسطى":  {"edge": "ar-EG-ShakirNeural", "rate": "+0%",  "pitch": "-6Hz"},
    "شحتة":    {"edge": "ar-EG-ShakirNeural", "rate": "+12%", "pitch": "+10Hz"},
    "الحاج":   {"edge": "ar-EG-ShakirNeural", "rate": "-10%", "pitch": "-18Hz"},
    "الظابط":  {"edge": "ar-EG-ShakirNeural", "rate": "+0%",  "pitch": "-10Hz"},
}
DEFAULT = {"edge": "ar-EG-ShakirNeural", "rate": "+0%", "pitch": "+0Hz"}
# ElevenLabs: put a voice_id per speaker (pick Egyptian-dialect voices from their Voice Library)
ELEVEN_VOICE_IDS = {}   # e.g. {"سيد": "abc123...", "المعلم": "def456..."}

async def pick_edge_voice():
    """Use whichever Egyptian male neural voice the service currently offers."""
    import edge_tts
    vs = [v for v in await edge_tts.list_voices() if v["Locale"] == "ar-EG"]
    print("ar-EG voices:", [(v["ShortName"], v["Gender"]) for v in vs])
    male = [v["ShortName"] for v in vs if v["Gender"] == "Male"]
    return male[0] if male else None

async def edge_one(text, cfg, out):
    import edge_tts
    await edge_tts.Communicate(text, cfg["edge"], rate=cfg["rate"], pitch=cfg["pitch"]).save(str(out))

def eleven_one(text, speaker, out):
    vid = ELEVEN_VOICE_IDS.get(speaker) or next(iter(ELEVEN_VOICE_IDS.values()))
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_64",
        data=json.dumps({"text": text, "model_id": "eleven_multilingual_v2"}).encode(),
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
    out.write_bytes(urllib.request.urlopen(req, timeout=60).read())

async def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--engine", default="edge", choices=["edge", "elevenlabs"])
    ap.add_argument("--force", action="store_true"); a = ap.parse_args()
    lines = json.loads(LINES.read_text(encoding="utf-8"))
    edge_voice = await pick_edge_voice() if a.engine == "edge" else None
    for ln in lines:
        out = root / "voice" / f"{ln['id']}.mp3"
        if out.exists() and not a.force:
            continue
        speaker = ln["who"].split()[0]
        print("->", speaker, ":", ln["text"][:40])
        if a.engine == "edge":
            cfg = dict(VOICES.get(speaker, DEFAULT))
            if edge_voice:
                cfg["edge"] = edge_voice
            await edge_one(ln["text"], cfg, out)
        else:
            eleven_one(ln["text"], speaker, out)
    print("done. Now run: python tools/build_voice.py")

asyncio.run(main())
