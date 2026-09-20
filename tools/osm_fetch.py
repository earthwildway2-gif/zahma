#!/usr/bin/env python3
"""Download real street + building data for an area from OpenStreetMap (Overpass API).

Usage: python tools/osm_fetch.py imbaba 30.0705 31.2015 30.0815 31.2125      (south west north east)
Writes data/<name>.json. OSM data is free to use with attribution: (c) OpenStreetMap contributors (ODbL).
"""
import json, pathlib, sys, time, urllib.parse, urllib.request

ENDPOINTS = ["https://overpass-api.de/api/interpreter",
             "https://overpass.kumi.systems/api/interpreter",
             "https://overpass.private.coffee/api/interpreter"]
name, s, w, n, e = sys.argv[1], *map(float, sys.argv[2:6])
q = f"""[out:json][timeout:90];
(way["highway"]({s},{w},{n},{e}); way["building"]({s},{w},{n},{e}););
out geom tags;"""
body = urllib.parse.urlencode({"data": q}).encode()
headers = {"User-Agent": "zahma-game/0.1 (https://github.com/earthwildway2-gif/zahma)", "Accept": "*/*"}
data = None
for attempt in range(3):
    for url in ENDPOINTS:
        try:
            req = urllib.request.Request(url, data=body, headers=headers)
            data = json.loads(urllib.request.urlopen(req, timeout=150).read())
            print("ok from", url); break
        except Exception as ex:
            print("failed", url, "->", repr(ex)[:200], flush=True)
    if data: break
    time.sleep(20)
if not data:
    sys.exit("all Overpass endpoints failed")
out = pathlib.Path(__file__).resolve().parent.parent / "data"; out.mkdir(exist_ok=True)
(out / f"{name}.json").write_text(json.dumps(data), encoding="utf-8")
print(len(data["elements"]), "ways saved to", out / f"{name}.json")
