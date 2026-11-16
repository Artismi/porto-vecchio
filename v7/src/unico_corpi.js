/* [unico] unico_corpi.js: LA REGIA DEI CORPI (dietro ?commedia). Spento il flag: UnicoCorpi = { ON: false }.
   Il direttore artistico: «sotto il cofano funziona tutto, ma a vederlo non si capisce: la gente è ammucchiata, tre fanno la stessa
   animazione vicini, si guardano intorno girandosi i pollici». Qui non si decide DOVE la gente va (quello è della mente, di popolo.js, di
   vita1): si decide come sta al suo posto. Come si dispone, dove guarda, che cosa ha in mano, come si muove mentre aspetta, chi parla e
   chi ascolta. Tre strati:
   1. IL PRESIDIO (dati, anche in Node): la composizione dei posti. Per ogni presidio finito, quando cambia chi c'è, si rifà la PIANTA
      DEI POSTI: chi siede sulle sedie (e chi gioca a carte al tavolo, rivolto al tavolo), chi cucina dietro il fusto (rivolto alla strada)
      e il suo pubblico a semicerchio, chi dipinge in ginocchio sull'asfalto vicino ai segni, i ragazzi che si passano la palla a 3 m
      lungo il marciapiede, e chi chiacchiera in F-FORMAZIONI di 2-4 (in cerchio, rivolti al centro, 0,8 m d'aria fra uno e l'altro)
      ai capi del presidio, fuori dalla carreggiata (in mezzo solo se la strada è chiusa). Nei crocchi le altezze cambiano: uno seduto per
      terra, uno accovacciato, gli altri in piedi. I posti vanno nella cache dei posti del presidio (st.__upr.posti, con la sua chiave):
      la mente e la posa del presidio li leggono da lì, niente di nuovo da salvare.
   2. LE POSE (nel disegno, con gli agganci di animazioni.js: Anim.def, Anim.npcPost): pose nuove (accovacciato, mescola la pentola,
      porge il piatto, dipinge per terra, si passano la palla, ride, impaziente, mani sui fianchi, rammenda la rete, suona la chitarra)
      e le cose in mano (mestolo, piatto, tazzina, pennello, rete, chitarra), agganciate alla mano come quelle di anim_vita.js.
   3. LA GENTE DI TUTTA LA CITTÀ (vicino al giocatore): i crocchi (popolo.js: pop.spot) e i posti (n.__posto: dehors, fermata, fila,
      calata, portone...) diventano F-formazioni (ci si gira verso il centro, chi è troppo vicino si scosta appena: solo il corpo, mai
      la posizione), a turno uno parla e gesticola, gli altri lo guardano e annuiscono, ogni tanto ridono tutti; in fila e alla fermata
      l'attesa ha il carattere di ognuno (il nervoso batte il piede e guarda l'orologio, l'anziano tiene le mani dietro, l'elegante legge
      il giornale, il pigro si appoggia); al bar la tazzina, al dehors il caffè; alla calata i pescatori rammendano la rete; al carico, al
      retrobottega e alla calata i facchini PORTANO le casse davvero: un giro breve fra due pile (si china, prende, porta, posa, torna a
      mani vuote), sfasati, su un percorso scelto una volta per posto fra le caselle dove si cammina (lavoroInMoto, le pile in una sola
      InstancedMesh). Il «si guarda intorno con le mani in tasca» resta solo a chi aspetta davvero un appuntamento.
   LA PIANTA DEL PRESIDIO la sera: i crocchi sparsi su tutto il tratto e sui due marciapiedi, a 2,1 m l'uno dall'altro, lontani dai pali
   e dal fusto, il cerchio col centro vuoto, al più 5 persone in 2 m; chi arriva dopo sta più in là.
   IL TEMPERAMENTO di ognuno (energico, stanco, nervoso, pigro, elegante, anziano, calmo) dai tratti (n.tr), dall'età, dai bisogni.
   Le fasi di tutti sono sfasate (un numero fisso per persona), nessuno fa la stessa cosa del vicino nello stesso momento.
   IL COSTO: tutto solo entro 35 m dal giocatore e al più 40 persone per fotogramma; i gruppi si ricalcolano ogni mezzo secondo; i posti
   del presidio solo quando cambia chi c'è. Lontano, niente. */
