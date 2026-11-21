// il testo che il Web Worker riceveva (blocco text/plain della pagina di prima) e quello che riceve ora (i data-m nominati in data-da)
const fs=require('fs');const [vecchia,nuova]=process.argv.slice(2);const V=fs.readFileSync(vecchia,'utf8'),N=fs.readFileSync(nuova,'utf8');
// come il parser HTML: il contenuto di <script> finisce al primo </script
const blocco=(H,re)=>{const m=re.exec(H);if(!m)return null;const a=m.index+m[0].length;return H.slice(a,H.indexOf('</script',a));};
const dataM=(H,k)=>blocco(H,new RegExp('<script data-m="'+k+'">'));
for(const [id,mods] of [['pv-artworker',['writer_mano','writer_arte','pennelli']],['calcolo-lavoratore',['calcolo_lavoratore']]]){
  const prima=blocco(V,new RegExp('<script type="text/plain" id="'+id+'">'));
  const el=new RegExp('<script type="text/plain" id="'+id+'" data-da="([^"]*)">').exec(N);const vuoto=blocco(N,new RegExp('<script type="text/plain" id="'+id+'"[^>]*>'));
  const ora=el[1].split(' ').map(k=>dataM(N,k)).join('\n');
  console.log(id,'prima',prima.length,'ora',ora.length,'blocco ora vuoto:',vuoto==='',prima===ora?'IDENTICO':'DIVERSO');}
