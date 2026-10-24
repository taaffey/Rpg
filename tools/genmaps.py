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
    """Greenmarch, the Pint: the continent is a pint of lager seen from above (and nobody in Haven has noticed).
    Foam = the snowy north with its bubbles (islets), glass = the two coasts, beer = golden fields, dregs = the marsh in the
    bottom, handle = the sandy east loop around a lake. W x H = 36 x 44. Gameplay graph is unchanged: Haven (start), the Ashen
    Cavern, the marsh (Mirewood, crypt), a gated pass at x=24 through the ridge (rows 14-16), the north (Frostholm, Spire, Storm
    Cavern) and the optional Sunscar Ruins in the handle's sand."""
    W, H = 36, 44
    nC, nR, nF, nM = noise2(seed), noise2(seed+1), noise2(seed+2), noise2(seed+3)
    pois = {'haven': (10, 24), 'cavern': (19, 21), 'crypt': (11, 36), 'frost': (18, 8), 'spire': (24, 5), 'mirewood': (18, 35), 'storm': (12, 9)}
    spawn_adj = {'haven': (10, 25), 'cavern': (19, 22), 'crypt': (11, 37), 'frost': (18, 9), 'spire': (24, 6), 'mirewood': (18, 34), 'storm': (12, 10)}
    GX = 24  # the gated pass
    roads = [((10, 25), (10, 26)), ((10, 26), (24, 26)), ((19, 26), (19, 22)), ((11, 26), (11, 37)), ((18, 26), (18, 34)),
             ((24, 26), (24, 10)), ((24, 10), (18, 10)), ((18, 10), (18, 9)), ((24, 10), (24, 6)), ((18, 10), (12, 10)),
             ((24, 26), (24, 34)), ((24, 34), (29, 34))]
    road_tiles = set()
    for (x0, y0), (x1, y1) in roads:
        for x in range(min(x0, x1), max(x0, x1)+1): road_tiles.add((x, y0))
        for y in range(min(y0, y1), max(y0, y1)+1): road_tiles.add((x1, y))
    near = lambda x, y, d: any(abs(x-px) <= d and abs(y-py) <= d for px, py in list(pois.values()) + list(spawn_adj.values()))
    near_road = lambda x, y, d: any(abs(x-a) + abs(y-b) <= d for a, b in road_tiles)
    g = [['~']*W for _ in range(H)]
    # --- land: a tapering glass (rim at y~3, base at y~40) plus the handle ring on the east side
    gl = lambda y: 5 + (y-3) * (5/36)
    gr = lambda y: 28 - (y-3) * (5/36)
    for y in range(1, H-1):
        for x in range(1, W-1):
            top = 3.3 + nC(x/5, 0.5) * 1.3
            bottom = 40.2 + nC(x/4, 9) * 0.7
            inside = top <= y <= bottom and gl(y) + nC(0.3, y/6) * 0.9 <= x <= gr(y) + nC(2.7, y/6) * 0.9
            dx, dy = (x - 28.5) / 7.0, (y - 25.5) / 9.0
            ix, iy = (x - 28.5) / 3.1, (y - 25.5) / 5.6
            ring = dx*dx + dy*dy < 1 + nC(x/4, y/4) * 0.14 and ix*ix + iy*iy > 1 and x >= 22
            lake = ix*ix + iy*iy <= 1 and y > 17
            if (inside or ring) and not lake: g[y][x] = '.'
            if near(x, y, 1) or near_road(x, y, 0): g[y][x] = '.'
    for y in range(H):
        for x in range(W):
            if x in (0, W-1) or y in (0, H-1): g[y][x] = '~'
    # foam bubbles: little snowy islets that have floated off the top of the glass
    for x, y in [(8, 2), (9, 2), (9, 1), (14, 1), (15, 1), (15, 2), (21, 2), (22, 2), (22, 1), (27, 3), (28, 3), (28, 2), (4, 6), (3, 6), (3, 7)]: g[y][x] = ','
    # --- regions with ragged borders
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.': continue
            if y <= 13 and (x - 12.5) - (13 - y) * 0.15 + nR(x/3.5, y/3.5) * 3.0 > 0: g[y][x] = ','          # the foam
            elif y >= 31 and ((x-16.5)/8.8)**2 + ((y-36.2)/4.7)**2 + nR(x/3+7, y/3) * 0.5 < 1: g[y][x] = ':'  # the dregs
            elif y >= 20 and ((x-28.5)/9.8)**2 + ((y-29)/7.6)**2 + nR(x/3+3, y/3+9) * 0.45 < 1: g[y][x] = 'd'  # the sandy handle
    # --- the mountain wall with the gated pass at x=GX (rows 14-16), with ragged foothills on both sides
    for y in (14, 15, 16):
        for x in range(W):
            if g[y][x] != '~': g[y][x] = 'M'
    for x in range(W):
        for y, k in ((13, 0.15), (17, 0.1)):
            if g[y][x] in '.,' and nM(x/2.2, y) > k and abs(x-GX) > 1 and not near(x, y, 1) and not near_road(x, y, 0): g[y][x] = 'M'
    for y in (14, 15, 16): g[y][GX] = 'B'
    reserved = set()  # tiles that must stay open (the hermit's spot, the twin-peaks gift, the waterfall)
    gift, hermit = (7, 7), (10, 12)
    for dx in range(-1, 2):
        for dy in range(-1, 2): reserved.add((gift[0]+dx, gift[1]+dy))
    for dx in range(-1, 2):
        for dy in range(-1, 2): reserved.add((hermit[0]+dx, hermit[1]+dy))
    for cx, cy, rx_, ry_ in [(19, 20.4, 3.6, 2.0), (12.5, 7.2, 3.0, 2.0), (25.5, 3.0, 2.4, 1.7), (7.0, 19.0, 1.5, 2.4), (21.5, 31.0, 1.0, 0.8)]:
        for y in range(H):
            for x in range(W):
                d = ((x-cx)/rx_)**2 + ((y-cy)/ry_)**2 + nM(x/2, y/2) * 0.35
                if d < 1 and g[y][x] in '.,:d' and not near_road(x, y, 0) and (x, y) not in spawn_adj.values() and (x, y) not in reserved: g[y][x] = 'M'
    # twin peaks over the old kings' gift
    for x, y in [(gift[0]-1, gift[1]-2), (gift[0]+1, gift[1]-2), (gift[0]-1, gift[1]-3), (gift[0]+1, gift[1]-3)]:
        if g[y][x] != '~': g[y][x] = 'M'
    # --- woods: noise blobs (snow woods are pines)
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c not in '.,:': continue
            if near(x, y, 1) or near_road(x, y, 0) or (x, y) in reserved or (y in (13, 17) and abs(x-GX) <= 2): continue
            f = nF(x/3.4, y/3.4) + (-0.02 if c == ',' else 0.06 if c == ':' else 0)
            if f > 0.15: g[y][x] = 't' if c == ',' else 'T'
    # --- rivers (bridged where roads cross). North: ridge -> the foam's edge. South: ridge -> the marsh -> the bottom coast (a waterfall)
    rivers = [
        [(15, 13), (15, 12), (15, 11), (14, 11), (14, 10), (14, 9), (14, 8), (14, 7), (15, 7), (15, 6), (15, 5), (15, 4), (15, 3), (15, 2)],
        [(14, 17), (14, 18), (13, 18), (13, 19), (13, 20), (13, 21), (14, 21), (14, 22), (14, 23), (15, 23), (15, 24), (15, 25), (15, 26), (15, 27), (16, 27), (16, 28),
         (16, 29), (15, 29), (15, 30), (15, 31), (15, 32), (14, 32), (14, 33), (14, 34), (14, 35), (14, 36), (14, 37), (14, 38), (14, 39)],
    ]
    for path in rivers:
        for x, y in path:
            if g[y][x] == '~': break
            g[y][x] = '=' if (x, y) in road_tiles else 'r'
    wfx, wfy = 14, 39   # the waterfall: the south river drops off the sea cliff here
    for x, y in [(wfx-1, wfy), (wfx-2, wfy), (wfx-1, wfy-1), (wfx-2, wfy-1), (wfx-3, wfy)]:
        if g[y][x] != '~': g[y][x] = ':'
    # --- roads stay open (clear woods), POIs placed last
    for x, y in road_tiles:
        if g[y][x] in 'Tt': g[y][x] = ',' if g[y][x] == 't' else ('.' if y < 31 else ':')
        if g[y][x] == '~': g[y][x] = '='
        if g[y][x] == 'M': g[y][x] = '.'
    for k, (x, y) in spawn_adj.items():
        if g[y][x] not in '.,:d': g[y][x] = ',' if y < 14 and x >= 12 else '.'
    for k, (x, y) in pois.items(): g[y][x] = 'H' if k in ('haven', 'frost', 'mirewood') else 'D'
    for (x, y) in (gift, hermit):
        if g[y][x] in 'TtM~': g[y][x] = '.'
    # --- checks
    walk = lambda c: c in '.,:d=HD'
    for (x, y) in road_tiles: assert walk(g[y][x]) or g[y][x] == 'B', ('road', x, y, g[y][x])
    for y in (14, 15, 16):
        assert g[y][GX] == 'B' and all(c in 'MB~' for c in g[y]), y
    for y in list(range(9, 14)) + list(range(17, 27)): assert walk(g[y][GX]), (GX, y)
    pas = lambda c: c in '.,:d=HD'
    start = spawn_adj['haven']
    open_ = bfs(g, start, pas)
    for k in ('haven', 'cavern', 'crypt', 'mirewood'): assert pois[k] in open_, k
    for k in ('frost', 'spire', 'storm'): assert pois[k] not in open_, 'gate leaks ' + k
    opened = bfs(g, start, lambda c: pas(c) or c == 'B')
    for k in pois: assert pois[k] in opened, k
    assert gift in opened and hermit in opened and (wfx-1, wfy) in opened and walk(g[wfy][wfx-1]), 'secret spots unreachable'
    # the ship: a pedalo-sized boat paddling round the lake in the handle (art phase swaps the sprite)
    deco = {'ruins': [29, 33], 'ship': [[27.0, 22.6], [29.8, 22.8], [30.6, 25.6], [29.6, 28.6], [27.2, 28.8], [26.4, 25.6]],
            'gift': list(gift), 'hermit': list(hermit), 'waterfall': [wfx - 1, wfy], 'gate': [GX, 15],
            'amber': [18, 32]}  # the golden "beer" band of fields across the glass (painted by terrain.js on grass tiles)
    rx, ry = deco['ruins']
    for x in (rx, rx+1): g[ry][x] = 'M'
    # the left half of the ruins is the doorway of the optional Sunscar Ruins dungeon (added after generation so nothing else moves)
    g[ry][rx] = 'D'; pois['ruins'] = (rx, ry); spawn_adj['ruins'] = (rx, ry+1)
    assert walk(g[ry+1][rx]) and (rx, ry+1) in bfs(g, start, pas), 'ruins door unreachable before the gate'
    for x, y in deco['ship']: assert g[int(y)][int(x)] == '~', ('ship', x, y, g[int(y)][int(x)])
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
ruins, rinfo = make_dungeon(700, 26, 18, 7, 5)
out = {'world': world, 'pois': pois, 'adj': adj, 'deco': deco, 'crypt': crypt, 'cryptInfo': cinfo, 'spire': spire, 'spireInfo': sinfo, 'storm': storm, 'stormInfo': stinfo, 'ruins': ruins, 'ruinsInfo': rinfo}
js = '// GENERATED by tools/genmaps.py. Do not edit by hand.\nexport const GEN = ' + json.dumps(out, indent=1) + ';\n'
open('src/mapgen.js', 'w').write(js)
print('\n'.join(world)); print(); print('\n'.join(crypt)); print(cinfo); print(); print('\n'.join(spire)); print(sinfo); print(pois); print(); print('\n'.join(ruins)); print(rinfo)
