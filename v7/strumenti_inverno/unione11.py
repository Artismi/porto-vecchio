# [unione11] Da vicino (Andrea: «appena uno si ferma a guardare è pieno di problemi»; «vegetazione in punti esteticamente
# insensati, pavimenti in piastrelle super contrastati che si piegano seguendo il pavimento»).
# 1) Erbacce: le passate del verde restano tutte (danno profondità); si tolgono solo i ciuffi dove non possono crescere
#    (centro delle piazze e del selciato, strisce pedonali) e le densità scendono con misura.
# 2) Pavimenti: stesso disegno e stessi dettagli (giunti, crepe, erbetta, macchie), ma con molto meno salto fra pietra e giunto,
#    e lo strato d'insieme più leggero: non più una scacchiera che segue ogni piega del terreno.
# 3) Inchiostro del grading [amb3]: andava su ogni bordo di luminosità, quindi anche su tutte le fughe del pavimento. Ora va
#    solo sui bordi veri degli oggetti (salto di profondità).
# Dopo unione10.py. Guardia [unione11].
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
if '[unione11]' in s: print('già applicato'); sys.exit()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (old[:90], s.count(old)); s = s.replace(old, new)

# ---------------- 1) erbacce: le quattro passate restano, cambia dove mettono le cose ----------------
# Ognuna ha il suo carattere ([strade1] la vita per terra, [isola35] il verde ai muri e nei cortili, [isola38] il verde nelle crepe)
# e insieme danno profondità. Toglievano credibilità solo i ciuffi in mezzo alla pietra aperta: centro delle piazze e del selciato,
# strisce pedonali, bocca degli incroci, erba alta attorno agli alberi di piazza. Lì non cresce niente perché ci si cammina sopra.
# Le densità scendono con misura, i posti sensati (piede dei muri, giunto del cordolo, bordi dei cortili) restano tutti.
rep("function buildVita1() {", "const zebra11 = (x, z) => crossings35().some(c => Math.hypot(c.x - x, c.y - z) < c.w / 2 + 2.5);   /* [unione11] sulle strisce non cresce niente */\n  function buildVita1() {")
# [strade1] fra cordolo e asfalto: resta, un po' meno fitta e mai sulle strisce
rep("{ const [x, z] = off(rd.w / 2 + (vic ? -.15 : .02)); if (rr() < (vic ? .45 : .38) && !solid1(x, z)) tuft(x, z, .26 + rr() * .3, rr() < .5 ? 0 : 1); }",
    "{ const [x, z] = off(rd.w / 2 + (vic ? -.15 : .02)); if (rr() < (vic ? .32 : .22) /* [unione11] */ && !solid1(x, z) && !zebra11(x, z)) tuft(x, z, .22 + rr() * .26, rr() < .5 ? 0 : 1); }")
# [strade1] fra le lastre del marciapiede: resta, più rara e bassa
rep("else if (q < .34) tuft(x, z, .18 + rr() * .16, 0); } }",
    "else if (q < .26 && !zebra11(x, z)) tuft(x, z, .15 + rr() * .12, 0); } }   /* [unione11] */")
# [strade1] al piede del muro: è il posto giusto, resta quasi com'era, stretta contro il muro
rep("if (rr() < (wall ? .6 : .4)) for (let q = 0; q < 1 + Math.floor(rr() * 4); q++) tuft(x + (rr() - .5) * .7, z + (rr() - .5) * .6, .28 + rr() * .4, rr() < .35 ? 2 : rr() < .6 ? 0 : 1);",
    "if (rr() < (wall ? .5 : .25)) for (let q = 0; q < 1 + Math.floor(rr() * 3); q++) tuft(x + (rr() - .5) * .7, z + (rr() - .5) * .3, .26 + rr() * .36, rr() < .35 ? 2 : rr() < .6 ? 0 : 1);   /* [unione11] */")
# [strade1] piazze e cortili: sulla pietra aperta solo vicino a un muro o al verde, sulla terra come prima
rep("if (h < .17) tuft(x, z, .2 + h * 2, v === T.DIRT ? 1 : 0); else if (h < .24) paper(x, z); else smallThing(x, z);",
    "if (h < .17) { if (v === T.DIRT || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const w = gT(tx + a, ty + b); return w === T.BLD || w === T.GRASS || w === T.DIRT; })) tuft(x, z, .2 + h * 2, v === T.DIRT ? 1 : 0); } else if (h < .24) paper(x, z); else smallThing(x, z);   /* [unione11] */")
