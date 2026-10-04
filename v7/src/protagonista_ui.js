/* Porto Vecchio — Il Protagonista: i bisogni sotto i soldi, il lavoro, e il tempo che corre (solo interfaccia). */
(function () {
  'use strict';
  if (typeof document === 'undefined' || typeof Protagonista === 'undefined') return;
  // i personaggi del pack si caricano subito, senza aspettare gli oggetti di scena (prima restavano blocchetti)
  if (window.Models && Models.loadChar) ['Casual', 'Casual_2', 'Casual_Hoodie', 'Formal', 'Worker', 'Soldier'].forEach(f => { try { Models.loadChar(f); } catch (e) { } });
  const PV = () => window.__pv, $ = id => document.getElementById(id);
  const css = document.createElement('style');
  css.textContent = `
#me-box { position: absolute; left: 12px; bottom: 58px; width: 190px; z-index: 4; pointer-events: none; }
#me-needs { display: grid; grid-template-columns: auto 1fr; gap: 3px 8px; font: 600 10.5px system-ui; color: #eee6d8; background: rgba(12, 12, 20, .62); padding: 6px 8px 5px; border-radius: 2px; text-shadow: none; }
#me-needs i { display: block; height: 5px; margin-top: 4px; background: rgba(255,255,255,.14); }
#me-needs i b { display: block; height: 100%; background: #9ab0a0; }
#me-needs i b.w { background: #e8b040; } #me-needs i b.r { background: #e05050; }
#me-line { margin-top: 0; font: 500 10.5px system-ui; color: #d8d0c4; line-height: 1.35; background: rgba(12, 12, 20, .62); padding: 0 8px 6px; text-shadow: none; }
#me-warp { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; background: rgba(10, 10, 18, .45); color: #f0ead8; font: 600 22px system-ui; letter-spacing: .04em; z-index: 5; }
#me-warp small { display: block; font-weight: 400; font-size: 13px; color: #b8b0c0; text-align: center; margin-top: 6px; }
`;
  document.head.appendChild(css);
  const LAB = { fame: 'Fame', sonno: 'Sonno', igiene: 'Sporco', svago: 'Noia', compagnia: 'Solitudine' };
  let box = null, line = null, warp = null, last = '';
  function mount() {
    const app = document.getElementById('app') || document.body; if (box) return;
    const card = document.createElement('div'); card.id = 'me-box'; card.className = 'hud'; app.appendChild(card);
    box = document.createElement('div'); box.id = 'me-needs'; card.appendChild(box);
    line = document.createElement('div'); line.id = 'me-line'; card.appendChild(line);
    warp = document.createElement('div'); warp.id = 'me-warp'; warp.hidden = true; (document.getElementById('app') || document.body).appendChild(warp);
  }
  function draw() {
    const pv = PV(); if (!pv || !pv.st || !pv.st.me) return;
    mount(); if (!box) return;
    const st = pv.st, M = st.me, N = M.need;
    const bars = Object.keys(LAB).map(k => { const v = N[k], c = v > .85 ? 'r' : v > .65 ? 'w' : ''; return `<span>${LAB[k]}</span><i><b class="${c}" style="width:${Math.round(v * 100)}%"></b></i>`; }).join('');
    const S = Protagonista.shiftToday(st), bits = [];
    if (M.job) bits.push(`${M.job.title}${S ? `, oggi ${pv.G.clockStr(S.a)}–${pv.G.clockStr(S.z)}` : ', oggi riposo'}${M.owed ? ` · ${Math.round(M.owed)}.000 da ritirare` : ''}`);
    else bits.push('Senza lavoro');
    if (M.drunk > .3) bits.push(M.drunk > .65 ? 'ubriaco' : 'brillo');
    if (M.hangover > .3) bits.push('postumi');
    if (M.alcol > .45 && M.drunk < .15) bits.push('le mani tremano'); else if (M.alcol > .6) bits.push('beve troppo');
    if (st.t < M.calmUntil) bits.push('mano ferma');
    bits.push(`sigarette ${M.cig} · dispensa ${M.pantry}`);
    if (M.rentDebt > 0) bits.push(`affitto arretrato ${Math.round(M.rentDebt)}.000`);
    const sig = bars + bits.join('|');
    if (sig !== last) { last = sig; box.innerHTML = bars; line.textContent = bits.join(' · '); }
    const W = M.warp;
    warp.hidden = !W;
    if (W) warp.innerHTML = `${W.kind === 'sonno' ? 'Dormi…' : W.kind === 'lavoro' ? 'Al lavoro…' : (W.label[0].toUpperCase() + W.label.slice(1) + '…')}<small>${pv.G.clockStr(st.t)} · U o Tasche per fermarti</small>`;
  }
  setInterval(draw, 250);
})();
