# Prove di distruzione: python3 dzshot.py /tmp/dz
import sys, asyncio, os
from playwright.async_api import async_playwright
HTML = 'file://' + os.path.abspath('porto-vecchio.html')
PRE = r'''
window.__dz = {
  setup(hour) { const P = window.__pv, st = P.st; P.ui.intro = false; P.ui.letterbox = false; const scr = document.getElementById('screen'); if (scr) scr.innerHTML = ''; const bk = document.getElementById('book'); if (bk) bk.style.display = 'none'; st.t = hour * 60; },
  car(kind, x, y, ang) { const P = window.__pv, st = P.st, p = st.player; let v = st.vehicles.find(v => v.kind === kind && !v.traffic && !v.wreck) || st.vehicles.find(v => v.kind === kind); v.x = x; v.y = y; v.ang = ang; v.speed = 0; v.traffic = false; v.hidden = false; v.hp = 999; v.rider = 'player'; p.vehicle = v.id; p.x = x; p.y = y; P.R.snap(st); return v.id; },
  onfoot(x, y, face) { const P = window.__pv, st = P.st, p = st.player; if (p.vehicle) { const v = st.vehicles.find(v => v.id === p.vehicle); v.rider = null; v.speed = 0; } p.vehicle = null; p.x = x; p.y = y; p.face = face || 0; P.R.snap(st); },
  run(n, inp) { const P = window.__pv, st = P.st; for (let i = 0; i < n; i++) { P.G.step(st, 1 / 30, inp || { x: 0, y: 0 }); P.R.frame(st, 1 / 30, { aimPoint: P.ui.aimPoint, time: i / 30 }); } },
  info() { const st = window.__pv.st, D = window.__pv.R.__dz; return { breaches: st.breaches, wallHits: st.wallHits, facade: st.facadeHits, bodies: D.bodies.length, props: D.props.length, gone: D.props.filter(r => r.state === 2).length, live: D.props.filter(r => r.state === 1).length, debris: D.debris.live.reduce((a, b) => a + (b ? 1 : 0), 0) }; },
};
'''
async def main():
    pre = sys.argv[1]
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width': 960, 'height': 600})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append('console:' + m.text) if m.type == 'error' else None)
        await pg.goto(HTML); await pg.wait_for_timeout(1500); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        await pg.evaluate(PRE)
        E = pg.evaluate
        async def shot(n): await pg.screenshot(path=f'{pre}_{n}.png')
        await E("__dz.setup(16)")
        # 1) Giulia contro il muraglione di Levante: due botte
        await E("__dz.car('giulia', 183, 27.5, -Math.PI/2)")
        await E("__dz.run(22, {x:0,y:-1})"); await E("__dz.run(3)"); await shot('1_botta1'); print(await E("__dz.info()"))
        await E("__dz.run(30, {x:0,y:0,back:true})"); await E("__dz.run(40, {x:0,y:-1})"); await E("__dz.run(3)"); await shot('2_breccia')
        print(await E("__dz.info()"))
        await E("__dz.run(40)"); await shot('2b_polvere')
        await E("__dz.onfoot(186, 32, -Math.PI/2)"); await E("__dz.run(30)"); await shot('3_breccia_a_piedi')
        # 1b) Vespa contro il muraglione del Ponente: tre botte, poi su in pineta
        await E("__dz.car('vespa', 41, 17, -Math.PI/2)")
        for k in range(3):
            await E("__dz.run(30, {x:0,y:-1})"); await E("__dz.run(22, {x:0,y:0,back:true})")
        print(await E("__dz.info()"))
        await E("__dz.run(40, {x:0,y:-1})"); await shot('3b_vespa_su')
        await E("__dz.onfoot(44, 18, -Math.PI/2)"); await E("__dz.run(30)"); await shot('3c_vespa_breccia')
        # 2) Ritmo contro la facciata sud di un hotel
        await E("__dz.car('ritmo', 172, 49, -Math.PI/2)")
        for k in range(3):
            await E("__dz.run(30, {x:0,y:-1})"); await E("__dz.run(40, {x:0,y:0,back:true})")
        await E("__dz.onfoot(176, 48, -Math.PI/2)"); await E("__dz.run(25)"); await shot('4_facciata'); print(await E("__dz.info()"))
        # 3) corsa sulla calata in mezzo alle casse
        await E("__dz.car('giulia', 92, 55, 0)"); await E("__dz.run(35, {x:1,y:0})"); await shot('5_corsa'); await E("__dz.run(30, {x:1,y:0})"); await shot('6_corsa2'); print(await E("__dz.info()"))
        await E("__dz.onfoot(120, 52, 0)"); await E("__dz.run(40)"); await shot('7_dopo_corsa')
        # 4) corsa nel vicolo del borgo (150,30)
        await E("__dz.car('giulia', 134, 31, 0)"); await E("__dz.run(40, {x:1,y:0})"); await shot('7b_vicolo'); print(await E("__dz.info()"))
        # 5) raffica di Skorpion su una facciata
        await E("__dz.onfoot(100, 31, -Math.PI/2)")
        await E("(() => { const P=window.__pv, st=P.st, p=st.player; p.arms.mitra={mag:80,reserve:80}; p.cur='mitra'; for (let k=0;k<40;k++){ p.cool=0; P.G.fire(st, -Math.PI/2 + (Math.random()-.5)*.6, null, true); __dz.run(1); } })()")
        await E("__dz.run(10)"); await shot('8_spari')
        # 6) esplosione in mezzo agli oggetti della calata
        await E("(() => { const st=window.__pv.st; const v = st.vehicles.find(v => v.kind==='cinquecento' && !v.wreck); v.rider=null; st.player.vehicle=null; v.x=128; v.y=55; v.ang=0; v.hidden=false; v.hp=0; v.burning=.01; })()")
        await E("__dz.onfoot(122, 50, 0)"); await E("__dz.run(8)"); await shot('9_boom'); await E("__dz.run(45)"); await shot('10_dopo_boom'); print(await E("__dz.info()"))
        print('\n'.join(errs[:15]) or 'nessun errore')
        await b.close()
asyncio.run(main())
