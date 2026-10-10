# HANDOFF — Interni, negozi, servizi, roba da prendere (10 ottobre 2026)

Righe segnate `[planimetrie]`, `[design]`, `[disgelo]`, `[negozi]`.

## Planimetrie (interiors.js)
- Le stanze si tagliano al metro (`splitFloor`, in metri), non più a caselle di 2 m: bagni, ripostigli e ingressi stretti come quelli veri.
- Nelle case grandi c'è il corridoio d'ingresso largo 2 m. Le stanze ci si aprono sopra (`hallDoors`), e nessuna resta chiusa: si apre una porta verso una stanza raggiunta.
- Le stanze in più hanno nomi veri (`HOME_MORE`): lavanderia, stanza degli ospiti, sala da pranzo.
- Interni più grandi (`growOf`).
- Nelle botteghe la sala vendita è la stanza più grande (`MAINBIG`).

## Arredo
- Composizioni (`V`): `salotto_design`, `salotto_compatto`, `salotto_isola`, `pranzo_design`, `letto_design`, `letto1_design`, `letto_patch`, `studio_design`, `lettura_design`, `cucina_design`.
- Regole: i mobili alti negli angoli e mai davanti alle finestre; letti e divani al centro del muro; al massimo due piante per stanza (`CAP`).
- I pensili e gli specchi si vedono solo contro i muri alti (`o.ws`, `o.wp`; `userData.upper` in interni_arte.js).

## Il tono (interni_arte.js)
- **Ambiente**: spento e freddo. I materiali sono sfumati (`TM`: gradiente e dettaglio al centro) e ogni pezzo ha la sua sfumatura (`nu`).
- **Consumo**: pastello lucido (`POP`, `G`): cucine in formica, frigoriferi, tostapane, frullatori, ventilatori, televisori colorati.
- **Governo e pubblicità**: sgargianti e zuccherosi (`T.arte`: tramonto kitsch, famiglia felice, auto a rate). Restano le foto vere color seppia e il porto sotto la neve.
- **Controcultura e autoprodotto**: belli davvero. Poster wildstyle (`T.graffito`), trapunta patchwork, mobile dipinto, lampada dal casco da minatore, casse nelle cassette della frutta, mensola di skate, boombox, skate, serra idroponica.

## Roba da prendere
- Circa 4.650 oggetti sopra i mobili (`dress`, `DRESS`), raccolti in mucchietti.
- 32 oggetti piccoli nuovi (`LOOTSMALL`) con il bottino in `LOOTX`.
- Presi tutti, spariscono (`PICK`, in oggetti.js `pickGone`).
- **Clic diretto** (bottino.js): la roba sui mobili si punta all'altezza del piano e si prende senza aprire la scheda. Nino fa il gesto (`prende`, `raccoglie` in anim_vita.js, via `p.__grab`) e il modello sparisce (`InterniArte.hide`).

## Negozi (interni_arte.js `vetrine`)
- Entrando, scaffali, banchi e vetrine della sala vendita mostrano la merce vera (`Oggetti.counter`).
- Ogni merce ha una forma per famiglia ed è ripetuta quanto ce n'è (fino a sei), col cartellino del prezzo in lire.
- Una merce finita lascia il cartellino rosso «finito».
- All'Emporio le confezioni sono pastello con la stellina imperiale.
- Si aggiorna rientrando.
- Davanti agli scaffali c'è il posto `scaffale`: i clienti ci si fermano a guardare (popolo.js, posa `osserva`).
- Quando compri, il commesso ti porge la merce (`__serve`, posa `porge`).

## Servizi (attivita.js `SERV`)
- Barbiere, lavanderia, sauna della banja, ambulatorio, sartoria, tipografia (volantini sottobanco), videoteca (noleggio), caffè corretto al bar, birra scura in birreria.
- Ognuno ha prezzo, tempo che passa ed effetto sui bisogni (igiene, svago, sonno, compagnia, salute, ubriachezza). Serve il commesso.
- Nino ha la posa giusta (`BY_LABEL` in anim_vita.js).

## Prove
- `node test_oggetti.js 1 1`: tutto a posto.
- Tutti i piani di tutti gli edifici sono raggiungibili.
- Screenshot di case, Wu, Emporio e Ferramenta senza errori in pagina.
- `test_vita` e `test_azioni` non sono verificati: superano i 200 s anche sul codice di partenza.

## Da fare
- Gli scaffali Kenney (`bookcaseOpen`) espongono la merce solo se sono bassi: i piani di quelli alti non sono misurati.
- Le vetrine si rifanno solo rientrando nel negozio.
