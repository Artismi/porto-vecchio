/* [unico] unico_catalogo.js: IL CATALOGO DEL SISTEMA UNICO, solo dati (progetto: commedia/SISTEMA_UNICO.md §1.1, §2.1.1, §7.4).
   Dietro ?commedia. Spento il flag: UnicoCatalogo = { ON: false } e nient'altro.

   Passo 1 («il corpo», §10 riga 1): qui c'è solo il LESSICO, cioè quello che serve a Lingua (unico_lingua.js) e a Roba
   (unico_attore.js) per dire bene ogni cosa: il genere e il numero delle parole di testa di tutti i nomi di Oggetti.CAT
   (oggetti.js:42, la verità), di Risacca.RES, di Economia.MERCI, di Azioni.ITEMS e delle cose di casa (casa.js:94-113), più le
   parole che i moduli vecchi mettono nelle battute. Le schede dei verbi, le pose, i segni e gli obiettivi (§3.2, §3.3, §7)
   entreranno qui ai passi 3-5.

   Il formato delle TESTE: «parola:codice[/altra forma]», separate da spazi.
     m · f      singolare maschile · femminile; /forma = il plurale, se la regola non basta (pacco/pacchi è la regola, medico/medici no)
     mp · fp    plurale; /forma = il singolare (lenzuola/lenzuolo, uova/uovo)
     mi · fi    invariabile (il tè, i tè; la radio, le radio)
   Una parola in -e senza voce qui è un errore del lessico, non un'euristica: la prova test_unico_corpo.js controlla che tutte le
   teste dei cataloghi ci siano. */
