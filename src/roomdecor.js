// ===== Themed interiors: which decor kinds each theme swaps in (data only, no canvas). Positions stay exactly where interior() put
// them, so reachability is unchanged; a few extras sit in corners and rows no NPC, chest or doorway path can need. =====
// themeDecor(theme, kind, decor, id) -> new decor list. Kinds the theme does not rename (bed, table, counter, anvil...) are drawn
// in the theme's own style by roomart2.js.
const swap = (decor, f) => decor.map(([x, y, k]) => [x, y, f(x, y, k) || k]);
const at = (m) => (x, y, k) => m[`${k}${x},${y}`] || m[k];
export function themeDecor(theme, kind, decor, id = '') {
  const L = {
    chippy: () => swap(decor, at({ 'shelf1,1': 'fridge', 'shelf2,1': 'jar', 'shelf3,1': 'vinegar', 'shelf7,1': 'vinegar', 'shelf8,1': 'jar', 'shelf9,1': 'fridge', 'barrel1,5': 'spuds', 'barrel9,5': 'spuds', 'barrel2,6': 'stool' })),
    stones: () => [...swap(decor, at({ bed: 'menhir', 'shelf9,1': 'menhir', 'shelf8,1': 'mossrock', table: 'altar', barrel: 'sheep' })), [1, 6, 'sheep'], [9, 6, 'hamper'], [6, 1, 'menhir']],
    bogshed: () => swap(decor, at({ bed: 'hammock', 'shelf8,1': 'pegs', 'shelf9,1': 'trophy', table: 'crate', barrel: 'waders' })),
    oasis: () => swap(decor, at({ 'shelf1,1': 'grill', 'shelf2,1': 'spit', 'shelf3,1': 'sauce', 'shelf7,1': 'sauce', 'shelf8,1': 'spit', 'shelf9,1': 'grill', 'barrel1,5': 'tub', 'barrel9,5': 'crate', 'barrel2,6': 'tub' })),
    lodge: () => [...swap(decor, at({ table: 'fondue', barrel: 'skis' })), [6, 1, 'logs'], [4, 1, 'coat']],
    icehut: () => [...swap(decor, at({ bed: 'cot', 'shelf8,1': 'stove', 'shelf9,1': 'rods', table: 'hole', barrel: 'bait' })), [4, 5, 'stool']],
    jetty: () => swap(decor, at({ bed: 'wheel', 'shelf8,1': 'buoy', 'shelf9,1': 'tides', table: 'maptable', barrel: 'rope' })),
    hoppub: () => {
      if (kind === 'inn') return swap(decor, at({ barrel: 'cask' }));
      if (kind === 'general') return swap(decor, at({ 'shelf1,1': 'jars', 'shelf2,1': 'apples', 'shelf3,1': 'sacks', 'shelf7,1': 'sacks', 'shelf8,1': 'apples', 'shelf9,1': 'jars', barrel: 'cask' }));
      if (kind === 'smith') return swap(decor, at({ barrel: 'cask' }));
      if (id === 'hop_bees') return swap(decor, at({ 'shelf8,1': 'hive', 'shelf9,1': 'honey', table: 'honey', barrel: 'hive' }));
      return swap(decor, at({ 'shelf8,1': 'sacks', 'shelf9,1': 'jars', table: 'press', barrel: 'cask' }));
    },
    beachbar: () => {
      if (kind === 'inn') return swap(decor, at({ barrel: 'surf' }));
      if (kind === 'general') return swap(decor, at({ 'shelf1,1': 'surf', 'shelf2,1': 'lava', 'shelf3,1': 'tiki', 'shelf7,1': 'tiki', 'shelf8,1': 'lava', 'shelf9,1': 'surf', barrel: 'stool' }));
      if (kind === 'smith') return swap(decor, at({ shelf: 'tiki', barrel: 'stool' }));
      if (id === 'kiln_bar') return swap(decor, at({ 'shelf8,1': 'blender', 'shelf9,1': 'lava', barrel: 'stool' }));
      return swap(decor, at({ 'shelf8,1': 'tiki', 'shelf9,1': 'surf', barrel: 'stool' }));
    },
  };
  return L[theme] ? L[theme]() : decor;
}
export const INTERIOR_THEMES = ['chippy', 'stones', 'bogshed', 'oasis', 'lodge', 'icehut', 'jetty', 'hoppub', 'beachbar'];
