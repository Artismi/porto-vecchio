# Protocollo per i filoni paralleli (vale per ogni agente)

1. **Letture mirate**: trova le righe con grep e leggi solo gli intervalli che tocchi; mai file interi (render.js ha 12.700 righe).
2. **Le prove in Node sono il controllo principale** (`v7/src/test_*.js`, gli strumenti `check`). **Un solo giro di foto, alla fine**, a 1280×800,
   solo sulle 3-4 inquadrature decisive del filone. Niente giri intermedi.
3. **Commit parziali**: appena una parte funziona, commit (messaggio in italiano, chiuso con
   `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` e `Claude-Session: https://claude.ai/code/session_01AvWGu6hCyMCPSCUAsGk37W`).
   Niente push, niente PR.
4. **Qualità invariata**: attenzione al dettaglio, parti collegate, composizione (una pagina, un dominante), ogni foto da fotogramma di film.
5. **Rapporto finale asciutto**: ramo e commit, cosa è cambiato e dove, esito delle prove, percorsi assoluti delle foto, cosa resta. Nessun riassunto intermedio.
6. Lavora solo nel tuo worktree e nei file che possiedi; non toccare il repo principale.
