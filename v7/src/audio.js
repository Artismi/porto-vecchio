
// ---------- Suoni sintetizzati: nessun file esterno ----------
var Audio8 = (function () {
  let ctx = null, master = null, noise = null, on = true, engine = null, siren = null, sea = null, rainN = null, screech = null;
  // [guida2] i suoni dei mezzi: il motore a due strati (il rombo e l'aspirazione che sale coi giri e col gas), la BMX (il cricchetto della
  // ruota libera, il rotolare delle gomme), l'avviamento (o i fili collegati), il clacson e il campanello, il grido di chi si scansa e la
  // radio dell'auto: tre stazioni di basi hip hop strumentali fatte qui (cassa, rullante, charleston, basso, accordi), R cambia. ?nofixguida2: com'era
  const GUIDA2 = !(typeof location !== 'undefined' && /[?&]nofixguida2\b/.test(location.search));
  let eng2 = null, bici = null, radioBus = null, lastVeh = null, tickT = 0;
  // [suono] LA MUSICA ADATTIVA (musica.js): la tensione della regia (Cinema.S.v) e i momenti grossi (il rallentatore, l'inseguimento che
  // parte, la fine) le dicono cosa suonare; la radio accesa in macchina la zittisce (la musica, lì, è la radio). ?nomusica: senza
  const HAS = typeof Musica !== 'undefined', MUS = HAS && Musica.F.musica;
  const VOL = { musica: .9, passi: .5, ambiente: 1 };
  let busMus = null, busPassi = null; const MO = { slow: 0, chase: false, over: false, T: 0 };
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
    // [suono] il bus della musica (musica.js): gli strati e il filtro stanno lì, qui il volume
    if (HAS) { busMus = ctx.createGain(); busMus.gain.value = VOL.musica; busMus.connect(master); try { Musica.collega(ctx, busMus); } catch (e) { console.warn('[musica]', e); busMus = null; } }
    if (HAS && busMus) { busPassi = ctx.createGain(); busPassi.gain.value = VOL.passi; busPassi.connect(master); for (const n in PASSI) for (let v = 0; v < 3; v++) Musica.chiedi('p_' + n + v, PASSI[n][0], PASSI[n][1], .9, 101 + v * 37 + n.length); ambInit(); }
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
    if (!HAS) sea = mkLoop('lowpass', 260, .05); rainN = mkLoop('highpass', 2500, 0);   // [suono] con musica.js il mare è un letto dell'ambiente (ambiente)
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
      case 'land': tone(t, .08, 'triangle', 110, 70, .2 * v, pan); if (busPassi && Musica.buf['p_' + PS.sup + '0']) { passo(PS.sup, .9 * v, t); passo(PS.sup, .7 * v, t + .03); } break;   // [suono] i due piedi sulla superficie
      case 'clacson': tone(t, .42, 'square', 415, 415, .07, 0); tone(t, .42, 'square', 523, 523, .055, 0); nz(t, .42, 'bandpass', 900, .03, 0, 2); break;   // [guida2]
      case 'trillo': [0, .16].forEach(d => { tone(t + d, .5, 'sine', 2350, 2300, .09, 0); tone(t + d, .35, 'sine', 3340, 3300, .05, 0); }); break;   // [guida2] il campanello della BMX
      case 'avvio': { for (let k = 0; k < 5; k++) tone(t + k * .11, .1, 'sawtooth', 70, 55, .08, 0); tone(t + .58, .35, 'sawtooth', 48, 70, .12, 0); nz(t + .58, .3, 'lowpass', 300, .2, 0); break; }   // [guida2] il motorino d'avviamento e il motore che prende
      case 'fili': { for (let k = 0; k < 6; k++) nz(t + k * .07 + Math.random() * .04, .04, 'highpass', 3500, .25, 0); for (let k = 0; k < 4; k++) tone(t + .5 + k * .11, .1, 'sawtooth', 70, 55, .08, 0); tone(t + .95, .35, 'sawtooth', 48, 70, .12, 0); break; }   // [guida2] i fili che fanno scintille, poi parte
      case 'grido': { const f0 = e.f ? 380 : 230; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * 1.45, t + .09); o.frequency.linearRampToValueAtTime(f0 * 1.1, t + .3);
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = e.f ? 1100 : 800; bp.Q.value = 4; const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.22 * v, t + .03); g.gain.exponentialRampToValueAtTime(.0008, t + .34);
        const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; o.connect(bp); bp.connect(g); if (p) { p.pan.value = pan || 0; g.connect(p); p.connect(master); } else g.connect(master); o.start(t); o.stop(t + .4); break; }   // [guida2] «Attento!»
    }
  }
  // la musica: la tensione, la notte, i momenti grossi (sul fronte di salita: uno a evento)
  function musica(st, R, ui, t) {
    if (!busMus) return;
    const T = typeof Cinema !== 'undefined' && Cinema.S ? Cinema.S.v : 0; MO.T = T;
    const sl = st.slowmo || 0; if (sl > .3 && MO.slow <= .05) Musica.momento('grosso'); MO.slow = sl;
    const ch = !!st.chase; if (ch && !MO.chase) Musica.momento('inseguimento'); MO.chase = ch;
    const ov = !!st.over; if (ov && !MO.over) Musica.momento('fine'); MO.over = ov;
    let notte = 0; try { notte = R && R.nightLevel ? R.nightLevel(st.t) : 0; } catch (e) { }
    Musica.tick(t, { T, notte, attivo: on && !RADIO.st, ovattato: !!(ui && (ui.pausa || ui.menu || ui.book)) });
  }
  function update(st, R, ui) {
    if (!ctx) return;
    const p = st.player, t = now();
    if (MUS) try { musica(st, R, ui, t); } catch (e) { if (!MO.err) { MO.err = 1; console.warn('[musica]', e); } }
    else if (HAS && busMus) Musica.lavora(2);   // ?nomusica: i passi e gli ambienti si cuociono lo stesso
    if (busPassi) try { passi(st, R, t); } catch (e) { if (!PS.err) { PS.err = 1; console.warn('[passi]', e); } }
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
    if (sea) sea.gain.setTargetAtTime(on ? .045 : 0, t, .5);
    if (busAmb) try { ambiente(st, R, t); } catch (e) { if (!AS.err) { AS.err = 1; console.warn('[ambiente]', e); } }
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
  // [suono] I PASSI PER SUPERFICIE, A TEMPO CON LA CLIP. Le ricette (cotte da musica.js, nel lavoratore: usano solo BQ, SR, PI2, exp,
  // sin, tanh e Math) si dividono come nella letteratura (Farnell; Turchet e altri, DAFx-10) in SOLIDI (pietra, legno, metallo: un colpo
  // di tallone, la punta 35-55 ms dopo, le risonanze) e AGGREGATI (sabbia, erba, ghiaia: una nuvola di granelli dentro un inviluppo).
  // Tre varianti per superficie, e ogni passo un poco più alto o più basso: niente mitraglietta. Il piede tocca quando la fase della
  // clip (Walk, Run del kit: models.js FASE, «gamba sinistra avanti» a 0) passa per 0 e per 0,5; senza modello, dal p.anim del pupazzo.
  // La casella sotto i piedi (Game.tileAt) dice la superficie; dentro casa legno, sulle scale dei tetti metallo, sotto la pioggia la
  // pietra schizza. Costo: una sorgente e un guadagno per passo (3-4 al secondo correndo). ?nopassi: senza
  const { BQ, SR } = HAS ? Musica : {}, PI2 = Math.PI * 2, exp = Math.exp, sin = Math.sin, tanh = Math.tanh;
  const PASSI = {
    pietra: [.14, function* (d, R) { const bp = BQ('bp', 1600 + R() * 900, 1.1), lp = BQ('lp', 4800, .7), hp = BQ('hp', 260, .7), t2 = .035 + R() * .02; let ph = 0;
      for (let i = 0; i < d.length; i++) { const t = i / SR, n = R() * 2 - 1, e = exp(-t * 95) + (t > t2 ? exp(-(t - t2) * 140) * .5 : 0); ph += PI2 * 105 / SR; d[i] = hp(lp(bp(n) * e * 2.4 + n * e * .18)) + sin(ph) * exp(-t * 48) * .35; if (!(i & 2047)) yield; } }],
    legno: [.18, function* (d, R) { const m = [BQ('bp', 340 + R() * 80, 7), BQ('bp', 880 + R() * 160, 6), BQ('bp', 2000 + R() * 300, 4)], t2 = .04 + R() * .02; let ph = 0;
      for (let i = 0; i < d.length; i++) { const t = i / SR, n = R() * 2 - 1, e = exp(-t * 420) + (t > t2 ? exp(-(t - t2) * 500) * .6 : 0); ph += PI2 * 150 / SR; d[i] = (m[0](n * e) * 3 + m[1](n * e) * 2 + m[2](n * e)) * 1.4 + n * e * .12 + sin(ph) * exp(-t * 36) * .4; if (!(i & 2047)) yield; } }],
    sabbia: [.22, function* (d, R) { const bp = BQ('bp', 1300 + R() * 400, .8), lp = BQ('lp', 900, .7);
      for (let i = 0; i < d.length; i++) { const t = i / SR, g = R() < 420 / SR ? R() * 2 - 1 : 0, e = Math.min(1, t / .018) * exp(-t * 15); d[i] = (bp(g * 9) + lp(R() * 2 - 1) * .35) * e; if (!(i & 2047)) yield; } }],
    erba: [.2, function* (d, R) { const hp = BQ('hp', 2400, .7), bp = BQ('bp', 4200, 1), lp = BQ('lp', 500, .7);
      for (let i = 0; i < d.length; i++) { const t = i / SR, n = R() * 2 - 1, g = R() < 900 / SR ? n : 0, e = Math.min(1, t / .012) * exp(-t * 17); d[i] = (hp(g * 7) + bp(n) * .25 + lp(n) * .3) * e; if (!(i & 2047)) yield; } }],
    ghiaia: [.2, function* (d, R) { const bp = BQ('bp', 2300, 1.2), hp = BQ('hp', 1100, .7), lp = BQ('lp', 400, .7), t2 = .05 + R() * .02;
      for (let i = 0; i < d.length; i++) { const t = i / SR, n = R() * 2 - 1, g = R() < 1400 / SR ? n : 0, e = exp(-t * 22) + (t > t2 ? exp(-(t - t2) * 30) * .6 : 0); d[i] = (bp(g * 8) + hp(g * 3) + lp(n) * exp(-t * 60) * .8) * e; if (!(i & 2047)) yield; } }],
    metallo: [.4, function* (d, R) { const F = [520, 1340, 2450, 3900].map(f => f * (.94 + R() * .12)), A = [.5, .35, .22, .12], Dk = [9, 12, 15, 20], P = F.map(() => R() * PI2), hp = BQ('hp', 1500, .7);
      for (let i = 0; i < d.length; i++) { const t = i / SR; let x = hp(R() * 2 - 1) * exp(-t * 300) * .9; for (let k = 0; k < 4; k++) x += A[k] * exp(-t * Dk[k]) * sin(P[k] + PI2 * F[k] * t); d[i] = x + sin(PI2 * 120 * t) * exp(-t * 40) * .3; if (!(i & 2047)) yield; } }],
    acqua: [.32, function* (d, R) { const hp = BQ('hp', 500, .7), lp = BQ('lp', 3200, .7); let ph = 0, fb = 0, tb = -1;
      for (let i = 0; i < d.length; i++) { const t = i / SR; if (R() < 40 / SR) { tb = t; fb = 500 + R() * 600; } const bt = t - tb, b = tb >= 0 && bt < .03 ? sin(ph += PI2 * (fb + bt * 30000) / SR) * (1 - bt / .03) * .5 : 0;
        d[i] = (lp(hp(R() * 2 - 1)) * (.65 + .35 * sin(PI2 * 37 * t)) + b) * Math.min(1, t / .01) * exp(-t * 9); if (!(i & 2047)) yield; } }],
  };
  const SUPERF = (() => { const T0 = typeof Game !== 'undefined' && Game.T ? Game.T : null, m = {}; if (!T0) return m;
    ['COB', 'VIA', 'PIAZZA', 'QUAY', 'STAIRS', 'WALK', 'BLD', 'FOUNT'].forEach(k => { if (T0[k] !== undefined) m[T0[k]] = 'pietra'; });
    if (T0.PIER !== undefined) m[T0.PIER] = 'legno'; ['SAND', 'DESERT', 'SALT'].forEach(k => { if (T0[k] !== undefined) m[T0[k]] = 'sabbia'; });
    ['GRASS', 'FIELD', 'SHRUB', 'TREE'].forEach(k => { if (T0[k] !== undefined) m[T0[k]] = 'erba'; }); ['DIRT', 'GRAVEL', 'ROCK', 'CLIFF'].forEach(k => { if (T0[k] !== undefined) m[T0[k]] = 'ghiaia'; });
    if (T0.WATER !== undefined) m[T0.WATER] = 'acqua'; return m; })();
  const FASE = { Walk: 0, Walk_Shoot: 0, Run: .33, Run_Gun: .3, Run_Shoot: .3 };
  const PS = { on: !(typeof location !== 'undefined' && /[?&]nopassi\b/.test(location.search)), f: null, a: null, sup: 'pietra', n: 0, ultimo: 0, err: 0 };
  function superficie(st, p) {
    if (p.swim) return 'acqua'; if (p.indoor) return 'legno';
    if (p.lv) { if (p.lv.k === 'scala') return 'metallo'; if (p.lv.k === 'tetto' || p.lv.k === 'ug') return 'pietra'; }
    const G = typeof Game !== 'undefined' ? Game : null; if (!G || !G.tileAt) return 'pietra';
    const TS = G.TS || 2; return SUPERF[G.tileAt(Math.floor(p.x / TS), Math.floor(p.y / TS))] || 'pietra';
  }
  function passo(sup, vol, t) {
    const nome = 'p_' + sup + ((Math.random() * 3) | 0), b = Musica.buf[nome]; if (!b) return; PS.n++;
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = .93 + Math.random() * .14; const g = ctx.createGain(); g.gain.value = vol * (.85 + Math.random() * .3);
    s.connect(g); g.connect(busPassi); s.start(t); s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) { } };
  }
  function passi(st, R, t) {
    const p = st.player; if (!PS.on || !on || !p) return;
    const sp = Math.abs(p.speed || 0), scala = !!(p.lv && p.lv.k === 'scala' && p.lv.t < 1), fermo = p.vehicle || (!scala && sp < .3) || (p.jz || 0) > .02 || p.stun > 0;   // sulla scala a pioli: un piolo a ogni mezzo giro del pupazzo
    if (fermo) { PS.f = null; PS.a = null; return; }
    // la fase del passo: dalla clip del modello se c'è, se no dal pupazzo (le gambe a sin(p.anim): un passo ogni mezzo giro)
    let f = null; if (!scala) try { const pg = R && R.__dyn && R.__dyn.people && R.__dyn.people.__player, cur = pg && pg.userData && pg.userData.cur, c = cur && cur.getClip && cur.getClip();
      if (c && c.duration > 0) { const nm = c.name.split('|').pop(); if (FASE[nm] !== undefined) f = ((cur.time / c.duration - FASE[nm]) % 1 + 1) % 1; } } catch (e) { f = null; }
    let tocca = false;
    if (f !== null) { const a = PS.f; if (a !== null) for (const c of [.02, .52]) if ((a < c && f >= c) || (a > f && (c > a || f >= c))) tocca = true; PS.f = f; PS.a = null; }
    else { const k = Math.floor((p.anim || 0) / Math.PI); if (PS.a !== null && k !== PS.a) tocca = true; PS.a = k; PS.f = null; }
    if (!tocca || t - PS.ultimo < .14) return; PS.ultimo = t;
    const sup = PS.sup = scala ? 'metallo' : superficie(st, p), corre = sp > 3.4, vol = (p.sneak ? .35 : corre ? .95 : .7) * (sup === 'erba' || sup === 'sabbia' ? 1.15 : 1);
    passo(sup, vol, t);
    if (sup === 'pietra' && R && R.isRaining && R.isRaining(st.t) && !p.indoor) passo('acqua', vol * .35, t + .005);   // il selciato bagnato
  }
  // [suono] GLI AMBIENTI A STRATI, PER POSIZIONE E PER ORA (Prototype: il letto di fondo, lo strato di mezzo che sale con la gente, i
  // suoni singoli contati). Ogni mezzo secondo si guarda attorno (14 m: le caselle d'acqua, di case, di sabbia, di verde, di banchina; la
  // gente vicina; l'ora; la pioggia; il tetto, la casa, il sottosuolo) e i letti si mescolano: al bordo del molo metà porto e metà
  // vicolo, niente interruttori. I letti sono giri di 4-8 s cotti nel lavoratore (il mare che respira, lo sciabordio, il brusio del
  // paese, la folla, le cicale di giorno, i grilli di notte, il vento sui tetti e sul lungomare); un letto muto si FERMA (una sorgente
  // ferma non costa). Sopra, gli eventi rari a caso: gabbiani, sartie che tintinnano, cime che scricchiolano, un cane, un motorino che
  // passa lontano, una saracinesca, le campane alle 7, a mezzogiorno e ai vespri. Dentro casa il fuori si sente ovattato. ?noambiente
  const AMB = {
    mare: [8, function* (d, R) { const lp = BQ('lp', 500, .6), hp = BQ('hp', 2500, .7); let w = 0;
      for (let i = 0; i < d.length; i++) { const t = i / SR; if (!(i & 31)) { const a = .5 + .5 * sin(PI2 * t / 8 - 1.57), b = .5 + .5 * sin(PI2 * t / 4 + .7); w = .3 + .55 * a * a + .15 * b; lp.set(280 + 900 * w); }
        const n = R() * 2 - 1; d[i] = lp(n) * w + hp(n) * w * w * w * .12; if (!(i & 2047)) yield; } }, .8],
    porto: [6, function* (d, R) { const lp = BQ('lp', 300, .7), bp = BQ('bp', 450, 3); let e0 = -1, el = .2;
      for (let i = 0; i < d.length; i++) { const t = i / SR; if (t < d.length / SR - .35 && R() < 2.6 / SR) { e0 = t; el = .12 + R() * .14; bp.set(300 + R() * 450); }
        const u = t - e0, e = e0 >= 0 && u < el ? sin(Math.PI * u / el) : 0, n = R() * 2 - 1; d[i] = bp(n) * e * 1.6 + lp(n) * .18; if (!(i & 2047)) yield; } }, .7],
    citta: [6, function* (d, R) { const lp = BQ('lp', 380, .6), bp = BQ('bp', 140, 2);
      for (let i = 0; i < d.length; i++) { const t = i / SR, n = R() * 2 - 1; d[i] = (lp(n) * .7 + bp(n) * .4) * (.8 + .12 * sin(PI2 * t / 6) + .08 * sin(PI2 * t / 3 + 1)); if (!(i & 2047)) yield; } }, .6],
    folla: [6, function* (d, R) { const V = []; for (let k = 0; k < 7; k++) V.push({ f0: 95 + R() * 140, ph: 0, a: BQ('bp', 600, 4), b: BQ('bp', 1400, 5), s0: -1, sl: 0 }); const lp = BQ('lp', 2800, .6), D = d.length / SR;
      for (let i = 0; i < d.length; i++) { const t = i / SR; let x = 0;
        for (let k = 0; k < 7; k++) { const v = V[k]; if (t - v.s0 > v.sl + .05 && t < D - .3 && R() < 3 / SR) { v.s0 = t; v.sl = .08 + R() * .16; v.a.set(450 + R() * 400); v.b.set(1000 + R() * 900); }
          const u = t - v.s0, e = v.s0 >= 0 && u < v.sl ? sin(Math.PI * u / v.sl) : 0; v.ph = (v.ph + v.f0 * (1 + .08 * sin(PI2 * t * .7 + k)) / SR) % 1; const sg = v.ph * 2 - 1; x += (v.a(sg) + v.b(sg) * .6) * e; }
        d[i] = lp(x); if (!(i & 2047)) yield; } }, .7],
    cicale: [4, function* (d, R) { const bp = BQ('bp', 5200, 4);
      for (let i = 0; i < d.length; i++) { const t = i / SR, a = .5 + .5 * sin(PI2 * 45 * t), am = a * a * a; d[i] = bp(R() * 2 - 1) * am * (.6 + .4 * sin(PI2 * t / 4)); if (!(i & 2047)) yield; } }, .5],
    grilli: [4, function* (d) { for (let i = 0; i < d.length; i++) { const t = i / SR; let x = 0;
        const c1 = t % .5, c2 = (t + .17) % .8; for (let k = 0; k < 3; k++) { const u = c1 - k * .03; if (u >= 0 && u < .012) x += sin(PI2 * 4400 * t) * sin(Math.PI * u / .012); }
        for (let k = 0; k < 4; k++) { const u = c2 - k * .028; if (u >= 0 && u < .01) x += sin(PI2 * 4850 * t) * sin(Math.PI * u / .01) * .6; } d[i] = x; if (!(i & 2047)) yield; } }, .45],
    vento: [8, function* (d, R) { const lp = BQ('lp', 500, .6), bp = BQ('bp', 1100, 6); let g = 0;
      for (let i = 0; i < d.length; i++) { const t = i / SR; if (!(i & 31)) { const a = .5 + .5 * sin(PI2 * t / 8), b = .5 + .5 * sin(PI2 * t * 3 / 8 + 2); g = .35 + .45 * a + .2 * b * a; lp.set(250 + 700 * g); }
        const n = R() * 2 - 1; d[i] = lp(n) * g + bp(n) * g * g * .35; if (!(i & 2047)) yield; } }, .7],
  };
  const EVA = {
    gabbiano: [1.3, function* (d) { let ph = 0; const bp = BQ('bp', 2200, 1.5); for (let i = 0; i < d.length; i++) { const t = i / SR; let e = 0, f = 1200;
        for (let k = 0; k < 3; k++) { const u = t - k * .32 - (k === 2 ? .15 : 0); if (u >= 0 && u < .24) { e = sin(Math.PI * u / .24); f = 1750 - 650 * u / .24 + 60 * sin(PI2 * 28 * u); } }
        ph = (ph + f / SR) % 1; d[i] = bp(ph * 2 - 1) * e; if (!(i & 2047)) yield; } }],
    cane: [.5, function* (d, R) { let ph = 0; const a = BQ('bp', 900, 2), b = BQ('bp', 1900, 3); for (let i = 0; i < d.length; i++) { const t = i / SR; let e = 0, f = 300;
        for (let k = 0; k < 2; k++) { const u = t - k * .24; if (u >= 0 && u < .14) { e = Math.min(1, u / .01) * exp(-u * 14); f = 340 - 500 * u; } }
        ph = (ph + f / SR) % 1; const x = (ph * 2 - 1) * .7 + (R() * 2 - 1) * .5; d[i] = (a(x) + b(x) * .6) * e; if (!(i & 2047)) yield; } }],
    campana: [3.6, function* (d, R) { const F = [.5, 1, 1.19, 1.5, 2, 2.6, 3.2], A = [.4, .55, .35, .25, .3, .15, .1], Dk = [.7, 1.1, 1.5, 1.8, 2.3, 3, 4], f0 = 300;
      for (let i = 0; i < d.length; i++) { const t = i / SR; let x = (R() * 2 - 1) * exp(-t * 80) * .3; for (let k = 0; k < 7; k++) x += A[k] * exp(-t * Dk[k]) * sin(PI2 * f0 * F[k] * t); d[i] = x; if (!(i & 2047)) yield; } }],
    motorino: [3.6, function* (d) { const lp = BQ('lp', 1300, .7); let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / SR, u = t / 3.6, f = 105 - 22 * u, e = sin(Math.PI * u); ph = (ph + f / SR) % 1;
        d[i] = lp((ph < .3 ? 1 : -.4) * (.7 + .3 * sin(PI2 * 47 * t))) * e * e; if (!(i & 2047)) yield; } }],
    clink: [.7, function* (d, R) { const F = [2400, 3700, 5100].map(f => f * (.95 + R() * .1)); for (let i = 0; i < d.length; i++) { const t = i / SR; let x = 0; for (let k = 0; k < 3; k++) x += exp(-t * (7 + k * 4)) * sin(PI2 * F[k] * t) / (k + 1); d[i] = x; if (!(i & 2047)) yield; } }],
    scricchiolo: [.9, function* (d, R) { const bp = BQ('bp', 650, 4); let ph = 0, g = 0; for (let i = 0; i < d.length; i++) { const t = i / SR; ph = (ph + (70 + 25 * sin(PI2 * t * 1.3)) / SR) % 1; if (!(i & 63)) g = R() < .7 ? R() : 0;
        d[i] = bp((ph * 2 - 1) * g) * sin(Math.PI * t / .9); if (!(i & 2047)) yield; } }],
    persiana: [.8, function* (d, R) { const bp = BQ('bp', 1500, 2), lp = BQ('lp', 250, .7); for (let i = 0; i < d.length; i++) { const t = i / SR, k = (t * 32) % 1 < .08 ? R() * 2 - 1 : 0;
        d[i] = (bp(k * 3) + lp(R() * 2 - 1) * .4) * Math.min(1, t * 20) * Math.min(1, (.8 - t) * 8); if (!(i & 2047)) yield; } }],
  };
  const AS = { on: !(typeof location !== 'undefined' && /[?&]noambiente\b/.test(location.search)), T: -9, L: {}, z: {}, ev: 0, vivi: 0, ora: -1, err: 0 };
  let busAmb = null, ambLP = null;
  function ambInit() {
    busAmb = ctx.createGain(); busAmb.gain.value = VOL.ambiente; ambLP = ctx.createBiquadFilter(); ambLP.type = 'lowpass'; ambLP.frequency.value = 16000; ambLP.Q.value = .5; busAmb.connect(ambLP); ambLP.connect(master);
    for (const n in AMB) { Musica.chiedi('a_' + n, AMB[n][0], AMB[n][1], AMB[n][2], 7 + n.length); const g = ctx.createGain(); g.gain.value = 0; g.connect(busAmb); AS.L[n] = { g, v: 0, s: null, zitto: 0 }; }
    for (const n in EVA) Musica.chiedi('u_' + n, EVA[n][0], EVA[n][1], .9, 3 + n.length);
  }
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  // il colpo d'occhio: le frazioni di caselle attorno (ogni mezzo secondo; 64 caselle)
  function guarda(st, R) {
    const p = st.player, G = typeof Game !== 'undefined' ? Game : null, z = AS.z; z.acqua = z.case = z.sabbia = z.verde = z.banchina = 0;
    if (G && G.tileAt && G.T) { const TS = G.TS || 2, T0 = G.T, cx = Math.floor(p.x / TS), cy = Math.floor(p.y / TS); let n = 0;
      for (let j = -7; j <= 7; j += 2) for (let i = -7; i <= 7; i += 2) { const v = G.tileAt(cx + i, cy + j); n++;
        if (v === T0.WATER) z.acqua++; else if (v === T0.BLD) z.case++; else if (v === T0.SAND || v === T0.DESERT || v === T0.SALT) z.sabbia++; else if (v === T0.GRASS || v === T0.FIELD || v === T0.TREE || v === T0.SHRUB) z.verde++; else if (v === T0.QUAY || v === T0.PIER) z.banchina++; }
      z.acqua /= n; z.case /= n; z.sabbia /= n; z.verde /= n; z.banchina /= n; }
    let gente = 0; const px = p.x, py = p.y; for (const q of st.npcs || []) { if (q.dead || q.inside) continue; const dx = q.x - px, dy = q.y - py; if (dx * dx + dy * dy < 324) gente++; } z.gente = gente;
    z.notte = 0; try { z.notte = R && R.nightLevel ? R.nightLevel(st.t) : 0; } catch (e) { } z.pioggia = !!(R && R.isRaining && R.isRaining(st.t));
    z.dentro = !!p.indoor; z.tetto = !!(p.lv && p.lv.k === 'tetto'); z.sotto = !!(p.lv && p.lv.k === 'ug');
    return z;
  }
  // i livelli dei letti per la zona (0..1); provati da test_suono.js
  function mescola(z, out) {
    const giorno = 1 - z.notte, fuori = z.sotto ? .1 : 1, aperto = 1 - clamp01(z.case * 1.4);
    out.mare = (.1 + .9 * clamp01(z.acqua * 2.5)) * fuori;
    out.porto = clamp01(z.banchina * 4) * clamp01(z.acqua * 4) * fuori;
    out.citta = clamp01(z.case * 1.8) * (1 - .55 * z.notte) * fuori;
    out.folla = clamp01((z.gente - 3) / 12) * (z.dentro ? .3 : 1) * (1 - .4 * z.notte);
    out.cicale = clamp01(z.verde * 2.2) * giorno * aperto * (z.pioggia ? 0 : 1) * fuori;
    out.grilli = z.notte * clamp01(z.verde * 1.5 + .3) * (1 - .6 * clamp01(z.case * 1.6)) * (z.pioggia ? .2 : 1) * fuori;
    out.vento = clamp01((z.tetto ? .75 : 0) + (z.acqua > .3 && z.case < .15 ? .35 : .06) + (z.pioggia ? .3 : 0)) * fuori;
    if (z.dentro) for (const k in out) if (k !== 'folla') out[k] *= .35;
    return out;
  }
  const AV = { mare: .55, porto: .45, citta: .35, folla: .32, cicale: .12, grilli: .1, vento: .3 };
  const AMIX = {};
  function ambiente(st, R, t) {
    if (!AS.on || !busAmb) return;
    if (t - AS.T > .5) { AS.T = t; const z = guarda(st, R); mescola(z, AMIX);
      ambLP.frequency.setTargetAtTime(z.dentro ? 650 : z.sotto ? 900 : 16000, t, .3);
      for (const n in AMB) { const L = AS.L[n], v = on ? AMIX[n] * AV[n] : 0, b = Musica.buf['a_' + n];
        if (v > .004 && !L.s && b) { const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(L.g); s.start(t, Math.random() * b.duration); L.s = s; AS.vivi++; }
        if (Math.abs(v - L.v) > .003) { L.v = v; L.g.gain.setTargetAtTime(v, t, 1.2); }
        if (L.s) { if (v <= .004) { L.zitto += .5; if (L.zitto > 5) { try { L.s.stop(t); L.s.disconnect(); } catch (e) { } L.s = null; L.zitto = 0; AS.vivi--; } } else L.zitto = 0; } }
      // gli eventi rari (al più due insieme)
      if (on && AS.ev < 2) { const g = 1 - z.notte, P = { gabbiano: g * (AMIX.porto * .1 + clamp01(z.acqua * 2) * .03), clink: AMIX.porto * .12, scricchiolo: AMIX.porto * .07,
          cane: clamp01(z.case * 2) * (.012 + .02 * z.notte), motorino: clamp01(z.case * 2) * (1 - .6 * z.notte) * .025, persiana: clamp01(z.case * 2) * g * .012 };
        for (const n in P) if (Math.random() < P[n] * .5 * (z.sotto ? 0 : 1)) { evento(n, t + Math.random() * .5, (n === 'motorino' ? .2 : n === 'gabbiano' ? .16 : .12) * (z.dentro ? .4 : 1)); break; } }
      // le campane: alle 7, a mezzogiorno e ai vespri (le 19), tre rintocchi da lontano
      const ora = Math.floor(((st.t || 0) / 60) % 24); if (AS.ora >= 0 && ora !== AS.ora && (ora === 7 || ora === 12 || ora === 19) && on && !z.sotto) for (let k = 0; k < 3; k++) evento('campana', t + .3 + k * 2.3, .14 * (z.dentro ? .4 : 1), -.35);
      AS.ora = ora; }
  }
  function evento(n, t, vol, pan) {
    const b = Musica.buf['u_' + n]; if (!b) return; AS.ev++;
    const s = ctx.createBufferSource(); s.buffer = b; s.playbackRate.value = .92 + Math.random() * .16; const g = ctx.createGain(); g.gain.value = vol; s.connect(g);
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pn) { pn.pan.value = pan !== undefined ? pan : Math.random() * 1.6 - .8; g.connect(pn); pn.connect(busAmb); } else g.connect(busAmb);
    s.start(t); s.onended = () => { AS.ev--; try { s.disconnect(); g.disconnect(); if (pn) pn.disconnect(); } catch (e) { } };
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
  // [suono] dal vivo: window.__suono (la musica, i passi, le voci)
  const stato = () => ({ contesto: ctx ? ctx.state : null, acceso: on, musica: HAS ? Musica.stato() : null, passi: { sup: PS.sup, n: PS.n }, ambiente: { zona: Object.assign({}, AS.z), letti: Object.keys(AS.L).filter(n => AS.L[n].s).map(n => n + ' ' + AS.L[n].v.toFixed(2)), eventi: AS.ev } });
  if (typeof window !== 'undefined') try { Object.defineProperty(window, '__suono', { get: stato, configurable: true }); } catch (e) { }
  return { init, play, update, bomboletta, radio, stato, mescola, toggle() { on = !on; if (ctx && on && ctx.state === 'suspended') ctx.resume(); return on; }, get on() { return on; } };
})();
