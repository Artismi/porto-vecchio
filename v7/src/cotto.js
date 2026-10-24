/* Porto Vecchio — [cotto] IL MONDO COTTO NELLA BUILD.
   La mappa (world_cittanuova.js: strade, lotti, case, caselle) e la rete dei tetti (tetti.js, tetti_vissuti.js) nascono sempre uguali
   da un seme fisso, ma costavano 20-30 s a ogni avvio. build.py le calcola una volta (strumenti/cuoci.js, in Node, nello stesso ordine
   dei moduli del gioco) e le salva in mondo_cotto.js accanto a index.html; all'avvio questo modulo le rilegge al posto del calcolo.
   - L'IMPRONTA: lo sha1 dei sorgenti che producono i dati (FONTI, sotto; build.py la scrive in index.html come PV_IMPRONTA_MONDO).
     Se il file cotto ha un'altra impronta (un sorgente cambiato senza rifare la build), il gioco calcola come prima.
   - ?cuoci=0 (o un parametro che cambia il mondo: ?lotti, ?isolati, ?vecchioverde, ?novissuti, ?vecchia): calcola, sempre.
   - I PUNTI: ogni modulo cotto apre un punto prima del suo calcolo e lo chiude dopo (Cotto.apri / Cotto.chiudi). Nella cottura il
     punto fotografa lo stato che il modulo legge (le «radici», per esempio World), lascia calcolare, e salva quello che il modulo ha
     prodotto (i «privati»: i vettori del modulo) più le modifiche agli oggetti che c'erano già. All'avvio il punto rifà la stessa
     visita delle radici (gli oggetti hanno lo stesso numero d'ordine), controlla che lo stato sia quello della cottura (il conto degli
     oggetti e delle chiavi, la firma dei numeri), riempie i vettori del modulo e riapplica le modifiche. Se qualcosa non torna, il
     punto risponde null e il modulo calcola.
   - Le funzioni non si cuociono: nei dati sono un segnaposto col percorso ("W.preview"), e il modulo le rimette (risolvi).
   - Math.random: i moduli cotti non lo usano (la cottura lo conta e lo salva; all'avvio se ne consumano altrettanti), così tutto
     quello che viene dopo vede lo stesso stato del caso.
   Il formato: un JSON con i riferimenti impliciti (ogni oggetto ha il numero della sua prima visita, {$r: n} lo richiama), i vettori
   tipizzati in un blocco binario a parte (base64). */
