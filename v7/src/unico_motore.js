/* [unico] unico_motore.js: IL MOTORE DECISIONALE, l'innesto (progetto: commedia/REGISTA_E_VOCABOLARIO.md §D, §T.4).
   Dietro ?commedia. Spento il flag: UnicoMotore = { ON: false } e nient'altro.

   CHE COSA FA. Una correzione LIMITATA sopra le curve della Mente: u'(g) = u(g) · 2^f, con f in [−1, +1] (da ×½ a ×2), solo sui primi K
   obiettivi già scelti dalle curve (K = 4 al telefono, 6 altrove). Non inventa obiettivi, non tocca le condizioni dei verbi.
   SENZA MODELLO NON FA NIENTE: Mente.innesti.motore resta null e la scelta è quella di sempre, identica (stesso seme, stessi fatti).
   Si accende solo se c'è un modello (window.UnicoModello, il file unico_modello.js generato dall'allenatore fuori dal gioco, §D.5)
   con lo schema delle caratteristiche giusto (UnicoMotore.schema) e senza ?curve nell'indirizzo.

   IL FORMATO DEL MODELLO (§D.4, §T.4): alberi di decisione a gradiente, interi (stesso risultato su ogni macchina):
     UnicoModello = { v: 1, schema: '<UnicoMotore.schema>', k: 1/512,
                      radici: { ob: [indici dei nodi radice], met: [...], ramo: [...] },
                      N: Int16Array([caratteristica, soglia, sinistra, destra] per nodo)   // figlio < 0: la foglia ~i
                      L: Int8Array([foglie]) }
   f(testa, q): per ogni albero si scende (q[car] <= soglia ? sinistra : destra) fino a una foglia; la somma × k, tagliata a [−1, 1].
   Le caratteristiche (UnicoMotore.CAR, 40) si quantizzano a interi: q = round(x × 1024). L'opzione si descrive per proprietà (la famiglia
   dell'obiettivo, quanto è pubblico, il costo), non per nome: un obiettivo nuovo eredita quello che il modello sa dei simili.
   LE TESTE: 'ob' (quale obiettivo) è innestata qui, in Mente.innesti.motore. 'met' (quale metodo HTN) e 'ramo' (quale ramo di una
   storylet) sono pronte nell'interfaccia (UnicoMotore.f) ma non ancora chiamate: vedi commedia/REGISTA_CONSEGNA.md. */
