# Modelli 3D, texture e animazioni: l'analisi (la squadra, 21 novembre)

Rapporto del technical artist. Foto su `studio_anim.html?facce3` (figure e clip vere) nella cartella temporanea della sessione
(`squadra/modelli/foto/`; script `foto_pg.js`, `glbstat.js`, `imgs.js`). Le foto nel gioco vero non sono riuscite (Chromium si chiude dopo
7-10 minuti): per la vista di gioco sono servite le immagini di `_immagini/`. **Le cose che si vedono di più vengono da `personaggi.js`, non
dagli asset scaricati.**

## 1. Personaggi

Procedurali: una `SkinnedMesh` con un materiale, su scheletro e clip Quaternius (assets/mc, 62 ossa, 24 clip); 4,4-7k vertici, 6-11k
triangoli per figura (il «30 470 vertici» delle note conta anche le armi nascoste).

1. **Il «piallato» è voluto**: lo stile `k` ha `piatto: 1` → `flatShading` (`personaggi.js:31`, `1799`): 7-11k triangoli come faccette
   rumorose. Lo stile `b` (normali lisce, toon a 3 bande, contorno) esiste già ed è molto più fumetto. `luce: .3` diventa emissivo: pelli
   chiare come gesso.
2. **I capelli escono dai cappelli**: `personaggi.js:813-822`, solo sette cappelli (`NUOVI`) limitano i capelli; durag, bandana, coppola,
   basco, bucket, visiera, cappello, colbacco e fascia lasciano `capelli3` interi e ci mettono sopra il vecchio `cappello()` (misurato su teste
   1,38 volte più piccole): il durag sepolto nei capelli, la coppola su una calotta bianca.
3. **Geometria nascosta**: sotto il passamontagna si costruiscono viso, naso, bocca, sopracciglia; sotto il piumino i lacci (11,2k contro 7,3k).
4. **Le scarpe**: lunghe e piatte (`piedi 1.12` × `kw 1.16`); il battistrada `[facce3]` (`personaggi.js:543`) sporge a dente scuro (C5 della
   Diagnosi vestiti, aperto).
5. **Orli e pezzi staccati**: triangolo «strappato» sull'orlo della maglietta oversize; un ago grigio all'altezza della tasca delle felpe
   (`personaggi.js:465` o i lacci); tasca dei cargo staccata; cintura sopra la maglietta fuori dai pantaloni.
6. **Stampe sgranate**: atlante (`personaggi.js:1709-1793`) con tessere da 256 px sul giro del busto (~70 px sul petto, ~35 sul telefono);
   niente margine fra tessere (le mipmap sbavano); `fract(vMot.xy*6.)` lascia cuciture; atlante 2048×3328 non in potenza di due.
7. **Proporzioni e varietà**: testa ~1/7, mani piccole a blocco; facce tutte uguali (occhi, naso, espressione accigliata); le teste hip hop
   diverse di DECISIONI non ci sono ancora.
8. **Animazioni**: solo le 24 clip Quaternius; cadute e salto procedurali (`anim_lotta.js`). Idle tutti uguali a gambe larghe; corsa a busto
   dritto e braccia tese; il passaggio camminata → corsa (`models.js:360-361`) riparte dalla fase salvata della corsa: nei 0,3 s le gambe si
   incrociano; la camminata fino a 2,2×; `BRACCIO 1.07` ingrossa tutto il braccio; il pugno è da pugile.
9. **Prestazioni**: `frustumCulled = false` e ombra per ogni figura (`personaggi.js:1867`); nessun LOD; cache delle geometrie a 12 figure sul
   telefono.

## 2. Veicoli, oggetti, case, vegetazione

- Stili che non si parlano: mezzi lisci «giocattolo», persone sfaccettate, edifici Kenney a tavolozza, oggetti 64 px Nearest, tre auto quasi
  realistiche e fuori epoca (`r_RX_7_3_v2` 19,7k triangoli, `r_GTR` 14,8k, `r_1972-bursley-defiance` 11,2k; semplificate a ogni caricamento,
  `models.js:22-27`; in gioco da `game.js:592-627`).
