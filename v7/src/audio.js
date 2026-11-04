
// ---------- Suoni sintetizzati: nessun file esterno ----------
var Audio8 = (function () {
  let ctx = null, master = null, noise = null, on = true, engine = null, siren = null, sea = null, rainN = null, screech = null;
  // [guida2] i suoni dei mezzi: il motore a due strati (il rombo e l'aspirazione che sale coi giri e col gas), la BMX (il cricchetto della
  // ruota libera, il rotolare delle gomme), l'avviamento (o i fili collegati), il clacson e il campanello, il grido di chi si scansa e la
  // radio dell'auto: tre stazioni di basi hip hop strumentali fatte qui (cassa, rullante, charleston, basso, accordi), R cambia. ?nofixguida2: com'era
  const GUIDA2 = !(typeof location !== 'undefined' && /[?&]nofixguida2\b/.test(location.search));
  let eng2 = null, bici = null, radioBus = null, lastVeh = null, tickT = 0;
  const RADIO = { st: 0, next: 0, step: 0, nomi: ['Radio spenta', 'Radio Porto Beat', 'Onda Cassa 92', 'Notturno Lento'], bpm: [0, 90, 96, 78],
    basso: [null, [43, 0, 0, 43, 0, 0, 46, 0, 41, 0, 0, 41, 0, 38, 0, 0], [36, 0, 36, 0, 0, 0, 39, 0, 34, 0, 0, 34, 0, 0, 31, 0], [40, 0, 0, 0, 43, 0, 0, 0, 38, 0, 0, 0, 36, 0, 0, 0]],
    cassa: [null, [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0], [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]],
    acc: [null, [[55, 58, 62], [53, 57, 60]], [[48, 51, 55], [46, 50, 53]], [[52, 55, 59], [50, 53, 57]]] };
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; return; }
    master = ctx.createGain(); master.gain.value = .55;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    master.connect(comp); comp.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // motore
    const eo = ctx.createOscillator(); eo.type = 'sawtooth'; const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 500; const eg = ctx.createGain(); eg.gain.value = 0;
    eo.connect(ef); ef.connect(eg); eg.connect(master); eo.start(); engine = { o: eo, f: ef, g: eg };
    if (GUIDA2) {   // [guida2] il secondo strato (aspirazione: un'onda quadra a 2× filtrata a banda, sale col gas) e lo scarico (rumore basso)
      const o2 = ctx.createOscillator(); o2.type = 'square'; const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 2.5; f2.frequency.value = 600; const g2 = ctx.createGain(); g2.gain.value = 0; o2.connect(f2); f2.connect(g2); g2.connect(master); o2.start();
      const sx = ctx.createBufferSource(); sx.buffer = noise; sx.loop = true; const fx = ctx.createBiquadFilter(); fx.type = 'lowpass'; fx.frequency.value = 180; const gx = ctx.createGain(); gx.gain.value = 0; sx.connect(fx); fx.connect(gx); gx.connect(master); sx.start();
      eng2 = { o: o2, f: f2, g: g2, nf: fx, ng: gx };
      const sr = ctx.createBufferSource(); sr.buffer = noise; sr.loop = true; const fr = ctx.createBiquadFilter(); fr.type = 'bandpass'; fr.frequency.value = 420; fr.Q.value = .7; const gr = ctx.createGain(); gr.gain.value = 0; sr.connect(fr); fr.connect(gr); gr.connect(master); sr.start();
      bici = { f: fr, g: gr };
      radioBus = ctx.createGain(); radioBus.gain.value = .16; const rb = ctx.createBiquadFilter(); rb.type = 'bandpass'; rb.frequency.value = 1100; rb.Q.value = .35; radioBus.connect(rb); rb.connect(master);   // l'altoparlante del cruscotto
    }
    // sirena bitonale
    const so = ctx.createOscillator(); so.type = 'square'; const sf = ctx.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 1800; const sg = ctx.createGain(); sg.gain.value = 0;
    so.connect(sf); sf.connect(sg); sg.connect(master); so.start(); siren = { o: so, g: sg };
    // mare e pioggia
    const mkLoop = (type, freq, vol) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ctx.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(); return g; };
    sea = mkLoop('lowpass', 260, .05); rainN = mkLoop('highpass', 2500, 0);
    // stridio delle gomme: rumore filtrato stretto, più un fischio che oscilla
    { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 7; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start();
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1150; const og = ctx.createGain(); og.gain.value = 0; o.connect(og); og.connect(master); o.start(); screech = { f, g, o, og }; }
  }
  const now = () => ctx.currentTime;
  function nz(t0, dur, type, freq, vol, pan, q) {
    const s = ctx.createBufferSource(); s.buffer = noise; s.playbackRate.value = .8 + Math.random() * .4;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.connect(f); f.connect(g); if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(master); } else g.connect(master);
    s.start(t0, Math.random()); s.stop(t0 + dur + .05); return f;
  }
  function tone(t0, dur, type, f0, f1, vol, pan) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.connect(g); if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(master); } else g.connect(master);
    o.start(t0); o.stop(t0 + dur + .05);
  }
  function play(e, near, pan) {
    if (!ctx || !on) return; const t = now(), v = near;
    switch (e.k) {
      case 'shot':
        if (e.w === 'lupara') { nz(t, .45, 'lowpass', 2400, .9 * v, pan); tone(t, .22, 'sine', 110, 38, .9 * v, pan); nz(t + .02, .9, 'lowpass', 500, .25 * v, pan); }
        else if (e.w === 'mitra') { nz(t, .09, 'bandpass', 2600, .55 * v, pan, .8); tone(t, .06, 'square', 180, 60, .25 * v, pan); }
        else { nz(t, .2, 'lowpass', 3600, .7 * v, pan); tone(t, .12, 'sine', 160, 45, .7 * v, pan); nz(t + .03, .5, 'lowpass', 600, .12 * v, pan); }
        if (e.npc) nz(t, .12, 'highpass', 1200, .15 * v, pan);
        break;
      case 'campanello': [659, 523, 392].forEach((f, i) => tone(t + i * .42, .7, 'sine', f, f, .22 * v, pan)); break;   // [mappa_nuova] il din-don-dan degli annunci in banchina
      case 'hit': tone(t, .05, 'square', 1500, 1200, .12); break;
      case 'kill': tone(t, .07, 'square', 900, 600, .18); tone(t + .06, .12, 'square', 600, 300, .15); break;
      case 'punch': nz(t, .12, 'lowpass', 500, .8, pan); tone(t, .08, 'sine', 120, 60, .5); break;
      case 'swing': nz(t, .1, 'bandpass', 1200, .15, 0, 2); break;
      case 'reload': nz(t, .04, 'highpass', 3000, .35); nz(t + .35, .05, 'highpass', 2200, .4); nz(t + .6, .04, 'highpass', 3500, .35); break;
      case 'empty': nz(t, .03, 'highpass', 4000, .4); break;
      case 'switch': nz(t, .05, 'highpass', 2500, .25); break;
      case 'explosion': nz(t, 2.2, 'lowpass', 900, 1.2 * v, pan); tone(t, 1.2, 'sine', 70, 25, 1 * v, pan); nz(t, .3, 'highpass', 1500, .5 * v, pan); break;
      case 'ignite': nz(t, .8, 'bandpass', 700, .4 * v, pan, .5); break;
      case 'glass': nz(t, .25, 'highpass', 3500, .6 * v, pan); tone(t + .02, .15, 'sine', 3200, 2600, .15 * v, pan); nz(t + .05, .9, 'lowpass', 900, .3 * v, pan); break;
      case 'throw': nz(t, .15, 'bandpass', 900, .2, 0, 1); break;
      case 'crash': { const k = Math.min(1.6, (e.v || 10) / 10) * v; nz(t, .45, 'bandpass', 600, .9 * k, pan, .6); tone(t, .25, 'sine', 90, 40, .7 * k, pan); nz(t + .02, .6, 'highpass', 3200, .3 * k, pan); for (let q = 0; q < 5; q++) nz(t + .05 + q * .06 + Math.random() * .04, .12, 'bandpass', 1400 + Math.random() * 2400, .18 * k, pan, 3); break; }
      case 'bump': { const k = Math.min(1, (e.v || 4) / 8) * v; nz(t, .2, 'lowpass', 420, .7 * k, pan); tone(t, .1, 'triangle', 180, 90, .3 * k, pan); nz(t, .08, 'bandpass', 1800, .15 * k, pan, 2); break; }
      case 'vetrina': nz(t, .35, 'highpass', 3800, .75 * v, pan); tone(t, .18, 'sine', 3400, 2900, .14 * v, pan); for (let q = 0; q < 9; q++) tone(t + .05 + q * .045 + Math.random() * .05, .09, 'sine', 3000 + Math.random() * 2500, .06 * v, pan); nz(t + .1, 1.0, 'highpass', 5000, .2 * v, pan); break;
      case 'palo': tone(t, .7, 'triangle', 420, 380, .22 * v, pan); tone(t, .5, 'square', 820, 760, .05 * v, pan); nz(t, .25, 'lowpass', 600, .6 * v, pan); nz(t + .55, .3, 'lowpass', 400, .5 * v, pan); break;
      case 'thud': nz(t, .2, 'lowpass', 300, .9, pan); break;
      case 'crollo': nz(t, 1.6, 'lowpass', 420, 1.1 * v, pan); tone(t, .5, 'sine', 60, 30, .8 * v, pan); for (let k = 0; k < 7; k++) nz(t + .08 + k * .09 + Math.random() * .05, .18, 'bandpass', 500 + Math.random() * 900, .35 * v, pan, 1.2); break;
      case 'legno': nz(t, .14, 'bandpass', 900, .5 * v, pan, 1.5); nz(t + .03, .1, 'bandpass', 1600, .25 * v, pan, 2); break;
      case 'vetri': nz(t, .2, 'highpass', 4200, .45 * v, pan); tone(t, .12, 'sine', 3800, 3100, .1 * v, pan); tone(t + .04, .1, 'sine', 4600, 4200, .07 * v, pan); break;
      case 'botto': nz(t, .25, 'lowpass', 500, .8 * v, pan); tone(t, .18, 'triangle', 220, 140, .25 * v, pan); break;
      case 'foglie': nz(t, .3, 'highpass', 2200, .25 * v, pan); break;
      case 'honk': tone(t, .35, 'square', 392, 392, .08 * v, pan); tone(t, .35, 'square', 494, 494, .06 * v, pan); break;
      case 'cash': tone(t, .12, 'sine', 1320, 1320, .18); tone(t + .08, .25, 'sine', 1760, 1760, .18); break;
      case 'pickup': tone(t, .15, 'square', 440, 880, .1); break;
      case 'hurt': tone(t, .16, 'sawtooth', 150, 90, .22); nz(t, .1, 'lowpass', 700, .3); break;
      case 'death': tone(t, .3, 'sawtooth', 120, 60, .12 * v, pan); break;
      case 'jump': tone(t, .12, 'square', 220, 440, .1 * v, pan); break;   // [salto]
      case 'land': tone(t, .08, 'triangle', 110, 70, .2 * v, pan); break;
      case 'clacson': tone(t, .42, 'square', 415, 415, .07, 0); tone(t, .42, 'square', 523, 523, .055, 0); nz(t, .42, 'bandpass', 900, .03, 0, 2); break;   // [guida2]
      case 'trillo': [0, .16].forEach(d => { tone(t + d, .5, 'sine', 2350, 2300, .09, 0); tone(t + d, .35, 'sine', 3340, 3300, .05, 0); }); break;   // [guida2] il campanello della BMX
      case 'avvio': { for (let k = 0; k < 5; k++) tone(t + k * .11, .1, 'sawtooth', 70, 55, .08, 0); tone(t + .58, .35, 'sawtooth', 48, 70, .12, 0); nz(t + .58, .3, 'lowpass', 300, .2, 0); break; }   // [guida2] il motorino d'avviamento e il motore che prende
      case 'fili': { for (let k = 0; k < 6; k++) nz(t + k * .07 + Math.random() * .04, .04, 'highpass', 3500, .25, 0); for (let k = 0; k < 4; k++) tone(t + .5 + k * .11, .1, 'sawtooth', 70, 55, .08, 0); tone(t + .95, .35, 'sawtooth', 48, 70, .12, 0); break; }   // [guida2] i fili che fanno scintille, poi parte
      case 'grido': { const f0 = e.f ? 380 : 230; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.45, t + .09); o.frequency.linearRampToValueAtTime(f0 * 1.1, t + .3);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = e.f ? 1100 : 800; bp.Q.value = 4; const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.22 * v, t + .03); g.gain.exponentialRampToValueAtTime(.0008, t + .34);
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; o.connect(bp); bp.connect(g); if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(master); } else g.connect(master); o.start(t); o.stop(t + .4); break; }   // [guida2] «Attento!»
    }
  }
  function update(st, R) {
    if (!ctx) return;
    const p = st.player, t = now();
    const v = p.vehicle ? st.vehicles.find(k => k.id === p.vehicle) : null;
    if (v && on && v.kind !== 'bmx') {   // [bmx] la bici non ha motore
      // marce: il motore sale di giri e cala a ogni cambio
      const sp = Math.abs(v.speed), vespa = v.kind === 'vespa', G4 = vespa ? [0, 4, 8, 12, 99] : [0, 4.5, 8.5, 12.5, 16.5, 99];
      let gi = 0; while (sp > G4[gi + 1]) gi++; const rpm = (sp - G4[gi]) / ((G4[gi + 1] === 99 ? G4[gi] + 6 : G4[gi + 1]) - G4[gi]);
      const spin = v.skid > .5 ? .35 : 0, f0 = vespa ? 75 + gi * 8 + (rpm + spin) * 70 : 36 + gi * 5 + (rpm + spin) * 46;
      engine.o.type = vespa ? 'square' : 'sawtooth'; engine.o.frequency.setTargetAtTime(f0, t, .05); engine.f.frequency.setTargetAtTime(vespa ? 900 : 380 + (rpm + gi * .3) * 520, t, .08); engine.g.gain.setTargetAtTime(vespa ? .06 : .085 + rpm * .03, t, .1);
      if (eng2) { const gas = Math.max(0, Math.min(1, (v.longA || 0) / 4)), two = !!v.kind && (vespa || v.kind === 'ciao'); engine.g.gain.setTargetAtTime((vespa ? .045 : .065) + rpm * .025, t, .1);
        eng2.o.frequency.setTargetAtTime(f0 * 2, t, .05); eng2.f.frequency.setTargetAtTime((two ? 1400 : 700) + rpm * 900 + gas * 400, t, .08); eng2.g.gain.setTargetAtTime((two ? .02 : .014) + gas * .035 + rpm * .01, t, .08);
        eng2.nf.frequency.setTargetAtTime(140 + sp * 9, t, .1); eng2.ng.gain.setTargetAtTime(.03 + gas * .05, t, .1); }
    }
    else { engine.g.gain.setTargetAtTime(0, t, .15); if (eng2) { eng2.g.gain.setTargetAtTime(0, t, .15); eng2.ng.gain.setTargetAtTime(0, t, .15); } }
    if (GUIDA2 && ctx) {
      const vid = v ? v.id : null; if (vid !== lastVeh) { if (v && on && v.kind !== 'bmx' && !(v.kind in { gozzo: 1, lancia: 1, chiatta: 1 })) play({ k: v.stolen && !v.lent ? 'fili' : 'avvio' }, 1, 0); if (vid === null) RADIO.st = 0; lastVeh = vid; }   // salendo: l'avviamento
      const bk = v && v.kind === 'bmx' && on, bs = bk ? Math.hypot(v.vx || 0, v.vy || 0) : 0;   // la BMX: gomme e cricchetto della ruota libera quando non pedali
      bici.g.gain.setTargetAtTime(bk && !(v.jz > .02) ? Math.min(.06, bs * .008) : 0, t, .08); bici.f.frequency.setTargetAtTime(300 + bs * 40, t, .1);
      if (bk && !v.pedal && bs > 1 && !(v.jz > .02)) { tickT -= 1 / 60; if (tickT <= 0) { tickT = 1 / Math.min(28, bs * 3.2); nz(t, .012, 'highpass', 5200, .07, 0); } }
      radioTick(t);
    }
    // gomme che stridono: il mezzo più vicino che slitta
    let sk = 0, skSlip = 0;
    if (on) st.vehicles.forEach(k => { if (k.hidden || k.wreck || !(k.skid > .25)) return; const d = Math.hypot(k.x - p.x, k.y - p.y), sp = Math.hypot(k.vx || 0, k.vy || 0); if (sp < 2) return; const a = (k.skid - .2) * Math.min(1, sp / 8) / (1 + d * .08); if (a > sk) { sk = a; skSlip = Math.abs(k.slip || 0); } });
    screech.g.gain.setTargetAtTime(Math.min(.16, sk * .16), t, .04); screech.og.gain.setTargetAtTime(Math.min(.03, sk * .03), t, .04);
    screech.f.frequency.setTargetAtTime(1600 + skSlip * 70 + Math.sin(t * 23) * 120, t, .05); screech.o.frequency.setTargetAtTime(1050 + skSlip * 25 + Math.sin(t * 31) * 60, t, .03);
    const pc = st.vehicles.find(k => k.police && k.siren && !k.hidden && !k.wreck);
    if (pc && on) { const d = Math.hypot(pc.x - p.x, pc.y - p.y); siren.o.frequency.setValueAtTime(Math.floor(t * 1.6) % 2 ? 660 : 880, t); siren.g.gain.setTargetAtTime(.05 / (1 + d * .05), t, .1); }
    else siren.g.gain.setTargetAtTime(0, t, .2);
    rainN.gain.setTargetAtTime(on && R.isRaining(st.t) ? .05 : 0, t, .5);
    sea.gain.setTargetAtTime(on ? .045 : 0, t, .5);
  }
  // [graffiti2] LA BOMBOLETTA: il soffio mentre dipingi nella tavoletta (rumore filtrato acuto, più largo col fat cap, sordo col rullo,
  // il pennarello quasi muto) e, salvando, la pallina che sbatte due volte e un «psssht» lungo
  let hiss = null;
  function bomboletta(k, pen) {
    if (!ctx || !on) return; const t = now();
    if (k === 'via') {
      if (!hiss) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .7; const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 2200; const g = ctx.createGain(); g.gain.value = 0; s.connect(h); h.connect(f); f.connect(g); g.connect(master); s.start(); hiss = { s, f, g }; }
      const fr = pen === 'roller' ? 900 : pen === 'marker' ? 3000 : pen === 'skinny' ? 7200 : 5200, v = pen === 'marker' ? .015 : pen === 'roller' ? .05 : pen === 'skinny' ? .07 : .1;
      hiss.f.frequency.setTargetAtTime(fr, t, .02); hiss.g.gain.cancelScheduledValues(t); hiss.g.gain.setTargetAtTime(v, t, .03);
    } else if (k === 'stop') { if (hiss) { hiss.g.gain.cancelScheduledValues(t); hiss.g.gain.setTargetAtTime(0, t, .06); } }
    else if (k === 'fatto') {
      for (let i = 0; i < 2; i++) { nz(t + i * .16, .07, 'bandpass', 2600, .45, 0, 6); tone(t + i * .16, .05, 'triangle', 1900, 1500, .12); }
      nz(t + .38, 1.2, 'highpass', 4200, .32, 0); nz(t + .38, 1.1, 'bandpass', 6500, .2, 0, 1.2);
    }
  }
  // [guida2] la radio: un sequenziatore a sedicesimi con mezzo secondo d'anticipo (le note si programmano sull'orologio dell'audio)
  function radioTick(t) {
    const S = RADIO.st; if (!S || !on || !radioBus) return; const dur = 60 / RADIO.bpm[S] / 4;
    if (RADIO.next < t) RADIO.next = t + .05;
    while (RADIO.next < t + .5) {
      const q = RADIO.next, k = RADIO.step % 16, bar = Math.floor(RADIO.step / 16) % 2, sw = k % 2 ? dur * .16 : 0, tq = q + sw;   // un po' di swing
      const T = (t0, d, ty, f0, f1, vol) => { const o = ctx.createOscillator(); o.type = ty; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + d); const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + d); o.connect(g); g.connect(radioBus); o.start(t0); o.stop(t0 + d + .05); };
      const N = (t0, d, ty, fr, vol) => { const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = ty; f.frequency.value = fr; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0008, t0 + d); s.connect(f); f.connect(g); g.connect(radioBus); s.start(t0, Math.random()); s.stop(t0 + d + .05); };
      const mf = n => 440 * Math.pow(2, (n - 69) / 12);
      if (RADIO.cassa[S][k]) T(tq, .32, 'sine', 125, 42, .9);
      if (k === 4 || k === 12) { N(tq, .2, 'bandpass', 1900, .55); T(tq, .1, 'triangle', 210, 160, .25); }
      if (k % 2 === 0 || S === 2) N(tq, k % 4 === 2 ? .09 : .04, 'highpass', 7000, k % 4 === 2 ? .2 : .12);
      const b = RADIO.basso[S][k]; if (b) T(tq, dur * 2.6, 'triangle', mf(b), 0, .38);
      if (k === 0 || (S !== 3 && k === 10)) RADIO.acc[S][bar].forEach(n => T(tq, dur * (S === 3 ? 7 : 3), 'square', mf(n + 12), 0, .028));
      RADIO.next += dur; RADIO.step++;
    }
  }
  function radio(st, dir) {
    if (!GUIDA2) return null; init(); const p = st.player, v = p.vehicle && st.vehicles.find(k => k.id === p.vehicle); if (!v || v.kind === 'bmx') return null;
    RADIO.st = (RADIO.st + (dir || 1) + RADIO.nomi.length) % RADIO.nomi.length; RADIO.step = 0; RADIO.next = 0;
    if (ctx) nz(now(), .25, 'bandpass', 2500, .08, 0, 1);   // il fruscio fra le stazioni
    return RADIO.nomi[RADIO.st] + (RADIO.st ? ' · R cambia' : '');
  }
  return { init, play, update, bomboletta, radio, toggle() { on = !on; if (ctx && on && ctx.state === 'suspended') ctx.resume(); return on; }, get on() { return on; } };
})();
