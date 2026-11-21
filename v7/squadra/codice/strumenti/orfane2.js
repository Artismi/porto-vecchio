// funzioni di un file che compaiono una volta sola NEL FILE e non sono esportate (nessun .nome / 'nome' altrove)
const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');const f=process.argv[2];const N=fs.readFileSync(f,'utf8');
const D='/home/user/wt/codice/v7/';const altri=[...fs.readdirSync(D+'src').filter(x=>/\.(js|html)$/.test(x)&&D+'src/'+x!==require('path').resolve(f)).map(x=>fs.readFileSync(D+'src/'+x,'utf8')),...fs.readdirSync(D+'strumenti').filter(x=>/\.js$/.test(x)).map(x=>fs.readFileSync(D+'strumenti/'+x,'utf8'))].join('\n');
const conta=(t,n)=>(t.match(new RegExp('(?<![\\w$])'+n.replace(/\$/g,'\\$')+'(?![\\w$])','g'))||[]).length;
const ast=acorn.parse(N,{ecmaVersion:'latest',locations:true,allowReturnOutsideFunction:true});
walk.full(ast,x=>{let name=null;if(x.type==='FunctionDeclaration')name=x.id.name;else if(x.type==='VariableDeclarator'&&x.id.type==='Identifier'&&x.init&&/Function/.test(x.init.type))name=x.id.name;if(!name)return;
 if(conta(N,name)===1){const fuori=new RegExp('\\.'+name+'\\b|[\'"]'+name+'[\'"]').test(altri);console.log(name,'riga',x.loc.start.line,'righe',x.loc.end.line-x.loc.start.line+1,fuori?'(ATTENZIONE: .nome altrove)':'');}});
