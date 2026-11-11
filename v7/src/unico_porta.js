/* [unico] unico_porta.js: LA PORTA DEL SISTEMA UNICO, passo 0 (progetto: commedia/SISTEMA_UNICO.md §1.1-1.3, §6.1, §10 riga 0).
   Dietro ?commedia. Spento il flag: Unico = { ON: false } e nient'altro (nessun aggancio, nessuna trappola, Math.random intatto).

   Cosa fa:
   - LA TRAPPOLA. Si carica dopo i moduli del gioco e prima di commedia.js. Mette una proprietà con get/set su Game.HOOKS.step e
     HOOKS.create: chi legge s0 per avvolgerlo riceve una «porta» (il prossimo nell'ordine), chi assegna il suo avvolgimento viene
     registrato come FASE col nome del suo <script data-m> (in Node: Unico._nomeProva). L'ordine resta quello di oggi:
     casa ⊃ iniziative ⊃ vita ⊃ parola ⊃ commedia ⊃ BASE, ma ogni fase si misura da sola e i suoi errori si contano.
   - UNICO.PASSO. Alla fine del caricamento (Unico.chiudi(), la seconda riga in index.src.html, dopo casa.js) la proprietà torna
     normale e vale Unico.passo: per ogni fase performance.mark (con ?perf), try/catch con un contatore che non si tace
     (Unico.err[fase], l'ultimo stack in Unico.ultimo, console.error alla prima volta e ogni 100), la misura in ms (tempo proprio,
     senza le fasi interne) in un anello per fase: p50/p95/p99/max con Unico.misure() e nel riquadro di ?perf.
     Gli errori che i moduli vecchi prendono da sé (console.warn('[Vita]', e), Vita.err) si leggono dentro la fase e si contano.
   - IL CASO A SEME. In HOOKS.create, prima di tutti, st.rng diventa Unico.xs32: lo stesso xorshift32 di game.js makeRng, nello stesso
     punto della sequenza (lo stato si ricava dall'ultimo numero, l'xorshift si inverte), ma con lo stato leggibile e scrivibile
     (st.rng.s). I flussi nostri sono sfc32 in st.u.rng[nome] (mente, verbi, segni, vecchi), seme hash(seme, nome).
     Math.random è instradato: dentro Game.step e Game.create (Unico.inSim) viene dal flusso 'vecchi', fuori (disegno, three.js, UI)
     è quello vero. Salvataggio del caso: Unico.salvaCaso(st) / Unico.caricaCaso(st, o).
   - LA GUARDIA DI RIENTRO. Game.step si avvolge una volta, per ultimo: se si rientra mentre il passo gira (Oggetti.passTime chiamato
     da dentro il passo) non si rientra, si conta in Unico.rientri.
   - LE FASI NUOVE: Unico.fase(nome, { dopo, budget }, fn) gira dopo la catena composta, senza avvolgere niente. */