# [isola35] alberi di piazza: il cespuglio al piede resta, l'erba alta solo nei cortili
rep("if (t.kind !== 'viale') for (let q = 0; q < 3; q++) add(q ? 'Grass_Common_Tall' : 'Bush_Common',",
    "if (t.kind !== 'viale') for (let q = 0; q < (t.kind === 'cortile' ? 3 : 1); q++) add(q ? 'Grass_Common_Tall' : 'Bush_Common',   /* [unione11] */")
# [isola35] selciato: il ciuffo nasce dove il selciato tocca il verde o la terra, non in mezzo
rep("else if (v === T.COB && !walls.length && r() < .17 /* [unione2] un ciuffo ogni sei caselle circa */)",
    "else if (v === T.COB && !walls.length && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const w = gT(tx + a, ty + b); return w === T.GRASS || w === T.DIRT; }) && r() < .3 /* [unione2] [unione11] al margine del verde */)")
# [isola38] verde nelle crepe: entrambe le file restano, un po' più rade, mai sulle strisce
rep("if (h > .12 + wild * .55) return;", "if (h > .07 + wild * .38 || zebra11(x, z)) return;   /* [unione11] */")

# ---------------- 2) pavimenti ----------------
# piazza: lastre 1 × 0,6 m, salto pietra/giunto da 52→104-130 a 86→96-106, fasce appena più scure, niente erba nei giunti
rep("let g = band ? 74 + h * 10 : 104 + h * 26; if (jx || jy) g = 52; const warm = band ? -6 : h > .8 ? 8 : 0;",
    "let g = band ? 90 + h * 5 : 96 + h * 10; if (jx || jy) g = 84; const warm = band ? -3 : h > .8 ? 3 : 0;   /* [unione11] */")
rep("if (!(jx || jy) && th(col, row, 72) < .06 && (px + py) % 3 === 0) g -= 22;   // lastra crepata",
    "if (!(jx || jy) && th(col, row, 72) < .06 && (px + py) % 3 === 0) g -= 8;   // lastra crepata")
rep("const jy = py % 5 === 0, jx = (px + off) % 8 === 0, h = th(col, row, 71), n = wrapNz(px, py, 12, 3) * 14 + (r() - .5) * 8;",
    "const jy = py % 5 === 0, jx = (px + off) % 8 === 0, h = th(col, row, 71), n = wrapNz(px, py, 12, 3) * 8 + (r() - .5) * 4;")
rep("for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(40,36,32,.45)'; x.fillRect(Math.floor(r() * 32) * 8 + (r() < .5 ? 0 : 7), Math.floor(r() * 51) * 5, 1, 1); }   // spigoli scheggiati",
    "for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(40,36,32,.15)'; x.fillRect(Math.floor(r() * 32) * 8 + (r() < .5 ? 0 : 7), Math.floor(r() * 51) * 5, 1, 1); }   // spigoli scheggiati")
rep("for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(60,80,40,.5)'; x.fillRect(Math.floor(r() * 32) * 8, Math.floor(r() * S), 1, 2); }   // erba nei giunti",
    "for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(70,84,50,.3)'; x.fillRect(Math.floor(r() * 32) * 8, Math.floor(r() * S), 1, 2); }   // erba nei giunti [unione11] più tenue")
# marciapiede: lastre da 50 cm quasi uniformi, giunti sottili e chiari
rep("const g = 200 + Math.floor(r() * 40); x.fillStyle = `rgb(${g},${g - 3},${g - 8})`; x.fillRect(i * q + 1, j * q + 1, q - 2, q - 2);",
    "const g = 208 + Math.floor(r() * 12); x.fillStyle = `rgb(${g},${g - 3},${g - 8})`; x.fillRect(i * q + 1, j * q + 1, q - 2, q - 2);   /* [unione11] */")
rep("for (let k = 0; k < 40; k++) { const h = 170 + Math.floor(r() * 60); x.fillStyle = `rgba(${h},${h - 4},${h - 8},.6)`;",
    "for (let k = 0; k < 40; k++) { const h = 196 + Math.floor(r() * 26); x.fillStyle = `rgba(${h},${h - 4},${h - 8},.4)`;")
