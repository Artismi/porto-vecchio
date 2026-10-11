// Porto Vecchio — Il misuratore per modulo [misura]
// Solo con ?perf nell'indirizzo (altrimenti non si installa e non costa niente). Cronometra, attribuendo il tempo al file
// da cui arriva: gli agganci del motore (HOOKS.step, move, think…: ogni modulo mette il suo davanti al precedente, il
// tempo proprio è quello meno i figli), i cicli a ogni fotogramma di ogni modulo (requestAnimationFrame), i timer
// (setInterval, setTimeout). Il file si riconosce dal tag <script data-m="…"> in cui la funzione è nata (o dal modulo
// che la stava eseguendo, per chi si riprogramma da sé). main.js lo mostra nel riquadro F3 (Misura.top()).
const Misura = (() => {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]perf\b/.test(location.search);
  const acc = {}, stack = [], labs = [];
  let t0 = typeof performance !== 'undefined' ? performance.now() : 0, frames = 0, last = [];
  const now = () => performance.now();
  const here = () => { const s = typeof document !== 'undefined' && document.currentScript; return (s && s.dataset && s.dataset.m) || labs[labs.length - 1] || 'altro'; };
  // avvolge fn: misura il tempo proprio (senza le funzioni misurate chiamate dentro) sotto l'etichetta lab
  function timed(fn, lab) {
    if (!ON || typeof fn !== 'function' || fn.__misura) return fn;
    const w = function () {
      const a = now(); stack.push(0); labs.push(lab.split(':')[0]);
      try { return fn.apply(this, arguments); }
      finally { const el = now() - a, ch = stack.pop(); labs.pop(); acc[lab] = (acc[lab] || 0) + el - ch; if (stack.length) stack[stack.length - 1] += el; }
    };
    w.__misura = true; return w;
  }
  // gli agganci del motore: ogni assegnazione a HOOKS.x viene avvolta col nome del modulo che la fa
  function hooks(H) {
    if (!ON || !H) return;
    ['step', 'move', 'think', 'create', 'verb', 'visible', 'res', 'over', 'jailed', 'wantedCap', 'playerWeapon', 'busy'].forEach(k => {
      let cur = H[k] ? timed(H[k], 'game:' + k) : H[k];
      Object.defineProperty(H, k, { configurable: true, enumerable: true, get: () => cur, set: f => { cur = typeof f === 'function' ? timed(f, here() + ':' + k) : f; } });
    });
  }
  if (ON && typeof window !== 'undefined') {
    const raf = window.requestAnimationFrame.bind(window), si = window.setInterval.bind(window), stO = window.setTimeout.bind(window);
    const tag = new WeakMap(), wrapped = new WeakMap();
    const wrap = (fn, kind) => { if (typeof fn !== 'function') return fn; let w = wrapped.get(fn); if (w) return w; const lab = (tag.get(fn) || here()) + ':' + kind; tag.set(fn, lab.split(':')[0]); w = timed(fn, lab); wrapped.set(fn, w); return w; };
    window.requestAnimationFrame = fn => raf(wrap(fn, 'ciclo'));
    window.setInterval = (fn, ms, ...a) => si(wrap(fn, 'timer'), ms, ...a);
    window.setTimeout = (fn, ms, ...a) => stO(wrap(fn, 'timer'), ms, ...a);
  }
  // main.js lo chiama a ogni fotogramma; ogni secondo si fa la media per fotogramma
  function frame() {
    if (!ON) return; frames++; const t = now();
    if (t - t0 < 1000) return;
    last = Object.entries(acc).map(([k, v]) => [k, v / frames]).sort((a, b) => b[1] - a[1]);
    for (const k in acc) acc[k] = 0; frames = 0; t0 = t;
  }
  const top = n => last.slice(0, n || 10);
  return { ON, timed, hooks, frame, top };
})();
