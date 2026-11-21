// piega.js file NOME [NOME...]: le variabili NOME valgono sempre true (l'interruttore «com'era» non c'è più).
// Riscrive solo i punti dove compaiono: FLAG ? a : b -> a; !FLAG ? a : b -> b; FLAG && x -> x; !FLAG || x -> x; x && FLAG -> x;
// if (FLAG) S [else T] -> S; if (!FLAG) S [else T] -> T (o niente); la dichiarazione const FLAG = ...; sparisce.
// Una passata per volta (dall'interno), finché resta qualcosa. Se trova una forma che non sa piegare, si ferma e la stampa.
const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');
const [file,...flags]=process.argv.slice(2);const F=new Set(flags);
let src=fs.readFileSync(file,'utf8');
const isF=n=>n&&n.type==='Identifier'&&F.has(n.name);
const isNF=n=>n&&n.type==='UnaryExpression'&&n.operator==='!'&&isF(n.argument);
const txt=n=>src.slice(n.start,n.end);
const PREC={'??':1,'||':2,'&&':3,'|':4,'^':5,'&':6,'==':7,'!=':7,'===':7,'!==':7,'<':8,'>':8,'<=':8,'>=':8,'in':8,'instanceof':8,'<<':9,'>>':9,'>>>':9,'+':10,'-':10,'*':11,'/':11,'%':11,'**':12};
const SEMPL=new Set(['Identifier','Literal','MemberExpression','CallExpression','NewExpression','TemplateLiteral','ArrayExpression','UnaryExpression','UpdateExpression','ThisExpression','ChainExpression']);
let PADRE=null,KID=null;
function par(s){const c=KID,p=PADRE;if(!c)return '('+s+')';
  if(SEMPL.has(c.type))return s;
  if(c.type==='SequenceExpression')return '('+s+')';
  if(!p)return '('+s+')';
  const libero=(p.type==='IfStatement'&&p.test===NODO)||(p.type==='VariableDeclarator')||(p.type==='Property'&&p.value===NODO)||p.type==='ReturnStatement'||(p.type==='ArrowFunctionExpression'&&c.type!=='ObjectExpression')||p.type==='CallExpression'&&p.callee!==NODO||p.type==='ArrayExpression'||(p.type==='AssignmentExpression'&&p.right===NODO)||(p.type==='ConditionalExpression'&&p.test!==NODO)||p.type==='TemplateLiteral';
  if(libero)return s;
  if((p.type==='LogicalExpression'||p.type==='BinaryExpression')&&(c.type==='LogicalExpression'||c.type==='BinaryExpression')){
    const pc=PREC[c.operator],pp=PREC[p.operator];const mix=(c.operator==='??')!==(p.operator==='??');
    if(!mix&&(pc>pp||(pc===pp&&p.left===NODO)))return s;}
  if(p.type==='ConditionalExpression'&&p.test===NODO&&(c.type==='LogicalExpression'||c.type==='BinaryExpression'))return s;
  return '('+s+')';}
let NODO=null;
for(let giro=0;giro<200;giro++){
  const ast=acorn.parse(src,{ecmaVersion:'latest',allowReturnOutsideFunction:true});
  let ed=null;
  for(const resto of [false,true]){if(ed)break;
  walk.fullAncestor(ast,(n,_,anc)=>{if(ed)return;
    if(n.type==='ConditionalExpression'&&(isF(n.test)||isNF(n.test))){const k=isF(n.test)?n.consequent:n.alternate;NODO=n;PADRE=anc[anc.length-2];KID=k;ed=[n.start,n.end,par(txt(k))];return}
    if(n.type==='LogicalExpression'){
      if(n.operator==='&&'&&isF(n.left)){{NODO=n;PADRE=anc[anc.length-2];KID=n.right;ed=[n.start,n.end,par(txt(n.right))];return}}
      if(n.operator==='&&'&&isF(n.right)){{NODO=n;PADRE=anc[anc.length-2];KID=n.left;ed=[n.start,n.end,par(txt(n.left))];return}}
      if(n.operator==='||'&&isNF(n.left)){{NODO=n;PADRE=anc[anc.length-2];KID=n.right;ed=[n.start,n.end,par(txt(n.right))];return}}
      if(n.operator==='||'&&isNF(n.right)){{NODO=n;PADRE=anc[anc.length-2];KID=n.left;ed=[n.start,n.end,par(txt(n.left))];return}}
      if(n.operator==='&&'&&(isNF(n.left)||isNF(n.right))){ed=[n.start,n.end,'false'];return}
      if(n.operator==='||'&&(isF(n.left)||isF(n.right))){ed=[n.start,n.end,'true'];return}
    }
    if(n.type==='IfStatement'&&(isF(n.test)||isNF(n.test))){const k=isF(n.test)?n.consequent:n.alternate;
      let s=k?txt(k):'';if(k&&k.type!=='BlockStatement'&&s&&!/[;}]\s*$/.test(s))s+=';';
      if(k&&k.type==='BlockStatement'){const p=anc[anc.length-2];// un blocco al posto di un if: si tiene il blocco (scope uguale)
      }
      ed=[n.start,n.end,s||';'];return}
    if(n.type==='VariableDeclaration'&&n.declarations.length===1&&isF(n.declarations[0].id)){ed=[n.start,n.end,'',true];return}
    if(isF(n)&&resto){const p=anc[anc.length-2];if(p&&p.type==='VariableDeclarator'&&p.id===n)return;if(p&&p.type==='Property'&&p.key===n&&!p.shorthand)return;
      if(p&&p.type==='Property'&&p.shorthand){ed=[p.start,p.end,n.name+': true'];return}
      ed=['?',n.start,txt(p).slice(0,160)];}
  });}
  if(!ed){console.log('fatto in',giro,'giri');break}
  if(ed[0]==='?'){console.log('NON SO PIEGARE in',file,'@',ed[1],':',ed[2]);process.exit(2)}
  let [a,b,s,decl]=ed;
  if(decl){// la riga intera della dichiarazione, se è sola
    const ls=src.lastIndexOf('\n',a-1)+1,le=src.indexOf('\n',b);const riga=src.slice(ls,le);
    if(riga.trim()===src.slice(a,b).trim()||/^\s*\/\/|^\s*$/.test(src.slice(b,le).replace(/^\s*\/\/.*$/,''))){a=ls;b=le+1;}
  }
  src=src.slice(0,a)+s+src.slice(b);
}
// parentesi inutili attorno a un nome o a una chiamata semplice
fs.writeFileSync(file,src);
