// Lint (optional, no dependencies needed beyond ESLint itself):   npx eslint src tools
// no-undef catches typos and variables swallowed by a trailing "//" comment, which only fail at run time otherwise.
let globals = {};
try { const g = (await import('globals')).default; globals = { ...g.browser, ...g.node }; } catch { /* `globals` not installed: use the short list below */ }
const fallback = Object.fromEntries('AudioContext Blob Buffer CompressionStream DecompressionStream ErrorEvent ImageData MutationObserver OfflineAudioContext ResizeObserver Response TextDecoder TextEncoder URL addEventListener atob btoa clearInterval clearTimeout console devicePixelRatio document getComputedStyle innerHeight innerWidth localStorage location matchMedia navigator performance process requestAnimationFrame setInterval setTimeout window'.split(' ').map((k) => [k, 'readonly']));
export default [{
  files: ['**/*.js', '**/*.mjs'],
  languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: Object.keys(globals).length ? globals : fallback },
  rules: {
    'no-undef': 'error', 'no-dupe-keys': 'error', 'no-redeclare': 'error', 'no-const-assign': 'error', 'no-func-assign': 'error', 'no-import-assign': 'error', 'use-isnan': 'error', 'valid-typeof': 'error',
    'no-unreachable': 'warn', 'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' }],
  },
}];
