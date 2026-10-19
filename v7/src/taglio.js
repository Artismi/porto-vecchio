/* Porto Vecchio — Il taglio: i vestiti come pezzi modellati (come in San Andreas), non calcolati sopra il corpo.
   Ogni personaggio del kit (Quaternius Ultimate Modular Men/Women, CC0) è fatto di 4 pezzi sullo stesso scheletro:
   testa, busto, gambe, piedi. Un capo dell'inventario sceglie il pezzo (il taglio) e gli dà il colore (la stoffa):
   il pezzo prende il posto della parte del corpo, quindi sotto non c'è niente da bucare.
   Gli strati: per ogni zona comanda il capo più esterno (l'ultimo indossato); quello sotto può colorare la parte
   che ne spunta (nel gilet da lavoro, la maglia). Testa, mani e capelli restano quelli della persona.
   I pezzi che mancano (completo, polo, tuta, piumino…) arrivano coi pacchetti completi del kit o modellati a parte:
   si aggiungono qui, nella tabella PEZZI. */
var Taglio = (function () {
  'use strict';
  // ---------------- I PEZZI ----------------
  // [file del kit, mesh, ruolo di ogni materiale]: A = colore del capo, B = secondo colore, S = colore del capo sotto, P = pelle, K = com'è
  const PEZZI = {
    uomo: {
      busto: {
        maglietta: ['Casual_2', /Body/, { LightBrown: 'A', Skin: 'P' }],
        felpa: ['Casual_Hoodie', /Body/, { Purple: 'A', Skin: 'P' }],
        gilet: ['Worker', /Body/, { Worker_Vest: 'A', Worker_Yellow: 'B', LightBrown: 'S', Skin: 'P' }],
      },
      gambe: {
        pantaloni: ['Casual_2', /Legs/, { LightBlue: 'A' }],
        corti: ['Casual_Hoodie', /Legs/, { LightBlue: 'A', Skin: 'P' }],
        lavoro: ['Worker', /Legs/, { Brown2: 'A', Brown: 'B' }],
      },
      piedi: {
        scarpe: ['Casual_2', /Feet/, { Red_Dark: 'A', White: 'B' }],
        scarpe_basse: ['Casual_Hoodie', /Feet/, { Purple: 'A', White: 'B' }],
        scarponi: ['Worker', /Feet/, { Black: 'A', Grey: 'B' }],
      },
    },
    donna: {
      busto: {
        maglietta: ['Casual', /Body/, { White: 'A', Skin: 'P' }],
        vestito: ['Formal', /Body/, { LimeGreen: 'A', Gold: 'B', Skin: 'P' }],
      },
      gambe: {
        pantaloni: ['Casual', /Legs/, { Orange: 'A' }],
        vestito: ['Formal', /Legs/, { LimeGreen: 'A', Skin: 'P' }],
      },
      piedi: {
        scarpe: ['Casual', /Feet/, { Grey: 'A', Skin: 'P' }],
        ballerine: ['Formal', /Feet/, { Red: 'A', Skin: 'P' }],
      },
    },
  };
  // ---------------- DAL CAPO AL TAGLIO ----------------
  // (finché non arrivano i pezzi giusti, ogni capo prende il taglio più vicino: maniche lunghe → felpa, giacche → gilet)
  const BUSTO = [
    [/^(giacca|giacca_completo|giacca_pelle|giubbotto|giubbotto_jeans|divisa|gilet|smanicato|cappotto|impermeabile|montone|piumino|piumino_oca|grembiule)$/, 'gilet'],
    [/^(felpa|felpa_zip|felpa_skate|maglione|maglione_v|maglione_collo_alto|dolcevita|giacca_tuta|giacca_tuta_fascia|tuta_ginnastica|tuta|poncho|scialle|pelliccia|pelliccia_volpe)$/, 'felpa'],
    [/^vestit/, 'vestito'],
    [/./, 'maglietta'] ];
  const GAMBE = [[/^(bermuda|pantaloncini|minigonna)$/, 'corti'], [/^(pantaloni_lavoro)$/, 'lavoro'], [/^(gonna)$/, 'vestito'], [/./, 'pantaloni']];
  const PIEDI = [[/^(stivali|stivali_pelle|scarpe|stivali_cowboy)$/, 'scarponi'], [/^(scarpe_tela|ciabatte|sandali)$/, 'scarpe_basse'], [/^(tacchi|mocassini|scarpe_eleganti)$/, 'ballerine'], [/./, 'scarpe']];
  const NON_VESTE = /^(mutande|calzini|calze_sport|calze_nylon|calzamaglia)$/;   // stanno sotto: non danno il taglio
  const taglioDi = (tab, id, lib) => { for (const [re, t] of tab) if (re.test(id) && lib[t]) return t; return Object.keys(lib)[0]; };
  // ---------------- IL MONTAGGIO ----------------
  const MAT = new Map();
  function tinta(m0, col) { const k = m0.uuid + '|' + col; if (!MAT.has(k)) { const m = m0.clone(); m.color.set(col); if (m.emissive) m.emissive.copy(m.color).multiplyScalar(.3); MAT.set(k, m); } return MAT.get(k); }
  // un pezzo con più materiali, nel glTF, è un gruppo di mesh (una per materiale): si prendono tutte
  const nomeDi = o => o.name + ' ' + (o.parent ? o.parent.name : '');
  function sorgenti(file, re) { const C = Models.chars && Models.chars[file]; if (!C) return []; const L = []; C.root.traverse(o => { if (o.isSkinnedMesh && re.test(nomeDi(o))) L.push(o); }); return L; }
  function dress(g, outfit, look) {
    const root = g.userData.body && g.userData.body.children[0]; if (!root || !Models.chars) return false;
    const file = g.userData.model, sesso = /^(Casual|Formal)$/.test(file) ? 'donna' : 'uomo', LIB = PEZZI[sesso];
    // via i pezzi di prima; i pezzi della persona tornano (si rinascondono sotto)
    const old = []; root.traverse(o => { if (o.userData.taglio) old.push(o); if (o.userData.taglioHid) { o.visible = true; o.userData.taglioHid = false; } }); old.forEach(o => o.parent.remove(o));
    const ossa = {}; root.traverse(o => { if (o.isBone) ossa[o.name] = o; });
    const ord = outfit.map((c, k) => ({ c, k })).sort((a, b) => ((a.c.when || 0) - (b.c.when || 0)) || (a.k - b.k)).map(x => x.c);
    const skin = (look && look.skin) || '#d8a888', fuori = zona => ord.filter(c => c.zona === zona && !NON_VESTE.test(c.id));
    const monta = (zona, tab, reCorpo) => {
      const L = fuori(zona), C = L[L.length - 1], sotto = L[L.length - 2]; if (!C) return;
      const t = taglioDi(tab, C.id, LIB[zona]), [f, re, ruoli] = LIB[zona][t], srcs = sorgenti(f, re); if (!srcs.length) return;
      // la parte del corpo della persona si nasconde: il pezzo ne prende il posto
      root.traverse(o => { if (o.isSkinnedMesh && reCorpo.test(nomeDi(o)) && !o.userData.taglio) { o.visible = false; o.userData.taglioHid = true; } });
      const col = { A: C.col || '#808080', B: C.col2 || null, S: sotto ? sotto.col : null, P: skin };
      for (const src of srcs) {
        const ms = (Array.isArray(src.material) ? src.material : [src.material]).map(m => { const r = ruoli[m.name], c = r && col[r]; return c ? tinta(m, c) : m; });
        const sm = new THREE.SkinnedMesh(src.geometry, Array.isArray(src.material) ? ms : ms[0]);
        sm.name = 'Taglio_' + zona; sm.userData.taglio = t; sm.userData.vesti = true; sm.userData.zona = zona; sm.castShadow = true; sm.frustumCulled = false;
        const bones = src.skeleton.bones.map(b => ossa[b.name]); if (bones.some(b => !b)) { console.warn('[Taglio] ossa diverse', f); return; }
        // stesso posto nella gerarchia del pezzo originale (il gruppo del pezzo porta la scala e la rotazione del kit)
        const host = src.parent && src.parent !== Models.chars[f].root ? src.parent : null, hp = host && root.getObjectByName(host.name);
        if (hp) { const grp = new THREE.Group(); grp.userData.taglio = t; grp.position.copy(host.position); grp.quaternion.copy(host.quaternion); grp.scale.copy(host.scale); hp.parent.add(grp); sm.position.copy(src.position); sm.quaternion.copy(src.quaternion); sm.scale.copy(src.scale); grp.add(sm); }
        else { sm.position.copy(src.position); sm.quaternion.copy(src.quaternion); sm.scale.copy(src.scale); (src.parent && root.getObjectByName(src.parent.name) || root).add(sm); }
        sm.bind(new THREE.Skeleton(bones, src.skeleton.boneInverses), src.bindMatrix);
      }
    };
    monta('busto', BUSTO, /Body/); monta('gambe', GAMBE, /Legs/); monta('piedi', PIEDI, /Feet/);
    // senza niente sopra: la pelle (busto nudo e gambe nude restano i pezzi della persona, tinti di pelle)
    root.traverse(o => { if (!o.isSkinnedMesh || o.userData.taglio || (o.parent && o.parent.userData.taglio) || o.userData.taglioHid || /Head/i.test(nomeDi(o))) return; const ms = Array.isArray(o.material) ? o.material : [o.material]; const nm = ms.map(m => /^Skin/.test(m.name) ? m : tinta(m, skin)); o.material = Array.isArray(o.material) ? nm : nm[0]; });
    return true;
  }
  // i punti del busto vestito (posa di riposo, nello spazio della persona): catene, sciarpe e collane ci si posano sopra
  function punti(g) {
    g.updateMatrixWorld(true); const gi = new THREE.Matrix4().copy(g.matrixWorld).invert(), v = new THREE.Vector3(), out = [];
    g.traverse(o => { if (!o.isSkinnedMesh || o.userData.zona !== 'busto') return; const P = o.geometry.attributes.position, M = new THREE.Matrix4().multiplyMatrices(gi, o.matrixWorld);
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(M); out.push(v.x, v.y, v.z); } });
    return out; }
  return { dress, punti, PEZZI, attivo: true };
})();
if (typeof module !== 'undefined') module.exports = Taglio;
