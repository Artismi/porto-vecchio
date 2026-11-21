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
