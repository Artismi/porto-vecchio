# [texture] RICERCA — il suolo a fumetto con grinta, sul telefono

Breve, per decidere. Il nostro suolo è già **procedurale al pixel** (`src/pavimenti.js`, lo shader del suolo dei blocchi e dei marciapiedi):
il problema non è la risoluzione delle tessiture ma *cosa* si disegna, *quanto contrasto arriva allo schermo* e *dove si spegne*.

## 1. Come lo fanno i giochi «dipinti / a fumetto» con il suolo che ha carattere

- **Borderlands 1-3, Hi-Fi Rush, Jet Set Radio Future, Sable**: il dettaglio del suolo è **disegnato**, non fotografato: giunti e crepe come
  *linee d'inchiostro* a spessore quasi costante sullo schermo, campiture piatte a 2-3 valori per pietra, sporco come **macchie a bordo netto**
  (non sfumature di rumore), poche cose grandi e leggibili invece di tanta grana. Il «grit» viene dalla forma (pietra scheggiata, buca col
  bordo, crepa che si ramifica) e dal valore, non dal rumore fine — che a fumetto si legge come sporco del video.
- **Hi-Fi Rush / Guilty Gear** (Arc System Works, GDC 2015 «GuiltyGear Xrd's Art Style»): le linee interne sono *disegnate nella tessitura o
  nello shader* e allineate al mondo; la luce a fasce fa il volume, la linea fa il dettaglio. Le linee si **diradano** con la distanza, non si
  assottigliano sotto il pixel.
- **The Legend of Zelda: BotW/TotK, Genshin**: suolo stilizzato con **variazione macro** larga (chiazze di decine di metri) sopra il
  dettaglio che si ripete: la ripetizione sparisce perché l'occhio legge le macchie grandi.

## 2. Rompere la ripetizione

- **Variazione macro in coordinate del mondo** (UE «macro variation», Epic Landscape docs): uno o due rumori lenti (3-20 m) moltiplicati sopra
  il materiale; costa 1-2 letture. Per il fumetto: soglia con bordo antialiasato (`fwidth`) → chiazze a 2 toni, non nebbia.
- **Texture bombing / stochastic tiling** (Heitz & Neyret 2018; Mikkelsen 2022 «hex tiling»): utili per tessiture fotografiche; da noi le
  pietre sono già generate per cella (hash della pietra): basta che **ogni pietra abbia il suo caso** (valore, scheggiatura, crepa, mancante).
- **Dettaglio a due scale** (detail texture): la scala della pietra (0,15-1 m) e la scala dell'uso (le corsie, il centro consumato del vicolo,
  il piede dei muri sporco) che segue la geometria della città, non una griglia.

## 3. Lo sporco dove deve stare (grime)

- **Maschere economiche nel mondo**: distanza dal muro (abbiamo già la maschera a 25 cm per blocco, `K.r`), distanza dal ciglio della via
  (`v`, `hw` della mappa delle vie), cavità (i giunti stessi). Lo sporco si accumula: al piede dei muri, nei giunti, lungo il cordolo, agli
  angoli. Nei giochi: *vertex AO* / *curvature* (Uncharted 4, «Materials» SIGGRAPH 2016), *decal* (DOOM 2016). Noi: la maschera c'è già, si
  disegna meglio (una fascia a bordo mosso e netto, più scura nei giunti).
- **Erbacce**: ciuffi istanziati vicino al giocatore, posizione presa dal mondo (hash della cella), filtrati da una maschera (muro, ciglio,
  giunti): **un disegno solo** per tutti (come `prato_fili.js`); oltre il raggio diventano macchie dipinte nel suolo (2D), così non «spuntano».

## 4. Né sfocato vicino né sfarfallio lontano

- **Filtrare il procedurale** (Inigo Quilez, «filterable procedurals», «bandlimited»): ogni famiglia di linee conosce la sua frequenza sullo
  schermo (`fwidth`) e **svanisce prima** di scendere sotto il pixel (2-3 px per elemento). Quello che resta lontano è il valore medio *più* le
  macchie grandi, non una tela sfocata.
- **Mipmap anche sulle tessiture di rumore** lette ad alta frequenza: senza, il rumore campionato a 1-2 celle per pixel sfarfalla in
  movimento. Con `LinearMipmapLinear` la lettura lontana si media da sola, gratis.
- **Anisotropia 4-8** sulle tele del suolo viste di sbieco (la camera alta: a metà schermo il suolo è a 35-45°): già 4 sulle tele dei blocchi.
- **I salti di LOD**: niente «pop»: dissolvenza nel tempo (0,4-0,8 s) quando arriva il dettaglio, o un passaggio continuo per distanza.

## 5. Telefono (Mali-G57 / Adreno 6xx)

- Il costo è **per pixel × metà schermo**: ogni lettura di tessitura e ogni `fwidth` conta. Regole: rami su **uniform** (coerenti), niente
  letture dipendenti in cascata, poche (≤ 2) letture in più nel profilo leggero; il lavoro si spegne per distanza col ritorno anticipato.
- Le erbacce: ≤ 1 disegno, vertici collassati per i ciuffi che non ci sono (come `prato_fili`), niente ombre proiettate, raggio piccolo.
- Memoria: niente tessiture nuove grandi; le maschere piccole attorno al giocatore (decine di KB).

## Scelte per Porto Vecchio

1. **Inchiostro dopo la calma**: i giunti, le crepe, i bordi delle buche si stendono *dopo* le correzioni di tono del suolo (oggi la «calma»
   ne toglie ~80% del contrasto): è il cambio che dà più grinta a costo quasi zero.
2. **Pietra per pietra**: tre valori, qualche pietra scheggiata / mancante / affondata, crepe disegnate a mano nelle lastre (l'isolinea di un
   rumore dentro la pietra, a 1 px).
3. **Macro nel mondo**: umido, sporco, consumo a chiazze di 3-15 m a bordo netto (2 toni), il centro dei vicoli lucidato, i bordi sporchi.
4. **Asfalto**: buche col bordo, toppe, crepe anche nel profilo leggero (una lettura).
5. **Ghiaia e terra**: sassi a celle senza vicini (2 hash), le spalle delle sterrate a ghiaia, la terra battuta nelle carreggiate.
6. **Erbacce** istanziate (1 disegno) al piede dei muri, lungo il ciglio, nelle fughe; oltre il raggio, il ciuffo dipinto nel suolo.
7. **Rumore con le mipmap**, e il dettaglio che si spegne per dimensione sullo schermo.
