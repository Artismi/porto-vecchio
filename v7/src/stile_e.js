/* Porto Vecchio — [integra1] LO STILE E COME INTERRUTTORE (INTEGRAZIONE1.md).
   Il problema: la città vera arriva a tasselli cotti (strumenti/tassella.js, il workflow tasselli.yml) da una cottura senza ?stile. Tutto
   quello che lo stile E fa nei materiali (la rifinitura del suolo, del costruito, i tetti disegnati, le tinte della tavolozza, i pezzi
   segnati) nasceva solo con ?stile=E nel caricamento: nei tasselli non c'era, e sul sito E non si vedeva.
   La soluzione: UNA cottura porta A ed E, il gioco sceglie al caricamento o dal vivo.
   - LO SHADER: ogni ramo E degli shader dipende da una manopola (uniform float: rsK il suolo, rcK il costruito). Nella cottura
     (?cottae, la mette tassella.js) le manopole sono uniform: il testo cotto porta il ramo E. Al caricamento adatta() le riscrive:
     con A diventano la costante 0 (#define: il compilatore toglie il ramo, lo shader è quello di A), con E restano uniform di modulo
     (Render.__tass.uni: i tasselli le ritrovano per nome, il valore è quello dal vivo). Senza cottura e senza E: la costante, come prima.
   - I MATERIALI (quello che non è shader): la tinta E nei userData (rcE, col colore di A in rcA), la tessitura E (m.__mapE, la cottura la
     porta nel record del materiale come mapE), i pezzi solo di E (userData.rcSolo: il materiale si spegne con A). applica() mette lo stato.
   - IL PASSO UNICO (render.js stile): il grading e l'inchiostro di E (fumetto2) sono già dal vivo: imposta() li chiama.
   Il difetto: window.PV_STILE_PREDEFINITO (index.src.html, una riga). ?stile=E / ?stile=A lo scavalcano. Dal vivo: StileE.imposta('E'|'A').
   Gli interruttori di prima restano: ?norifsuolo, ?norifcostruito (spengono la loro parte anche con E). */
