/* Porto Vecchio — [peso] i programmi che nascono tardi, preparati nel caricamento (v7).
   main.js compila la scena una volta durante il caricamento (renderer.compile, KHR_parallel_shader_compile; shadersPronti() aspetta che
   siano pronti). Restavano fuori i programmi dei materiali che nascono solo dopo:
   - la casa tagliata cava della camera in strada (inquadratura.js: 'cavo5' la cornice dei muri, 'pav5' il tavolato): nascevano al primo
     taglio, e il telefono si fermava lì;
   - le due varianti del pavimento (Pavimenti.qualita 'alta' | 'leggera'): il cambio di qualità (il livello della scheda, lowQuality) le
     ricompilava tutte insieme.
   Qui, appena prima di quella compilazione: due mesh nascoste-ma-visibili con i due materiali entrano in scena (un triangolo fuori vista),
   si compila, si passa il pavimento all'altra variante, si compila ancora, si torna com'era. three tiene i programmi in cache per chiave:
   al primo taglio e al cambio di qualità il programma c'è già.
   ?nopesopronti spegne (come prima).                                                                                                 */
var PesoPronti = (function () {
  'use strict';
  const Q = typeof location !== 'undefined' ? location.search : '';
  const ON = !/[?&]nopeso(pronti)?\b/.test(Q);
  const ST = { programmi: 0, ms: 0, errori: 0 };
  function compila(R) {
    if (!ON) return; const M0 = R && R.__models; if (!M0 || !M0.renderer || !M0.scene || !R.getCamera) return;
    const T = window.THREE, rd = M0.renderer, S = M0.scene, cam = R.getCamera(), t0 = performance.now(), extra = [];
    try {
      const mats = R.__pronti5 ? R.__pronti5() : [];
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([0, -500, 0, .01, -500, 0, 0, -500, .01], 3));
      g.setAttribute('normal', new T.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); g.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
      g.setAttribute('m3', new T.Float32BufferAttribute(new Array(12).fill(1), 4));
      mats.forEach(m => { const ms = new T.Mesh(g, m); ms.frustumCulled = false; ms.castShadow = ms.receiveShadow = false; S.add(ms); extra.push(ms); });
    } catch (e) { ST.errori++; console.warn('[peso] pronti', e); }
    const n0 = rd.info.programs ? rd.info.programs.length : 0;
    try { (typeof LeggeraMem !== 'undefined' ? LeggeraMem.compila(rd, S, cam) : rd.compile(S, cam)); } catch (e) { ST.errori++; console.warn('[peso] pronti', e); }
    // le due varianti del pavimento: l'altra, poi di nuovo quella di adesso (dalla cache)
    const P = window.Pavimenti;
    if (P && typeof P.qualita === 'function') { const q = P.qualita(), altra = q === 'alta' ? 'leggera' : 'alta';
      try { P.qualita(altra); (typeof LeggeraMem !== 'undefined' ? LeggeraMem.compila(rd, S, cam) : rd.compile(S, cam)); } catch (e) { ST.errori++; console.warn('[peso] pronti', e); } finally { P.qualita(q); } }
    extra.forEach(ms => S.remove(ms));
    ST.programmi = (rd.info.programs ? rd.info.programs.length : 0) - n0; ST.ms = +(performance.now() - t0).toFixed(1);
    ST.rilasciati = rilascia(rd, S);
  }
  // [telefono] renderer.compile passa su TUTTA la scena, anche sui pezzi spenti (le case fuse tengono i loro 17.000 pezzi originali
  // invisibili, con ~19.000 materiali propri): per ognuno three clona le uniform del programma (~170 MB di heap, misurati). Il programma
  // compilato resta in cache: qui si lasciano andare solo le proprietà dei materiali che nessun oggetto visibile usa; al primo uso vero
  // (la casa che si dissolve) three le rifà in pochi millisecondi dal programma già pronto. ?nopesorilascio lo spegne
  function rilascia(rd, S) {
    if (/[?&]nopesorilascio\b/.test(Q) || !rd.properties || typeof rd.properties.remove !== 'function') return 0;
    const vis = new Set(), inv = new Set(), each = (o, f) => { const m = o.material; if (!m) return; if (Array.isArray(m)) m.forEach(f); else f(m); };
    S.traverseVisible(o => each(o, m => vis.add(m)));
    S.traverse(o => each(o, m => { if (!vis.has(m)) inv.add(m); }));
    inv.forEach(m => rd.properties.remove(m)); return inv.size;
  }
  return { ON, compila, conto: () => Object.assign({ on: ON }, ST) };
})();
if (typeof window !== 'undefined') window.PesoPronti = PesoPronti;