- Materiali: ogni veicolo 15-27; la fioriera 23; il banco armi 47. Barche senza livello lontano.
- Controlli: `modelli_check` 85/85; `pezzi_check`: `gradone` con scala affonda di 8 cm; COMPENETRAZIONI.md segnala barche dentro i moli
  (fino a 1,86 m) e 18 coppie di mezzi parcheggiati uno dentro l'altro (non riverificato).
- Texture: `kit.js:119` toglie le mipmap e mette Nearest anche ai kit da 64 px (luccichio); i vestiti invece sono lineari;
  `kit_garage.glb` 306 triangoli con un PNG 1024 da 1,3 MB.

## 3. Duplicati e scarti

- Ogni asset in quattro formati (`.glb`, `.glb.gz`, `.json`, `.json.js`): 120 MB, ~2/3 servono solo all'apertura da `file://`.
- `mc/Enemy`, `mc/Hazmat` mai caricati (~15 MB); `mj/r_SM_FerrisWheel_02` mai citato; `Soldier` caricato solo per armi già in `oggetti3d`.
- Cinque kit scaricati all'avvio ma non usati in gioco (`main.js:1476`, `avvio.js:36`): `casa`, `rurban`, `urban`, `garage`, `tortura`.
- `assets/vegetazione/*.jpg` (~2,2 MB) inutilizzati; `atlante_foto.png` solo con `?verdefoto`.
- Due sistemi di vestizione: `vestiario.js`, `sartoria.js`, `pittura.js` (~3,5k righe) nella pagina solo per `?vecchiagente` e le miniature
  del Menu (`menu_ui.js:251`); due sistemi di cappelli, due di teste, quattro stili, `outfitOfPrima`.
- Copie vecchie: v2-v6 ~176 MB (37 gruppi di file identici); `_backup_neon_modelli` 14 MB; `_to_delete` 23 MB.

## 4. Proposta «fumetto hip hop» per il telefono

**Budget**: protagonista 6-8k triangoli; persone vicine (< 15 m) 3-4k; medie (15-40 m) 0,8-1,2k; oltre 40 m spente o sagoma. Un materiale e
una chiamata per figura, atlante 1024 sul telefono (2048 sul computer) con 4 px di margine. Mezzi 1,5-3k vicini, 300 lontani, 4-6 materiali.

**Personaggi**: tenere il procedurale, cambiare la resa: normali lisce con angolo di spigolo, rampa toon a 2-3 bande comune al mondo, emissivo
0,05, contorno a pennarello in post (guscio rovesciato solo per il protagonista). Testa ×1,2-1,25, mani ×1,15, scarpe più alte e corte,
pantaloni che si ammucchiano, cappello sempre calzato. Teste da 8-10 archetipi scolpiti (~800 triangoli), variati con morph e colori.

**Animazioni prioritarie**: idle col peso su una gamba (tre varianti), camminata con spalle, corsa con braccia che pompano, transizioni con fase
sincronizzata, colpito/caduta/rialzarsi, due-tre colpi di rissa, appoggiato al muro e seduto.

**Passi**:
1. Quasi zero: stile `k` senza `flatShading` (o `b` di serie), emissivo più basso; fase sincronizzata camminata/corsa (`models.js:361`);
   `frustumCulled` con sfera allargata; cancellare Enemy/Hazmat/FerrisWheel/jpg; i cinque kit solo quando servono.
2. Basso: limite `sotto` per tutti i cappelli, durag e bandana che tolgono i capelli; niente viso e lacci coperti; scarpe; orlo, tasca,
   cintura; margine nell'atlante, stampe come decalcomanie sul petto a 512 px.
3. Medio: proporzioni fumetto; tre idle procedurali, strato braccia per la corsa; LOD delle persone.
4. Medio-alto: archetipi di testa con capelli e cappelli; tavola da approvare.
5. Alto: nuovo pacchetto di clip; mezzi e oggetti sulla stessa rampa toon con meno materiali; RX-7/GTR/Bursley rifatte con `veicoli3d`;
   pulizia di v2-v6, dei backup e del vecchio vestiario.
