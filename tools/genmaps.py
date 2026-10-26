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
    """Greenmarch: an archipelago of four big single-biome landmasses (112 x 84), so crossing the world feels like a journey.
    Haven Isle (grassland, start, the Ashen Cavern and Storm Cavern), Mire Isle (swamp: Mirewood, the Crypt), Sunscar Isle (desert:
    the ruins) and Frost Isle (snow: Frostholm, the Spire). Narrow causeways join them; the one to Frost Isle is the gated pass."""
    import heapq
    K = 1.5; S = lambda v: int(round(v * K)); S2 = lambda p: (S(p[0]), S(p[1]))
    W, H = S(112), S(84)
    nC, nR, nF, nM = noise2(seed), noise2(seed+1), noise2(seed+2), noise2(seed+3)
    isles = [(c, S(a), S(b), a2 * K, b2 * K) for c, a, b, a2, b2 in [('.', 36, 53, 28, 22), (':', 86, 62, 20, 16), ('d', 98, 35, 15, 11), (',', 50, 16, 30, 13)]]
    isles.append(('.', 147, 19, 19, 12))  # Hopsend Isle (absolute coords): the autumn island of the far north-east, reached by ferry
    isles.append(('.', 14, 22, 12, 20))  # Cinder Isle (absolute coords): the volcanic island of the far north-west, reached by ferry after the Titan
    pois = {k: S2(v) for k, v in {'haven': (22, 56), 'cavern': (46, 47), 'storm': (28, 15), 'mirewood': (78, 58), 'crypt': (92, 68), 'frost': (46, 14), 'spire': (68, 10)}.items()}
    ruins = S2((100, 38))
    # wayside places: small stops dotted across the islands (interiors in maps.js). name -> base-grid guess; snapped to land below
    extras = {'chippy': (40, 63, '.'), 'stones': (15, 64, '.'), 'bogshed': (84, 71, ':'), 'oasis': (108, 30, 'd'), 'lodge': (40, 8, ','), 'shed': (60, 22, ','),
              'hopsend': (146, 18, '.', 1), 'brewery': (156, 22, '.', 1), 'dock_h': (141, 29, '.', 1), 'dock_s': (146, 40, 'd', 1),
              'windmill': (30, 48, '.'), 'wreck': (80, 52, ':'), 'pyramid': (95, 36, 'd'), 'icecave': (70, 24, ','),
              'kilnhaven': (14, 14, '.', 1), 'pizzaoven': (14, 29, '.', 1), 'dock_e': (14, 38, '.', 1), 'dock_f': (33, 24, ',', 1)}
    spawn_adj = {k: (x, y+1) for k, (x, y) in pois.items()}
    gift, hermit = S2((27, 11)), S2((36, 18))
    GX = S(58)
    g = [['~']*W for _ in range(H)]
    for ch, cx, cy, rx, ry in isles:
        for y in range(1, H-1):
            for x in range(1, W-1):
                d = ((x-cx)/rx)**2 + ((y-cy)/ry)**2 + nC(x/10, y/10) * 0.2 + nC(x/24+40, y/24) * 0.45 + nC(x/5, y/5) * 0.05
                if d < 1: g[y][x] = ch
    # causeways: Haven->Mire, Mire->Sunscar (both open from the start), Haven->Frost (the gated pass, x = GX)
    for y in range(S(58), S(58) + 4):
        for x in range(S(60), S(69)): g[y][x] = ':'
    for y in range(S(43), S(49)):
        for x in range(S(91), S(91) + 4): g[y][x] = 'd' if y < S(45) else ':'
    for y in range(S(28), S(40)):
        for x in (GX-1, GX, GX+1): g[y][x] = ',' if y < S(34) else '.'
    taken = list(pois.values()) + [ruins, gift, hermit]
    for k, v in extras.items():  # snap each wayside place to the nearest solid land tile (2 tiles of land around, clear of other places)
        cx0, cy0 = (v[0], v[1]) if len(v) > 3 else S2(v[:2]); best = None; bio = v[2]; dock = k.startswith('dock')
        for r in range(0, 14):
            for yy in range(cy0-r, cy0+r+1):
                for xx in range(cx0-r, cx0+r+1):
                    if max(abs(xx-cx0), abs(yy-cy0)) != r: continue
                    if all(0 <= xx+i < W and 0 <= yy+j < H and g[yy+j][xx+i] == bio for i in ((-1, 0, 1) if dock else (-2, -1, 0, 1, 2)) for j in ((0, 1) if dock else (-1, 0, 1, 2))) and all(abs(xx-a) + abs(yy-b) > (3 if dock else 7) for a, b in taken):
                        best = (xx, yy); break
                if best: break
            if best: break
        assert best, ('no land for', k)
        pois[k] = best; taken.append(best)
    spawn_adj = {k: (x, y+1) for k, (x, y) in pois.items()}
    for (x, y) in list(pois.values()) + list(spawn_adj.values()) + [ruins, (ruins[0], ruins[1]+1), gift, hermit]:
        assert g[y][x] != '~', ('poi on water', x, y)
    land = lambda x, y: 0 <= x < W and 0 <= y < H and g[y][x] != '~'
    near = lambda x, y, d: any(abs(x-px) <= d and abs(y-py) <= d for px, py in list(pois.values()) + list(spawn_adj.values()) + [ruins, (ruins[0], ruins[1]+1)])
    # --- roads: winding cheapest paths between the places (these tiles stay clear of mountains and woods)
    def path(a, b):
        dist = {a: 0}; prev = {}; pq = [(0, a)]
        while pq:
            dd, (x, y) = heapq.heappop(pq)
            if (x, y) == b: break
            if dd > dist[(x, y)]: continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                n = (x+dx, y+dy)
                if not land(*n): continue
                c = dd + 1 + abs(nR(n[0]/3.5, n[1]/3.5)) * 2.6
                if c < dist.get(n, 1e9): dist[n] = c; prev[n] = (x, y); heapq.heappush(pq, (c, n))
        out = [b]
        while out[-1] != a: out.append(prev[out[-1]])
        return out
    A = spawn_adj
    gate_s, gate_n = (GX, S(39)), (GX, S(28))
    links = [(A['haven'], A['cavern']), (gate_n, A['storm']), (gate_n, hermit), (hermit, gift), (A['haven'], gate_s), (gate_s, gate_n), (gate_n, A['frost']),
             (A['frost'], A['spire']), (A['haven'], (S(61), S(59))), ((S(68), S(59)), A['mirewood']), (A['mirewood'], A['crypt']), (A['mirewood'], (S(92), S(48))), ((S(92), S(43)), (ruins[0], ruins[1]+1)),
             (A['haven'], A['chippy']), (A['cavern'], A['chippy']), (A['haven'], A['stones']), (A['mirewood'], A['bogshed']), ((ruins[0], ruins[1]+1), A['oasis']), (A['kilnhaven'], A['pizzaoven']), (A['kilnhaven'], A['dock_e']), (A['frost'], A['dock_f']), (A['haven'], A['windmill']), (A['mirewood'], A['wreck']), ((ruins[0], ruins[1]+1), A['pyramid']), (A['frost'], A['icecave']), (A['hopsend'], A['brewery']), (A['hopsend'], A['dock_h']), ((ruins[0], ruins[1]+1), A['dock_s']), (A['frost'], A['lodge']), (A['frost'], A['shed']), (A['spire'], A['shed'])]
    road = set()
    for a, b in links:
        for t in path(a, b): road.add(t)
    # --- regions' reliefs: mountain blobs (cx, cy, rx, ry), never on roads, places or reserved spots
    reserved = {(gift[0]+dx, gift[1]+dy) for dx in range(-1, 2) for dy in range(-1, 2)} | {(hermit[0]+dx, hermit[1]+dy) for dx in range(-1, 2) for dy in range(-1, 2)}
    blobs0 = [(46, 45, 5, 3), (30, 66, 5, 3), (54, 60, 3, 5), (20, 70, 3, 2), (14, 52, 2.5, 3), (40, 36, 5, 2.5), (60, 44, 3, 3),
             (56, 36, 4, 2), (60, 31, 2.6, 2),                       # either end of the pass
             (68, 18, 7, 3), (82, 12, 5, 4), (40, 22, 6, 2.2), (58, 8, 4, 2.5), (33, 10, 4, 3), (74, 24, 3, 2),   # Frost Isle
             (86, 58, 4, 3), (96, 72, 5, 3), (74, 70, 4, 3), (92, 56, 3, 2),                                       # Mire Isle (rocks in the bog)
             (98, 32, 5, 3), (90, 38, 3, 2), (106, 40, 3, 3), (104, 30, 3, 2)]                                      # Sunscar mesas
    blobs = [(S(a), S(b), c * K, d * K) for a, b, c, d in blobs0]
    blobs += [(138, 27, 4, 2.5), (158, 11, 4, 2.5)]  # hills on Hopsend Isle
    blobs += [(S(a) + 9, S(b) - 5, c * K * 0.7, d * K * 0.7) for a, b, c, d in blobs0[::3]]  # more foothills
    for cx, cy, rx_, ry_ in blobs:
        for y in range(int(cy-ry_-2), int(cy+ry_+3)):
            for x in range(int(cx-rx_-2), int(cx+rx_+3)):
                if not land(x, y) or (x, y) in road or (x, y) in reserved or near(x, y, 1): continue
                if ((x-cx)/rx_)**2 + ((y-cy)/ry_)**2 + nM(x/2.6, y/2.6) * 0.35 < 1: g[y][x] = 'M'
    # twin peaks above the old kings' gift
    for x, y in [(gift[0]-1, gift[1]-3), (gift[0]+1, gift[1]-3), (gift[0]-1, gift[1]-2), (gift[0]+1, gift[1]-2)]:
        if (x, y) not in road and land(x, y): g[y][x] = 'M'
    # walls on both sides of the gated pass
    for y in range(S(32), S(37)):
        for x in (GX-1, GX+1): g[y][x] = 'M'
    for y in range(S(33), S(36)): g[y][GX] = 'B'
    # --- woods
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c not in '.,:' or (x, y) in road or (x, y) in reserved or near(x, y, 1): continue
            f = nF(x/4.8, y/4.8) + (-0.02 if c == ',' else 0.05 if c == ':' else 0)
            if f > 0.17: g[y][x] = 't' if c == ',' else 'T'
    # --- rivers: wander from a source to the sea; bridged where a road crosses
    def river(src, dirv, maxn=160):
        x, y = src; out = []
        for k in range(maxn):
            if not land(x, y): break
            if g[y][x] in 'HD' or near(x, y, 1): break
            out.append((x, y))
            wob = nR(x/5, y/5 + k/9)
            if abs(dirv[0]) > abs(dirv[1]):
                x += dirv[0] if (wob > -0.15 or k % 3) else 0; y += (1 if wob > 0.25 else -1 if wob < -0.25 else 0)
            else:
                y += dirv[1] if (wob > -0.15 or k % 3) else 0; x += (1 if wob > 0.25 else -1 if wob < -0.25 else 0)
        return out
    rivs = [river(S2(a), d) for a, d in (((34, 40), (0, 1)), ((20, 58), (-1, 0)), ((62, 24), (0, -1)), ((84, 51), (0, 1)), ((72, 20), (0, 1)), ((98, 66), (1, 0)))]
    # the south-bound Haven river drops off the sea cliff: that is Redwake's waterfall
    big = river(S2((38, 44)), (0, 1)); rivs.append(big)
    wf = None
    for path_ in rivs:
        for x, y in path_:
            if g[y][x] in 'MBHD': continue
            g[y][x] = '=' if (x, y) in road else 'r'
    wf = max(big, key=lambda t: t[1]) if big else None
    # secret spot: the land tile beside the river mouth; reserve it
    while wf and not (land(wf[0]-1, wf[1]) and g[wf[1]][wf[0]-1] in '.:' and (wf[0]-1, wf[1]) not in road):
        big.remove(wf); wf = max(big, key=lambda t: t[1])
    wfs = (wf[0]-1, wf[1]); g[wfs[1]][wfs[0]] = '.' if g[wfs[1]][wfs[0]] != ':' else ':'
    for x, y in path(A['haven'], wfs):  # a trail down to the falls (bridged over the river)
        road.add((x, y))
        if g[y][x] == 'r': g[y][x] = '='
    # --- roads open, places last
    for x, y in road:
        if g[y][x] in 'TtM': g[y][x] = {'.': '.', ',': ','}.get('.', '.')
        if g[y][x] in 'Tt': pass
    for x, y in road:
        if g[y][x] in 'TtM':
            g[y][x] = '.'
    for ch, cx, cy, rx, ry in isles: pass
    # fix road tiles to the biome of their island (the blobs may have left grass in snow etc.)
    for x, y in road:
        if g[y][x] == '.':
            g[y][x] = '.' if (x >= 127 and y <= 34) or (x <= 27 and y <= 46) else ',' if y < S(30) and x < 125 else ':' if x > S(62) and y > S(46) else 'd' if x > S(82) and y < S(46) else '.'
        elif g[y][x] == ',' and y > S(29): g[y][x] = '.'
    for y in range(S(33), S(36)): g[y][GX] = 'B'
    for k, (x, y) in spawn_adj.items():
        if g[y][x] not in '.,:d=': g[y][x] = g[y][x] if g[y][x] in '.,:d' else '.'
    for k, (x, y) in pois.items(): g[y][x] = 'H' if k in ('haven', 'frost', 'mirewood') else 'D'
    for (x, y) in (gift, hermit):
        if g[y][x] in 'TtM~r': g[y][x] = '.'
    # ruins door (left half of a little ruin; the right half is rubble)
    rx_, ry_ = ruins; g[ry_][rx_] = 'D'; g[ry_][rx_+1] = 'M'; pois['ruins'] = ruins; spawn_adj['ruins'] = (rx_, ry_+1)
    # --- checks
    walk = lambda c: c in '.,:d=HD'
    open_ = bfs(g, spawn_adj['haven'], walk)
    for k in ('haven', 'cavern', 'crypt', 'mirewood', 'ruins', 'chippy', 'stones', 'bogshed', 'oasis', 'dock_s', 'windmill', 'wreck', 'pyramid'): assert pois[k] in open_, ('closed', k)
    for k in ('frost', 'spire', 'storm', 'lodge', 'shed', 'dock_f', 'icecave'): assert pois[k] not in open_, 'gate leaks ' + k
    opened = bfs(g, spawn_adj['haven'], lambda c: walk(c) or c == 'B')
    isle5 = ('hopsend', 'brewery', 'dock_h', 'kilnhaven', 'pizzaoven', 'dock_e')
    for k in pois:
        if k not in isle5: assert pois[k] in opened, ('after gate', k)
    open5 = bfs(g, spawn_adj['dock_h'], walk)
    for k in isle5[:3]: assert pois[k] in open5, ('isle5', k)
    open6 = bfs(g, spawn_adj['dock_e'], walk)
    for k in isle5[3:]: assert pois[k] in open6, ('isle6', k)
    assert pois['dock_s'] in open_, 'dock_s'
    assert wfs in open_ and gift in opened and hermit in opened and gift not in open_, 'secret spots'
    for y in range(S(33), S(36)): assert g[y][GX] == 'B'
    deco = {'ruins': list(ruins), 'ship': [[3, S(38)], [6, S(50)], [3, S(66)], [6, S(52)]], 'gift': list(gift), 'hermit': list(hermit), 'waterfall': list(wfs), 'gate': [GX, S(34)],
            'plainsY': S(47), 'autumn': [123, 2, 169, 36], 'ember': [0, 0, 28, 46]}
    for x, y in deco['ship']: assert g[y][x] == '~'
    return [''.join(row) for row in g], pois, spawn_adj, deco

