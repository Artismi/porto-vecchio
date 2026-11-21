// [suono] LA MUSICA ADATTIVA, I PASSI, GLI AMBIENTI, IL MIX (src/musica.js, src/audio.js; v7/squadra/suono/RICERCA.md)
// node test_suono.js   (da v7/src)
// Un AudioContext finto che fa come quello vero dove conta (le eccezioni: la rampa esponenziale verso lo zero, start due volte, i valori
// non finiti, il buffer messo due volte; le sorgenti che finiscono e chiamano onended), il tempo che avanza a mano: si contano le voci
// insieme, i nodi creati al secondo e i millisecondi di JavaScript per fotogramma.
'use strict';
let male = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'NO   ') + m); if (!c) male++; };
// ---------------- l'AudioContext finto ----------------
function finto() {
  const C = { currentTime: 0, sampleRate: 48000, state: 'running', destination: { connect() { } }, nodi: 0, vive: new Set(), maxVive: 0, perTipo: {} };
  const P = v => { const p = { value: v, ev: 0,
    setValueAtTime(x, t) { chk(x, t); this.value = x; this.ev++; return this; }, setTargetAtTime(x, t, k) { chk(x, t); if (!(k > 0)) throw new RangeError('timeConstant'); this.value = x; this.ev++; return this; },
    linearRampToValueAtTime(x, t) { chk(x, t); this.value = x; this.ev++; return this; }, exponentialRampToValueAtTime(x, t) { chk(x, t); if (!(x > 0) && !(x < 0)) throw new RangeError('exponentialRamp verso lo zero'); this.value = x; this.ev++; return this; },
    cancelScheduledValues(t) { chk(0, t); return this; } }; return p; };
  const chk = (x, t) => { if (!isFinite(x) || !isFinite(t)) throw new TypeError('valore non finito ' + x + ' @ ' + t); };
  const nodo = (tipo, extra) => { C.nodi++; C.perTipo[tipo] = (C.perTipo[tipo] || 0) + 1; return Object.assign({ tipo, connect(d) { if (!d) throw new TypeError('connect(undefined)'); return d; }, disconnect() { } }, extra); };
  const sorgente = (tipo, extra) => { const n = nodo(tipo, extra); let avviata = false; n.start = function (t, off) { if (avviata) throw new Error('InvalidStateError: start due volte'); chk(0, t || 0); if (off !== undefined) chk(off, 0); avviata = true; this.t0 = t || 0; this.fine = this.loop ? 1e9 : this.t0 + (this.buffer ? this.buffer.duration / this.playbackRate.value : 1e9); C.vive.add(this); C.maxVive = Math.max(C.maxVive, C.vive.size); };
    n.stop = function (t) { if (!avviata) throw new Error('InvalidStateError: stop prima di start'); chk(0, t || 0); this.fine = Math.min(this.fine, t || C.currentTime); }; return n; };
  Object.assign(C, {
    createGain: () => nodo('gain', { gain: P(1) }), createBiquadFilter: () => nodo('biquad', { type: 'lowpass', frequency: P(350), Q: P(1), gain: P(0) }),
    createStereoPanner: () => nodo('pan', { pan: P(0) }), createDynamicsCompressor: () => nodo('comp', { threshold: P(-24), ratio: P(12), knee: P(30), attack: P(.003), release: P(.25) }),
    createDelay: () => nodo('delay', { delayTime: P(0) }),
    createOscillator: () => sorgente('osc', { type: 'sine', frequency: P(440), detune: P(0) }),
    createBufferSource: () => { let b = null; const n = sorgente('buf', { playbackRate: P(1), detune: P(0), loop: false }); Object.defineProperty(n, 'buffer', { get: () => b, set: v => { if (b) throw new Error('InvalidStateError: buffer due volte'); b = v; } }); return n; },
    createBuffer: (ch, len, sr) => { if (!(sr >= 3000 && sr <= 768000)) throw new Error('NotSupportedError: sampleRate'); if (!(len > 0)) throw new Error('NotSupportedError: length'); const d = []; for (let i = 0; i < ch; i++) d.push(new Float32Array(len)); return { length: len, sampleRate: sr, duration: len / sr, numberOfChannels: ch, getChannelData: i => d[i], copyToChannel(a, i) { d[i].set(a); } }; },
    resume() { C.state = 'running'; return Promise.resolve(); }, suspend() { C.state = 'suspended'; return Promise.resolve(); },
    avanza(dt) { C.currentTime += dt; for (const s of [...C.vive]) if (s.fine <= C.currentTime) { C.vive.delete(s); if (s.onended) s.onended(); } },
  });
  return C;
}
// il mondo minimo per audio.js
global.window = global; global.location = { search: '' };
let CTX = null; global.AudioContext = function () { CTX = finto(); return CTX; };
global.document = { addEventListener() { }, hidden: false };
const Musica = global.Musica = require('./musica.js');
const SR = Musica.SR;

