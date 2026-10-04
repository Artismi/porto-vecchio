    // [inverno] abeti e pini con la neve sui palchi, betulle spoglie, arbusti sepolti
    const SNOW = '#e6eaf0', SNOW2 = '#d6dce6';
    const tree = (x, z, kind, r) => {
      const y = groundH(x, z) - .1, s = .7 + r() * .55;
      if (kind === 'abete' || kind === 'pino') {
        const h = (kind === 'pino' ? 1.6 : .7) * s; put(L.trunk, x, y, z, .9, h + .6, .9, r() * 6, null);
        const tiers = kind === 'pino' ? 2 : 3, w0 = (kind === 'pino' ? 1.9 : 1.7) * s, dark = pick(r, ['#1e3426', '#24402c', '#1a2e22', '#2a3e2e']);
        for (let k = 0; k < tiers; k++) { const w = w0 * (1 - k * .26), hh = (kind === 'pino' ? 1.5 : 2.1) * s * (1 - k * .15), yy = y + h + k * hh * .62; put(L.cone, x, yy, z, w, hh, w, r() * 6, dark); put(L.cone, x, yy + hh * .38, z, w * .78, hh * .55, w * .78, r() * 6, k % 2 ? SNOW2 : SNOW); }
      }
      else if (kind === 'betulla') { const h = (4.5 + r() * 2) * s; put(L.trunk, x, y, z, .55, h, .55, r() * 6, null, (r() - .5) * .15); put(L.bark, x, y + .2, z, .5, h - .4, .5, 0, '#e8e4dc'); const cw = (1 + r() * .5) * s; put(L.leaf, x, y + h + cw * .3, z, cw, cw * 1.3, cw, r() * 6, pick(r, ['#5a4e48', '#6a5a50', '#4e4440'])); put(L.leaf, x, y + h + cw * .9, z, cw * .6, cw * .3, cw * .6, 0, SNOW); }
      else if (kind === 'secco') { const h = (2 + r() * 1.5) * s; put(L.trunk, x, y, z, .9, h, .9, r() * 6, null, (r() - .5) * .3); for (let k = 0; k < 3; k++) { const a = r() * 6.3; put(L.trunk, x + Math.cos(a) * .4, y + h * .7, z + Math.sin(a) * .4, .35, h * .5, .35, a, null, .7); } }
      else { const h = (1.6 + r() * 1.2) * s, cw = (1.2 + r() * .6) * s; put(L.trunk, x, y, z, .8, h, .8, r() * 6, null, (r() - .5) * .25); put(L.leaf, x, y + h + cw * .4, z, cw, cw * .75, cw, r() * 6, pick(r, ['#3a4434', '#46503e', '#343c30'])); put(L.leaf, x, y + h + cw * .85, z, cw * .8, cw * .35, cw * .8, r() * 6, SNOW); }
    };