def make_world_ref(seed):
    """Greenmarch v4: the world follows tools/world_land.txt (a land/sea mask traced from the 'Realm of Valoran' style reference): one big
    continent with a frozen north, a desert north-east, a dark marsh south-east, a jungle in the south, central mountains and lakes,
    plus outlying islands (the volcano Cinder Isle in the north-west, Hopsend Isle in the south-west, an obsidian isle in the south-east).
    168 x 126 tiles. A per-tile region grid (deco.reg) marks the digits 4 autumn, 5 ember, 6 jungle on top of the tile characters."""
    import heapq
    rows = [l.rstrip('\n') for l in open('tools/world_land.txt')]
    H, W = len(rows), len(rows[0])
    nC, nR, nF, nM = noise2(seed), noise2(seed+1), noise2(seed+2), noise2(seed+3)
    g = [['.' if c == '#' else '~' for c in r] for r in rows]
    for y in range(64, 100):  # a winding channel splits the south-west lobe off as Hopsend Isle
        cx = 41 + int(round(nM(y/6, 3) * 2))
        for x in (cx, cx + 1): g[y][x] = '~'
    for y in range(62, 68):  # an isthmus joins the south-east marsh to the north-eastern desert (the desert must be reachable before the northern pass opens)
        for x in range(134, 148): g[y][x] = '.'
    reg = [['0']*W for _ in range(H)]
    cinder = lambda x, y: x <= 42 and y <= 42
    hops = lambda x, y: x <= 40 and 66 <= y <= 97
    obsid = lambda x, y: x >= 138 and y >= 96
    nB = lambda x, y: nR(x/13 + 3, y/13) * 7 + nR(x/5, y/5 + 9) * 2
    ridge = lambda x: 39 + int(round(nM(x/9, 7) * 3.5))  # the line of the northern mountain range (the frozen north lies above it)
    xr = lambda y: 107 + int(round(nM(7, y/8) * 3))        # the line of the ridge between the snow and the desert
    for y in range(H):
        for x in range(W):
            if g[y][x] != '.': continue
            b = nB(x, y)
            if cinder(x, y): reg[y][x] = '5'
            elif hops(x, y): reg[y][x] = '4'
            elif obsid(x, y): g[y][x] = ':'; reg[y][x] = '5'
            elif 43 <= x + b * 0.4 <= xr(y) - 1 and y <= ridge(x) - 2 + b * 0.25: g[y][x] = ','
            elif x + b * 1.3 >= xr(y) + 2 and y <= 64 + b * 1.1: g[y][x] = 'd'
            elif ((x - 126) / 29) ** 2 + ((y - 86) / 27) ** 2 + b * 0.035 < 1 and x + b * 0.9 >= 98 and not (x >= 108 and y <= 60): g[y][x] = ':'
            elif ((x - 80) / 25) ** 2 + ((y - 102) / 23) ** 2 + b * 0.025 < 1 and y >= 76: reg[y][x] = '6'
    land = lambda x, y: 0 <= x < W and 0 <= y < H and g[y][x] != '~'
    GX = 80
    pois = {}
    want = {  # name: (x, y, tile char it must stand on, region digit or None)
        'haven': (48, 67, '.', '0'), 'cavern': (70, 54, '.', '0'), 'storm': (100, 26, ',', None), 'mirewood': (118, 92, ':', None),
        'crypt': (128, 68, ':', None), 'frost': (60, 22, ',', None), 'spire': (85, 12, ',', None), 'chippy': (53, 102, '.', '0'),
        'stones': (72, 70, '.', '0'), 'bogshed': (84, 92, '.', '6'), 'oasis': (148, 50, 'd', None), 'lodge': (75, 20, ',', None),
        'shed': (96, 18, ',', None), 'hopsend': (20, 80, '.', '4'), 'brewery': (30, 88, '.', '4'), 'dock_h': (37, 82, '.', '4'),
        'dock_s': (45, 82, '.', '0'), 'kilnhaven': (19, 22, '.', '5'), 'pizzaoven': (17, 11, '.', '5'), 'dock_e': (24, 28, '.', '5'),
        'dock_f': (47, 33, ',', None), 'windmill': (58, 70, '.', '0'), 'wreck': (112, 100, ':', None), 'pyramid': (150, 40, 'd', None),
        'icecave': (66, 14, ',', None), 'ruins': (136, 22, 'd', None)}
    gift, hermit = (50, 23), (74, 30)
    taken = [gift, hermit]
    def snap(k, x0, y0, bio, rg):
        dock = k.startswith('dock')
        for r in range(0, 16):
            for yy in range(y0-r, y0+r+1):
                for xx in range(x0-r, x0+r+1):
                    if max(abs(xx-x0), abs(yy-y0)) != r: continue
                    if all(land(xx+i, yy+j) and g[yy+j][xx+i] == bio and (rg is None or reg[yy+j][xx+i] == rg) for i in ((-1, 0, 1) if dock else (-2, -1, 0, 1, 2)) for j in ((0, 1) if dock else (-1, 0, 1, 2))) and all(abs(xx-a) + abs(yy-b) > (3 if dock else 7) for a, b in taken):
                        return (xx, yy)
        raise AssertionError(('no land for', k))
    for k, (x0, y0, bio, rg) in want.items():
        p = snap(k, x0, y0, bio, rg); pois[k] = p; taken.append(p)
    spawn_adj = {k: (x, y+1) for k, (x, y) in pois.items()}
    A = spawn_adj
    # --- roads: winding cheapest paths between the places
    def path(a, b):
        dist = {a: 0}; prev = {}; pq = [(0, a)]
        while pq:
            dd, (x, y) = heapq.heappop(pq)
            if (x, y) == b: break
            if dd > dist[(x, y)]: continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                n = (x+dx, y+dy)
                if not land(*n): continue
                c = dd + 1 + abs(nR(n[0]/3.5, n[1]/3.5)) * 2.6
                if c < dist.get(n, 1e9): dist[n] = c; prev[n] = (x, y); heapq.heappush(pq, (c, n))
        out = [b]
        while out[-1] != a: out.append(prev[out[-1]])
        return out
    # the wall between the north (snow) and the rest: a mountain band with the gated pass (B) at x = GX, and one between the snow and the desert
    wall = set()
    for x in range(40, 108):
        for y in range(ridge(x) - 2, ridge(x) + 3): wall.add((x, y))
    for y in range(3, 46):
        for x in range(xr(y) - 1, xr(y) + 2): wall.add((x, y))
    gate_cells = [(GX, ridge(GX) + k) for k in (-1, 0, 1)]
    gate_s, gate_n = (GX, ridge(GX) + 5), (GX, ridge(GX) - 5)
    for y in range(ridge(GX) - 4, ridge(GX) + 5): wall.discard((GX, y))
    # nothing but the pass may cross the wall: roads that need to cross it are routed through the gate
    def land_nowall(x, y): return land(x, y) and (x, y) not in wall
    links_main = [('haven', 'cavern'), ('haven', 'windmill'), ('haven', 'stones'), ('haven', 'chippy'), ('haven', 'dock_s'), ('cavern', 'mirewood'), ('mirewood', 'crypt'), ('mirewood', 'wreck'),
                  ('mirewood', 'bogshed'), ('crypt', 'pyramid'), ('pyramid', 'ruins'), ('pyramid', 'oasis'), ('cavern', 'gate_s')]
    links_north = [('gate_n', 'frost'), ('frost', 'spire'), ('gate_n', 'storm'), ('frost', 'lodge'), ('lodge', 'shed'), ('frost', 'icecave'), ('frost', 'dock_f'), ('gate_n', 'hermit'), ('hermit', 'gift')]
    links_isle = [('hopsend', 'brewery'), ('hopsend', 'dock_h'), ('kilnhaven', 'pizzaoven'), ('kilnhaven', 'dock_e')]
    pt = lambda k: {'gate_s': gate_s, 'gate_n': gate_n, 'hermit': hermit, 'gift': gift}.get(k) or A[k]
    road = set()
    def carve(a, b, allow):
        saved = land
        for t in path_with(a, b, allow): road.add(t)
    def path_with(a, b, allow):
        dist = {a: 0}; prev = {}; pq = [(0, a)]
        while pq:
            dd, (x, y) = heapq.heappop(pq)
            if (x, y) == b: break
            if dd > dist[(x, y)]: continue
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                n = (x+dx, y+dy)
                if not allow(*n): continue
                c = dd + 1 + abs(nR(n[0]/3.5, n[1]/3.5)) * 2.6
                if c < dist.get(n, 1e9): dist[n] = c; prev[n] = (x, y); heapq.heappush(pq, (c, n))
        assert b in dist, ('no road', a, b)
        out = [b]
        while out[-1] != a: out.append(prev[out[-1]])
        return out
    south_ok = lambda x, y: land(x, y) and y > 41 and not (x >= 108 and y <= 44 and False)
    for a, b in links_main: carve(pt(a), pt(b), lambda x, y: land(x, y) and (x, y) not in wall or (x, y) == gate_s)
    north_ok = lambda x, y: land(x, y) and y <= ridge(x) - 2 and x < xr(y)
    for a, b in links_north: carve(pt(a), pt(b), north_ok)
    for a, b in links_isle: carve(pt(a), pt(b), lambda x, y: land(x, y) and ((x <= 40) if a in ('hopsend',) else (x <= 42)))
    # the road across the pass
    for y in range(ridge(GX) - 5, ridge(GX) + 6): road.add((GX, y))
    # --- apply the wall (walkable only at the gate column), mountains, woods
    for (x, y) in wall:
        if land(x, y) and (x, y) not in road: g[y][x] = 'M'
    for (x, y) in gate_cells: g[y][x] = 'B'
    reserved = {(gift[0]+dx, gift[1]+dy) for dx in range(-1, 2) for dy in range(-1, 2)} | {(hermit[0]+dx, hermit[1]+dy) for dx in range(-1, 2) for dy in range(-1, 2)}
    near = lambda x, y, d: any(abs(x-px) <= d and abs(y-py) <= d for px, py in list(pois.values()) + list(spawn_adj.values()))
    blobs = [(82, 50, 14, 8), (70, 45, 6, 4), (92, 56, 5, 4), (52, 89, 7, 5), (28, 60, 5, 4), (112, 26, 2.5, 9), (62, 18, 8, 6), (85, 24, 10, 5), (95, 12, 6, 4), (72, 9, 6, 3), (55, 10, 5, 4),
             (125, 25, 6, 4), (140, 38, 6, 4), (130, 52, 5, 4), (152, 26, 5, 4), (125, 80, 6, 5), (112, 70, 4, 4), (140, 90, 5, 4), (68, 100, 5, 4), (17, 8, 6, 4), (28, 26, 4, 5), (24, 72, 4, 3), (45, 100, 5, 4), (100, 110, 4, 3)]
    for cx, cy, rx_, ry_ in blobs:
        for y in range(int(cy-ry_-2), int(cy+ry_+3)):
            for x in range(int(cx-rx_-2), int(cx+rx_+3)):
                if not land(x, y) or (x, y) in road or (x, y) in reserved or near(x, y, 1) or g[y][x] == 'B': continue
                if ((x-cx)/rx_)**2 + ((y-cy)/ry_)**2 + nM(x/2.6, y/2.6) * 0.35 < 1: g[y][x] = 'M'
    for x, y in [(gift[0]-1, gift[1]-3), (gift[0]+1, gift[1]-3), (gift[0]-1, gift[1]-2), (gift[0]+1, gift[1]-2)]:
        if (x, y) not in road and land(x, y) and g[y][x] != 'B': g[y][x] = 'M'
    for y in range(H):
        for x in range(W):
            c = g[y][x]
            if c not in '.,:' or (x, y) in road or (x, y) in reserved or near(x, y, 1): continue
            f = nF(x/4.8, y/4.8) + (-0.02 if c == ',' else 0.05 if c == ':' else 0) + (0.30 if reg[y][x] == '6' else 0)
            if f > 0.17: g[y][x] = 't' if c == ',' else 'T'
    # --- rivers (bridged where a road crosses)
    def river(src, dirv, maxn=200):
        x, y = src; out = []
        for k in range(maxn):
            if not land(x, y) or g[y][x] in 'MBHD' or near(x, y, 1) or (x, y) in wall: break
            out.append((x, y)); wob = nR(x/5, y/5 + k/9)
            if abs(dirv[0]) > abs(dirv[1]):
                x += dirv[0] if (wob > -0.15 or k % 3) else 0; y += (1 if wob > 0.25 else -1 if wob < -0.25 else 0)
            else:
                y += dirv[1] if (wob > -0.15 or k % 3) else 0; x += (1 if wob > 0.25 else -1 if wob < -0.25 else 0)
        return out
    big = river((64, 78), (0, 1))
    rivs = [big, river((66, 52), (-1, 0)), river((80, 34), (0, -1)), river((96, 44), (1, 0)), river((118, 75), (0, 1)), river((74, 78), (0, 1)), river((122, 30), (0, 1)), river((90, 12), (0, -1))]
    for path_ in rivs:
        for x, y in path_:
            if g[y][x] in 'MBHD': continue
            g[y][x] = '=' if (x, y) in road else 'r'
    # Redwake's waterfall: where the big south-flowing river meets the sea; the dig spot is the land tile beside it
    wf = max(big, key=lambda t: t[1]); cand = sorted(big, key=lambda t: -t[1])
    wfs = None
    for (x, y) in cand:
        for dx in (-1, 1):
            if land(x+dx, y) and g[y][x+dx] in '.:T' and (x+dx, y) not in road and reg[y][x+dx] in '06': wfs = (x+dx, y); break
        if wfs: break
    assert wfs, 'no waterfall spot'
    g[wfs[1]][wfs[0]] = '.' if g[wfs[1]][wfs[0]] != ':' else ':'
    for t in path_with(A['haven'], wfs, lambda x, y: land(x, y) and (x, y) not in wall and y > 41): road.add(t)
    for x, y in path_with(A['haven'], wfs, lambda x, y: land(x, y) and (x, y) not in wall and y > 41):
        if g[y][x] == 'r': g[y][x] = '='
    for x, y in road:
        if g[y][x] in 'TtM': g[y][x] = ',' if g[y][x] == 't' or (y <= ridge(x) - 2 and 43 <= x < xr(y)) else '.'
        if g[y][x] == '.' and False: pass
    for k, (x, y) in spawn_adj.items():
        if g[y][x] in 'TtMr~': g[y][x] = {'.': '.', ',': ',', ':': ':', 'd': 'd'}.get(g[pois[k][1]][pois[k][0]], '.')
    for k, (x, y) in pois.items(): g[y][x] = 'H' if k in ('haven', 'frost', 'mirewood', 'hopsend', 'kilnhaven') else 'D'
    for (x, y) in (gift, hermit):
        if g[y][x] in 'TtM~r': g[y][x] = ','
    ru = pois['ruins']; g[ru[1]][ru[0]+1] = 'M'
    # --- checks
    walk = lambda c: c in '.,:d=HD'
    open_ = bfs(g, spawn_adj['haven'], walk)
    for k in ('haven', 'cavern', 'crypt', 'mirewood', 'ruins', 'chippy', 'stones', 'bogshed', 'oasis', 'dock_s', 'windmill', 'wreck', 'pyramid'): assert pois[k] in open_, ('closed', k)
    for k in ('frost', 'spire', 'storm', 'lodge', 'shed', 'dock_f', 'icecave'): assert pois[k] not in open_, 'gate leaks ' + k
    opened = bfs(g, spawn_adj['haven'], lambda c: walk(c) or c == 'B')
    isle = ('hopsend', 'brewery', 'dock_h', 'kilnhaven', 'pizzaoven', 'dock_e')
    for k in pois:
        if k not in isle: assert pois[k] in opened, ('after gate', k)
    for k in isle[:3]: assert pois[k] in bfs(g, spawn_adj['dock_h'], walk), ('isle h', k)
    for k in isle[3:]: assert pois[k] in bfs(g, spawn_adj['dock_e'], walk), ('isle e', k)
    assert wfs in open_ and gift in opened and hermit in opened and gift not in open_, 'secret spots'
    for (x, y) in gate_cells: assert g[y][x] == 'B'
    ship = [[8, 100], [10, 112], [20, 118], [8, 106]]
    deco = {'ruins': list(ru), 'ship': ship, 'gift': list(gift), 'hermit': list(hermit), 'waterfall': list(wfs), 'gate': [GX, ridge(GX)],
            'reg': [''.join(r) for r in reg], 'roads': sorted([x, y] for x, y in road if g[y][x] in '.,:d')}
    for x, y in deco['ship']: assert g[y][x] == '~', ('ship', x, y)
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

