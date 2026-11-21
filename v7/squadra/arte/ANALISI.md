# Direzione artistica: l'analisi (la squadra, 21 novembre)

Rapporto dell'esperto di direzione artistica e rendering stilizzato. Foto di lavoro nella cartella temporanea della sessione (`squadra/arte/`):
le principali vanno copiate in `_immagini/squadra/arte/` con la fase di intervento.

## 1. Diagnosi

Tre sessioni nel Game Boy in verticale, col profilo telefono. Stato misurato in partita: **gradino 2 del regolatore, luce3 spenta,
tratteggio d3t, scena interna 362×692 px** (circa 1 pixel per pixel CSS, poi ingrandito 2-3 volte sullo schermo vero).

- **Il difetto più grosso è il retino della camera.** Chiome e tronchi fra camera e personaggio bucati a puntini: una colonna o una
  cupola di sabbia verde che occupa metà schermo e passa anche sopra il personaggio, che diventa un mosaico.
- **Sabbia e trattini.** Sul suolo in ombra trattini neri isolati, lungo cordoli e spigoli puntini scuri. Spegnendo gli strati spariscono.
- **«Si brucia».** Facciate gialle e arancio diventano lastre piatte sature, senza trama, con spigoli a scaletta, capitelli lilla che
  sembrano accesi, porte verde puro: il «rettangolo giallo pieno» che DECISIONI vieta.
- **Il contorno del personaggio si spezza** quando è coperto: il contorno e il bollino bianco si frantumano in macchie bianche sospese.
- **Veli.** I tetti che sbiadiscono lasciano grandi poligoni lilla semitrasparenti sopra le case.
- **«Neutro».** Di giorno sul lungomare l'immagine è grigio chiaro, slavata, senza un piano dominante.
- **Pulire non basta**: spegnere gli strati toglie la sporcizia ma non cambia il carattere. Il «neutro» sta nella luce e nei colori di
  base, non negli effetti.
- **Quando funziona**: al crepuscolo, edificio viola, neon rosa, personaggio col contorno nero spesso. La direzione giusta c'è già,
  sommersa.

## 2. Gli artefatti nel codice

1. **Retino della camera7**: `render.js:1698-1701` (`FADE7`), `discard` con rumore a gradiente interleaved (≥70% dei pixel nella
   capsula), duplicato in `vegetazione.js:1025`; in regia raggio 3 m (`render.js:20027`). Correzione: niente `discard` casuale; un taglio
   circolare netto attorno al personaggio sullo schermo, col bordo antialiasato e un anello d'inchiostro, oppure la cosa davanti diventa
   sagoma vuota (solo contorno).
2. **Contorno e bollino del personaggio a mezza risoluzione**: `render.js:14200` (`eDist`, `W >> 1`), applicato in `15427-15431`.
   Correzione: contorno a scafo rovesciato alla risoluzione dello schermo; via il bollino; il personaggio si segnala con un anello a terra
   o un bordo di luce colorato.
3. **Risoluzione interna 1 px per px CSS**: `render.js:13886-13887` (`LO`), ingrandimento Catmull-Rom (`13919-13938`), dpr 3 del browser:
   il dettaglio procedurale di 1-2 px arriva come macchie di 3-6 px. Correzione: niente dettaglio sotto i 3 px; l'inchiostro come campo con
   soglia nel passo d'ingrandimento (al pixel vero); col budget liberato 1,3-1,5 px per px CSS.
4. **Tratteggio d3t**: `tratteggio.js:132-222`, normali da `dFdx/dFdy` della profondità (riga 134; anche `render.js:15411`), «trema a
   quadretti». Correzione: toglierlo dal mondo.
5. **«Aria» ad acquerello**: `tratteggio.js:223-253`. Correzione: togliere.
6. **Lente che respira** (`PELL`, `render.js:14294`, `14958-14959`): ricampiona tutto il quadro con 3,5-7,5% di deformazione.
   Correzione: togliere, o solo nei passaggi della regia.
7. **Ombre che scattano**: sul telefono a fotogrammi alterni (`render.js:20893`, `20897`; ogni 3 al gradino 6 di `fluido_tel.js`).
   Correzione: a ogni fotogramma, con meno oggetti che fanno ombra e il riquadro agganciato al texel.
8. **Il regolatore cambia lo stile**: `fluido_tel.js:40` spegne luce3 dal gradino 2 (il telefono parte dal 2). Correzione: il regolatore
   tocca solo risoluzione, numero di persone, ombre; mai lo stile.
9. **Tetti trasparenti**: `render.js:1887-1893` (`tetto4`). Correzione: tetto intero o spaccato con sezione piena contornata.
10. **Fili d'inchiostro a scaletta**: filo dalla profondità `render.js:15257-15300`, largo 1 px della scena. Possibile concausa: la
    categoria nell'alfa con MSAA 2× risolta in media.
