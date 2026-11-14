/* [unico] unico_lingua.js: LINGUA, IL REALIZZATORE ITALIANO DEL SISTEMA UNICO, passo 1 (progetto: commedia/SISTEMA_UNICO.md §7.4,
   §2.1.1; DEBOLEZZE §12-§13). Dietro ?commedia. Spento il flag: Lingua = { ON: false } e nient'altro (nessun avvolgimento).
   Il progetto mette Lingua in unico_segni.js (§1.1); sta in un file suo perché i segni arrivano al passo 4 e Lingua serve già al corpo.

   Uno solo, e legge il lessico di unico_catalogo.js (le teste) e di Roba (unico_attore.js):
   (cosa = un testo, o una voce di Roba: Roba.di(chiave))
   - Lingua.genere(cosa)            { g: 'm'|'f', n: 's'|'p'|'i', f, pl, h, noto } (f/pl come i due genere() vecchi)
   - Lingua.art(cosa, tipo, opt)    tipo 'det' | 'ind' | 'di' | 'a' | 'da' | 'in' | 'su'  («la chiave», «una chiave», «delle chiavi»,
                                    «allo stivale», «dell'olio», «gli stivali», «un'ascia», «lo pneumatico»); opt { pl: true } al plurale
   - Lingua.plurale(cosa)           «bomboletta spray» → «bombolette spray», «carne fresca» → «carni fresche»
   - Lingua.quanti(cosa, q, massa)  «una bomboletta», «due bombolette», «del pane»
   - Lingua.part(verbo, sesso, n)   «entrare»/«entrato», 'f' → «entrata» (sesso anche da un Attore)
   - Lingua.nome(st, chi)           il nome preso dall'attore, mai scritto nella battuta
   - Lingua.concorda(testo, st)     il correttore a valle per le fonti che non si possono avvolgere (le funzioni nella chiusura di
                                    iniziative.js e di parola.js): l'articolo plurale davanti a un singolare in -e del lessico
                                    («delle chiave» → «una chiave», «delle fucile» → «un fucile»), il participio di una donna
                                    («Sandra è entrato» → «Sandra è entrata»), le elisioni («la arancia» → «l'arancia»), la maiuscola
                                    dopo ?/!/. («Hai sentito? qualcuno…» → «Hai sentito? Qualcuno…»), «Nino» scritto se il giocatore si
                                    chiama in un altro modo. Tocca solo quando è sicuro: parola del lessico, nome di un abitante.

   GLI AVVOLGIMENTI (§2.1.1: «i due genere() si sostituiscono per avvolgimento con Lingua.art»). I due genere() di parola.js:78 e
   iniziative.js:107 stanno nella chiusura dei loro moduli: si avvolge quello che è esposto, e si corregge a valle il resto.
   - Parola.art, Parola.quantiDi, Iniziative._.art diventano Lingua (gli originali in Lingua.vecchi); Parola.genere e
     Iniziative._.genere (nuovi) sono Lingua.genere;
   - a valle, Lingua.concorda su: il fumetto di ogni NPC (n.bark, davanti al filtro di commedia), Game.feed, Popolo.note,
     Vita.fatto (dati.d), i fatti di iniziative (st.ini.fatti[].d), le conseguenze dei mandati di parola. */