world, pois, adj, deco = make_world_ref(11)
crypt, cinfo = make_dungeon(100)
spire, sinfo = make_dungeon(300, 28, 18, 8, 5)
storm, stinfo = make_dungeon(500, 26, 18, 7, 4)
ruins, rinfo = make_dungeon(700, 26, 18, 7, 5)
brewery, binfo = make_dungeon(900, 30, 20, 8, 5)
pizzaoven, pinfo = make_dungeon(1100, 32, 20, 9, 5)
windmill, wminfo = make_dungeon(1300, 24, 16, 6, 5)
wreck, wrinfo = make_dungeon(1500, 28, 18, 7, 5)
pyramid, pyinfo = make_dungeon(1700, 28, 18, 8, 5)
icecave, icinfo = make_dungeon(1900, 28, 18, 8, 5)
out = {'world': world, 'pois': pois, 'adj': adj, 'deco': deco, 'crypt': crypt, 'cryptInfo': cinfo, 'spire': spire, 'spireInfo': sinfo, 'storm': storm, 'stormInfo': stinfo, 'ruins': ruins, 'ruinsInfo': rinfo, 'brewery': brewery, 'breweryInfo': binfo, 'pizzaoven': pizzaoven, 'pizzaovenInfo': pinfo, 'windmill': windmill, 'windmillInfo': wminfo, 'wreck': wreck, 'wreckInfo': wrinfo, 'pyramid': pyramid, 'pyramidInfo': pyinfo, 'icecave': icecave, 'icecaveInfo': icinfo}
js = '// GENERATED by tools/genmaps.py. Do not edit by hand.\nexport const GEN = ' + json.dumps(out, indent=1) + ';\n'
open('src/mapgen.js', 'w').write(js)
print('\n'.join(world)); print(); print('\n'.join(crypt)); print(cinfo); print(); print('\n'.join(spire)); print(sinfo); print(pois); print(); print('\n'.join(ruins)); print(rinfo)
