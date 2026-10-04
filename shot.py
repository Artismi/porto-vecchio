# Istantanee della build: python3 shot.py out_prefix scenario...
# scenari: nome:x,y[,ora][,veicolo|arma]  es.  piazza:50,20,21  guida:60,48,22,car
import sys, json, asyncio
from playwright.async_api import async_playwright

HTML = 'file://' + __import__('os').path.abspath('.') + '/porto-vecchio.html'
JS = r'''
async ([x, y, hour, mode, frames, yaw]) => {
  const P = window.__pv, st = P.st, G = P.G, R = P.R;
  P.ui.intro = false; P.ui.letterbox = false;
  const scr = document.getElementById('screen'); if (scr) scr.innerHTML = ''; const bk = document.getElementById('book'); if (bk) bk.style.display = 'none';
  st.t = hour * 60; st.player.x = x; st.player.y = y;
  if (mode && G.WEAPONS[mode]) { st.player.arms[mode] = { mag: 30, reserve: 30 }; st.player.cur = mode; }
  if (mode && mode.startsWith('veh:')) {
    const kind = mode.slice(4);
    let v = st.vehicles.find(v => v.kind === kind && !v.traffic) || st.vehicles.find(v => v.kind === kind);
    if (v) { v.x = x; v.y = y; v.traffic = false; v.hidden = false; v.rider = 'player'; st.player.vehicle = v.id; v.ang = yaw || 0; v.speed = 0; }
  }
  if (mode === 'aim') { P.ui.aimPoint = { x: x + 6, y: y + 3 }; }
  R.snap(st);
  for (let i = 0; i < frames; i++) { G.step(st, 1/30, { x: 0, y: 0, freeze: true }); R.frame(st, 1/30, { aimPoint: P.ui.aimPoint, time: i / 30 }); }
  return [st.player.x, st.player.y];
}
'''
async def main():
    prefix = sys.argv[1]
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 600})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console:' + m.text) if m.type == 'error' else None)
        await pg.goto(HTML)
        await pg.wait_for_timeout(1500)
        await pg.keyboard.press('Enter')
        await pg.wait_for_timeout(300)
        for sc in sys.argv[2:]:
            name, rest = sc.split(':', 1)
            a = rest.split(',')
            x, y = float(a[0]), float(a[1]); hour = float(a[2]) if len(a) > 2 else 21
            mode = a[3] if len(a) > 3 else ''
            yaw = float(a[4]) if len(a) > 4 else 0
            frames = int(a[5]) if len(a) > 5 else (30 if mode.startswith('veh:') else 6)
            await pg.evaluate(JS, [x, y, hour, mode, frames, yaw])
            await pg.screenshot(path=f'{prefix}_{name}.png')
        print('\n'.join(errs[:10]) or 'nessun errore')
        await b.close()
asyncio.run(main())
