// Studio dei vestiti: foto ravvicinate dei personaggi vestiti a strati, per controllare compenetrazioni e finiture.
//   node strumenti/studio_vesti.js cartella_uscita [gruppi separati da virgola]
// Usa studio_anim.html (personaggi veri, Sartoria + Pittura + Vestiario) e i capi veri del Guardaroba.
// Ogni gruppo fa due foto: <nome>_fronte.png e <nome>_retro.png (più <nome>_viso.png se "viso").
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..'), out = path.resolve(process.argv[2] || 'foto_vesti'), only = process.argv[3] ? process.argv[3].split(',') : null;
global.World = require(root + '/src/world.js'); global.Interior = require(root + '/src/interiors.js'); global.Game = require(root + '/src/game.js');
const CAPO = require(root + '/src/guardaroba.js').CAPO;
const capo = (id, x) => { const c = CAPO[id]; if (!c) throw new Error('capo sconosciuto ' + id); return Object.assign({}, c, x || {}); };
// i manichini: [nome, modello (look), capi dal più interno al più esterno]
const M = { uomo: { top: '#8a3a2a', bottom: '#2a3a5a', skin: '#d8a888', hair: '#2a1a12', hat: 'none', extra: '', model: 'Casual_2' },
  donna: { top: '#8a3a2a', bottom: '#2a3a5a', skin: '#e0b090', hair: '#3a2014', hat: 'none', extra: '', model: 'Casual' },
  operaio: { top: '#8a3a2a', bottom: '#2a3a5a', skin: '#c89070', hair: '#1a1a1a', hat: 'none', extra: '', model: 'Worker' },
  elegante: { top: '#8a3a2a', bottom: '#2a3a5a', skin: '#e8c0a0', hair: '#5a3a1a', hat: 'none', extra: '', model: 'Formal' } };
