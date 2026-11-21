# Ricerca · codice: pulire una codebase cresciuta per strati senza romperla

## 1. Progetto di ricerca

**Domanda.** Come si toglie peso e ripetizione da una codebase JavaScript grande (circa 130.000 righe, script classici senza
bundler, una pagina sola) cresciuta per interventi successivi con interruttori nell'indirizzo, in modo **conservativo e incrementale**:
niente regressioni nel gioco di serie, ogni passo verificabile e reversibile?

**Temi e cosa voglio sapere da ognuno**

1. *Refactoring sicuro di codice legacy*: le regole di chi lo fa per mestiere (Fowler, Feathers): passi piccoli, cosa fare prima di toccare,
   come riconoscere un passo «a comportamento invariato».
2. *Test di caratterizzazione* (golden master, snapshot): come fissare il comportamento attuale quando le prove esistenti non bastano o
   sono lente; come usarli per dimostrare che una rimozione non cambia niente.
3. *Feature flag e «flag debt»*: tipi di interruttore (rilascio, esperimento, operativi, permessi), la loro vita, la scadenza, come si
   ritirano in sicurezza (ordine dei passi, chi decide), quali tenere per sempre.
4. *Codice morto in JS senza bundler*: strumenti (copertura V8/Chrome, knip, ts-prune, eslint no-unused-vars, analisi AST) e i loro
   limiti con script globali, accessi dinamici (`obj[nome]`, stringhe) e codice che si raggiunge solo da interruttori.
5. *Repository con asset pesanti*: Git LFS, allegati di release, `git filter-repo`, cloni parziali e superficiali, archiviare invece di
   cancellare; costi e rischi di riscrivere la storia.
6. *Minificazione sicura*: terser/esbuild sugli script classici (nomi globali, `Function.toString`, `eval`), source map, come verificare
   che il minificato si comporti come l'originale.
7. *Eccezioni silenziate*: perché i `catch` vuoti sono un rischio, e come registrarle senza cambiare il comportamento (una volta sola,
   con un limite).

**Metodo.** Ricerche con termini generici (mai dati del progetto), fonti autorevoli: autori di riferimento, documentazione ufficiale
(git, GitHub, MDN, V8, terser), articoli di chi gestisce sistemi di interruttori in produzione. Per ogni tema: cosa dice la fonte, cosa
vale qui, cosa cambia nel piano (§3).

**Criterio di successo.** Un piano dove ogni passo ha: una prova che il comportamento di serie non cambia, un modo per tornare indietro,
un confine chiaro con il lavoro degli altri esperti.

## 2. Cosa ho imparato (fonti)