var UnicoCorpi = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const ON = /[?&]commedia\b/.test(Q) && !/[?&]corpi=0\b/.test(Q);   // &corpi=0: spento (le foto «prima»)
  const UCo = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UCo;
  if (!ON) return UCo;
  const G = typeof Game !== 'undefined' ? Game : null;
  const Un = () => (typeof Unico !== 'undefined' && Unico.ON ? Unico : null);
  const UPr = typeof UnicoPresidio !== 'undefined' && UnicoPresidio.ON ? UnicoPresidio : null;
  const UC = typeof UnicoCostruire !== 'undefined' && UnicoCostruire.ON ? UnicoCostruire : null;
  const UP = typeof UnicoParti !== 'undefined' && UnicoParti.ON ? UnicoParti : null;
  if (!G || !Un()) { UCo.ON = false; return UCo; }
  const PI = Math.PI, hyp = Math.hypot, cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const hashS = s => { let h = 0x811c9dc5; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0) / 4294967296; };
  const angD = (a, b) => { let d = (a - b) % (2 * PI); if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; return d; };
  const r2 = x => Math.round(x * 100) / 100;
  const CFG = UCo.CFG = { raggio: 35, maxFot: 40, spazio: .78, gruppoOgni: .5, gapGruppi: 2.1, marginePalo: 1.6, margineFusto: 1.35, densita: 5 };
  const stats = UCo.stats = { piante: 0, posti: 0, crocchi: 0, messi: 0, gruppi: 0 };

  // ======================= IL TEMPERAMENTO =======================
  // dai tratti (n.tr: cor, loq, avid, legge), dall'età, dai bisogni, dal seme della persona; si rifà di rado
  function tempra(st, n) {
    const c = n.__tempra; if (c && (st.clock || 0) - c.t < 20) return c.k;
    const P = n.pop || {}, tr = n.tr || P.tr || {}, age = P.age || 35, N = P.need || {}, h = hashS(n.id + '|tempra');
    let k = 'calmo';
    if (age >= 66) k = 'anziano';
    else if ((N.sonno || 0) > .65) k = 'stanco';
    else if ((N.paura || 0) > .4 || (N.rabbia || 0) > .45 || (tr.cor !== undefined && tr.cor < .25)) k = 'nervoso';
    else if (age < 32 && (tr.loq || 0) > .6) k = 'energico';
    else if ((tr.avid !== undefined && tr.avid < .25) || h < .12) k = 'pigro';
    else if ((tr.legge || 0) > .8 || h > .9) k = 'elegante';
    n.__tempra = { k, t: st.clock || 0 }; return k;
  }
  UCo.tempra = tempra;
  // le braccia da fermi (in piedi), per temperamento: la scelta cambia ai tempi di ognuno; mai «aspetta» (si guarda intorno, le mani in tasca)
  const BRACCIA = {
    calmo: ['braccia', null, 'beve', 'dietro', 'fuma', null], energico: [null, 'mani_fianchi', null, 'beve', 'braccia'], nervoso: ['braccia', 'fuma', 'orologio', 'mani_fianchi', 'fuma'],
    stanco: ['tasche', 'braccia', null, 'tasche'], pigro: ['tasche', 'fuma', 'braccia', null], elegante: ['dietro', 'legge', 'beve', 'dietro'], anziano: ['dietro', 'dietro', 'braccia', null],
  };
  function braccia(n, k, salt) { const L = BRACCIA[k] || BRACCIA.calmo, ph = hashS(n.id + 'ph') * 97, slot = Math.floor(((UCo.clock || 0) + ph) / (40 + hashS(n.id) * 30)); return L[Math.floor(hashS(n.id + ':' + slot + (salt || '')) * L.length)]; }

  // ======================= 1. IL PRESIDIO: la pianta dei posti =======================
  const PIANTE = UCo.PIANTE = {};   // C.id → la pianta (di passaggio: si rifà dai dati)
  function regia(st, C) {
    if (!UPr || !UC || !UP || !C || !C.vive || C.fine === null || C.chiuso) return null;
    const u = st.__upr; if (!u) return null;
    const ids = Object.keys(C.vive).sort(), key = C.id + '|' + ids.map(id => id + ':' + C.vive[id][0] + ':' + C.vive[id][4]).join(',') + '|' + C.pezzi.length + '|' + C.piano.length + '|' + (C.meta && C.meta.chiusa && C.meta.chiusa.fatta ? 1 : 0);
    const old = PIANTE[C.id]; if (old && old.key === key && old.st === st) { for (const id in old.ruoli) { const R = old.ruoli[id], e = C.vive[id]; if (R.x !== undefined && e && (!u.posti[id] || u.posti[id] !== R.q)) u.posti[id] = R.q; } return old; }
    stats.piante++;
    const F = (C.meta && C.meta.F0) || C.F, xi = C.varco ? Math.abs(C.varco[1]) : 1.7, W2 = C.meta && C.meta.w ? C.meta.w / 2 : xi + 1.4, chiusa = !!(C.meta && C.meta.chiusa && C.meta.chiusa.fatta);
    const messi = new Set(C.pezzi.map(p => p[0])), pezzo = k => { for (const [i] of C.pezzi) if (C.piano[i] && C.piano[i][0] === k) return C.piano[i]; return null; };
    const tav = pezzo('tavolo'), A = tav ? Math.sign(tav[1]) || 1 : 1, Z = -A, fusto = pezzo('fusto') || pezzo('cassa');
    const presi = [], ruoli = {}, gruppi = {}, P = { key, st, ruoli, gruppi, C: C.id, A, xi, W2 };
    // fra due dello stesso crocchio CFG.spazio, fra crocchi (o ruoli) diversi 1,3 m: i gruppi si leggono separati
    const libero = (lx, ly, m, gid) => { if (!chiusa && Math.abs(lx) < xi - .05) return false; if (Math.abs(lx) > W2 + 2.6) return false; for (const q of presi) if (hyp(q[0] - lx, q[1] - ly) < (gid && q[2] === gid ? (m || CFG.spazio) : Math.max(m || 0, gid && gid[0] === 'c' ? CFG.gapGruppi : 1.3))) return false; const w = UC.mondo(C, lx, ly); return UC.puntoLibero(st, C, w.x, w.y); };
    // i pali (i tubi), il fusto e la cassa della cucina, il tavolo: chi chiacchiera ci sta lontano (il palo non è un posto dove ammucchiarsi)
    const ingombri = C.pezzi.map(([i]) => C.piano[i]).filter(p => p && (p[0] === 'tubo' || p[0] === 'fusto' || p[0] === 'cassa' || p[0] === 'tavolo')).map(p => [p[1], p[2], p[0] === 'tubo' ? CFG.marginePalo : p[0] === 'tavolo' ? .9 : CFG.margineFusto]);
    const lontano = (lx, ly) => ingombri.every(q => hyp(q[0] - lx, q[1] - ly) >= q[2]);
    // quanti in 2 m attorno (i già messi, più gli m del crocchio che si sta mettendo): al più CFG.densita
    const rado = (lx, ly, m) => { let k = 0; for (const q of presi) if (hyp(q[0] - lx, q[1] - ly) < 2) k++; return k + (m || 1) <= CFG.densita; };
    const metti = (id, lx, ly, faceL, ruolo, o) => { const w = UC.mondo(C, lx, ly); presi.push([lx, ly, (o && o.g) || id]); ruoli[id] = Object.assign({ ruolo, lx, ly, x: r2(w.x), y: r2(w.y), face: C.a + faceL }, o || {}); return ruoli[id]; };
    // la direzione locale → l'angolo nel mondo: (lx, ly) locale è x di traverso, y lungo la via (UP.aMondo); l'angolo locale atan2(dy, dx)
    const verso = (dx, dy) => Math.atan2(dy, dx);
    const per = a => ids.filter(id => C.vive[id][0] === a);
    // le sedie e il tavolo: chi siede guarda dove guarda la sedia; chi gioca a carte guarda il tavolo
    for (const id of per('siede').concat(per('carte'))) {
      const e = C.vive[id], p = e[4] !== null && e[4] !== undefined ? C.piano[e[4]] : null; if (!p || !messi.has(e[4])) continue;
      let f = p[4] + PI / 2; if (e[0] === 'carte' && tav) f = verso(tav[1] - p[1], tav[2] - p[2]);
      metti(id, p[1], p[2], f, e[0] === 'carte' ? 'carte' : 'sedia', { v: Math.floor(hashS(id + 'sv') * 5) });
    }
    // chi cucina: dietro il fusto (dal lato del muro), rivolto alla strada; se lì non c'è posto, di fianco, rivolto al fusto
    let cuoco = null;
    for (const id of per('cucina')) {
      if (!fusto || cuoco) { metti(id, ...(() => { for (const d of [1.2, 1.9, 2.6]) for (const s of [1, -1]) { const lx = Z * (xi + .6), ly = (s > 0 ? F[3] : F[1]) + s * d; if (libero(lx, ly)) return [lx, ly]; } return [Z * (xi + .6), F[3] + 1.2]; })(), Z > 0 ? PI : 0, 'pubblico', { v: 1 }); continue; }
      const sx = Math.sign(fusto[1]) || Z, L = [[fusto[1] + sx * .62, fusto[2], verso(-sx, 0)], [fusto[1], fusto[2] + .66, verso(0, -1)], [fusto[1], fusto[2] - .66, verso(0, 1)], [fusto[1] - sx * .66, fusto[2], verso(sx, 0)]];
      const q = L.find(q => { const w = UC.mondo(C, q[0], q[1]); return UC.puntoLibero(st, C, w.x, w.y) || hyp(q[0] - fusto[1], q[1] - fusto[2]) < .7; }) || L[1];
      cuoco = metti(id, q[0], q[1], q[2], 'cuoco', { fx: fusto[1], fy: fusto[2], g: 'cucina', alto: UP.dimDi(fusto)[2] }); cuoco.id = id; (gruppi.cucina = gruppi.cucina || []).push(id);
    }
    // chi dipinge: in ginocchio accanto al segno più vicino al bordo, rivolto al segno
    for (const id of per('dipinge')) {
      const n = (C.stato && C.stato.dipinto) || 0, xi2 = xi - .3; let best = null;
      for (let i = 0; i < Math.max(1, n); i++) { const h = UP.hashS(C.id + '|dip|' + i), mx = (h * 2 - 1) * xi2, my = (UP.hashS(C.id + i) * 2 - 1) * 3.2; if (!best || Math.abs(mx) > Math.abs(best[0])) best = [mx, my]; }
      const s = Math.sign(best[0]) || A, lx = chiusa ? best[0] + s * .45 : s * Math.max(xi + .12, Math.abs(best[0]) + .45);
      let ly = best[1]; for (const d of [0, .5, -.5, 1, -1, 1.6, -1.6]) if (libero(lx, best[1] + d)) { ly = best[1] + d; break; }
      metti(id, lx, ly, verso(best[0] - lx, best[1] - ly), 'pittore', { mx: best[0], my: best[1] });
    }
    // i ragazzi: la palla lungo il marciapiede, a 3 m l'uno dall'altro, rivolti l'uno all'altro (in tre: un triangolo largo)
    const gio = per('gioca'), soloG = gio.length === 1 ? gio.splice(0, 1) : [];
    if (gio.length) {
      const side = hashS(C.id + 'gioca') < .5 ? A : Z, capo = hashS(C.id + 'capo') < .5 ? 1 : -1, x0 = side * cl(xi + .55, xi + .3, W2 + .4);
      const y0 = (capo > 0 ? F[3] : F[1]) + capo * 1.4, L = gio.length === 1 ? [[x0, y0]] : gio.length === 2 ? [[x0, y0], [x0, y0 + capo * 3]] : [[x0, y0], [x0, y0 + capo * 3.2], [x0 + side * 1.4, y0 + capo * 1.6]];
      gio.forEach((id, i) => { const q = L[i % L.length]; let lx = q[0], ly = q[1]; if (!libero(lx, ly, 0, 'gioca')) for (const d of [.4, -.4, .8, -.8]) if (libero(lx + side * d, ly, 0, 'gioca')) { lx += side * d; break; }
        const o = L[(i + 1) % L.length]; metti(id, lx, ly, gio.length > 1 ? verso(o[0] - lx, o[1] - ly) : verso(-side, 0), 'gioca', { g: 'gioca', i }); (gruppi.gioca = gruppi.gioca || []).push(id); });
    }
    // chi chiacchiera: prima il pubblico della cucina (in semicerchio davanti al cuoco), poi i crocchi
    let ch = per('chiacchiera').concat(soloG, per('siede').filter(id => !ruoli[id]), per('carte').filter(id => !ruoli[id]), per('cucina').filter(id => !ruoli[id]));
    if (cuoco && ch.length) {
      const fx = cuoco.fx, fy = cuoco.fy, dx0 = fx - cuoco.lx, dy0 = fy - cuoco.ly, a0 = Math.atan2(dy0, dx0);
      let k = 0; for (const da of [-.55, .55, -1.1, 1.1, 0]) { if (k >= 2 || !ch.length) break; const a = a0 + da, lx = fx + Math.cos(a) * 1.25, ly = fy + Math.sin(a) * 1.25; if (!libero(lx, ly, 0, 'cucina') || !ingombri.every(q => q[2] !== CFG.marginePalo || hyp(q[0] - lx, q[1] - ly) >= CFG.marginePalo)) continue;   // il pubblico della pentola: mai addosso al palo
        const id = ch.shift(); metti(id, lx, ly, verso(cuoco.lx - lx, cuoco.ly - ly), 'pubblico', { v: Math.floor(hashS(id + 'pv') * 3), g: 'cucina', guarda: cuoco.id }); gruppi.cucina.push(id); k++; }
    }
    // i crocchi: le misure (2-4), i centri sparsi su tutto il tratto (ai due capi, sui due marciapiedi, anche di fianco alle cose sul
    // marciapiede), lontani dai pali e dal fusto, con almeno CFG.gapGruppi fra un crocchio e l'altro e il centro del cerchio vuoto; chi
    // arriva prima sta vicino allo striscione, chi arriva dopo più in là (la pianta cresce verso fuori). Mai più di CFG.densita persone
    // in 2 m attorno a un posto: niente mucchi.
    const misure = n => n <= 0 ? [] : n === 1 ? [1] : n === 2 ? [2] : n === 3 ? [3] : n === 4 ? (hashS(C.id + 'q4') < .5 ? [4] : [2, 2]) : n === 5 ? [3, 2] : n === 6 ? [3, 3] : n === 7 ? [4, 3] : [3].concat(misure(n - 3));
    ch.sort((a, b) => (C.vive[a][1] - C.vive[b][1]) || (a < b ? -1 : 1));   // in ordine d'arrivo
    const quad = {}, qk = (lx, ly) => (lx > 0 ? 'd' : 's') + (ly > (F[1] + F[3]) / 2 ? 'a' : 'b');
    for (const q of presi) quad[qk(q[0], q[1])] = (quad[qk(q[0], q[1])] || 0) + 1;
    const anchors = [];
    for (const s of [A, Z]) for (const c of [1, -1]) for (const d of [1.5, 3.2, 4.9, 6.6]) { const cy = (c > 0 ? F[3] : F[1]) + c * d; anchors.push([s, cy, 0, d], [s, cy, 1, d + .7]); }
    for (const s of [A, Z]) for (const cy of [F[1] + .9, (F[1] + F[3]) / 2, F[3] - .9]) anchors.push([s, cy, 1, 2.8]);   // di fianco al presidio, sul marciapiede
    let gi = 0;
    for (const m of misure(ch.length)) {
      const membri = ch.splice(0, m), r = m === 1 ? 0 : m === 2 ? .62 : m === 3 ? .8 : .92, gid = 'c' + (gi++);
      // i centri in ordine: vicini prima, il quarto (lato e capo) meno pieno prima: i crocchi si distribuiscono e si leggono separati
      const L = anchors.map(([s, cy, mp, d]) => { const cx = s * (chiusa && !mp ? xi * .5 : mp ? W2 + .45 + r : Math.max(xi + r + .12, Math.min(W2 - .1, xi + r + .3))); return [cx, cy, d + 1.6 * (quad[qk(cx, cy)] || 0) + hashS(gid + cx + cy) * .3]; }).sort((a, b) => a[2] - b[2]);
      let fatto = false;
      for (const [cx, cy] of L) {
        for (const rot of [0, .6, -.6, 1.2, PI / 2]) {
          const pts = membri.map((id, i) => { const a = rot + (m === 2 ? i * PI : i * 2 * PI / m) + (m === 2 ? PI / 2 : 0); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
          if (!pts.every(q => libero(q[0], q[1], 0, gid) && lontano(q[0], q[1]) && rado(q[0], q[1], m))) continue;
          membri.forEach((id, i) => {
            const q = pts[i], h = hashS(id + gid), posa = m >= 3 && i === 0 && h < .4 ? 'terra' : m >= 3 && i === 1 && h < .3 ? 'accovacciato' : m === 2 && i === 0 && h < .25 ? 'accovacciato' : null;
            const fuoco = m === 1 ? (cuoco ? [cuoco.lx, cuoco.ly] : tav ? [tav[1], tav[2]] : [0, 0]) : null;
            metti(id, q[0], q[1], m === 1 ? verso(fuoco[0] - q[0], fuoco[1] - q[1]) : verso(cx - q[0], cy - q[1]), 'cerchio', { g: gid, posa, v: Math.floor(hashS(id + 'v') * 6), cx, cy, solo: m === 1 });
          });
          quad[qk(cx, cy)] = (quad[qk(cx, cy)] || 0) + m; gruppi[gid] = membri.slice(); fatto = true; break;
        }
        if (fatto) break;
      }
      if (!fatto) membri.forEach(id => { ruoli[id] = null; });
    }
    // chi siede vicino a un crocchio lo ascolta (e parla a turno)
    for (const id in ruoli) { const R = ruoli[id]; if (!R || R.ruolo !== 'sedia') continue; let best = null, bd = 2.6; for (const g in gruppi) { if (g === 'gioca') continue; const L = gruppi[g].map(k => ruoli[k]).filter(Boolean), cx = L.reduce((a, q) => a + q.lx, 0) / L.length, cy = L.reduce((a, q) => a + q.ly, 0) / L.length, d = hyp(cx - R.lx, cy - R.ly); if (d < bd) { bd = d; best = g; } } if (best) { R.g = best; gruppi[best].push(id); } }
    // nella cache dei posti del presidio, con la sua chiave (la mente e la posa del presidio leggono da lì)
    for (const id in ruoli) { const R = ruoli[id], e = C.vive[id]; if (!R || !e) { delete ruoli[id]; continue; } R.q = { x: R.x, y: R.y, face: R.face, k: C.id + e[0] + e[4], regia: true }; u.posti[id] = R.q; stats.posti++; }
    PIANTE[C.id] = P; return P;
  }
  UCo.regia = regia;
  const presidiVivi = st => ((st.u && st.u.costruire && st.u.costruire.cantieri) || []).filter(C => C.tipo === 'presidio' && !C.chiuso && C.fine !== null && C.vive);
  if (UPr && UC && UP) {
    // prima che la mente chieda il posto: la pianta aggiornata
    if (UC.vita && UC.vita.metodo) { const m0 = UC.vita.metodo; UC.vita.metodo = c => { try { const C = UPr.presidioDi(c.st, c.n.id); if (C) regia(c.st, C); } catch (e) { } return m0(c); }; }
    if (UPr.postoC) { const p0 = UPr.postoC; UPr.postoC = (st, C, id) => { try { regia(st, C); } catch (e) { } return p0(st, C, id); }; }
    Un().fase('unico.corpi', { dopo: 'unico.presidio', budget: { p95: .02 } }, st => { if (Un().passi % 60 !== 9) return; for (const C of presidiVivi(st)) regia(st, C); });
  }

  // ======================= 2. LE POSE E LE COSE IN MANO (solo nel disegno) =======================
  const AN = typeof Anim !== 'undefined' && Anim.def && Anim.npcPost && Anim.POSES && typeof THREE !== 'undefined' ? Anim : null;
  if (!AN || typeof window === 'undefined') { Un().Corpi = UCo; return UCo; }
  const T3 = THREE, POSES = AN.POSES;
  const SIDE = { L: { s: 1, ua: 'UpperArmL', la: 'LowerArmL' }, R: { s: -1, ua: 'UpperArmR', la: 'LowerArmR' } };
  const arm = (P, sd, ux, uy, uz, lx, ly, lz) => { const S = SIDE[sd]; P.aim(S.ua, [ux * S.s, uy, uz]); P.aim(S.la, [lx * S.s, ly, lz]); };
  const leg = (P, sd, fx, fy, fz, kx, ky, kz, pitch, yaw) => { const s = sd === 'L' ? 1 : -1; P.legTo(sd, fx * s, fy, fz, kx * s, ky, kz, pitch || 0, yaw || 0); };
  const mano = (P, sd, x, y, z, px, py, pz) => { const s = sd === 'L' ? 1 : -1; P.reach(sd, x * s, y, z, [px * s, py, pz]); };
  const ciclo = (P, T) => ((P.t + P.r * T * 7.13) / T) % 1;
  const sm = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k);
  const impulso = (k, a, b, c, d) => k < a ? 0 : k < b ? sm((k - a) / (b - a)) : k < c ? 1 : k < d ? 1 - sm((k - c) / (d - c)) : 0;
  const FULL = { base: 'Idle_Neutral', fade: .4 };
  const def = (nome, spec, fn) => AN.def(nome, Object.assign({}, spec, { fn }));
  // ---- le cose in mano: nel sistema della mano (Y lungo le dita, Z fuori dal palmo), come anim_vita.js; si spengono da sole (R.vp) ----
  const GY = .1, GZ = .02, QH = new T3.Quaternion().setFromAxisAngle(new T3.Vector3(0, 1, 0), PI), _v = new T3.Vector3(), _w = new T3.Vector3();
  const LM = {}, lm = c => LM[c] || (LM[c] = new T3.MeshLambertMaterial({ color: c })), GG = {};
  const cil = (g, rt, rb, h, c, x, y, z, rx, ry, rz, s) => { const k = [rt, rb, h, s].join(); const m = new T3.Mesh(GG[k] || (GG[k] = new T3.CylinderGeometry(rt, rb, h, s || 8)), lm(c)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; };
  const sc = (g, w, h, d, c, x, y, z, rx, ry, rz) => { const k = 'b' + [w, h, d].join(); const m = new T3.Mesh(GG[k] || (GG[k] = new T3.BoxGeometry(w, h, d)), lm(c)); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); g.add(m); return m; };
  let RETE = null;
  const reteMat = () => { if (RETE) return RETE; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.strokeStyle = '#2A8A8A'; x.lineWidth = 3; for (let i = 0; i <= 64; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 64); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(64, i); x.stroke(); } const t = new T3.CanvasTexture(c); t.wrapS = t.wrapT = T3.RepeatWrapping; t.repeat.set(3, 2); return (RETE = new T3.MeshLambertMaterial({ map: t, transparent: true, alphaTest: .4, side: T3.DoubleSide })); };
  const COSE = {
    mestolo: { dove: 'R', dita: [.92, .85], make: () => { const g = new T3.Group(); cil(g, .01, .01, .42, '#7C7186', .12, GY, GZ, 0, 0, PI / 2, 6); const b = cil(g, .05, .035, .04, '#A89C92', .33, GY - .03, GZ + .02, 0, 0, 0, 8); b.scale.y = 1; return g; } },
    piatto: { dove: 'R', dita: [.4, .3], make: () => { const g = new T3.Group(); cil(g, .11, .085, .02, '#F2E7CF', 0, GY + .02, GZ + .05, PI / 2, 0, 0, 14); cil(g, .07, .07, .03, '#C25B36', 0, GY + .02, GZ + .065, PI / 2, 0, 0, 10); return g; } },
    tazzina: { dove: 'R', dita: [.7, .7], make: () => { const g = new T3.Group(); cil(g, .03, .024, .05, '#F2E7CF', .01, GY, GZ + .02, 0, 0, PI / 2, 10); cil(g, .026, .026, .052, '#3D3548', .012, GY, GZ + .02, 0, 0, PI / 2, 10); return g; } },
    pennello: { dove: 'R', dita: [.85, .8], make: () => { const g = new T3.Group(); cil(g, .01, .01, .25, '#b08a52', .08, GY, GZ, 0, 0, PI / 2, 5); sc(g, .06, .05, .02, '#E04B8C', .22, GY, GZ); return g; } },
    rete: { dove: 'body', make: () => { const g = new T3.Group(), m = new T3.Mesh(new T3.PlaneGeometry(1.1, .7, 1, 1), reteMat()); m.rotation.x = -PI / 2 + .18; m.position.set(0, .9, .6); g.add(m); sc(g, .05, .05, .05, '#F04A23'.replace('F04A23', 'DC9A34'), .45, .92, .82); sc(g, .05, .05, .05, '#DC9A34', -.4, .9, .88); return g; } },
    chitarra: { dove: 'body', make: () => { const g = new T3.Group(), c = new T3.Group(); const b = cil(c, .19, .19, .09, '#a8632e', 0, 0, 0, PI / 2, 0, 0, 14); b.scale.set(1, 1, 1); cil(c, .15, .15, .092, '#8a4a22', -.15, 0, 0, PI / 2, 0, 0, 12); cil(c, .05, .05, .095, '#16121B', -.02, 0, 0, PI / 2, 0, 0, 10); sc(c, .5, .05, .03, '#5a3a24', .38, 0, 0); sc(c, .1, .06, .03, '#3a2418', .66, 0, 0);
      c.position.set(-.02, 1.02, .34); c.rotation.set(0, 0, .45); g.add(c); return g; } },
  };
  function tieni(P, nome) {
    if (P.w < .5) return; const D = COSE[nome]; if (!D) return; const m = P.R.vp || (P.R.vp = {}), k = 'uc_' + nome;
    let h = m[k]; if (h === undefined) h = m[k] = attacca(P, D);
    if (h) h.visible = true; if (D.dita) P.fingers(D.dove, D.dita[0], D.dita[1]);
  }
  function attacca(P, D) {
    const g = P.g, u = g.userData, holder = new T3.Group(), o = D.make(); holder.add(o);
    if (D.dove === 'R' || D.dove === 'L') { const b = P.R.b['Wrist' + D.dove]; if (!b) return null; b.getWorldScale(_v); g.getWorldScale(_w); holder.scale.setScalar(_w.x / (_v.x || 1)); holder.quaternion.copy(QH); b.add(holder); }
    else if (D.dove === 'body' && u.body) { const s = u.body.scale; holder.scale.set(1 / s.x, 1 / s.y, 1 / s.z); u.body.add(holder); } else g.add(holder);
    holder.traverse(x => { if (x.isMesh) { x.castShadow = false; x.frustumCulled = false; } }); holder.visible = false; return holder;
  }
  // ---- le pose nuove ----
  // accovacciato: i talloni a terra, le ginocchia su, gli avambracci sulle ginocchia (si chiacchiera così sui marciapiedi del sud)
  def('accovacciato', FULL, P => {
    const D = .5; P.body({ y: -D });
    leg(P, 'L', .17, D + .03, .2, .15, .45, 1, .1, .15); leg(P, 'R', .17, D + .03, .16, .15, .45, 1, .1, .2);
    P.rot('Abdomen', .42, 0, 0); P.rot('Chest', .12, 0, 0); P.rot('Head', -.3, .2 * Math.sin(P.t * .3 + P.r * 7), 0);
    arm(P, 'L', .12, -.45, .85, .08, -.25, 1); arm(P, 'R', .12, -.45, .85, .08, -.15 + .1 * Math.sin(P.t * .7 + P.r * 3), 1);
  });
  // mescola la pentola sul fusto: la destra gira il mestolo, la sinistra tiene il manico della pentola
  def('mescola', FULL, (P, A) => {
    const a = P.t * 2.2 + P.r * 6, y0 = (A && A.alto ? A.alto : .9) + .18, giu = cl((1.08 - y0) * 1.6, 0, .5); P.rot('Abdomen', .16 + giu, 0, 0); P.rot('Head', .32, .08 * Math.sin(P.t * .5), 0);
    mano(P, 'R', .02 + .07 * Math.cos(a), y0 + .02 * Math.sin(a * 2), .44 + giu * .3 + .06 * Math.sin(a), 1, -.6, -.4); mano(P, 'L', .24, y0 - .04, .38 + giu * .3, 1, -.6, -.4); P.fingers('L', .7, .6);
    tieni(P, 'mestolo');
  });
  // porge il piatto: si gira appena verso chi lo prende, il braccio avanti col piatto
  def('servi', FULL, (P, A) => {
    const k = A && A.servi != null ? A.servi : ciclo(P, 2.2), d = impulso(k, 0, .3, .7, 1);
    P.rot('Abdomen', .1 + .15 * d, 0, 0); P.rot('Head', .15, 0, 0);
    mano(P, 'R', .12, 1.05 + .08 * d, .28 + .3 * d, .9, -.4, 0); mano(P, 'L', .2, 1.0, .3, 1, -.6, -.3); tieni(P, 'piatto');
  });
  // dipinge per terra: in ginocchio (la posa «fruga»), la destra col pennello che passa sull'asfalto
  def('dipinge_terra', FULL, P => {
    if (POSES.fruga) POSES.fruga.fn(P, {});
    const a = P.t * 1.6 + P.r * 5; mano(P, 'R', .02 + .16 * Math.sin(a), .52 + .03 * Math.abs(Math.cos(a * 2)), .62 + .08 * Math.cos(a * .7), 1, -.3, -.2);
    mano(P, 'L', .18, .78, .42, 1, -.5, 0); P.rot('Head', .25, 0, 0); tieni(P, 'pennello');
  });
  // la palla: A.palla = { k: 0-1 del passaggio, lancia: true chi tira, false chi riceve }; due mani avanti, il tiro dal basso
  def('palla', FULL, (P, A) => {
    const B = A && A.palla, k = B ? B.k : ciclo(P, 2.6), tira = B ? B.lancia : k < .5;
    if (tira) { const c = impulso(k, 0, .15, .2, .35), su = impulso(k, .15, .22, .3, .5); mano(P, 'R', .12, 1.0 - .2 * c + .35 * su, .3 + .25 * su, .9, -.5, 0); mano(P, 'L', .12, 1.0 - .2 * c + .35 * su, .3 + .25 * su, .9, -.5, 0); P.rot('Abdomen', .12 * c - .05 * su, 0, 0); P.body({ y: -.06 * c }); }
    else { const p = impulso(k, .55, .8, .95, 1); mano(P, 'R', .13, 1.08 + .1 * p, .32 + .12 * p, .9, -.5, 0); mano(P, 'L', .13, 1.08 + .1 * p, .32 + .12 * p, .9, -.5, 0); P.rot('Head', -.12 * p, 0, 0); P.body({ y: -.04 * (1 - p) }); }
    P.fingers('R', .3, .3); P.fingers('L', .3, .3);
  });
  // ride: la testa indietro, le spalle che sobbalzano, una mano sulla pancia
  def('ride', { fade: .2 }, P => { const k = .5 + .5 * Math.sin(P.t * 15); P.rot('Chest', -.1 - .05 * k, 0, 0); P.rot('Head', -.22, 0, .05); P.rot('ShoulderL', 0, 0, .05 * k); P.rot('ShoulderR', 0, 0, -.05 * k); mano(P, 'L', .06, 1.0, .2, 1, -.5, 0); });
  // impaziente: il peso da un piede all'altro, il piede che batte, le mani sui fianchi o le braccia strette
  def('impaziente', FULL, P => {
    const tap = Math.max(0, Math.sin(P.t * 8 + P.r * 9)) * (Math.sin(P.t * .5 + P.r * 4) > -.2 ? 1 : 0);
    P.body({ x: .03 * Math.sin(P.t * .9 + P.r * 3) }); leg(P, 'R', .13, .03 + .04 * tap, .08, .1, .3, 1, .45 * tap);
    if (P.r > .5) { mano(P, 'L', .2, .98, 0, 1, 0, -1); mano(P, 'R', .2, .98, 0, 1, 0, -1); } else if (POSES.braccia) POSES.braccia.fn(P, {});
    P.rot('Head', 0, .5 * Math.sin(P.t * .45 + P.r * 6), 0);
  });
  def('mani_fianchi', { fade: .35 }, P => { mano(P, 'L', .21, .98, .02, 1, 0, -1); mano(P, 'R', .21, .98, .02, 1, 0, -1); P.fingers('L', .5, .3); P.fingers('R', .5, .3); P.rot('Chest', -.05, 0, 0); });
  // rammenda la rete: seduto per terra, la rete sulle gambe, le mani che passano l'ago
  def('rammenda', FULL, P => {
    const D = .74; P.body({ y: -D }); leg(P, 'L', .13, D + .06, .8, 0, 1, 0, .2); leg(P, 'R', .2, D + .1, .72, .2, 1, 0, .1, .3);
    P.rot('Abdomen', .3, 0, 0); P.rot('Head', .35, 0, 0); const a = P.t * 2 + P.r * 5;
    mano(P, 'R', .08 + .06 * Math.sin(a), .98 + .04 * Math.max(0, Math.sin(a * 2)), .5, 1, -.4, 0); mano(P, 'L', .1, .96, .52, 1, -.4, 0); P.fingers('R', .8, .9); P.fingers('L', .6, .7);
    tieni(P, 'rete');
  });
  // suona la chitarra, seduto: la sinistra sul manico, la destra che batte sulle corde
  def('chitarra', FULL, P => {
    if (POSES.siede) POSES.siede.fn(P, {}); const k = Math.max(0, Math.sin(P.t * 9 + P.r * 4));
    mano(P, 'L', .36, 1.18, .34, 1, -.5, 0); mano(P, 'R', .02, 1.02 + .05 * k, .44, 1, -.5, 0); P.fingers('L', .6, .5); P.fingers('R', .4, .5); P.rot('Head', .3, .25, 0);
    tieni(P, 'chitarra');
  });
  // l'aggiustamento della regia: il corpo si scosta (x, z: solo il disegno, mai la posizione) quando qualcuno è troppo vicino
  def('regia', { fade: .6 }, (P, A) => { const r = A && A.regia; if (r) P.body({ x: r.x, z: r.z }); });
  // tazzina in mano (al bar, al dehors): un sorso ogni tanto
  def('tazza', { fade: .3 }, P => { const k = ciclo(P, 7 + P.r * 4), up = impulso(k, 0, .15, .3, .42); arm(P, 'R', .2, -.9 + .5 * up, .3 + .3 * up, -.15 - .3 * up, .4 + .45 * up, .9 - .6 * up); if (up > .5) P.rot('Head', -.2 * up, 0, 0); tieni(P, 'tazzina'); });
  const BUSY = { mescola: 1, servi: 1, dipinge_terra: 1, palla: 1, rammenda: 1, chitarra: 1, carte: 1 };

  // ======================= 3. LA SCENA, PERSONA PER PERSONA (Anim.npcPost) =======================
  let FRAME = 0, QUANTI = 0, FRAME0 = -1;
  (function giro() { FRAME++; requestAnimationFrame(giro); })();
  const pv = () => window.__pv;
  const visto = (st, n) => { const p = st.player; return p && Math.abs(n.x - p.x) < CFG.raggio && Math.abs(n.y - p.y) < CFG.raggio && hyp(n.x - p.x, n.y - p.y) < CFG.raggio; };
  // i gruppi: chi è nello stesso crocchio (popolo.js: pop.spot.ci) o nello stesso posto (n.__posto.id); ricalcolati ogni mezzo secondo
  const GR = { t: -1, di: new Map(), L: [] };
  function gruppi(st) {
    const ck = st.clock || 0; if (ck - GR.t < CFG.gruppoOgni && GR.t <= ck) return GR; GR.t = ck; GR.di.clear(); GR.L = []; const M = new Map();
    for (const n of st.npcs) {
      if (n.dead || n.inside || n.inVeh || !visto(st, n)) continue;
      let k = null; const q = n.__posto; if (q && q.arrived) k = 'p' + q.id; else if (n.pop && n.pop.spot && n.pop.spot.on && Math.abs(n.speedNow || 0) < .2) k = 's' + n.pop.spot.pid + '|' + n.pop.spot.ci;
      if (!k) continue; let a = M.get(k); if (!a) M.set(k, a = []); a.push(n);
    }
    for (const [k, L] of M) { if (L.length < 2) continue; const cx = L.reduce((a, n) => a + n.x, 0) / L.length, cy = L.reduce((a, n) => a + n.y, 0) / L.length; if (L.some(n => hyp(n.x - cx, n.y - cy) > 3)) continue; const g = { k, L, cx, cy, tipo: k[0] === 'p' ? L[0].__posto.p.k : 'crocchio' }; GR.L.push(g); for (const n of L) GR.di.set(n.id, g); stats.gruppi++; }
    return GR;
  }
  // chi parla adesso nel gruppo: chi ha un fumetto; se no, a turno (4-7 s ciascuno), dal seme del gruppo
  function chiParla(g, ck) {
    const b = g.L.find(n => n.bark && n.bark.until > ck); if (b) return b;
    const T = 4.5 + hashS(g.k) * 2.5, slot = Math.floor((ck + hashS(g.k + 'ph') * 50) / T); if (hashS(g.k + slot + 'zitti') < .18) return null;
    return g.L[Math.floor(hashS(g.k + ':' + slot) * g.L.length)];
  }
  const testa = (n, dy) => ({ x: n.x, y: 1.5 + (dy || 0), z: n.y, ground: true });
  // annuisce: lo sguardo che sale e scende piano (ogni tanto)
  const cenno = (n, ck) => { const ph = hashS(n.id + 'nod') * 40, k = ((ck + ph) % 9) / 9; return k < .22 ? -.09 * Math.max(0, Math.sin(k / .22 * PI * 3)) : 0; };
  // ride tutto il gruppo, ogni tanto, alla fine di un turno
  const ridono = (g, ck) => { const T = 4.5 + hashS(g.k) * 2.5, x = (ck + hashS(g.k + 'ph') * 50) / T, f = x - Math.floor(x); return f > .82 && hashS(g.k + Math.floor(x) + 'ride') < .3; };
  // la conversazione: chi parla gesticola e guarda uno dopo l'altro; gli altri lo guardano e annuiscono; a volte ridono
  function conversa(st, n, s, g, k) {
    const ck = st.clock || 0, sp = chiParla(g, ck), busy = s.act && BUSY[s.act];
    if (ridono(g, ck) && hashS(n.id + Math.floor(ck / 6)) < .75) { if (!busy && !s.upper) s.upper = 'ride'; s.lookAt = sp && sp !== n ? testa(sp) : null; return; }
    if (sp === n) {
      s.talk = true; const altri = g.L.filter(m => m !== n), a = altri[Math.floor((ck + hashS(n.id) * 9) / 2.2) % Math.max(1, altri.length)]; if (a) s.lookAt = testa(a);
      if (!busy && (k === 'energico' || k === 'nervoso') && Math.sin(ck * .7 + hashS(n.id) * 9) > .3) s.upper = 'discute'; else if (!busy && s.upper && !/^(beve|fuma|tazza|legge)$/.test(s.upper)) s.upper = null;
    } else if (sp) s.lookAt = testa(sp, cenno(n, ck));
    else { const a = g.L.find(m => m !== n); if (a) s.lookAt = testa(a); }
  }
  // lo scostarsi: chi ha un vicino a meno di CFG.spazio si sposta col corpo dalla parte opposta (al più 25 cm)
  function scosta(st, n, s, g) {
    let dx = 0, dy = 0; for (const m of g.L) { if (m === n) continue; const ex = n.x - m.x, ey = n.y - m.y, d = hyp(ex, ey); if (d > 1e-3 && d < CFG.spazio) { const k = (CFG.spazio - d) / 2 / d; dx += ex * k; dy += ey * k; } }
    const L = hyp(dx, dy); if (L < .02) return; if (L > .25) { dx *= .25 / L; dy *= .25 / L; }
    const f = n.face || 0; s.regia = { x: dx * Math.sin(f) - dy * Math.cos(f), z: dx * Math.cos(f) + dy * Math.sin(f) }; s.mood.push('regia');
  }
  // girarsi piano verso un punto (solo chi sta fermo)
  const gira = (n, x, y, v) => { const a = Math.atan2(y - n.y, x - n.x), d = angD(a, n.face || 0); n.face = (n.face || 0) + cl(d, -(v || .05), v || .05); };

  // ---- il presidio ----
  function scenaPresidio(st, n, s) {
    if (!UPr || !st.__upr) return false; const C = st.__upr.chi && st.__upr.chi.get(n.id); if (!C || C.chiuso || !C.vive || !C.vive[n.id]) return false;
    const P = PIANTE[C.id]; if (!P || P.st !== st) { regia(st, C); return false; }
    const R = P.ruoli[n.id]; if (!R || hyp(n.x - R.x, n.y - R.y) > .9 || Math.abs(n.speedNow || 0) > .3) return false;
    n.x = R.x; n.y = R.y; n.face = R.face; const ck = st.clock || 0, k = tempra(st, n), e = C.vive[n.id], ph = hashS(n.id + 'ph') * 60;
    const ora = performance.now() / 1000, arrivo = n.__arrivo && n.__arrivo.c === C.id ? n.__arrivo : (n.__arrivo = { c: C.id, t: ora }), appena = st.t - e[1] < 8 && ora - arrivo.t < 2.6, parte = e[2] - st.t < 4;
    s.act = null; s.upper = null; s.talk = false; s.lookAt = null;
    const gr = R.g && P.gruppi[R.g], g = gr && gr.length > 1 ? { k: C.id + R.g, L: gr.map(id => G.byId ? G.byId(st, id) : null).filter(m => m && !m.inside && hyp(m.x - (P.ruoli[m.id] || {}).x, m.y - (P.ruoli[m.id] || {}).y) < 1) } : null;
    switch (R.ruolo) {
      case 'sedia': s.act = R.v === 4 && hashS(n.id + 'chit') < .5 ? 'chitarra' : 'siede'; s.sedile = true; if (s.act === 'siede') s.upper = ['beve', 'fuma', 'legge', null, 'tazza'][R.v] || null; break;
      case 'carte': s.act = 'carte'; s.sedile = true; { const T = P.ruoli[n.id]; s.lookAt = { x: T.x + Math.cos(T.face) * .6, y: .8, z: T.y + Math.sin(T.face) * .6, ground: true }; } if (((ck + ph) % 23) < 1.6) { s.talk = true; } break;
      case 'cuoco': { const T = 13 + hashS(n.id) * 5, x = ((ck + ph) % T) / T; s.act = 'mescola'; s.alto = R.alto;
        if (x > .8 && gr) { const to = gr.filter(id => id !== n.id)[Math.floor((ck + ph) / T) % Math.max(1, gr.length - 1)], m = to && G.byId(st, to); s.act = 'servi'; s.servi = (x - .8) / .2; if (m) s.lookAt = testa(m); } break; }
      case 'pubblico': s.upper = R.v === 0 ? 'mangia' : R.v === 1 ? 'tazza' : 'beve'; break;
      case 'pittore': s.act = 'dipinge_terra'; break;
      case 'gioca': { const L = (P.gruppi.gioca || []).map(id => G.byId(st, id)).filter(Boolean), i = L.indexOf(n); if (L.length < 2) { s.act = 'palla'; break; }
        const T = 2.4, x = (ck + hashS(C.id) * 9) / T, j = Math.floor(x) % L.length; s.act = 'palla'; s.palla = { k: x - Math.floor(x), lancia: j === i }; const o = L[j === i ? (i + 1) % L.length : j]; if (o) s.lookAt = { x: BALL.x || o.x, y: BALL.y || 1.2, z: BALL.z || o.y, ground: !BALL.x }; break; }
      case 'cerchio': s.act = R.posa === 'terra' ? 'siede_terra' : R.posa === 'accovacciato' ? 'accovacciato' : null; s.upper = R.solo ? (hashS(n.id + 'solo') < .5 ? 'legge' : 'tazza') : braccia(n, k, R.v); break;
    }
    if (g && g.L.length > 1 && R.ruolo !== 'gioca') conversa(st, n, s, g, k);
    if (R.ruolo === 'cerchio' && !g) s.lookAt = { x: R.x + Math.cos(R.face) * 6, y: 1.2, z: R.y + Math.sin(R.face) * 6, ground: true };
    if ((appena || parte) && !(s.act && SEDUTA[s.act])) { s.upper = 'saluta'; if (g) { const a = g.L.find(m => m !== n); if (a) s.lookAt = testa(a); } }
    // chi arriva: gli altri del gruppo si girano a guardarlo
    if (g && !appena) for (const m of g.L) if (m !== n && m.__arrivo && ora - m.__arrivo.t < 2.6 && C.vive[m.id] && st.t - C.vive[m.id][1] < 8) { s.lookAt = testa(m); break; }
    return true;
  }
  const SEDUTA = { siede: 1, carte: 1, chitarra: 1, siede_terra: 1, rammenda: 1, accovacciato: 1 };
  // ---- il lavoro che si muove: i facchini portano le casse davvero (la regia, solo vicino al giocatore) ----
  // Chi sta al carico (lo Scalo, i carri merci), al retrobottega o alla calata col mestiere del porto non resta in fila con la cassa in
  // braccio: fa il giro. Si china alla pila di partenza (A), prende la cassa, la porta per un tratto breve fino all'altra pila (B, meglio
  // se accanto a un carretto, un'Ape o una barca), la posa, torna a mani vuote sulla corsia di ritorno (si tiene la destra, niente
  // scontri), e via di nuovo. Gli altri sono sfasati (un N-esimo del giro ciascuno). Il percorso si sceglie una volta per posto: dritto,
  // tutto su caselle dove si cammina, lontano dai bordi e dall'acqua (mezzo metro oltre le corsie), dalle case, dalla roba di strada e da chi sta
  // fermo lì; meglio se corre di traverso allo schermo (si legge il passo). Niente di tutto questo tocca i percorsi di popolo.js: si
  // muove la figura solo mentre il posto è «arrivato» e il giocatore è entro CFG.raggio; poi ognuno riparte da dov'è.
  const PORTA = UCo.PORTA = { rotte: {}, chi: {}, vc: 1.0, ve: 1.3, prende: 1.7, posa: 1.3 };
  const FACCHINO = /portual|scaricat|facchin|magazzin|camall|stivator/;
  const portaChi = (n, q) => q.p.k === 'carico' || q.p.k === 'retrobottega' || (q.p.k === 'calata' && n.pop && n.pop.job && FACCHINO.test((n.pop.job.base || n.pop.job.title || '').toLowerCase()));
  function rotta(st, q, fermi) {
    const k = q.id, o = PORTA.rotte[k]; if (o && (o.ok || FRAME - o.f < 30)) return o;   // una rotta che non c'è si riprova dopo 30 fotogrammi (i tasselli attorno arrivano dopo)
    const G2 = G, walk = (x, y) => !G2.walkM || G2.walkM(x, y), ost = UP && UP.ostacoli ? UP.ostacoli(q.p.x, q.p.y, 10) : [];
    const casa = (x, y) => typeof Ingombri !== 'undefined' && Ingombri.casa && Ingombri.casa(G2, { cx: x, cz: y, a: 0, hu: .45, hv: .45 }, 0);
    const roba = (x, y, m) => ost.some(b => Math.abs(b.x - x) < b.hx + m && Math.abs(b.y - y) < b.hy + m);
    // le altre rotte vicine (un posto accanto): niente corsie che si toccano, 1,4 m d'aria
    const altre = Object.values(PORTA.rotte).filter(o2 => o2.ok && hyp(o2.A[0] - q.p.x, o2.A[1] - q.p.y) < 20), lungo = (x, y) => altre.some(o2 => { const dx = x - o2.A[0], dy = y - o2.A[1], t = cl(dx * o2.ux + dy * o2.uy, -.6, o2.L + .6); return hyp(dx - o2.ux * t, dy - o2.uy * t) < 1.4; });
    const no = {}, segna = m => { no[m] = (no[m] || 0) + 1; return false; };
    const giusto = (x, y, lat, ux, uy) => (!lungo(x, y) || segna('rotta')) && (walk(x, y) || segna('passo')) && ((walk(x - uy * lat, y + ux * lat) && walk(x + uy * lat, y - ux * lat)) || segna('bordo')) && (!casa(x, y) || segna('casa')) && (!roba(x, y, .3) || segna('roba')) && (!fermi.some(f => hyp(f[0] - x, f[1] - y) < .75) || segna('fermi'));
    const cam = pv() && pv().R && pv().R.getCamera ? pv().R.getCamera() : null, d3 = cam ? new T3.Vector3() : null; if (cam) cam.getWorldDirection(d3);
    const rx = cam ? -d3.z : 1, ry = cam ? d3.x : 0, rl = hyp(rx, ry) || 1;
    const mezzi = (st.vehicles || []).filter(v => !v.hidden && !v.traffic && hyp(v.x - q.p.x, v.y - q.p.y) < 14 && /ape|furgone|carro|barca|gozzo|camion/.test(v.kind || ''));
    // A: il punto del posto (o lì vicino, dove c'è posto per la pila)
    let A = null; for (const [dx, dy] of [[0, 0], [.6, 0], [-.6, 0], [0, .6], [0, -.6], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [1.8, 0], [-1.8, 0], [0, 1.8], [0, -1.8], [1.3, 1.3], [-1.3, 1.3], [1.3, -1.3], [-1.3, -1.3]]) { const x = q.p.x + dx, y = q.p.y + dy; if ([0, 1, 2, 3, 4, 5, 6, 7].every(i => giusto(x + Math.cos(i * PI / 4) * 1.05, y + Math.sin(i * PI / 4) * 1.05, .1, 1, 0))) { A = [x, y]; break; } }
    let best = null;
    // i versi: lungo la facciata (o la banchina) del posto prima, poi gli altri sedici (dritti: niente storto che finisce in acqua)
    const dir0 = q.p.dir || 0, VERSI = [dir0 + PI / 2, dir0 - PI / 2]; for (let i = 0; i < 16; i++) VERSI.push(dir0 + i * PI / 8);
    if (A) for (let i = 0; i < VERSI.length; i++) {
      const a = VERSI[i], ux = Math.cos(a), uy = Math.sin(a);
      for (const L of [6.5, 5.5, 4.5, 3.6]) {
        let ok = true; for (let t = .4; t <= L + .6 && ok; t += .3) for (const lane of [-.45, .45]) { const x = A[0] + ux * t - uy * lane, y = A[1] + uy * t + ux * lane; if (!giusto(x, y, .55, ux, uy)) { ok = false; break; } }
        if (!ok) continue;
        const B = [A[0] + ux * L, A[1] + uy * L]; if (![0, 1, 2, 3, 4, 5].every(j => giusto(B[0] + Math.cos(j * PI / 3) * .6, B[1] + Math.sin(j * PI / 3) * .6, .2, 1, 0))) continue;
        const tt = (x, y) => G2.tileAt ? G2.tileAt(Math.floor(x / (G2.TS || 2)), Math.floor(y / (G2.TS || 2))) : 0, t0 = tt(A[0], A[1]); let stesso = 0; for (let t = 0; t <= L; t += .5) if (tt(A[0] + ux * t, A[1] + uy * t) === t0) stesso++;
        const traverso = Math.abs((ux * rx + uy * ry) / rl), vicino = mezzi.length ? Math.min(...mezzi.map(v => hyp(v.x - B[0], v.y - B[1]))) : 99;
        const v = L * .25 + traverso * 1.2 + 2.2 * stesso / (Math.floor(L / .5) + 1) + (vicino < 3.5 ? 1 : 0) + (i < 2 ? 1.2 : 0) + hashS(k + i) * .2;   // meglio lungo la facciata o la banchina, sullo stesso selciato del posto, di traverso allo schermo
        if (!best || v > best.v) best = { v, A, B, ux, uy, L, mezzo: vicino < 3.5 };
        break;
      }
    }
    return (PORTA.rotte[k] = best ? Object.assign(best, { ok: true }) : { ok: false, t: st.clock || 0, f: FRAME, perche: !A ? 'pila' : 'strada', no, A });
  }
  function facchini(st, q) {
    const ck = st.clock || 0, o = PORTA.chi[q.id]; if (o && ck - o.t < .5 && o.t <= ck) return o;
    const L = [], fermi = []; for (const m of st.npcs) { const Q = m.__posto; if (!Q || Q.id !== q.id || !Q.arrived || m.dead || m.inside) continue; if (portaChi(m, Q)) L.push(m.id); else fermi.push([Q.slot.x, Q.slot.y]); }
    // chi sta fermo vicino (altri posti, chi siede): il percorso ci gira attorno
    for (const m of st.npcs) { if (m.dead || m.inside || !m.__posto || m.__posto.id === q.id || hyp(m.x - q.p.x, m.y - q.p.y) > 10) continue; fermi.push([m.x, m.y]); }
    L.sort(); return (PORTA.chi[q.id] = { t: ck, L, fermi });
  }
  function lavoroInMoto(st, n, s) {
    const q = n.__posto; if (!q || !q.arrived || q.tetto || !portaChi(n, q) || n.__ev || n.cop || n.panic > 0 || n.stun > 0 || n.alarm || (n.pop && n.pop.emer) || (n.action && n.action.name !== 'routine' && n.action.name !== 'al lavoro')) return false;
    const F = facchini(st, q), i = F.L.indexOf(n.id); if (i < 0) return false;
    const R = rotta(st, q, F.fermi); if (!R.ok) return false;
    const N = F.L.length, ck = st.clock || 0, tA = PORTA.prende, tB = PORTA.posa, w1 = (R.L - 1.1) / PORTA.vc, w2 = (R.L - 1.1) / PORTA.ve, T = tA + w1 + tB + w2;
    let ph = (ck + hashS(q.id) * T + i * T / N) % T; if (ph < 0) ph += T;
    const px = -R.uy, py = R.ux, a0 = R.A, ux = R.ux, uy = R.uy, lane = .45, gx = (t, l) => a0[0] + ux * t + px * l, gy = (t, l) => a0[1] + uy * t + py * l;
    let t, l, f, v = 0; s.act = null; s.upper = null; s.talk = false; s.lookAt = null;
    if (ph < tA) { t = .55; l = lane * .4; f = Math.atan2(-uy, -ux); const k = ph / tA; if (k < .62) s.act = 'raccoglie'; else s.upper = 'porta'; }
    else if ((ph -= tA) < w1) { t = .55 + ph * PORTA.vc; l = lane; f = Math.atan2(uy, ux); v = PORTA.vc; s.upper = 'porta'; }
    else if ((ph -= w1) < tB) { t = R.L - .55; l = lane * .4; f = Math.atan2(uy, ux); const k = ph / tB; if (k < .45) s.upper = 'porta'; else s.act = 'raccoglie'; }
    else { ph -= tB; t = R.L - .55 - ph * PORTA.ve; l = -lane; f = Math.atan2(-uy, -ux); v = PORTA.ve; if (hashS(n.id + Math.floor(ck / T)) < .3) s.upper = 'fuma'; }
    n.x = gx(t, l); n.y = gy(t, l); n.face = f; n.speedNow = v; n.vx = n.vy = 0; R.usata = FRAME; R.consegne = Math.floor((ck + hashS(q.id) * T) * N / T);
    return true;
  }
  UCo.lavoroInMoto = lavoroInMoto; UCo.rotta = rotta;
  // le pile di casse ai due capi (una sola InstancedMesh per tutta la città: 48 casse al più)
  const PILE = UCo.PILE = { m: null, n: 48 };
  function pile() {
    try {
      const P0 = pv(), R = P0 && P0.R, scene = R && R.__models && R.__models.scene; if (!scene) return requestAnimationFrame(pile);
      if (!PILE.m) {
        const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#9a7a4a'; x.fillRect(0, 0, 32, 32); x.fillStyle = '#6b5434'; x.fillRect(0, 8, 32, 3); x.fillRect(0, 21, 32, 3); x.strokeStyle = '#16121B'; x.globalAlpha = .35; x.lineWidth = 2; x.strokeRect(1, 1, 30, 30);
        const t = new T3.CanvasTexture(c); if (T3.SRGBColorSpace) t.colorSpace = T3.SRGBColorSpace;
        PILE.m = new T3.InstancedMesh(new T3.BoxGeometry(.4, .28, .32), new T3.MeshLambertMaterial({ map: t }), PILE.n); PILE.m.castShadow = true; PILE.m.frustumCulled = false; PILE.m.name = 'pile_casse';
      }
      if (PILE.m.parent !== scene) scene.add(PILE.m);
      const M = new T3.Matrix4(), Q = new T3.Quaternion(), E = new T3.Euler(), V3 = new T3.Vector3(), S1 = new T3.Vector3(1, 1, 1); let k = 0;
      for (const id in PORTA.rotte) {
        const Rr = PORTA.rotte[id]; if (!Rr.ok || !Rr.usata || FRAME - Rr.usata > 4) continue;   // a fotogrammi, non a millisecondi (sui telefoni lenti un fotogramma può durare)
        const c = Rr.consegne || 0, nA = 6 - (c % 4), nB = 2 + (c % 4), px = -Rr.uy, py = Rr.ux, yaw = -Math.atan2(Rr.uy, Rr.ux);
        for (const [pt, nn, sg] of [[Rr.A, nA, -1], [Rr.B, nB, 1]]) for (let j = 0; j < nn && k < PILE.n; j++) {
          const lay = Math.floor(j / 2), sd = (j % 2 ? 1 : -1) * (nn - lay * 2 > 1 ? .21 : 0), cx = pt[0] + px * sd + Rr.ux * sg * .12, cy = pt[1] + py * sd + Rr.uy * sg * .12, gz = R.groundH ? R.groundH(cx, cy) : 0;
          E.set(0, yaw + (hashS(id + j + sg) - .5) * .25, 0); Q.setFromEuler(E); V3.set(cx, gz + .14 + lay * .285, cy); M.compose(V3, Q, S1); PILE.m.setMatrixAt(k++, M);
        }
      }
      PILE.m.count = k; PILE.m.visible = k > 0; PILE.m.instanceMatrix.needsUpdate = true;
    } catch (e) { PILE.err = String(e && e.message); }
    requestAnimationFrame(pile);
  }
  requestAnimationFrame(pile);
  // ---- tutti gli altri ----
  const LAVORO = [[/pescat|marinai/, 'rammenda'], [/portual|scaricat|facchin|magazzin/, 'porta']];
  function scenaCitta(st, n, s) {
    if (lavoroInMoto(st, n, s)) return;
    const fermo = Math.abs(n.speedNow || 0) < .2; if (!fermo || n.room || n.__ev || n.cop || n.military || n.panic > 0 || n.stun > 0 || n.alarm) return;
    const ck = st.clock || 0, k = tempra(st, n), q = n.__posto && n.__posto.arrived ? n.__posto : null, g = gruppi(st).di.get(n.id);
    // il lavoro che si vede: il pescatore rammenda, il facchino porta
    if (s.act === 'lavora' && n.pop && n.pop.job && ((n.action && n.action.name === 'al lavoro') || (q && q.p.k === 'calata'))) { const j = (n.pop.job.base || n.pop.job.title || '').toLowerCase(); for (const [re, v] of LAVORO) if (re.test(j)) { if (v === 'porta') { s.act = null; s.upper = 'porta'; } else s.act = v; break; } if (q && q.p.k === 'calata' && s.act === 'lavora' && hashS(n.id + 'cal') < .6) s.act = 'rammenda'; }
    if (q) {
      const t = q.p.k;
      if ((t === 'fermata' || t === 'pensilina' || t === 'fila' || t === 'parata') && (s.act === 'aspetta' || !s.act)) {
        // l'attesa col carattere di ognuno
        const L = { nervoso: [['impaziente'], [null, 'orologio'], ['impaziente']], anziano: [[null, 'dietro'], [null, 'braccia']], elegante: [[null, 'legge'], [null, 'dietro']], pigro: [['appoggiato'], [null, 'tasche']], stanco: [[null, 'tasche'], [null, 'braccia']], energico: [[null, 'telefona'], [null, 'mani_fianchi'], [null, null]], calmo: [[null, 'braccia'], [null, 'legge'], [null, 'fuma'], [null, 'orologio']] }[k];
        const slot = Math.floor((ck + hashS(n.id) * 77) / (25 + hashS(n.id + 'p') * 20)), c = L[Math.floor(hashS(n.id + slot) * L.length)];
        s.act = c[0] || null; s.upper = c[1] || null;
        if (t !== 'fila' && !s.lookAt) { const f = (n.face || 0) + (Math.sin(ck * .23 + hashS(n.id) * 9) > .3 ? 1.2 : 0); s.lookAt = { x: n.x + Math.cos(f) * 10, y: 1.4, z: n.y + Math.sin(f) * 10, ground: true }; }
      } else if (t === 'dehors' && s.act === 'siede' && !s.upper) s.upper = ['tazza', 'fuma', null, 'legge', 'tazza'][Math.floor(hashS(n.id + 'dh') * 5)];
      else if (t === 'portone' && !s.act && hashS(n.id + 'po') < .5) s.act = 'appoggiato';
      else if ((t === 'lotto_vuoto' || t === 'cypher' || t === 'angolo' || t === 'sagrato') && (s.act === 'aspetta' || s.act === 'appoggiato' && !(q.slot && q.slot.wall))) { const h = hashS(n.id + t); s.act = h < .25 && t !== 'sagrato' ? 'accovacciato' : h < .4 && t === 'lotto_vuoto' ? 'siede_terra' : null; if (!s.upper) s.upper = braccia(n, k); }
    }
    // l'«aspetta» di chi non aspetta niente diventa il suo modo di stare
    if (s.act === 'aspetta' && !(n.pop && n.pop.appt && n.pop.cur && n.pop.cur.act === 'appuntamento')) { s.act = k === 'pigro' && hashS(n.id + 'ap') < .5 ? 'appoggiato' : k === 'nervoso' ? 'impaziente' : null; if (!s.upper) s.upper = braccia(n, k); }
    if (g) {
      const cerchio = g.tipo === 'crocchio' || /^(dehors|angolo|lotto_vuoto|sagrato|cypher|fuoco|portone|panchina)$/.test(g.tipo);
      if (cerchio) {
        if (!(s.act && SEDUTA[s.act]) && g.tipo !== 'panchina') { if (g.tipo === 'crocchio') { const S0 = n.pop && n.pop.spot; if (S0 && !S0.wall) S0.face = Math.atan2(g.cy - n.y, g.cx - n.x); } else gira(n, g.cx, g.cy, .04); }
        conversa(st, n, s, g, k);
      } else if (g.L.length > 1 && hashS(g.k + Math.floor(ck / 20)) < .35) {
        // in fila: due vicini scambiano due parole
        const i = g.L.indexOf(n), o = g.L[i % 2 ? i - 1 : i + 1]; if (o && hyp(o.x - n.x, o.y - n.y) < 1.6) { s.lookAt = testa(o); if (((ck + hashS(n.id) * 7) % 6) < 2.5) s.talk = true; }
      }
      if (!(s.act && SEDUTA[s.act])) scosta(st, n, s, g);
    }
  }
  AN.npcPost((st, n, s) => {
    if (n.dead || n.inside || n.inVeh || (pv() && pv().st !== st && pv().st)) return;
    if (!visto(st, n)) return;
    if (FRAME !== FRAME0) { FRAME0 = FRAME; QUANTI = 0; UCo.clock = st.clock || 0; }
    if (++QUANTI > CFG.maxFot) return;
    try { if (!scenaPresidio(st, n, s)) scenaCitta(st, n, s); else stats.messi++; } catch (e) { if (Un()._ && Un()._.conta) Un()._.conta('unico.corpi', e); }
  });

  // ======================= LA PALLA dei ragazzi del presidio (una sfera, una per scena) =======================
  const BALL = UCo.BALL = { m: null, x: 0, y: 0, z: 0 };
  function palla() {
    try {
      const P0 = pv(), st = P0 && P0.st, V = typeof UnicoPartiVivo !== 'undefined' && UnicoPartiVivo.VIS; if (!st || !V || !V.grp) return;
      let on = false;
      for (const C of presidiVivi(st)) {
        const P = PIANTE[C.id], L = P && P.st === st && (P.gruppi.gioca || []).map(id => G.byId(st, id)).filter(n => n && !n.inside && P.ruoli[n.id] && hyp(n.x - P.ruoli[n.id].x, n.y - P.ruoli[n.id].y) < .2);
        if (!L || L.length < 2 || !visto(st, L[0])) continue;
        const T = 2.4, x = ((st.clock || 0) + hashS(C.id) * 9) / T, j = Math.floor(x) % L.length, k = x - Math.floor(x), a = L[j], b = L[(j + 1) % L.length];
        const R = P0.R, gz = R && R.groundH ? R.groundH(a.x, a.y) : 0, hx = (n, d) => [n.x + Math.cos(n.face || 0) * d, n.y + Math.sin(n.face || 0) * d];
        const pa = hx(a, .42), pb = hx(b, .42), t = sm(cl((k - .18) / .62, 0, 1)), h = 1.15 + 1.1 * 4 * t * (1 - t);
        if (!BALL.m) { BALL.m = new T3.Mesh(new T3.SphereGeometry(.11, 12, 8), new T3.MeshLambertMaterial({ color: '#E04B8C' })); BALL.m.castShadow = true; }
        if (BALL.m.parent !== V.grp) V.grp.add(BALL.m);
        BALL.x = pa[0] + (pb[0] - pa[0]) * t; BALL.z = pa[1] + (pb[1] - pa[1]) * t; BALL.y = gz + (k < .18 ? 1.15 - .2 * Math.sin(k / .18 * PI) : h);
        BALL.m.position.set(BALL.x, BALL.y, BALL.z); BALL.m.rotation.x = k * 6; on = true; break;
      }
      if (BALL.m) BALL.m.visible = on;
    } catch (e) { }
    requestAnimationFrame(palla);
  }
  requestAnimationFrame(palla);

  Un().Corpi = UCo;
  return UCo;
})();
if (typeof window !== 'undefined') window.UnicoCorpi = UnicoCorpi;
