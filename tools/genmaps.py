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
# 16-bit style overworld: organic coast, regions with ragged borders, coherent woods and ranges, rivers, desert, islands.
# Legend: ~ ocean  r river  = bridge  . grass  , snow  : swamp  d desert  T tree  t snow tree  M mountain  B gate  H town  D dungeon
import math

def noise2(seed):
    r = random.Random(seed); G = [[r.uniform(-1, 1) for _ in range(64)] for _ in range(64)]
    def n(x, y):
        xi, yi = math.floor(x), math.floor(y); fx, fy = x - xi, y - yi; u, v = fx*fx*(3-2*fx), fy*fy*(3-2*fy)
        g = lambda a, b: G[b % 64][a % 64]
        a, b, c, d = g(xi, yi), g(xi+1, yi), g(xi, yi+1), g(xi+1, yi+1)
        return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v
    return lambda x, y: 0.6*n(x, y) + 0.3*n(x*2.1+5, y*2.1+3) + 0.1*n(x*4.3+9, y*4.3+1)

def make_world(seed):
    W, H = 40, 30
    nC, nR, nF, nM = noise2(seed), noise2(seed+1), noise2(seed+2), noise2(seed+3)
    pois = {'haven': (7, 20), 'cavern': (24, 19), 'crypt': (12, 25), 'frost': (27, 8), 'spire': (34, 4), 'mirewood': (19, 25), 'storm': (13, 8)}
    spawn_adj = {'haven': (7, 21), 'cavern': (24, 20), 'crypt': (12, 26), 'frost': (27, 9), 'spire': (34, 5), 'mirewood': (19, 24), 'storm': (13, 9)}
    roads = [((7, 21), (7, 22)), ((7, 22), (24, 22)), ((24, 22), (24, 20)), ((12, 22), (12, 26)), ((24, 22), (29, 22)), ((29, 22), (29, 17)),
             ((29, 13), (29, 9)), ((29, 9), (13, 9)), ((34, 9), (34, 5)), ((29, 9), (34, 9)), ((19, 22), (19, 24)), ((27, 9), (27, 9)), ((7, 21), (12, 21))]
    road_tiles = set()
    for (x0, y0), (x1, y1) in roads:
        for x in range(min(x0, x1), max(x0, x1)+1): road_tiles.add((x, y0))
        for y in range(min(y0, y1), max(y0, y1)+1): road_tiles.add((x1, y))
    near = lambda x, y, d: any(abs(x-px) <= d and abs(y-py) <= d for px, py in list(pois.values()) + list(spawn_adj.values()))
    near_road = lambda x, y, d: any(abs(x-a) + abs(y-b) <= d for a, b in road_tiles)
    g = [['~']*W for _ in range(H)]
    # --- land: a wobbly superellipse continent, never touching the map edge
    for y in range(1, H-1):
        for x in range(1, W-1):
            dx, dy = (x-19.6)/18.7, (y-14.6)/13.2
            v = abs(dx)**3.4 + abs(dy)**3.4 + nC(x/4.5, y/4.5)*0.4
            if v < 0.86 or near(x, y, 1) or near_road(x, y, 0): g[y][x] = '.'
    for y in range(H):
        for x in range(W):
            if x in (0, W-1) or y in (0, H-1): g[y][x] = '~'
    # bays and sounds carved by hand
    for x, y in [(2, 22), (2, 23), (3, 23), (2, 24), (3, 24), (4, 24), (3, 25), (4, 25), (2, 25), (3, 26), (4, 26), (2, 26), (5, 25),
                 (16, 2), (17, 2), (18, 2), (19, 2), (18, 3), (17, 3), (37, 11), (36, 11), (37, 12), (36, 12),
                 (25, 28), (26, 28), (27, 28), (26, 27), (37, 25), (37, 26), (36, 26), (38, 23), (38, 24)]:
        g[y][x] = '~'
    for x, y in [(1, 25), (1, 24)]: g[y][x] = '~'
    # islands
    for x, y in [(1, 26), (2, 27), (1, 27), (37, 28), (38, 28), (38, 27), (9, 28), (10, 28)]: g[y][x] = '.'
    # --- regions with ragged borders
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.': continue
            if y <= 13 and (x - 22) + (13 - y) * -0.35 + nR(x/3.5, y/3.5)*3.2 > 0: g[y][x] = ','
            elif y >= 22 and ((x-15)/9.5)**2 + ((y-26)/3.8)**2 + nR(x/3+7, y/3)*0.5 < 1: g[y][x] = ':'
            elif y >= 21 and ((x-30)/5.6)**2 + ((y-25.3)/3.6)**2 + nR(x/3+3, y/3+9)*0.45 < 1: g[y][x] = 'd'
    region = lambda x, y: g[y][x] if g[y][x] in '.,:d' else None
    # --- the mountain wall with the gated pass at x=29 (rows 14-16), with ragged foothills on both sides
    for y in (14, 15, 16):
        for x in range(W):
            if g[y][x] != '~': g[y][x] = 'M'
    for x in range(W):
        for y, k in ((13, 0.15), (17, 0.1)):
            if g[y][x] in '.,' and nM(x/2.2, y) > k and abs(x-29) > 1 and not near(x, y, 1) and not near_road(x, y, 0): g[y][x] = 'M'
    for y in (14, 15, 16): g[y][29] = 'B'
    # --- mountain clusters (centre, radii) shaped by noise
    for cx, cy, rx, ry in [(13, 6.4, 3.6, 2.2), (3.2, 9.5, 1.8, 2.2), (34, 2.8, 2.6, 1.8), (24, 17.6, 3.4, 1.6), (36.5, 19.5, 1.4, 1.8), (28.5, 24.2, 1.2, 0.7), (26.2, 26.3, 0.8, 0.7), (6.5, 4.5, 1.2, 0.9), (17, 18.4, 1.2, 0.8)]:
        for y in range(H):
            for x in range(W):
                d = ((x-cx)/rx)**2 + ((y-cy)/ry)**2 + nM(x/2, y/2)*0.35
                if d < 1 and g[y][x] in '.,:d' and not near_road(x, y, 0) and (x, y) not in spawn_adj.values(): g[y][x] = 'M'
    # --- woods: noise blobs (snow woods are pines)
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c not in '.,:': continue
            if near(x, y, 1) or near_road(x, y, 0) or y in (13, 17) and abs(x-29) <= 2: continue
            f = nF(x/3.4, y/3.4) + (0.12 if c == ',' else 0.06 if c == ':' else 0)
            if f > 0.13: g[y][x] = 't' if c == ',' else 'T'
    # --- rivers: meandering from the ranges to the sea (bridged where roads cross)
    rivers = [
        [(19, 13), (19, 12), (19, 11), (18, 11), (18, 10), (18, 9), (18, 8), (18, 7), (19, 7), (19, 6), (20, 6), (20, 5), (20, 4), (20, 3), (20, 2)],
        [(16, 17), (16, 18), (16, 19), (15, 19), (15, 20), (15, 21), (16, 21), (16, 22), (16, 23), (17, 23), (17, 24), (17, 25), (16, 25), (16, 26), (16, 27), (16, 28)],
        [(34, 17), (34, 18), (33, 18), (33, 19), (33, 20), (34, 20), (34, 21), (34, 22), (34, 23), (35, 23), (35, 24), (35, 25), (35, 26), (35, 27), (35, 28)],
    ]
    for path in rivers:
        for x, y in path:
            if g[y][x] == '~': break
            g[y][x] = '=' if (x, y) in road_tiles else 'r'
    # --- roads stay open (clear woods), POIs placed last
    for x, y in road_tiles:
        if g[y][x] in 'Tt': g[y][x] = ',' if g[y][x] == 't' else ('.' if y < 22 else ':' if 8 <= x <= 22 else '.')
        if g[y][x] == '~': g[y][x] = '='
    for k, (x, y) in spawn_adj.items():
        if g[y][x] not in '.,:d': g[y][x] = ',' if y < 14 and x >= 22 else '.'
    for k, (x, y) in pois.items(): g[y][x] = 'H' if k in ('haven', 'frost', 'mirewood') else 'D'
    for x in range(H): pass
    # --- checks
    walk = lambda c: c in '.,:d=HD'
    for (x, y) in road_tiles: assert walk(g[y][x]) or g[y][x] == 'B', ('road', x, y, g[y][x])
    for y in (14, 15, 16):
        assert g[y][29] == 'B' and all(c in 'MB~' for c in g[y]), y
    for y in list(range(9, 14)) + list(range(17, 23)): assert walk(g[y][29]), (29, y)
    for x in range(8, 13): assert walk(g[21][x])
    pas = lambda c: c in '.,:d=HD'
    start = spawn_adj['haven']
    open_ = bfs(g, start, pas)
    for k in ('haven', 'cavern', 'crypt', 'mirewood'): assert pois[k] in open_, k
    for k in ('frost', 'spire', 'storm'): assert pois[k] not in open_, 'gate leaks ' + k
    opened = bfs(g, start, lambda c: pas(c) or c == 'B')
    for k in pois: assert pois[k] in opened, k
    deco = {'ruins': [31, 24], 'ship': [[2.6, 23.4], [4.2, 25.6], [6.0, 27.8], [13.0, 28.5], [22.0, 28.4], [14.0, 28.6], [5.0, 28.2], [2.4, 28.4], [0.5, 26.0], [0.6, 22.0], [1.2, 21.6]]}
    rx, ry = deco['ruins']
    for x in (rx, rx+1): g[ry][x] = 'M'
    for x, y in deco['ship']: assert g[int(y)][int(x)] == '~', ('ship', x, y)
    return [''.join(row) for row in g], pois, spawn_adj, deco

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

world, pois, adj, deco = make_world(11)
crypt, cinfo = make_dungeon(100)
spire, sinfo = make_dungeon(300, 28, 18, 8, 5)
storm, stinfo = make_dungeon(500, 26, 18, 7, 4)
out = {'world': world, 'pois': pois, 'adj': adj, 'deco': deco, 'crypt': crypt, 'cryptInfo': cinfo, 'spire': spire, 'spireInfo': sinfo, 'storm': storm, 'stormInfo': stinfo}
js = '// GENERATED by tools/genmaps.py. Do not edit by hand.\nexport const GEN = ' + json.dumps(out, indent=1) + ';\n'
open('src/mapgen.js', 'w').write(js)
print('\n'.join(world)); print(); print('\n'.join(crypt)); print(cinfo); print(); print('\n'.join(spire)); print(sinfo); print(pois)
