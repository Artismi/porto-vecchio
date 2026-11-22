# [pieno] Perché la città «è vuota»: la misura, e lo strato del pieno

## 1. Come si è misurato (Node + un censimento nel gioco vero, nessuna foto)

- `strumenti/pieno_censimento.js`: il gioco vero in Chromium (SwiftShader, `?cittanuova`, la città costruita nel browser, seme fisso),
  la partita cominciata (la storia dei muri dei writer si fa al primo passo, `writer_vita.js:280`), poi il registro del regista
  (`R.__vis3.reg`, `render.js:9019`: porte, vetrine, insegne, serrande, tende, citofoni, applique, pluviali, arredo...), gli oggetti posati
  (`Pavimenti.oggetto`, come `censimento_scena.js`) e i lavori dei writer (`st.wr.works`). Con lo strato acceso anche `Pieno.elenco()`.
- `strumenti/pieno_misura.js`: i 13 percorsi di `W.percorsi` (`percorsi.js:497`, 1.270 m), un campione ogni metro, per ogni 10 m quello che sta
  entro 9 m dall'asse e sotto i 3,5 m sul suolo (quello che la camera alta vede: il suolo e il primo piano delle facciate). **Muro nudo**:
  il primo pieno della griglia a destra e a sinistra (entro 9 m), un punto al metro; nudo se entro 1,2 m e sotto i 3 m non c'è niente
  (luci e bucato non contano).
- Avvertenza sui graffiti: la storia dei muri fa 2.460 lavori, ma alla partenza solo 13 hanno il riquadro sul muro; gli altri si piazzano
  a gioco, vicino alla camera, a budget (`writing.js:2660-2700`: 1 ms a fotogramma sul telefono, al più 120 veli, `writing.js:781`). La
  misura li dà in due modi: «con i lavori» (ogni lavoro conta nel punto dove il writer starebbe: il massimo) e «senza» (solo quelli certi).

## 2. Com'era (base 6379b0b)

| per 10 m di percorso (media dei 13) | |
|---|---|
| muro nudo, senza i lavori non piazzati | **69%** dei punti di facciata (15 tratti di 10 m su 127 senza niente) |
| muro nudo, contando ogni lavoro dove starebbe | 24% |
| tag / throw-up / pezzi (se tutti piazzati) | 7,2 / 2,7 / 0,6 |
| manifesti | **0** (la storia E di questa build non ne fa: `strada_dipinta.js` li prevede, `st.wr.works` non ne ha) |
| adesivi | 1,3 (0,16 certi, sui pali) |
| serrande | 1,9, ma sono **i cassonetti delle botteghe aperte** (`render.js:11160`): nessuna serranda abbassata da dipingere |
| insegne / tende / luci | 0,75 / 0,01 / 2,7 |
| arredo / minuterie a terra | 3,1 / 3,0 (pali, fioriere, bidoni, vasi alle porte) |
| bucato | 0 sui percorsi |
| a terra | quello che dipinge il suolo (`segniList1`, `render.js:10453`: rattoppi, olio, tombini, il gesso solo al centro di piazzette, sagrati, marine) |

I vuoti più lunghi (muro nudo di fila, lato destro): Dal piazzale alle baracche 23 m (1270, 304), Via della Vittoria 14 m (1448, 350),
Rua Maestra 10 m (1387, 312), Dalla marina allo Scalo, Via di Mezzo, Dal Corso alla stazione 6-7 m. Per via, senza lavori: Dal piazzale alle
baracche 88%, Via della Marina 74%, Dalla marina allo Scalo 72%, La calata 72%; i più pieni il Corso (35%) e la Rua (50%).

Le cause, in ordine di peso:
1. **La vernice c'è nei dati ma non sul muro.** I 2.460 lavori aspettano il disegnatore (vicino alla camera, 1 ms a fotogramma): sul telefono
   la città che vedi è quasi pulita, e la vernice arriva (se arriva) dove sei già passato.
2. **Niente carta.** Nessun manifesto della strada nella storia di questa build; i manifesti di `muri1` (`render.js:3191`) solo dove la
   pagina dei segni li vuole, pochi; nessun manifesto funebre, nessun civico.
3. **Le serrande sono tutte alzate**: il segno più hip hop di una via del Sud (la saracinesca taggata o dipinta) non esiste.
4. **Il piede del muro e il marciapiede sono puliti**: niente vernice caduta, macchie, mozziconi davanti al bar, gesso fuori dalle piazzette.
5. **Le piccole storie mancano** davanti alle porte: le botteghe hanno merce dietro il vetro e la tenda, non la cassetta e la sedia fuori.

## 3. Lo strato del pieno (`src/pieno.js`, di serie; `?nopieno` lo spegne)

