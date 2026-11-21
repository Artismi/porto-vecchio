// due sorgenti, compressi da terser (toglie il codice irraggiungibile e le funzioni mai usate), devono dare lo stesso testo
const fs=require('fs'),{minify}=require('terser');
(async()=>{const [a,b]=process.argv.slice(2);const o={compress:{passes:2,unused:true,dead_code:true,inline:false,sequences:false,join_vars:false,reduce_funcs:false,reduce_vars:false,collapse_vars:false},mangle:false,format:{comments:false}};
const A=(await minify(fs.readFileSync(a,'utf8'),o)).code,B=(await minify(fs.readFileSync(b,'utf8'),o)).code;
console.log(A===B?'UGUALI dopo la compressione':'DIVERSI',A.length,B.length);
if(A!==B){let i=0;while(A[i]===B[i])i++;console.log('primo punto diverso:\n A: '+A.slice(Math.max(0,i-200),i+200)+'\n B: '+B.slice(Math.max(0,i-200),i+200));}})();