rep("if (r() < .22) { x.strokeStyle = 'rgba(80,76,70,.7)';", "if (r() < .22) { x.strokeStyle = 'rgba(120,116,110,.3)';")
rep("if (r() < .12) { x.fillStyle = 'rgba(70,90,50,.6)'; x.fillRect(i * q, j * q + r() * q, 2, 3); } }   // erbetta fra le lastre",
    "if (r() < .12) { x.fillStyle = 'rgba(80,96,60,.35)'; x.fillRect(i * q, j * q + r() * q, 2, 3); } }   // erbetta fra le lastre [unione11] più tenue")
rep("x.fillStyle = 'rgba(90,86,80,.85)'; for (let k = 0; k < 4; k++) { x.fillRect(k * q, 0, 1, S); x.fillRect(0, k * q, S, 1); }",
    "x.fillStyle = 'rgba(150,146,138,.6)'; for (let k = 0; k < 4; k++) { x.fillRect(k * q, 0, 1, S); x.fillRect(0, k * q, S, 1); }   /* [unione11] giunti sottili */")
rep("for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(40,36,34,.28)'; x.beginPath(); x.ellipse(r() * S, r() * S, 2 + r() * 6, 2 + r() * 4, 0, 0, 6.3); x.fill(); }   // macchie e gomme da masticare",
    "for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(40,36,34,.12)'; x.beginPath(); x.ellipse(r() * S, r() * S, 2 + r() * 6, 2 + r() * 4, 0, 0, 6.3); x.fill(); }   // macchie e gomme da masticare")
rep("for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(30,30,30,.5)'; x.fillRect(r() * S, r() * S, 1, 1); }\n    }\n    return (P35[kind] = c);",
    "for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(30,30,30,.2)'; x.fillRect(r() * S, r() * S, 1, 1); }\n    }\n    return (P35[kind] = c);")
# basoli dei vicoli: giunto meno nero
rep("x.fillStyle = '#2a2624'; x.fillRect(0, 0, S, S);\n      for (let y = 0; y < S; y += 5) { let px = -Math.floor(r() * 6); const ro = r() * 4; while (px < S) { const w = 5 + Math.floor(r() * 6); const g = 56 + Math.floor(r() * 24), t = Math.floor(r() * 10);",
    "x.fillStyle = '#423c38'; x.fillRect(0, 0, S, S);   /* [unione11] */\n      for (let y = 0; y < S; y += 5) { let px = -Math.floor(r() * 6); const ro = r() * 4; while (px < S) { const w = 5 + Math.floor(r() * 6); const g = 60 + Math.floor(r() * 12), t = Math.floor(r() * 6);")
# ciottoli del suolo di città: giunto meno nero, pietre più uguali
rep("if (kind === 'ciottoli') { x.fillStyle = '#221f1d'; x.fillRect(sx, sy, S4, S4); for (let q = 0; q < 4; q++) { const g = 52 + Math.floor(r() * 22);",
    "if (kind === 'ciottoli') { x.fillStyle = '#3c3733'; x.fillRect(sx, sy, S4, S4); for (let q = 0; q < 4; q++) { const g = 56 + Math.floor(r() * 12);   /* [unione11] */")
# lo strato d'insieme: chiazze più leggere
rep("x.globalCompositeOperation = 'soft-light'; x.globalAlpha = .7;", "x.globalCompositeOperation = 'soft-light'; x.globalAlpha = .45;   /* [unione11] */")

# ---------------- 3) inchiostro solo sui bordi veri ----------------
rep("float ge = clamp((max(max(la, lb), max(lc2, ld)) - l0) * 3.2 - .12, 0., 1.);   // solo il lato scuro del bordo prende l'inchiostro",
    "float ge = clamp((max(max(la, lb), max(lc2, ld)) - l0) * 3.2 - .12, 0., 1.);   // solo il lato scuro del bordo prende l'inchiostro\n"
    "            ge *= mix(0., 1., smoothstep(.05*(1.+d*.01), .25*(1.+d*.012), max(abs(d1 + d2 - 2.*d), abs(d3 + d4 - 2.*d))));   /* [unione11] solo dove salta la profondità: le fughe del pavimento no */")

