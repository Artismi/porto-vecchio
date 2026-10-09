
// ---------- Suoni sintetizzati: nessun file esterno ----------
var Audio8 = (function () {
  let ctx = null, master = null, noise = null, on = true, engine = null, siren = null, sea = null, rainN = null, screech = null;
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
    }
    else engine.g.gain.setTargetAtTime(0, t, .15);
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
  return { init, play, update, toggle() { on = !on; if (ctx && on && ctx.state === 'suspended') ctx.resume(); return on; }, get on() { return on; } };
})();
