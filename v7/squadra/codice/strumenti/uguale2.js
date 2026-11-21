// prova: il sorgente di prima con l'interruttore assente (il test sull'indirizzo sostituito da false) e il sorgente di dopo,
// compressi da terser con la propagazione delle costanti e l'eliminazione del codice irraggiungibile, danno lo stesso testo
const fs=require('fs'),{minify}=require('terser');
(async()=>{const [a,b,...flags]=process.argv.slice(2);let A0=fs.readFileSync(a,'utf8');let n=0;
for(const f of flags){const re=new RegExp("/\\[\\?&\\]"+f+"\\\\b/\\.test\\([^()]*(\\([^()]*\\))?[^()]*\\)","g");A0=A0.replace(re,()=>{n++;return 'false'});}
A0=A0.replace(/typeof location === 'undefined' \|\| !false/g,'true').replace(/typeof location !== 'undefined' && false/g,'false');
console.log('test sostituiti',n);
const o={compress:{passes:3,unused:true,dead_code:true,inline:false,sequences:false,join_vars:false,collapse_vars:false,reduce_funcs:false,toplevel:false},mangle:false,format:{comments:false,beautify:true}};
const A=(await minify(A0,o)).code,B=(await minify(fs.readFileSync(b,'utf8'),o)).code;
console.log(A===B?'UGUALI dopo la compressione':'DIVERSI',A.length,B.length);
if(A!==B){const la=A.split('\n'),lb=B.split('\n');let i=0;while(la[i]===lb[i])i++;let j=0;while(la[la.length-1-j]===lb[lb.length-1-j])j++;
console.log('--- prima\n'+la.slice(i,la.length-j).join('\n').slice(0,1500)+'\n--- dopo\n'+lb.slice(i,lb.length-j).join('\n').slice(0,1500));}})();