var Lingua = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const Lingua = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = Lingua;
  if (!ON) return Lingua;
  const UC = () => (typeof UnicoCatalogo !== 'undefined' && UnicoCatalogo.ON ? UnicoCatalogo : null);
  const GM = () => (typeof Game !== 'undefined' ? Game : null);
  const CFG = Lingua.CFG = { spia: null };   // spia(prima, dopo, fonte): per le prove e l'ispettore
  const stats = Lingua.stats = { art: 0, part: 0, maiuscole: 0, nome: 0, testi: 0, cambiati: 0, ignote: {} };

  // ======================= IL LESSICO =======================
  const deacc = s => s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
  // il plurale di una parola sola, dato il genere (le eccezioni stanno nel lessico)
  function plW(w, g) {
    if (!w || /[àèéìòù]$/.test(w) || /[^aeiou]$/.test(w)) return w;   // città, caffè, gas, jeans
    if (/ca$/.test(w)) return w.slice(0, -1) + 'he';
    if (/ga$/.test(w)) return w.slice(0, -1) + 'he';
    if (/[cg]ia$/.test(w)) return /[aeiou][cg]ia$/.test(w) ? w.slice(0, -1) + 'e' : w.slice(0, -2) + 'e';   // camicia → camicie, torcia → torce
    if (/co$/.test(w) || /go$/.test(w)) return w.slice(0, -1) + 'hi';
    if (/io$/.test(w)) return w.slice(0, -1);
    if (/a$/.test(w)) return g === 'm' ? w.slice(0, -1) + 'i' : w.slice(0, -1) + 'e';
    if (/[oe]$/.test(w)) return w.slice(0, -1) + 'i';
    return w;
  }
  let LEX = null, MASSA = null;
  function lex() {
    if (LEX) return LEX;
    LEX = new Map(); MASSA = new Set();
    const C = UC(); if (!C) return LEX;
    const metti = (k, v) => { if (!LEX.has(k)) LEX.set(k, v); const d = deacc(k); if (d !== k && d.length > 2 && !LEX.has(d)) LEX.set(d, v); };   // «tè» non diventa «te» (il pronome)
    for (const t of C.TESTE.split(/\s+/)) {
      if (!t) continue;
      const [w, rest] = t.split(':'); const [cod, alt] = (rest || 'm').split('/'); const g = cod[0], q = cod.slice(1);
      if (q === 'i') { metti(w, { g, n: 'i', sg: w, pl: w }); continue; }
      if (q === 'p') { const e = { g, n: 'p', sg: alt || null, pl: w }; metti(w, e); if (alt) metti(alt, { g, n: 's', sg: alt, pl: w }); continue; }
      const pl = alt || plW(w, g), e = { g, n: 's', sg: w, pl }; metti(w, e); if (pl !== w) metti(pl, { g, n: 'p', sg: w, pl });
    }
    for (const w of C.MASSA.split(/\s+/)) if (w) { MASSA.add(w); MASSA.add(deacc(w)); }
    return LEX;
  }
  const ARTI_RE = /^(?:(?:il|lo|la|i|gli|le|un|uno|una|del|dello|della|dei|degli|delle)\s+|(?:l'|un'|dell')\s*)/i;
  const pulisci = s => String(s == null ? '' : s).replace(/\s*\([^)]*\)/g, '').trim();
  const senzaArt = s => pulisci(s).replace(ARTI_RE, '');
  const testa = s => (senzaArt(s).toLowerCase().split(/[\s']/)[0] || '');
  // la voce del lessico di una parola, o null (nessuna euristica)
  function voce(w) { const L = lex(); w = String(w || '').toLowerCase(); const d = deacc(w); return L.get(w) || (d.length > 2 ? L.get(d) : null) || null; }
  // per le parole fuori dal lessico: le regole, più il plurale riconosciuto da un singolare del lessico (sedie ← sedia)
  function indovina(h) {
    const L = lex();
    if (/(tà|tù)$/.test(h)) return { g: 'f', n: 'i' };
    if (/[^aeiouàèéìòù]$/.test(h) || /[àèéìòù]$/.test(h)) return { g: 'm', n: 'i' };
    if (/(ione|udine|ice)$/.test(h)) return { g: 'f', n: 's' };
    if (/(one|ore|ale|ile|ente|ante)$/.test(h)) return { g: 'm', n: 's' };
    if (/(che|ghe)$/.test(h)) { const s = h.slice(0, -2) + (h.endsWith('che') ? 'ca' : 'ga'); const v = L.get(s); if (v) return { g: v.g, n: 'p' }; return { g: 'f', n: 'p' }; }
    if (/e$/.test(h)) { const v = L.get(h.slice(0, -1) + 'a'); if (v && v.g === 'f') return { g: 'f', n: 'p' }; return { g: 'm', n: 's' }; }   // le -e ignote: singolare (l'errore «delle chiave» veniva da qui)
    if (/i$/.test(h)) { const v = L.get(h.slice(0, -1) + 'o') || L.get(h.slice(0, -1) + 'e'); return { g: v ? v.g : 'm', n: 'p' }; }
    if (/a$/.test(h)) return /(ma|ta)$/.test(h) && L.get(h) ? L.get(h) : { g: 'f', n: 's' };
    return { g: 'm', n: 's' };
  }
  // il genere di una cosa (una chiave di Roba o una frase): lo stesso contratto dei due genere() vecchi (f, pl, h) e in più g, n, noto
  function genere(cosa) {
    const nm = cosa && typeof cosa === 'object' ? cosa.nome : cosa, h = testa(nm);
    const v = voce(h), ok = !!v, x = v || indovina(h);
    if (!ok && h) stats.ignote[h] = (stats.ignote[h] || 0) + 1;
    return { g: x.g, n: x.n, f: x.g === 'f', pl: x.n === 'p', h, noto: ok, massa: !!(MASSA && (MASSA.has(h) || MASSA.has(deacc(h)))) };
  }
  // una cosa è un testo («chiave inglese») o una voce di Roba (Roba.di('chiave_inglese')): una stringa è sempre un testo, perché
  // le chiavi e i nomi si confondono («sigarette» è la chiave della «stecca di sigarette»)
  const nomeDi = cosa => pulisci(cosa && typeof cosa === 'object' ? cosa.nome : cosa);

  // ======================= GLI ARTICOLI =======================
  const VOC = h => /^[aeiouàèéìòùh]/i.test(h) && !/^i[aeiouàèéìòù]/i.test(h);
  const SPEC = h => /^(s[^aeiouàèéìòù]|z|gn|ps|pn|x|y|i[aeiouàèéìòù])/i.test(h);
  // l'articolo determinativo: il · lo · l' · la · i · gli · le
  function det(g, pl, h) { if (pl) return g === 'f' ? 'le' : VOC(h) || SPEC(h) ? 'gli' : 'i'; return VOC(h) ? "l'" : g === 'f' ? 'la' : SPEC(h) ? 'lo' : 'il'; }
  const PREP = {
    di: { il: 'del', lo: 'dello', "l'": "dell'", la: 'della', i: 'dei', gli: 'degli', le: 'delle' },
    a: { il: 'al', lo: 'allo', "l'": "all'", la: 'alla', i: 'ai', gli: 'agli', le: 'alle' },
    da: { il: 'dal', lo: 'dallo', "l'": "dall'", la: 'dalla', i: 'dai', gli: 'dagli', le: 'dalle' },
    in: { il: 'nel', lo: 'nello', "l'": "nell'", la: 'nella', i: 'nei', gli: 'negli', le: 'nelle' },
    su: { il: 'sul', lo: 'sullo', "l'": "sull'", la: 'sulla', i: 'sui', gli: 'sugli', le: 'sulle' },
  };
  const TIPO = { det: 'det', ind: 'ind', indet: 'ind', un: 'ind', di: 'di', part: 'di', a: 'a', da: 'da', in: 'in', su: 'su' };
  // la sola forma dell'articolo (senza la parola): forma('ind', 'f', false, 'ascia') → "un'"
  function forma(tipo, g, pl, h) {
    tipo = TIPO[tipo] || 'ind';
    if (tipo === 'ind') { if (pl) return PREP.di[det(g, true, h)]; return g === 'f' ? (VOC(h) ? "un'" : 'una') : SPEC(h) ? 'uno' : 'un'; }
    const d = det(g, pl, h); return tipo === 'det' ? d : PREP[tipo][d];
  }
  const unisci = (a, s) => (/'$/.test(a) ? a + s : a + ' ' + s);
  function art(cosa, tipo, opt) {
    const s = senzaArt(nomeDi(cosa)); if (!s) return s;
    const g = genere(cosa), pl = g.n === 'p' || (g.n === 'i' && !!(opt && opt.pl));
    let nm = s;
    if (opt && opt.pl && g.n === 's') { nm = plurale(s); }
    stats.art++;
    return unisci(forma(tipo, g.g, pl || !!(opt && opt.pl), testa(nm)), nm);
  }
  // il plurale di una frase: la testa e gli aggettivi che la seguono fino alla prima preposizione («carne fresca» → «carni fresche»)
  const PREPS = /^(di|d'|da|a|al|alla|in|per|con|del|della|dello|dei|degli|delle|dell'|e|sotto|da|su)$/i;
  function plurale(cosa) {
    const s = senzaArt(nomeDi(cosa)), w = s.split(' '), v = voce(w[0].toLowerCase());
    const g = v ? v.g : indovina(w[0].toLowerCase()).g;
    if (v && v.n !== 's') return s;
    if (!v) { const x = indovina(w[0].toLowerCase()); if (x.n !== 's') return s; }
    const out = [v ? v.pl : plW(w[0], g)];
    let i = 1;
    for (; i < w.length; i++) { const x = w[i]; if (PREPS.test(x) || /'/.test(x) || /^[A-Z0-9(]/.test(x)) break; const vx = voce(x.toLowerCase()); if (vx && vx.n !== 's') break; out.push(plW(x, g)); }
    return out.concat(w.slice(i)).join(' ');
  }
  const NUMW = ['zero', 'un', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci'];
  function quanti(cosa, q, massa) {
    q = q == null ? 1 : q; const g = genere(cosa);
    if (massa === undefined) massa = g.massa;
    if (q <= 1) return massa ? art(cosa, 'di') : g.n === 'p' ? art(cosa, 'di') : art(cosa, 'ind');
    return `${NUMW[q] || q} ${plurale(cosa)}`;
  }
  // «uno» per le cose che si contano, «del» per le cose di massa (la scelta di commedia.js §6 articolo)
  const unoDi = cosa => quanti(cosa, 1);

  // ======================= I PARTICIPI =======================
  const IRR = { essere: 'stato', stare: 'stato', fare: 'fatto', dire: 'detto', venire: 'venuto', prendere: 'preso', mettere: 'messo', scendere: 'sceso',
    rimanere: 'rimasto', morire: 'morto', nascere: 'nato', correre: 'corso', chiudere: 'chiuso', aprire: 'aperto', vedere: 'visto', rompere: 'rotto',
    scrivere: 'scritto', perdere: 'perso', decidere: 'deciso', accendere: 'acceso', spendere: 'speso', rispondere: 'risposto', ridere: 'riso',
    leggere: 'letto', cuocere: 'cotto', bere: 'bevuto', vivere: 'vissuto', offrire: 'offerto', soffrire: 'sofferto', chiedere: 'chiesto',
    porre: 'posto', tradurre: 'tradotto', togliere: 'tolto', scegliere: 'scelto', vincere: 'vinto', dipingere: 'dipinto', spingere: 'spinto',
    fingere: 'finto', giungere: 'giunto', piangere: 'pianto', muovere: 'mosso', nascondere: 'nascosto', ridurre: 'ridotto', produrre: 'prodotto',
    succedere: 'successo', mordere: 'morso', difendere: 'difeso', sorridere: 'sorriso', comparire: 'comparso', apparire: 'apparso', sparire: 'sparito',
    raggiungere: 'raggiunto', convincere: 'convinto', rimettere: 'rimesso', promettere: 'promesso', permettere: 'permesso', riprendere: 'ripreso',
    sorprendere: 'sorpreso', tornare: 'tornato', uscire: 'uscito', riuscire: 'riuscito' };
  const PART_IRR = new Set(Object.values(IRR));
  const ePart = w => /(at|ut|it)[oaie]$/.test(w) || PART_IRR.has(w.slice(0, -1) + 'o');
  function radice(v) {
    v = String(v || '').toLowerCase().trim();
    if (IRR[v]) return IRR[v].slice(0, -1);
    if (/are$/.test(v)) return v.slice(0, -3) + 'at';
    if (/ere$/.test(v)) return v.slice(0, -3) + 'ut';
    if (/ire$/.test(v)) return v.slice(0, -3) + 'it';
    if (/[oaie]$/.test(v)) return v.slice(0, -1);   // già un participio: entrato, entrata
    return v;
  }
  function part(verbo, sesso, numero) {
    if (sesso && typeof sesso === 'object') sesso = sesso.sesso || (sesso.pop && sesso.pop.sex) || 'm';
    const f = sesso === 'f', pl = numero === 'p' || numero === 'pl' || (typeof numero === 'number' && numero > 1);
    stats.part++;
    return radice(verbo) + (pl ? (f ? 'e' : 'i') : (f ? 'a' : 'o'));
  }
  const o = sesso => (sesso === 'f' || (sesso && sesso.sesso === 'f') ? 'a' : 'o');

  // ======================= I NOMI =======================
  function nome(st, chi) {
    const A = typeof Attore !== 'undefined' && Attore.ON ? Attore : null;
    if (A && st) { const a = A.di(st, chi); if (a) return a.nome; }
    const G = GM(); if (G && G.nameOf && st) try { return G.nameOf(st, chi && chi.id ? chi.id : chi); } catch (e) { }
    return chi && chi.first ? chi.first : String(chi || 'qualcuno');
  }
  const nomeGiocatore = st => (st && st.u && st.u.sedile && st.u.sedile !== 'nino' ? nome(st, 'player') : (GM() && GM().PLAYER_NAME) || 'Nino');
  // il sesso dei nomi degli abitanti (dalla partita): Sandra → 'f'. Un nome portato da uomini e da donne non decide
  const SESSI = new WeakMap();
  function sessi(st) {
    if (!st || !st.npcs) return null;
    let m = SESSI.get(st); if (m && m.n === st.npcs.length) return m.m;
    const out = new Map();
    for (const n of st.npcs) { const s = n.pop && n.pop.sex; const f = n.first; if (!f || !s) continue; const p = out.get(f); out.set(f, p && p !== s ? '?' : s); }
    SESSI.set(st, { n: st.npcs.length, m: out }); return out;
  }

  // ======================= IL CORRETTORE A VALLE =======================
  const PL_ART = { i: 'det', gli: 'det', le: 'det', dei: 'ind', degli: 'ind', delle: 'ind', ai: 'a', agli: 'a', alle: 'a', dai: 'da', dagli: 'da', dalle: 'da',
    nei: 'in', negli: 'in', nelle: 'in', sui: 'su', sugli: 'su', sulle: 'su' };
  const SG_ART = { il: 'det', lo: 'det', la: 'det', "l'": 'det', un: 'ind', uno: 'ind', una: 'ind', "un'": 'ind', del: 'di', dello: 'di', della: 'di', "dell'": 'di',
    al: 'a', allo: 'a', alla: 'a', "all'": 'a', dal: 'da', dallo: 'da', dalla: 'da', "dall'": 'da', nel: 'in', nello: 'in', nella: 'in', "nell'": 'in',
    sul: 'su', sullo: 'su', sulla: 'su', "sull'": 'su' };
  const AMBIGUI = new Set(['lo', 'la', 'le', 'gli', "l'", 'i']);   // possono essere pronomi («la prendo», «gli dico»): solo le elisioni
  const GEN_ART = a => (/^(la|una|un'|della|alla|dalla|nella|sulla|le|delle|alle|dalle|nelle|sulle)$/.test(a) ? 'f' : /^(l'|dell'|all'|dall'|nell'|sull')$/.test(a) ? null : 'm');
  // un nome davanti a «delle»: il partitivo («la lotteria delle chiave» → «della chiave»), altrimenti l'indeterminativo («ha vinto una chiave»)
  const PRIMA_DI = /(lotteria|vendita|banco|raccolta|laboratorio|caccia|corsa|fila|gara|sacco|pacco|scatola|mazzo|cassa|cassetta|bottiglia|pezzo|resto|odore|storia|prezzo|conto|nome|questione|metà|parte)$/i;
  const capA = (orig, s) => (/^[A-ZÀ-Ý]/.test(orig) ? s[0].toUpperCase() + s.slice(1) : s);
  const ART_RE = /(^|[^A-Za-zÀ-ÿ'])(dello|della|dell'|degli|delle|dallo|dalla|dall'|dagli|dalle|nello|nella|nell'|negli|nelle|sullo|sulla|sull'|sugli|sulle|allo|alla|all'|agli|alle|gli|uno|una|un'|del|dei|dal|dai|nel|nei|sul|sui|il|lo|la|l'|le|un|al|ai|i)(\s*)([A-Za-zÀ-ÿ-]+)/gi;   // le forme lunghe prima (delle prima di del); niente lookbehind: i Safari vecchi non lo leggono
  function articoli(t) {
    return t.replace(ART_RE, (m, pre, a, sp, w, off, all) => {
      if (!sp && !/'$/.test(a)) return m;   // «il» dentro «ilarità»: l'articolo è una parola sola, o finisce con l'apostrofo
      const al = a.toLowerCase(), v = voce(w); if (!v) return m;
      const plA = PL_ART[al] !== undefined, tipo0 = plA ? PL_ART[al] : SG_ART[al]; if (!tipo0) return m;
      const h = w.toLowerCase();
      let tipo = tipo0, pl = plA, g = v.g;
      // 1. l'articolo plurale davanti a una -e singolare del lessico: l'errore dei genere() vecchi («delle chiave», «delle fucile»)
      if (plA && v.n === 's' && /e$/.test(h)) {
        if (al === 'delle' || al === 'degli' || al === 'dei') { const prima = all.slice(0, off).trim().split(/\s+/).pop() || ''; tipo = PRIMA_DI.test(prima) ? 'di' : 'ind'; }
        pl = false;
      } else if (plA !== (v.n === 'p') && v.n !== 'i') return m;   // un altro numero: non si sa chi ha ragione, si lascia
      else if (v.n === 'i') pl = plA;
      // 2. il genere sbagliato, solo con un articolo che non può essere un pronome
      const ga = GEN_ART(al);
      if (ga && ga !== g && AMBIGUI.has(al)) return m;
      const nuovo = forma(tipo, g, pl, h);
      if (nuovo === al) return m;
      // 3. le elisioni e le forme (la arancia → l'arancia, il zaino → lo zaino): stesso genere e numero, forma diversa
      stats.art++;
      return pre + capA(a, unisci(nuovo, w));
    });
  }
  const PART_RE = /(^|[^A-Za-zÀ-ÿ])([A-ZÀ-Ý][a-zà-ÿ]+)( non)? (è|era|sarà|sia|fosse|è già|era già)( stat[oa])? ([a-zà-ÿ]+[oa])\b/g;
  function participi(t, st) {
    const S = sessi(st); if (!S) return t;
    return t.replace(PART_RE, (m, pre, nm, non, aus, stato, p) => {
      const s = S.get(nm); if (s !== 'f' && s !== 'm') return m;
      if (!ePart(p)) return m;
      const want = s === 'f' ? 'a' : 'o', p2 = p.slice(0, -1) + want, st2 = stato ? ' stat' + want : '';
      if (p2 === p && st2 === (stato || '')) return m;
      stats.part++;
      return pre + nm + (non || '') + ' ' + aus + st2 + ' ' + p2;
    });
  }
  function maiuscole(t, inizio) {
    let r = t.replace(/([?!]|[^.]\.)(\s+)([a-zà-ÿ])/g, (m, p, sp, c) => { stats.maiuscole++; return p + sp + c.toUpperCase(); });
    if (inizio && /^[a-zà-ÿ]/.test(r)) { stats.maiuscole++; r = r[0].toUpperCase() + r.slice(1); }
    return r;
  }
  // [molo] la d eufonica davanti a un nome che comincia per A: «a Ada» → «ad Ada», «e Elena» → «ed Elena» (solo davanti alla maiuscola:
  // i nomi e i posti, dove l'errore si vede)
  const EUF_A = /(^|[^A-Za-zÀ-ÿ'])a (?=A[a-zà-ÿ])/g, EUF_E = /(^|[^A-Za-zÀ-ÿ'])e (?=E[a-zà-ÿ])/g;
  function eufonia(t) { return t.indexOf(' A') < 0 && t.indexOf(' E') < 0 ? t : t.replace(EUF_A, '$1ad ').replace(EUF_E, '$1ed '); }
  // «a» davanti a un nome: Lingua.a('Ada') → «ad Ada», Lingua.a('Bruno') → «a Bruno»
  const aNome = w => (w ? (/^[Aa]/.test(w) ? 'ad ' : 'a ') + w : '');
  // opt.frase: il testo è una frase intera (un fumetto, una riga del giornale), quindi comincia con la maiuscola; le note e i fatti
  // sono pezzi di frase («ha vinto una chiave alla lotteria», dopo il nome) e restano come sono
  function concorda(testo, st, opt) {
    if (typeof testo !== 'string' || !testo) return testo;
    stats.testi++;
    let t = articoli(testo);
    t = participi(t, st || (typeof Unico !== 'undefined' ? Unico.st : null));
    t = maiuscole(t, !!(opt && opt.frase));
    t = eufonia(t);
    const pn = nomeGiocatore(st);
    if (pn && pn !== 'Nino' && /\bNino\b/.test(t)) { const S = sessi(st); if (!(S && S.has('Nino'))) { t = t.replace(/\bNino\b/g, pn); stats.nome++; } }
    if (t !== testo) { stats.cambiati++; if (CFG.spia) try { CFG.spia(testo, t, (opt && opt.fonte) || ''); } catch (e) { } }
    return t;
  }

  // [mondo] I SOLDI: un solo formattatore per le frasi nuove (lo sbleuro, quando arriva, cambia qui: MONDO_PIENO §7.1)
  const VALUTA = Lingua.VALUTA = { k: 1, fmt: x => `${(Math.round(x * 10) / 10).toLocaleString('it-IT')}.000 lire` };
  const soldi = x => VALUTA.fmt((+x || 0) * VALUTA.k);
  // [mondo] I NOMI DEI DESIDERI (MONDO_PIENO §9.7): etichette di grappoli di variabili, non servono a generare. d = { k, per, vs, altro,
  // nomeAltro, cosa }; la prima riga che combacia dà il nome; se nessuna, il generico composto («vuole più soldi di Gino»)
  const DESIDERI = Lingua.DESIDERI = [
    ['volare', d => d.k === 'quota' && d.vs > 0 && d.q >= .6], ['stare in alto', d => d.k === 'quota' && d.vs > 0], ['andare veloce', d => d.k === 'velocita' && d.vs > 0],
    ['farsi vedere', d => d.k === 'pubblico' && d.vs > 0 && !d.altro], ['diventare ricco', d => d.k === 'soldi' && d.vs > 0 && d.q >= .7 && !d.altro], ['rifarsi dei soldi', d => d.k === 'soldi' && d.vs > 0 && d.mot === 'perdita'],
    ['essere temut{o}', d => d.k === 'temuto' && d.vs > 0 && !d.altro], ['vendicarsi', d => d.altro && d.mot === 'torto'], ['farla pagare', d => d.altro && (d.k === 'ferite' || d.k === 'ridicolo') && d.vs > 0],
    ['riavere {cosa}', d => d.k === 'possiede' && d.vs > 0 && d.mot === 'perdita'], ['provare {cosaI}', d => d.k === 'possiede' && d.vs > 0 && d.mot === 'curiosita'], ['avere {cosa} anche {lui}', d => d.k === 'possiede' && d.vs > 0 && d.mot === 'mimesi'], ['avere un tetto', d => d.k === 'casa' && d.vs > 0],
    ['essere liber{o}', d => d.k === 'libero' && d.vs > 0 && !d.altro], ['liberare {B}', d => d.k === 'libero' && d.vs > 0 && d.altro], ['togliersi la figuraccia', d => d.k === 'ridicolo' && d.vs < 0 && !d.altro],
    ['farsi voler bene da {B}', d => d.k === 'affetto' && d.vs > 0 && d.altro], ['levarsi il debito', d => d.k === 'debito' && d.vs < 0], ['farsi due risate', d => d.k === 'bisogno:svago' && d.vs < 0],
    ['mangiare come si deve', d => d.k === 'bisogno:fame' && d.vs < 0], ['stare in pace', d => d.k === 'ferite' && d.vs < 0 && !d.altro], ['far cambiare idea a {B}', d => d.k === 'idea_di' && d.altro],
    ['stare {posto}', d => d.k === 'posizione' && d.vs > 0],
  ];
  const NOMI_VAR = Lingua.NOMI_VAR = { soldi: 'soldi', quota: 'altezza', velocita: 'velocità', pubblico: 'gente che guarda', temuto: 'rispetto', ridicolo: 'figuracce', vigliacco: 'fama di vigliacco', ferite: 'botte',
    salute: 'salute', casa: 'un tetto', lavoro: 'un lavoro', affetto: 'affetto', rancore: 'rancore', debito: 'debiti', fascicolo: 'guai coi Grigi', libero: 'libertà', membro: 'compagni', capo: 'comando', posizione: 'posto' };
  function desiderio(d) {
    const fill = s => s.replace('{cosaI}', d.cosa ? art(d.cosa, 'ind') : 'qualcosa di nuovo').replace('{cosa}', d.cosa ? art(d.cosa, 'det') : 'la sua roba').replace('{B}', d.nomeAltro || 'qualcuno').replace('{posto}', d.posto ? 'a ' + d.posto : 'lì').replace('{o}', d.f ? 'a' : 'o').replace('{lui}', d.f ? 'lei' : 'lui');
    for (const [w, t] of DESIDERI) { let ok = false; try { ok = t(d); } catch (e) { ok = false; } if (ok) return fill(w); }
    const v = d.k === 'possiede' ? (d.cosa ? art(d.cosa, 'det', { pl: true }) : 'roba') : d.k.indexOf('bisogno:') === 0 ? d.k.slice(8) : d.k === 'prop' ? 'roba ' + (d.per || '') : (NOMI_VAR[d.k] || d.k);
    if (d.altro) return d.vs > 0 ? fill(`che {B} abbia più ${v}`) : d.k === 'possiede' ? fill(`che {B} non abbia più ${v}`) : fill(`che {B} abbia meno ${v}`);
    if (d.k === 'possiede') return d.vs > 0 ? (d.cosa ? `avere ${art(d.cosa, 'ind')}` : 'avere più roba') : `liberarsi ${d.cosa ? art(d.cosa, 'di') : 'della roba'}`;
    return d.vs > 0 ? `avere più ${v}` : `avere meno ${v}`;
  }
  Object.assign(Lingua, { a: aNome, eufonia, genere, art, forma, plurale, quanti, unoDi, part, o, nome, concorda, voce, senzaArt, testa, soldi, desiderio,
    _: { lex, plW, indovina, articoli, participi, maiuscole, radice, sessi, det } });

  // ======================= GLI AVVOLGIMENTI =======================
  const vecchi = Lingua.vecchi = {}, FRASE = { frase: true, fonte: 'fumetto' }, FEED = { frase: true, fonte: 'feed' },
    NOTA = { fonte: 'nota' }, VITA = { fonte: 'vita' }, INI = { fonte: 'iniziative' }, MANDATO = { fonte: 'mandato' };
  const tipoParola = k => (k === 'det' ? 'det' : k === 'indet' ? 'ind' : 'di');   // parola.js art: 'det' | 'indet' | il resto è il partitivo
  const tipoIni = k => (k === 'det' ? 'det' : k === 'di' ? 'di' : 'ind');         // iniziative.js art: 'det' | 'di' | il resto è l'indeterminativo
  function avvolgi() {
    if (typeof Parola !== 'undefined' && Parola.ON && Parola.art && !Parola.art.__lingua) {
      vecchi.parolaArt = Parola.art; vecchi.parolaQuanti = Parola.quantiDi;
      Parola.art = function (nm, kind) { return art(nm, tipoParola(kind)); }; Parola.art.__lingua = true;
      if (Parola.quantiDi) Parola.quantiDi = function (nm, q, mass) { return quanti(nm, q, !!mass); };
      Parola.genere = genere;
    }
    if (typeof Iniziative !== 'undefined' && Iniziative.ON && Iniziative._ && Iniziative._.art && !Iniziative._.art.__lingua) {
      vecchi.iniArt = Iniziative._.art;
      Iniziative._.art = function (s, k) { return art(s, tipoIni(k)); }; Iniziative._.art.__lingua = true;
      Iniziative._.genere = genere;
    }
    // a valle: le fonti che restano nella chiusura dei moduli vecchi
    const G = GM();
    if (G && typeof G.feed === 'function' && !G.feed.__lingua) { const f0 = vecchi.feed = G.feed; G.feed = function (st, text, kind) { return f0.call(this, st, concorda(text, st, FEED), kind); }; G.feed.__lingua = true; }
    if (typeof Popolo !== 'undefined' && Popolo && typeof Popolo.note === 'function' && !Popolo.note.__lingua) { const n0 = vecchi.note = Popolo.note; Popolo.note = function (st, n, text) { const a = Array.prototype.slice.call(arguments); a[2] = concorda(text, st, NOTA); return n0.apply(this, a); }; Popolo.note.__lingua = true; }
    if (typeof Vita !== 'undefined' && Vita.ON && typeof Vita.fatto === 'function' && !Vita.fatto.__lingua) { const v0 = vecchi.vitaFatto = Vita.fatto; Vita.fatto = function (tipo, chi, dati) { if (dati && typeof dati.d === 'string') dati.d = concorda(dati.d, typeof Unico !== 'undefined' ? Unico.st : null, VITA); return v0.apply(this, arguments); }; Vita.fatto.__lingua = true; }
  }
  // i fumetti: n.bark è già una proprietà di commedia.js (il filtro); il nostro setter le sta davanti e corregge il testo prima
  const MIEI = new WeakMap();
  function fumetto(n, st) {
    const d = Object.getOwnPropertyDescriptor(n, 'bark'); if (d && MIEI.get(n) === d.set) return;
    let cur = d && !d.set ? d.value : undefined; const g0 = d && d.get, s0 = d && d.set;
    const set = function (b) { if (b && typeof b === 'object' && typeof b.text === 'string' && !b.__lingua) { b.text = concorda(b.text, Lingua._st || st, FRASE); try { Object.defineProperty(b, '__lingua', { value: true }); } catch (e) { } } if (s0) s0.call(n, b); else cur = b; };
    Object.defineProperty(n, 'bark', { configurable: true, enumerable: true, get: g0 ? function () { return g0.call(n); } : () => cur, set });
    MIEI.set(n, set);
  }
  let giro = 0, ultimoIni = 0; const VISTE = new WeakSet();
  function passo(st) {
    Lingua._st = st;
    if ((giro++ % 20) === 0 && st.npcs) for (const n of st.npcs) fumetto(n, st);
    if (giro % 40 !== 1) return;
    // i fatti di iniziative (st.ini.fatti[].d, id 'f' + numero crescente) nati dall'ultima volta
    const I = st.ini; if (I && I.fatti && I.fatti.length) {
      let top = ultimoIni;
      for (let i = I.fatti.length - 1; i >= 0; i--) { const f = I.fatti[i], k = +String(f.id).slice(1) || 0; if (k <= ultimoIni) break; if (k > top) top = k; if (typeof f.d === 'string') f.d = concorda(f.d, st, INI); }
      ultimoIni = top;
    }
    // le conseguenze dei mandati di parola («Sandra è entrato: parla con gli Orecchi»)
    const P = st.parola; if (P && P.mandati) for (const m of P.mandati) for (const c of (m.conseguenze || [])) if (c && typeof c === 'object' && !VISTE.has(c) && typeof c.testo === 'string') { c.testo = concorda(c.testo, st, MANDATO); VISTE.add(c); }
  }
  avvolgi();
  if (typeof Unico !== 'undefined' && Unico.ON && Unico.fase) {
    Unico.fase('unico.lingua', { dopo: 'casa' }, (st) => passo(st));
    if (Unico.nasce) Unico.nasce('lingua', st => { giro = 0; ultimoIni = 0; if (st.npcs) for (const n of st.npcs) fumetto(n, st); });
    Unico.Lingua = Lingua;
  }
  Lingua._passo = passo; Lingua._fumetto = fumetto; Lingua._avvolgi = avvolgi;
  return Lingua;
})();
if (typeof window !== 'undefined') window.Lingua = Lingua;
