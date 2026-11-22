/* Porto Vecchio — [fumetto] PASSO 3 · LA TAVOLOZZA NEI MATERIALI (con lo stile unico: Render.__fum.x; 0 com'era).
   Il colore si decide nei materiali, prima della luce: le tinte piatte dei materiali del mondo (muri, tetti, infissi, arredo, mezzi senza
   tessitura) si avvicinano all'inchiostro della loro famiglia nella tavolozza della BIBBIA (stessa scelta per famiglie del passo E: un grigio
   non diventa mai ocra, un tetto mai viola), il valore resta. Così il passo E a valle (approvato) parte da colori già giusti e spinge meno.
   Fuori: le persone (scheletro, categoria data dal gioco), i trasparenti, i materiali senza luce (insegne, graffiti, schermi: MeshBasic),
   le tinte quasi bianche (i materiali con la tessitura: la tinta è il bianco), le tinte quasi grigie. Ogni 3 s i materiali nuovi; il
   colore di prima resta in userData (si torna indietro). Fuori dall'impronta dei tasselli (lavora sui materiali vivi, anche dei tasselli). */
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof THREE === 'undefined' || typeof Render === 'undefined') return;
  if (/[?&](notavolozza_mat|vecchio)\b/.test(location.search || '') || window.PV_STUDIO) return;
  const F = { N: 1, C: 2, F: 4, V: 8, M: 16 };
  const INK = [['#F2E7CF', 31], ['#D2C2A6', 3], ['#A89C92', 1], ['#7C7186', 1], ['#3D3548', 17], ['#16121B', 31], ['#F0BE8C', 2], ['#DC9A34', 2], ['#C25B36', 2], ['#6F2B2E', 18],
    ['#A3D4D8', 4], ['#2A8A8A', 12], ['#2F60B5', 4], ['#202D5E', 28], ['#93B27C', 8], ['#3F8A50', 8], ['#34532F', 8], ['#A68FB6', 17], ['#E04B8C', 16], ['#6B3D9B', 16]];
  const lin = c => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4), gam = c => c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - .055;
  function lab(r, g, b) { const l = Math.cbrt(.4122215 * r + .5363325 * g + .051446 * b), m = Math.cbrt(.2119035 * r + .6806995 * g + .107397 * b), s = Math.cbrt(.0883025 * r + .2817188 * g + .6299787 * b);
    return [.2104543 * l + .7936178 * m - .004072 * s, 1.9779985 * l - 2.4285922 * m + .4505937 * s, .025904 * l + .7827718 * m - .8086758 * s]; }
  function rgb(L, a, b) { const l = Math.pow(L + .3963378 * a + .2158038 * b, 3), m = Math.pow(L - .1055613 * a - .0638542 * b, 3), s = Math.pow(L - .0894842 * a - 1.2914855 * b, 3);
    return [4.0767417 * l - 3.3077116 * m + .2309699 * s, -1.268438 * l + 2.6097574 * m - .3413194 * s, -.0041961 * l - .7034186 * m + 1.7076147 * s]; }
  const TAV = INK.map(([h, f]) => { const c = new THREE.Color(h); return { lab: lab(c.r, c.g, c.b), f }; });   // THREE.Color in lineare (ColorManagement): i conti in Oklab dal lineare
  const K = .5;   // quanto la tinta va verso l'inchiostro della famiglia
  function spingi(c) {   // c: THREE.Color (lineare) → nuova tinta, il valore resta
    const [L, a, b] = lab(c.r, c.g, c.b), C = Math.hypot(a, b); if (C < .035 || L > .96) return null;
    const hu = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360, fam = (hu < 15 || hu >= 285) ? F.M : hu < 100 ? F.C : hu < 172 ? F.V : F.F;
    let best = null, bd = 1e9; for (const t of TAV) { if (!(t.f & fam)) continue; const da = a - t.lab[1], db = b - t.lab[2], d = .3 * (L - t.lab[0]) ** 2 + da * da + db * db; if (d < bd) { bd = d; best = t; } }
    if (!best) return null; const Ci = Math.hypot(best.lab[1], best.lab[2]) || 1e-4, Ct = C + (Ci - C) * .35;
    const na = a + (best.lab[1] / Ci * Ct - a) * K, nb = b + (best.lab[2] / Ci * Ct - b) * K, o = rgb(L, na, nb);
    return [Math.max(0, o[0]), Math.max(0, o[1]), Math.max(0, o[2])];
  }
  const S = { materiali: 0, cambiati: 0, ms: 0, on: null };
  window.__TAVMAT = S;
  function giro() {
    const R = window.Render, sc = R && R.__models && R.__models.scene; if (!sc) return; const on = !R.__fum || R.__fum.x > .5, t0 = performance.now(), visti = new Set();
    sc.traverse(o => { if (!o.isMesh || o.isSkinnedMesh || (o.userData && o.userData.ghost5)) return; const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { if (!m || visti.has(m)) continue; visti.add(m);
        if (!m.color || m.isMeshBasicMaterial || m.isShaderMaterial || m.transparent || (m.userData && m.userData.sgTag !== undefined)) continue;
        const u = m.userData || (m.userData = {});
        if (u.__tav0 === undefined) { u.__tav0 = m.color.getHex(); const n = spingi(m.color); u.__tav1 = n ? new THREE.Color(n[0], n[1], n[2]).getHex() : null; if (u.__tav1 !== null) S.cambiati++; }
        if (u.__tav1 === null) continue; const want = on ? u.__tav1 : u.__tav0; if (m.color.getHex() !== want) m.color.setHex(want); } });
    S.materiali = visti.size; S.ms = +(performance.now() - t0).toFixed(1); S.on = on;
  }
  setInterval(() => { try { giro(); } catch (e) { S.err = String(e); } }, 3000);
})();
