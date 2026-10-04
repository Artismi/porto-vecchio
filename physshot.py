# Prove della fisica di guida e delle rotture: python3 physshot.py /tmp/ph
import sys, asyncio, os
from playwright.async_api import async_playwright
HTML = 'file://' + os.path.abspath('porto-vecchio.html')
PRE = open('dzshot.py').read().split("PRE = r'''")[1].split("'''")[0]
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
        await E("__dz.setup(21)")
        await E("window.__pv.st.vehicles.forEach(v => { if (v.traffic) v.hidden = true; })")
        # lampioni della Via al Mare
        lamps = await E("window.__pv.R.__dz.props.filter(r => r.light).map(r => [r.c.x, r.c.z]).filter(([x,z]) => z > 44 && z < 56).slice(0, 40)")
        print('lampioni vicino alla strada', lamps[:12])
        lx, lz = lamps[len(lamps)//2]
        # 1) Giulia contro un lampione
        await E(f"__dz.car('giulia', {lx - 14}, {lz}, 0)")
        await E(f"window.__pv.st.vehicles.find(v=>v.id===window.__pv.st.player.vehicle).speed = 14")
        await E("__dz.run(26, {x:1,y:0})"); await shot('1_lampione'); 
        await E("__dz.run(14, {x:1,y:0})"); await shot('1b_lampione_dopo')
        print('dopo lampione', await E("(() => { const st=window.__pv.st, v=st.vehicles.find(v=>v.id===st.player.vehicle); return {sp: v.speed.toFixed(1), gone: window.__pv.R.__dz.props.filter(r=>r.light && r.state>0).length}; })()"))
        # 2) freno a mano in strada: segni e fumo
        await E("__dz.car('giulia', 120, 49.5, 0)")
        await E("window.__pv.st.vehicles.find(v=>v.id===window.__pv.st.player.vehicle).speed = 16")
        await E("__dz.run(8, {x:1,y:0})"); await E("__dz.run(16, {x:0,y:-1,brake:true})"); await shot('2_derapata')
        await E("__dz.run(14, {x:-1,y:0})"); await shot('2b_derapata_fine')
        # 3) tamponamento: auto ferma in mezzo alla strada
        await E("""(() => { const st=window.__pv.st; const o = st.vehicles.find(v => v.kind==='ritmo' && !v.traffic) || st.vehicles.find(v=>v.kind==='cinquecento' && !v.traffic); o.rider=null; o.x=170; o.y=49; o.ang=Math.PI/2+.3; o.speed=0; o.hidden=false; o.vx=0; o.vy=0; o.w=0; o._spd=0; window.__o=o.id; })()""")
        await E("__dz.car('giulia', 150, 49.3, 0)")
        await E("window.__pv.st.vehicles.find(v=>v.id===window.__pv.st.player.vehicle).speed = 16")
        await E("__dz.run(36, {x:1,y:0})"); await shot('3_tamponamento')
        await E("__dz.run(20)"); await shot('3b_dopo')
        print('urtata', await E("(() => { const o=window.__pv.st.vehicles.find(v=>v.id===window.__o); return [o.x.toFixed(1), o.y.toFixed(1), o.ang.toFixed(2), o.hp.toFixed(0)]; })()"))
        # 4) vetrina: Ritmo contro la facciata sud di un hotel
        await E("__dz.car('ritmo', 172, 51, -Math.PI/2)")
        await E("window.__pv.st.vehicles.find(v=>v.id===window.__pv.st.player.vehicle).speed = 8")
        await E("__dz.run(14, {x:0,y:-1})"); await shot('4_vetrina')
        await E("__dz.onfoot(176, 51, -Math.PI/2)"); await E("__dz.run(20)"); await shot('4b_vetrina_a_piedi')
        print('facciate', await E("JSON.stringify(window.__pv.st.facadeHits)"), 'stanze', await E("window.__pv.st.rooms.length"))
        # 5) spari a una vetrina e a un lampione
        await E(f"__dz.onfoot(160, 51, -Math.PI/2)")
        await E("(() => { const P=window.__pv, st=P.st, p=st.player; p.arms.pistola={mag:40,reserve:40}; p.cur='pistola'; for (let k=0;k<10;k++){ p.cool=0; P.G.fire(st, -Math.PI/2 + (k-5)*.08, null, true); __dz.run(2); } })()")
        await E("__dz.run(10)"); await shot('5_spari_vetrine')
        print('\n'.join(errs[:15]) or 'nessun errore')
        await b.close()
asyncio.run(main())