# ---------------- 4) incroci: come si uniscono strade e materiali ----------------
# (Andrea: «incrocio senza senso, intendo per come si uniscono strade e materiali») Le vie di sampietrini ([strade1], via_porto e
# via_alta) erano dipinte sopra l'asfalto con le estremità tonde e il bordo scuro: dove sboccano su una strada asfaltata lasciavano
# un disco di ciottoli in mezzo all'incrocio. Ora la via lastricata finisce sul ciglio dell'asfalto, a taglio dritto, con una
# soglia di granito: l'incrocio resta d'asfalto, come una via vecchia che sbocca su una strada nuova.
rep("""      const path = () => { x.beginPath(); rd.pts.forEach((p, k) => k ? x.lineTo(cx(p[0]), cy(p[1])) : x.moveTo(cx(p[0]), cy(p[1]))); };
      path(); x.lineWidth = (rd.w + .5) * PPM;""",
"""      onCarr1(0, 0, 0); const asphAt11 = (px, pz) => { const i0 = Math.floor(px / 8), j0 = Math.floor(pz / 8); for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) for (const q of CH1.get(i * 4096 + j) || []) { if (q[5] === rd || !asph1(q[5])) continue; const dx = q[2] - q[0], dz = q[3] - q[1], L2 = dx * dx + dz * dz || 1, t = clamp(((px - q[0]) * dx + (pz - q[1]) * dz) / L2, 0, 1); if (Math.hypot(q[0] + dx * t - px, q[1] + dz * t - pz) < q[4] + .15) return true; } return false; };   /* [unione11] */
      const keep = rd._k11 || (rd._k11 = rd.pts.map(p => !asphAt11(p[0], p[1])));
      const path = () => { x.beginPath(); let on = false; rd.pts.forEach((p, k) => { if (!keep[k]) { on = false; return; } if (on) x.lineTo(cx(p[0]), cy(p[1])); else { x.moveTo(cx(p[0]), cy(p[1])); on = true; } }); };
      x.lineCap = 'butt';   /* [unione11] taglio dritto sul ciglio dell'asfalto */
      path(); x.lineWidth = (rd.w + .5) * PPM;""")
rep("""      path(); x.lineWidth = .5 * PPM; x.strokeStyle = 'rgba(150,144,134,.55)'; x.stroke();                   // guida centrale di granito (per le ruote dei carri)
    });""",
"""      path(); x.lineWidth = .5 * PPM; x.strokeStyle = 'rgba(150,144,134,.55)'; x.stroke();                   // guida centrale di granito (per le ruote dei carri)
      for (let k = 0; k < rd.pts.length - 1; k++) { if (keep[k] === keep[k + 1]) continue; const q = keep[k] ? k : k + 1, o = keep[k] ? k + 1 : k, [ax, az] = rd.pts[q], dx = rd.pts[o][0] - ax, dz = rd.pts[o][1] - az, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, h = (rd.w + .5) / 2;   /* [unione11] soglia di granito */
        x.beginPath(); x.moveTo(cx(ax + nx * h), cy(az + nz * h)); x.lineTo(cx(ax - nx * h), cy(az - nz * h)); x.lineWidth = .4 * PPM; x.strokeStyle = 'rgba(132,126,116,.9)'; x.stroke(); }
      x.lineCap = 'round';
    });""")
# ---------------- 5) linee lisce, niente tremolio ----------------
# (Andrea: «molto noise visivo e poco contrasto; gli spigoli, le linee nere così sgranate, soprattutto quando ti muovi fanno
# tremolare tutto; dovrebbero sembrare vettoriali questi outline e linee») La scena si disegna a 720 righe al massimo ([unione8]) e
# il post la leggeva a blocchi (filtro nearest e coordinate agganciate al texel): contorni, inchiostro e cavità erano scalette di
# texel che cambiavano a ogni mezzo pixel di movimento. Ora, senza alzare la risoluzione:
# - l'immagine si ingrandisce morbida (lineare) e il post la legge al punto vero dello schermo;
# - la profondità per contorni, cavità e profili è interpolata a mano (il depth non si filtra): il bordo cade fra i texel e la
#   soglia morbida lo rende come una linea antialiasata, che scivola invece di saltare;
# - la nitidezza artificiale scende (sui texel ingranditi faceva solo rumore).
rep("rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType });   /* [amb2] HDR */",
    "rt = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType });   /* [amb2] HDR [unione11] ingrandita morbida */")
rep("float lin(float d){ float z = d*2.-1.; return 2.*near*far/(far+near-z*(far-near)); }",
    "float lin(float d){ float z = d*2.-1.; return 2.*near*far/(far+near-z*(far-near)); }\n"
    "        float dL(vec2 u){ vec2 t = u*res - .5, f = fract(t), b = (floor(t) + .5)/res, e = 1./res;   // [unione11] profondità interpolata: i bordi cadono fra i texel\n"
    "          return mix(mix(lin(texture2D(tD, b).r), lin(texture2D(tD, b + vec2(e.x, 0.)).r), f.x), mix(lin(texture2D(tD, b + vec2(0., e.y)).r), lin(texture2D(tD, b + e).r), f.x), f.y); }\n"
    "        float hs11(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }   // [unione11] rumore del tratto\n"
    "        float vn11(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hs11(i), hs11(i + vec2(1., 0.)), f.x), mix(hs11(i + vec2(0., 1.)), hs11(i + 1.), f.x), f.y); }")
