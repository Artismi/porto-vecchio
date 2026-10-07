// Prova della distruzione: in v7 i muraglioni non esistono più (MAP.wallAt è vuota) e le facciate non si
// sfondano a colpi d'auto (ramo disattivato in game.js): le brecce nascono dalle esplosioni (blastMap).
// Quindi: esplosione sulla facciata del Commissariato, l'auto entra nella stanza, la mappa si ripristina.
// Portato dalla radice il 7/10/2026 sulla mappa v7. Uso (dalla cartella src): node test_distruzione.js [seme]
global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js');
const G = Game, seed = +process.argv[2] || 5;
// l'esplosione buca la facciata e il piano terra diventa percorribile
{ const st = G.create(seed), p = st.player;
  st.vehicles.forEach(v => { if (v.traffic) { v.x = -50; v.hidden = true; } });
  const b = G.BUILDINGS.find(b => b.id === 'commissariato');
  const x = (b.x + 3) * 2, y = (b.y + b.h) * 2 + 1.5;
  const ev0 = st.fx.length;
  G.blastMap(st, x, y, 3.6);
  const hits = st.fx.slice(ev0).filter(e => e.k === 'facadehit');
  console.log('esplosione:', hits.length, 'colpi di facciata,', st.rooms.length, 'stanze aperte,', st.rooms.reduce((s, r) => s + r.cells.length, 0), 'celle');
  const cell = st.rooms[0].cells[0];
  console.log('prima cella aperta', cell.join(','), 'tile', G.tileAt(cell[0], cell[1]), 'percorribile', G.walkM(cell[0] * 2 + 1, cell[1] * 2 + 1));
  // l'auto entra nella breccia da sud
  const v = st.vehicles.find(k => k.kind === 'giulia' && !k.traffic); v.rider = 'player'; v.hp = 999; p.vehicle = v.id;
  v.x = x; v.y = y + 8; v.ang = -Math.PI / 2; v.vx = 0; v.vy = 0; v.w = 0; v.steer = 0; v.speed = 0; v._spd = 0; v.hidden = false;
  let beenInside = false;
  for (let i = 0; i < 75; i++) { G.step(st, 1 / 30, { x: 0, y: 0, drive: { thr: 1 } }); beenInside = beenInside || (v.x > b.x * 2 && v.x < (b.x + b.w) * 2 && v.y > b.y * 2 && v.y < (b.y + b.h) * 2); }
  console.log('auto passata dentro la stanza', beenInside, 'ferma a', v.x.toFixed(1), v.y.toFixed(1), 'bordo nord', b.y * 2, 'bordo sud', (b.y + b.h) * 2);
}
// ripristino: a una nuova partita la mappa torna intatta
{ const st2 = G.create(seed);
  const b = G.BUILDINGS.find(b => b.id === 'commissariato');
  const x = (b.x + 3) * 2, y = (b.y + b.h) * 2 + 1.5;
  G.blastMap(st2, x, y, 3.6);
  const cell = st2.rooms[0].cells[0];
  const st3 = G.create(seed);
  console.log('ripristino', G.tileAt(cell[0], cell[1]) === G.T.BLD ? 'ok' : 'NO');
}
// un'esplosione vera (veicolo) fa lo stesso lavoro del blastMap manuale
{ const st = G.create(seed), p = st.player;
  st.vehicles.forEach(v => { if (v.traffic) { v.x = -50; v.hidden = true; } });
  const b = G.BUILDINGS.find(b => b.id === 'commissariato');
  const tr = st.vehicles.find(v => v.id === 'v_ape');   // l'Ape è al calata, la si teletrasporta davanti alla facciata
  tr.x = (b.x + 3) * 2; tr.y = (b.y + b.h) * 2 + 1.5;
  G.explode(st, tr);
  console.log('esplosione dell\'Ape: stanze', st.rooms.length, 'celle', st.rooms.reduce((s, r) => s + r.cells.length, 0), 'fuochi', st.fires.length, 'carcassa', tr.wreck);
}
