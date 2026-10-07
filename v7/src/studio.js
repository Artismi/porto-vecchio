/* Porto Vecchio — lo Studio (editor.html): il gioco senza personaggi, una camera che gira, tre sezioni.
   MAPPA     tutta l'isola; sposti, togli, posi e dipingi (editor.js). Doppio clic su un oggetto: vista isolata del suo modello.
             Doppio clic su un edificio: ci entri.
   INTERNI   l'elenco degli edifici: scegli, entri, cambi piano, muovi i mobili.
   MODELLI   l'hangar: ogni modello del gioco in fila per categoria (mobili, arredo di strada, covi, bottino, oggetti, vestiti,
             pezzi degli edifici, modelli caricati). Clic: lo prendi. Doppio clic: vista isolata, dove lo modifichi pezzo per pezzo,
             lo sostituisci con un .glb, ne carichi uno dove mancava, lo posi dove vuoi. Esc torna indietro.
   Le modifiche ai modelli passano da officina.js e valgono anche nel gioco. */
var Studio = (function () {
  'use strict';
  if (!window.PV_STUDIO) return null;
  const $ = id => document.getElementById(id), V3 = () => new THREE.Vector3();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let pv = null, sec = 'mappa', ready = false, iso = null, back = 'modelli';
  const r3 = v => Math.round(v * 1000) / 1000, deg = r => Math.round(r * 1800 / Math.PI) / 10;

  // =====================================================================================================
  // AVVIO: il gioco parte da solo, senza gente né traffico, con l'editor sempre aperto
  // =====================================================================================================
  const CSS = `#app > *:not(#cv){display:none!important}
body > *:not(#app):not(#edp):not(#edov):not([id^=st-]):not(script):not(style){display:none!important}
:root{--edtop:52px}
#st-top{position:fixed;left:0;right:0;top:0;height:42px;z-index:70;display:flex;align-items:center;gap:8px;padding:0 12px;background:var(--panel-solid,#15112a);border-bottom:1px solid var(--line,#3b3252);color:var(--fg,#f0e6d0);font:13px var(--f-pix,system-ui)}
#st-top b{font:11px var(--f-label,monospace);letter-spacing:.08em;color:var(--amber,#ffb35c);margin-right:8px}
#st-top button{font:inherit;color:inherit;background:#221b38;border:1px solid var(--line,#3b3252);padding:5px 14px;cursor:pointer}#st-top button.on{background:var(--amber,#ffb35c);color:#1a1226;border-color:var(--amber,#ffb35c)}
#st-top .sp{flex:1}#st-top label{font-size:12px;color:var(--muted,#a89fbd)}#st-top input[type=range]{width:120px}
#st-left,#st-right{position:fixed;top:52px;bottom:10px;z-index:60;background:var(--panel-solid,#15112a);border:1px solid var(--line,#3b3252);color:var(--fg,#f0e6d0);font:13px/1.35 var(--f-pix,system-ui);padding:10px 12px;overflow:auto;box-shadow:0 6px 24px rgba(0,0,0,.5)}
#st-left{left:10px;width:270px}#st-right{right:10px;width:310px}
#st-left h4,#st-right h4{margin:8px 0 6px;font:11px var(--f-label,monospace);letter-spacing:.06em;text-transform:uppercase;color:var(--amber,#ffb35c)}
#st-left input[type=search],#st-right input[type=number],#st-right input[type=text],#st-right select{width:100%;box-sizing:border-box;font:inherit;font-size:12px;background:#0d0b1a;color:inherit;border:1px solid var(--line,#3b3252);padding:3px 5px}
.st-list div{padding:3px 6px;cursor:pointer;font-size:12px;border-bottom:1px solid rgba(59,50,82,.4)}.st-list div:hover{background:#2c2346}.st-list div.on{background:#3a2f58}.st-list small{color:var(--muted,#a89fbd)}
#st-left button,#st-right button{font:inherit;font-size:12px;color:inherit;background:#221b38;border:1px solid var(--line,#3b3252);padding:4px 7px;cursor:pointer;margin:2px 2px 2px 0}#st-left button:hover,#st-right button:hover{border-color:var(--amber,#ffb35c)}#st-right button.on,#st-left button.on{background:var(--amber,#ffb35c);color:#1a1226}
.st-hint{font-size:11px;color:var(--muted,#a89fbd);margin:4px 0}.st-xyz{display:grid;grid-template-columns:64px 1fr 1fr 1fr;gap:4px;align-items:center;margin:3px 0}.st-xyz label{font-size:12px;color:var(--muted,#a89fbd)}
.st-cat{font:10px var(--f-label,monospace);text-transform:uppercase;color:var(--muted,#a89fbd);margin-top:6px;cursor:pointer}
#st-cv{position:fixed;left:0;top:42px;width:100vw;height:calc(100vh - 42px);z-index:50;display:block;background:#1a1822}
#st-busy{position:fixed;left:50%;top:60px;transform:translateX(-50%);z-index:80;background:#15112a;border:1px solid #ffb35c;color:#ffb35c;padding:6px 14px;font:12px var(--f-label,monospace)}
#st-tip{position:fixed;z-index:80;pointer-events:none;background:#15112a;border:1px solid #3b3252;color:#f0e6d0;padding:2px 6px;font:12px var(--f-pix,system-ui)}`;
  function boot() {
    const st0 = document.createElement('style'); st0.textContent = CSS; document.head.appendChild(st0);
    const go = () => {
      if (!window.__pv || !window.Editor) return setTimeout(go, 200);
      pv = window.__pv; const ui = pv.ui;
      if (ui.intro) { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return setTimeout(go, 200); }
      const st = pv.st; st.npcs.length = 0; st.vehicles.length = 0; if (st.pickups) st.pickups.length = 0; st.feed.length = 0;
      st.t = Math.floor(st.t / 1440) * 1440 + 13 * 60;
      Editor.toggle(true); ui.zoom = 1; ready = true;
      Editor.hooks.dbl = onMapDouble; Editor.hooks.esc = onMapEsc;
      buildChrome(); show('mappa');
      requestAnimationFrame(tick);
    };
    go();
  }
  // il gioco sotto non disegna e non va avanti quando si è nell'hangar
  const hidesGame = () => ready && sec === 'modelli';

  // =====================================================================================================
  // BARRA IN ALTO E PANNELLO A SINISTRA
  // =====================================================================================================
  let left = null, right = null, top = null;
  function buildChrome() {
    top = document.createElement('div'); top.id = 'st-top';
    top.innerHTML = `<b>PORTO VECCHIO · STUDIO</b><button data-s="mappa">Mappa</button><button data-s="interni">Interni</button><button data-s="modelli">Modelli</button><span class="sp"></span>
      <label>Ora <input type="range" id="st-ora" min="0" max="23.75" step="0.25" value="13"></label><span id="st-oral" style="font-size:12px;width:44px">13:00</span>`;
    document.body.appendChild(top);
    top.querySelectorAll('[data-s]').forEach(b => b.onclick = () => show(b.dataset.s));
    $('st-ora').oninput = e => { const h = +e.target.value, st = pv.st; st.t = Math.floor(st.t / 1440) * 1440 + h * 60; $('st-oral').textContent = String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.round(h % 1 * 60)).padStart(2, '0'); };
    left = document.createElement('div'); left.id = 'st-left'; document.body.appendChild(left);
    right = document.createElement('div'); right.id = 'st-right'; right.hidden = true; document.body.appendChild(right);
    [left, right, top].forEach(el => { el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('wheel', e => e.stopPropagation()); });
  }
  function show(s) {
    if (s !== 'modelli') { iso = null; back = s; }
    sec = s; top.querySelectorAll('[data-s]').forEach(b => b.classList.toggle('on', b.dataset.s === s));
    const H = s === 'modelli';
    Editor.suspend(H); $('cv').style.visibility = H ? 'hidden' : '';
    if (cv2) cv2.style.display = H ? 'block' : 'none';
    right.hidden = !H;
    if (s === 'mappa') { left.hidden = true; const p = pv.st.player; if (p.indoor) leaveBuilding(); }
    else if (s === 'interni') { left.hidden = false; renderInterni(); }
    else { left.hidden = false; openHangar(); }
  }

  // =====================================================================================================
  // INTERNI
  // =====================================================================================================
  let bq = '';
  function bName(b) { return b.name || (b.use ? b.use.replace(/_/g, ' ') : 'edificio'); }
  function renderInterni() {
    const G = pv.G, p = pv.st.player, cur = p.indoor ? p.indoor.b : -1, q = bq.toLowerCase(), W = G.MAP && G.MAP.world;
    const list = G.BUILDINGS.map((b, i) => ({ b, i })).filter(x => x.b.door && (!q || (bName(x.b) + ' ' + (x.b.use || '')).toLowerCase().includes(q)));
    let h = `<h4>Interni</h4><input type="search" id="st-bq" placeholder="cerca (bar, casa, caserma…)" value="${esc(bq)}">`;
    if (cur >= 0) {
      const b = G.BUILDINGS[cur], L = G.INT.layout(b);
      h += `<h4>${esc(bName(b))}</h4><div>${L.floors.map((F, f) => `<button data-f="${f}" class="${p.indoor.f === f ? 'on' : ''}">${esc(G.INT.floorLabel ? G.INT.floorLabel(f) : 'piano ' + f)}</button>`).join('')}</div>
        <button id="st-out">← Torna alla mappa qui</button><div class="st-hint">Muovi i mobili col pannello a destra. Doppio clic su un mobile: il suo modello, da solo.</div>`;
    }
    h += `<h4>${list.length} edifici</h4><div class="st-list">${list.slice(0, 400).map(x => `<div data-b="${x.i}" class="${x.i === cur ? 'on' : ''}">${esc(bName(x.b))} <small>${x.b.fl > 1 ? x.b.fl + ' piani' : ''} ${W && W.districtAt ? esc(W.districtAt((x.b.x + x.b.w / 2) * 2) || '') : ''}</small></div>`).join('')}</div>`;
    left.innerHTML = h;
    const inp = $('st-bq'); inp.oninput = () => { bq = inp.value; const pos = inp.selectionStart; renderInterni(); const i2 = $('st-bq'); i2.focus(); i2.setSelectionRange(pos, pos); };
    left.querySelectorAll('[data-b]').forEach(d => d.onclick = () => enterBuilding(+d.dataset.b));
    left.querySelectorAll('[data-f]').forEach(d => d.onclick = () => { p.indoor.f = +d.dataset.f; Editor.deselect(); renderInterni(); Editor.render(); });
    const out = $('st-out'); if (out) out.onclick = () => show('mappa');
  }
  function enterBuilding(bi, f) {
    const G = pv.G, b = G.BUILDINGS[bi], L = G.INT.layout(b), p = pv.st.player;
    p.indoor = { b: bi, f: f || 0 }; const at = L.ent ? L.ent.in : [(b.x + b.w / 2) * 2, (b.y + b.h / 2) * 2]; p.x = at[0]; p.y = at[1];
    const fx = (b.x + b.w / 2) * 2, fy = (b.y + b.h / 2) * 2; Editor.setFocus(fx, fy); pv.R.cam.x = fx; pv.R.cam.y = fy; Editor.deselect();   // la camera salta subito lì
    if (sec !== 'interni') show('interni'); else renderInterni(); Editor.render();
  }
  function leaveBuilding() {
    const G = pv.G, p = pv.st.player; if (!p.indoor) return; const b = G.BUILDINGS[p.indoor.b]; p.indoor = null;
    if (b && b.door) { p.x = (b.door[0] + .5) * 2; p.y = (b.door[1] + .5) * 2; Editor.setFocus(p.x, p.y); }
    Editor.deselect(); Editor.render();
  }
  function onMapDouble(s, nx, ny) {
    if (s) { const k = Editor.modelKey(s); if (k) { isolate(k, sec); return; } }
    if (pv.st.player.indoor) return;
    const g = pv.R.screenToGround(nx, ny); if (!g) return;
    const tx = Math.floor(g.x / 2), ty = Math.floor(g.y / 2);
    const bi = pv.G.BUILDINGS.findIndex(b => b.door && tx >= b.x - 1 && tx < b.x + b.w + 1 && ty >= b.y - 1 && ty < b.y + b.h + 1);
    if (bi >= 0) enterBuilding(bi);
  }
  function onMapEsc() { if (sec === 'interni' && pv.st.player.indoor) show('mappa'); }

  // =====================================================================================================
  // L'HANGAR: tutti i modelli in fila, per categoria
  // =====================================================================================================
  let cv2 = null, R2 = null, S2 = null, cam2 = null, hang = null, isoRoot = null, items = [], cats = [], built = false, building = false;
  const view = { tx: 14, tz: 10, ty: .6, yaw: -.5, pitch: .7, dist: 30 }, held = {};
  let hsel = null, hover = null, boxH = null, boxS = null, mq = '';
  function initHangar() {
    cv2 = document.createElement('canvas'); cv2.id = 'st-cv'; document.body.appendChild(cv2);
    R2 = new THREE.WebGLRenderer({ canvas: cv2, antialias: true }); R2.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R2.shadowMap.enabled = true;
    if (THREE.sRGBEncoding) R2.outputEncoding = THREE.sRGBEncoding;
    S2 = new THREE.Scene(); S2.background = new THREE.Color('#24212c'); S2.fog = new THREE.Fog('#24212c', 60, 160);
    cam2 = new THREE.PerspectiveCamera(40, 1, .05, 400);
    S2.add(new THREE.HemisphereLight('#e8ecf4', '#3a3440', .9));
    const sun = new THREE.DirectionalLight('#fff4e0', 1.1); sun.position.set(20, 40, 25); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 140 }); S2.add(sun, sun.target); S2.userData.sun = sun;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ color: '#4a4650', roughness: .95 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; S2.add(fl);
    const grid = new THREE.GridHelper(600, 300, '#5c5866', '#55515e'); grid.position.y = .002; S2.add(grid);
    hang = new THREE.Group(); S2.add(hang); isoRoot = new THREE.Group(); S2.add(isoRoot);
    boxH = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#f0e6d0')); boxS = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color('#ffb35c')); boxH.visible = boxS.visible = false; S2.add(boxH, boxS);
    cv2.addEventListener('pointerdown', onDown2); addEventListener('pointermove', onMove2); addEventListener('pointerup', onUp2);
    cv2.addEventListener('wheel', e => { e.preventDefault(); view.dist = Math.max(.6, Math.min(120, view.dist * (e.deltaY > 0 ? 1.12 : 1 / 1.12))); }, { passive: false });
    cv2.addEventListener('contextmenu', e => e.preventDefault());
  }
  function label(text, size, col) {
    const c = document.createElement('canvas'), x = c.getContext('2d'), f = 48; x.font = `600 ${f}px "Instrument Sans", sans-serif`;
    const w = Math.ceil(x.measureText(text).width) + 24; c.width = w; c.height = f + 20; x.font = `600 ${f}px "Instrument Sans", sans-serif`;
    x.fillStyle = 'rgba(20,16,30,.78)'; x.fillRect(0, 0, w, c.height); x.fillStyle = col || '#ffb35c'; x.textBaseline = 'middle'; x.fillText(text, 12, c.height / 2 + 2);
    const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false })); s.scale.set(size * w / c.height, size, 1); return s;
  }
  // le categorie: chiave, nome, come si costruisce
  function catalog() {
    const G = pv.G, I = G.INT, out = [];
    const nm = (id) => (I.FNAME && I.FNAME[id]) || id;
    const ids = new Set([...Object.keys(I.SZ || {}), ...Object.keys(I.DECOR || {}), ...Object.keys(I.SMALL || {}), ...Object.keys((I.EXTRA && I.EXTRA.sz) || {})]);
    out.push({ nome: 'Mobili e oggetti degli interni', items: [...ids].sort().map(id => ({ key: 'mobile:' + id, nome: nm(id) })) });
    // arredo di strada: una voce per ogni forma diversa, con quante volte c'è
    const seen = new Map(); pv.R.__ed.DZ.props.forEach(rec => { const o = Officina.orig(rec.obj); if (!o) return; const k = 'strada:' + Officina.sig(o); let e = seen.get(k); if (!e) { e = { key: k, nome: rec.obj.userData.__nome || 'oggetto', n: 0, orig: o }; seen.set(k, e); } e.n++; });
    out.push({ nome: 'Arredo di strada', items: [...seen.values()].sort((a, b) => a.nome.localeCompare(b.nome) || b.n - a.n).map(e => Object.assign(e, { nome: e.nome + ' ×' + e.n })) });
    if (window.Pezzi) out.push({ nome: 'Pezzi dei covi', items: Object.keys(Pezzi.__off || Pezzi).filter(k => typeof (Pezzi.__off || Pezzi)[k] === 'function' && k !== 'mat').map(k => ({ key: 'pezzi:' + k, nome: k })) });
    if (window.Bottino) out.push({ nome: 'Bottino per terra', items: Object.keys(Bottino.MODEL).filter(k => typeof Bottino.MODEL[k] === 'function').map(k => ({ key: 'bottino:' + k, nome: k })) });
    if (window.Oggetti) out.push({ nome: 'Oggetti (in mano: dove manca il modello se ne carica uno)', items: Object.keys(Oggetti.CAT).filter(id => !Oggetti.CAT[id].capo).sort().map(id => ({ key: 'ogg:' + id, nome: Oggetti.CAT[id].nome || id })) });
    if (window.Guardaroba) out.push({ nome: 'Vestiti', items: Object.keys(Guardaroba.CAPO).map(id => ({ key: 'capo:' + id, nome: Guardaroba.CAPO[id].nome || id })) });
    if (window.Kit && Kit.names) { const by = {}; Kit.names().forEach(n => { const k = n.split('/')[0]; (by[k] = by[k] || []).push(n); }); Object.keys(by).sort().forEach(k => out.push({ nome: 'Pezzi degli edifici · ' + k, items: by[k].sort().map(n => ({ key: 'kit:' + n, nome: n.split('/').slice(1).join('/') })) })); }
    out.push({ nome: 'Modelli caricati', items: (Editor.ritocchi.files || []).map(f => ({ key: 'glb:' + f.file, nome: f.nome || f.file })) });
    return out;
  }
  const look0 = { skin: '#dcae88', top: '#8a8a8a', bottom: '#5a5a5a', hair: '#2a2018', hat: 'none', build: 1, extra: '' };
  // costruisce il modello come si vede nel gioco (con le modifiche); grezzo = senza
  async function makeModel(key, raw, entry) {
    if (/^capo:/.test(key)) return mannequin(key.slice(5));
    if (/^strada:/.test(key)) { const it = items.find(x => x.key === key) || (cats.length ? null : null); const o = (it && it.orig) || origOf(key); if (!o) return null; const g = o.clone(true); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.updateMatrixWorld(true); g.userData.__mod = null; if (!raw || entry) Officina.apply(key, g, entry || null); return g; }
    const g = await Officina.build(key, raw || !!entry); if (g && entry) Officina.apply(key, g, entry);
    if (g && /^ogg:/.test(key) && !g.children.length) { const ph = new THREE.Mesh(new THREE.BoxGeometry(.25, .25, .25), new THREE.MeshStandardMaterial({ color: '#6a6470', wireframe: true })); ph.position.y = .125; ph.userData.segnaposto = true; g.add(ph); }
    return g;
  }
  function origOf(key) { const sig = key.slice(7); for (const rec of pv.R.__ed.DZ.props) { const o = Officina.orig(rec.obj); if (o && Officina.sig(o) === sig) return o; } return null; }
  function mannequin(id) {
    if (!window.Models || !Models.charsReady || !Models.charsReady() || !window.Vesti3D) return null;
    const g = Models.person(look0, 'npc'); if (!g) return null; const C = Object.assign({}, Guardaroba.CAPO[id]);
    try { Vesti3D.dress(g, [C], look0); if (window.Officina) Officina.onDress(g, [C]); } catch (e) { console.warn('[studio] vestito', id, e); }
    g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.userData.capo = id; return g;
  }
  async function openHangar() {
    if (!cv2) initHangar(); resize2();
    if (!built && !building) buildHangar();
    renderLeftModels(); renderRight();
  }
  async function buildHangar() {
    building = true; cats = catalog(); items = []; while (hang.children.length) hang.remove(hang.children[0]);
    const busy = document.createElement('div'); busy.id = 'st-busy'; document.body.appendChild(busy);
    let z = 0; const ROW = 46;
    for (const c of cats) {
      const lab = label(c.nome, 1.1); lab.position.set(-1, 2.2, z); lab.center.set(0, .5); hang.add(lab); c.z = z;
      let x = 0, line = 0, n = 0; z += 2.2;
      for (const it of c.items) {
        if (n++ % 6 === 0) { busy.textContent = `Preparo l'hangar · ${c.nome} · ${n}/${c.items.length}`; await new Promise(r => requestAnimationFrame(r)); }
        let g = null; try { g = await makeModel(it.key); } catch (e) { console.warn('[studio]', it.key, e.message); }
        if (!g) continue;
        const holder = new THREE.Group(); holder.add(g); g.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(g); if (bb.isEmpty()) continue;
        const sz = bb.getSize(V3()); if (Math.max(sz.x, sz.y, sz.z) > 60) continue;
        g.position.x -= bb.min.x; g.position.z -= (bb.min.z + bb.max.z) / 2; g.position.y -= bb.min.y;
        if (x + sz.x > ROW && x > 0) { x = 0; z += line + 1.6; line = 0; }
        holder.position.set(x, 0, z + sz.z / 2); x += sz.x + .7; line = Math.max(line, sz.z);
        holder.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        hang.add(holder); holder.updateMatrixWorld(true);
        const lb = label(it.nome, .22, '#f0e6d0'); lb.position.set(holder.position.x + sz.x / 2, sz.y + .25, holder.position.z); lb.visible = false; hang.add(lb);
        items.push(Object.assign(it, { cat: c.nome, holder, g, box: new THREE.Box3().setFromObject(holder), lab: lb }));
      }
      z += line + 5;
    }
    busy.remove(); built = true; building = false; renderLeftModels();
  }
  async function rebuildItem(it) {
    if (!it || !it.holder) return; const g = await makeModel(it.key); if (!g) return;
    it.holder.remove(it.g); g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g);
    g.position.x -= bb.min.x; g.position.z -= (bb.min.z + bb.max.z) / 2; g.position.y -= bb.min.y; g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    it.holder.add(g); it.g = g; it.holder.updateMatrixWorld(true); it.box.setFromObject(it.holder);
  }
  function renderLeftModels() {
    if (sec !== 'modelli' || !left) return;
    const q = mq.toLowerCase();
    let h = `<h4>Modelli ${building ? '(preparo…)' : ''}</h4><input type="search" id="st-mq" placeholder="cerca un modello" value="${esc(mq)}">
      <div class="st-hint">WASD muovi · Q/E gira · tasto destro trascina: guarda · rotella: avvicina · clic: prendi · doppio clic: vista isolata · Esc indietro</div>
      <button id="st-up">Carica un modello nuovo (.glb)</button><input type="file" id="st-upf" accept=".glb" hidden>`;
    cats.forEach((c, ci) => { const L = c.items.filter(it => !q || it.nome.toLowerCase().includes(q) || it.key.toLowerCase().includes(q)); if (!L.length) return;
      h += `<div class="st-cat" data-c="${ci}">${esc(c.nome)} · ${L.length}</div>` + (q ? `<div class="st-list">${L.slice(0, 80).map(it => `<div data-k="${esc(it.key)}" class="${hsel && hsel.key === it.key ? 'on' : ''}">${esc(it.nome)}</div>`).join('')}</div>` : ''); });
    left.innerHTML = h;
    const inp = $('st-mq'); inp.oninput = () => { mq = inp.value; const p = inp.selectionStart; renderLeftModels(); const i2 = $('st-mq'); i2.focus(); i2.setSelectionRange(p, p); };
    left.querySelectorAll('[data-c]').forEach(d => d.onclick = () => { const c = cats[+d.dataset.c]; if (iso) closeIso(); view.tx = 8; view.tz = c.z + 6; view.ty = .6; view.dist = 22; view.pitch = .55; });
    left.querySelectorAll('[data-k]').forEach(d => d.onclick = () => { const it = items.find(x => x.key === d.dataset.k); if (!it) return; if (iso) closeIso(); selectItem(it); flyTo(it); });
    $('st-up').onclick = () => $('st-upf').click(); $('st-upf').onchange = async e => { const f = e.target.files[0]; if (!f) return; const file = await upload(f); if (file) { built = false; buildHangar(); } };
  }
  function flyTo(it) { const c = it.box.getCenter(V3()), s = it.box.getSize(V3()); view.tx = c.x; view.tz = c.z; view.ty = c.y * .6; view.dist = Math.max(2.5, Math.max(s.x, s.y, s.z) * 2.6); }
  function selectItem(it) { hsel = it; renderRight(); renderLeftModels(); }

  // carica un .glb: sul server se c'è (ritocchi/modelli), altrimenti solo per questa sessione
  async function upload(f, quiet) {
    const nome = f.name.replace(/[^\w.-]+/g, '_').replace(/\.glb$/i, '') + '.glb', buf = await f.arrayBuffer();
    let file = 'ritocchi/modelli/' + nome;
    if (Editor.server) { try { const r = await fetch('api/ritocchi/file?nome=' + encodeURIComponent(nome), { method: 'POST', body: buf }); const j = await r.json(); if (!j.ok) throw new Error(j.errore || r.status); file = j.file; } catch (e) { alert('Non riesco a salvare il modello: ' + e.message); return null; } }
    else file = 'locale/' + nome;
    try { await Officina.parseGlb(file, buf); } catch (e) { alert('Il file non si apre come .glb: ' + e.message); return null; }
    Editor.addFile({ file, nome: f.name });
    if (!quiet) pvToast(Editor.server ? 'Modello caricato in ' + file : 'Modello caricato solo per adesso: senza server (AVVIA.bat) non resta.');
    return file;
  }
  const pvToast = m => { const s = pv.st; s.feed.unshift({ text: m, kind: 'info', until: s.clock + 4 }); console.log('[studio]', m); };

  // =====================================================================================================
  // VISTA ISOLATA: il modello da solo, pezzo per pezzo
  // =====================================================================================================
  let isoG = null, isoRaw = null, part = null, entry = null, pdrag = null;
  const clone = o => JSON.parse(JSON.stringify(o || null));
  async function isolate(key, from) {
    back = from || (iso ? back : 'modelli'); if (sec !== 'modelli') { sec = 'modelli'; show('modelli'); }
    iso = { key }; part = null; hang.visible = false; boxH.visible = boxS.visible = false;
    entry = loadEntry(key);
    await rebuildIso(true); renderRight(); renderLeftModels();
  }
  // la voce del modello da modificare: per i vestiti { col, sp, parti[], modello }, per gli altri { parti{}, nuove[] … }
  function loadEntry(k) { if (/^capo:/.test(k)) return clone(Editor.ritocchi.vestiti[k.slice(5)]) || {}; const e = clone(Editor.ritocchi.modelli[k]) || {}; e.parti = e.parti || {}; e.nuove = e.nuove || []; return e; }
  async function rebuildIso(fit) {
    while (isoRoot.children.length) isoRoot.remove(isoRoot.children[0]);
    const key = iso.key; let g;
    if (/^capo:/.test(key)) g = mannequin(key.slice(5));
    else { g = await makeModel(key, true, entry); }
    if (!g) { pvToast('Questo modello non si costruisce qui.'); return; }
    g.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g); g.position.y -= bb.min.y; g.position.x -= (bb.min.x + bb.max.x) / 2; g.position.z -= (bb.min.z + bb.max.z) / 2;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    isoRoot.position.set(-200, 0, -200); isoRoot.add(g); isoG = g; isoRoot.updateMatrixWorld(true);
    if (fit) { const b2 = new THREE.Box3().setFromObject(g), c = b2.getCenter(V3()), s = b2.getSize(V3()); view.tx = c.x - isoRoot.position.x; view.tz = c.z - isoRoot.position.z; view.ty = c.y; view.dist = Math.max(1.2, Math.max(s.x, s.y, s.z) * 2.2); view.pitch = .35; }
    if (part) part.mesh = findPart(part);
  }
  function findPart(p) { let m = null; isoG.traverse(o => { if (!m && o.isMesh && (p.nuova !== undefined ? o.userData.__nuova === p.nuova : o.userData.__i === p.i && o.userData.__nuova === undefined)) m = o; }); return m; }
  function closeIso() { iso = null; part = null; while (isoRoot.children.length) isoRoot.remove(isoRoot.children[0]); hang.visible = true; if (back !== 'modelli') { const b = back; show(b); return; } if (hsel) { rebuildItem(hsel); flyTo(hsel); } renderRight(); renderLeftModels(); }
  // salva la voce del modello e lo ricostruisce
  async function commit() {
    const k = iso.key;
    if (/^capo:/.test(k)) { const e = Object.keys(entry).length ? entry : null; Editor.setVestito(k.slice(5), e); }
    else { const empty = !entry.file && !Object.keys(entry.parti).length && !entry.nuove.length; Editor.setModel(k, empty ? null : clone(entry)); }
    await rebuildIso(false); renderRight();
  }
  // la voce del pezzo selezionato (parti[i] per i pezzi d'origine, nuove[j] per quelli aggiunti)
  const pentry = () => part.nuova !== undefined ? entry.nuove[part.nuova] : (entry.parti[part.i] = entry.parti[part.i] || {});
  function readPart() { const m = part.mesh; return { p: m.position.toArray().map(r3), r: [m.rotation.x, m.rotation.y, m.rotation.z].map(r3), s: m.scale.toArray().map(r3), c: m.material && !Array.isArray(m.material) && m.material.color ? '#' + m.material.color.getHexString() : '#ffffff' }; }
  function writePart(T) { const e = pentry(); Object.assign(e, T); if (e.togli === false) delete e.togli; }

  // =====================================================================================================
  // PANNELLO A DESTRA (hangar e vista isolata)
  // =====================================================================================================
  function renderRight() {
    if (!right || sec !== 'modelli') return;
    let h = '';
    if (!iso) {
      if (!hsel) h = `<h4>Hangar</h4><div class="st-hint">Clic su un modello per prenderlo, doppio clic per aprirlo da solo e modificarlo. Le file sono per categoria (a sinistra per saltare).</div>`;
      else { const e = Editor.ritocchi.modelli[hsel.key];
        h = `<h4>${esc(hsel.nome)}</h4><div class="st-hint">${esc(hsel.key)}${e ? ' · modificato' : ''}</div>
          <button data-a="open">Apri e modifica (doppio clic)</button>${/^(mobile|kit|glb|pezzi|bottino):/.test(hsel.key) ? '<button data-a="posa">Posalo nella mappa / qui dentro</button>' : ''}`; }
    } else {
      const k = iso.key, isCapo = /^capo:/.test(k);
      h = `<h4>${esc((items.find(x => x.key === k) || {}).nome || k)}</h4><div class="st-hint">${esc(k)} · Esc torna indietro</div>`;
      if (isCapo) h += capoPanel(k.slice(5));
      else {
        h += `<div><button data-a="glb">${entry.file ? 'Cambia il .glb' : (/^ogg:/.test(k) && !entry.file ? 'Carica il suo modello (.glb)' : 'Sostituisci con un .glb')}</button>${entry.file ? `<button data-a="noglb">Togli il .glb</button><label class="st-hint"><input type="checkbox" id="st-fit" ${entry.fit !== false ? 'checked' : ''}> stessa misura di prima</label>` : ''}<input type="file" id="st-glbf" accept=".glb" hidden></div>
          <h4>Aggiungi una forma</h4><div>${['box', 'cilindro', 'sfera', 'cono'].map(t => `<button data-add="${t}">${t}</button>`).join('')}</div>`;
        if (part && part.mesh) { const T = readPart(), row = (l, k2, v, st) => `<div class="st-xyz"><label>${l}</label>${v.map((x, i) => `<input type="number" step="${st}" data-p="${k2}${i}" value="${k2 === 'r' ? deg(x) : x}">`).join('')}</div>`;
          h += `<h4>Pezzo ${part.nuova !== undefined ? 'aggiunto ' + (part.nuova + 1) : part.i + 1} · ${esc(part.mesh.name || part.mesh.geometry.type.replace('Geometry', ''))}</h4>`
            + row('posizione', 'p', T.p, .01) + row('rotazione°', 'r', T.r, 5) + row('misura', 's', T.s, .05)
            + `<div class="st-xyz"><label>colore</label><input type="color" id="st-col" value="${T.c}"></div>
            <div><button data-a="pdel">Togli <small>Canc</small></button><button data-a="pdup">Duplica <small>Ctrl+D</small></button>${part.nuova === undefined ? '<button data-a="prev">Com\'era</button>' : ''}</div>
            <div class="st-hint">Trascina il pezzo per spostarlo (Maiusc: in su e in giù). R ruota 15°, PagSu/PagGiù alza, +/− misura.</div>`; }
        else h += `<div class="st-hint">Clic su un pezzo del modello per prenderlo.</div>`;
        const nt = Object.values(entry.parti).filter(p => p.togli).length;
        h += `<h4>Tutto il modello</h4>${nt ? `<button data-a="rimetti">Rimetti i ${nt} pezzi tolti</button>` : ''}<button data-a="reset">Torna com'era</button>${/^(mobile|kit|glb|pezzi|bottino):/.test(k) ? '<button data-a="posa">Posalo nella mappa / qui dentro</button>' : ''}
          <div class="st-hint">${/^(strada|kit):/.test(k) ? 'Sulla mappa le modifiche si vedono dopo aver ricaricato la pagina (questi pezzi sono fusi nella città).' : 'Le modifiche valgono anche nel gioco.'}</div>`;
      }
      h += `<div><button data-a="undo">Annulla <small>Ctrl+Z</small></button><button data-a="redo">Rifai</button></div>`;
    }
    right.innerHTML = h;
    const A = { open: () => hsel && isolate(hsel.key, 'modelli'), posa: () => posaKey(iso ? iso.key : hsel.key), glb: () => $('st-glbf').click(), noglb: () => { delete entry.file; delete entry.fit; entry.parti = {}; part = null; commit(); },
      pdel: () => delPart(), pdup: () => dupPart(), prev: () => { delete entry.parti[part.i]; commit(); }, rimetti: () => { Object.keys(entry.parti).forEach(i => { if (entry.parti[i].togli) delete entry.parti[i]; }); commit(); },
      reset: () => { entry = /^capo:/.test(iso.key) ? {} : { parti: {}, nuove: [] }; part = null; commit(); }, undo: () => undoRedo(true), redo: () => undoRedo(false) };
    right.querySelectorAll('[data-a]').forEach(b => b.onclick = () => A[b.dataset.a] && A[b.dataset.a]());
    right.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const bb = new THREE.Box3().setFromObject(isoG), s = bb.getSize(V3()), d = Math.max(.1, Math.min(s.x, s.y, s.z, 1) * .4);
      const top = isoG.worldToLocal(new THREE.Vector3((bb.min.x + bb.max.x) / 2, bb.max.y + d / 2, (bb.min.z + bb.max.z) / 2));   // appoggiata in cima al modello
      entry.nuove.push({ t: b.dataset.add, p: top.toArray().map(r3), r: [0, 0, 0], s: [d, d, d].map(r3), c: '#c8a070' }); part = { nuova: entry.nuove.length - 1 }; commit(); });
    const gf = $('st-glbf'); if (gf) gf.onchange = async e => { const f = e.target.files[0]; if (!f) return; const file = await upload(f, true); if (!file) return; entry.file = file; entry.fit = true; entry.parti = {}; part = null; commit(); };
    const fit = $('st-fit'); if (fit) fit.onchange = () => { entry.fit = fit.checked; commit(); };
    right.querySelectorAll('[data-p]').forEach(inp => inp.onchange = () => { if (!part || !part.mesh) return; const T = readPart(), k2 = inp.dataset.p[0], i = +inp.dataset.p[1], v = parseFloat(inp.value); if (!isFinite(v)) return; T[k2][i] = k2 === 'r' ? v * Math.PI / 180 : v; writePart({ p: T.p, r: T.r, s: T.s }); commit(); });
    const col = $('st-col'); if (col) col.onchange = () => { writePart({ c: col.value }); commit(); };
    if (iso && /^capo:/.test(iso.key)) bindCapo(iso.key.slice(5));
  }
  function delPart() { if (!part) return; if (part.nuova !== undefined) entry.nuove.splice(part.nuova, 1); else entry.parti[part.i] = { togli: true }; part = null; commit(); }
  function dupPart() { if (!part || !part.mesh) return; const T = readPart(); T.p[0] = r3(T.p[0] + .1);
    if (part.nuova !== undefined) entry.nuove.push(Object.assign(clone(entry.nuove[part.nuova]), { p: T.p })); else entry.nuove.push({ da: part.i, p: T.p, r: T.r, s: T.s });
    part = { nuova: entry.nuove.length - 1 }; commit(); }
  function undoRedo(u) { if (u) Editor.annulla(); else Editor.rifai(); if (iso) { const k = iso.key; entry = loadEntry(k); if (part && entry.nuove && part.nuova !== undefined && part.nuova >= entry.nuove.length) part = null; rebuildIso(false).then(renderRight); } }
  function posaKey(k) { const to = pv.st.player.indoor ? 'interni' : 'mappa'; iso = null; hang.visible = true; show(to); setTimeout(() => Editor.posa(k), 50); }

  // ---------------- i vestiti ----------------
  function capoPanel(id) {
    const C = Guardaroba.CAPO[id], O = C.__orig || C, v = entry, parti = v.parti || O.parti, m = v.modello || {};
    const bones = []; if (isoG) isoG.traverse(o => { if (o.isBone) bones.push(o.name); });
    return `<div class="st-xyz"><label>colore</label><input type="color" id="st-ccol" value="${v.col || O.col}"></div>
      <div class="st-xyz"><label>spessore</label><input type="number" id="st-csp" step="0.005" value="${v.sp != null ? v.sp : O.sp}"></div>
      <h4>Dove copre</h4><div>${Object.keys(Vesti3D.PARTI).map(p => `<label class="st-hint" style="display:inline-block;margin-right:8px"><input type="checkbox" data-pt="${p}" ${parti.includes(p) ? 'checked' : ''}> ${p}</label>`).join('')}</div>
      <h4>Un modello agganciato (.glb)</h4><div><button data-c="glb">${m.file ? 'Cambia il .glb' : 'Carica un .glb'}</button>${m.file ? '<button data-c="noglb">Toglilo</button>' : ''}<input type="file" id="st-cglbf" accept=".glb" hidden></div>
      ${m.file ? `<div class="st-xyz"><label>osso</label><select id="st-cosso" style="grid-column:span 3">${bones.map(b => `<option ${b === (m.osso || 'Chest') ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
        <div class="st-xyz"><label>posizione</label>${[0, 1, 2].map(i => `<input type="number" step="0.01" data-cm="p${i}" value="${(m.p || [0, 0, 0])[i]}">`).join('')}</div>
        <div class="st-xyz"><label>rotazione°</label>${[0, 1, 2].map(i => `<input type="number" step="5" data-cm="r${i}" value="${deg((m.r || [0, 0, 0])[i])}">`).join('')}</div>
        <div class="st-xyz"><label>misura</label><input type="number" step="0.05" data-cm="s0" value="${m.s || 1}"></div>` : ''}
      <button data-c="reset">Torna com'era</button><div class="st-hint">Le modifiche valgono per chi lo indossa, anche nel gioco.</div>`;
  }
  function bindCapo(id) {
    const C = Guardaroba.CAPO[id], O = C.__orig || C, v = entry;
    const set = () => commit();
    const cc = $('st-ccol'); if (cc) cc.onchange = () => { v.col = cc.value; set(); };
    const cs = $('st-csp'); if (cs) cs.onchange = () => { v.sp = parseFloat(cs.value) || 0; set(); };
    right.querySelectorAll('[data-pt]').forEach(b => b.onchange = () => { const P = new Set(v.parti || O.parti); if (b.checked) P.add(b.dataset.pt); else P.delete(b.dataset.pt); v.parti = [...P]; set(); });
    const A = { glb: () => $('st-cglbf').click(), noglb: () => { delete v.modello; set(); }, reset: () => { entry = {}; commit(); } };
    right.querySelectorAll('[data-c]').forEach(b => b.onclick = () => A[b.dataset.c]());
    const f = $('st-cglbf'); if (f) f.onchange = async e => { const fl = e.target.files[0]; if (!fl) return; const file = await upload(fl, true); if (!file) return; v.modello = Object.assign(v.modello || { osso: 'Chest', p: [0, 0, .1], r: [0, 0, 0], s: 1 }, { file }); set(); };
    const os = $('st-cosso'); if (os) os.onchange = () => { v.modello.osso = os.value; set(); };
    right.querySelectorAll('[data-cm]').forEach(inp => inp.onchange = () => { const M = v.modello, k = inp.dataset.cm[0], i = +inp.dataset.cm[1], x = parseFloat(inp.value); if (!isFinite(x)) return; if (k === 's') M.s = x; else { M[k] = M[k] || [0, 0, 0]; M[k][i] = k === 'r' ? x * Math.PI / 180 : x; } set(); });
  }

  // =====================================================================================================
  // CAMERA E MOUSE NELL'HANGAR
  // =====================================================================================================
  const RC = new THREE.Raycaster(), M2 = new THREE.Vector2(); let look = null, last = 0;
  function ray(e) { const r = cv2.getBoundingClientRect(); M2.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); RC.setFromCamera(M2, cam2); return RC.ray; }
  function pickItem(e) { const r = ray(e), v = V3(); let best = null, bd = 1e9; items.forEach(it => { if (r.intersectBox(it.box, v)) { const d = v.distanceTo(r.origin); if (d < bd) { bd = d; best = it; } } }); return best; }
  function pickPart(e) { ray(e); const ms = []; isoG.traverse(o => { if (o.isMesh) ms.push(o); }); const h = RC.intersectObjects(ms, false)[0]; if (!h) return null; const m = h.object; return m.userData.__nuova !== undefined ? { nuova: m.userData.__nuova, mesh: m, point: h.point } : m.userData.__i !== undefined ? { i: m.userData.__i, mesh: m, point: h.point } : null; }
  function onDown2(e) {
    if (e.button === 2 || e.button === 1) { look = { x: e.clientX, y: e.clientY, pan: e.button === 1 }; return; }
    if (e.button !== 0) return;
    const dbl = e.detail >= 2 || performance.now() - last < 320; last = performance.now();
    if (!iso) { const it = pickItem(e); if (dbl && it) { selectItem(it); isolate(it.key, 'modelli'); return; } selectItem(it); return; }
    if (/^capo:/.test(iso.key)) return;
    const p = pickPart(e); part = p ? { i: p.i, nuova: p.nuova, mesh: p.mesh } : null; renderRight();
    if (p) { const n = cam2.getWorldDirection(V3()).negate(); pdrag = { plane: new THREE.Plane().setFromNormalAndCoplanarPoint(Math.abs(n.y) > .8 ? new THREE.Vector3(0, 1, 0) : n, p.point), start: p.point.clone(), pos0: p.mesh.position.clone(), moved: false, vert: e.shiftKey }; cv2.setPointerCapture(e.pointerId); }
  }
  function onMove2(e) {
    if (sec !== 'modelli' || !cv2) return;
    if (look) { const dx = e.clientX - look.x, dy = e.clientY - look.y; look.x = e.clientX; look.y = e.clientY;
      if (look.pan) { const k = view.dist * .002; view.tx -= (Math.cos(view.yaw) * dx) * k; view.tz += (Math.sin(view.yaw) * dx) * k; view.ty += dy * k; }
      else { view.yaw -= dx * .006; view.pitch = Math.max(-.2, Math.min(1.45, view.pitch + dy * .005)); } return; }
    if (pdrag && part && part.mesh) {
      const h = ray(e).intersectPlane(pdrag.plane, V3()); if (!h) return; let d = h.sub(pdrag.start); if (pdrag.vert) d.set(0, d.y, 0);
      const m = part.mesh, par = m.parent; par.updateMatrixWorld(true); const w0 = par.localToWorld(pdrag.pos0.clone()).add(d); m.position.copy(par.worldToLocal(w0)); pdrag.moved = true; return; }
    if (!iso && e.target === cv2) { const it = pickItem(e); hover = it; const tip = $('st-tip') || (() => { const t = document.createElement('div'); t.id = 'st-tip'; document.body.appendChild(t); return t; })(); tip.hidden = !it; if (it) { tip.textContent = it.nome; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 10 + 'px'; } }
  }
  function onUp2() { look = null; if (pdrag) { const d = pdrag; pdrag = null; if (d.moved && part && part.mesh) { writePart({ p: part.mesh.position.toArray().map(r3) }); commit(); } } }
  function nudgePart(f) { if (!part || !part.mesh) return; const T = readPart(); f(T); writePart({ p: T.p, r: T.r, s: T.s }); commit(); }
  addEventListener('keydown', e => {
    if (!ready || sec !== 'modelli') return; const k = e.key.toLowerCase(), t = e.target;
    if (t && /input|select|textarea/i.test(t.tagName)) { e.stopImmediatePropagation(); return; }
    e.stopImmediatePropagation(); held[k] = true;
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'z') { e.preventDefault(); undoRedo(!e.shiftKey); return; } if (ctrl && k === 'y') { e.preventDefault(); undoRedo(false); return; }
    if (ctrl && k === 'd') { e.preventDefault(); dupPart(); return; }
    if (k === 'escape') { if (iso) { if (part) { part = null; renderRight(); } else closeIso(); } else if (hsel) selectItem(null); return; }
    if (!iso || !part) return;
    const st = e.altKey ? Math.PI / 180 : Math.PI / 12;
    if (k === 'r') nudgePart(T => { T.r[1] += e.shiftKey ? -st : st; }); else if (k === 't') nudgePart(T => { T.r[0] += e.shiftKey ? -st : st; }); else if (k === 'g') nudgePart(T => { T.r[2] += e.shiftKey ? -st : st; });
    else if (k === 'pageup') nudgePart(T => { T.p[1] = r3(T.p[1] + (e.shiftKey ? .1 : .01)); }); else if (k === 'pagedown') nudgePart(T => { T.p[1] = r3(T.p[1] - (e.shiftKey ? .1 : .01)); });
    else if (k === '+' || k === '=') nudgePart(T => { T.s = T.s.map(v => r3(v * 1.05)); }); else if (k === '-') nudgePart(T => { T.s = T.s.map(v => r3(v / 1.05)); });
    else if (k === 'delete' || k === 'backspace') delPart();
  }, true);
  addEventListener('keyup', e => { held[e.key.toLowerCase()] = false; }, true);
  function resize2() { if (!cv2) return; const w = innerWidth, h = innerHeight - 42; R2.setSize(w, h, false); cam2.aspect = w / h; cam2.updateProjectionMatrix(); }
  addEventListener('resize', resize2);
  let lastT = performance.now(), labT = 0;
  function tick(now) {
    const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    if (sec === 'modelli' && R2) {
      let f = 0, s = 0; if (held.w || held.arrowup) f++; if (held.s || held.arrowdown) f--; if (held.d || held.arrowright) s++; if (held.a || held.arrowleft) s--;
      const sp = view.dist * .9 * (held.shift ? 3 : 1) * dt, fx = -Math.sin(view.yaw), fz = -Math.cos(view.yaw);
      view.tx += (fx * f + Math.cos(view.yaw) * s) * sp; view.tz += (fz * f - Math.sin(view.yaw) * s) * sp;
      if (held.q) view.yaw += dt * 1.4; if (held.e) view.yaw -= dt * 1.4;
      const base = iso ? isoRoot.position : { x: 0, y: 0, z: 0 }, cx = view.tx + base.x, cy = view.ty, cz = view.tz + base.z;
      cam2.position.set(cx + Math.sin(view.yaw) * Math.cos(view.pitch) * view.dist, cy + Math.sin(view.pitch) * view.dist, cz + Math.cos(view.yaw) * Math.cos(view.pitch) * view.dist); cam2.lookAt(cx, cy, cz);
      const sun = S2.userData.sun; sun.position.set(cx + 20, 40, cz + 25); sun.target.position.set(cx, 0, cz);
      boxH.visible = !iso && !!hover && hover !== hsel; if (boxH.visible) boxH.box.copy(hover.box);
      boxS.visible = !!((!iso && hsel) || (iso && part && part.mesh)); if (boxS.visible) { if (iso) boxS.box.setFromObject(part.mesh); else boxS.box.copy(hsel.box); }
      if (now - labT > 300) { labT = now; const c = V3(cx, cy, cz); items.forEach(it => { it.lab.visible = !iso && it.holder.position.distanceTo(c) < Math.max(10, view.dist * 1.1); }); }
      R2.render(S2, cam2);
    }
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  return { hidesGame, isolate, show, get section() { return sec; } };
})();
