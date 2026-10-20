// copertura del costruito per fasce di x (metri finali): node copertura.js
// Copertura del costruito per quartiere della città nuova: cd v7 && node strumenti/copertura.js
const path=require('path'),src=path.join(__dirname,'..','src');
global.World=require(path.join(src,'world_cittanuova.js'));global.Interior=require(path.join(src,'interiors.js'));const G=require(path.join(src,'game.js'));
const T=G.T,GW=G.GW,TS=G.TS,M=G.MAP,B=G.BUILDINGS,inv={};for(const k in T)inv[T[k]]=k;
const occ=new Uint8Array(GW*G.GH);B.forEach(b=>{for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++)occ[y*GW+x]=1});
const F=[['boom',1100,1180],['Tutela-Ottoc',1180,1250],['Ottocento',1250,1300],['Mercato/Corso',1300,1330],['borgo O',1330,1400],['borgo E',1400,1463],['spianata',1463,1490]];
for(const[n,a,b]of F){let land=0,bu=0,road=0,walk=0,green=0,piaz=0;const c={};
for(let ty=100;ty<260;ty++)for(let tx=a/TS|0;tx<b/TS;tx++){const i=ty*GW+tx,v=inv[M.grid[i]];if(v==='WATER'||v==='SAND'||v==='ROCK'||v==='CLIFF')continue;land++;if(occ[i]){bu++;continue}c[v]=(c[v]||0)+1}
const top=Object.entries(c).sort((p,q)=>q[1]-p[1]).slice(0,6).map(([k,v])=>k+' '+Math.round(100*v/land)+'%').join(', ');
console.log(n.padEnd(14),'costruito',Math.round(100*bu/land)+'%','|',top)}
