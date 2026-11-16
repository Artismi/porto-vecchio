// [unico] prova dei verbi del sistema unico (unico_verbi.js: passo 3 di commedia/SISTEMA_UNICO.md §10, dietro ?commedia).
// Uso (dalla cartella src): node test_unico_verbi.js [--n=300] [--pesca=1000]
// Controlla, per ognuno dei 23 verbi del catalogo (i 22 del §3.2 più la pesca):
//  - la PARITÀ: la stessa chiamata per il giocatore (la sua funzione di sempre) e per un abitante (cambio di persona o dati), dalle
//    stesse condizioni, dà la stessa variazione sul corpo (Attore.di: soldi, tasche, bisogni, dispensa, dove) e sul mondo;
//  - i RIFIUTI: a condizioni rotte Verbo.puo dice il perché (in italiano), Verbo.fai dice lo stesso, e niente cambia (né corpo né fatti);
//  - il FATTO: ogni verbo eseguito lascia un fatto, solo con id e primitivi (Fatto.puro), dell'attore giusto;
//  - le PRENOTAZIONI: due attori non prendono la stessa cosa (in un piano a passi e in coda);
//  - FABBRICARE: un NPC che fa una ricetta non fa girare il mondo (st.t fermo, Game.step zittito), il giocatore sì (come oggi);
//  - LONTANO E VICINO: lo stesso verbo applicato dai dati (C) e dal fornitore (B/A) dà la stessa variazione media, entro il 5%;
//  - il COSTO per verbo (puo e fai, vicino e lontano), il MENU QUI, ADESSO (le voci vecchie tutte, più quelle del registro), il
//    cambio di persona che rimette tutto a posto, il flag spento che non cambia niente. Esce con 1 se un caso fallisce.
'use strict';
const SRC = __dirname + '/'; process.chdir(SRC);
const ARG = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const MODS = ['Risacca:risacca', 'Popolo:popolo', 'Azioni:azioni', 'Economia:economia', 'Fazioni:fazioni', 'Soldi:soldi', 'Oggetti:oggetti', 'Mestieri:mestieri', 'Scambi:scambi', 'Convivenza:convivenza', 'Imprese:imprese', 'Commissioni:commissioni', 'Trame:trame', 'Creativita:creativita', 'Graffiti:graffiti', 'Ordine:ordine', 'Posti:posti', 'Eventi:eventi', 'Matti:matti',
  'Livelli:livelli', 'Sottosuolo:sottosuolo', 'Tetti:tetti', 'WriterArte:writer_arte', 'Writing:writing', 'WriterVita:writer_vita', 'Coro:coro', 'Protagonista:protagonista'];
const COMMEDIA = ['commedia:Commedia', 'parola:Parola', 'vita:Vita', 'iniziative:Iniziative', 'casa:Casa'];
const mulberry = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
let fail = 0, nOk = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (c) nOk++; else fail++; };

