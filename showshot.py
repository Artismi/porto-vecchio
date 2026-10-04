import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        pg = await b.new_page(viewport={'width':1200,'height':800})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file://' + __import__('os').path.abspath('.') + '/showroom.html'); await pg.wait_for_timeout(800)
        for w in sys.argv[2:]:
            await pg.evaluate(f"show('{w}')"); await pg.screenshot(path=f'{sys.argv[1]}_{w}.png')
        print(errs or 'ok'); await b.close()
asyncio.run(main())