// 1. I CAMPIONI: tutti finiti, al loro picco, e quanto costano
{ let nan = 0, bytes = 0; const t0 = Date.now();
  for (const n in Musica.RIC) { const d = Musica.cuociOra(n); bytes += d.length * 4; let p = 0; for (let i = 0; i < d.length; i++) { if (!isFinite(d[i])) nan++; p = Math.max(p, Math.abs(d[i])); } if (Musica.RIC[n].norm && Math.abs(p - Musica.RIC[n].norm) > .01) { nan++; console.log('   picco ' + n + ' ' + p.toFixed(3)); } }
  const ms = Date.now() - t0;
  ok(nan === 0, `${Object.keys(Musica.RIC).length} campioni della musica cotti, nessun valore rotto, ognuno al suo picco`);
  ok(bytes < 2.5e6, `la memoria dei campioni della musica: ${(bytes / 1e6).toFixed(2)} MB (mono, ${SR} Hz)`);
  console.log(`     (cottura completa in ${ms} ms su questa macchina: nel gioco a pezzi da ${Musica.K.lavoro} ms per fotogramma)`); }

// 1b. LA CUCINA DEL LAVORATORE: lo stesso testo che va nel Web Worker, in un contesto vuoto (solo Math e Float32Array): ogni ricetta deve
// cuocere uguale a qui (se una usasse qualcosa di fuori dal lavoratore, lì si romperebbe)
{ const vm = require('vm'); let fuori = []; const cx = { Math, Float32Array, postMessage: m => fuori.push(m) }; vm.createContext(cx); vm.runInContext(Musica.testoCucina(), cx);
  let rotti = [], diversi = []; for (const n in Musica.RIC) { const r = Musica.RIC[n]; fuori = []; cx.onmessage({ data: { nome: n, src: r.fn.toString(), dur: r.dur, norm: r.norm, seed: 42 } }); const m = fuori[0];
    if (!m || m.err) { rotti.push(n + (m ? ': ' + m.err : '')); continue; } const q = Musica.cuociOra(n, 42); let dd = 0; for (let i = 0; i < q.length; i++) dd = Math.max(dd, Math.abs(q[i] - m.d[i])); if (dd > 1e-5) diversi.push(n); }
  ok(!rotti.length && !diversi.length, `le ricette cuociono uguali nel lavoratore (fuori dal filo del gioco)${rotti.length ? ': rotte ' + rotti.join('; ') : ''}${diversi.length ? ': diverse ' + diversi.join(', ') : ''}`); }