// carica il gioco come index.src.html: i moduli, la porta, i cinque di commedia, il tag «unico» (attore, catalogo, lingua, verbi, memoria), chiudi()
function carica(spento) {
  const F = mulberry(7); Math.random = () => F();
  global.location = { search: spento ? '' : '?commedia' };
  const zitto = console.log; console.log = (...a) => { if (!/^\[/.test(String(a[0]))) zitto(...a); };
  global.World = require(SRC + 'world.js'); global.Interior = require(SRC + 'interiors.js'); global.Game = require(SRC + 'game.js');
  for (const m of MODS) { const [g, f] = m.split(':'); try { global[g] = require(SRC + f + '.js'); } catch (e) { } }
  global.addEventListener = () => {}; global.window = {}; global.document = { readyState: 'loading', addEventListener() {} };
  try { global.Cantiere = require(SRC + 'cantiere.js'); } catch (e) { }
  delete global.document;
  const U = global.Unico = require(SRC + 'unico_porta.js');
  for (const m of COMMEDIA) { const [f, g] = m.split(':'); if (U.ON) U._nomeProva = f; global[g] = require(SRC + f + '.js'); }
  if (U.ON) U._nomeProva = null;
  global.Attore = require(SRC + 'unico_attore.js'); global.Roba = Attore.Roba;
  global.UnicoCatalogo = require(SRC + 'unico_catalogo.js'); global.Lingua = require(SRC + 'unico_lingua.js');
  global.Verbo = require(SRC + 'unico_verbi.js'); global.Fatto = require(SRC + 'unico_memoria.js');
  if (U.ON) U.chiudi();
  console.log = zitto;
  return U;
}

// ============================ spento: niente di niente (in un figlio) ============================
if (process.argv.includes('--spento')) {
  const r0 = Math.random; carica(true);
  const st = Game.create(1), a = Azioni.playerActions(st);
  process.stdout.write('@@' + JSON.stringify({ verbo: Object.keys(Verbo), unico: Object.keys(Unico), pa: !!Azioni.playerActions.__unico, n: a.length, menu: a.some(x => x.unico) }) + '\n');
  process.exit(0);
}
{
  const { execFileSync } = require('child_process');
  const o = execFileSync(process.execPath, [__filename, '--spento'], { encoding: 'utf8', maxBuffer: 1 << 26 }), J = JSON.parse(o.split('\n').find(l => l.startsWith('@@')).slice(2));
  ok(J.verbo.join() === 'ON' && J.unico.join() === 'ON' && !J.pa && !J.menu, `spento il flag: Verbo = { ON: false } e nient'altro, il menu non è avvolto (${J.n} voci, nessuna del registro)`);
}

// ============================ acceso ============================
const U = carica(false), G = Game, V = Verbo, F = Fatto;
const st = G.create(1); st.deadline = 1e12;
for (let i = 0; i < 40; i++) G.step(st, 1 / 20, { x: 0, y: 0 });
Vita.CFG.capGiorno = 1e9;   // la prova scrive migliaia di fatti in un giorno: il tetto di vita (400) non è quello che si prova qui
ok(V.ON && U.Verbo === V && typeof U.come === 'function' && U._.FASI.some(f => f.nome === 'unico.verbi'), `acceso: Verbo, Unico.come, la fase unico.verbi (${Object.keys(V.SCHEDE).length} verbi)`);
const VERBI = ['vai', 'entra', 'esci', 'prendi', 'posa', 'dai', 'regala', 'presta', 'chiedi_prestito', 'salda', 'compra', 'vendi', 'baratta', 'mangia', 'bevi', 'fai_ricetta', 'costruisci', 'smonta', 'arreda', 'ridipingi', 'dipingi_muro', 'dormi', 'pesca'];
ok(VERBI.every(v => V.SCHEDE[v]) && VERBI.every(v => V.SCHEDE[v].segno && V.SCHEDE[v].pre.length && V.SCHEDE[v].eff.length), `il catalogo: ${VERBI.length} schede, ognuna con condizioni, effetti e segno (come dati)`);
{ let e = null; try { V.registra('senza_segno', { pre: [], eff: [] }); } catch (x) { e = x; } ok(!!e, 'un verbo senza segno non entra nel catalogo (§7)'); }

// i corpi della prova: tre abitanti con la casa (non della banda, case diverse da quella di Nino), Nino
const cand = st.npcs.filter(k => k.pop && !k.pop.cast && !k.dead && !(k.ris && k.ris.member) && k.pop.homeT && k.pop.homeT.k === 'b' && k.pop.homeT.bi !== st.me.home.bi && !k.cop && !k.faction && !k.shop);
const [n1, n2, n3] = cand; const A1 = Attore.di(st, n1), N = Attore.di(st, 'player'), A3 = Attore.di(st, n3), A2 = Attore.di(st, n2);
ok(!!(n1 && n2 && n3), `i corpi: Nino, ${n1.first} (${n1.id}), ${n2.first}, ${n3.first}`);
const svuota = A => { for (const k of Array.from(A.borsa.keys())) A.borsa.delete(k); if (A.casa) for (const k of Array.from(A.casa.dispensa.keys())) A.casa.dispensa.delete(k); };
for (const k of [n1, n2, n3]) { k.pop.need = k.pop.need || {}; }
// fermo: niente piani, fuori, nello stesso posto (la routine non gira tra preparazione e verbo: i verbi «subito» non passano dal passo)
function fermo(A, x, y) {
  if (A === N) { st.player.indoor = null; st.player.vehicle = null; st.player.lv = null; st.player.x = x; st.player.y = y; return; }
  const n = A.o; if (n.pop.emer) Azioni.endPlan(st, n, 'prova'); n.inside = false; if (n.__u) n.__u.dove = null; n.inVeh = null; n.x = x; n.y = y; n.jailedUntil = 0; n.dead = false; n.stun = 0;
}
const fp = x => JSON.stringify(x);
// la foto del corpo: soldi, tasche, bisogni, dispensa, dove (tutto da Attore.di)
function foto(A) { const B = {}; for (const k of Attore.BISOGNI) B[k] = A.bisogni[k]; return { soldi: A.soldi, borsa: A.borsa.toJSON(), bisogni: B, dispensa: A.casa ? A.casa.dispensa.toJSON() : {}, dove: fp(A.dove) }; }
function delta(a, b) {
  const d = {};
  if (Math.abs(b.soldi - a.soldi) > 1e-6) d.soldi = Math.round((b.soldi - a.soldi) * 1000) / 1000;
  for (const w of ['borsa', 'dispensa']) for (const k of new Set(Object.keys(a[w]).concat(Object.keys(b[w])))) { const x = (b[w][k] || 0) - (a[w][k] || 0); if (Math.abs(x) > 1e-6) d[w + '.' + k] = Math.round(x * 1000) / 1000; }
  for (const k in a.bisogni) { const x = b.bisogni[k] - a.bisogni[k]; if (Math.abs(x) > 1e-6) d['bisogni.' + k] = Math.round(x * 1000) / 1000; }
  if (a.dove !== b.dove) d.dove = b.dove;
  return d;
}
const uguali = (a, b, tol) => { const K = new Set(Object.keys(a).concat(Object.keys(b))); for (const k of K) { const x = a[k], y = b[k]; if (typeof x === 'number' && typeof y === 'number') { if (Math.abs(x - y) > (tol || 1e-6)) return false; } else if (x !== y) return false; } return true; };
const nFatti = () => F._.M(st).n;   // il contatore dei fatti scritti (l'anello si riempie: la lunghezza non basta)

// ============================ I POSTI DELLA PROVA ============================
const E = Economia.eco(st);
const SH = Object.values(E.shops).find(S => S.sells.pane && S.sells.sale && S.t && S.t.k === 'b' && !S.market && !S.black && !S.emporio);
const P = k => G.PLACES[k];
const casaX = A => (A === N ? st.me.home : A.o.pop.homeT);
const porta = bi => { const b = G.BUILDINGS[bi]; return { x: (b.door[0] + .5) * G.TS, y: (b.door[1] + .5) * G.TS }; };
const bevanda = 'acqua', ink = 'cielo';
// il negozio sempre aperto e pieno (il prezzo resta quello: la scorta sta sopra il tetto della formula)
function bottegaPiena() { SH.stock.pane = 1000; SH.stock.sale = 1000; SH.cash = 5000; if (st.soldi && Soldi.ditta) { const D = Soldi.ditta(st, SH.t), T = Soldi.till(st, D); if (T) T.cash = 5000; } }
const cassaB = () => Oggetti.counter(st, SH.k).cash;

// un campo fuori città per Nino e per l'abitante, e il punto dove si può piazzare l'alambicco
const ALB = Cantiere.BY.alambicco;
function puntoLibero(A, P0) {
  for (let r = 0; r < 30; r += 2) for (let a = 0; a < 12; a++) {
    const x = P0.x + Math.cos(a * .52) * r, y = P0.y + Math.sin(a * .52) * r;
    if (Cantiere.inCity(x, y)) continue; fermo(A, x, y);
    const why = A === N ? Cantiere.canPlace(st, ALB, x, y, 0) : U.come(st, A, () => Cantiere.canPlace(st, ALB, x, y, 0));
    if (!why) return { x, y };
  }
  return null;
}
fermo(N, P('radura').x, P('radura').y); Cantiere.claim(st);
const campoN = puntoLibero(N, P('radura'));
fermo(A1, P('pineta').x, P('pineta').y); V.campo(st, n1, P('pineta').x, P('pineta').y);
const campo1 = puntoLibero(A1, P('pineta'));
ok(!!campoN && !!campo1, `i campi: Nino alla radura (${campoN && campoN.x.toFixed(0)}, ${campoN && campoN.y.toFixed(0)}), ${n1.first} alla pineta (Verbo.campo: Cantiere.claim per chiunque)`);

// ============================ GLI SCENARI: per ogni verbo, come si prepara un corpo e cosa si misura del mondo ============================
// prep(A) → gli argomenti (prepara il corpo e il mondo; si rifà uguale per Nino e per l'abitante); mondo() → la parte di mondo toccata
// rotto(A) → [argomenti, pezzo atteso del perché] con le condizioni rotte
const S3 = () => ({ pane: A3.borsa.get('pane'), soldi: A3.soldi, sale: A3.borsa.get('sale') });
const ultimoMuro = () => { const W = st.pop.walls, w = W[W.length - 1]; return W.length + ':' + (w ? w.pk + ':' + w.kind : ''); };
const opsCasa = A => { const bi = A === N ? st.me.home.bi : A.o.pop.homeT.bi, C = st.casa && st.casa.case[bi]; return C ? C.ops.length : 0; };
const vicinoA3 = A => { fermo(A3, P('piazza').x + 30, P('piazza').y); fermo(A, A3.x + 1, A3.y); };
let ultimoPezzo = {};
const SCEN = {
  vai: { prep: A => { fermo(A, P('piazza').x, P('piazza').y); return { x: P('piazza').x + 10, y: P('piazza').y + 4 }; }, campi: ['x', 'y'], rotto: A => [{}, 'Dove'] },
  entra: { prep: A => { const bi = SH.t.bi, q = porta(bi); fermo(A, q.x, q.y); return { b: bi }; }, rotto: A => { fermo(A, 0, 0); return [{ b: SH.t.bi }, 'lontano dalla porta']; } },
  esci: { prep: A => { const bi = SH.t.bi, q = porta(bi); fermo(A, q.x, q.y); V.fai(st, A, 'entra', { b: bi }, { subito: true }); return {}; }, rotto: A => { fermo(A, 10, 10); return [{}, 'Non sei dentro'] } },
  prendi: { prep: A => { const h = casaX(A); fermo(A, h.x, h.y); svuota(A); A.casa.dispensa.set('pane', 2); return { cosa: 'pane', q: 1, da: 'casa' }; }, rotto: A => { const h = casaX(A); fermo(A, h.x, h.y); svuota(A); return [{ cosa: 'pane', q: 1, da: 'casa' }, 'non c\'è']; } },
  posa: { prep: A => { const h = casaX(A); fermo(A, h.x, h.y); svuota(A); A.borsa.set('pane', 2); return { cosa: 'pane', q: 1, in: 'casa' }; }, rotto: A => { fermo(A, P('molo').x, P('molo').y); A.borsa.set('pane', 2); return [{ cosa: 'pane', q: 1, in: 'casa' }, 'Non sei a casa']; } },
  dai: { prep: A => { vicinoA3(A); svuota(A); A.borsa.set('pane', 2); return { chi: n3.id, cosa: 'pane', q: 1 }; }, mondo: S3, rotto: A => { vicinoA3(A); fermo(A, A3.x + 9, A3.y); A.borsa.set('pane', 2); return [{ chi: n3.id, cosa: 'pane', q: 1 }, 'troppo lontano']; } },
  regala: { prep: A => { vicinoA3(A); svuota(A); A.borsa.set('pane', 2); return { chi: n3.id, cosa: 'pane', q: 1 }; }, mondo: S3, rotto: A => { vicinoA3(A); svuota(A); return [{ chi: n3.id, cosa: 'pane', q: 1 }, 'Non hai'] } },
  presta: { prep: A => { vicinoA3(A); A.soldi = 50; A3.soldi = 20; return { chi: n3.id, soldi: 5 }; }, mondo: S3, rotto: A => { vicinoA3(A); A.soldi = 2; return [{ chi: n3.id, soldi: 5 }, 'non ce li hai']; }, dopo: A => F.debito(st, A.id, n3.id) },
  chiedi_prestito: { prep: A => { vicinoA3(A); A.soldi = 1; A3.soldi = 60; return { chi: n3.id, soldi: 5 }; }, mondo: S3, rotto: A => { vicinoA3(A); A3.soldi = 3; return [{ chi: n3.id, soldi: 5 }, 'Non ce li ho']; }, dopo: A => F.debito(st, n3.id, A.id) },
  salda: { prep: A => { fermo(A2, P('piazza').x - 30, P('piazza').y); fermo(A, A2.x + 1, A2.y); A2.soldi = 60; A.soldi = 30; V.fai(st, A, 'chiedi_prestito', { chi: n2.id, soldi: 6 }, { subito: true, lod: 'scena' }); return { chi: n2.id }; },
    mondo: () => ({ soldi: A2.soldi }), rotto: A => { vicinoA3(A); return [{ chi: n3.id }, 'Non devi niente']; }, dopo: A => F.debito(st, n2.id, A.id) },
  compra: { prep: A => { bottegaPiena(); fermo(A, SH.t.x, SH.t.y); A.soldi = 50; svuota(A); return { cosa: 'pane', q: 2, dove: SH.k }; }, mondo: () => ({ stock: SH.stock.pane, cassa: cassaB() }), rotto: A => { bottegaPiena(); fermo(A, SH.t.x, SH.t.y); A.soldi = 0; return [{ cosa: 'pane', q: 2, dove: SH.k }, 'non ce li hai']; } },
  vendi: { prep: A => { bottegaPiena(); fermo(A, SH.t.x, SH.t.y); svuota(A); A.borsa.set('sale', 3); return { cosa: 'sale', q: 2, dove: SH.k }; }, mondo: () => ({ stock: SH.stock.sale, cassa: cassaB() }), rotto: A => { bottegaPiena(); fermo(A, SH.t.x, SH.t.y); svuota(A); return [{ cosa: 'sale', q: 2, dove: SH.k }, 'Non hai']; } },
  baratta: { prep: A => { vicinoA3(A); svuota(A); svuota(A3); A.borsa.set('pane', 6); A3.borsa.set('sale', 2); n3.op = { trust: 0, grudge: 0, fear: 0 }; n3.pop.need.fame = .2; return { chi: n3.id, dai: { pane: 4 }, prendi: { sale: 1 } }; }, mondo: S3,
    rotto: A => { vicinoA3(A); svuota(A); svuota(A3); A.borsa.set('pane', 1); A3.borsa.set('sale', 2); n3.op = { trust: 0, grudge: 0 }; return [{ chi: n3.id, dai: { pane: 1 }, prendi: { sale: 2 } }, 'Non mi conviene']; } },
  mangia: { prep: A => { svuota(A); A.borsa.set('pane', 2); A.bisogni.fame = .8; return { cosa: 'pane' }; }, rotto: A => { svuota(A); A.borsa.set('chiodi', 2); return [{ cosa: 'chiodi' }, 'Non si mangia']; } },
  bevi: { prep: A => { svuota(A); A.borsa.set(bevanda, 1); A.bisogni.fame = .5; (A === N ? st.me.need : n1.pop.need).sete = .7; return { cosa: bevanda }; }, mondo: () => null, rotto: A => { svuota(A); A.borsa.set('pane', 1); return [{ cosa: 'pane' }, 'Non si beve']; } },
  fai_ricetta: { solo: ['borsa'], prep: A => { fermo(A, P('piazza').x, P('piazza').y); svuota(A); if (A !== N) Attore._.corpo(st, A.id, true).usura = {}; A.borsa.set('pane', 2); A.borsa.set('formaggio', 1); A.borsa.set('coltello', 1); return { rec: 'panino', volte: 1 }; }, rotto: A => { svuota(A); A.borsa.set('coltello', 1); return [{ rec: 'panino', volte: 1 }, 'Manca']; } },
  costruisci: { prep: A => { const q = A === N ? campoN : campo1; fermo(A, q.x, q.y); svuota(A); A.borsa.set('rame', 5); A.borsa.set('tubi', 2); return { id: 'alambicco', x: q.x, y: q.y, rot: 0 }; },
    mondo: () => st.covo.obj.length, rotto: A => { const q = A === N ? campoN : campo1; fermo(A, q.x, q.y); svuota(A); A.borsa.set('rame', 1); return [{ id: 'alambicco', x: q.x, y: q.y, rot: 0 }, 'Mancano']; },
    dopo: A => { const o = st.covo.obj[st.covo.obj.length - 1]; ultimoPezzo[A.id] = o.uid; return (o.by || 'nino') === A.id ? 'suo' : 'di ' + o.by; } },
  smonta: { prep: A => { const q = A === N ? campoN : campo1; fermo(A, q.x, q.y); svuota(A); return { uid: ultimoPezzo[A.id] }; }, mondo: () => st.covo.obj.length,
    rotto: A => { const q = A === N ? campoN : campo1; fermo(A, q.x, q.y); st.covo.obj = st.covo.obj.filter(o => o.uid !== 'kprova'); st.covo.obj.push({ uid: 'kprova', id: 'alambicco', x: q.x, y: q.y, rot: 0, tiles: [], by: A === N ? n1.id : n2.id }); return [{ uid: 'kprova' }, 'Non è roba tua']; } },
  arreda: { prep: A => { const h = casaX(A); fermo(A, h.x, h.y); svuota(A); A.borsa.set('sedia', 1); return { cosa: 'sedia' }; }, mondo: null, rotto: A => { fermo(A, P('molo').x, P('molo').y); A.borsa.set('sedia', 1); return [{ cosa: 'sedia' }, 'Non sei a casa']; } },
  ridipingi: { prep: A => { const h = casaX(A); fermo(A, h.x, h.y); svuota(A); A.borsa.set('vernice', 1); return { ink }; }, mondo: null, rotto: A => { const h = casaX(A); fermo(A, h.x, h.y); svuota(A); return [{ ink }, 'Non hai']; } },
  dipingi_muro: { prep: A => { fermo(A, P('piazza').x + 2, P('piazza').y); svuota(A); A.borsa.set('gesso', 1); st.pop.walls.length = 0; A.bisogni.rabbia = .6; A.bisogni.svago = .7; return { muro: 'piazza', con: 'gesso' }; }, mondo: () => st.pop.walls.length,
    rotto: A => { fermo(A, P('piazza').x + 2, P('piazza').y); svuota(A); return [{ muro: 'piazza', con: 'gesso' }, 'Non hai']; } },
  dormi: { prep: A => { const h = casaX(A); fermo(A, h.x, h.y); A.bisogni.sonno = .8; return { ore: 8 }; }, rotto: A => { const h = casaX(A); fermo(A, h.x, h.y); A.bisogni.sonno = 0; st.t = Math.floor(st.t / 1440) * 1440 + 12 * 60; return [{ ore: 8 }, 'Non hai sonno']; } },
  pesca: { prep: A => { fermo(A, P('molo').x, P('molo').y); svuota(A); A.borsa.set('canna', 1); const cc = Attore._.corpo(st, A.id, true); cc.abilita = { pesca: .5 }; cc.usura = {}; return { ore: 1 }; }, casuale: true, rotto: A => { fermo(A, P('molo').x, P('molo').y); svuota(A); return [{ ore: 1 }, 'Non hai']; } },
};
const mondoDi = v => (SCEN[v].mondo ? fp(SCEN[v].mondo()) : null);
const misuraMondo = (m0, m1) => { if (m0 === null) return null; const a = JSON.parse(m0), b = JSON.parse(m1); if (typeof a === 'number') return Math.round((b - a) * 1000) / 1000; const d = {}; for (const k in a) if (typeof a[k] === 'number') d[k] = Math.round((b[k] - a[k]) * 1000) / 1000; return fp(d); };

// ============================ 1. PARITÀ, FATTO, COSTO ============================
const SPIA = { puo: 0, fai: 0, puoOk: 0, faiOk: 0 };
function esegui(A, v, a, opt) {
  const why = V.puo(st, A, v, a), r = V.fai(st, A, v, a, Object.assign({ subito: true }, opt || {}));
  if (!why) { SPIA.puo++; if (r.ok) SPIA.faiOk++; }
  return { why, r };
}
function controllaFatto(A, v, r) {
  const f = r.fid !== null && r.fid !== undefined ? F.di(st, r.fid) : null; if (!f) return 'nessun fatto';
  let puro = true; try { F.puro(f); } catch (e) { puro = false; }
  const prim = Object.values(f).every(x => x === null || ['string', 'number', 'boolean'].includes(typeof x) || (Array.isArray(x) && x.every(y => y === null || ['string', 'number'].includes(typeof y))) || (x && typeof x === 'object' && Object.values(x).every(y => y === null || ['string', 'number', 'boolean'].includes(typeof y) || Array.isArray(y))));
  const ids = A.id === 'nino' ? ['nino', 'player'] : [A.id];   // i fatti che casa.js scrive (e il verbo adotta) dicono 'player' per il giocatore
  const dentro = ids.includes(f.chi) || (f.con || []).some(x => ids.includes(x));
  return puro && prim && dentro ? '' : `fatto ${f.id} ${puro ? '' : 'non puro '} ${prim ? '' : 'non primitivo '}${dentro ? '' : 'senza l\'attore'}`;
}
const tempo0 = st.t;
for (const v of VERBI) {
  const Sc = SCEN[v], righe = [];
  let dA = null, dB = null, mA = null, mB = null, rA = null, rB = null, xA, xB, tA, tB;
  for (const A of [N, A1]) {
    const a = Sc.prep(A), f0 = foto(A), m0 = mondoDi(v), nf0 = nFatti(), t0 = st.t;
    const { why, r } = esegui(A, v, a, A === N ? null : { lod: 'scena' });
    const f1 = foto(A), m1 = mondoDi(v), d = delta(f0, f1);
    if (Sc.campi) for (const k of Sc.campi) d[k] = Math.round((A[k] - (k === 'x' ? a.x : a.y)) * 1000) / 1000;
    const fat = r.ok ? controllaFatto(A, v, r) : 'non riuscito: ' + (why || r.msg);
    const x = Sc.dopo ? Sc.dopo(A) : null;
    if (A === N) { dA = d; mA = misuraMondo(m0, m1); rA = fat; xA = x; tA = r.strat; } else { dB = d; mB = misuraMondo(m0, m1); rB = fat; xB = x; tB = r.strat; }
    if (A === A1 && v === 'fai_ricetta') righe.push(`st.t ${t0 === st.t ? 'fermo' : 'mosso di ' + (st.t - t0)}`);
    if (A !== A1 && v === 'fai_ricetta') righe.push(`il giocatore: st.t +${(st.t - t0).toFixed(1)} min`);
  }
  if (Sc.solo) for (const D of [dA, dB]) for (const k of Object.keys(D)) if (!Sc.solo.some(p => k.startsWith(p))) delete D[k];
  const corpoOk = Sc.casuale ? (dA['borsa.canna'] || 0) === (dB['borsa.canna'] || 0) : uguali(dA, dB), mondoOk = Sc.casuale || mA === mB, xOk = xA === xB || (v === 'costruisci' && xA === 'suo' && xB === 'suo');
  const vuoto = !Sc.casuale && !Object.keys(dA).length && mA === null;
  ok(corpoOk && mondoOk && xOk && !rA && !rB && !vuoto, `${v.padEnd(15)} parità: Nino[${tA}] ${fp(dA)}${mA !== null ? ' mondo ' + mA : ''}${xA !== null && xA !== undefined ? ' → ' + fp(xA) : ''} · ${n1.first}[${tB}] ${fp(dB)}${mB !== null ? ' mondo ' + mB : ''}${xB !== null && xB !== undefined ? ' → ' + fp(xB) : ''}${rA ? ' · Nino: ' + rA : ''}${rB ? ' · NPC: ' + rB : ''}${righe.length ? ' · ' + righe.join(', ') : ''}`);
}
st.t = Math.max(st.t, tempo0);

// ============================ 2. I RIFIUTI: il perché, e niente cambia ============================
for (const v of VERBI) {
  const out = [];
  for (const A of [N, A1]) {
    const [a, atteso] = SCEN[v].rotto(A), f0 = fp(foto(A)), nf0 = nFatti(), why = V.puo(st, A, v, a), r = V.fai(st, A, v, a, { subito: true });
    const ok1 = !!why && why.includes(atteso) && !r.ok && r.msg === why && fp(foto(A)) === f0 && nFatti() === nf0 && /^[A-ZÀ-Ú«]/.test(why);
    out.push([ok1, why]);
  }
  ok(out.every(x => x[0]), `${v.padEnd(15)} rifiuto: «${out[0][1]}» · «${out[1][1]}»`);
}

// ============================ 3. LE PRENOTAZIONI ============================
{ // la bottega con un pane solo: Gino parte (piano a passi), Lia lo trova prenotato; poi Gino lo compra e per Lia è finito
  fermo(A1, SH.t.x, SH.t.y); fermo(A2, SH.t.x + .5, SH.t.y); fermo(N, SH.t.x + 60, SH.t.y); A1.soldi = 50; A2.soldi = 50; svuota(A1); svuota(A2); SH.stock.pane = 1;
  n1.pop.near = true; n2.pop.near = true;
  const r1 = V.fai(st, n1, 'compra', { cosa: 'pane', q: 1, dove: SH.k }, { modo: 'piano' });
  const w2 = V.puo(st, n2, 'compra', { cosa: 'pane', q: 1, dove: SH.k }), r2 = V.fai(st, n2, 'compra', { cosa: 'pane', q: 1, dove: SH.k }, { modo: 'piano' });
  let k = 0; const c0 = V.stats.compiuti; while (V.stats.compiuti === c0 && k++ < 6000) { n1.x = SH.t.x; n1.y = SH.t.y; n2.x = SH.t.x + .5; n2.y = SH.t.y; G.step(st, 1 / 20, { x: 0, y: 0 }); }
  n2.x = SH.t.x + .5; n2.y = SH.t.y; n2.inside = false; if (n2.__u) n2.__u.dove = null;
  const w3 = V.puo(st, n2, 'compra', { cosa: 'pane', q: 1, dove: SH.k });
  ok(r1.ok && r1.compito === 'piano' && !r2.ok && /prenotato/.test(w2) && r2.msg === w2 && A1.borsa.get('pane') === 1 && /finito/.test(w3) && !(st.u.pren['scorta:' + SH.k + ':pane'] || []).length,
    `in un piano: ${n1.first} prenota l'ultimo pane, ${n2.first} «${w2}»; dopo ${k} passi ${n1.first} ce l'ha e per ${n2.first} «${w3}»; la prenotazione è sciolta`);
}
{ // la dispensa di una base vale per tutti i membri: qui la coda dei lontani su una cosa sola (lo stesso pezzo da smontare)
  const q = campo1; fermo(A1, q.x, q.y); svuota(A1); A1.borsa.set('rame', 4); A1.borsa.set('tubi', 2);
  const rc = V.fai(st, n1, 'costruisci', { id: 'alambicco', x: q.x, y: q.y, rot: 0 }, { subito: true, strat: 'B' }), o = st.covo.obj[st.covo.obj.length - 1];
  const r1 = V.fai(st, n1, 'smonta', { uid: o.uid }, { modo: 'coda' }), w = V.puo(st, 'player', 'smonta', { uid: o.uid });
  // un secondo abitante a cui è stato regalato lo stesso pezzo (by) non può smontarlo finché la coda di Gino non lo libera
  const by0 = o.by; o.by = n2.id; fermo(A2, q.x, q.y); const w2 = V.puo(st, n2, 'smonta', { uid: o.uid }); o.by = by0;
  const t0 = st.t; let k = 0; while ((st.u.coda || []).length && k++ < 20000) { n1.x = q.x; n1.y = q.y; G.step(st, 1 / 20, { x: 0, y: 0 }); }
  st.covo.obj = st.covo.obj.filter(x => x.uid !== 'kprova');
  ok(rc.ok && r1.ok && r1.compito === 'coda' && /prenotato/.test(w2) && !st.covo.obj.includes(o) && A1.borsa.get('rame') === 3 && !(st.u.pren['pezzo:' + o.uid] || []).length,
    `in coda (lontano): ${n1.first} prenota lo smontaggio, un altro «${w2}»; dopo ${(st.t - t0).toFixed(0)} minuti di gioco il pezzo è smontato e la roba torna (rame 3 di 4)`);
}

{ // costruire lontano (C): la roba si paga subito, il pezzo si mette in opera quando arriva qualcuno a guardare (come le righe di casa.js)
  const q = campo1; fermo(A1, q.x, q.y); svuota(A1); A1.borsa.set('rame', 4); A1.borsa.set('tubi', 2); fermo(N, P('molo').x, P('molo').y);
  const k0 = st.covo.obj.length, r = V.fai(st, n1, 'costruisci', { id: 'alambicco', x: q.x, y: q.y, rot: 0 }, { subito: true, strat: 'C', lod: 'lontano' });
  const pagato = A1.borsa.get('rame') === 0 && A1.borsa.get('tubi') === 0, attesa = (st.u.cantieri || []).length, prima = st.covo.obj.length === k0;
  fermo(N, q.x + 20, q.y); for (let i = 0; i < 3; i++) G.step(st, 1 / 20, { x: 0, y: 0 });
  const o = st.covo.obj.find(x => x.by === n1.id && Math.hypot(x.x - q.x, x.y - q.y) < .1);
  ok(r.ok && r.strat === 'C' && pagato && attesa === 1 && prima && !!o && !(st.u.cantieri || []).length, `costruire lontano: la roba pagata subito (rame e tubi a 0), il pezzo in attesa (${attesa}); arrivato Nino, l'alambicco c'è, di ${n1.first} (${o && o.uid})`);
  if (o) { st.covo.obj = st.covo.obj.filter(x => x !== o); }
}

// ============================ 4. FABBRICARE NON FA GIRARE IL MONDO ============================
{
  fermo(A1, P('piazza').x, P('piazza').y); svuota(A1); A1.borsa.set('stoffa', 2); A1.borsa.set('forbici', 1);
  const z0 = V.stats.zittiti, t0 = st.t, c0 = st.clock, nf = (st.npcs.map(n => n.x).join()), passi0 = U.passi;
  const r = V.fai(st, n1, 'fai_ricetta', { rec: 'bende', volte: 2 }, { subito: true, strat: 'B' });
  ok(r.ok && r.strat === 'B' && st.t === t0 && st.clock === c0 && U.passi === passi0 && V.stats.zittiti - z0 > 0 && A1.borsa.get('bende') === 8 && st.npcs.map(n => n.x).join() === nf,
    `un NPC fa le bende (30 minuti di ricetta, Oggetti.craft col cambio di persona): st.t fermo, nessun passo del mondo, Game.step zittito ${V.stats.zittiti - z0} volte (passTime), 8 bende in tasca`);
  ok(st.player === st.player && G.feed && !G.feed.toString().includes('=> null') && G.PLAYER_NAME === 'Nino' && G.step.__unico && Risacca.members && st.me && !st.me.__unico && !st.player.__unico,
    'dopo il cambio di persona tutto torna com\'era: st.player, st.me, Game.feed, Game.step, PLAYER_NAME, Risacca.members');
}

// ============================ 5. LONTANO E VICINO: la stessa variazione media, entro il 5% ============================
{
  const NN = +ARG('n', 300), NP = +ARG('pesca', 1000), out = [];
  for (const v of ['compra', 'vendi', 'mangia', 'bevi', 'fai_ricetta', 'prendi', 'dai', 'presta', 'dormi', 'dipingi_muro', 'pesca']) {
    const Sc = SCEN[v], somme = { vicino: {}, lontano: {} }, nRun = v === 'pesca' ? NP : v === 'dipingi_muro' ? 40 : NN;
    const dadi = JSON.stringify(st.u.rng.verbi);   // gli stessi dadi per i due modi: la stessa legge, non la stessa fortuna
    for (const modo of ['vicino', 'lontano']) {
      st.u.rng.verbi = JSON.parse(dadi);
      for (let i = 0; i < nRun; i++) {
        const a = Sc.prep(A1), f0 = foto(A1), m0 = mondoDi(v);
        const r = modo === 'vicino' ? V.fai(st, n1, v, a, { subito: true, lod: 'scena' }) : V.fai(st, n1, v, a, { subito: true, strat: 'C', lod: 'lontano' });
        const d = delta(f0, foto(A1)); if (Sc.mondo) { const mm = misuraMondo(m0, mondoDi(v)); d.mondo = typeof mm === 'number' ? mm : 0; if (typeof mm === 'string') Object.assign(d, JSON.parse(mm)); }
        d.ok = r.ok ? 1 : 0;
        for (const k in d) if (typeof d[k] === 'number') somme[modo][k] = (somme[modo][k] || 0) + d[k];
      }
    }
    const K = new Set(Object.keys(somme.vicino).concat(Object.keys(somme.lontano))); let peggio = 0, pk = '';
    for (const k of K) { const a = (somme.vicino[k] || 0) / nRun, b = (somme.lontano[k] || 0) / nRun, e = Math.abs(a - b) / Math.max(1e-9, Math.abs(a)); if (Math.abs(a - b) > 1e-9 && e > peggio) { peggio = e; pk = k; } }
    out.push(`${v} ${(peggio * 100).toFixed(1)}%`);
    ok(peggio <= .05, `${v.padEnd(15)} lontano (C, dai dati) contro vicino (${V._.strategia(st, A1, v, { lod: 'scena' })}): ${nRun}+${nRun} volte, la differenza più grande nelle medie è ${(peggio * 100).toFixed(2)}%${pk ? ' (' + pk + ')' : ''}; medie vicino ${fp(Object.fromEntries(Object.entries(somme.vicino).map(([k, x]) => [k, Math.round(x / nRun * 1000) / 1000])))}`);
  }
}

// ============================ 6. IL COSTO PER VERBO ============================
// per l'abitante (il giocatore usa le sue funzioni di sempre: fai_ricetta, con passTime, costa quello che costava): 30 volte per verbo,
// puo · fai vicino (il fornitore, col cambio di persona dove serve) · fai lontano (dai dati); la preparazione fuori dal conto
{
  const K = 30, R = [], ms = t0 => Number(process.hrtime.bigint() - t0) / 1e6;
  for (const v of VERBI) {
    let p = 0, f = 0, l = 0;
    for (let i = 0; i < K; i++) {
      let a = SCEN[v].prep(A1); let t0 = process.hrtime.bigint(); V.puo(st, n1, v, a); p += ms(t0);
      if (v === 'costruisci' || v === 'smonta' || v === 'esci') continue;   // costruire e smontare si alternano (sopra); esci ha bisogno di entra
      t0 = process.hrtime.bigint(); V.fai(st, n1, v, a, { subito: true, lod: 'scena' }); f += ms(t0);
      a = SCEN[v].prep(A1); t0 = process.hrtime.bigint(); V.fai(st, n1, v, a, { subito: true, lod: 'lontano', strat: 'C' }); l += ms(t0);
    }
    const sk = v === 'costruisci' || v === 'smonta' || v === 'esci';
    R.push([v, p / K, sk ? null : f / K, sk ? null : l / K]);
  }
  console.log('info il costo per verbo, abitante (ms a chiamata: puo · fai vicino · fai lontano dai dati; costruisci/smonta/esci: solo puo):\n       ' + R.map(([v, p, f, l]) => `${v.padEnd(15)} ${p.toFixed(3)}${f !== null ? ' · ' + f.toFixed(3) + ' · ' + l.toFixed(3) : ''}`).join('\n       '));
  const caro = R.filter(([v, p, f, l]) => p > 1 || (f !== null && f > 3) || (l !== null && l > 1));
  const media = R.filter(x => x[3] !== null).reduce((s, x) => s + x[3], 0) / R.filter(x => x[3] !== null).length;
  ok(caro.length === 0, `il costo: puo ≤ 1 ms, fai vicino ≤ 3 ms, fai lontano ≤ 1 ms per tutti i verbi (troppo cari: ${caro.map(x => x[0]).join(',') || 'nessuno'}; lontano in media ${media.toFixed(3)} ms)`);
  ok(SPIA.puo > 0 && SPIA.faiOk / SPIA.puo >= .98, `puo === '' ⇒ fai riuscito: ${SPIA.faiOk}/${SPIA.puo} (≥ 98%)`);
}

// ============================ 7. I PASSI E IL MENU QUI, ADESSO ============================
{
  fermo(A1, P('piazza').x, P('piazza').y); fermo(N, SH.t.x, SH.t.y); bottegaPiena(); N.soldi = 40; svuota(N); N.borsa.set('pane', 2); N.bisogni.fame = .6;
  const L = V.passi(st, n1, 'compra', { cosa: 'pane', q: 1, dove: SH.k });
  ok(L.length === 2 && /^va al banco di /.test(L[0].label) && L[0].at && L[0].at(st, n1) === SH.t && L[1].dur === 3 && typeof L[1].act === 'function', `Verbo.passi: «${L.map(s => s.label).join('» → «')}» (go verso il banco, do per costo.min)`);
  // il membro guidato accanto (n.ris.auto === false): nel menu quello che puoi fargli fare, e lo fa lui coi suoi passi
  let mb = st.npcs.find(k => k.ris && k.ris.member && !k.dead && k.pop); const nuovoM = !mb && Risacca.join && Risacca.join(st, n2, 'prova'); if (nuovoM) mb = n2;
  if (mb) {
    const a0 = mb.ris.auto, MB = Attore.di(st, mb); mb.ris.auto = false; fermo(MB, N.x + 1, N.y); mb.pop.near = true; svuota(MB); MB.borsa.set('pane', 1);
    const voci = Azioni.playerActions(st).filter(x => x.unico && x.id.startsWith('u_m_')), vm = voci[0]; MB.soldi = 20;
    const msg = vm ? vm.run() : '', piano = mb.pop.emer && mb.pop.emer.verbo;
    ok(!!vm && /ci pensa/.test(msg) && piano === vm.unico, `il membro guidato ${mb.first}: «${voci.map(x => x.label).join(' · ')}» → «${msg}», un piano «${piano}» coi passi di Azioni`);
    if (mb.pop.emer) Azioni.endPlan(st, mb, 'prova'); mb.ris.auto = a0; if (nuovoM) mb.ris.member = false;
  } else console.log('info nessun membro della banda in partita: il menu del membro guidato non si prova');
  const vec = Azioni.playerActions.vecchio(st), nuovo = Azioni.playerActions(st), reg = nuovo.filter(x => x.unico);
  const tutte = vec.every((x, i) => nuovo[i] && nuovo[i].label === x.label && nuovo[i].id === x.id && nuovo[i].off === x.off && !!nuovo[i].run === !!x.run);
  ok(tutte && reg.length >= 3 && reg.some(x => /Compra/.test(x.label)) && reg.some(x => /Mangia/.test(x.label)), `il menu: le ${vec.length} voci vecchie tutte, uguali e nello stesso ordine; più ${reg.length} del registro (${reg.map(x => x.label + (x.off ? ' ~' + x.off : '')).join(' · ')})`);
  const m = reg.find(x => /Mangia/.test(x.label)), nf0 = nFatti(), fame0 = N.bisogni.fame, msg = m.run();
  const ult = F.di(st, nFatti());
  ok(N.bisogni.fame < fame0 && nFatti() === nf0 + 1 && ult && ult.v === 'mangia' && ult.chi === 'nino', `una voce del registro: «${m.label}» → «${msg}» (la fame scende, un fatto «mangia»)`);
  // la voce vecchia «Mangia» (og/protagonista) e la nuova non si ripetono: stesse etichette tolte
  const lab = nuovo.map(x => x.label); ok(new Set(lab).size === lab.length, 'nessuna etichetta ripetuta nel menu');
  ok(V.copre('casa_dipingi') === 'ridipingi' && V.copre('og_lavora') === 'fai_ricetta' && V.copre('xx') === null, 'Verbo.copre: la voce vecchia e il suo verbo (casa_dipingi → ridipingi, og_lavora → fai_ricetta)');
}

// ============================ 8. UN GIRO: nessun errore ============================
{
  const t0 = st.t; while (st.t < t0 + 60) G.step(st, 1 / 20, { x: 0, y: 0 });
  ok(U.errTot === 0, `un'ora di gioco dopo le prove: Σ Unico.err = ${U.errTot} ${U.errTot ? JSON.stringify(U.ultimo).slice(0, 400) : ''}`);
  console.log('info Verbo.stats ' + JSON.stringify(Object.assign({}, V.stats, { per: undefined })));
}
console.log(`\n${nOk} ok, ${fail} NO`);
process.exit(fail ? 1 : 0);