var Unico = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Unico = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Unico;
  if (!ON) return Unico;
  const G = typeof Game !== 'undefined' ? Game : null;
  if (!G || !G.HOOKS) { Unico.ON = false; return Unico; }
  const H = G.HOOKS;
  const PERF = typeof location !== 'undefined' && /[?&]perf\b/.test(location.search);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const CFG = Unico.CFG = { instrada: true, anello: 600, avvisaOgni: 100, traccia: false };

  // ======================= IL CASO A SEME (§6.1) =======================
  const P32 = 4294967296;
  // lo stesso algoritmo di game.js:11 (makeRng), con lo stato esposto: r.s si legge e si scrive
  function xs32(seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    const r = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / P32; };
    Object.defineProperty(r, 's', { enumerable: true, get: () => s, set: v => { s = (v >>> 0) || 0x9e3779b9; } });
    r.unico = true;
    return r;
  }
  // l'xorshift32 si inverte: dallo stato dopo un numero si torna a quello di prima
  const disfaSx = (y, k) => { let x = y; for (let i = 0; i < 8; i++) x = (y ^ (x << k)) >>> 0; return x >>> 0; };
  const disfaDx = (y, k) => { let x = y; for (let i = 0; i < 8; i++) x = (y ^ (x >>> k)) >>> 0; return x >>> 0; };
  const indietro = s => disfaSx(disfaDx(disfaSx(s >>> 0, 5), 17), 13);
  // st.rng di game.js diventa il nostro, nello stesso punto della sequenza. Se non è l'xorshift di serie (qualcuno l'ha già cambiato)
  // si lascia il suo e il numero letto torna per primo: la sequenza resta quella
  function adotta(st) {
    const r0 = st.rng; if (typeof r0 !== 'function') return null; if (r0.unico) return r0.s;
    const v = r0(), s1 = Math.round(v * P32) >>> 0, r = xs32(1); r.s = indietro(s1);
    const prova = xs32(1); prova.s = r.s;
    if (s1 && prova() === v) { st.rng = r; return r.s; }
    let pend = v; st.rng = () => { if (pend !== null) { const t = pend; pend = null; return t; } return r0(); };
    conta('caso', new Error('st.rng non è lo xorshift di serie: non si può salvare'));
    return null;
  }
  // la partita nata prima della porta (main.js fa G.create al caricamento, prima dei moduli di commedia, come oggi per commedia e
  // vita): al primo passo st.rng si adotta nel punto in cui è, e i flussi prendono per seme quello stato
  function tardi(st) {
    let s0 = null; try { s0 = adotta(st); } catch (e) { conta('caso', e); }
    st.u = nuovoU(s0 !== null ? s0 : 1986); st.u.tardi = true;
  }
  // i flussi nostri: sfc32, stato [a,b,c,d], seme hash(seme, nome)
  function hash(seme, nome) {
    let h = 0x811c9dc5; const t = String(seme) + '|' + nome;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  function sfc(S) {
    let a = S[0] | 0, b = S[1] | 0, c = S[2] | 0, d = S[3] | 0;
    const t = (a + b | 0) + d | 0; d = d + 1 | 0; a = b ^ (b >>> 9); b = c + (c << 3) | 0; c = (c << 21) | (c >>> 11); c = c + t | 0;
    S[0] = a; S[1] = b; S[2] = c; S[3] = d;
    return (t >>> 0) / P32;
  }
  function seme4(seme, nome) {
    const S = [hash(seme, nome), hash(seme, nome + '#1'), hash(seme, nome + '#2'), 1];
    for (let i = 0; i < 12; i++) sfc(S);
    return S;
  }
  const FLUSSI = ['mente', 'verbi', 'segni', 'vecchi'];
  function nuovoU(seme) { const rng = {}; for (const k of FLUSSI) rng[k] = seme4(seme, k); return { v: 1, seme, rng, ingressi: [] }; }
  let attesaU = null;   // lo st.u di una partita che sta nascendo (Game.create prima di HOOKS.create)
  const uOra = () => attesaU || (Unico.st && Unico.st.u) || null;
  // un numero dal flusso; se il flusso non c'è ancora (nessuna partita) il caso vero
  function flusso(nome) {
    const u = uOra(); if (!u) return ORIG_RANDOM();
    const S = u.rng[nome] || (u.rng[nome] = seme4(u.seme, nome));
    return sfc(S);
  }
  const ORIG_RANDOM = Math.random;
  let inSim = false;
  Math.random = function () { if (inSim && CFG.instrada && uOra()) { Unico.instradati++; return flusso('vecchi'); } return ORIG_RANDOM(); };
  Math.random.__unico = true;
  function salvaCaso(st) { return { st: st.rng && st.rng.unico ? st.rng.s : null, unico: st.u ? JSON.parse(JSON.stringify(st.u.rng)) : null }; }
  function caricaCaso(st, o) {
    if (!o) return;
    if (o.st !== null && o.st !== undefined) { if (!(st.rng && st.rng.unico)) st.rng = xs32(1); st.rng.s = o.st; }
    if (o.unico) { st.u = st.u || nuovoU(0); st.u.rng = JSON.parse(JSON.stringify(o.unico)); }
  }

  // ======================= GLI ERRORI CHE NON SI TACCIONO =======================
  const err = {}, ultimo = {}, VISTI = typeof WeakSet !== 'undefined' ? new WeakSet() : null;
  const cerr = function () { if (typeof console !== 'undefined' && console.error) console.error.apply(console, arguments); };
  function conta(fase, e) {
    if (e && typeof e === 'object' && VISTI) { if (VISTI.has(e)) return; VISTI.add(e); }
    const n = err[fase] = (err[fase] || 0) + 1; Unico.errTot++;
    ultimo[fase] = { msg: String(e && e.message || e), stack: String(e && e.stack || e).slice(0, 2000), passo: Unico.passi };
    if (n === 1 || n % CFG.avvisaOgni === 0) cerr('[Unico] errore nella fase «' + fase + '» (' + n + (n > 1 ? ' volte' : ' volta') + ')', e);
  }
  // le spie dei moduli vecchi: l'errore che hanno preso da sé, letto dopo la loro fase e rimesso a zero (così il prossimo si vede)
  const SPIE = { vita: () => { const V = typeof Vita !== 'undefined' ? Vita : null; if (V && V.err) { const e = V.err; V.err = null; return e; } return null; } };
  // dentro una fase, console.warn('[Modulo]', errore) (come fanno commedia, parola, vita, iniziative, casa) è un errore della fase
  const avvisoDi = (fase, w0) => function () {
    const a = arguments;
    if (a.length >= 2 && /^\[[A-Za-zÀ-ú]+\]$/.test(String(a[0])) && a[1] && (a[1] instanceof Error || a[1].stack)) { conta(fase, a[1]); return; }
    return w0.apply(console, a);
  };

  // ======================= LE MISURE PER FASE =======================
  const MIS = {};
  function misura(fase, ms) {
    let m = MIS[fase]; if (!m) m = MIS[fase] = { n: 0, i: 0, a: new Float64Array(CFG.anello), max: 0, tot: 0 };
    m.a[m.i] = ms; m.i = (m.i + 1) % m.a.length; m.n++; m.tot += ms; if (ms > m.max) m.max = ms;
  }
  function misure() {
    const out = {};
    for (const k in MIS) {
      const m = MIS[k], L = Array.from(m.a.subarray(0, Math.min(m.n, m.a.length))).sort((x, y) => x - y), q = p => L.length ? L[Math.min(L.length - 1, Math.floor(p * L.length))] : 0;
      out[k] = { n: m.n, p50: q(.5), p95: q(.95), p99: q(.99), max: m.max, media: m.n ? m.tot / m.n : 0, err: err[k] || 0 };
    }
    return out;
  }
  const MARK = PERF && typeof performance !== 'undefined' && performance.mark && performance.measure;

  // ======================= LE FASI =======================
  const BASE = { step: H.step, create: H.create };
  const PRESI = { step: [], create: [] };
  const FASI = [];
  const pila = [];
  let prof = 0;
  const traccia = Unico.traccia = [];
  function esegui(fase, fn, st, dt) {
    if (CFG.traccia) traccia.push('>' + fase);
    const t0 = now(); pila.push(0);
    if (MARK) try { performance.mark('unico>' + fase); } catch (e) { }
    const c = typeof console !== 'undefined' ? console : null, w0 = c && c.warn;
    if (w0) c.warn = avvisoDi(fase, w0);
    try { fn(st, dt); }
    catch (e) { conta(fase, e); }
    finally {
      if (w0) c.warn = w0;
      const sp = SPIE[fase]; if (sp) { const e = sp(); if (e) conta(fase, e); }
      const el = now() - t0, ch = pila.pop(); misura(fase, el - ch); if (pila.length) pila[pila.length - 1] += el;
      if (MARK) try { performance.measure('unico:' + fase, 'unico>' + fase); } catch (e) { }
      if (CFG.traccia) traccia.push('<' + fase);
    }
  }
  const nomeFase = (tipo, nome) => tipo === 'step' ? nome : tipo + '.' + nome;
  // la fase interna al modulo k: k = 0 è la BASE (la catena del gioco), k > 0 il modulo k-1
  function dentro(tipo, k, st, dt) {
    if (k <= 0) { const b = BASE[tipo]; if (b) esegui(nomeFase(tipo, 'base'), b, st, dt); return; }
    const p = PRESI[tipo][k - 1]; esegui(nomeFase(tipo, p.nome), p.fn, st, dt);
  }
  // il passo intero: la catena composta e poi le fasi nuove
  function passo(st, dt, k) {
    const fuori = !inSim; inSim = true; Unico.st = st; prof++;
    try {
      if (!st.u) tardi(st);
      dentro('step', k === undefined ? PRESI.step.length : k, st, dt);
      for (let i = 0; i < FASI.length; i++) esegui(FASI[i].nome, FASI[i].fn, st, dt);
    } finally { prof--; if (fuori) inSim = false; Unico.passi++; }
  }
  // la nascita: prima di tutti il caso a seme (st.rng salvabile, st.u coi flussi), poi la catena, poi chi nasce dopo (Unico.nasce)
  const NASCE = [];
  function crea(st, k) {
    const fuori = !inSim; inSim = true; prof++;
    try {
      Unico.st = st;
      if (!st.u) st.u = attesaU || nuovoU(Unico._seme !== undefined ? Unico._seme : 1986);
      try { adotta(st); } catch (e) { conta('caso', e); }
      dentro('create', k === undefined ? PRESI.create.length : k, st);
      for (let i = 0; i < NASCE.length; i++) esegui('nasce.' + NASCE[i].nome, NASCE[i].fn, st);
    } finally { prof--; if (fuori) inSim = false; }
  }
  // le porte: chi legge HOOKS.step riceve «il prossimo nell'ordine»; chiamata da fuori di un passo è il passo intero da lì in giù
  const PORTE = { step: [], create: [] };
  function porta(tipo, k) {
    const P = PORTE[tipo]; if (P[k]) return P[k];
    return P[k] = tipo === 'step'
      ? (st, dt) => { if (prof) dentro('step', k, st, dt); else passo(st, dt, k); }
      : st => { if (prof) dentro('create', k, st); else crea(st, k); };
  }
  const nomeChi = () => { const s = typeof document !== 'undefined' && document.currentScript; return (s && s.dataset && s.dataset.m) || Unico._nomeProva || null; };
  const MS = () => typeof Misura !== 'undefined' && Misura.ON && Misura.timed ? Misura : null;
  let chiusa = false;
  function trappola(tipo) {
    Object.defineProperty(H, tipo, { configurable: true, enumerable: true,
      get() { return porta(tipo, PRESI[tipo].length); },
      set(fn) {
        if (typeof fn !== 'function') return;
        const L = PRESI[tipo], nome = nomeChi() || ('anon' + L.length);
        if (L.some(p => p.nome === nome)) conta('porta', new Error('la fase «' + nome + '» avvolge due volte HOOKS.' + tipo));
        const M = MS(); L.push({ nome, fn: M ? M.timed(fn, nome + ':' + tipo) : fn });
      } });
  }
  trappola('step'); trappola('create');

  // alla fine del caricamento: le due proprietà tornano normali, e Game.step / Game.create si avvolgono una volta, per ultimi
  function chiudi() {
    if (chiusa) return Unico; chiusa = true;
    Object.defineProperty(H, 'step', { value: (st, dt) => { if (prof) dentro('step', PRESI.step.length, st, dt); else passo(st, dt); }, writable: true, configurable: true, enumerable: true });
    Object.defineProperty(H, 'create', { value: st => { if (prof) dentro('create', PRESI.create.length, st); else crea(st); }, writable: true, configurable: true, enumerable: true });
    Unico.passo = H.step; Unico.nascita = H.create;
    const gs0 = G.step;
    G.step = function (st, dt, inp) {
      if (inSim) { Unico.rientri++; return; }   // la guardia di rientro: un passo dentro il passo non gira
      inSim = true; Unico.st = st;
      try { return gs0.call(this, st, dt, inp); } finally { inSim = false; }
    };
    for (const k in gs0) if (Object.prototype.hasOwnProperty.call(gs0, k)) G.step[k] = gs0[k];   // __rs di risacca_ui e simili
    G.step.__unico = true;
    const gc0 = G.create;
    G.create = function (seed) {
      const fuori = !inSim; inSim = true; Unico._seme = (seed || 1986); attesaU = nuovoU(Unico._seme);
      try { return gc0.apply(this, arguments); } finally { attesaU = null; if (fuori) inSim = false; }
    };
    for (const k in gc0) if (Object.prototype.hasOwnProperty.call(gc0, k)) G.create[k] = gc0[k];
    if (PERF) riquadro();
    return Unico;
  }

  // ======================= ?perf: il riquadro delle fasi =======================
  function rapporto() {
    const M = misure(), L = Object.keys(M).sort((a, b) => M[b].p95 - M[a].p95);
    const f = x => x.toFixed(2).padStart(5);
    return 'unico · passi ' + Unico.passi + ' · rientri ' + Unico.rientri + ' · errori ' + Unico.errTot + '\n' +
      'fase              p50   p95   p99   max  err\n' +
      L.map(k => (k + '               ').slice(0, 15) + f(M[k].p50) + ' ' + f(M[k].p95) + ' ' + f(M[k].p99) + ' ' + f(M[k].max) + '  ' + M[k].err).join('\n');
  }
  function riquadro() {
    if (typeof document === 'undefined' || typeof setInterval === 'undefined') return;
    let el = null;
    setInterval(() => {
      if (!el) { if (!document.body) return; el = document.createElement('pre'); el.id = 'unico-perf'; el.style.cssText = 'position:fixed;right:6px;bottom:6px;z-index:61;pointer-events:none;margin:0;padding:6px 8px;background:rgba(8,8,14,.82);color:#e8e0d0;font:10px/1.35 monospace;white-space:pre'; document.body.appendChild(el); }
      el.textContent = rapporto();
    }, 1000);
  }

  // le fasi nuove (dal passo 1 in poi): girano dopo la catena composta, in ordine di registrazione
  function fase(nome, opt, fn) {
    if (typeof opt === 'function') { fn = opt; opt = {}; }
    if (FASI.some(f => f.nome === nome)) throw new Error('[Unico] fase già registrata: ' + nome);
    FASI.push({ nome, fn, dopo: (opt && opt.dopo) || null, budget: (opt && opt.budget) || null });
    return Unico;
  }
  function nasce(nome, fn) { NASCE.push({ nome, fn }); return Unico; }
  const ordine = tipo => PRESI[tipo || 'step'].map(p => p.nome);

  Object.assign(Unico, {
    CFG, err, ultimo, passi: 0, rientri: 0, errTot: 0, instradati: 0, st: null, _nomeProva: null,
    xs32, flusso, salvaCaso, caricaCaso, fase, nasce, chiudi, ordine, misure, rapporto,
    _: { indietro, hash, seme4, sfc, nuovoU, adotta, tardi, conta, BASE, PRESI, FASI, ORIG_RANDOM },
  });
  Object.defineProperty(Unico, 'inSim', { enumerable: true, get: () => inSim });
  return Unico;
})();
if (typeof window !== 'undefined') window.Unico = Unico;
