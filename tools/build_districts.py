#!/usr/bin/env python3
"""Turn the OpenStreetMap downloads in data/ into compact per-district mission data for cairo.html.

For each district: pick a start point on a real drivable road, find the farthest point reachable by road
(the mission target), and keep nearby roads for NPC traffic. Local units are decimetres (x east, y south).
"""
import heapq, json, math, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
DRIVE = {"motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street",
         "motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link"}
WIDTH = {"motorway": 14, "trunk": 14, "primary": 12, "secondary": 10, "tertiary": 9, "unclassified": 7, "residential": 6.5,
         "living_street": 5, "motorway_link": 7, "trunk_link": 7, "primary_link": 7, "secondary_link": 7, "tertiary_link": 6}
DISTRICTS = [  # name, file, bbox (s, w, n, e), label
    ("إمبابة", "imbaba", (30.0705, 31.2015, 30.0815, 31.2125)),
    ("وسط البلد", "downtown", (30.0390, 31.2300, 30.0500, 31.2410)),
    ("الهرم", "haram", (29.9945, 31.1630, 30.0055, 31.1740)),
]

def build(name, fname, bbox):
    s, w, n, e = bbox
    lat0, lon0 = (s + n) / 2, (w + e) / 2
    def proj(lat, lon, la0=lat0, lo0=lon0):
        return ((lon - lo0) * 111320 * math.cos(math.radians(la0)), (lat - la0) * 110540)
    data = json.loads((root / "data" / f"{fname}.json").read_text())
    ways = [el for el in data["elements"] if el.get("tags", {}).get("highway") in DRIVE and len(el.get("geometry", [])) >= 2]
    margin = 0.002
    inside = lambda g: (s - margin) <= g["lat"] <= (n + margin) and (w - margin) <= g["lon"] <= (e + margin)
    key = lambda g: (round(g["lat"], 6), round(g["lon"], 6))
    adj, pos = {}, {}
    for el in ways:
        g = el["geometry"]
        for a, b in zip(g, g[1:]):
            if not (inside(a) and inside(b)):
                continue
            ka, kb = key(a), key(b)
            pos[ka], pos[kb] = (a["lat"], a["lon"]), (b["lat"], b["lon"])
            pa, pb = proj(*pos[ka]), proj(*pos[kb])
            d = math.hypot(pa[0] - pb[0], pa[1] - pb[1])
            adj.setdefault(ka, []).append((kb, d)); adj.setdefault(kb, []).append((ka, d))
    # largest connected component
    seen, best = set(), []
    for k in adj:
        if k in seen:
            continue
        comp, stack = [], [k]; seen.add(k)
        while stack:
            u = stack.pop(); comp.append(u)
            for v, _ in adj[u]:
                if v not in seen:
                    seen.add(v); stack.append(v)
        if len(comp) > len(best):
            best = comp
    comp = set(best)
    # start: node in the component closest to the south-west quarter of the bbox
    sw = proj(s + (n - s) * 0.25, w + (e - w) * 0.25)
    start = min((k for k in comp if len(adj[k]) >= 2), key=lambda k: math.hypot(*(a - b for a, b in zip(proj(*pos[k]), sw))))
    dist, prev, pq = {start: 0.0}, {}, [(0.0, start)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, wgt in adj[u]:
            if d + wgt < dist.get(v, 1e18):
                dist[v] = d + wgt; prev[v] = u; heapq.heappush(pq, (d + wgt, v))
    p0 = proj(*pos[start])
    def rel(k):
        x, y = proj(*pos[k]); return ((x - p0[0]) * 10, -(y - p0[1]) * 10)
    cands = [k for k in dist if 450 <= dist[k] <= 1100] or list(dist)
    target = max(cands, key=lambda k: math.hypot(*rel(k)))
    path, u = [target], target
    while u != start:
        u = prev[u]; path.append(u)
    path.reverse()
    pts = [rel(k) for k in path]
    ahead = next((p for p in pts if math.hypot(*p) > 200), pts[-1])
    a = math.atan2(ahead[1], ahead[0])
    # roads near the route, for NPC traffic
    def near_route(x, y):
        return any(math.hypot(x - px, y - py) < 3500 for px, py in pts[::4] + [pts[-1]])
    roads = []
    for el in ways:
        g = [x for x in el["geometry"] if inside(x)]
        if len(g) < 2:
            continue
        pl = []
        for x in g:
            px, py = proj(x["lat"], x["lon"]); q = ((px - p0[0]) * 10, -(py - p0[1]) * 10)
            if not pl or math.hypot(q[0] - pl[-1][0], q[1] - pl[-1][1]) > 30:
                pl.append(q)
        if len(pl) >= 2 and any(near_route(*q) for q in pl):
            roads.append({"w": int(WIDTH[el["tags"]["highway"]] * 10), "p": [int(round(c)) for q in pl for c in q]})
    lat, lon = pos[start]
    tx, ty = rel(target)
    print(f"{name}: comp nodes {len(comp)}, route {dist[target]:.0f} m, straight {math.hypot(tx, ty) / 10:.0f} m, roads {len(roads)}, heading {math.degrees(a):.0f}deg")
    return {"name": name, "lat": round(lat, 7), "lon": round(lon, 7), "a": round(a, 3),
            "target": [int(tx), int(ty)], "roads": roads,
            "path": [[int(x), int(y)] for x, y in pts[:: max(1, len(pts) // 60)]]}

if __name__ == "__main__":
    out = [build(*d) for d in DISTRICTS]
    (root / "data" / "districts.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("saved", (root / "data" / "districts.json").stat().st_size // 1024, "KB")
