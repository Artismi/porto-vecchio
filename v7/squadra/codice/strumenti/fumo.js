// prova di fumo: la pagina del gioco (v7 della copia di lavoro) si apre, i lavoratori nascono dal testo ricomposto, nessun errore di pagina
const path=require('path'),http=require('http'),fs=require('fs');const {chromium}=require('/opt/node-tools/node_modules/playwright-core');
const root=process.argv[2],Q=process.argv[3]||'?tasselli=0',ATTESA=+(process.argv[4]||240);
const TY={'.html':'text/html','.js':'application/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary','.gz':'application/octet-stream','.woff2':'font/woff2','.webp':'image/webp','.bin':'application/octet-stream'};
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]);if(u==='/')u='/index.html';if(u.startsWith('/api/')){r.writeHead(503);r.end('{}');return}
 fs.readFile(path.join(root,u),(e,d)=>{if(e){r.writeHead(404);r.end();return}r.writeHead(200,{'Content-Type':TY[path.extname(u)]||'application/octet-stream'});r.end(d)})}).listen(0,async()=>{
 const port=srv.address().port,T0=Date.now(),log=(...a)=>console.log(`[${((Date.now()-T0)/1000)|0} s]`,...a);
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const pg=await b.newPage({viewport:{width:480,height:300}});const err=[];pg.on('pageerror',e=>{err.push(e.message);log('[errore pagina]',e.message.slice(0,200))});
 pg.on('console',m=>{const t=m.text();if(/\[errori\]|lavoratore|Worker|Writing|disegnatore/i.test(t))log('[console]',m.type(),t.slice(0,200))});
 await pg.goto(`http://127.0.0.1:${port}/index.html${Q}`,{timeout:120000});log('aperta');
 // i due lavoratori dal testo ricomposto, come writing.js e calcolo.js
 const w=await pg.evaluate(async()=>{const LET=el=>{if(!el)return '';if(el.textContent)return el.textContent;const n=(el.dataset&&el.dataset.da||'').split(' ').filter(Boolean),t=n.map(k=>{const s=document.querySelector('script[data-m="'+k+'"]');return s?s.textContent:null});return n.length&&t.every(x=>x)?t.join('\n'):''};
  const prova=(code)=>new Promise(res=>{try{const W=new Worker(URL.createObjectURL(new Blob([code],{type:'text/javascript'})));let fatto=false;W.onerror=e=>{if(!fatto){fatto=true;res('errore: '+(e.message||e))}};setTimeout(()=>{if(!fatto){fatto=true;res('vivo (nessun errore in 3 s)');W.terminate()}},3000)}catch(e){res('eccezione '+e.message)}});
  const a=LET(document.getElementById('pv-artworker')),c=LET(document.getElementById('calcolo-lavoratore'));
  return {arte:a.length,calcolo:c.length,arteW:await prova('const document = { createElement: () => new OffscreenCanvas(1, 1) };\n'+a),calcoloW:await prova(c)};});
 log('lavoratori',JSON.stringify(w));
 for(let s=0;s<ATTESA;s+=15){await pg.waitForTimeout(15000);const r=await pg.evaluate(()=>({pronto:!!(window.__pv&&window.__pv.st&&window.__pv.st.player),calc:window.__calcolo,err:window.__errori,artw:window.Writing&&Writing._&&Writing._.ARTW?{ok:Writing._.ARTW.ok,w:!!Writing._.ARTW.w}:null}));
  log(JSON.stringify(r));if(r.pronto&&s>=60)break;}
 log('errori di pagina',err.length);await b.close();srv.close();process.exit(err.length?1:0);});