// 2. LA SCELTA: la pace, l'azione che entra sul battito, la pace che torna sulla battuta pari, le sezioni, il silenzio
{ const S = Musica.nuovoStato(7); let ev = []; const giro = (T, passi) => { for (let i = 0; i < passi; i++) { let e = null; if (S.step % 4 === 0) e = Musica.battito(S, T); if (S.step % 16 === 0) e = Musica.battuta(S, T, 0) || e; if (e) ev.push([S.step, e]); S.step++; } };
  giro(0, 16 * 200); const sez = new Set(), viste = [];
  { const S2 = Musica.nuovoStato(11); for (let i = 0; i < 16 * 300; i++) { if (i % 16 === 0) { Musica.battuta(S2, 0, 0); sez.add(S2.sez); viste.push(S2.sez); } } }
  ok(S.modo === 'pace' && sez.has('silenzio') && sez.has('groove') && sez.has('melodia') && sez.has('stacco'), `in pace 300 battute: ${[...sez].join(', ')} (le pause di silenzio comprese)`);
  let fila = 0, maxFila = 0; for (let i = 1; i < viste.length; i++) { fila = viste[i] === viste[i - 1] ? fila + 1 : 0; maxFila = Math.max(maxFila, fila); }
  ok(maxFila <= 32, `nessuna sezione resta più di ${maxFila + 1} battute di fila (il silenzio ne dura 16)`);
  // l'azione: entra al primo battito sopra la soglia
  ev = []; S.step = S.step - (S.step % 16) + 5; giro(.85, 4); const e1 = ev.find(x => x[1] === 'entra');
  ok(S.modo === 'azione' && e1, `la tensione a 0,85 (inseguimento): l'azione entra sul battito dopo (${e1 ? 'passo ' + e1[0] : 'mai'})`);
  ev = []; giro(.1, 16 * 2); ok(S.modo === 'azione', `due battute dopo la fine della lotta l'azione tiene ancora (almeno ${Musica.K.minAzione} battute: niente andirivieni)`);
  giro(.1, 16 * 6); const e2 = ev.find(x => x[1] === 'esce');
  ok(S.modo === 'pace' && e2 && e2[0] % 16 === 0, `poi torna la pace, sulla battuta (passo ${e2 ? e2[0] : '-'}: ${e2 ? 'inizio di battuta' : ''})`);
  // la pace inquieta (ricercato 1: 0,5): niente azione, niente silenzio, il giro scuro
  const S3 = Musica.nuovoStato(3); S3.sez = 'silenzio'; let az = false; for (let i = 0; i < 16 * 40; i++) { if (i % 4 === 0 && Musica.battito(S3, .5)) az = true; if (i % 16 === 0) Musica.battuta(S3, .5, 0); S3.step++; }
  ok(!az && S3.sez !== 'silenzio' && S3.giro === 'scuro', `ricercato (tensione 0,5): resta la pace, ma inquieta (${S3.sez}, giro ${S3.giro}), mai il silenzio`);
  const L = {}; Musica.strati({ modo: 'azione' }, .5, L); const l1 = Object.assign({}, L); Musica.strati({ modo: 'azione' }, .9, L);
  ok(!l1.hat16 && !l1.pad && L.hat16 && L.pad && L.extra, `gli strati dell'azione salgono con la tensione: a 0,5 batteria e basso; a 0,9 charleston a sedicesimi, archi, stab pieni, scratch`);
  const S4 = Musica.nuovoStato(5); let notte = 0; for (let i = 0; i < 400; i++) { Musica.battuta(S4, 0, 1); if (S4.sez === 'notte') notte++; }
  ok(notte > 60, `di notte la sezione notturna (archi, il rim, poco basso): ${notte} battute su 400`); }

