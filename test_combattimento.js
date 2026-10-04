const G = require('./game.js');
const st = G.create(11); const p = st.player;
let bad=false;
function run(sec, inp){ for(let i=0;i<sec*30;i++){ G.step(st,1/30,inp||{x:0,y:0}); } st.npcs.forEach(n=>{ if(!isFinite(n.x)) bad=true; }); }
run(3);
// pistola al molo
p.x=93; p.y=68.5; run(.2);
console.log('armi', Object.keys(p.arms), p.cur, JSON.stringify(p.arms.pistola));
// spara in piazza vicino a gente
p.x=114; p.y=24; run(.1);
const tgt = st.npcs.find(n=>!n.inside && !n.dead && !n.cop && !n.faction && Math.hypot(n.x-p.x,n.y-p.y)<14);
console.log('bersaglio', tgt && tgt.name, tgt && Math.hypot(tgt.x-p.x,tgt.y-p.y).toFixed(1));
if (tgt) { for (let k=0;k<6;k++){ const a=Math.atan2(tgt.y-p.y,tgt.x-p.x); G.fire(st,a,null,true); run(.25); } console.log('hp', tgt.hp.toFixed(0), 'dead', tgt.dead); }
run(1);
console.log('eventi', st.events.slice(0,5).map(e=>e.type+':'+G.knowers(st,e.id).length));
console.log('panico', st.npcs.filter(n=>n.panic>0).length, 'wanted', G.wanted(st));
run(40);
console.log('dopo 40s wanted', G.wanted(st), 'cops', st.npcs.filter(n=>n.cop).map(n=>n.first+':'+n.action.name+':'+n.alert.toFixed(2)).join(' '), 'hp player', p.hp.toFixed(0), 'reinf', !!st.reinf);
run(30);
console.log('dopo 70s wanted', G.wanted(st), 'cops', st.npcs.filter(n=>n.cop).map(n=>n.first+':'+n.action.name+(n.dead?'(morto)':'')).join(' '), 'hp', p.hp.toFixed(0), 'veicoli', st.vehicles.map(v=>v.id+(v.wreck?'x':'')).join(','));
console.log(st.log.slice(0,10).map(l=>l.text).join('\n'));
// traffico e carjacking
const st2 = G.create(5); const p2 = st2.player;
for(let i=0;i<60;i++) G.step(st2,1/30,{x:0,y:0});
const car = st2.vehicles.find(v=>v.traffic);
p2.x = car.x + Math.cos(car.ang)*3; p2.y = car.y; for(let i=0;i<90;i++) G.step(st2,1/30,{x:0,y:0});
console.log('auto ferma?', car.speed.toFixed(1)); p2.x = car.x; p2.y = car.y - 1.6;
console.log(G.act(st2,'veicolo'), p2.vehicle);
for(let i=0;i<60;i++) G.step(st2,1/30,{x:1,y:0,aim:0});
console.log('auto', car.x.toFixed(1), car.y.toFixed(1), car.speed.toFixed(1), 'automobilista', st2.npcs.filter(n=>n.driver).map(n=>n.action.name+' mem '+n.mem.length));
// esplosione
car.hp = 5; p2.vehicle && G.act(st2,'veicolo'); car.hp=5;
const s2=G.create(1); 
console.log('marsigliesi', st.npcs.filter(n=>n.faction==='marsiglia').map(n=>n.first+':'+n.inside).join(' '));
console.log('NaN', bad, 'over', st.over);
console.log('ultimo danno da', p.lastHurtBy);
