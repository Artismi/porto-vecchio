// CSS di ogni stile: si inietta sopra il CSS del gioco (#bubbles .bub ...). A = nessuna sostituzione.
const FONT = `@font-face{font-family:"PV Bangers";src:url(/assets/fonts_graffiti/Bangers-Regular.woff2) format("woff2");font-display:block}`;
const S = {};
S.A = ``;
// B — TESTO NUDO CONTORNATO
S.B = `
#bubbles .bub{background:none;border:0;box-shadow:none;padding:0 0 10px;max-width:220px;color:#F2E7CF;font:600 15px/1.17 "Pixelify Sans",sans-serif;
  -webkit-text-stroke:5px #16121B;paint-order:stroke fill;text-shadow:0 2px 0 #16121B;letter-spacing:.01em}
#bubbles .bub::after{content:"";border:0;left:50%;bottom:0;width:2px;height:8px;transform:translateX(-50%);background:#F2E7CF;box-shadow:0 0 0 1.5px #16121B}
#bubbles .bub .who{display:block;font:400 9px/1 Silkscreen,monospace;letter-spacing:.08em;text-transform:uppercase;color:#D2C2A6;-webkit-text-stroke:3px #16121B;paint-order:stroke fill;text-shadow:none;margin-bottom:3px}
#bubbles .bub.hot,#bubbles .bub.rumor{background:none}`;
// C — LETTERING DA FUMETTO (Bangers, nero su contorno carta)
S.C = FONT + `
#bubbles .bub{background:none;border:0;box-shadow:none;padding:0 0 12px;max-width:230px;color:#16121B;font:400 17px/1.05 "PV Bangers",Impact,sans-serif;text-transform:uppercase;letter-spacing:.035em;
  -webkit-text-stroke:5px #F2E7CF;paint-order:stroke fill;filter:drop-shadow(1.5px 2px 0 #16121B)}
#bubbles .bub:nth-child(odd){rotate:-2deg} #bubbles .bub:nth-child(even){rotate:1.5deg} #bubbles .bub:nth-child(3n){rotate:-.8deg}
#bubbles .bub::after{content:"";border:0;left:50%;bottom:1px;width:3px;height:11px;border-radius:2px;transform:translateX(-50%) rotate(22deg);background:#16121B;box-shadow:0 0 0 1.5px #F2E7CF}
#bubbles .bub .who{display:block;font:400 11px/1 "PV Bangers",Impact,sans-serif;letter-spacing:.12em;color:#F2E7CF;-webkit-text-stroke:3px #16121B;paint-order:stroke fill;margin-bottom:5px}
#bubbles .bub.hot,#bubbles .bub.rumor{background:none}`;
// D — STRISCIA (inchiostro solo dietro ogni riga)
S.D = `
#bubbles .bub{background:none;border:0;box-shadow:none;padding:0 0 8px;max-width:200px;color:#F2E7CF;font:500 13.5px/1.42 "Pixelify Sans",sans-serif}
#bubbles .bub .t{background:rgba(22,18,27,.86);padding:1px 5px 2px;-webkit-box-decoration-break:clone;box-decoration-break:clone;border-radius:1px 3px 1px 2px;box-shadow:2px 2px 0 rgba(22,18,27,.35)}
#bubbles .bub::after{content:"";border:0;left:50%;bottom:0;width:2px;height:8px;transform:translateX(-50%);background:rgba(22,18,27,.86)}
#bubbles .bub .who{display:table;margin:0 auto 1px;font:400 8.5px/1 Silkscreen,monospace;letter-spacing:.08em;text-transform:uppercase;color:#16121B;background:#D2C2A6;padding:2px 4px 1px;margin-bottom:1px}
#bubbles .bub.hot,#bubbles .bub.rumor{background:none}`;
// E — B con il ritmo: uno a piena voce, gli altri a 70% e smorzati, il chiacchiericcio lontano un «…»
S.E = S.B + `
#bubbles .bub{transition:none}
#bubbles .bub[data-r="sec"]{scale:.86;translate:0 3px;opacity:.82}
#bubbles .bub[data-r="sec"] .who{display:none}
#bubbles .bub[data-r="amb"]{font-size:0;padding-bottom:7px;opacity:.85}
#bubbles .bub[data-r="amb"] .who{display:none}
#bubbles .bub[data-r="amb"]::before{content:"";display:block;width:20px;height:5px;margin:0 auto 3px;background:radial-gradient(circle,#F2E7CF 0 1.9px,#16121B 2.1px 3.2px,transparent 3.4px) 0 50%/7px 7px repeat-x;filter:drop-shadow(0 1px 0 #16121B)}
#bubbles .bub[data-r="amb"]::after{height:5px}`;
// varianti (sopra B/E): arrabbiato, voce che gira, sussurro
const VAR = `
#bubbles .bub[data-v="hot"],#bubbles .bub.hot{font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:.02em;-webkit-text-stroke:5px #6F2B2E;text-shadow:0 2px 0 #16121B,2px 3px 0 #16121B;rotate:-2.5deg}
#bubbles .bub.hot::after,#bubbles .bub[data-v="hot"]::after{width:3px;height:10px;background:#F2E7CF;box-shadow:0 0 0 1.5px #16121B;transform:translateX(-50%) skewX(-28deg)}
#bubbles .bub.hot .who,#bubbles .bub[data-v="hot"] .who{text-transform:uppercase}
#bubbles .bub.hot .who::after,#bubbles .bub[data-v="hot"] .who::after{content:" !"}
#bubbles .bub.rumor,#bubbles .bub[data-v="rumor"]{font-style:italic;font-size:13.5px;font-weight:500;color:#D2C2A6}
#bubbles .bub.rumor::after,#bubbles .bub[data-v="rumor"]::after{height:9px;width:2px;box-shadow:none;background:repeating-linear-gradient(#F2E7CF 0 2px,transparent 2px 4px);filter:drop-shadow(0 0 1px #16121B) drop-shadow(0 0 1px #16121B)}
#bubbles .bub.rumor .who::after,#bubbles .bub[data-v="rumor"] .who::after{content:" · si dice"}
#bubbles .bub[data-v="whisper"]{font-size:12.5px;font-weight:400;color:#D2C2A6;-webkit-text-stroke:3px #16121B;text-shadow:none;opacity:.9;max-width:170px}
#bubbles .bub[data-v="whisper"]::after{height:6px;width:2px;box-shadow:none;background:repeating-linear-gradient(#D2C2A6 0 1px,transparent 1px 3px)}
#bubbles .bub[data-v="whisper"] .who::after{content:" · piano"}`;
// varianti per C (fondo carta → il contorno cambia)
const VARC = `
#bubbles .bub.hot{font-size:21px;letter-spacing:.05em;-webkit-text-stroke:6px #F2E7CF;rotate:-3deg;filter:drop-shadow(2px 3px 0 #6F2B2E)}
#bubbles .bub.rumor{font-size:15px;color:#3D3548;font-style:italic}`;
module.exports = { S, VAR, VARC };
