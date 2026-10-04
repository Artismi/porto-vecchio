/* Porto Vecchio — azioni sul paesaggio (inverno, v7).
   Abbattere un albero alla volta: serve un'ascia (o una sega). L'albero diventa un ceppo, il bosco si apre,
   in tasca entra legna da ardere (per stufe e barili). Chi vede tagliare un albero nella dorsale se lo ricorda.
   Si aggancia alle azioni del giocatore di azioni.js/protagonista.js senza toccarle. */
var Paesaggio = (function () {
  'use strict';
  const G = typeof Game !== 'undefined' ? Game : require('./game.js');
  const AZ = typeof Azioni !== 'undefined' ? Azioni : null;
  const TS = G.TS, T = G.T;
  // l'ascia si compra in ferramenta o si prende dove si lavora il legno
  if (AZ && AZ.ITEMS && !AZ.ITEMS.ascia) AZ.ITEMS.ascia = { name: 'ascia', buy: { 'use:ferramenta': 8 }, take: ['pozzo_o', 'villaggio', 'sangiacomo', 'ovile', 'masseria', 'carbonaia'] };
  function nearTree(st) {
    const p = st.player, tx0 = Math.floor(p.x / TS), ty0 = Math.floor(p.y / TS); let best = null, bd = 1e9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const tx = tx0 + dx, ty = ty0 + dy; if (G.tileAt(tx, ty) !== T.TREE) continue; const d = Math.hypot(tx * TS + 1 - p.x, ty * TS + 1 - p.y); if (d < 3.2 && d < bd) { bd = d; best = [tx, ty]; } }
    return best;
  }
  function chop(st, t) {
    const p = st.player; G.setTile(t[0], t[1], T.SHRUB);
    p.inv = p.inv || {}; p.inv.legna = (p.inv.legna || 0) + 3;
    st.paesaggio = st.paesaggio || { tagliati: [] }; st.paesaggio.tagliati.push({ tx: t[0], ty: t[1], t: st.t });
    if (typeof Render !== 'undefined' && Render.dirtyAt) Render.dirtyAt(t[0] * TS + 1, t[1] * TS + 1);
    if (G.emit) try { G.emit(st, { type: 'taglio', x: t[0] * TS + 1, y: t[1] * TS + 1, sev: .2, by: 'player' }); } catch (e) { }
    return 'Il tronco cede con uno schiocco e cade nella neve. Tre ciocchi di legna.';
  }
  function actions(st) {
    const p = st.player; if (!p || p.vehicle || p.indoor) return [];
    const t = nearTree(st); if (!t) return [];
    const inv = p.inv || {}, has = inv.ascia > 0 || inv.sega > 0 || (p.carrying && /ascia|sega/.test(p.carrying));
    return [{ id: 'abbatti', label: 'Abbatti l\'albero', run: has ? () => chop(st, t) : null, off: 'ti serve un\'ascia: in ferramenta, o dai taglialegna' }];
  }
  if (AZ && AZ.playerActions) { const prev = AZ.playerActions; AZ.playerActions = st => (prev(st) || []).concat(actions(st)); }
  return { actions, chop, nearTree };
})();
if (typeof module !== 'undefined') module.exports = Paesaggio;