Una sola tessitura (`assets/pieno/atlante.png` 2048×1024, sul telefono `atlante_tel.png` 1024×512), disegnata una volta coi pennelli del
gioco (`writer_arte.js art`: tag, throw-up, adesivi, manifesti a strati nella tavolozza E; i nomi e le serate di `strada_dipinta.js`) più i
disegni a mano (6 serrande dipinte, funebri, 16 civici di maiolica, colature, vernice a terra, gesso, mozziconi, macchie): 76 celle.
La posa è a regole (zone e ritmo di `strada_dipinta.js`; i moduli di muro pieno del piano terra `b.__win`; il raggio dei graffiti per
l'aderenza; fuori da porte, vetrine, finestre, insegne, grate, murales del regime, tombini; mai in carreggiata) e la fa il gioco a celle di
24 m attorno alla camera (a passi, una faccia per passo, 3 ms a fotogramma sul telefono).

Nella città misurata (1222-1610 × 250-420) lo strato posa **523 cose**: 94 tag, 15 throw-up, 84 grappoli di adesivi, 20 muri di manifesti,
4 funebri, 26 serrande abbassate e dipinte (con guide e cassonetto 3D), 11 civici, 47 colature, 77 vernici a terra, 41 macchie, 19 mozziconi,
30 gessi (12 campane), e 55 piccole storie 3D (6 bar, 6 botteghe con le cassette, 21 negozianti seduti fuori, 14 sedie davanti alle porte
delle case, a volte col secchio e la scopa, 3 officine, 1 angolo dei writer, 4 edicole votive coi lumini e i fiori).

| per 10 m di percorso | prima | dopo |
|---|---|---|
| muro nudo (senza i lavori non piazzati) | 69% | **58%** |
| tratti di 10 m senza niente | 15 / 127 | 9 / 127 |
| cose nuove (decalcomanie a muro e a terra, cose 3D) | - | 2,1 (tag 0,30, adesivi 0,43, manifesti 0,13, serrande 0,05, civici 0,06, colature 0,18, a terra 0,67, cose 3D 0,28) |

Le vie con più botteghe guadagnano di più (Via di Mezzo 3,9 cose nuove ogni 10 m, Dal Forno alla marina 5, la Rua 3,2), il lungomare e il
piazzale delle baracche quasi niente (pochi muri pieni, quasi tutti finestre o grate).

## 4. Il costo (il telefono è legato ai disegni)

- **Due disegni** in tutto, in ogni vista: un InstancedMesh per tutte le decalcomanie (muro e suolo), una Mesh per tutte le cose 3D
  (geometria rifatta quando la camera si sposta di 3 m). Nessun materiale per cosa. Sul computer le cose fanno anche l'ombra (+1 nel
  passaggio delle ombre); sul telefono no. Le misure nel Game Boy sono in `_immagini/squadra/pieno/` (vedi sotto).
- Memoria: l'atlante del telefono 1024×512 (2,8 MB con le mipmap), i vertici delle cose vicine (~9 k).
- Il tempo: la pianta si fa nel budget (3 ms a fotogramma sul telefono); un fotogramma con una faccia lunga può superarlo (una faccia non si
  spezza). Fuori dall'impronta dei tasselli: la città cotta non cambia (`build.py` TASS_FUORI e l'atlante fuori da PV_VER dell'impronta).

## 5. Aperto

- L'aderenza è prudente: due candidati su tre si scartano (zoccoli, grate keepTr, vetri, murales, piani rotti: `__PIENO.scarti`). Più densità
  vuole i pilastrini fra le finestre (0,5 m) e le facce tutte finestre (228 su 636 non hanno un modulo di muro pieno al piano terra).
- I lavori dei writer piazzati dopo possono cadere sopra una serranda o un manifesto (la pianta guarda solo quelli già sul muro e i grandi).
- Il bucato nei vicoli non si posa (i raggi a 4,2 m non trovano due muri a meno di 7 m nei vicoli misurati): da rivedere coi `__PV_FILI`.

## 6. La tavola nel Game Boy (`_immagini/squadra/pieno/prima_dopo.jpg`)

`node strumenti/pieno_tavola.js <cartella>` (la pagina del Game Boy dell'APK, profilo Pixel 7 in verticale, il gioco in /gioco/, seme fisso)
e `python3 strumenti/pieno_tavola.py <cartella> <uscita.jpg>`: quattro viste (stazione, bar sulla Rua, serranda, bottega), la stessa
partita con lo strato spento (`Pieno.imposta(false)`, sopra) e acceso (sotto).

- **Disegni**: lo strato ne aggiunge esattamente 2 (`Pieno.disegni()` = 2 in ogni vista: l'InstancedMesh e la Mesh). Il totale del
  fotogramma misurato (renderer.info sommato su tutti i passaggi) va da +2 a -7: è il rumore delle ombre a fotogrammi alterni del telefono
  (stazione 2301 → 2303, bar 1521 → 1514, serranda 545 → 547, bottega 584 → 586). Il tetto chiesto (+20) è lontano.
- **Quello che si vede**: poco. Con la camera del telefono (alta, in verticale) metà del quadro è selciato vicino al personaggio e i muri si
  vedono di sbieco in alto: nelle quattro viste si leggono i mozziconi e la vernice davanti al bar, le macchie; le serrande dipinte, i
  manifesti e le tag stanno sui muri al bordo del quadro o dietro le pensiline. Nelle viste di prova di fronte al muro (stessa build, pagina
  del telefono senza il guscio) le serrande col throw-up, i manifesti a strati e il negoziante seduto fuori si leggono bene.
- Non verificato a occhio: la notte (le decalcomanie prendono la luce del muro, i lampioni le accendono come il muro), il telefono vero
  (Adreno/Mali: l'atlante e un attributo per istanza in più, niente di nuovo nello shader oltre la uv).

## 7. Prossimi passi (ragionati, in ordine di resa per la camera del telefono)

1. **Il suolo vicino al personaggio** è la superficie più grande del quadro: le storie a terra (gesso, vernice, macchie, mozziconi, cassette)
   anche sui marciapiedi larghi e nelle piazze, non solo al piede del muro; più grandi e più contrastate.
2. **I pilastrini fra le finestre** (0,5 m) per adesivi, foglietti «cerco» e tag verticali: 228 facce su 636 oggi non hanno posto.
3. **Le serrande più spesso dove la camera guarda di fronte** (le testate delle vie, i fondali di `strada_dipinta.js fondaliStrade`).
4. Il bucato nei vicoli (oggi non posa) e l'accordo coi lavori dei writer che si piazzano dopo (ricontrollo alla posa del velo).
