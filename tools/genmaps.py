#!/usr/bin/env python3
"""One-off generator for the big overworld and the two new dungeons.
Writes src/mapgen.js (checked in) so the game ships fixed, deterministic maps.
Run: python3 tools/genmaps.py"""
import random, json
from collections import deque

def bfs(g, start, passable):
    H, W = len(g), len(g[0]); seen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if 0 <= nx < W and 0 <= ny < H and (nx,ny) not in seen and passable(g[ny][nx]):
                seen.add((nx,ny)); q.append((nx,ny))
    return seen

# ------------------------------------------------------------------ world
def make_world(seed):
    r = random.Random(seed); W, H = 40, 30
    g = [['~']*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            dx, dy = (x-19.5)/18.2, (y-14.5)/13.2
            if abs(dx)**4 + abs(dy)**4 < 1.0 + r.uniform(-0.08, 0.08): g[y][x] = '.'
    for y in range(H):
        for x in range(W):
            if g[y][x] == '.':
                if y <= 13 and x >= 22: g[y][x] = ','
                elif y >= 22 and x <= 26: g[y][x] = ':'
    pois = {'haven': (7, 20), 'cavern': (24, 19), 'crypt': (12, 25), 'frost': (27, 8), 'spire': (34, 4)}
    spawn_adj = {k: (x, y+1) for k, (x, y) in pois.items()}
    def near_poi(x, y, d=3): return any(abs(x-px) <= d and abs(y-py) <= d for px, py in pois.values())
    # mountain wall with a gated pass at x=29
    for y in (14, 15, 16):
        for x in range(1, 39):
            if g[y][x] != '~': g[y][x] = 'M'
    for y in (14, 15, 16): g[y][29] = 'B'
    # more mountain clusters and lakes
    for _ in range(7):
        cx, cy, n = r.randint(3, 36), r.randint(3, 26), r.randint(3, 7)
        for _ in range(n*2):
            x, y = cx + r.randint(-2, 2), cy + r.randint(-1, 1)
            if 0 <= x < W and 0 <= y < H and g[y][x] in '.,' and not near_poi(x, y, 4) and y not in (13, 14, 15, 16, 17): g[y][x] = 'M'
    for _ in range(4):
        cx, cy = r.randint(4, 35), r.randint(4, 25)
        for _ in range(14):
            x, y = cx + r.randint(-3, 3), cy + r.randint(-2, 2)
            if 0 <= x < W and 0 <= y < H and g[y][x] in '.,:' and not near_poi(x, y, 4) and y not in (13, 14, 15, 16, 17): g[y][x] = '~'
    for y in range(H):
        for x in range(W):
            if g[y][x] == '.' and r.random() < 0.11: g[y][x] = 'T'
            elif g[y][x] == ',' and r.random() < 0.11: g[y][x] = 't'
            elif g[y][x] == ':' and r.random() < 0.05: g[y][x] = 'T'
    base = lambda x, y: ',' if (y <= 13 and x >= 22) else (':' if (y >= 22 and x <= 26) else '.')
    def carve(a, b):  # L-shaped road clearing trees/water (bridges) but not mountains/barrier
        (x0, y0), (x1, y1) = a, b
        pts = [(x, y0) for x in range(min(x0, x1), max(x0, x1)+1)] + [(x1, y) for y in range(min(y0, y1), max(y0, y1)+1)]
        for x, y in pts:
            if g[y][x] in 'TMt~.,:' and g[y][x] != 'B':
                if g[y][x] == 'M': continue
                g[y][x] = '=' if g[y][x] == '~' else base(x, y)
    for k, (x, y) in pois.items(): g[y][x] = 'H' if k in ('haven', 'frost') else 'D'
    for k, (x, y) in spawn_adj.items(): g[y][x] = base(x, y)
    carve(spawn_adj['haven'], (spawn_adj['haven'][0], 22)); carve((7, 22), (24, 22)); carve((24, 22), spawn_adj['cavern'])
    carve((12, 22), (12, 24)); carve(spawn_adj['crypt'], (12, 24))
    carve((24, 22), (29, 22)); carve((29, 22), (29, 17))
    carve((29, 13), (29, 9)); carve((29, 9), (27, 9)); carve((27, 9), spawn_adj['frost'])
    carve((29, 9), (34, 9)); carve((34, 9), spawn_adj['spire'])
    for y in (14, 15, 16): g[y][29] = 'B'
    for k, (x, y) in pois.items(): g[y][x] = 'H' if k in ('haven', 'frost') else 'D'
    # content pack 3: extra POIs added after all random draws so the existing world is unchanged
    extra = {'mirewood': (19, 25), 'storm': (13, 8)}; extra_adj = {'mirewood': (19, 24), 'storm': (13, 9)}
    for k, (x, y) in extra.items(): g[y][x] = 'H' if k == 'mirewood' else 'D'
    for k, (x, y) in extra_adj.items(): g[y][x] = base(x, y)
    carve((19, 22), (19, 24)); carve((29, 9), (13, 9))
    for k, (x, y) in extra.items(): g[y][x] = 'H' if k == 'mirewood' else 'D'
    pois.update(extra); spawn_adj.update(extra_adj)
    # reachability checks
    walk = lambda c: c in '.,:T=' or c in 'HD'  # T never reached; kept for safety
    pas = lambda c: c in '.,:=HD'
    start = spawn_adj['haven']
    open_ = bfs(g, start, pas)
    for k in ('haven', 'cavern', 'crypt', 'mirewood'): assert pois[k] in open_, k
    for k in ('frost', 'spire', 'storm'): assert pois[k] not in open_, 'gate leaks ' + k
    opened = bfs(g, start, lambda c: pas(c) or c == 'B')
    for k in pois: assert pois[k] in opened, k
    return [''.join(row) for row in g], pois, spawn_adj

# --------------------------------------------------------------- dungeons
def make_dungeon(seed, W=26, H=18, rooms_n=7, chests_n=4):
    for attempt in range(500):
        r = random.Random(seed + attempt)
        g = [['#']*W for _ in range(H)]
        rooms = []
        for _ in range(60):
            if len(rooms) >= rooms_n: break
            w, h = r.randint(4, 7), r.randint(3, 5); x, y = r.randint(1, W-w-2), r.randint(1, H-h-2)
            if all(x+w+1 < a or a+aw+1 < x or y+h+1 < b or b+ah+1 < y for a, b, aw, ah in rooms): rooms.append((x, y, w, h))
        if len(rooms) < rooms_n: continue
        rooms.sort(key=lambda rm: rm[0])
        for x, y, w, h in rooms:
            for yy in range(y, y+h):
                for xx in range(x, x+w): g[yy][xx] = '.'
        ctr = lambda rm: (rm[0]+rm[2]//2, rm[1]+rm[3]//2)
        def corridor(a, b):
            (x0, y0), (x1, y1) = a, b
            for x in range(min(x0, x1), max(x0, x1)+1): g[y0][x] = '.'
            for y in range(min(y0, y1), max(y0, y1)+1): g[y][x1] = '.'
        for i in range(len(rooms)-1): corridor(ctr(rooms[i]), ctr(rooms[i+1]))
        # extra loop for variety
        corridor(ctr(rooms[1]), ctr(rooms[4]))
        ex, ey, ew, eh = rooms[0]
        entrance = (ex, ey); spawn = (ex+1, ey)
        bx, by, bw, bh = rooms[-1]; boss = (bx+bw//2, by+bh//2)
        g[entrance[1]][entrance[0]] = 'E'; g[boss[1]][boss[0]] = 'X'
        # chests in corners of middle rooms
        spots = []
        for rm in rooms[1:-1]:
            x, y, w, h = rm
            for cx_, cy_ in ((x, y), (x+w-1, y), (x, y+h-1), (x+w-1, y+h-1)):
                if g[cy_][cx_] == '.': spots.append((cx_, cy_))
        r.shuffle(spots)
        chests = []
        for s in spots:
            if len(chests) >= chests_n: break
            g[s[1]][s[0]] = 'C'
            reach = bfs(g, spawn, lambda c: c in '.')
            floor_total = sum(row.count('.') for row in g)
            ok = all(any((nx, ny) in reach for nx, ny in ((s2[0]+1, s2[1]), (s2[0]-1, s2[1]), (s2[0], s2[1]+1), (s2[0], s2[1]-1))) for s2 in chests+[s]) and (bx, by) is not None
            ok = ok and any(((boss[0]+dx, boss[1]+dy) in reach) for dx, dy in ((1,0),(-1,0),(0,1),(0,-1))) and len(reach) == floor_total
            if ok: chests.append(s)
            else: g[s[1]][s[0]] = '.'
        if len(chests) < chests_n: continue
        return [''.join(row) for row in g], {'spawn': spawn, 'entrance': entrance, 'boss': boss, 'chests': chests}
    raise SystemExit('no dungeon')

world, pois, adj = make_world(11)
crypt, cinfo = make_dungeon(100)
spire, sinfo = make_dungeon(300, 28, 18, 8, 5)
storm, stinfo = make_dungeon(500, 26, 18, 7, 4)
out = {'world': world, 'pois': pois, 'adj': adj, 'crypt': crypt, 'cryptInfo': cinfo, 'spire': spire, 'spireInfo': sinfo, 'storm': storm, 'stormInfo': stinfo}
js = '// GENERATED by tools/genmaps.py. Do not edit by hand.\nexport const GEN = ' + json.dumps(out, indent=1) + ';\n'
open('src/mapgen.js', 'w').write(js)
print('\n'.join(world)); print(); print('\n'.join(crypt)); print(cinfo); print(); print('\n'.join(spire)); print(sinfo); print(pois)
