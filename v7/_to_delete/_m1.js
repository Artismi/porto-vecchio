global.World = require('./world.js'); global.Interior = require('./interiors.js');
global.Game = require('./game.js'); global.Risacca = require('./risacca.js'); global.Popolo = require('./popolo.js'); global.Azioni = require('./azioni.js'); global.Economia = require('./economia.js'); global.Fazioni=require('./fazioni.js');
const G=Game; const st=G.create(1);
const pp=()=>st.npcs.filter(n=>n.pop&&!n.dead);
const tot=()=>Math.round(pp().reduce((s,n)=>s+n.pop.money,0));
const shops=()=>Math.round(Object.values(Economia.eco(st).shops).reduce((s,S)=>s+S.cash,0));
console.log('npc pop',pp().length,'workers',pp().filter(n=>n.pop.job).length,'cast',pp().filter(n=>n.pop.cast).length,'ints',pp().filter(n=>n.pop.ints).length, 'cops', st.npcs.filter(n=>n.cop).length);
console.log('jobs pay/h avg', (pp().filter(n=>n.pop.job).reduce((s,n)=>s+n.pop.job.pay,0)/pp().filter(n=>n.pop.job).length).toFixed(2));
const t0=Date.now();
for(let d=0;d<7;d++){const end=st.t+1440;while(st.t<end)G.step(st,1/30,{});
 const owed=Math.round(pp().reduce((s,n)=>s+(n.pop.owed||0),0));
 console.log(Popolo.WEEK[Popolo.weekday(st.t)],'npc money',tot(),'owed',owed,'shops cash',shops(),'fam',st.fam&&Math.round(st.fam.cash+st.fam.dirty+st.fam.clean+(st.fam.treasure||0)),'player',Math.round(st.player.money), 'medio', Math.round(tot()/pp().length), 'alVerde', pp().filter(n=>n.pop.money<0).length);}
console.log('ms',Date.now()-t0);