var UnicoMotore = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UnicoMotore = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UnicoMotore;
  if (!ON) return UnicoMotore;
  const CURVE = typeof location !== 'undefined' && /[?&]curve\b/.test(location.search);
  const ME = () => { const M = (typeof Unico !== 'undefined' && Unico.Mente) || (typeof MenteUnica !== 'undefined' ? MenteUnica : null) || (typeof Mente !== 'undefined' && Mente.OBIETTIVI ? Mente : null); return M && M.ON ? M : null; };   // non Mente: nel gioco quello è mente.js; la Mente unica è MenteUnica (Unico.Mente)
  const RG = () => (typeof Regista !== 'undefined' && Regista.ON ? Regista : null);
  const MOD = () => (typeof UnicoModello !== 'undefined' ? UnicoModello : (typeof window !== 'undefined' && window.UnicoModello) || null);
  const now = typeof performance !== 'undefined' && performance.now ? () => performance.now() : () => Date.now();
  const CFG = UnicoMotore.CFG = { K: { tel: 4, xe: 6, alto: 6 }, tetto: .05, sfori: .01 };
  const stats = UnicoMotore.stats = { valutazioni: 0, corrette: 0, ms: 0, msMax: 0, sfori: 0, chiamate: 0 };

  // ======================= LE CARATTERISTICHE (§D.3) =======================
  const FAM = { mangiare: 1, dormire: 1, igiene: 1, lavorare: 2, guadagnare: 2, fare_scorta: 2, pescare: 2, socializzare: 3, regalare: 3, prestare: 3, chiedere: 3,
    divertirsi: 3, pregare: 3, riscuotere: 4, vendicarsi: 4, arredare: 5, costruire: 5, rivendicare: 5, dipingere: 6 };
  const PUB = { socializzare: .6, divertirsi: .5, riscuotere: .6, vendicarsi: .7, rivendicare: .9, dipingere: .6, pregare: .5, regalare: .4 };
  const CAR = ['fame', 'sonno', 'igiene', 'svago', 'compagnia', 'rabbia', 'paura', 'soldi',
    'cor', 'loq', 'avid', 'legge', 'pigro', 'orgoglio', 'teatrale', 'generoso', 'rancore',
    'vergogna', 'orgoglio_e', 'euforia', 'noia',
    'ora_sin', 'ora_cos', 'blocco', 'giorno_sett', 'meteo',
    'gente', 'pubblico_posto', 'tensione_q', 'dist_giocatore',
    'rel_affetto', 'rel_rancore', 'rel_debito', 'rel_rivalita',
    'in_storia', 'passo', 'spinta',
    'abitudine', 'ore_notevole', 'fama',
    'op_fam', 'op_pub', 'op_base', 'op_inerzia'];
  let h = 2166136261; for (const c of CAR.join('|')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const schema = 'f' + CAR.length + '-' + (h >>> 0).toString(16).slice(0, 4);
  const IX = {}; CAR.forEach((k, i) => { IX[k] = i; });
  const Q = new Int16Array(CAR.length);
  const qz = x => { const v = Math.round((+x || 0) * 1024); return v > 32767 ? 32767 : v < -32768 ? -32768 : v; };
  const BLOCCHI = ['casa', 'lavoro', 'svago', 'pasto', 'messa', 'mercato'];
  // le caratteristiche di un'opzione g per il contesto c della Mente (quelle che oggi non esistono, come le emozioni nuove, restano 0)
  function caratteristiche(c, g, sp) {
    Q.fill(0); const n = c.n, P = c.P || {}, N = P.need || {}, K = (c.M && c.M.carattere) || {}, st = c.st, p = st.player;
    for (const k of ['fame', 'sonno', 'igiene', 'svago', 'compagnia', 'rabbia', 'paura']) Q[IX[k]] = qz(N[k]);
    Q[IX.soldi] = qz(Math.min(4, (P.money || 0) / 100));
    for (const k of ['cor', 'loq', 'avid', 'legge', 'pigro', 'orgoglio', 'teatrale', 'generoso', 'rancore']) Q[IX[k]] = qz(K[k]);
    const hh = (c.h || 0) / 24 * Math.PI * 2; Q[IX.ora_sin] = qz(Math.sin(hh)); Q[IX.ora_cos] = qz(Math.cos(hh));
    Q[IX.blocco] = Math.max(0, BLOCCHI.indexOf(c.blocco)); Q[IX.giorno_sett] = ((c.d || 0) % 7);
    const R = RG(); if (R) { Q[IX.tensione_q] = qz(R.tq(st, n.x, n.y)); const s = R.ruoloDi(st, n.id); if (s) { Q[IX.in_storia] = 1024; Q[IX.passo] = s.passo; } }
    if (p) { const d = Math.hypot(n.x - p.x, n.y - p.y); Q[IX.dist_giocatore] = d < 26 ? 0 : d < 60 ? 1 : d < 150 ? 2 : 3; }
    Q[IX.spinta] = qz(sp && sp[g] !== undefined ? sp[g] : 1);
    Q[IX.op_fam] = FAM[g] || 0; Q[IX.op_pub] = qz(PUB[g] || .2);
    const D = ME() && ME().OBIETTIVI[g]; Q[IX.op_base] = qz(D ? D.base : 0); Q[IX.op_inerzia] = c.M && c.M.ob && c.M.ob.g === g ? 1024 : 0;
    return Q;
  }

  // ======================= L'INFERENZA (§T.4) =======================
  function f(testa, q) {
    const M = MOD(); if (!M || !M.radici || !M.radici[testa]) return 0;
    const N = M.N, L = M.L, T = M.radici[testa]; let s = 0;
    for (let t = 0; t < T.length; t++) { let i = T[t], g = 0; while (i >= 0 && g++ < 64) i = q[N[i * 4]] <= N[i * 4 + 1] ? N[i * 4 + 2] : N[i * 4 + 3]; s += L[~i] || 0; }
    s *= M.k || 1 / 512; return s > 1 ? 1 : s < -1 ? -1 : s;
  }
  // l'innesto nella Mente: corregge i primi K in loco (×2^f)
  function correggi(c, L) {
    const a = now(); stats.chiamate++;
    const K = CFG.K[(c.st.u && c.st.u.classe) || 'xe'] || 6, R = RG(), sp = R ? R.spinteDi(c.st, c.n.id) : null;
    for (let i = 0; i < L.length && i < K; i++) { const v = f('ob', caratteristiche(c, L[i].g, sp)); stats.valutazioni++; if (v) { L[i].u *= Math.pow(2, v); stats.corrette++; } }
    const ms = now() - a; stats.ms += ms; if (ms > stats.msMax) stats.msMax = ms;
    if (ms > CFG.tetto) stats.sfori++;
    // il ripiego (§D.2): se la misura sfora più di una volta su cento, il motore si spegne e restano le curve
    if (stats.chiamate > 200 && stats.sfori / stats.chiamate > CFG.sfori) { spegni('tempo'); }
  }
  let perche = 'nessun modello';
  function attivo() { return !!(ME() && ME().innesti && ME().innesti.motore === correggi); }
  function accendi() {
    const M = MOD(), Me = ME(); if (!Me || !Me.innesti) { perche = 'niente Mente'; return false; }
    if (CURVE) { perche = '?curve'; return false; }
    if (!M) { perche = 'nessun modello'; return false; }
    if (M.schema !== schema) { perche = 'schema diverso: ' + M.schema + ' invece di ' + schema; return false; }
    Me.innesti.motore = correggi; perche = 'acceso'; return true;
  }
  function spegni(why) { const Me = ME(); if (Me && Me.innesti && Me.innesti.motore === correggi) Me.innesti.motore = null; perche = 'spento: ' + (why || 'a mano'); }
  accendi();
  Object.assign(UnicoMotore, { CAR, schema, f, caratteristiche, correggi, accendi, spegni, attivo, perche: () => perche });
  return UnicoMotore;
})();
if (typeof window !== 'undefined') window.UnicoMotore = UnicoMotore;
