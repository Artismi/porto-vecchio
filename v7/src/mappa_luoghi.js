// Mappa dei luoghi: l'isola dalle caselle vere, con tutti i posti evidenziati per categoria.
// Uso (dalla cartella src): node mappa_luoghi.js  →  scrive ../mappa_luoghi.html (pagina unica, si apre nel browser)
global.World = require('./world.js'); global.Interior = require('./interiors.js'); global.Game = require('./game.js');
const fs = require('fs'), path = require('path');
const G = Game, M = G.MAP, GW = G.GW, GH = G.GH, TS = G.TS;

// caselle e quote (quota in decimetri sopra -2 m, un byte per casella)
const grid = Buffer.alloc(GW * GH), elev = Buffer.alloc(GW * GH);
for (let ty = 0; ty < GH; ty++) for (let tx = 0; tx < GW; tx++) { const i = ty * GW + tx; grid[i] = G.tileAt(tx, ty); elev[i] = Math.max(0, Math.min(255, Math.round((M.elev[i] + 2) * 5))); }

// categorie: prima nascosti e da scoprire, poi il resto per nome
const CAT = {
  regime: ['governo', 'ministero', 'garante', 'archivio', 'piazza_gov', 'commissariato', 'muro', 'varco', 'poligono', 'eliporto', 'molo_cargo', 'memoria'],
  servizi: ['chiesa', 'biblioteca', 'ambulatorio', 'cultura', 'chiesa_sg', 'santuario', 'casa_140', 'casa_163', 'casa_170', 'casa_28', 'casa_144', 'casa_166', 'faro'],
  alloggi: ['stella', 'aurora', 'mare', 'miramare', 'gabbiano', 'flamingo', 'paradiso', 'oceano'],
  lavoro: ['magazzino', 'cantiere', 'casotto', 'cava', 'miniera', 'stazione2', 'stazione_n', 'stazione_s', 'salinaio', 'saline', 'masseria', 'casa_193', 'casa_194', 'discarica', 'officina', 'cantina', 'casa_114', 'ovile_b'],
  piazze: ['piazza', 'fontana', 'vico', 'fiori', 'piazzetta', 'caruggio', 'calata', 'molo', 'pontile', 'marina', 'lungomare', 'passeggiata', 'giardini', 'belvedere', 'salita', 'spiaggia', 'spiaggia_lunga', 'villaggio', 'sangiacomo', 'pescatori_s', 'pescatori_n', 'pescatori_t', 'punta', 'pietra'],
};
const BI = {}; G.BUILDINGS.forEach(b => { BI[b.id] = b; });
const catOf = p => {
  if (p.hidden) return 'nascosti'; if (p.scoperta) return 'scoperta';
  for (const k in CAT) if (CAT[k].includes(p.id)) return k;
  if (BI[p.id] && BI[p.id].military) return 'regime';
  if (BI[p.id]) return 'locali';
  return 'natura';
};
const places = Object.values(G.PLACES).filter(p => p.name).map(p => { const b = BI[p.id]; return [p.name, catOf(p), Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10, b ? [b.x, b.y, b.w, b.h] : 0]; });
const zone = Buffer.from(M.zone);
const data = { GW, GH, TS, T: G.T, Z: M.Z, grid: grid.toString('base64'), elev: elev.toString('base64'), zone: zone.toString('base64'), places };

const tpl = fs.readFileSync(path.join(__dirname, 'mappa_luoghi.src.html'), 'utf8');
const out = path.join(__dirname, '..', 'mappa_luoghi.html');
fs.writeFileSync(out, tpl.replace('/*DATI*/null', JSON.stringify(data)));
const n = {}; places.forEach(p => { n[p[1]] = (n[p[1]] || 0) + 1; });
console.log(`scritto ${out}: ${places.length} luoghi`, n);
