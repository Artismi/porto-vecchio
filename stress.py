import asyncio, sys
from playwright.async_api import async_playwright
S=(sys.argv[1] if len(sys.argv) > 1 else '/tmp/') + '/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':960,'height':600})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + __import__('os').path.abspath('.') + '/porto-vecchio.html'); await pg.wait_for_timeout(1500)
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('book').style.display='none'")
        run = """async ([code, frames, shotEvery]) => { const P=__pv, st=P.st, G=P.G, R=P.R; P.ui.intro=false;
          const f = new Function('st','G','R','P','i', code);
          for (let i=0;i<frames;i++){ f(st,G,R,P,i); G.step(st,1/30,P.__inp||{x:0,y:0}); R.frame(st,1/30,{aimPoint:P.ui.aimPoint,time:st.clock}); } }"""
        # 1. scontro a fuoco in piazza con la lupara, di sera
        await pg.evaluate(run, ["""if(i===0){ st.t=20.5*60; const p=st.player; p.x=136; p.y=116; p.arms.lupara={mag:2,reserve:40}; p.arms.pistola={mag:15,reserve:60}; p.arms.mitra={mag:30,reserve:90}; p.arms.molotov={mag:5}; p.cur='lupara'; R.snap(st); P.ui.aimPoint={x:142,y:122}; }
          if(i%8===0 && i<40){ G.fire(st, Math.atan2(6,6), P.ui.aimPoint, true); }""", 42, 0])
        await pg.screenshot(path=S+'f_lupara.png')
        await pg.evaluate(run, ["""if(i===0){ st.player.cur='mitra'; st.player.face=0.2; P.ui.aimPoint={x:148,y:118}; }
          G.fire(st, 0.2, P.ui.aimPoint, i%2===0);""", 20, 0])
        await pg.screenshot(path=S+'f_mitra.png')
        # 2. auto colpita fino a esplodere
        await pg.evaluate(run, ["""if(i===0){ const v=st.vehicles.find(v=>v.id==='v_sandro'); st.player.x=v.x-7; st.player.y=v.y-1; st.player.cur='pistola'; R.snap(st); P.__v=v; }
          if(i%3===0 && !P.__v.burning && !P.__v.wreck){ G.fire(st, Math.atan2(P.__v.y-st.player.y, P.__v.x-st.player.x), {x:P.__v.x,y:P.__v.y}, true); st.player.arms.pistola.mag=15; }""", 90, 0])
        await pg.screenshot(path=S+'f_danni.png')
        await pg.evaluate(run, ["", 110, 0])
        await pg.screenshot(path=S+'f_esplosione.png')
        # 3. molotov
        await pg.evaluate(run, ["""if(i===0){ st.player.cur='molotov'; P.ui.aimPoint={x:st.player.x+8,y:st.player.y+2}; G.fire(st, Math.atan2(2,8), P.ui.aimPoint, true); }""", 25, 0])
        await pg.screenshot(path=S+'f_molotov.png')
        # 4. guida lungo la Via al Mare nel borgo
        await pg.evaluate(run, ["""if(i===0){ const v=st.vehicles.find(v=>v.id==='pk_flamingo'); st.player.vehicle=null; v.rider='player'; st.player.vehicle=v.id; v.x=110; v.y=144.6; v.ang=0; st.t=21*60; }
          P.__inp={x:1,y:0,aim:0};""", 120, 0])
        await pg.screenshot(path=S+'f_guida.png')
        print(errs[:8] or 'nessun errore', await pg.evaluate("[__pv.st.player.x.toFixed(1), __pv.st.vehicles.filter(v=>v.wreck).length]"))
        await b.close()
asyncio.run(main())