module.exports = { finto, ok, esito: () => male };
// il gioco minimo per audio.js: le caselle, il giocatore, la regia, il disegno (la clip del modello)
function mondo() {
  const T = { COB: 0, VIA: 1, BLD: 2, PIAZZA: 3, WATER: 4, QUAY: 5, FOUNT: 6, PIER: 7, SAND: 8, GRASS: 9, STAIRS: 10, WALK: 11, ROCK: 12, TREE: 13, DIRT: 14, FIELD: 15, DESERT: 16, SALT: 17, SHRUB: 18, CLIFF: 19, GRAVEL: 20 };
  const W = { tile: (tx, ty) => tx < 10 ? T.COB : tx < 20 ? T.PIER : tx < 30 ? T.SAND : tx < 40 ? T.GRASS : tx < 50 ? T.GRAVEL : T.WATER };
  global.Game = { T, TS: 2, tileAt: (tx, ty) => W.tile(tx, ty) };
  global.Cinema = { S: { v: 0, motivo: 'calma' } };
  const clip = { name: 'CharacterArmature|Walk', duration: 1.07 }, cur = { time: 0, getClip: () => clip };
  const R = { __dyn: { people: { __player: { userData: { cur } } } }, nightLevel: () => 0, isRaining: () => false, project: () => ({ x: .5 }) };
  const st = { t: 600, clock: 0, player: { x: 5, y: 5, speed: 0, anim: 0, hp: 100 }, vehicles: [], npcs: [], sfx: [], feed: [], slowmo: 0 };
  return { T, R, st, clip, cur, W };
}
function carica() { delete require.cache[require.resolve('./audio.js')]; const src = require('fs').readFileSync(__dirname + '/audio.js', 'utf8'); return new Function(src + '\nreturn Audio8;')(); }
module.exports.mondo = mondo; module.exports.carica = carica;
if (require.main === module) {
  // 3. LA MUSICA NEL GIOCO: 6 minuti a 30 fps con un copione di tensione, contando voci, nodi, eccezioni e millisecondi
  const M = Musica; const ctx = new global.AudioContext(); const bus = ctx.createGain(); M.collega(ctx, bus);
  let err = 0, frames = 0, ms = 0, msMax = 0, entrataT = null, salitaT = null; const dt = 1 / 30, campi = [];
  const T = s => s < 120 ? 0 : s < 125 ? Math.min(.85, (s - 120) * 2) : s < 160 ? .85 : s < 200 ? Math.max(0, .85 - (s - 160) * .1) : s < 240 ? .45 : 0;
  for (let s = 0; s < 360; s += dt) {
    ctx.avanza(dt); const a = Date.now();
    try { M.tick(ctx.currentTime, { T: T(s), notte: s > 300 ? 1 : 0, attivo: true }); if (Math.abs(s - 150) < dt / 2) M.momento('grosso'); } catch (e) { err++; if (err < 3) console.log('   ', e.stack.split('\n').slice(0, 3).join(' | ')); }
    const b = Date.now() - a; frames++; if (b > 20 && s > 30) console.log('     fotogramma lento a ' + s.toFixed(1) + ' s: ' + b + ' ms'); if (s > 30) { ms += b; msMax = Math.max(msMax, b); }
    if (salitaT === null && T(s) >= M.K.entra) salitaT = ctx.currentTime;
    if (entrataT === null && M.M.tEntra) entrataT = M.M.tEntra;
    if (Math.abs(s % 10) < dt) campi.push(M.stato());
  }
  const st = M.stato();
  ok(err === 0, `6 minuti di musica (pace, inseguimento, pace inquieta, notte): nessuna eccezione`);
  ok(st.pronta && st.campioni >= 15, `i campioni cotti a pezzi nel gioco: ${st.campioni}, ${st.msCottura} ms di cottura in tutto`);
  ok(entrataT !== null && entrataT - salitaT < 60 / 82 + Musica.K.anticipo, `l'azione si sente ${(entrataT - salitaT).toFixed(2)} s dopo che la tensione passa la soglia (sul battito dopo: al più 0,63 s a 96 BPM, più l'anticipo)`);
  ok(ctx.maxVive <= M.K.voci + 12, `le voci insieme, al più: ${ctx.maxVive} (tetto della musica ${M.K.voci})`);
  const nodiS = ctx.nodi / 360; ok(nodiS < 60, `nodi creati: ${nodiS.toFixed(1)} al secondo (sorgente e guadagno per nota; mai a ogni fotogramma)`);
  ok(ms / frames < 1.5, `il JavaScript della musica: ${(ms / frames).toFixed(3)} ms per fotogramma in media, ${msMax} ms al più (a regime)`);
  const modi = new Set(campi.map(c => c && c.sezione)); console.log('     sezioni sentite: ' + [...modi].join(', '));
  // 4. I PASSI: a tempo con la clip, per superficie
  { const W = mondo(), A = carica(); A.init(); const C = CTX, p = W.st.player; let err = 0;
    const cammina = (sp, secondi, clipNome, dur) => { W.clip.name = 'CharacterArmature|' + clipNome; W.clip.duration = dur; p.speed = sp; const ts = clipNome === 'Walk' ? Math.min(2.2, Math.max(.55, sp / 1.6)) : Math.min(1.6, Math.max(.6, sp / 5)); const n0 = A.stato().passi.n;
      for (let s = 0; s < secondi; s += 1 / 30) { C.avanza(1 / 30); W.cur.time = (W.cur.time + ts / 30) % dur; p.anim += (p.lv && p.lv.k === 'scala' ? 4 : sp * 3) / 30;   /* tetti.js: sulla scala p.anim + 4·dt */ try { A.update(W.st, W.R, {}); } catch (e) { err++; if (err < 3) console.log('   ', e.stack.split('\n').slice(0, 3).join(' | ')); } }
      return (A.stato().passi.n - n0) / secondi; };
    cammina(0, 20, 'Walk', 1.07);   // la cottura (qui, senza lavoratore)
    const r0 = cammina(0, 4, 'Idle', 1); const passi = () => C.vive.size;
    const rw = cammina(1.6, 10, 'Walk', 1.07), rr = cammina(5, 10, 'Run', .7);
    ok(err === 0 && r0 === 0, `fermo nessun passo (${r0.toFixed(1)} al secondo)`);
    ok(Math.abs(rw - 2 / 1.07) < .35, `camminando a 1,6 m/s: ${rw.toFixed(2)} passi al secondo (la clip Walk: due appoggi ogni ${1.07} s)`);
    ok(Math.abs(rr - 2 / .7) < .45, `correndo a 5 m/s: ${rr.toFixed(2)} passi al secondo (Run: due appoggi ogni 0,7 s)`);
    const sup = []; for (const x of [5, 25, 45, 65, 85, 105]) { p.x = x; cammina(1.6, 1.2, 'Walk', 1.07); sup.push(A.stato().passi.sup); }
    ok(sup.join() === 'pietra,legno,sabbia,erba,ghiaia,acqua', `la superficie sotto i piedi: ${sup.join(', ')}`);
    p.x = 5; p.indoor = { b: 1 }; cammina(1.6, 1.2, 'Walk', 1.07); ok(A.stato().passi.sup === 'legno', `dentro casa il legno`); p.indoor = null;
    p.lv = { k: 'scala', t: .3 }; p.speed = 0; const rl = cammina(0, 3, 'Idle', 1); ok(rl > .5 && A.stato().passi.sup === 'metallo', `sulla scala a pioli: ${rl.toFixed(1)} pioli al secondo, metallo`); p.lv = null;
    p.vehicle = 'v1'; const rv = cammina(5, 3, 'Run', .7); ok(rv === 0, `in macchina niente passi`); p.vehicle = null;
    const pr = Object.keys(global.Musica.buf).filter(n => /^p_/.test(n)).length; ok(pr === 21, `i campioni dei passi: ${pr} (7 superfici per 3 varianti)`);
    // 5. GLI AMBIENTI: i letti per la zona e per l'ora
    const T = W.T; for (let i = 0; i < 3000 && global.Musica.stato().inCoda; i++) { C.avanza(1 / 30); A.update(W.st, W.R, {}); }
    const scena = (f, extra) => { W.W.tile = f; Object.assign(W.st.player, { x: 100, y: 100, speed: 0, indoor: null, lv: null }, extra && extra.p); W.st.npcs = (extra && extra.npcs) || []; W.R.nightLevel = () => (extra && extra.notte) || 0;
      for (let s = 0; s < 12; s += 1 / 30) { C.avanza(1 / 30); try { A.update(W.st, W.R, {}); } catch (e) { err++; if (err < 4) console.log('   ', e.stack.split('\n').slice(0, 3).join(' | ')); } } return A.stato().ambiente; };
    const porto = scena((tx, ty) => ty < 50 ? T.WATER : ty < 52 ? T.QUAY : T.COB), vicolo = scena((tx, ty) => (tx % 4 < 2 ? T.BLD : T.COB)), spiaggia = scena((tx, ty) => ty < 50 ? T.WATER : T.SAND),
      notte = scena(() => T.GRASS, { notte: 1 }), giorno = scena(() => T.GRASS), folla = scena(() => T.PIAZZA, { npcs: Array.from({ length: 20 }, (_, i) => ({ x: 100 + i % 5, y: 100 + (i / 5 | 0), action: {} })) }),
      casa = scena((tx, ty) => ty < 50 ? T.WATER : T.COB, { p: { indoor: { b: 1 } } });
    const liv = (a, n) => { const r = a.letti.find(x => x.startsWith(n + ' ')); return r ? +r.split(' ')[1] : 0; };
    ok(err === 0, `gli ambienti girano senza eccezioni (porto, vicolo, spiaggia, campagna di giorno e di notte, piazza piena, dentro casa)`);
    ok(liv(porto, 'porto') > .1 && liv(porto, 'mare') > .3, `sul molo: lo sciabordio ${liv(porto, 'porto')} e il mare ${liv(porto, 'mare')}`);
    ok(liv(vicolo, 'citta') > .2 && liv(vicolo, 'mare') < .1 && !liv(vicolo, 'porto'), `nel vicolo: il brusio del paese ${liv(vicolo, 'citta')}, il mare lontano ${liv(vicolo, 'mare')}`);
    ok(liv(spiaggia, 'mare') > .4 && !liv(spiaggia, 'porto'), `sulla spiaggia: il mare ${liv(spiaggia, 'mare')}, niente porto`);
    ok(liv(notte, 'grilli') > .05 && !liv(notte, 'cicale') && liv(giorno, 'cicale') > .05 && !liv(giorno, 'grilli'), `nei campi: di giorno le cicale (${liv(giorno, 'cicale')}), di notte i grilli (${liv(notte, 'grilli')})`);
    ok(liv(folla, 'folla') > .2, `in piazza con 20 persone attorno: la folla ${liv(folla, 'folla')}`);
    ok(liv(casa, 'mare') < liv(spiaggia, 'mare') * .5, `dentro casa il fuori ovattato (il mare ${liv(casa, 'mare')})`);
    ok(folla.letti.length <= 5, `i letti accesi insieme, al più: ${folla.letti.length} (${folla.letti.join(', ')}); quelli muti si fermano`);
    const am = Object.keys(global.Musica.buf).filter(n => /^[au]_/.test(n)).length; ok(am === 14, `i campioni degli ambienti: ${am} (7 letti, 7 eventi)`);
    // le ricette di audio.js (passi, ambienti) nel lavoratore: usano solo quello che lì c'è
    { const vm = require('vm'); let fuori = []; const cx = { Math, Float32Array, postMessage: m => fuori.push(m) }; vm.createContext(cx); vm.runInContext(global.Musica.testoCucina(), cx); const rotti = []; let byte = 0;
      for (const n in global.Musica.RIC) { if (!/^[pau]_/.test(n)) continue; const r = global.Musica.RIC[n]; fuori = []; cx.onmessage({ data: { nome: n, src: r.fn.toString(), dur: r.dur, norm: r.norm, seed: 9 } }); if (!fuori[0] || fuori[0].err) rotti.push(n + ': ' + (fuori[0] && fuori[0].err)); else byte += fuori[0].d.length * 4; }
      ok(!rotti.length, `le ricette dei passi e degli ambienti cuociono nel lavoratore${rotti.length ? ': ' + rotti.slice(0, 3).join('; ') : ''} (${(byte / 1e6).toFixed(2)} MB)`); } }
  if (!male) console.log('\ntutto bene'); else { console.log('\n' + male + ' prove fallite'); process.exitCode = 1; }
}
