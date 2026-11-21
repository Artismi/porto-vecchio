// toglie dichiarazioni di funzione (per nome) da un file, con il commento di una riga subito sopra se indicato
const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');
const [file,...names]=process.argv.slice(2);const conCommento=new Set((process.env.CON_COMMENTO||'').split(',').filter(Boolean));
const t=fs.readFileSync(file,'utf8');const ast=acorn.parse(t,{ecmaVersion:'latest',locations:true,allowReturnOutsideFunction:true});
const L=t.split('\n');const via=new Set();let righe=0,byte=0;
walk.full(ast,n=>{if(n.type==='FunctionDeclaration'&&names.includes(n.id.name)){let a=n.loc.start.line,b=n.loc.end.line;
 // la dichiarazione deve occupare righe intere
 if(L[a-1].slice(0,n.loc.start.column).trim()!==''||L[b-1].slice(n.loc.end.column).trim()!=='')throw new Error('non a righe intere: '+n.id.name);
 if(conCommento.has(n.id.name)&&/^\s*\/\/ /.test(L[a-2]))a--;
 for(let i=a;i<=b;i++){via.add(i);byte+=Buffer.byteLength(L[i-1])+1}righe+=b-a+1;console.log('tolta',n.id.name,a+'-'+b);}});
// una riga vuota rimasta doppia
const out=L.filter((_,i)=>!via.has(i+1));fs.writeFileSync(file,out.join('\n'));console.log('righe',righe,'byte',byte);
