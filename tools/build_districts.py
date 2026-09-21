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
    # real building footprints near the route (decimetres, relative to the start), with storey counts
    import random
    rng = random.Random(hash(name) & 0xffff)
    FLOORS = {"imbaba": (4, 7), "downtown": (5, 8), "haram": (3, 6)}[fname]
    def area(pl):
        return abs(sum(pl[i][0] * pl[(i + 1) % len(pl)][1] - pl[(i + 1) % len(pl)][0] * pl[i][1] for i in range(len(pl)))) / 2
    blds = []
    for el in data["elements"]:
        t = el.get("tags", {})
        if "building" not in t or len(el.get("geometry", [])) < 4:
            continue
        pl = []
        for g in el["geometry"][:-1]:
            px, py = proj(g["lat"], g["lon"]); q = ((px - p0[0]) * 10, -(py - p0[1]) * 10)
            if not pl or math.hypot(q[0] - pl[-1][0], q[1] - pl[-1][1]) > 5:
                pl.append(q)
        if len(pl) < 3 or area(pl) < 2500:          # < 25 m2
            continue
        cx = sum(q[0] for q in pl) / len(pl); cy = sum(q[1] for q in pl) / len(pl)
        if not any(math.hypot(cx - px, cy - py) < 4000 for px, py in pts[::3] + [pts[-1]]):
            continue
        lv = t.get("building:levels") or ""
        try: fl = int(float(lv))
        except ValueError:
            try: fl = round(float(str(t.get("height", "")).replace("m", "")) / 3.5)
            except ValueError: fl = rng.randint(*FLOORS)
        blds.append({"f": max(2, min(14, fl)), "p": [int(round(c)) for q in pl for c in q], "c": (cx, cy)})
    # keep the mission route (and road centrelines) drivable: drop mapped buildings that sit on them
    def dens(points, step):
        out = []
        for (x0, y0), (x1, y1) in zip(points, points[1:]):
            L = math.hypot(x1 - x0, y1 - y0); k = max(1, int(L / step))
            out += [(x0 + (x1 - x0) * i / k, y0 + (y1 - y0) * i / k) for i in range(k)]
        return out + [points[-1]]
    route_pts = dens(pts, 20)
    center_pts = [(r["p"][i], r["p"][i + 1]) for r in roads for i in range(0, len(r["p"]), 2)]
    def inside_poly(px, py, pp):
        ins = False; nn = len(pp) // 2; j = nn - 1
        for i in range(nn):
            xi, yi, xj, yj = pp[2 * i], pp[2 * i + 1], pp[2 * j], pp[2 * j + 1]
            if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi): ins = not ins
            j = i
        return ins
    def edge_d(px, py, pp):
        best = 1e18; nn = len(pp) // 2
        for i in range(nn):
            j = (i + 1) % nn; x0, y0, x1, y1 = pp[2 * i], pp[2 * i + 1], pp[2 * j], pp[2 * j + 1]
            dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy or 1; t = max(0, min(1, ((px - x0) * dx + (py - y0) * dy) / L2))
            best = min(best, math.hypot(px - (x0 + t * dx), py - (y0 + t * dy)))
        return best
    def drivable(blist):
        kept = []
        for b in blist:
            xs, ys = b["p"][0::2], b["p"][1::2]; x0, x1, y0, y1 = min(xs) - 40, max(xs) + 40, min(ys) - 40, max(ys) + 40
            bad = False
            for px, py in route_pts:
                if x0 <= px <= x1 and y0 <= py <= y1 and (inside_poly(px, py, b["p"]) or edge_d(px, py, b["p"]) < 26): bad = True; break
            if not bad:
                for px, py in center_pts:
                    if x0 <= px <= x1 and y0 <= py <= y1 and (inside_poly(px, py, b["p"]) or edge_d(px, py, b["p"]) < 12): bad = True; break
            if not bad: kept.append(b)
        return kept
    n0 = len(blds); blds = drivable(blds)
    print(f"  dropped {n0 - len(blds)} mapped buildings that sat on roads")
    # sparse OSM coverage (e.g. parts of Giza): add plausible filler blocks along the roads
    if True:                       # always fill unmapped gaps along the roads (OSM coverage is patchy)
        real_boxes = []
        for b in blds:
            xs, ys = b["p"][0::2], b["p"][1::2]; real_boxes.append((min(xs) - 150, min(ys) - 150, max(xs) + 150, max(ys) + 150))
        added = 0
        segs = []
        for r in roads:
            p = r["p"]
            for i in range(0, len(p) - 2, 2):
                segs.append((p[i], p[i + 1], p[i + 2], p[i + 3], r["w"]))
        def dist_seg(x, y, sg):
            x0, y0, x1, y1, _ = sg; dx, dy = x1 - x0, y1 - y0; L2 = dx * dx + dy * dy or 1
            t = max(0, min(1, ((x - x0) * dx + (y - y0) * dy) / L2)); return math.hypot(x - (x0 + t * dx), y - (y0 + t * dy))
        taken = [b["c"] for b in blds]
        tries = 0
        for r in roads:
            p, hw = r["p"], r["w"] / 2
            for i in range(0, len(p) - 2, 2):
                x0, y0, x1, y1 = p[i], p[i + 1], p[i + 2], p[i + 3]; L = math.hypot(x1 - x0, y1 - y0)
                if L < 30: continue
                ux, uy = (x1 - x0) / L, (y1 - y0) / L; nx, ny = -uy, ux
                pos_ = 100.0
                while pos_ < L - 100:
                    for side in (-1, 1):
                        bw, bd = rng.randint(150, 230), rng.randint(140, 200)          # 15-23 m x 14-20 m
                        off = hw + 30 + bd / 2
                        cx = x0 + ux * pos_ + nx * side * off; cy = y0 + uy * pos_ + ny * side * off
                        if added >= 550: continue
                        if any(math.hypot(cx - a, cy - b) < 210 for a, b in taken): continue
                        if any(bx0 <= cx <= bx1 and by0 <= cy <= by1 for bx0, by0, bx1, by1 in real_boxes): continue
                        if any(dist_seg(cx, cy, sg) < sg[4] / 2 + max(bw, bd) * 0.6 for sg in segs if math.hypot(cx - sg[0], cy - sg[1]) < 600): continue
                        if not any(math.hypot(cx - px, cy - py) < 4000 for px, py in pts[::3] + [pts[-1]]): continue
                        ang = math.atan2(uy, ux); c_, s_ = math.cos(ang), math.sin(ang)
                        poly = [(cx + (dx * c_ - dy * s_), cy + (dx * s_ + dy * c_)) for dx, dy in ((-bw / 2, -bd / 2), (bw / 2, -bd / 2), (bw / 2, bd / 2), (-bw / 2, bd / 2))]
                        blds.append({"f": rng.randint(*FLOORS), "p": [int(round(c)) for q in poly for c in q], "c": (cx, cy)}); taken.append((cx, cy)); added += 1
                    pos_ += 190
        print(f"  filler blocks added: {added}")
    n1 = len(blds); blds = drivable(blds); print(f"  dropped {n1 - len(blds)} more after filler")
    for b in blds: b.pop("c", None)
    lat, lon = pos[start]
    tx, ty = rel(target)
    print(f"{name}: comp nodes {len(comp)}, route {dist[target]:.0f} m, straight {math.hypot(tx, ty) / 10:.0f} m, roads {len(roads)}, heading {math.degrees(a):.0f}deg")
    return {"name": name, "lat": round(lat, 7), "lon": round(lon, 7), "a": round(a, 3),
            "target": [int(tx), int(ty)], "roads": roads, "buildings": blds,
            "path": [[int(x), int(y)] for x, y in pts[:: max(1, len(pts) // 60)]]}

if __name__ == "__main__":
    out = [build(*d) for d in DISTRICTS]
    (root / "data" / "districts.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("saved", (root / "data" / "districts.json").stat().st_size // 1024, "KB")