**Refactoring: passi piccoli, il comportamento non si tocca.** Fowler definisce il refactoring come un cambio della struttura interna
che rende il codice più facile da capire e da cambiare *senza cambiarne il comportamento osservabile*, fatto con una serie di piccole
trasformazioni ognuna delle quali conserva il comportamento; non è riscrivere, non è correggere difetti
([refactoring.com](https://refactoring.com/), [Refactoring, il libro](https://www.martinfowler.com/books/refactoring.html)).
Qui vuol dire: un commit per trasformazione, e mai insieme «tolgo un ramo» e «cambio come funziona».

**Prove di caratterizzazione (golden master).** Feathers chiama così le prove che fissano quello che il codice *fa adesso* (non quello
che dovrebbe fare), per accorgersi di cambi non voluti; il golden master registra un'uscita di riferimento e confronta le corse dopo,
mascherando le parti non deterministiche ([Characterization test](https://en.wikipedia.org/wiki/Characterization_test),
[Rainsberger, golden master e campionamento](https://blog.thecodewhisperer.com/permalink/surviving-legacy-code-with-golden-master-and-sampling),
[approval, snapshot, characterization](https://dev.to/nicoespeon/what-s-the-difference-between-regression-tests-characterization-tests-and-approval-tests-2jf3)).
Qui la lezione è doppia: (1) prima di togliere, annotare l'esito di oggi delle prove (anche quelle che falliscono: test_writing ha un NO
che c'era già, e deve restare lo stesso NO); (2) per il codice irraggiungibile c'è una prova più forte di una foto: il **golden master
del codice stesso**. Se tolgo solo ciò che non si può raggiungere, un compilatore che elimina il codice morto deve dare lo stesso
risultato prima e dopo. L'ho usato (terser, sotto).

**Feature flag e «flag debt».** Fowler/Hodgson distinguono interruttori di rilascio (transitori, «una settimana o due»), di esperimento,
operativi (alcuni restano come *kill switch*) e di permesso (anni); gli interruttori sono «inventario con un costo di mantenimento»: chi
li gestisce bene mette la loro rimozione nel lavoro da fare quando li crea, dà una scadenza, usa «bombe a tempo» (una prova che fallisce
quando l'interruttore scade), o un limite al numero di interruttori vivi; e tiene la decisione in un solo posto (un `FeatureDecisions`,
un *toggle router*) invece che sparsa nei punti dove si usa; si provano la configurazione di produzione e quella di ripiego, non tutte le
combinazioni ([Feature Toggles, martinfowler.com](https://martinfowler.com/articles/feature-toggles.html)). Uber, con 2000 interruttori
tolti, lo fa con uno strumento (Piranha) che lavora sull'albero sintattico: dato il nome dell'interruttore e il valore che ha preso, piega
le espressioni e toglie il codice che diventa morto, e il diff va all'autore dell'interruttore che decide
([Piranha, Uber Engineering](https://www.uber.com/blog/piranha/)). È esattamente la forma giusta qui: ho scritto un piccolo Piranha
(`piega.js`: `FLAG ? a : b → a`, `FLAG && x → x`, `if (!FLAG) … → niente`), seguito da una pulizia delle istruzioni rimaste
irraggiungibili e da una ricerca delle funzioni rimaste orfane.

**Codice morto senza bundler.** Gli strumenti noti (knip, ts-prune) ragionano su moduli ES/CommonJS e sbagliano con gli import dinamici
e con quello che il programma raggiunge solo a runtime ([knip, gestire i risultati](https://knip.dev/guides/handling-issues),
[knip](https://github.com/webpro/knip)); la copertura di Chrome dice cosa è girato in *una* sessione, quindi segna come inutilizzato anche
il codice dietro un'interazione non fatta ([Coverage, Chrome DevTools](https://developer.chrome.com/docs/devtools/coverage)). Con script
classici e 996 accessi `typeof X` nessuno dei due basta da solo. La via sicura qui è: nome dichiarato → zero riferimenti in **tutto**
(gioco, prove, strumenti, pagine dello Studio), più la prova del compilatore. La copertura resta utile per *trovare* candidati, non per
decidere.

**Eccezioni silenziate.** La regola `no-empty` di ESLint segnala i blocchi vuoti ma accetta un `catch` con un commento, e c'è l'opzione
per accettare i `catch` vuoti: il punto non è vietarli, è che un errore inghiottito senza traccia sparisce
([no-empty, ESLint](https://eslint.org/docs/rules/no-empty)). Da qui il registro: il `catch` resta, l'errore si annota una volta.

**Minificazione.** terser per difetto non tocca i nomi globali (`toplevel` è spento: rinominarli e togliere quelli inutilizzati è
un'opzione esplicita), e `keep_fnames` esiste per il codice che legge `Function.prototype.name`
([terser, API](https://terser.org/docs/api-reference/)). Con 169 globali condivisi fra script e accessi `typeof X`, una minificazione
sicura qui è *senza* `toplevel`; e va verificata come il resto (stessa scena con `sonda_uguale`), quindi è un passo B.

**Repository con file pesanti.** GitHub blocca i file oltre 100 MiB e consiglia LFS o le *release* per distribuire binari grandi (2 GiB
per file allegato, nessun tetto al totale) ([file grandi su GitHub](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github),
[Git LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage)). Riscrivere la
storia si fa con `git filter-repo` (la documentazione di git sconsiglia `filter-branch`), ma cambia tutti gli hash e tocca ogni clone:
si fa su un clone a specchio da buttare se va male ([git-filter-repo](https://github.com/newren/git-filter-repo),
[manuale](https://man.archlinux.org/man/git-filter-repo.1.en)). Per chi deve solo *leggere* un repository pesante c'è il clone parziale
`--filter=blob:none`, che scarica i contenuti solo quando servono ([partial clone e shallow clone, GitHub](https://github.blog/open-source/git/get-up-to-speed-with-partial-clone-and-shallow-clone/)).
Conclusione per chi chiede «conservativo»: **archiviare** (release o repository-archivio, la storia resta) è reversibile; filter-repo no.

## 3. Come cambia il piano

1. **La prova di ogni rimozione è il compilatore.** Per ogni ramo «com'era» tolto: il file di prima, con il test dell'indirizzo
   sostituito da `false`, e il file di dopo, compressi da terser con propagazione delle costanti ed eliminazione del codice morto
   (`inline`, `sequences` spenti per non avere rumore), devono dare lo stesso testo. Per le funzioni mai chiamate basta l'eliminazione
   del codice morto. Più le prove node pertinenti, una alla volta, confrontate con il loro esito di prima.
2. **Lo strumento, non la mano.** Il ramo si piega con `piega.js` (alla Piranha), poi `pulisci.js` toglie le istruzioni rimaste dopo un
   `return`, poi `orfane.js` trova le funzioni che servivano solo al ramo vecchio. La mano solo per i commenti.
3. **Un interruttore alla volta, tutto intero.** Mai mezzo interruttore (in un file sì e in un altro no): `?nofixgraffiti2` stava in
   cinque file e si toglie in un commit solo.
4. **Gli interruttori che restano**: un elenco unico con tipo (rilascio / operativo / prova) e scadenza, e una prova che fallisce quando
   un interruttore di rilascio scade (la «bomba a tempo»). Quelli usati dagli strumenti (`?vecchiacosta` in `riva_foto.js`,
   `?nofixavvio` in `sonda_avvio_camera.js`, `?nofixsuolo2` nelle sonde del suolo) sono strumenti di misura: restano finché la sonda li usa.
5. **Gli errori si annotano, non si inghiottono**: `src/errori.js`, una riga per posto.
6. **Il repository si archivia, non si riscrive**: release o repository-archivio per `_immagini`, `reports`, `v2`…`v6` e i backup;
   `filter-repo` solo con il consenso esplicito del committente, su uno specchio, dopo aver avvisato chi ha un clone.
7. **La minificazione resta un passo B**, senza `toplevel`, verificata con `sonda_uguale`.
