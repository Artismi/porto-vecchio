const payload = {
  kind: 'dialogo',
  npc: {
    id: 'lupo',
    name: 'Ettore Ganz',
    ruolo: 'bibliotecario, ex partigiano',
    personalita: { cor: 0.9, loq: 0.7 },
    interessi: ['i libri', 'la politica'],
    lavoro: 'bibliotecario',
    bisogni: { rabbia: 0.2, paura: 0.1 },
    ultimi_ricordi: ["ha visto qualcuno leggere un volantino della Risacca"]
  },
  context: 'Sera, biblioteca civica. Repressione moderata. Porto Vecchio 1986.',
  text: "Lupo, c'e' modo di fare qualcosa per la gente?"
};

fetch('http://localhost:8642/api/mente', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
})
.then(r => r.json())
.then(r => {
  console.log('SOURCE:', r.source);
  if (r.data) {
    console.log('\nRISPOSTA:', r.data.risposta);
    console.log('UMORE:   ', r.data.umore);
    console.log('MEMORIA: ', r.data.memoria);
  } else {
    console.log('(nessuna risposta IA — fallback attivo)');
  }
})
.catch(e => console.error('ERRORE:', e.message));