rep("vec2 uv = (floor(vUv*res)+.5)/res;", "vec2 uv = vUv;   /* [unione11] niente aggancio al texel */")
rep("float d = lin(texture2D(tD, uv).r);", "float d = dL(uv);   /* [unione11] */")
rep("float d1 = lin(texture2D(tD, uv+vec2(px.x,0.)).r), d2 = lin(texture2D(tD, uv-vec2(px.x,0.)).r), d3 = lin(texture2D(tD, uv+vec2(0.,px.y)).r), d4 = lin(texture2D(tD, uv-vec2(0.,px.y)).r);",
    "float d1 = dL(uv+vec2(px.x,0.)), d2 = dL(uv-vec2(px.x,0.)), d3 = dL(uv+vec2(0.,px.y)), d4 = dL(uv-vec2(0.,px.y));   /* [unione11] */")
rep("float du = lin(texture2D(tD, uv + vec2(0., px.y)).r), du2 = lin(texture2D(tD, uv + vec2(0., px.y * 2.)).r);",
    "float du = d3, du2 = dL(uv + vec2(0., px.y * 2.));   /* [unione11] */")
rep("sharp: .2, outline", "sharp: .06 /* [unione11] */, outline")
# - il suolo (strisce, schiuma, lastre, asfalto) si legge morbido e con le mipmap: niente scalette sulle righe oblique e niente
#   brulichio dei texel lontani quando la camera si muove (blocchi da 512 px, potenza di due).
rep("    const tex = canvasTex(c);\n    let rtex = null;", "    const tex = canvasTex(c); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.generateMipmaps = true; tex.anisotropy = 4;   /* [unione11] */\n    let rtex = null;")
# ---------------- 6) l'inchiostro col carattere ----------------
# (Andrea: «la linea pixel era sì confusa ma con carattere; gli outline inchiostrati devono dare volume e avere carattere,
# altrimenti sembrano Playmobil») Il contorno di [amb2] era un velo grigio (c*.55, peso .3) e, reso liscio, diventava anonimo.
# Ora è un tratto d'inchiostro vero, liscio ma col peso della mano:
# - sagoma: dove dietro c'è qualcosa di lontano, linea sul bordo dell'oggetto davanti; si cerca a due raggi (1 e 1,7-2 texel) e il raggio
#   largo conta di più quanto più il salto è grande e quanto più il lato è in ombra: tratto grosso fuori e al buio, sottile alla luce;
# - pieghe interne (incavi della profondità): un filo sottile;
# - colore: inchiostro scuro che tiene un po' della tinta sotto (viola-bruno), non grigio; nella foschia lontana si alleggerisce.
# (poi: «un lineart col segno riconoscibile, pulito, un piacere per gli occhi; alcuni tratti più leggeri a dare volume oltre
# l'outline») Un contorno solo, deciso, col peso che varia appena (legato al punto del mondo, ricostruito dalla profondità, così
# muovendosi non scorre); dentro la sagoma linee leggere di forma sugli spigoli e sulle pieghe (salto della pendenza), più chiare
# del contorno. Niente tratti doppi né tratteggio.
# (poi: «non sembra un'illustrazione inchiostrata a pennino») China nera vera (non la tinta scurita), filo a taglio netto (soglia
# stretta), pieno e filo del pennino lungo il tratto (il raggio largo si accende e si spegne lungo la linea, più pieno in ombra),
# filetti di forma neri e sottili.
# (poi, col riferimento di una stanza inchiostrata: «troppo spesso, e mancano le linee che danno il volume; questo con i colori al
# posto del bianco») Contorno sottile (il pieno solo in ombra e a tratti). I tratti di volume: segni paralleli ancorati al mondo
# (verticali sui muri, in diagonale a terra), accesi dove c'è contatto o angolo (oscuramento di profondità), piega o ombra; ogni
# tratto ha una sua soglia, quindi partono tutti dal fondo dell'angolo e si fermano a lunghezze diverse, come la sfumatura a penna.
# (poi: «vedo un sacco di porcherie, tratteggi negli outline che sono ombre; deve essere pulito») Via i tratti accesi da ombre e
# contatti: sporcavano. Il contorno è continuo (più pieno solo dove la sagoma si stacca molto dal fondo, mai a pezzi); il volume lo
# danno solo linee geometriche pulite (spigoli, pieghe, contatto a terra); dove i bordi sono fittissimi (chiome, erba) le linee si
# diradano invece di fare la grattugia.
# (poi: «usiamo lo shader per dare tridimensionalità, contrasto e profondità») Prima dell'inchiostro, l'oscuramento di profondità:
# la profondità sfocata su un anello largo dice cosa sta dietro a qualcosa di più vicino (il suolo dietro un personaggio, il muro
# dietro una tettoia) e lì l'ombra si raccoglie attorno alla sagoma; quello che sta davanti prende un filo di luce. Le figure si
# staccano dal fondo e i piani si leggono, senza aggiungere grana.
rep("c = mix(c, c*.55 + vec3(.02,.025,.04), ol*aK2.z*(1.-coc));   // [amb2]",
"""{   /* [unione11] inchiostro col peso della mano */
            float tA = .45*(1.+d*.01), tB = .9*(1.+d*.012), e2 = 0., busy = 0.;
            float fb11 = 0.; { float dB = 0.; for (int k = 0; k < 8; k++) { float a = float(k) * .7854 + .2; dB += dL(uv + vec2(cos(a), sin(a)) * px * (k < 4 ? 5. : 10.)); } dB /= 8.;   // oscuramento di profondità
              float behind = clamp((d - dB) / (d * .02 + .4), 0., 1.), front = clamp((dB - d) / (d * .02 + .4), 0., 1.), nearK = (1. - coc) * (1. - smoothstep(dc * 1.2, dc * 2., d) * .7);
              c *= 1. - behind * .3 * nearK; c += c * front * .14 * nearK; fb11 = behind * nearK; }
            for (int k = 0; k < 8; k++) { float a = float(k) * .7854; vec2 o = vec2(cos(a), sin(a)) * px * (k - k/2*2 == 0 ? 2. : 1.7); float jk = dL(uv + o) - d; e2 = max(e2, jk); busy += step(tA, abs(jk)); }
            float lum0 = dot(c, vec3(.3,.59,.11)), dark = 1. - smoothstep(.08, .5, lum0);
            float zr = texture2D(tD, uv).r; vec4 wq = vInvVP * vec4(uv * 2. - 1., zr * 2. - 1., 1.); vec3 wp = wq.xyz / wq.w; vec2 sp = vec2(wp.x + wp.y * .6, wp.z - wp.y * .6) * .9;
            float thin = smoothstep(tA * 1.2, tA * 1.55, edge);   // il contorno: filo netto (soglia stretta sul bordo interpolato: taglio pulito, non sfumato)
            float thick = smoothstep(tA * 5., tA * 7., e2) * .85;   // più pieno solo dove la sagoma si stacca molto dal fondo: continuo lungo il bordo, mai a pezzi
            float d2x = abs(d1 + d2 - 2. * d), d2y = abs(d3 + d4 - 2. * d), form = smoothstep(.05 + d * .004, .07 + d * .0055, max(d2x, d2y)) * (1. - thin) * .7;   // filetti di forma: spigoli e pieghe dentro la sagoma, sottili e netti
            float cvi = (d1 + d2 + d3 + d4 - 4. * d) / (d * .012 + .08), crease = smoothstep(.9, 2.2, -cvi) * .55;
            float ink = max(max(max(thin, thick), crease * .55), form) * (1.-coc) * (1. - smoothstep(3.5, 6.5, busy) * .75) * (1. - smoothstep(dc*1.15, dc*1.9, d) * .55);
            vec3 inkC = vec3(.03, .026, .032) + c * .04;   // inchiostro di china: nero vero
            c = mix(c, inkC, clamp(ink * clamp(aK2.z * 3., 0., 1.), 0., 1.)); }""")
# ---------------- 7) colore un filo più saturo ----------------
rep("if (pK.x > .01) {   // [amb3] colori saturi, ma in palette", "c = max(mix(vec3(dot(c, vec3(.3,.59,.11))), c, 1.14), 0.);   /* [unione11] un filo più saturi */\n          if (pK.x > .01) {   // [amb3] colori saturi, ma in palette")
open(p, 'w', encoding='utf-8').write(s); print('ok')
