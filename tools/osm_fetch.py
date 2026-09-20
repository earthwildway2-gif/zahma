#!/usr/bin/env python3
"""Download real street + building data for an area from OpenStreetMap (Overpass API).

Usage: python tools/osm_fetch.py imbaba 30.0 31.19 30.07 31.22      (south west north east)
Writes data/<name>.json. OSM data is free to use with attribution: (c) OpenStreetMap contributors (ODbL).
"""
import json, pathlib, sys, urllib.parse, urllib.request
name, s, w, n, e = sys.argv[1], *map(float, sys.argv[2:6])
q = f"""[out:json][timeout:90];
(way["highway"]({s},{w},{n},{e}); way["building"]({s},{w},{n},{e}););
out geom tags;"""
req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=urllib.parse.urlencode({"data": q}).encode())
data = json.loads(urllib.request.urlopen(req, timeout=120).read())
out = pathlib.Path(__file__).resolve().parent.parent / "data"; out.mkdir(exist_ok=True)
(out / f"{name}.json").write_text(json.dumps(data), encoding="utf-8")
print(len(data["elements"]), "ways saved to", out / f"{name}.json")