var UnicoCatalogo = (function () {
  'use strict';
  const ON = typeof location !== 'undefined' && /[?&]commedia\b/.test(location.search);
  const UnicoCatalogo = { ON };
  if (typeof module !== 'undefined' && module.exports) module.exports = UnicoCatalogo;
  if (!ON) return UnicoCatalogo;

  // ============ LE TESTE: il genere e il numero (le teste di Oggetti.CAT, poi gli altri cataloghi, poi le parole delle battute) ============
  const TESTE = `
pane:m focaccia:f/focacce pacco:m biscotti:mp gallette:fp verdura:f sacchetto:m patate:fp pomodori:mp cipolle:fp frutta:f limoni:mp
olive:fp mezza:f dozzina:f uova:fp/uovo litro:m forma:f formaggio:m carne:f salsiccia:f/salsicce salame:m pesce:m sarde:fp polpo:m
scatoletta:f tonno:m fagioli:mp barattolo:m conserva:f panino:m piatto:m gavetta:f minestra:f gelato:m miele:m tavoletta:f
cioccolato:m bottiglia:f acqua:f tanica:f cisterna:f tazzina:f caffè:mi caffe:mi thermos:mi tè:mi vino:m birra:f grappa:f
whisky:mi aranciata:f sacco:m farina:f pasta:f riso:m passata:f olio:m/oli oliva:f sale:m zucchero:m foglie:fp lievito:m strutto:m
capo:m bestiame:m cassetta:f uva:f fascio:m/fasci legna:f carbone:m benzina:f gasolio:m carbonella:f bombola:f gas:mi scatola:f
fiammiferi:mp accendino:m candele:fp alcol:mi latta:f motore:m tronco:m assi:fp/asse trave:f pannello:m compensato:m sughero:m
pallet:mi mattoni:mp cemento:m sabbia:f ghiaia:f pietre:fp secchio:m/secchi malta:f lamiera:f tondino:m ferro:m barre:fp lamierino:m
rotolo:m rete:f telo:m lastra:f vetro:m tubi:mp tubo:m stufa:f chiodi:mp viti:fp/vite bulloni:mp dadi:mp paio:m/paia cerniere:fp
lucchetto:m catena:f corda:f nastro:m colla:f sacchi:mp iuta:f vernice:f bomboletta:f spray:mi pennarello:m tag:fi gessetti:mp
gessetto:m gesso:m guanti:mp/guanto martello:m cacciaviti:mp/cacciavite cacciavite:m pinze:fp/pinza tronchesi:fp/tronchese chiave:f
seghetto:m metalli:mp sega:f ascia:f/asce lima:f trapano:m mano:f/mani stetoscopio:m/stetoscopi taglierino:m forbici:fp cazzuola:f
pala:f piccone:m piede:m porco:m grimaldelli:mp grimaldello:m carriola:f saldatore:m stagno:m rocchetto:m pentola:f padella:f
moka:fi ferri:mp maglia:f ago:m filo:m canna:f pesca:f torcia:f/torce pile:fp/pila lampadine:fp/lampadina matassa:f cavo:m
valvole:fp/valvola transistor:mi condensatori:mp altoparlante:m batteria:f auto:fi sveglia:f interruttori:mp interruttore:m
fusibili:mp radio:fi ricetrasmittente:f antenna:f disturbatore:m frequenze:fp timer:mi orologeria:f cellulare:m macchina:f
rullino:m audiocassetta:f risma:f carta:f cartoncino:m flacone:m inchiostro:m penne:fp/penna matite:fp/matita quaderno:m
buste:fp/busta francobolli:mp francobollo:m giornale:m volantini:mp volantino:m manifesti:mp manifesto:m libretti:mp libretto:m
stencil:mi cartone:m timbro:m ufficio:m/uffici rettifiche:fp foto:fi tessera:f lasciapassare:mi fascicolo:m tutela:f moduli:mp
modulo:m stemma:m/stemmi aspirine:fp/aspirina fiale:fp/fiala morfina:f soccorso:m antibiotici:mp/antibiotico antibiotico:m/antibiotici
garze:fp/garza bende:fp/benda cerotti:mp/cerotto disinfettante:m siringhe:fp/siringa saponetta:f detersivo:m candeggina:f
spugne:fp/spugna dentifricio:m/dentifrici rasoio:m/rasoi lamette:fp/lametta stracci:mp/straccio pezza:f stoffa:f panno:m divisa:f
lana:f pelle:f bottoni:mp/bottone vestiti:mp/vestito maglione:m cappotto:m scarponi:mp/scarpone scarpe:fp/scarpa passamontagna:mi
zaino:m coperta:f lenzuola:fp/lenzuolo lenzuolo:m/lenzuola grigi:mp mobile:m mobili:mp sedia:f tavolo:m branda:f materasso:m
scaffale:m cassa:f legno:m pannelli:mp barricata:f porta:f botola:f fornello:m campo:m banco:m lavoro:m cucire:mi ciclostile:m
alambicco:m rame:m ingranditore:m bacinelle:fp/bacinella coltello:m pistola:f lupara:f mitra:mi munizioni:fp/munizione molotov:fi
candelotto:m dinamite:f triboli:mp punte:fp/punta kit:mi sabotaggio:m manette:fp stecca:f sigarette:fp/sigaretta sigaretta:f
contrabbando:m tabacco:m cartine:fp/cartina mazzo:m carte:fp orologio:m/orologi gioielli:mp/gioiello dollari:mp/dollaro impero:m
roba:f refurtiva:f merce:f/merci rottami:mp/rottame televisore:m elettrodomestico:m/elettrodomestici pezzi:mp/pezzo pneumatico:m/pneumatici
castagne:fp/castagna funghi:mp/fungo ceci:mp/cecio baccalà:mi baccala:mi acciughe:fp/acciuga ricotta:f mortadella:f segale:f
polenta:f minestrone:m latte:m polvere:f marmellata:f mele:fp/mela arance:fp/arancia noci:fp/noce fichi:mp/fico razione:f
gomme:fp/gomma liquore:m mirto:m succo:m vodka:fi mais:mi orzo:m aceto:m pepe:m spezie:fp/spezia burro:m petrolio:m lampada:f
razzo:m segnalazione:f catrame:m plexiglas:mi grata:f fascette:fp/fascetta plastica:f lubrificante:m moschettoni:mp/moschettone
acciaio:m/acciai tasselli:mp/tassello silicone:m molle:fp/molla morsa:f pialla:f scalpelli:mp/scalpello metro:m livella:f mazza:f
zappa:f falce:f cesoie:fp chiavi:fp/chiave tester:mi binocolo:m bussola:f coltellino:m serramanico:m pompa:f bici:fi cuffie:fp/cuffia
microfono:m registratore:m cassette:fp/cassetta coppia:f walkie-talkie:mi dinamo:fi manovella:f motorino:m telefono:m galena:f
matrici:fp/matrice annonaria:f partito:m garante:m mappa:f isola:f piantina:f caserma:f rivista:f sciroppo:m tosse:f vitamine:fp/vitamina
tintura:f iodio:m laccio:m/lacci fratture:fp/frattura termometro:m sonniferi:mp/sonnifero shampoo:mi pettine:m specchietto:m
tenda:f impermeabile:m stivali:mp/stivale stivale:m gomma:f berretto:m sciarpa:f tuta:f giacca:f maschera:f elmetto:m giubbotto:m
jeans:mp/jeans stufetta:f bicicletta:f fionda:f baseball:mi tirapugni:mi peperoncino:m fumogeno:m petardi:mp/petardo anello:m oro:m
posate:fp/posata argento:m quadro:m collezione:f dischi:mp/disco vinile:m musica:f profumo:m calze:fp/calza nylon:mi osso:m
dinosauro:m anfora:f monete:fp/moneta medaglia:f guerra:f moschetto:m frigorifero:m telaio:m/telai ruota:f lattine:fp/lattina
piombo:m batterie:fp/batteria pennello:m
viveri:mp attrezzi:mp/attrezzo attrezzo:m materiali:mp/materiale materiale:m parti:fp/parte parte:f medicine:fp/medicina medicina:f
documenti:mp/documento documento:m prove:fp/prova boccetta:f carico:m scatolame:m scatolone:m fotocamera:f vernice:f
poltrona:f sgabello:m pouf:mi televisione:f abat-jour:fi radiolina:f portagioie:mi candela:f altarino:m bandiera:f tappeto:m
giornali:mp pianta:f fiori:mp/fiore fiore:m cartacce:fp/cartaccia bottiglie:fp/bottiglia macchia:f birre:fp/birra posacenere:mi
icona:f poster:mi casse:fp/cassa
fucile:m cane:m sapone:m mare:m pontile:m ponte:m cantiere:m distributore:m monte:m torrente:m piazzale:m viale:m canale:m
belvedere:m casale:m ovile:m campanile:m fiume:m caricatore:m trasmettitore:m lente:f fune:f neve:f luce:f stampante:f notte:f
gente:f chiesa:f fontana:f torre:f fonte:f valle:f foce:f stazione:f sorgente:f moto:fi bevande:fp/bevanda combustibili:mp/combustibile
dispensa:f cibo:m pacchi:mp/pacco bidone:m furgone:m camion:mi problema:m/problemi sistema:m/sistemi programma:m/programmi
cinema:mi clima:m/climi panorama:m/panorami città:fi caffettiera:f lotteria:f vendita:f raccolta:f caccia:f corsa:f fila:f gara:f
laboratorio:m/laboratori festa:f cena:f pranzo:m tesoro:m regalo:m prestito:m soldi:mp/soldo lire:fp/lira debito:m favore:m
`;
  // le cose di massa: senza numero si dicono col partitivo («del pane», «dell'olio»): la lista di commedia.js §6 più le teste dei cataloghi
  const MASSA = `pane verdura frutta carne pesce birra grappa whisky aranciata olio sale zucchero caffè caffe tè te lievito strutto carbonella
sughero colla corda latte miele ricotta mortadella polenta marmellata burro aceto orzo vodka roba refurtiva tabacco baccalà baccala piombo
lana salsiccia salame acqua alcol detersivo candeggina disinfettante dentifricio shampoo silicone succo legna liquore pepe sapone polpo
gelato vino cemento sabbia ghiaia malta catrame benzina gasolio petrolio farina pasta riso stoffa cibo scatolame merce vernice rame
lubrificante iodio morfina cioccolato`;

  // ============ LE COSE DI CASA (casa.js:94-113): il nome con l'articolo e la roba delle tasche che diventano ============
  // una copia dichiarata: casa.js non le espone (NOMI, F2G sono nella chiusura). Roba le legge da qui; quando casa.js sarà un
  // adattatore (passo 9) le leggerà lui da Roba
  const MOBILI = {
    chair: 'la sedia', chairCushion: 'la sedia', ia_poltrona: 'la poltrona', ia_poltrona_design: 'la poltrona', loungeChair: 'la poltrona',
    ia_sgabello: 'lo sgabello', ia_pouf: 'il pouf', ia_sedia_design: 'la sedia', chairDesk: 'la sedia', ia_tv: 'la televisione',
    televisionVintage: 'la televisione', ia_lampada_piede: 'la lampada', ia_lampada_arco: 'la lampada', lampRoundFloor: 'la lampada',
    ia_abatjour: "l'abat-jour", ia_lampada_tavolo: 'la lampada', ia_radiolina: 'la radiolina', radio: 'la radio', ia_quadro: 'il quadro',
    ia_quadro_grande: 'il quadro', ia_sveglia: 'la sveglia', ia_portagioie: 'il portagioie', ia_macchina_foto: 'la macchina fotografica',
    ia_orologio: "l'orologio", ia_telefono: 'il telefono', ia_binocolo: 'il binocolo', ia_profumo: 'il profumo', ia_dischi_vinile: 'i dischi',
    ia_macchina_scrivere: 'la macchina da scrivere', ia_candela: 'la candela', ia_altarino: "l'altarino", ia_bandiera_muro: 'la bandiera',
    ia_tappeto_muro: 'il tappeto', ia_giornali: 'i giornali', cardboardBoxClosed: 'lo scatolone', ia_stencil: 'lo stencil',
    ia_volantini: 'i volantini', pottedPlant: 'la pianta', plantSmall1: 'la piantina', ia_pianta_grande: 'la pianta', ia_pianta_alta: 'la pianta',
    ia_vaso_fiori: 'i fiori', ia_cartacce: 'le cartacce', ia_bottiglie: 'le bottiglie', ia_macchia: 'la macchia', ia_birre: 'le birre',
    ia_posacenere: 'il posacenere',
  };
  const MOBILE2ROBA = { chair: 'sedia', ia_lampada_piede: 'lampada', ia_lampada_arco: 'lampada', lampRoundFloor: 'lampada', ia_abatjour: 'lampada',
    ia_lampada_tavolo: 'lampada', ia_radiolina: 'radiolina', ia_dischi_vinile: 'dischi', ia_candela: 'candele', ia_sveglia: 'sveglia',
    ia_telefono: 'telefono', ia_moka: 'moka', ia_orologio: 'orologio', ia_quadro: 'quadro', ia_quadro_grande: 'quadro', ia_portagioie: 'gioielli',
    ia_macchina_foto: 'fotocamera', ia_macchina_scrivere: 'macchina_scrivere', ia_binocolo: 'binocolo', ia_profumo: 'profumo',
    ia_audiocassette: 'cassetta', ia_bici: 'bicicletta', ia_bottiglia_vino: 'vino', ia_grappa: 'grappa', ia_whisky: 'whisky', ia_torcia: 'torcia',
    radio: 'radio_rotta', ia_poster_film: 'poster' };
  // le categorie della Risacca che non sono una cosa di Oggetti.CAT, e la cosa che le fa (azioni.js:1083 RIS2ITEM, più le ovvie)
  const RIS2ROBA = { attrezzi: 'piede', vernice: 'bomboletta', gesso: 'gesso', telefono: 'telefono', fotocamera: 'fotocamera', viveri: 'razione',
    materiali: 'assi', radio: 'radiolina' };

  // ============ LE PROPRIETÀ: un vocabolario chiuso di 24 parole (STRUMENTI_NPC §2.1), per i ruoli dei verbi ============
  const PROP = ['rigido', 'pesante', 'lungo', 'appuntito', 'contenitore', 'legno', 'metallo', 'stoffa', 'commestibile', 'infiammabile',
    'liquido', 'fragile', 'elettrico', 'carta', 'attrezzo', 'arma', 'illegale', 'prezioso', 'medicina', 'vestito', 'mobile', 'piccolo',
    'importato', 'postazione'];
  // le regole: [proprietà, regex sul nome, categorie di Oggetti.CAT]
  const PROP_RE = [
    ['appuntito', /coltell|ago\b|forbici|chiod|punte|piccone|ascia|falce|lima|scalpell|cacciavit|taglierino|siringh|triboli|grimaldell|seghett|sega\b/],
    ['lungo', /canna|tubi?\b|tondino|barre|trave|pala\b|zappa|mazza|corda|cavo|catena|filo|asse|piede di porco|lupara|mitra|moschetto|antenna/],
    ['contenitore', /sacc|scatol|barattol|bottigli|tanic|latta|secchi|cass[ae]\b|cassetta|zaino|borsa|pentol|gavetta|flacone|thermos|bombola/],
    ['legno', /legn|assi\b|trave|tronco|compensato|pallet|sughero|cassa di legno|sedia|tavolo|scaffale|branda|mobile/],
    ['metallo', /ferro|lamier|chiodi|viti\b|bulloni|catena|lucchetto|tubi|rame|acciaio|stagno|martello|pinze|tronchesi|chiave|grata|piombo|monete|anello|posate|moschettoni|molle/],
    ['stoffa', /stoffa|panno|lana|coperta|lenzuol|telo|stracci|vestiti|maglione|cappotto|divisa|sciarpa|tuta|giacca|calze|tenda|iuta|guanti|berretto|passamontagna/],
    ['liquido', /acqua|vino|birra|grappa|whisky|olio|latte|benzina|gasolio|petrolio|alcol|vodka|liquore|succo|aranciata|aceto|candeggina|detersivo|inchiostro|vernice|sciroppo|tintura|catrame|disinfettante/],
    ['fragile', /vetro|bottiglia|lampadin|valvole|radio|televisore|plexiglas|anfora|fiale|dischi|specchietto|uova|fossile/],
    ['elettrico', /elettric|radio|batteri|pile|lampadin|cavo|interruttor|transistor|altoparlante|ricetrasmittente|disturbatore|registratore|microfono|tester|dinamo|telefono|cellulare|televisore|stufetta|timer|walkie|cuffie|motorino/],
    ['carta', /carta|giornale|volantini|manifesti|libretti|buste|quaderno|risma|moduli|fascicolo|mappa|piantina|rivista|tessera|lasciapassare|cartoncino|cartone|francobolli|matrici|foto/],
    ['vestito', /vestiti|maglione|cappotto|scarponi|divisa|sciarpa|tuta|giacca|calze|stivali|berretto|impermeabile|jeans|giubbotto|guanti|passamontagna|elmetto|maschera/],
    ['prezioso', /oro|argento|gioielli|orologio|anfora|monete|medaglia|fossile|francobolli da collezione|dollari|profumo/],
    ['medicina', /antibiotici|garze|bende|cerotti|disinfettante|siringhe|aspirine|morfina|pronto soccorso|sciroppo|vitamine|iodio|laccio|stecca per|termometro|sonniferi/],
  ];
  const PROP_CAT = { cibo: ['commestibile'], bevande: ['commestibile', 'liquido'], dispensa: ['commestibile'], combustibili: ['infiammabile'],
    attrezzi: ['attrezzo'], ferramenta: ['metallo'], elettrico: ['elettrico'], stampa: ['carta'], armi: ['arma'], arredi: ['mobile', 'pesante'],
    medicina: ['medicina'], vestiti: ['vestito'], valori: ['prezioso'] };

  Object.assign(UnicoCatalogo, { TESTE, MASSA, MOBILI, MOBILE2ROBA, RIS2ROBA, PROP, PROP_RE, PROP_CAT });
  return UnicoCatalogo;
})();
if (typeof window !== 'undefined') window.UnicoCatalogo = UnicoCatalogo;
