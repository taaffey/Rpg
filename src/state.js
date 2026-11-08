// ===== Shared game state: the save being played (G, assigned through setG) and engine flags several modules read and write (S). =====
let G = null;
const setG = (v) => (G = v); // (modules cannot assign an imported binding)
const S = { busy: false, trans: 0, miniDirty: true, optBack: 'menu' }; // engine flags several modules read and write

export { G, S, setG };
