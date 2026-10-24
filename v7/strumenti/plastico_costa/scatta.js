const path=require('path'),http=require('http'),fs=require('fs');const {chromium}=require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const dir=__dirname, scene=process.argv.slice(2);
const srv=http.createServer((q,r)=>{const p=path.join(dir,q.url.split('?')[0].split('#')[0]);fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':'application/javascript'});r.end(d);});}).listen(0,async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 for(const s of scene){const pg=await b.newPage({viewport:{width:1280,height:800}});pg.on('pageerror',e=>console.log('[errore]',s,e.message));pg.on('console',m=>{if(m.type()==='error')console.log('[console]',m.text())});
  const t0=Date.now();await pg.goto(`http://localhost:${srv.address().port}/pagina.html#${s}`);await pg.waitForFunction(()=>window.__pronto,null,{timeout:600000});
  await pg.screenshot({path:path.join(dir,'out_'+s+'.png')});console.log(s,((Date.now()-t0)/1000).toFixed(0)+'s');await pg.close();}
 await b.close();srv.close();});