const GRUPPI = {
  strati: [   // mutande sopra i pantaloni larghi, maglia fuori/dentro, giacca aperta
    ['mutande_sopra', ['maglietta', 'jeans_larghi', ['mutande', { col: '#c8302a' }], 'scarpe_skate']],
    ['camicia_giacca', ['camicia', 'pantaloni_completo', 'giacca_completo', 'cravatta', 'scarpe_eleganti']],
    ['maglione_cappotto', ['camicia_quadri', 'maglione', 'jeans', 'cappotto', 'sciarpa', 'stivali_pelle']],
    ['felpa_piumino', ['maglietta', 'felpa', 'pantaloni_tuta', 'piumino', 'scarpe_air']],
  ],
  collo: [   // sciarpe, foulard, collane sopra strati diversi
    ['sciarpa_maglia', ['maglietta', 'jeans', 'sciarpa', 'scarpe']],
    ['sciarpa_giacca', ['camicia', 'maglione', 'pantaloni', 'giacca', 'sciarpa_righe', 'mocassini']],
    ['sciarpa_cappotto', ['dolcevita', 'pantaloni', 'cappotto', 'sciarpa', 'scarpe_eleganti']],
    ['foulard_collana', ['camicia_hawaii', 'bermuda', 'foulard', 'collana_oro', 'sandali']],
  ],
  testa: [
    ['berretto', ['felpa', 'jeans', 'berretto', 'scarpe_tela']],
    ['fazzoletto', ['vestito_fiori', 'fazzoletto', 'tacchi']],
    ['cappello', ['camicia', 'pantaloni', 'giacca', 'cappello', 'scarpe_eleganti']],
    ['coppola', ['camicia_quadri', 'gilet', 'velluto', 'coppola', 'scarpe']],
  ],
  corpo: [   // la forma: busto, vita, sedere, con capi aderenti e da sartoria
    ['uomo_jeans', ['maglietta', 'jeans', 'scarpe_tela']],
    ['donna_jeans', ['maglietta', 'jeans', 'scarpe_tela'], 'donna'],
    ['donna_gonna', ['camicia', 'gonna', 'tacchi'], 'elegante'],
    ['operaio_lavoro', ['camicia_quadri', 'pantaloni_lavoro', 'scarpe'], 'operaio'],
    ['uomo_completo', ['camicia', 'pantaloni_completo', 'scarpe_eleganti']],
  ],
  street: [   // le sottoculture: un completo tipico per ciascuna
    ['maranza', [['giacca_tuta', { col: '#16161a' }], ['pantaloni_tuta', { col: '#16161a' }], ['calze_sport', { when: 2 }], ['scarpe_air', { col: '#16161a' }], 'marsupio_tracolla', ['cappellino', { col: '#101012' }], 'occhiali_sole']],
    ['skater', [['maglietta_oversize', { col: '#e8e2d4' }], ['felpa_skate', { col: '#3a5a3a' }], ['jeans_larghi', { col: '#5a7aa0' }], 'scarpe_skate', ['berretto_corto', { col: '#c8502a' }]]],
    ['driller', [['felpa', { col: '#1a1a1e' }], ['cargo', { col: '#1a1a1e' }], ['piumino_oca', { col: '#0e0e10' }], 'scarpe_air', ['passamontagna', { col: '#121214' }]]],
    ['polo_bermuda', [['polo', { col: '#1e3a6a' }], ['bermuda', { col: '#c8b48a' }], 'mocassini', 'occhiali_sole']],
    ['hawaii', [['camicia_hawaii', { col: '#1a6a7a' }], ['pantaloni', { col: '#ece6d8' }], 'mocassini', 'catenina']],
    ['pelliccia', [['dolcevita', { col: '#101012' }], ['leggings', { col: '#101012' }], 'pelliccia', 'stivali_pelle', 'occhiali_sole'], 'donna'],
  ],
  cappucci: [
    ['felpa', [['felpa', { col: '#5a5e66' }], 'jeans', 'scarpe_tela']],
    ['felpa_skate', [['felpa_skate', { col: '#3a5a3a' }], 'jeans_larghi', 'scarpe_skate']],
    ['felpa_piumino', [['felpa', { col: '#8a2a2a' }], 'cargo', 'piumino', 'scarpe_air']],
  ],
  colletti: [
    ['polo', [['polo', { col: '#1e3a6a' }], 'pantaloni', 'mocassini']],
    ['polo_bianca', [['polo', { col: '#f0ece2' }], 'jeans', 'scarpe_tela']],
    ['camicia', ['camicia', 'pantaloni', 'scarpe_eleganti']],
    ['camicia_maglione', ['camicia_quadri', 'maglione_v', 'jeans', 'scarpe']],
    ['hawaii', [['camicia_hawaii', { col: '#1a6a7a' }], 'bermuda', 'sandali']],
    ['camicia_giacca', ['camicia', 'pantaloni_completo', 'giacca_completo', 'cravatta', 'scarpe_eleganti']],
  ],
  piedi: [
    ['scarponi', ['maglietta', 'jeans', 'calzini', 'scarpe']],
    ['skate', ['maglietta_oversize', 'jeans_larghi', 'calze_sport', 'scarpe_skate']],
    ['stivali', ['maglione', 'pantaloni_lavoro', 'stivali']],
    ['tacchi', ['vestito_corto', 'calze_nylon', 'tacchi']],
  ],
};
const shots = [];
// per ogni completo un foglio: davanti, tre quarti, di lato, dietro (lo stesso vestito su quattro manichini), da vicino
const ANG = [0, .7, Math.PI / 2, Math.PI], zoom = process.env.VICINO ? +process.env.VICINO : 0;
for (const [g, list] of Object.entries(GRUPPI)) {
  if (only && !only.includes(g) && !list.some(l => only.includes(l[0]))) continue;
  for (const [nome, ids, chi] of list) {
    if (only && !only.includes(g) && !only.includes(nome)) continue;
    const vesti = ids.map(x => Array.isArray(x) ? capo(x[0], x[1]) : capo(x));
    const pose = ANG.map(a => ({ nome: '', look: M[chi || 'uomo'], vesti, ang: a }));
    shots.push({ nome: g + '_' + nome, t: .3, cols: 4, sp: .78, pose, cam: zoom ? [0, zoom, +(process.env.DIST || 2.3), 0, zoom - .05, 0] : [0, 1.1, 4.1, 0, .95, 0] });
  }
}
const tmp = path.join(out, '_scene.json'); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(tmp, JSON.stringify(shots));
execFileSync('node', [path.join(root, 'strumenti_inverno/studio_anim.js'), out, tmp, '1500', '900'], { stdio: 'inherit' });
