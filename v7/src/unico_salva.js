/* [unico] unico_salva.js: IL SALVATAGGIO DEL SISTEMA UNICO, passo 6 (progetto: commedia/SISTEMA_UNICO.md §6.2, §1.3 riga 8, §10 riga 6).
   Dietro ?commedia. Spento il flag: Salva = { ON: false } e nient'altro (nessun aggancio, niente IndexedDB, niente timer).

   COSA SI SALVA. Un JSON con la versione (v), l'impronta del gioco, il seme, t, clock, la classe del dispositivo, i passi della porta, il
   caso (st.rng e i flussi, Unico.salvaCaso), st.u (già puro: fatti, menti, segni, prenotazioni) e LO STATO di tutto il resto di st, in
   un codice a grafo senza cicli e senza riferimenti a oggetti:
     {$n: id}       un NPC fuori da st.npcs (in st.npcs c'è per intero)      {$p: 1}  il giocatore fuori da st.player
     {$r: k}        il k-esimo oggetto già scritto (in ordine di visita): così le condivisioni restano (plan[].tgt = homeT, …)
     {$s: via}      una cosa del mondo fisso (G.PLACES, Popolo.OGG, Iniziative.VERBI, le stanze di Livelli…): si ritrova per via
     {$T: [...]}    un array tipizzato a corse (i byte diversi da zero in base64: le grotte di Livelli, 2,5 MB, quasi tutte zero)
     {$M: [...]} {$S: [...]}  Map e Set      {$x: 'NaN'|'I'|'-I'|'u'}  i numeri che JSON perde e undefined      {$o: {...}}  un oggetto
                    vero con una chiave che comincia per $ (l'escape)
   Nel testo gli array di oggetti si scrivono per colonne ({$C}, {$L}: −25% col gzip), e si tolgono esatti alla lettura. Accanto a
   st.u lo stato dei moduli che decide e si raggiunge da fuori (Commedia.R, la regia). Quello che non si raggiunge (il mazzo delle
   battute di commedia.js, NOPE di iniziative.js) ricomincia da capo al caricamento: per questo la partita ricaricata è identica al
   momento del salvataggio, e due caricamenti dello stesso salvataggio danno la stessa storia, ma la storia dopo non è quella della
   partita mai interrotta (test_unico_salva.js lo misura). Salva.normalizza(st) fa sulla partita viva quello che il caricamento fa
   alle chiusure (il punto fermo).
   Una funzione non si scrive mai: o è del mondo fisso ({$s}), o la ricostruisce un adattatore, o si perde e si conta (Salva.stats.persi,
   con le vie). Salva.puro(x) lo controlla: lancia un errore se trova una funzione, un NPC (.pop o .look fuori da npcs) o un ciclo.

   GLI ADATTATORI (via/torna, Salva.ADATTA). ini, vita, parola e casa (e npcs, per i piani a passi):
   - npcs: i piani a passi di Azioni (pop.emer) sono chiusure. Quelli del sistema unico si rifanno uguali dai dati: «verbo» (il verbo,
     gli argomenti e le chiavi delle prenotazioni, presi da Verbo.fai al momento; la meta del passo «va» scritta), «ascolta» (chi parla).
     Gli altri (iniziativa, writer, portavalori, i mandati di parola) si chiudono al caricamento con Azioni.endPlan(…, 'ripreso'):
     «si chiudono come fatte», come casa quando entra il giocatore. I progetti di popolo (pop.projects[].steps: fx, cond, ok) si
     rilegano dalla loro scheda (Popolo.PROJ[kind].steps) passo per passo, se l'etichetta è la stessa.
   - ini: gli NPC (E.L, E.arr, E.cast, E.benef) come {$n}, gli atomi (E.D) come cose del mondo fisso (Iniziative.VERBI).
   - vita: i gruppi di battute in corso perdono alSentito/allaFine (chiusure): a voce restano, la promessa che avrebbero scritto no.
   - casa: le scene in corso non si scrivono; al caricamento l'operazione torna da mettere in opera (si rifà all'arrivo, come oggi).
   - parola: gli NPC come {$n}, i piani (L.obj) restano legati al piano dell'NPC (lo stesso oggetto, {$r}).

   IL CARICAMENTO (Salva.torna(snap, st), in loco): la città di serie (G.create col seme salvato), poi lo stato al posto di quello
   nuovo chiave per chiave, il caso, i passi della porta, gli adattatori, la classe. Nel gioco: all'avvio si legge lo slot (IndexedDB) e
   si rifà la partita con __pv.restart() (main.js: lo stesso st nuovo per il disegno), il passo aspetta al più 4 s. ?commedia&nuova non
   carica. Un salvataggio senza st.u (di prima) si carica lo stesso: st.u resta quello nuovo. Un salvataggio di versione futura non si
   carica e non si sovrascrive. I lavori del giocatore sui muri restano quelli del salvataggio di writing.js (pv.graffiti.v1).

   DOVE E QUANDO. IndexedDB «pv-unico», due slot A e B e un puntatore; gzip con CompressionStream; la somma di controllo (CRC32) per
   slot: se uno è guasto si legge l'altro. Senza IndexedDB, localStorage (sotto i 4 MB). navigator.storage.persist(). Si salva a
   visibilitychange → hidden e a pagehide (subito), ogni 3 minuti veri e quando Nino va a dormire (a fette).

   A FETTE (§1.3: ≤ 4 ms a fetta, requestIdleCallback). La fotografia dello stato si fa a pezzi (un NPC, un modulo, un pezzo di array
   per volta) e intanto il passo del gioco aspetta (la partita resta coerente: niente soldi scritti due volte); poi il testo JSON, il
   gzip (a pezzi da 32 KB) e IndexedDB sono fuori dal passo. La classe consigliata da Mente (troppi sfori) si applica qui: si scrive nel
   salvataggio e vale dalla partita ricaricata (§6.1.4), non a metà. */
