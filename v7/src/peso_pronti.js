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
    vivo(R);
  }
  // [fluido] I PROGRAMMI CHE NASCONO A METÀ GIOCO. Un materiale mai disegnato prima (un mezzo, una persona vestita, un velo dei graffiti,
  // i pezzi di una casa che arriva, il primo bosco) chiede un programma nuovo: three lo compila e poi, nello stesso disegno, ne legge le
  // uniform (getProgramParameter), e lì il gioco aspetta che la scheda video abbia finito di compilare (decine o centinaia di ms, sul
  // telefono di più: lo scatto classico). Qui, solo nel disegno della scena: l'oggetto col materiale nuovo salta il fotogramma, subito dopo il
  // disegno il suo programma si prepara (renderer.compile su una scena finta con le stesse luci, la stessa nebbia, lo stesso bersaglio:
  // stessa chiave, quindi lo stesso programma che three sceglierà) e l'oggetto si disegna appena la scheda dice che è pronto
  // (KHR_parallel_shader_compile, una domanda che non aspetta). Compare qualche fotogramma dopo, invece di fermare il gioco.
  // Anche compile() legge le uniform del programma appena creato (getProgram -> getUniforms): durante la preparazione quella lettura,
  // su un programma che la scheda non ha ancora finito, si interrompe (TAGLIO, preso qui sotto, oggetto per oggetto): il programma resta
  // nella cache di three e le uniform le legge il primo disegno vero, quando è pronto.
  // Oltre 3 s di attesa si disegna comunque (come prima). Senza l'estensione, o con ?nopesovivo, non si installa.
  const VIVO = { on: false, attesa: 0, pronti: 0, saltati: 0, oltre: 0, lotti: 0, ms: 0, uguali: 0, diversi: 0, mai: 0, tagli: 0, prova: false, esempi: [] };
  function vivo(R) {
    if (VIVO.on || /[?&]nopesovivo\b/.test(Q)) return; const M0 = R && R.__models; if (!M0 || !M0.renderer) return;
    const rd = M0.renderer, gl = rd.getContext(), ext = gl && gl.getExtension && gl.getExtension('KHR_parallel_shader_compile');
    const PROVA = /[?&]pesovivo=prova\b/.test(Q);   // per le sonde senza l'estensione (SwiftShader): «pronto» due fotogrammi dopo la compilazione (aspetta come prima, ma si controlla che il programma preparato sia quello usato)
    if ((!ext && !PROVA) || !rd.properties) return; VIVO.prova = PROVA && !ext;
    const DONE = ext ? ext.COMPLETION_STATUS_KHR : 0, props = rd.properties, ATT = new Map(), NUOVI = [];   // materiale -> { t0, objs, rt, variante }
    const LUCI = [], TUTTE = []; let luciT = -1e9, inMain = 0, cur = null;
    const variante = o => (o.isInstancedMesh ? 1 : 0) | (o.isSkinnedMesh ? 2 : 0) | (o.isPoints ? 4 : 0) | (o.isLine ? 8 : 0) | (o.isSprite ? 16 : 0);
    const finta = { isScene: true, fog: null, environment: null, overrideMaterial: null,
      traverseVisible(f) { for (const l of LUCI) f(l); },
      traverse(f) { for (const o of cur) { const ms = Array.isArray(o.material) ? o.material : [o.material], lati = ms.map(m => m && m.side);
        try { f(o); } catch (e) { ms.forEach((m, k) => { if (m && m.side !== lati[k]) { m.side = lati[k]; m.needsUpdate = true; } }); if (e !== TAGLIO) throw e; VIVO.tagli++; } } } };   // il doppio lato trasparente (three lo compila da dietro e da davanti) torna com'era
    // la lettura delle uniform di un programma nuovo, mentre si prepara: se non è pronto (senza l'estensione, nella prova: sempre) si interrompe
    const TAGLIO = { taglio: true }, gpp0 = gl.getProgramParameter; let taglia = false;
    gl.getProgramParameter = function (p, pname) { if (taglia && pname === 35718 && !(ext && gpp0.call(this, p, DONE))) throw TAGLIO; return gpp0.call(this, p, pname); };   // 35718: ACTIVE_UNIFORMS
    let FR = 0;
    const pronto = A => { if (!ext) return FR - A.f0 >= 2; try { return !!A.prog.program && gl.getProgramParameter(A.prog.program, DONE) === true; } catch (e) { return true; } };
    const r0 = rd.render, b0 = rd.renderBufferDirect;
    let prof = 0, cam0 = null;   // la compilazione si fa fuori da ogni disegno (renderer.compile azzera lo stato del disegno in corso)
    rd.render = function (scene, camera) { const m = scene === M0.scene; prof++; if (m) { inMain++; cam0 = camera; FR++; } try { return r0.apply(this, arguments); } finally { prof--; if (m) inMain--; if (!prof && NUOVI.length) prepara(M0.scene, cam0); } };
    rd.renderBufferDirect = function (camera, scene, geometry, material, object) {
      if (!inMain || scene !== M0.scene || !material) return b0.apply(this, arguments);
      const vb = 1 << variante(object); if ((material.__pv5 || 0) & vb) return b0.apply(this, arguments);
      const A = ATT.get(material);
      if (!A) { const mp = props.get(material); if (mp.programs !== undefined) { material.__pv5 = (material.__pv5 || 0) | vb; return b0.apply(this, arguments); }   // già preparato (nel caricamento): come prima
        ATT.set(material, { t0: performance.now(), objs: new Set([object]), rt: rd.getRenderTarget(), vb, prog: null }); NUOVI.push(material); VIVO.saltati++; return; }
      if (A.vb !== vb) return b0.apply(this, arguments);   // lo stesso materiale su un oggetto di un altro tipo: three fa da sé
      if (A.prog && pronto(A)) { ATT.delete(material); material.__pv5 = (material.__pv5 || 0) | vb; VIVO.pronti++; const r = b0.apply(this, arguments); if (props.get(material).currentProgram === A.prog) VIVO.uguali++; else { VIVO.diversi++; if (VIVO.esempi.length < 12) { const k1 = String(A.prog && A.prog.cacheKey), k2 = String(props.get(material).currentProgram && props.get(material).currentProgram.cacheKey); let i = 0; while (i < k1.length && k1[i] === k2[i]) i++; VIVO.esempi.push(material.type + ':' + vb + ' @' + i + ' ' + k1.slice(Math.max(0, i - 40), i + 30) + ' | ' + k2.slice(Math.max(0, i - 40), i + 30)); } } return r; }
      if (performance.now() - A.t0 > 3000) { ATT.delete(material); material.__pv5 = (material.__pv5 || 0) | vb; VIVO.oltre++; if (!A.prog) VIVO.mai++; return b0.apply(this, arguments); }
      if (!A.prog) A.objs.add(object);
      VIVO.saltati++;   // non è pronto: questo fotogramma no
    };
    function prepara(scene, camera) {
      // le luci: tutte quelle della scena (ogni 2 s), e di queste quelle accese adesso (visibili fino alla scena), come le vede il disegno
      const t0 = performance.now(); if (t0 - luciT > 2000) { luciT = t0; TUTTE.length = 0; scene.traverse(o => { if (o.isLight) TUTTE.push(o); }); }
      LUCI.length = 0; for (const l of TUTTE) { let q = l; while (q && q.visible && q !== scene) q = q.parent; if (q === scene) LUCI.push(l); }
      finta.fog = scene.fog; finta.environment = scene.environment;
      const prev = rd.getRenderTarget(), perRT = new Map();
      for (const m of NUOVI.splice(0)) { const A = ATT.get(m); if (!A) continue; (perRT.get(A.rt) || perRT.set(A.rt, []).get(A.rt)).push(m); }
      try {
        perRT.forEach((ms, rt) => { rd.setRenderTarget(rt); cur = []; ms.forEach(m => ATT.get(m).objs.forEach(o => cur.push(o)));
          taglia = true; try { rd.compile(finta, camera); } catch (e) { ST.errori++; } finally { taglia = false; }
          ms.forEach(m => { const A = ATT.get(m), mp = props.get(m); let pr = mp && mp.currentProgram; if (!pr && mp && mp.programs) for (const v of mp.programs.values()) pr = v;   // interrotto: l'ultimo messo in cache
            A.prog = pr || { program: null }; A.f0 = FR; if (!A.prog.program) { ATT.delete(m); m.__pv5 = (m.__pv5 || 0) | A.vb; } A.objs.clear(); }); });
      } finally { cur = null; rd.setRenderTarget(prev); }
      VIVO.lotti++; VIVO.ms += performance.now() - t0; VIVO.attesa = ATT.size;
    }
    VIVO.on = true;
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
  return { ON, compila, vivo, conto: () => Object.assign({ on: ON }, ST, { vivo: Object.assign({}, VIVO, { ms: +VIVO.ms.toFixed(1) }) }) };
})();
if (typeof window !== 'undefined') window.PesoPronti = PesoPronti;
