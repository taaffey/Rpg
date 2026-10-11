// ===== Additional pixel art: furniture, new enemies, big bosses, recolored variants =====
export const FURN = {
  barrel: ['................', '................', '................', '....kkkkkkkk....', '...kNnnnnnnNk...', '...kkkkkkkkkk...', '...kNnnnnnnNk...', '...kNnnNnnnNk...', '...kkkkkkkkkk...', '...kNnnnnnnNk...', '...kNnnnnnnNk...', '...kkkkkkkkkk...', '....kNnnnnNk....', '.....kkkkkk.....', '................', '................'],
  table: ['................', '................', '................', '................', '....kkkkkkkk....', '...kttttttttk...', '..kttttyytttttk.', '..kttttttttttnk.', '..kkkkkkkkkkkkk.', '...kNk......kNk.', '...kNk......kNk.', '...kNk......kNk.', '...kkk......kkk.', '................', '................', '................'],
  shelf: ['................', '.kkkkkkkkkkkkkk.', '.kNnnnnnnnnnnNk.', '.kNrrbbgyrbgyNk.', '.kNrrbbgyrbgyNk.', '.kNNNNNNNNNNNNk.', '.kNybgrbygbrgNk.', '.kNybgrbygbrgNk.', '.kNNNNNNNNNNNNk.', '.kNgrybgrybgrNk.', '.kNgrybgrybgrNk.', '.kNNNNNNNNNNNNk.', '.kkkkkkkkkkkkkk.', '................', '................', '................'],
  bed: ['................', '................', '................', '..kkkkkkkkkkkk..', '..kNwwwbbbbbbk..', '..kNwwwbbbbbBk..', '..kNwwwbbbbbBk..', '..kNwwwbbbbbbk..', '..kkkkkkkkkkkk..', '..kN........Nk..', '..kN........Nk..', '................', '................', '................', '................', '................'],
  counter: ['................', '................', '................', '................', '................', 'kkkkkkkkkkkkkkkk', 'kttttttttttttttk', 'kNNNNNNNNNNNNNNk', 'knnnnnnnnnnnnnnk', 'knnnnnnnnnnnnnnk', 'kNNNNNNNNNNNNNNk', 'kkkkkkkkkkkkkkkk', '................', '................', '................', '................'],
  anvil: ['................', '................', '................', '................', '................', '...kkkkkkkkkkk..', '..kSssssssssSSk.', '..kkSsssssSSkk..', '....kSSSSSSk....', '.....kSSSSk.....', '.....kSSSSk.....', '....kSSSSSSk....', '...kkkkkkkkkk...', '................', '................', '................'],
  snowtree: ['................', '.....wwwww......', '....wwGGGww.....', '...wGGgggGGw....', '..wwGgggggGww...', '..wGgggwgggGw...', '...wwgggggww....', '..wwGgggwgGGw...', '.wwGGgggggggGw..', '.wwwGgggggggGww.', '..wwwGGGGGGGww..', '.....NNnN.......', '.....NnnN.......', '.....NNnN.......', '................', '................'],
  fountain: ['................', '.......cc.......', '......cwwc......', '.......ww.......', '.......bb.......', '...kkkkbbkkkk...', '..kSsssbbsssSk..', '.kSsbbbbbbbbsSk.', '.kSsbbcbbcbbsSk.', '.kSsbbbbbbbbsSk.', '..kSsbbbbbbsSk..', '...kSSssssSSk...', '....kkkkkkkk....', '................', '................', '................'],
  rockslide: ['................', '................', '................', '.......SSS......', '.....SSsssSS....', '....SssSsssSS...', '...SsSSssSssS...', '..SSssSssSSssS..', '.SssSsssSssSssS.', '.SsssSsSSsssSsS.', 'SSSsSsssSsSsssSS', 'SssSSsSssSSssSsS', 'SSSSSSSSSSSSSSSS', '................', '................', '................'],
};
export const NPC_STYLE = { // [head, H, h, T, t, A, F]
  innkeeper: ['hair', '#c06030', '#8a3a18', '#e8e0d0', '#b8b0a0', '#d94a4a', '#f0c8a0'],
  merchant: ['hood', '#2a8a8a', '#1a6060', '#d0a040', '#a07828', '#f2f2f2', '#f0c8a0'],
  smith: ['hair', '#4a3020', '#2a1a10', '#7a5a40', '#4a3020', '#d94a4a', '#e0b890'],
  guildmaster: ['helm', '#8a2a9a', '#5a1a6a', '#5a2a8a', '#3a1a5a', '#f4d35e', '#f0c8a0'],
  elder: ['hair', '#f2f2f2', '#c8c8d8', '#6a4a8a', '#4a3068', '#f4d35e', '#f0c8a0'],
  villager: ['hair', '#8a5a30', '#55341c', '#6a8ac0', '#4a6a98', '#f2f2f2', '#f0c8a0'],
  villager2: ['hood', '#a04a4a', '#703030', '#c08a50', '#906030', '#f2f2f2', '#e8b890'],
  kid: ['hair', '#f4d35e', '#c0a030', '#5ac08a', '#3a8a60', '#f2f2f2', '#f0c8a0'],
  guard: ['helm', '#9aa0b0', '#6a7088', '#3a5aa0', '#27428a', '#f4d35e', '#f0c8a0'],
  fisher: ['hair', '#3a3a3a', '#202020', '#e8e8f0', '#b0b0c0', '#4a8ae0', '#f0c8a0'],
};
export const ENEMY2 = {
  zombie: ['................', '.....GGGGGG.....', '....GgggggGG....', '....GkwgkwgG....', '....GgggggGg....', '.....GkkkkG.....', '......GggG......', '...GGGGGGGGGG...', '..GgGGNnnNGGgG..', '.GgG.GNnnNG.GgG.', '.GG..GNnnNG..GG.', '.....GNnnNG.....', '.....GG..GG.....', '.....Gg..gG.....', '....kkk..kkk....', '................'],
  yeti: ['................', '.....wwwwww.....', '....wwwwwwww....', '...wwcccccccww..', '...wcckccckccw..', '...wcccwwwcccw..', '...wwcckkkccww..', '....wwcccccww...', '..wwwwwwwwwwww..', '.wwwwswwwwswwww.', '.wwwwswwwwswwww.', '.wwww.wwwwww.www', '.ww...wwwwww...w', '......wwwwww....', '.....wwwwwwww...', '....kkkk..kkkk..'],
};
// 32x32 bosses: left half (16 cols), mirrored in code
export const BIG2 = {
  lich: [
    '................', '................', '.......y.....y..', '.......yy...yyy.', '.......yyyyyyyyy', '......yyoyyyyyoy', '.......wwwwwwwww', '......wwwwwwwwww', '......wwkkkwwwww', '......wwkglwwwww', '......wwkkkwwwws', '.......wwwwwkkkk', '.......wwwwwkwkw', '........wwwwwwww', '.......PPPpppppp', '......PPPPpppppp',
    '....sPPPPPPPpypp', '...sPPpppPPPpypp', '..ssPPppppPPPypp', '..gsPpppppPPPyyp', '..lsPppwpppPPPyp', '..gsPPpwwpppPPPy', '..ssPPPpwwppppPP', '...sPPPPpppppppp', '...sPPPPPPpppppp', '...sPPPPPPPpppPP', '...sPPPPPPPPpppP', '...sPPPPPPPPPppP', '...sPPPPPPPPPPpP', '...sPPPPPPPPPPPP', '....kkPPPPPPPPPP', '.....kkkkkkkkkkk'],
  titan: [
    '................', '..w.............', '..ww............', '...ww...kkkkkkkk', '...wwwkkSSSSSSSS', '....wwkSsssssssS', '.....kSsssssssss', '....kSSsbbbbbbbb', '....kSsbbkbbbkbb', '....kSsbbbbbbbbb', '....kSsbbbkkkkkk', '....kSswwwwwwwww', '...kwwwwwwwwwwww', '..kwwwwwwwwwwwww', '.kkSSSSwwwwwwwww', 'kSssssSSwwwwwwww',
    'kSsbbbsSwwwwwwww', 'kSbbBBbsSbbbbbbb', 'kSbbBBbbSbbbbbbb', '.kSbbbbSbbbbBBBB', '.kwwwSSSbbbbbbbb', '.kwwwwwSSSSSSSSS', '..kwwwwwSsssssss', '..kwwwwwSsbbbbbb', '..kwwwwSSsbbbbbb', '...kwwwSbbbbbbbb', '...kwwwSbbbbbbbb', '...kkwwSbbbbbbbb', '....kwwSSbbbbbbb', '....kwwwSSSSSSSS', '....kkkwwwwwwwww', '.....kkkkkkkkkkk'],
};
// recolors of existing 16x16 sprites: id -> [base art id, palette overrides]
export const VARIANT = {
  bog_slime: ['slime', { g: '#8a5ac0', l: '#c8a0f0', G: '#4a2a80' }],
  mire_wolf: ['wolf', { s: '#5a8a5a', S: '#2f5a3a' }],
  ghoul: ['zombie', { G: '#5a5a66', g: '#8a8a98', N: '#3a3040', n: '#6a5a70' }],
  skeleton_knight: ['skeleton', { w: '#9ab0e0', s: '#5a70b0' }],
  frozen_knight: ['skeleton', { w: '#e0f4ff', s: '#7fd8f0' }],
  wraith_elder: ['wraith', { c: '#7a4ac0', w: '#c8b0f0' }],
  bone_mage: ['imp', { r: '#8a5ac0', R: '#4a2a80', o: '#6ef0a0', y: '#a6e87f' }],
  ice_wolf: ['wolf', { s: '#d8f0ff', S: '#7fd8f0' }],
  frost_goblin: ['goblin', { g: '#c8f0ff', G: '#7fb8d8' }],
  ice_golem: ['golem', { S: '#3a6aa0', s: '#8fd8f0' }],
  frost_wraith: ['wraith', { c: '#ffffff', w: '#c8f4ff' }],
  ice_imp: ['imp', { r: '#4a8ae0', R: '#27428a', o: '#c8f4ff', y: '#ffffff' }],
  storm_bat: ['bat', { p: '#f4d35e', P: '#a07828', r: '#fff6a0' }],
  thunder_imp: ['imp', { r: '#f4d35e', R: '#a07828', o: '#7fd8f0', y: '#ffffff' }],
  gale_wraith: ['wraith', { c: '#f4d35e', w: '#fff6c8' }],
};
// recolored 32x32 bosses: id -> [big art id, palette overrides]
export const BIGVAR = { storm_drake: ['wyrm', { r: '#4a8ae0', R: '#27428a', o: '#f4d35e', e: '#3a4a78', E: '#202850', f: '#ffe08a', y: '#fff6a0' }] };