var Salva = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Salva = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Salva;
  if (!ON) return Salva;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  if (!G || !Un()) { Salva.ON = false; return Salva; }
  const glob = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
  const DOM = typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.addEventListener;
  const AZ = () => (typeof Azioni !== 'undefined' ? Azioni : null);
  const PO = () => (typeof Popolo !== 'undefined' ? Popolo : null);
  const VB = () => (typeof Verbo !== 'undefined' && Verbo.ON ? Verbo : null);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null); return M && M.ON ? M : null; };
  const FT = () => (typeof Fatto !== 'undefined' && Fatto.ON ? Fatto : null);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const NUOVA = typeof location !== 'undefined' && /[?&]nuova\b/.test(location.search);

  const VER = 1;
  const CFG = Salva.CFG = {
    fetta: 4,               // ms a fetta (§1.3)
    ogni: 180000,           // ogni 3 minuti veri
    attesa: 4000,           // al caricamento il passo aspetta lo slot al più tanto
    lsMax: 4 * 1024 * 1024, // localStorage: solo sotto i 4 MB
    pezzoGz: 32768,         // i pezzi che entrano nel gzip
    tieni: true,            // durante la fotografia a fette il passo aspetta (la partita resta coerente)
    auto: true,             // nel gioco: salva da sé (a hidden, pagehide, ogni 3 minuti, al sonno di Nino) e carica all'avvio
    chiave: 'pv-unico',
  };
  const stats = Salva.stats = { salvati: 0, caricati: 0, persi: 0, viePerse: {}, chiusi: {}, rifatti: {}, rilegati: 0, slegati: 0, fette: 0, fettaMax: 0,
    ms: { foto: 0, json: 0, gz: 0, db: 0 }, ultimo: null, errori: 0, avvisi: [], ripiego: 0, statici: 0, tenuti: 0 };
  const avvisa = m => { stats.avvisi.push(m); if (stats.avvisi.length > 20) stats.avvisi.shift(); if (typeof console !== 'undefined' && console.warn) console.warn('[Salva] ' + m); };

  // ======================= IL MONDO FISSO (le cose che non stanno in st) =======================
  // Le tabelle dei moduli (le schede, i posti, gli oggetti del mondo, gli atomi delle iniziative, le stanze). Si visitano una volta,
  // DOPO la nascita e PRIMA del primo passo (in tutti e due i processi nello stesso momento: le vie tornano uguali), saltando st,
  // il DOM, three.js e i grandi array di numeri. Una cosa di st che sta anche qui (pop.using[] = un oggetto di Popolo.OGG) si scrive
  // come {$s: via} e al caricamento torna lo stesso oggetto del modulo.
  const MODULI = ['Game', 'World', 'Interior', 'Posti', 'Risacca', 'Popolo', 'Azioni', 'Economia', 'Fazioni', 'Soldi', 'Oggetti', 'Guardaroba', 'Protagonista',
    'Attivita', 'Cassaforti', 'Mestieri', 'Scambi', 'Convivenza', 'Imprese', 'Commissioni', 'Trame', 'Creativita', 'Graffiti', 'Livelli', 'Sottosuolo', 'Ordine',
    'Scontri', 'Animali', 'Tetti', 'WriterArte', 'Writing', 'WriterVita', 'Matti', 'Eventi', 'Coro', 'Cantiere', 'Commedia', 'Parola', 'Vita', 'Iniziative', 'Casa'];
  let FISSO = null;   // { di: Map(oggetto → via), a: Map(via → oggetto) }
  const SEP = '\u001f';
  const saltaFisso = v => (v.npcs && v.player && v.clock !== undefined) || v.nodeType || v.isObject3D || v.isMaterial || v.isTexture || v.isBufferGeometry ||
    v.isBufferAttribute || v === glob || (typeof Unico !== 'undefined' && v === Unico) || (typeof Window !== 'undefined' && v instanceof Window);
  function* visitaFisso() {
    const di = new Map(), a = new Map(), L = [];
    for (let i = MODULI.length - 1; i >= 0; i--) { const m = glob[MODULI[i]]; if (m && (typeof m === 'object' || typeof m === 'function')) L.push([m, MODULI[i]]); }
    let k = 0;
    while (L.length) {
      const [v, via] = L.pop();
      if (di.has(v)) continue;
      if (saltaFisso(v)) continue;
      di.set(v, via); a.set(via, v);
      if (++k % 512 === 0) yield k;
      if (k > 400000) break;
      if (ArrayBuffer.isView(v)) continue;
      if (v instanceof Map) { let i = 0; const ch = []; for (const [, x] of v) { if (x && (typeof x === 'object' || typeof x === 'function')) ch.push([x, via + SEP + '<' + i + '>']); i++; } for (let j = ch.length - 1; j >= 0; j--) L.push(ch[j]); continue; }
      if (v instanceof Set || v instanceof WeakMap || v instanceof WeakSet) continue;
      let ks; try { ks = Object.keys(v); } catch (e) { continue; }
      if (Array.isArray(v) && v.length > 64 && typeof v[0] !== 'object') continue;   // le liste di numeri (le mappe): niente da cercare
      const ch = [];
      for (const kk of ks) {
        let x; try { const d = Object.getOwnPropertyDescriptor(v, kk); if (!d || d.get) continue; x = d.value; } catch (e) { continue; }
        if (x && (typeof x === 'object' || typeof x === 'function')) ch.push([x, via + SEP + kk]);
      }
      for (let j = ch.length - 1; j >= 0; j--) L.push(ch[j]);
    }
    FISSO = { di, a, n: k };
    return k;
  }
  function fisso() { if (!FISSO) { const g = visitaFisso(); while (!g.next().done); } return FISSO; }


  // ======================= BASE64 (senza btoa, che non c'è dappertutto) =======================
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const B64I = (() => { const t = new Int16Array(128).fill(-1); for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i; return t; })();
  function a64(b) {
    const out = []; let s = '';
    for (let i = 0; i < b.length; i += 3) {
      const n = (b[i] << 16) | ((b[i + 1] || 0) << 8) | (b[i + 2] || 0);
      s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
      if (s.length > 8192) { out.push(s); s = ''; }
    }
    out.push(s); return out.join('');
  }
  function da64(s) {
    const n = s.length, pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0, out = new Uint8Array(n / 4 * 3 - pad); let o = 0;
    for (let i = 0; i < n; i += 4) {
      const v = (B64I[s.charCodeAt(i)] << 18) | (B64I[s.charCodeAt(i + 1)] << 12) | ((B64I[s.charCodeAt(i + 2)] & 63) << 6) | (B64I[s.charCodeAt(i + 3)] & 63);
      if (o < out.length) out[o++] = (v >> 16) & 255; if (o < out.length) out[o++] = (v >> 8) & 255; if (o < out.length) out[o++] = v & 255;
    }
    return out;
  }
  const bytesDi = x => new Uint8Array(x.buffer, x.byteOffset, x.byteLength);
  const TIPI = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray };
  function taDa(c, bytes) { const C = TIPI[c] || Uint8Array, buf = bytes.slice().buffer; return new C(buf, 0, bytes.length / (C.BYTES_PER_ELEMENT || 1)); }
  // un array tipizzato a corse: i byte diversi da zero, [inizio, base64] (le grotte di Livelli: 2,5 MB quasi tutti zero). A pezzi
  // da 256 KB, così una fetta resta sotto i 4 ms
  const PEZZO_TA = 32768;
  // le corse del pezzo [da, a): finiscono a 8 zeri di fila o alla fine del pezzo (così il base64 di una corsa è al più 32 KB)
  function corse(B, da, a, out) {
    let i = da;
    while (i < a) {
      if (B[i] === 0) { i++; continue; }
      let j = i, z = 0;
      while (j < a) { if (B[j] === 0) { if (++z >= 8) break; } else z = 0; j++; }
      const f = j - (z >= 8 ? z - 1 : z);
      out.push([i, a64(B.subarray(i, f))]); i = j;
    }
  }

  // ======================= IL CODICE A GRAFO =======================
  // Un codificatore che si ferma e riparte (una pila esplicita, in ordine di visita): lo stesso ordine lo rifà il decodificatore, così
  // {$r: k} indica il k-esimo oggetto senza segnarlo. opt: { npc: Map(npc → id), giocatore, casaNpc (l'array st.npcs),
  // sost: Map(oggetto → al suo posto), fisso, alias: st → la radice }
  function Codificatore(radice, opt) {
    const visti = new Map(); let seq = 0;
    const fuori = { v: undefined };
    const pila = [{ s: radice, d: fuori, k: 'v', p: null }];
    const persi = [];
    const C = { fatto: false, risultato: null, nodi: 0, persi, statici: 0, via: 0 };
    const via = t => { const L = []; for (let q = t; q && q.p; q = q.p) L.push(q.k); return L.reverse().join('.'); };
    function uno(t) {
      let s = t.s; const d = t.d, k = t.k;
      if (opt.alias && s === opt.alias.da) s = t.s = opt.alias.a;   // st stesso (player.__st): è la radice
      if (s === null || typeof s === 'boolean' || typeof s === 'string') { d[k] = s; return; }
      if (typeof s === 'number') { d[k] = Number.isFinite(s) ? s : { $x: s !== s ? 'NaN' : s > 0 ? 'I' : '-I' }; return; }
      if (s === undefined) { d[k] = { $x: 'u' }; return; }
      if (typeof s === 'bigint' || typeof s === 'symbol') { d[k] = null; return; }
      // un NPC fuori da casa sua, il giocatore fuori da st.player
      if (opt.npc && typeof s === 'object') {
        const id = opt.npc.get(s);
        if (id !== undefined && !(t.p && t.p.s === opt.casaNpc)) { d[k] = { $n: id }; return; }
        if (s === opt.giocatore && t.p && t.p.s !== opt.radiceSt) { d[k] = { $p: 1 }; return; }
        // un NPC che non sta più in st.npcs (tolto dal gioco): si scrive per nome, al caricamento non c'è
        if (id === undefined && s.pop && typeof s.pop === 'object' && s.id !== undefined && !Array.isArray(s)) { C.via++; d[k] = { $n: s.id }; return; }
      }
      const r = visti.get(s); if (r !== undefined) { d[k] = { $r: r }; return; }
      if (opt.fisso) { const f = opt.fisso.di.get(s); if (f !== undefined) { d[k] = { $s: f }; C.statici++; return; } }
      if (typeof s === 'function') {
        const al = opt.sost && opt.sost.get(s);
        if (al === undefined) { if (persi.length < 4000) persi.push(via(t)); else persi.length++; d[k] = { $x: 'f' }; return; }
      }
      visti.set(s, seq++); C.nodi++;
      const al = opt.sost && opt.sost.get(s); if (al !== undefined) s = al;
      if (ArrayBuffer.isView(s)) {
        const B = bytesDi(s), runs = []; d[k] = { $T: [s.constructor.name, B.length, runs] };
        pila.push({ ta: B, runs, i: 0 });
        return;
      }
      if (s instanceof Map) { const e = []; d[k] = { $M: e }; const ch = []; let i = 0; for (const [a, b] of s) { const coppia = [undefined, undefined]; e.push(coppia); ch.push({ s: a, d: coppia, k: 0, p: t }, { s: b, d: coppia, k: 1, p: t }); i++; } for (let j = ch.length - 1; j >= 0; j--) pila.push(ch[j]); return; }
      if (s instanceof Set) { const e = new Array(s.size); d[k] = { $S: e }; const ch = []; let i = 0; for (const a of s) ch.push({ s: a, d: e, k: i++, p: t }); for (let j = ch.length - 1; j >= 0; j--) pila.push(ch[j]); return; }
      if (Array.isArray(s)) { const e = new Array(s.length); d[k] = e; for (let j = s.length - 1; j >= 0; j--) pila.push({ s: s[j], d: e, k: j, p: t }); return; }
      if (s instanceof Date) { d[k] = { $D: +s }; return; }
      const ks = Object.keys(s); let e = {};
      if (ks.some(q => q.charCodeAt(0) === 36)) { d[k] = { $o: e }; } else d[k] = e;
      for (let j = ks.length - 1; j >= 0; j--) {
        let x; try { x = s[ks[j]]; } catch (er) { x = null; }
        if (typeof x === 'function' && !(opt.fisso && opt.fisso.di.has(x)) && !(opt.sost && opt.sost.has(x))) { if (persi.length < 4000) persi.push(via(t) + '.' + ks[j]); else persi.length++; continue; }   // la chiusura si perde: la chiave non c'è
        pila.push({ s: x, d: e, k: ks[j], p: t });
      }
      // le chiavi in ordine: l'oggetto si riempie man mano che i figli escono dalla pila (in avanti)
    }
    C.passo = function (ms) {
      const fine = ms === Infinity ? Infinity : now() + ms * .85; let i = 0;   // un margine: l'ultimo nodo può costare
      while (pila.length) {
        const t = pila.pop();
        if (t.ta) {   // un pezzo di array tipizzato
          const a = Math.min(t.ta.length, t.i + PEZZO_TA); corse(t.ta, t.i, a, t.runs); t.i = a;
          if (t.i < t.ta.length) pila.push(t);
          if (now() >= fine) return false; continue;
        }
        uno(t);
        if ((++i & 7) === 0 && now() >= fine) return false;
      }
      C.fatto = true; C.risultato = fuori.v; return true;
    };
    return C;
  }
  // il decodificatore: lo stesso ordine (le chiavi nell'ordine scritto). Gli NPC ({$n}) e il giocatore ({$p}) si legano alla fine
  function decodifica(x, opt) {
    const per = [], lega = [];
    const F = opt.fisso;
    function d(v, cont, k) {
      if (v === null || typeof v !== 'object') return v;
      if (Array.isArray(v)) { const a = new Array(v.length); per.push(a); for (let i = 0; i < v.length; i++) { const y = d(v[i], a, i); if (y !== SALTA) a[i] = y; } return a; }
      const ks = Object.keys(v);
      if (ks.length === 1 && ks[0].charCodeAt(0) === 36) {
        const q = ks[0], w = v[q];
        switch (q) {
          case '$r': return per[w];
          case '$n': lega.push([cont, k, 'n', w]); return null;
          case '$p': lega.push([cont, k, 'p']); return null;
          case '$s': { const o = F && F.a.get(w); if (o === undefined) { stats.statici++; return null; } return o; }
          case '$x': return w === 'NaN' ? NaN : w === 'I' ? Infinity : w === '-I' ? -Infinity : w === 'u' ? undefined : w === 'f' ? SALTA : null;
          case '$T': {
            let a;
            if (typeof w[1] === 'string') a = taDa(w[0], da64(w[1]));
            else { const C0 = TIPI[w[0]] || Uint8Array; a = new C0(w[1] / (C0.BYTES_PER_ELEMENT || 1)); const B = bytesDi(a); for (const [i0, s] of w[2]) B.set(da64(s), i0); }
            per.push(a); return a;
          }
          case '$D': { const t = new Date(w); per.push(t); return t; }
          case '$M': { const m = new Map(); per.push(m); for (const [a, b] of w) m.set(d(a, null, null), d(b, null, null)); return m; }
          case '$S': { const s = new Set(); per.push(s); for (const a of w) s.add(d(a, null, null)); return s; }
          case '$o': { const o = {}; per.push(o); for (const kk of Object.keys(w)) { const y = d(w[kk], o, kk); if (y !== SALTA) o[kk] = y; } return o; }
        }
      }
      const o = per.length === 0 && opt.radice ? opt.radice : {}; per.push(o);   // la radice si scrive dentro st (st.player.__st = st)
      for (const kk of ks) { const y = d(v[kk], o, kk); if (y !== SALTA) o[kk] = y; }
      return o;
    }
    const r = d(x, null, null);
    return { r, lega };
  }
  const SALTA = { salta: 1 };
  function legaTutti(lega, npcDi, giocatore) {
    let mancano = 0;
    for (const [c, k, t, id] of lega) {
      if (!c) continue;
      const v = t === 'p' ? giocatore : npcDi.get(id);
      if (v === undefined) mancano++;
      c[k] = v === undefined ? null : v;
    }
    return mancano;
  }

  // ======================= Salva.puro =======================
  // lancia un errore se trova una funzione, un NPC (.pop o .look; solo gli elementi di un array «npcs» possono esserlo) o un ciclo
  function puro(x, nome) {
    const su = new Set(); let n = 0;
    const tipoNpc = v => v.id !== undefined && ((v.pop && typeof v.pop === 'object') || (v.look && typeof v.look === 'object' && v.tr && typeof v.tr === 'object'));   // la gente di sotto (sotto.folk) ha il look ma non è un NPC
    function g(v, via, casaNpc) {
      if (typeof v === 'function') throw new Error('[Salva.puro] funzione in ' + via);
      if (v === null || typeof v !== 'object') return;
      if (su.has(v)) throw new Error('[Salva.puro] ciclo in ' + via);
      if (!Array.isArray(v)) {
        if (Object.getPrototypeOf(v) !== Object.prototype && Object.getPrototypeOf(v) !== null) throw new Error('[Salva.puro] oggetto non semplice (' + (v.constructor && v.constructor.name) + ') in ' + via);
        if (!casaNpc && tipoNpc(v)) throw new Error('[Salva.puro] NPC in ' + via);
      }
      su.add(v); n++;
      if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) g(v[i], via + '[' + i + ']', casaNpc); }
      else for (const k of Object.keys(v)) { const y = v[k]; g(y, via + '.' + k, k === 'npcs' && Array.isArray(y)); }
      su.delete(v);
    }
    g(x, nome || 'x', false);
    return n;
  }
  Salva.puro = puro;

  // ======================= GLI ADATTATORI =======================
  // npcs: i piani a passi e i progetti. Al salvataggio: al posto del piano un oggetto di soli dati (i passi senza le funzioni, $fn i
  // nomi delle funzioni perse, $at la meta per i passi «va» dei verbi). Al caricamento: si rifanno, si rilegano o si chiudono.
  function datiPasso(s, conMeta, st, n, E) {
    const o = {}, fn = [];
    for (const k of Object.keys(s)) { const v = s[k]; if (typeof v === 'function') { fn.push(k); continue; } o[k] = v; }
    if (s.drive && typeof s.drive === 'object') { const dv = {}; for (const k of Object.keys(s.drive)) if (typeof s.drive[k] !== 'function') dv[k] = s.drive[k]; else fn.push('drive.' + k); o.drive = dv; }
    if (fn.length) o.$fn = fn;
    if (conMeta && typeof s.at === 'function') { try { const t = s.at(st, n, E); o.$at = t ? { x: t.x, y: t.y, k: t.k, bi: t.bi, label: t.label, place: t.place, pid: t.pid } : null; } catch (e) { o.$at = null; } }
    return o;
  }
  function sostituti(st) {
    const M = new Map();
    for (const n of st.npcs || []) {
      const P = n.pop; if (!P) continue;
      const E = P.emer;
      if (E && typeof E === 'object') {
        const o = {}, meta = E.kind === 'verbo' && E.__ric;
        for (const k of Object.keys(E)) { if (typeof E[k] === 'function') continue; o[k] = k === 'steps' ? (Array.isArray(E.steps) ? E.steps.map((s, i) => s && typeof s === 'object' ? datiPasso(s, meta && i >= (E.i || 0), st, n, E) : s) : []) : E[k]; }   // le chiavi nello stesso ordine
        o.$piano = 1;
        M.set(E, o);
      }
      if (Array.isArray(P.projects)) for (const pj of P.projects) {
        if (!pj || !Array.isArray(pj.steps)) continue;
        const o = {}; for (const k of Object.keys(pj)) { if (typeof pj[k] === 'function') continue; o[k] = k === 'steps' ? pj.steps.map(s => s && typeof s === 'object' ? datiPasso(s, false) : s) : pj[k]; }
        o.$progetto = 1;
        M.set(pj, o);
      }
    }
    // vita: i gruppi in corso senza le chiusure (alSentito, allaFine)
    const V = st.vita; if (V && Array.isArray(V.gruppi)) for (const Gr of V.gruppi) { if (!Gr || typeof Gr !== 'object') continue; const o = {}; let tolte = 0; for (const k of Object.keys(Gr)) { if (typeof Gr[k] === 'function') { tolte++; continue; } o[k] = Gr[k]; } if (tolte) { o.$senza = tolte; M.set(Gr, o); } }
    // casa: le scene in corso non si scrivono
    const Cs = st.casa; if (Cs && Array.isArray(Cs.scene) && Cs.scene.length) M.set(Cs.scene, []);
    return M;
  }
  // il caso di scorta: quando un adattatore rifà una scheda (Popolo.PROJ[kind].steps) non deve toccare i flussi della partita
  function conCasoFinto(fn) {
    let a = 0x2545F491; const r0 = Math.random;
    Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    try { return fn(); } finally { Math.random = r0; }
  }
  // al caricamento: i piani e i progetti
  function rifaPiani(st) {
    const Z = AZ(), V = VB(), P0 = PO();
    for (const n of st.npcs || []) {
      const P = n.pop; if (!P) continue;
      const E = P.emer;
      if (E && E.$piano) {
        delete E.$piano;
        let ok = false;
        if (E.kind === 'verbo' && E.__ric && V) ok = rifaVerbo(st, n, E, V);
        else if (E.kind === 'ascolta' && E.ascolta) ok = rifaAscolta(st, n, E);
        if (ok) stats.rifatti[E.kind] = (stats.rifatti[E.kind] || 0) + 1;
        else {
          stats.chiusi[E.kind] = (stats.chiusi[E.kind] || 0) + 1;
          for (const s of E.steps || []) if (s && s.$fn) for (const f of s.$fn) if (f.indexOf('.') < 0) s[f] = undefined;
          if (Z && Z.endPlan) { try { Z.endPlan(st, n, 'ripreso'); } catch (e) { P.emer = null; } } else P.emer = null;
          if (E.kind === 'writer') { n.__tip = null; n.__climb = null; n.__mop = false; }   // quello che faceva il suo onEnd (writer_vita.js)
        }
      }
      if (Array.isArray(P.projects)) for (const pj of P.projects) {
        if (!pj || !pj.$progetto) continue; delete pj.$progetto;
        const def = P0 && P0.PROJ && P0.PROJ[pj.kind];
        let fresco = null;
        if (def && typeof def.steps === 'function') { try { fresco = conCasoFinto(() => def.steps(st, n, P, pj.arg || {})); } catch (e) { fresco = null; } }
        for (let i = 0; i < pj.steps.length; i++) {
          const s = pj.steps[i]; if (!s || !s.$fn) continue;
          const f = fresco && fresco[i];
          if (f && f.label === s.label) { for (const k of s.$fn) if (typeof f[k] === 'function') s[k] = f[k]; stats.rilegati++; }
          else stats.slegati++;
          delete s.$fn;
        }
      }
    }
  }
  // il punto fermo: sulla partita viva quello che il caricamento fa alle chiusure (i piani che non si rifanno si chiudono senza il
  // loro onEnd, i progetti si rilegano dalla scheda, i gruppi di vita perdono le chiusure, le scene di casa si chiudono). Dopo,
  // la partita è una funzione del suo salvataggio: le prove lo usano per confrontare la corsa senza interruzione col caricamento
  function normalizza(st) {
    const Z = AZ(), P0 = PO(), F = fisso();
    for (const n of st.npcs || []) {
      const P = n.pop; if (!P) continue;
      const E = P.emer;
      if (E && !((E.kind === 'verbo' && E.__ric && VB()) || (E.kind === 'ascolta' && E.ascolta && (st.npcs || []).some(x => x.id === E.ascolta)))) {
        delete E.onEnd; if (Z && Z.endPlan) { try { Z.endPlan(st, n, 'ripreso'); } catch (e) { P.emer = null; } } else P.emer = null;
        if (E.kind === 'writer') { n.__tip = null; n.__climb = null; n.__mop = false; }
      }
      if (Array.isArray(P.projects)) for (const pj of P.projects) {
        if (!pj || !Array.isArray(pj.steps)) continue;
        const def = P0 && P0.PROJ && P0.PROJ[pj.kind]; let fresco = null;
        if (def && typeof def.steps === 'function') { try { fresco = conCasoFinto(() => def.steps(st, n, P, pj.arg || {})); } catch (e) { fresco = null; } }
        pj.steps.forEach((s0, i) => { if (!s0 || typeof s0 !== 'object') return; const f = fresco && fresco[i];
          for (const k of Object.keys(s0)) if (typeof s0[k] === 'function' && !F.di.has(s0[k])) { if (f && f.label === s0.label && typeof f[k] === 'function') s0[k] = f[k]; else delete s0[k]; } });
      }
    }
    const V = st.vita; if (V && Array.isArray(V.gruppi)) for (const Gr of V.gruppi) if (Gr) for (const k of Object.keys(Gr)) if (typeof Gr[k] === 'function') delete Gr[k];
    ADATTA.casa.torna(st); if (st.casa) st.casa.scene = [];
    ADATTA.ini.torna(st);
  }
  function rifaVerbo(st, n, E, V) {
    const R = E.__ric; if (!R || !R.v) return false;
    const a = R.a || {}, opt = { causa: R.causa || null, strat: R.strat || null }, K = R.K || null;
    for (const s of E.steps) {
      if (!s || !s.$fn) continue;
      for (const f of s.$fn) {
        if (f === 'at') { const t = s.$at; s.at = () => t; }
        else if (f === 'act') s.act = (s2, n2) => { V.compi(s2, n2, R.v, a, opt); return 'next'; };
      }
      delete s.$fn; delete s.$at;
    }
    E.onEnd = (s2, n2) => { libera(s2, n2.id, K); };
    return true;
  }
  // le prenotazioni (lo stesso di unico_verbi.js libera)
  function libera(st, io, chiavi) {
    const V = VB(); if (V && V._ && V._.libera) return V._.libera(st, io, chiavi);
    const P = st.u && st.u.pren; if (!P) return;
    for (const k of chiavi || Object.keys(P)) { const L0 = (P[k] || []).filter(e => e[0] !== io && e[2] > st.t); if (L0.length) P[k] = L0; else delete P[k]; }
  }
  function rifaAscolta(st, n, E) {
    const k = (st.npcs || []).find(x => x.id === E.ascolta); if (!k) return false;
    for (const s of E.steps) { if (!s || !s.$fn) continue; for (const f of s.$fn) { if (f === 'act') s.act = () => 'next'; else if (f === 'tick') s.tick = (s2, k2) => { k2.face = Math.atan2(k.y - k2.y, k.x - k2.x); }; } delete s.$fn; }
    return true;
  }
  // i dati che ricostruiscono un piano «verbo»: presi da Verbo.fai (gli argomenti) e da Azioni.startPlan (il piano), al momento
  let FAI = null;
  function aggancia() {
    const V = VB(), Z = AZ();
    if (V && V.fai && !V.fai.__salva) {
      const f0 = V.fai;
      V.fai = function (st, chi, v, a, opt) {
        const prima = FAI; let aj = null; try { aj = a ? JSON.parse(JSON.stringify(a)) : {}; } catch (e) { aj = null; }
        const id = chi && typeof chi === 'object' ? chi.id : chi, P = st && st.u && st.u.pren, pre = {};
        if (P) for (const k in P) for (const e of P[k] || []) if (e[0] === id) pre[k] = e[2];
        FAI = { v, a: aj, causa: (opt && opt.causa) || null, strat: (opt && opt.strat) || null, st, pre };
        try { return f0.apply(this, arguments); } finally { FAI = prima; }
      };
      V.fai.__salva = true;
    }
    if (Z && Z.startPlan && !Z.startPlan.__salva) {
      const s0 = Z.startPlan;
      Z.startPlan = function (st, n, kind, label, steps, prio, extra) {
        const E = s0.apply(this, arguments);
        if (E && kind === 'verbo' && FAI && FAI.st === st && extra && extra.verbo === FAI.v) {
          const P = st.u && st.u.pren, K = []; if (P) for (const k in P) if ((P[k] || []).some(e => e[0] === n.id && FAI.pre[k] !== e[2])) K.push(k);
          E.__ric = { v: FAI.v, a: FAI.a, causa: FAI.causa, strat: FAI.strat, K };
        }
        return E;
      };
      Z.startPlan.__salva = true;
    }
  }
  const ADATTA = Salva.ADATTA = {
    // via: le cose da mettere al posto di altre (Map) prima della fotografia; torna: dopo il caricamento, sullo st già riempito
    npcs: { via: st => sostituti(st), torna: st => rifaPiani(st) },
    // ini: gli atomi tornano dal mondo fisso; un'iniziativa il cui capo non ha più il suo piano (chiuso al caricamento) si chiude
    ini: { via: () => null, torna: st => {
      const I = st.ini; if (!I || !Array.isArray(I.attive)) return; const IV = typeof Iniziative !== 'undefined' ? Iniziative.VERBI : null;
      for (const E of I.attive.slice()) {
        if (!E) continue;
        if (!E.D && IV && E.c && E.c.verbo) E.D = IV[E.c.verbo] || null;
        const L = E.L, ha = L && L.pop && L.pop.emer && L.pop.emer.__ini === E.id;
        if (!ha || !E.D) { E.chiusa = true; E.manca = E.manca || 'ripreso'; I.attive = I.attive.filter(x => x !== E); stats.chiusi.iniziativa_capo = (stats.chiusi.iniziativa_capo || 0) + 1; }
      }
    } },
    vita: { via: () => null, torna: st => { const V = st.vita; if (V && Array.isArray(V.gruppi)) for (const Gr of V.gruppi) if (Gr && Gr.$senza) { delete Gr.$senza; stats.chiusi.gruppo = (stats.chiusi.gruppo || 0) + 1; } } },
    parola: { via: () => null, torna: () => { } },
    casa: { via: () => null, torna: st => { const C = st.casa; if (!C) return; C.scene = Array.isArray(C.scene) ? C.scene : []; for (const k in C.case || {}) for (const op of (C.case[k].ops || [])) if (op && op.__scena) { delete op.__scena; stats.chiusi.scena = (stats.chiusi.scena || 0) + 1; } } },
  };

  // LO STATO DEI MODULI che non sta in st ma decide (raggiungibile da fuori): la regia di commedia (Commedia.R: l'ultimo fumetto
  // d'ambiente, la pausa, chi ha già detto cosa), che vita copia in st.vita.R0. Si scrive accanto a st.u e torna in loco
  const inLoco = (R, v) => { if (!R || !v) return; for (const k of Object.keys(v)) { if (R[k] instanceof Map && v[k] instanceof Map) { R[k].clear(); for (const [a, b] of v[k]) R[k].set(a, b); } else if (R[k] instanceof Set && v[k] instanceof Set) { R[k].clear(); for (const a of v[k]) R[k].add(a); } else R[k] = v[k]; } };
  const MODSTATO = Salva.MODSTATO = {
    commedia: { via: () => (typeof Commedia !== 'undefined' && Commedia.R ? Commedia.R : undefined), torna: v => { if (typeof Commedia !== 'undefined' && Commedia.R) inLoco(Commedia.R, v); } },
  };

  // ======================= LA FOTOGRAFIA (via) =======================
  const FUORI = new Set(['rng', 'u']);   // il caso e st.u a parte
  function impronta() { const w = glob; return String(w.PV_IMPRONTA_TASS || '') + '|' + String(w.PV_IMPRONTA_MONDO || ''); }
  function classeDaSalvare(st) {
    const M = ME(), u = st.u || {};
    if (!M || (M.CFG && M.CFG.classe)) return u.classe || null;   // le prove fissano la classe
    try { return M.classeConsigliata(st) || u.classe || null; } catch (e) { return u.classe || null; }
  }
  // la fotografia a fette: { passo(ms) → fatto?, snap }
  function Fotografia(st) {
    // a fasi, ognuna dentro una fetta: 0 i sostituti e la testa; 1 lo stato (il codice a grafo, a pezzi); 2 st.u (lo stesso codice)
    const T = { fatto: false, snap: null, fase: 0 };
    let C = null, Cu = null, testa = null;
    const via0 = () => {
      const F = fisso();
      const npc = new Map(); for (const n of st.npcs || []) if (n && n.id !== undefined) npc.set(n, n.id);
      const sost = new Map();
      for (const k in ADATTA) { const m = ADATTA[k].via(st); if (m) for (const [a, b] of m) sost.set(a, b); }
      const radice = {}; for (const k of Object.keys(st)) if (!FUORI.has(k) && typeof st[k] !== 'function') radice[k] = st[k];
      C = Codificatore(radice, { npc, giocatore: st.player, casaNpc: st.npcs, radiceSt: radice, sost, fisso: F, alias: { da: st, a: radice } });
      const moduli = {}; for (const k in MODSTATO) { try { const v = MODSTATO[k].via(st); if (v !== undefined) moduli[k] = v; } catch (e) { } }
      Cu = Codificatore({ u: st.u || null, moduli }, { npc, giocatore: st.player });   // senza il mondo fisso: Commedia.R ne fa parte, qui serve il contenuto
      const U = Un();
      testa = { v: VER, gioco: impronta(), seme: st.u ? st.u.seme : null, t: st.t, clock: st.clock, classe: classeDaSalvare(st), passi: U.passi, rng: U.salvaCaso(st) };
    };
    T.passo = ms => {
      if (T.fatto) return true;
      const fine = ms === Infinity ? Infinity : now() + ms;
      if (T.fase === 0) { via0(); T.fase = 1; if (now() >= fine) return false; }
      if (T.fase === 1) { if (!C.passo(fine === Infinity ? Infinity : Math.max(0, fine - now()))) return false; T.fase = 2; if (now() >= fine) return false; }
      if (T.fase === 2) { if (!Cu.passo(fine === Infinity ? Infinity : Math.max(0, fine - now()))) return false; }
      T.snap = Object.assign(testa, { u: Cu.risultato.u, moduli: Cu.risultato.moduli, stato: C.risultato, persi: { n: C.persi.length, vie: riassumi(C.persi) }, nodi: C.nodi });
      stats.persi = C.persi.length; stats.viePerse = T.snap.persi.vie;
      T.fatto = true; return true;
    };
    return T;
  }
  const riassumi = L => { const c = {}; for (const p of L) { if (!p) continue; const g = p.replace(/\.\d+(?=\.|$)/g, '[]'); c[g] = (c[g] || 0) + 1; } return c; };
  function via(st) { const T = Fotografia(st); T.passo(Infinity); return T.snap; }

  // ======================= IL CARICAMENTO (torna) =======================
  const MIGRA = Salva.MIGRA = {
    // 0 → 1: i salvataggi di prima (senza st.u né il caso dei flussi): st.u resta quello della partita nuova
    1: s => { if (s.v === undefined || s.v < 1) { s.v = 1; if (!('u' in s)) s.u = null; if (!s.rng) s.rng = null; if (!s.stato) s.stato = {}; } return s; },
  };
  function migra(s) {
    if (!s || typeof s !== 'object') throw new Error('salvataggio vuoto');
    if (s.v > VER) { const e = new Error('salvataggio di una versione futura (' + s.v + ' > ' + VER + ')'); e.futuro = true; throw e; }
    for (let v = (s.v || 0) + 1; v <= VER; v++) if (MIGRA[v]) s = MIGRA[v](s) || s;
    if ((s.v || 0) < VER) s.v = VER;
    return s;
  }
  function torna(snap, st) {
    const t0 = now(), U = Un();
    snap = migra(snap);
    if (snap.gioco && snap.gioco !== impronta()) avvisa('il salvataggio è di un\'altra impronta del gioco (' + snap.gioco + '): si carica lo stesso');
    const F = fisso();
    const vecchio = {}; for (const k of Object.keys(st)) vecchio[k] = st[k];
    // lo stato al posto di quello nuovo, chiave per chiave, dentro st (le chiavi che il salvataggio non ha restano quelle nuove)
    const { lega } = decodifica(snap.stato || {}, { fisso: F, radice: st });
    const npcDi = new Map(); for (const n of st.npcs || []) if (n) npcDi.set(n.id, n);
    const mancano = legaTutti(lega, npcDi, st.player); if (mancano) avvisa(mancano + ' riferimenti a NPC che non ci sono più');
    // i giocatori e i lavori sui muri del salvataggio di writing.js (pv.graffiti.v1): restano i suoi
    if (vecchio.wr && st.wr && vecchio.wr !== st.wr) unisciMuri(vecchio.wr, st.wr);
    // gli adattatori (prima del caso: rifare una scheda non deve toccare i flussi)
    for (const k in ADATTA) { try { ADATTA[k].torna(st); } catch (e) { stats.errori++; avvisa('adattatore ' + k + ': ' + (e && e.message)); } }
    // st.u e il caso
    const X = decodifica({ u: snap.u || null, moduli: snap.moduli || {} }, {});
    legaTutti(X.lega, npcDi, st.player);
    if (snap.u) st.u = X.r.u;
    for (const k in X.r.moduli || {}) { try { if (MODSTATO[k]) MODSTATO[k].torna(X.r.moduli[k], st); } catch (e) { avvisa('modulo ' + k + ': ' + (e && e.message)); } }
    if (snap.rng) U.caricaCaso(st, snap.rng);
    if (snap.classe && st.u) st.u.classe = snap.classe;   // la classe consigliata al salvataggio vale da qui
    if (typeof snap.passi === 'number') U.passi = snap.passi;
    if (typeof snap.t === 'number') st.t = snap.t; if (typeof snap.clock === 'number') st.clock = snap.clock;
    // la mente: chi ha un passo in corso (INCORSO si rifà dai dati, come a una partita nuova)
    const M = ME(); if (M && M._ && M._.INCORSO && st.u && st.u.menti) { M._.INCORSO.clear(); if (M._.PRONTE) M._.PRONTE.length = 0; for (const id in st.u.menti) { const m = st.u.menti[id]; if (m && m.piano && m.piano.att) M._.INCORSO.add(id); } }
    // le schede della chat (Risacca.CARDS, del modulo): chi nel salvataggio non è ancora entrato nella vita di popolo e ha già la
    // scheda col bio fisso (di un'altra partita in questa pagina) non deve far fermare adoptAll (popolo.js adopt: defineProperty)
    segnaSchede();
    U.st = st;
    stats.caricati++; stats.msCarica = now() - t0;
    return st;
  }
  function segnaSchede() {
    const RC = typeof Risacca !== 'undefined' && Risacca.CARDS; if (!RC) return;
    for (const id in RC) { const c = RC[id], d = c && Object.getOwnPropertyDescriptor(c, 'bio'); if (d && !d.configurable && !c.__vita) c.__vita = true; }
  }
  // i lavori del giocatore: quelli che writing.js ha appena ricaricato dal suo salvataggio (w.saved) vincono su quelli fotografati
  function unisciMuri(W0, W1) {
    const suoi = (W0.works || []).filter(w => w && w.by === 'player' && w.saved);
    if (!suoi.length) return;
    W1.works = (W1.works || []).filter(w => !(w && w.by === 'player'));
    if (W1.train && W1.train.sides) for (const k in W1.train.sides) W1.train.sides[k] = W1.train.sides[k].filter(id => W1.works.some(w => w.id === id));
    for (const w of suoi) { w.id = W1.nextId++; W1.works.push(w); if (w.surf === 'treno' && W1.train) (W1.train.sides[w.car + ':' + w.side] = W1.train.sides[w.car + ':' + w.side] || []).push(w.id); }
    W1.__caricato = true;
  }

  // ======================= IL TESTO, IL GZIP, LA SOMMA DI CONTROLLO =======================
  // LE COLONNE (solo nel testo): un array di ≥ 16 oggetti (gli NPC, i graffiti, i fatti…) si scrive per colonne, una per chiave,
  // con le forme (le chiavi in ordine) e la forma di ognuno; gli elementi che non sono oggetti semplici (un {$r}, un {$n}) a parte.
  // Un array di array di oggetti (i plan degli NPC) si scrive come un array solo, con le lunghezze. Il gzip trova meglio i numeri
  // simili uno accanto all'altro: −25% sul salvataggio. Si toglie esatto al caricamento (detrasponi), prima del codice a grafo
  const semplice = v => v !== null && typeof v === 'object' && !Array.isArray(v) && !(function () { let n = 0, d = false; for (const k in v) { if (++n > 1) return false; d = k.charCodeAt(0) === 36; } return d; })();
  // (un generatore: ogni 32 elementi cede, '' , così la fetta resta corta anche su un array di 2.000 fatti)
  function* colonne(x) {
    if (x.length >= 8 && x.every(Array.isArray)) {
      let n = 0, ok = 0, i = 0; for (const a of x) { n += a.length; for (const o of a) if (semplice(o)) ok++; if ((++i & 31) === 0) yield ''; }
      if (n >= 16 && ok >= n * .8) { const flat = []; for (const a of x) for (const o of a) flat.push(o); return { $L: [x.map(a => a.length), flat] }; }
      return null;
    }
    if (x.length < 16) return null;
    let ok = 0; for (const o of x) if (semplice(o)) ok++;
    if (ok < x.length * .8) return null;
    const forme = [], fk = new Map(), fo = [], col = {}, fuori = []; let i = 0;
    for (const o of x) {
      if ((++i & 31) === 0) yield '';
      if (!semplice(o)) { fo.push(-1); fuori.push(o); continue; }
      const ks = Object.keys(o), key = ks.join('\u0001'); let f = fk.get(key);
      if (f === undefined) { f = forme.length; forme.push(ks); fk.set(key, f); }
      fo.push(f); for (const k of ks) (col[k] || (col[k] = [])).push(o[k]);
    }
    return { $C: [forme, fo, col, fuori] };
  }
  function detrasponi(x) {
    if (x === null || typeof x !== 'object') return x;
    if (Array.isArray(x)) { for (let i = 0; i < x.length; i++) x[i] = detrasponi(x[i]); return x; }
    const ks = Object.keys(x);
    if (ks.length === 1) {
      if (ks[0] === '$o') { const v = x.$o; for (const k of Object.keys(v)) v[k] = detrasponi(v[k]); return x; }
      if (ks[0] === '$L') { const [lun, flat0] = x.$L, flat = detrasponi(flat0), out = []; let i = 0; for (const n of lun) { out.push(flat.slice(i, i + n)); i += n; } return out; }
      if (ks[0] === '$C') {
        const [forme, fo, col0, fuori0] = x.$C, col = {}, cur = {}, fuori = detrasponi(fuori0); let q = 0;
        for (const k of Object.keys(col0)) { col[k] = detrasponi(col0[k]); cur[k] = 0; }
        return fo.map(f => { if (f < 0) return fuori[q++]; const o = {}; for (const k of forme[f]) o[k] = col[k][cur[k]++]; return o; });
      }
    }
    for (const k of ks) x[k] = detrasponi(x[k]);
    return x;
  }
  // il JSON a pezzi: gli array e gli oggetti grandi si scrivono elemento per elemento (e per colonne); i piccoli in una volta
  const piccolo = x => { let n = 0; for (const k in x) { const v = x[k]; if (++n > 16) return false; if (v && typeof v === 'object') { if (!Array.isArray(v) || v.length >= 16) return false; for (const y of v) if (y && typeof y === 'object') return false; } } return true; };   // solo valori semplici (o array corti di valori semplici)
  function* pezziJSON(x, prof) {
    if (x === null || typeof x !== 'object') { yield JSON.stringify(x === undefined ? null : x); return; }
    if (Array.isArray(x)) {
      const c = yield* colonne(x); if (c) { yield ''; yield* pezziJSON(c, prof); return; }
      if (x.length < 16 && prof > 3 && piccolo(x)) { yield JSON.stringify(x); return; }
      yield '['; for (let i = 0; i < x.length; i++) { if (i) yield ','; yield* pezziJSON(x[i], prof + 1); } yield ']'; return;
    }
    if (prof > 3 && piccolo(x)) { yield JSON.stringify(x); return; }
    yield '{'; let pr = true; for (const k of Object.keys(x)) { const v = x[k]; if (v === undefined) continue; yield (pr ? '' : ',') + JSON.stringify(k) + ':'; pr = false; yield* pezziJSON(v, prof + 1); } yield '}';
  }
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b, c) { c = c === undefined ? 0xffffffff : c; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return c; }
  const crcFine = c => ((c ^ 0xffffffff) >>> 0);
  const haGz = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
  // il testo JSON (a pezzi, dal generatore) entra nel gzip 32 KB per volta: una fetta = qualche pezzo di testo, TextEncoder e la
  // scrittura nel flusso; la compressione è del browser (asincrona, fuori dal filo). Senza CompressionStream: i byte così come sono
  async function comprimiPezzi(gen, cede) {
    const enc = new TextEncoder(), gz = haGz(), out = []; let w = null, legge = null, car = 0;
    if (gz) { const cs = new CompressionStream('gzip'); w = cs.writable.getWriter(); legge = (async () => { const r = cs.readable.getReader(); for (;;) { const { done, value } = await r.read(); if (done) break; out.push(value); } })(); }
    let fine = false;
    while (!fine) {
      const t0 = now(); let buf = [], n = 0;
      for (;;) { const x = gen.next(); if (x.done) { fine = true; break; } buf.push(x.value); n += x.value.length; if (n >= CFG.pezzoGz || now() - t0 >= CFG.fetta * .5) break; }   // il resto della fetta per TextEncoder
      let b = null; if (n) { b = enc.encode(buf.join('')); car += n; }
      misuraFetta(now() - t0, 'gz');
      if (b) { if (gz) { await w.ready; w.write(b); } else out.push(b); }
      if (cede && !fine) await cede();
    }
    if (gz) { await w.close(); await legge; }
    let m = 0; for (const c of out) m += c.length; const B = new Uint8Array(m); let o = 0; for (const c of out) { B.set(c, o); o += c.length; }
    return { bytes: B, gz, car };
  }
  const comprimi = (testo, cede) => comprimiPezzi((function* () { for (let i = 0; i < testo.length; i += CFG.pezzoGz) yield testo.slice(i, i + CFG.pezzoGz); })(), cede);
  async function decomprimi(bytes, gz) {
    if (!gz) return new TextDecoder().decode(bytes);
    const ds = new DecompressionStream('gzip'), w = ds.writable.getWriter(), out = [];
    const legge = (async () => { const r = ds.readable.getReader(); for (;;) { const { done, value } = await r.read(); if (done) break; out.push(value); } })();
    const scritto = Promise.all([w.write(bytes), w.close()]);
    await Promise.all([scritto, legge]);
    const dec = new TextDecoder(); let s = ''; for (const c of out) s += dec.decode(c, { stream: true }); s += dec.decode();
    return s;
  }
  function misuraFetta(ms, tipo) { stats.fette++; if (ms > stats.fettaMax) stats.fettaMax = ms; const D = stats.fettaDi = stats.fettaDi || {}; if (!(D[tipo || '?'] >= ms)) D[tipo || '?'] = ms; (stats.fetteMs = stats.fetteMs || []).push(ms); if (stats.fetteMs.length > 2000) stats.fetteMs.shift(); }

  // ======================= L'ARCHIVIO: due slot e un puntatore =======================
  // kv: { get(k) → Promise, put(k, v) → Promise }. IndexedDB, se no localStorage, se no in memoria (le prove)
  function kvMemoria() { const M = new Map(); return { tipo: 'memoria', M, get: async k => (M.has(k) ? M.get(k) : null), put: async (k, v) => { M.set(k, v); } }; }
  function kvIDB() {
    if (typeof indexedDB === 'undefined') return null;
    let db = null;
    const apri = () => db || (db = new Promise((ok, no) => { const r = indexedDB.open(CFG.chiave, 1); r.onupgradeneeded = () => { r.result.createObjectStore('slot'); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }));
    const fai = (modo, f) => apri().then(d => new Promise((ok, no) => { const tx = d.transaction('slot', modo), s = tx.objectStore('slot'), q = f(s); tx.oncomplete = () => ok(q && q.result !== undefined ? q.result : null); tx.onerror = () => no(tx.error); tx.onabort = () => no(tx.error); }));
    return { tipo: 'idb', get: k => fai('readonly', s => s.get(k)), put: (k, v) => fai('readwrite', s => s.put(v, k)) };
  }
  function kvLS() {
    let ls = null; try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; } if (!ls) return null;
    const K = k => CFG.chiave + '.' + k;
    return { tipo: 'ls',
      get: async k => { const s = ls.getItem(K(k)); if (!s) return null; const o = JSON.parse(s); if (o && o.b64) { o.bytes = da64(o.b64); delete o.b64; } return o; },
      put: async (k, v) => { const o = Object.assign({}, v); if (o.bytes) { if (o.bytes.length > CFG.lsMax) throw new Error('troppo grande per localStorage'); o.b64 = a64(o.bytes); delete o.bytes; } ls.setItem(K(k), JSON.stringify(o)); } };
  }
  let KV = null;
  const kv = () => KV || (KV = kvIDB() || kvLS() || kvMemoria());
  let BLOCCATO = false;   // un salvataggio di versione futura: non si sovrascrive
  async function scrivi(snapBytes, meta, k) {
    k = k || kv();
    const p = await k.get('punta').catch(() => null), slot = p && p.slot === 'A' ? 'B' : 'A', n = (p && p.n || 0) + 1;
    const rec = Object.assign({ v: VER, n, crc: crcFine(crc32(snapBytes.bytes)), len: snapBytes.bytes.length, gz: snapBytes.gz, bytes: snapBytes.bytes }, meta || {});
    await k.put(slot, rec);
    await k.put('punta', { slot, n, quando: meta && meta.quando || 0 });
    return { slot, n, len: rec.len };
  }
  // si legge lo slot del puntatore; se è guasto (somma, gzip, JSON), l'altro
  async function leggi(k) {
    k = k || kv();
    const p = await k.get('punta').catch(() => null);
    const ordine = p && p.slot === 'B' ? ['B', 'A'] : ['A', 'B'];
    let futuro = false;
    for (const s of ordine) {
      let r = null; try { r = await k.get(s); } catch (e) { r = null; }
      if (!r || !r.bytes) continue;
      try {
        const b = r.bytes instanceof Uint8Array ? r.bytes : new Uint8Array(r.bytes);
        if (crcFine(crc32(b)) !== r.crc) throw new Error('somma di controllo sbagliata');
        const snap = detrasponi(JSON.parse(await decomprimi(b, r.gz)));
        if (snap.v > VER) { futuro = true; continue; }
        if (s !== ordine[0]) { stats.ripiego++; avvisa('lo slot ' + ordine[0] + ' è guasto: si carica ' + s); }
        return { snap, slot: s, n: r.n };
      } catch (e) { avvisa('slot ' + s + ': ' + (e && e.message)); }
    }
    if (futuro) { BLOCCATO = true; avvisa('salvataggio di una versione futura: non si carica e non si sovrascrive'); }
    return null;
  }

  // ======================= SALVARE A FETTE =======================
  const idle = typeof glob.requestIdleCallback === 'function' ? f => glob.requestIdleCallback(f, { timeout: 200 }) : f => setTimeout(() => f({ timeRemaining: () => CFG.fetta, didTimeout: true }), 16);
  let INCORSO = null;      // la fotografia che si sta facendo (il passo aspetta)
  // dentro una fetta: al più CFG.fetta ms, e non oltre quello che resta del tempo libero
  const budget = d => Math.max(1, Math.min(CFG.fetta, d && typeof d.timeRemaining === 'function' && !d.didTimeout ? d.timeRemaining() : CFG.fetta));
  function aFette(gen, d) { const t0 = now(), b = budget(d); let fine = false; while (now() - t0 < b) { const r = gen.next(); if (r.done) { fine = true; break; } } misuraFetta(now() - t0, 'fisso'); return fine; }
  // salva(st, { subito, kv, cede }): la promessa del salvataggio. subito = tutto ora (hidden, pagehide, le prove)
  async function salva(st, o) {
    o = o || {};
    if (BLOCCATO) return { ok: false, msg: 'bloccato (versione futura)' };
    if (INCORSO) return { ok: false, msg: 'già in corso' };
    const cede = o.cede || (o.subito ? null : () => new Promise(r => idle(r)));
    const t0 = now();
    // 1. il mondo fisso (una volta) e la fotografia: a fette, col passo che aspetta
    if (!FISSO) { const g = visitaFisso(); if (o.subito) while (!g.next().done); else while (!(await new Promise(r => idle(d => r(aFette(g, d)))))); }
    let a = now(); const T = INCORSO = Fotografia(st); misuraFetta(now() - a, 'foto0');
    try {
      if (o.subito) T.passo(Infinity);
      else while (!T.fatto) { await new Promise(r => idle(d => { const a2 = now(); T.passo(budget(d)); misuraFetta(now() - a2, 'foto' + T.fase); r(); })); }
    } finally { INCORSO = null; }
    const snap = T.snap; stats.ms.foto = now() - t0;
    // 2. il testo e il gzip, a pezzi (la fotografia è staccata dalla partita: il passo non aspetta più)
    const t2 = now(); const z = await comprimiPezzi(pezziJSON(snap, 0), cede); stats.ms.gz = now() - t2; stats.gz = z.bytes.length; stats.json = z.car;
    // 3. lo slot
    a = now(); const r = await scrivi(z, { quando: Date.now(), t: snap.t, gioco: snap.gioco }, o.kv); stats.ms.db = now() - a;
    stats.salvati++; stats.ultimo = { slot: r.slot, n: r.n, gz: r.len, json: z.car, t: snap.t, persi: snap.persi.n, ms: now() - t0 };
    return { ok: true, slot: r.slot, n: r.n, gz: r.len, json: z.car, snap: o.tieni ? snap : undefined };
  }

  // ======================= NEL GIOCO: il passo che aspetta, l'avvio, i momenti =======================
  let PENDENTE = null, ATTESA = 0, PRIMO = true;
  function avvolgi() {
    const gs0 = G.step;
    G.step = function (st, dt, inp) {
      if (PRIMO) { PRIMO = false; try { if (!FISSO) fisso(); } catch (e) { stats.errori++; } }
      if (INCORSO && CFG.tieni) { stats.tenuti++; const a = now(); INCORSO.passo(CFG.fetta); misuraFetta(now() - a, 'passo'); return; }   // la fotografia va avanti al posto del passo
      if (ATTESA && now() < ATTESA) { stats.tenuti++; return; }
      return gs0.apply(this, arguments);
    };
    for (const k in gs0) if (Object.prototype.hasOwnProperty.call(gs0, k)) G.step[k] = gs0[k];
    const gc0 = G.create;
    G.create = function (seed) {
      const P = PENDENTE; PENDENTE = null;
      const args = Array.prototype.slice.call(arguments); if (P && typeof P.seme === 'number') args[0] = P.seme;   // la città col seme salvato
      if (P) segnaSchede();   // la seconda G.create della pagina (__pv.restart): popolo.js adopt non deve inciampare nelle schede della prima
      const st = gc0.apply(this, args);
      FISSO = null; try { fisso(); } catch (e) { stats.errori++; }
      PRIMO = false;
      if (P) { try { torna(P, st); } catch (e) { stats.errori++; avvisa('caricamento: ' + (e && e.message)); } }
      return st;
    };
    for (const k in gc0) if (Object.prototype.hasOwnProperty.call(gc0, k)) G.create[k] = gc0[k];
  }
  avvolgi();
  aggancia();
  // carica(snap): la prossima G.create rifà questa partita (il seme salvato, poi torna)
  function carica(snap) { PENDENTE = migra(snap); return PENDENTE; }

  // all'avvio nel browser: si legge lo slot, il passo aspetta (al più CFG.attesa), poi __pv.restart() rifà la partita salvata
  function avvio() {
    if (!CFG.auto || !DOM) return;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { }); } catch (e) { }
    if (!NUOVA) {
      ATTESA = now() + CFG.attesa;
      leggi().then(r => {
        ATTESA = 0; if (!r) return;
        const pv = window.__pv;
        try {
          if (pv && typeof pv.restart === 'function') { carica(r.snap); pv.restart(); }
          else { const st = (pv && pv.st) || Un().st; if (st) torna(migra(r.snap), st); }
          stats.slotCaricato = r.slot;
        } catch (e) { stats.errori++; avvisa('avvio: ' + (e && e.message)); }
      }, e => { ATTESA = 0; avvisa('lettura: ' + (e && e.message)); });
    }
    const stOra = () => (window.__pv && window.__pv.st) || Un().st;
    const subito = () => { const st = stOra(); if (st && !ATTESA) salva(st, { subito: true }).catch(e => { stats.errori++; avvisa('salvataggio: ' + (e && e.message)); }); };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') subito(); });
    window.addEventListener('pagehide', subito);
    setInterval(() => { const st = stOra(); if (st && !ATTESA && !INCORSO && document.visibilityState !== 'hidden') salva(st).catch(e => { stats.errori++; avvisa('salvataggio: ' + (e && e.message)); }); }, CFG.ogni);
  }
  // quando Nino va a dormire (il riposo di protagonista.js comincia): un salvataggio a fette
  let dormiva = false;
  Un().fase('unico.salva', { dopo: 'unico.segni', budget: { ms: 0 } }, st => {
    const w = st.me && st.me.warp, ora = !!(w && w.kind === 'sonno');
    if (ora && !dormiva && CFG.auto && DOM && !INCORSO) setTimeout(() => salva(st).catch(() => { }), 0);
    dormiva = ora;
  });
  if (DOM) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvio); else avvio(); }

  Object.assign(Salva, { VER, puro: Salva.puro, via, torna, normalizza, carica, salva, leggi, scrivi, migra, Fotografia, kv, kvMemoria, kvIDB, kvLS,
    comprimi, comprimiPezzi, decomprimi, detrasponi, crc32: b => crcFine(crc32(b)), pezziJSON, impronta,
    get inCorso() { return !!INCORSO; },
    _: { colonne, Codificatore, decodifica, fisso, visitaFisso, sostituti, rifaPiani, a64, da64, corse, conCasoFinto, setKV: k => { KV = k; }, sblocca: () => { BLOCCATO = false; }, get bloccato() { return BLOCCATO; } } });
  Un().Salva = Salva;
  return Salva;
})();
if (typeof window !== 'undefined') window.Salva = Salva;
