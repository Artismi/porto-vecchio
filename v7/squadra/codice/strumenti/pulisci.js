// pulisci.js file: dopo piega.js. Toglie (1) if (false) S; senza else, (2) le istruzioni dopo un return/throw/break/continue
// nello stesso blocco (non le dichiarazioni di funzione, che si sollevano), (3) un blocco che termina sempre seguito da istruzioni
// irraggiungibili. Una correzione per giro.
const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');
const file=process.argv[2];let src=fs.readFileSync(file,'utf8');
const term=s=>s&&(['ReturnStatement','ThrowStatement','BreakStatement','ContinueStatement'].includes(s.type)||(s.type==='BlockStatement'&&s.body.length&&term(s.body[s.body.length-1])));
let n=0;
for(let g=0;g<500;g++){const ast=acorn.parse(src,{ecmaVersion:'latest',allowReturnOutsideFunction:true});let ed=null;
 walk.full(ast,x=>{if(ed)return;
  if(x.type==='IfStatement'&&x.test.type==='Literal'&&x.test.value===false&&!x.alternate){ed=[x.start,x.end,''];return}
  const body=x.type==='BlockStatement'?x.body:x.type==='SwitchCase'?x.consequent:null;if(!body)return;
  for(let i=0;i<body.length-1;i++)if(term(body[i])){const resto=body.slice(i+1).filter(s=>s.type!=='FunctionDeclaration');
    if(resto.length){ed=[resto[0].start,resto[resto.length-1].end,''];if(resto.length!==body.length-i-1){ed=[resto[0].start,resto[0].end,''];}return}}
 });
 if(!ed)break;n++;
 let [a,b,s]=ed;// la riga intera se resta vuota
 const ls=src.lastIndexOf('\n',a-1)+1,le=src.indexOf('\n',b);const prima=src.slice(ls,a),dopo=src.slice(b,le);
 if(prima.trim()===''&&(dopo.trim()===''||/^\s*\/\//.test(dopo))){a=ls;b=le+1;}
 else if(dopo.trim()===''||/^\s*\/\//.test(dopo)){/* tieni il commento di fine riga */}
 src=src.slice(0,a)+s+src.slice(b);}
fs.writeFileSync(file,src);console.log(file,'correzioni',n);