11. **Colore che brucia, capitelli lilla**: tavolozza Oklab per pixel di E (`render.js:15393-15407`) più piani di valore per categoria
    (`15161-15205`) e ritocchi dell'ora. Correzione: il colore nei materiali, non a valle.
12. **Residui morti**: passo DEV/«strada» (`render.js:13770-13820`, retino fisso a 45° in `13802`); grana (`15363`) e dither (`15439`).

## 3. Contraddizioni di stile

- **Cinque modelli di luce**: 256 `MeshStandardMaterial`, 207 `Basic`, 162 `Lambert`, 15 `Physical`, 13 `Phong`. Solo i «physical»
  ricevono bande e forma di luce3 (`render.js:14710`, `luce3.js:282`).
- **Un passo finale a strati**: ~530 righe di GLSL (`render.js:14908-15440`), una dozzina di `#ifdef` (PRO, AAA, NIT, PFD, STILE, DIR,
  CAT, LOOK, STR, AD, FXAA/HDAA, TEL), più luce3 e tratteggio che lo modificano per sostituzione di testo.
- **Cinque inchiostri**: bruno caldo (`15300`), blu-viola (`15101`), quasi nero viola di D (`15310`), grigio tecnico (`15028`), nero di E
  (`15431`); più il «pennarello» per categoria e la fascia di separazione.
- **Generazioni di stile accese insieme**: A, la via di mezzo E (k .55: il «neutro» nasce lì), luce3/4/5, tratteggio a…d3t, aria, nitida,
  profondità 2/3, diorama, rivoluzione, pellicola.
- **Graffiti contro mondo**: i pezzi grandi sono la cosa più «fumetto»; il mondo attorno, dipinto e velato, li spegne.
- **Personaggi contro mondo**: contorno nero spesso contro fili sottili bruni o niente.
- **Interfaccia**: font pixel su pannelli scuri traslucidi, retro Game Boy più che hip hop.

## 4. La proposta: «fumetto hip hop», pulito e coerente

Una regola: **il disegno sta nei materiali e nella geometria, il passo finale fa solo inchiostro e nebbia.**

- **Passo 0 · togliere** (1-2 giorni, rischio basso, costo negativo): retino → taglio netto; via tratteggio, aria, lente, bollino, piani di
  valore per categoria, tavolozza Oklab di E, fascia di separazione; tetti a spaccato; ombre a ogni fotogramma; regolatore senza stile.
- **Passo 1 · luce a fasce in tutti i materiali** (3-5 giorni): un pezzo di luce comune (o un materiale toon unico), due fasce più accento;
  confine antialiasato con `fwidth`; ombra portata e propria dello stesso colore; ombra mai sotto ~55% della luce, spostata verso viola.
  Da ricuocere i tasselli.
- **Passo 2 · un inchiostro solo** (3-4 giorni): scafo rovesciato per persone, mezzi e oggetti vicini; sagome dalla profondità per il
  mondo, con la soglia al pixel vero; linee interne nelle trame; colore unico `#16121B`, verso l'aria in lontananza.
- **Passo 3 · tavolozza nei materiali** (3-5 giorni): BIBBIA §11.1; muri pastello, suolo medio caldo, tetti medio-scuri; colore pieno
  solo per graffiti, insegne, tende, persone, obiettivi; accenti magenta, ciano, giallo limone, arancio, nero.
- **Passo 4 · cielo e retino con misura** (1-2 giorni): cielo a tre fasce, nuvole contornate; retino solo al pixel vero, celle ≥ 6 px,
  solo cielo/fondale, fotogrammi d'azione, interfaccia; mai su suolo e muri vicini.
- **Passo 5 · graffiti, insegne, personaggi, interfaccia** (una settimana): graffiti quasi senza luce e contornati; insegne piatte con
  bordo nero e ombra sfalsata, neon acceso/spento; personaggi a due fasce con contorno di 2 px; fumetti bianchi col bordo nero, un font
  display condensato, il pixel solo per i numeri.

Costo: il passo proposto fa ~10 letture e un centinaio di operazioni contro le decine di oggi; il risparmio paga 1,3-1,5 px per px CSS.

## 5. Da tenere

I graffiti grandi e le loro regole; il contorno nero spesso del personaggio con la giacca vermiglio; le tinte del crepuscolo e della notte;
la tavolozza a nomi della BIBBIA; le ombre portate; la camera alta; il Game Boy rosa; il lavoro sugli hash per Mali e Adreno.
Ordine: 0 → 1 → 2 → 3 → 4 → 5, ognuno con una tavola da approvare.