var Cotto = (function () {
  'use strict';
  // i sorgenti che producono i dati cotti: tutti i moduli fino a tetti_vissuti.js nell'ordine di index.src.html, più questo
  // (build.py legge questa riga: tenerla su una riga sola)
  const FONTI = ['cotto.js', 'vegetazione.js', 'world_cittanuova.js', 'percorsi.js', 'interiors.js', 'game.js', 'posti.js', 'risacca.js', 'popolo.js', 'azioni.js', 'economia.js', 'fazioni.js', 'soldi.js', 'oggetti.js', 'guardaroba.js', 'protagonista.js', 'attivita.js', 'cassaforti.js', 'mestieri.js', 'scambi.js', 'convivenza.js', 'imprese.js', 'commissioni.js', 'trame.js', 'creativita.js', 'graffiti.js', 'paesaggio.js', 'livelli.js', 'sottosuolo.js', 'ordine.js', 'scontri.js', 'animali.js', 'tetti.js', 'tetti_vissuti.js'];
  const VERSIONE = 1;
  const G = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : {};
  const TA = { Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array };
  const OP = Object.prototype, AP = Array.prototype;
  const tipoTA = v => ArrayBuffer.isView(v) && !(v instanceof DataView) ? v.constructor.name : null;

  // ---------------- base64 (Node e browser) ----------------
  function aB64(u8) {
    if (typeof Buffer !== 'undefined') return Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength).toString('base64');
    let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s);
  }
  function daB64(s) {
    if (typeof Buffer !== 'undefined' && typeof window === 'undefined') { const b = Buffer.from(s, 'base64'); const u = new Uint8Array(b.length); u.set(b); return u; }
    const bin = atob(s), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u;
  }

  // ---------------- la visita: lo stesso ordine nella cottura e all'avvio ----------------
  // visita(v, ids): dà un numero a ogni oggetto raggiungibile da v che non ce l'ha ancora (in profondità, chiavi nel loro ordine)
  function genere(v) {
    if (Array.isArray(v)) return Object.getPrototypeOf(v) === AP ? 'a' : null;
    if (v instanceof Map) return 'm'; if (v instanceof Set) return 's';
    if (tipoTA(v)) return 't';
    const p = Object.getPrototypeOf(v); return p === OP || p === null ? 'o' : null;
  }
  function visita(radice, ids, conta) {
    const pila = [radice];
    // in profondità con una pila esplicita (le strade hanno migliaia di punti), nello stesso ordine della ricorsione
    while (pila.length) {
      const v = pila.pop(); if (v === null || typeof v !== 'object' || ids.has(v)) continue;
      const g = genere(v); if (!g) continue;   // un oggetto non semplice (una classe): non si numera e non si visita (se servisse, la codifica lo rifiuta)
      ids.set(v, ids.size); if (conta) { conta.o++; }
      if (g === 't') { if (conta) { conta.n += v.length; let h = 0; for (let i = 0; i < v.length; i++) { const x = v[i]; if (x) h += x * (i % 7 + 1); } conta.s = (conta.s + (h === h ? h : 1)) % 1e9; } continue; }
      const figli = [];
      if (g === 'a') { for (let i = 0; i < v.length; i++) if (i in v) figli.push(v[i]); const k = Object.keys(v); if (k.length !== v.length) k.forEach(q => { if (!(String(+q >>> 0) === q && +q < v.length)) figli.push(v[q]); }); }
      else if (g === 'o') { for (const k in v) if (Object.prototype.hasOwnProperty.call(v, k)) { figli.push(v[k]); if (conta) conta.k++; } }
      else if (g === 'm') v.forEach((x, k) => { figli.push(k, x); });
      else if (g === 's') v.forEach(x => figli.push(x));
      for (let i = figli.length - 1; i >= 0; i--) { const f = figli[i]; if (f !== null && typeof f === 'object' && !ids.has(f)) pila.push(f); }
      if (conta) for (const f of figli) if (typeof f === 'number') conta.s = (conta.s + (f === f ? f * 7.3 : 1)) % 1e9;
    }
  }
  // NB: la pila spinge i figli al rovescio e salta chi ha già un numero: un figlio che compare due volte (prima di essere visitato)
  // prende il numero alla sua prima visita vera. L'encoder sotto segue lo stesso ordine perché usa la stessa visita per i numeri.

  // ---------------- la codifica ----------------
  // enc: il valore in JSON. Oggetti nuovi: il contenuto (e prendono il numero nell'ordine della visita); già numerati: {$r}
  function Codifica(ids, opz) {
    const SORG = opz && opz.sorgenti, TOLL = opz && opz.tollera;   // tollera (per le prove): un oggetto di una classe diventa il nome e i suoi numeri   // per le prove: la funzione col suo sorgente (stessa funzione, stesso testo)
    const bufs = new Map(), parti = [], funz = [];
    let off = 0;
    const buf = ab => { let k = bufs.get(ab); if (k === undefined) { k = bufs.size; const pad = (8 - off % 8) % 8; if (pad) { parti.push(new Uint8Array(pad)); off += pad; } bufs.set(ab, k); parti.push({ ab, off }); off += ab.byteLength; } return k; };
    const bufInfo = [];
    function enc(v, via) {
      if (v === undefined) return { $u: 0 };
      if (v === null || typeof v === 'boolean' || typeof v === 'string') return v;
      if (typeof v === 'number') { if (Object.is(v, -0)) return { $n: '-0' }; if (v !== v) return { $n: 'N' }; if (v === Infinity) return { $n: 'I' }; if (v === -Infinity) return { $n: '-I' }; return v; }
      if (typeof v === 'function') { funz.push(via); return SORG ? { $f: via, s: String(v) } : { $f: via }; }
      if (typeof v !== 'object') throw new Error('[cotto] valore non cuocibile in ' + via + ': ' + typeof v);
      const id = ids.get(v); if (id !== undefined) return { $r: id };
      // numero nuovo: la visita completa da qui (lo stesso ordine della decodifica), poi il contenuto
      return contenuto(v, via, true);
    }
    // il contenuto di v (nuovo: prende il numero; vecchio cambiato: nessun numero)
    function contenuto(v, via, nuovo) {
      const g = genere(v); if (!g && TOLL) { if (nuovo) ids.set(v, ids.size); const o = { $c: v.constructor ? v.constructor.name : '?' }; for (const k of Object.keys(v)) { const x = v[k]; if (typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean') o[k] = x; } return o; }
      if (!g) throw new Error('[cotto] oggetto non semplice in ' + via + ': ' + (v.constructor && v.constructor.name));
      if (nuovo) ids.set(v, ids.size);
      if (g === 't') { const k = buf(v.buffer); return { $t: v.constructor.name, b: k, o: v.byteOffset, n: v.length }; }
      if (g === 'a') {
        const out = new Array(v.length); let buchi = false;
        for (let i = 0; i < v.length; i++) { if (i in v) out[i] = enc(v[i], via + '[' + i + ']'); else { out[i] = { $h: 0 }; buchi = true; } }
        void buchi; const k = Object.keys(v); if (k.length !== v.length) { const ex = {}; let n = 0; k.forEach(q => { if (!(String(+q >>> 0) === q && +q < v.length)) { ex[q] = enc(v[q], via + '.' + q); n++; } }); if (n) return { $a: out, p: ex }; }
        return out;
      }
      if (g === 'o') {
        const out = {}; let dollaro = false;
        for (const k in v) if (Object.prototype.hasOwnProperty.call(v, k)) { if (k.charCodeAt(0) === 36) dollaro = true; out[k] = enc(v[k], via + '.' + k); }
        if (Object.getPrototypeOf(v) === null) return { $o: out, z: 1 };
        return dollaro ? { $o: out } : out;
      }
      if (g === 'm') { const out = []; v.forEach((x, k) => { out.push(enc(k, via + '.k'), enc(x, via + '.v')); }); return { $m: out }; }
      if (g === 's') { const out = []; v.forEach(x => out.push(enc(x, via + '.s'))); return { $s: out }; }
    }
    function binario() {
      const u = new Uint8Array(off); for (const p of parti) { if (p instanceof Uint8Array) continue; u.set(new Uint8Array(p.ab), p.off); bufInfo[bufs.get(p.ab)] = [p.off, p.ab.byteLength]; }
      return { bin: u, bufs: bufInfo };
    }
    return { enc, contenuto, binario, funz };
  }
  // ATTENZIONE all'ordine dei numeri: la codifica numera un oggetto nuovo PRIMA dei suoi figli e li visita in ordine (ricorsione),
  // la decodifica fa lo stesso. visita() (per le radici) numera nello stesso ordine in profondità.

  function Decodifica(ids, bin, bufs, risolvi) {
    const ab = bufs.map(([o, n]) => bin.slice(o, o + n).buffer);   // ogni vettore col suo buffer (allineato)
    const lista = [];   // numero -> oggetto (le radici prima)
    ids.forEach((n, o) => { lista[n] = o; });
    const nuovo = o => { lista.push(o); return o; };
    function dec(j) {
      if (j === null || typeof j !== 'object') return j;
      if (Array.isArray(j)) { const a = nuovo([]); for (let i = 0; i < j.length; i++) { const q = j[i]; if (q && typeof q === 'object' && !Array.isArray(q) && q.$h !== undefined) { a.length = i + 1; continue; } a[i] = dec(q); } a.length = j.length; return a; }
      if (j.$r !== undefined) return lista[j.$r];
      if (j.$n !== undefined) return j.$n === '-0' ? -0 : j.$n === 'N' ? NaN : j.$n === 'I' ? Infinity : -Infinity;
      if (j.$u !== undefined) return undefined;
      if (j.$f !== undefined) { const f = risolvi(j.$f); if (typeof f !== 'function') throw new Error('[cotto] funzione mancante: ' + j.$f); return f; }
      if (j.$t !== undefined) { const C = TA[j.$t]; return nuovo(new C(ab[j.b], j.o, j.n)); }
      if (j.$a !== undefined) { const a = nuovo([]); j.$a.forEach((q, i) => { if (q && typeof q === 'object' && !Array.isArray(q) && q.$h !== undefined) { a.length = i + 1; return; } a[i] = dec(q); }); a.length = j.$a.length; for (const k in j.p) a[k] = dec(j.p[k]); return a; }
      if (j.$m !== undefined) { const m = nuovo(new Map()); for (let i = 0; i < j.$m.length; i += 2) { const k = dec(j.$m[i]); m.set(k, dec(j.$m[i + 1])); } return m; }
      if (j.$s !== undefined) { const s = nuovo(new Set()); j.$s.forEach(q => s.add(dec(q))); return s; }
      if (j.$o !== undefined) { const o = nuovo(j.z ? Object.create(null) : {}); for (const k in j.$o) o[k] = dec(j.$o[k]); return o; }
      const o = nuovo({}); for (const k in j) o[k] = dec(j[k]); return o;
    }
    // riempi un oggetto che c'è già (un vettore del modulo, o un oggetto delle radici cambiato) col contenuto j
    function riempi(t, j) {
      if (Array.isArray(t)) { const s = Array.isArray(j) ? j : j.$a; t.length = 0; s.forEach((q, i) => { if (q && typeof q === 'object' && !Array.isArray(q) && q.$h !== undefined) { t.length = i + 1; return; } t[i] = dec(q); }); t.length = s.length; if (j.p) for (const k in j.p) t[k] = dec(j.p[k]); return t; }
      if (t instanceof Map) { t.clear(); for (let i = 0; i < j.$m.length; i += 2) { const k = dec(j.$m[i]); t.set(k, dec(j.$m[i + 1])); } return t; }
      if (t instanceof Set) { t.clear(); j.$s.forEach(q => t.add(dec(q))); return t; }
      if (ArrayBuffer.isView(t)) { const C = TA[j.$t]; t.set(new C(ab[j.b], j.o, j.n)); return t; }
      const s = j.$o !== undefined ? j.$o : j;
      for (const k of Object.keys(t)) if (!(k in s) && typeof t[k] !== 'function') delete t[k];
      for (const k in s) { const q = s[k]; if (typeof t[k] === 'function' && q && typeof q === 'object' && q.$f !== undefined) continue; t[k] = dec(q); }
      return t;
    }
    return { dec, riempi, lista };
  }

  // ---------------- lo stato del caso ----------------
  let nRandom = 0, contaRandom = false;
  function contaCaso(on) {
    if (on && !contaRandom) { const R0 = Math.random; contaRandom = true; Math.random = function () { nRandom++; return R0.apply(this, arguments); }; Math.random.__cotto0 = R0; }
    return nRandom;
  }

  // ---------------- quando si usa il mondo cotto ----------------
  const QS = typeof location !== 'undefined' && location.search ? location.search : '';
  const VIETA = /[?&](cuoci=0|vivo\b|lotti=|isolati=|vecchioverde\b|novissuti\b|vecchia\b)/.test(QS);
  const CUOCI = !!G.PV_CUOCI;   // la cottura (strumenti/cuoci.js)
  let DATI = null, PERCHE = '';
  const STATO = { usato: {}, calcolato: {}, ms: {}, perche: '' };
  function carica() {
    if (CUOCI) { PERCHE = 'cottura'; return null; }
    if (VIETA) { PERCHE = 'parametro'; return null; }
    const C = G.PV_COTTO; if (!C) { PERCHE = 'manca il file'; return null; }
    const imp = G.PV_IMPRONTA_MONDO; if (!imp || C.impronta !== imp) { PERCHE = 'impronta diversa (' + C.impronta + ' / ' + imp + ')'; return null; }
    if (C.versione !== VERSIONE) { PERCHE = 'versione'; return null; }
    try {
      const t0 = Date.now(); const bin = daB64(C.bin); DATI = { bin, punti: C.punti, ms: Date.now() - t0 };
      return DATI;
    } catch (e) { PERCHE = 'errore: ' + e.message; return null; }
  }
  carica(); STATO.perche = PERCHE;
  if (typeof window !== 'undefined' && typeof console !== 'undefined' && !CUOCI) console.log('[cotto]', DATI ? 'il mondo cotto (impronta ' + G.PV_COTTO.impronta + ')' : 'calcolo: ' + PERCHE);
  if (DATI) { STATO.attivo = true; G.PV_COTTO = null; }   // la stringa grande si libera

  // ---------------- i punti ----------------
  const APERTI = {};
  const ora = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  // apri(nome, radici): prima del calcolo del modulo. Torna un oggetto (la cottura c'è: il modulo NON calcola) o null (il modulo calcola).
  function apri(nome, radici) {
    const t0 = ora();
    if (CUOCI) {
      const ids = new Map(), conta = { o: 0, k: 0, n: 0, s: 0 }; Object.keys(radici).forEach(k => visita(radici[k], ids, conta));
      // la fotografia delle radici: per ogni oggetto il suo contenuto superficiale (per trovare dopo chi è cambiato)
      const foto = new Map(); ids.forEach((n, o) => foto.set(o, superficie(o)));
      APERTI[nome] = { ids, conta, foto, radici, r0: contaCaso(true), t0 };
      return null;
    }
    const P = DATI && DATI.punti[nome]; if (!P) { STATO.calcolato[nome] = DATI ? 'manca il punto' : PERCHE; return null; }
    if (P.usato) { STATO.calcolato[nome] = 'punto già letto'; return null; }
    try {
      const ids = new Map(), conta = { o: 0, k: 0, n: 0, s: 0 }; Object.keys(radici).forEach(k => visita(radici[k], ids, conta));
      const c0 = P.conta; if (c0.o !== conta.o || c0.k !== conta.k || c0.n !== conta.n || Math.abs(c0.s - conta.s) > 1e-6) { consuma(nome); STATO.calcolato[nome] = 'stato diverso ' + JSON.stringify(conta) + ' / ' + JSON.stringify(c0); if (typeof console !== 'undefined') console.warn('[cotto]', nome, STATO.calcolato[nome]); return null; }
      const A = { nome, P, ids, t0 }; APERTI[nome] = A; return A;
    } catch (e) { STATO.calcolato[nome] = 'errore ' + e.message; if (typeof console !== 'undefined') console.warn('[cotto]', nome, e); return null; }
  }
  // il contenuto superficiale di un oggetto: per vedere se è cambiato (i figli per identità, i numeri con Object.is; le funzioni no)
  function superficie(o) {
    const g = genere(o);
    if (g === 't') return { t: 1, v: o.slice() };
    if (g === 'a') { const k = Object.keys(o); return { k: k.length === o.length ? null : k, v: k.length === o.length ? o.slice() : k.map(q => o[q]), l: o.length }; }
    if (g === 'm') { const a = []; o.forEach((x, k) => a.push(k, x)); return { k: null, v: a }; }
    if (g === 's') return { k: null, v: [...o] };
    const k = Object.keys(o); return { k, v: k.map(q => o[q]) };
  }
  function uguale(o, f) {
    const s = superficie(o);
    if (s.l !== f.l || s.v.length !== f.v.length) return false;
    if (s.k !== f.k) { if (!s.k || !f.k || s.k.length !== f.k.length) return false; for (let i = 0; i < s.k.length; i++) if (s.k[i] !== f.k[i]) return false; }
    for (let i = 0; i < s.v.length; i++) { const x = s.v[i], y = f.v[i]; if (typeof x === 'function' && typeof y === 'function') continue; if (!Object.is(x, y)) return false; }
    return true;
  }
  // chiudi(nome, privati, aperto, risolvi): dopo il calcolo. Nella cottura salva; all'avvio (aperto non null) riempie i privati che
  // il modulo passa già fatti (vettori, mappe, oggetti: si riempiono sul posto) e torna { chiave: valore } per gli altri.
  const PUNTI = {};
  // [dieta] un punto letto (o scartato) non serve più: quando sono finiti tutti, via i dati cotti (il blocco binario e i punti, ~40 MB)
  function consuma(nome) { if (!DATI || !DATI.punti[nome]) return; DATI.punti[nome] = { usato: true }; if (Object.keys(DATI.punti).every(k => DATI.punti[k].usato)) { DATI = null; STATO.liberato = true; } }
  // il vettore (o la mappa, o l'oggetto) del modulo si riempie sul posto col contenuto cotto se sono dello stesso genere
  function compatibile(t, j) {
    if (t === null || typeof t !== 'object' || j === null || typeof j !== 'object' || j.$r !== undefined) return false;
    if (Array.isArray(t)) return Array.isArray(j) || j.$a !== undefined;
    if (t instanceof Map) return j.$m !== undefined; if (t instanceof Set) return j.$s !== undefined;
    if (ArrayBuffer.isView(t)) return j.$t === t.constructor.name && j.n === t.length;
    return genere(t) === 'o' && !Array.isArray(j) && j.$m === undefined && j.$s === undefined && j.$t === undefined && j.$a === undefined && j.$f === undefined && j.$n === undefined && j.$u === undefined;
  }
  function chiudi(nome, privati, aperto, risolvi) {
    if (CUOCI) {
      const A = APERTI[nome]; delete APERTI[nome];
      const C = Codifica(A.ids);
      // prima i privati (così i vettori del modulo sono numerati qui, e gli oggetti cambiati li richiamano), poi i cambiati
      const pv = {}; Object.keys(privati).forEach(k => { const v = privati[k]; pv[k] = v !== null && typeof v === 'object' && !A.ids.has(v) ? C.contenuto(v, k, true) : C.enc(v, k); });
      const camb = []; A.foto.forEach((f, o) => { if (!uguale(o, f)) camb.push([A.ids.get(o), C.contenuto(o, '#' + A.ids.get(o), false)]); });
      const r1 = contaCaso(true);
      PUNTI[nome] = { conta: A.conta, privati: pv, cambiati: camb, codifica: C, caso: r1 - A.r0, funzioni: C.funz.slice(), ms: Math.round(ora() - A.t0) };
      return null;
    }
    if (!aperto) return null;
    const P = aperto.P;
    const D = Decodifica(aperto.ids, DATI.bin, P.bufs, risolvi || (p => { throw new Error('[cotto] funzione ' + p); }));
    const out = {};
    // i privati nuovi (fuori dalle radici) si decodificano in oggetti a parte o nei vettori del modulo: se qualcosa va storto qui,
    // nulla è ancora cambiato e il modulo può calcolare. I cambiati toccano le radici: da lì in poi si va fino in fondo.
    const t1 = ora();
    try {
      Object.keys(P.privati).forEach(k => { const j = P.privati[k], t = privati[k];
        if (compatibile(t, j)) { D.lista.push(t); out[k] = D.riempi(t, j); }
        else out[k] = D.dec(j); });
    } catch (e) { STATO.calcolato[nome] = 'errore ' + e.message; if (typeof console !== 'undefined') console.warn('[cotto]', nome, e); delete APERTI[nome]; consuma(nome); return null; }
    P.cambiati.forEach(([n, j]) => D.riempi(D.lista[n], j));
    STATO.ms[nome] = Math.round(ora() - t1);
    for (let i = 0; i < (P.caso || 0); i++) Math.random();
    STATO.usato[nome] = Math.round(ora() - aperto.t0); delete APERTI[nome]; consuma(nome);
    return out;
  }
  // la cottura: tutti i punti in un file solo (strumenti/cuoci.js)
  function sforna(impronta) {
    const parti = [], punti = {}; let off = 0;
    Object.keys(PUNTI).forEach(nome => { const P = PUNTI[nome], b = P.codifica.binario(); const pad = (8 - off % 8) % 8; if (pad) { parti.push(new Uint8Array(pad)); off += pad; }
      parti.push(b.bin); punti[nome] = { conta: P.conta, privati: P.privati, cambiati: P.cambiati, caso: P.caso, bufs: b.bufs.map(([o, n]) => [o + off, n]) }; off += b.bin.length; });
    const bin = new Uint8Array(off); let o = 0; parti.forEach(p => { bin.set(p, o); o += p.length; });
    return { versione: VERSIONE, impronta, punti, bin: aB64(bin), info: Object.fromEntries(Object.keys(PUNTI).map(k => [k, { funzioni: PUNTI[k].funzioni, caso: PUNTI[k].caso, ms: PUNTI[k].ms, cambiati: PUNTI[k].cambiati.length, conta: PUNTI[k].conta }])) };
  }
  // il segnaposto delle funzioni che il modulo rifà dopo la lettura, e la ricerca di quelle rimaste (per le prove)
  const RIFARE = function cottoDaRifare() { throw new Error('[cotto] funzione non rifatta'); };
  function restanti(radice, via) {
    const out = [], seen = new Set(), pila = [[radice, via || '']];
    while (pila.length) { const [v, p] = pila.pop(); if (v === RIFARE) { out.push(p); continue; } if (!v || typeof v !== 'object' || seen.has(v)) continue; seen.add(v);
      const g = genere(v); if (g === 'a' || g === 'o') { for (const k of Object.keys(v)) pila.push([v[k], p + '.' + k]); } else if (g === 'm') v.forEach((x, k) => pila.push([x, p + '.' + String(k)])); else if (g === 's') v.forEach(x => pila.push([x, p + '.s'])); }
    return out;
  }
  return { FONTI, VERSIONE, RIFARE, restanti, apri, chiudi, sforna, visita, Codifica, Decodifica, STATO, get attivo() { return !!DATI || !!STATO.liberato; }, get cuoci() { return CUOCI; }, contaCaso, aB64, daB64 };
})();
if (typeof module !== 'undefined') module.exports = Cotto;