var StileE = (function () {
  'use strict';
  const W = typeof window !== 'undefined' ? window : {};
  const Q = typeof location !== 'undefined' ? location.search || '' : '';
  const COTTA = /[?&]cottae\b/.test(Q);   // la cottura dei tasselli: il ramo E dentro gli shader, i valori di A
  const S = { on: /^E/i.test(String(W.PV_STILE || '')), ver: 0 };
  // le manopole negli shader: dichiarate una volta sola per programma (più pezzi possono chiederle), uniform o costante
  const NOMI = ['rsK', 'rcK'];
  const RE = new RegExp('uniform\\s+float\\s+(' + NOMI.join('|') + ')\\s*;', 'g'), RE1 = new RegExp('uniform\\s+float\\s+(' + NOMI.join('|') + ')\\s*;');
  const U = {};   // le uniform di modulo: nome → { value } (render.js le mette in Render.__tass.uni)
  const VAL = {};   // il valore con E (la manopola piena)
  function u(nome, vE) {
    if (!U[nome]) { U[nome] = { value: 0 }; VAL[nome] = vE === undefined ? 1 : vE; U[nome].value = S.on ? VAL[nome] : 0;
      try { if (typeof Render !== 'undefined' && Render.__tass && Render.__tass.uni) Render.__tass.uni[nome] = U[nome]; } catch (e) { } }
    return U[nome];
  }
  const API = {
    get on() { return S.on; }, cotta: COTTA,
    get capace() { return S.on || COTTA; },   // il ramo E entra negli shader e i materiali portano le varianti
    get ver() { return S.ver; },
    NOMI, U, u,
    // il preambolo di una manopola nello shader (una volta sola per programma)
    pre(nome) { return '\n#ifndef PVE_' + nome + '\n#define PVE_' + nome + '\n' + (S.on || COTTA ? 'uniform float ' + nome + ';' : '#define ' + nome + ' 0.') + '\n#endif\n'; },
    // il testo cotto: con A le manopole diventano la costante (lo shader di A), con E restano uniform
    adatta(src) { if (S.on || COTTA || typeof src !== 'string') return src; RE.lastIndex = 0; return src.replace(RE, '#define $1 0.'); },
    usa(src) { return typeof src === 'string' && RE1.test(src); },
    chiave() { return S.on ? '|E' : COTTA ? '|C' : ''; },
    // ---- i materiali ----
    colore(m, hexE) { if (!m || !m.color || typeof hexE !== 'string') return m; const u0 = m.userData; if (!u0.rcA) u0.rcA = '#' + m.color.getHexString(); u0.rcE = hexE; return API.applica(m); },
    soloE(m) { if (!m) return m; m.userData.rcSolo = 'E'; return API.applica(m); },
    mappaE(m, t) { if (!m || !t) return m; m.__mapE = t; return API.applica(m); },
    applica(m) {
      if (!m || !m.userData) return m; const u0 = m.userData;
      if (u0.rcE && m.color && m.color.isColor) m.color.set(S.on ? u0.rcE : u0.rcA);
      if (u0.rcSolo) m.visible = S.on;
      if (m.__mapE) { if (m.__mapA === undefined) { m.__mapA = m.map; if (m.emissiveMap && m.emissiveMap === m.map) m.__emA = true; }
        const t = S.on ? m.__mapE : m.__mapA; if (m.map !== t) { m.map = t; if (m.__emA) m.emissiveMap = t; } }
      return m;
    },
    // dal vivo: le manopole, i materiali in scena (e quelli dei tasselli in memoria), il passo unico
    imposta(v) {
      const on = /^E/i.test(String(v)); if (on === S.on) return API.stato();
      S.on = on; S.ver++; W.PV_STILE = on ? 'E' : 'A';
      for (const k in U) U[k].value = on ? VAL[k] : 0;
      try { if (typeof Render !== 'undefined' && Render.stile) Render.stile(on ? 'E' : 'A'); } catch (e) { console.warn('[stile E] passo', e); }
      const visti = new Set(), tocca = m => { if (!m || visti.has(m)) return; visti.add(m); API.applica(m); m.needsUpdate = true; };
      try { const sc = typeof Render !== 'undefined' && Render.__models && Render.__models.scene; if (sc) sc.traverse(o => { if (o.material) [].concat(o.material).forEach(tocca); if (o.customDepthMaterial) tocca(o.customDepthMaterial); }); } catch (e) { console.warn('[stile E]', e); }
      try { if (typeof Tasselli !== 'undefined' && Tasselli.__materiali) Tasselli.__materiali().forEach(tocca); } catch (e) { }
      try { if (typeof RifSuolo !== 'undefined' && RifSuolo.aggiorna) RifSuolo.aggiorna(); } catch (e) { }
      return API.stato();
    },
    stato() { return { stile: S.on ? 'E' : 'A', cotta: COTTA, predefinito: W.PV_STILE_PREDEFINITO || 'A', manopole: Object.fromEntries(Object.keys(U).map(k => [k, U[k].value])) }; },
  };
  // le copie (la fusione delle case, ownMats, il tetto che sbiadisce) si portano dietro la tessitura E (non sta nei userData: la copia
  // li passa per JSON)
  if (typeof THREE !== 'undefined' && THREE.Material && !THREE.Material.prototype.__pve) {
    const cp = THREE.Material.prototype.copy;
    THREE.Material.prototype.copy = function (s) { const r = cp.call(this, s); if (s && s.__mapE) { this.__mapE = s.__mapE; this.__mapA = s.__mapA; this.__emA = s.__emA; } return r; };
    THREE.Material.prototype.__pve = true;
  }
  W.__stileE = API;
  return API;
})();
if (typeof module !== 'undefined') module.exports = StileE;
