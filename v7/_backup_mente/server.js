// Porto Vecchio — Server Locale & Proxy IA per la Mente degli NPC
// Esecuzione: node server.js
// Non richiede npm né dipendenze esterne (funziona con le API native di Node 18+)

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8642;
const ROOT = __dirname;
const CONFIG_FILE = path.join(ROOT, 'api_key.json');

// Mime types per i file statici del gioco
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.css': 'text/css',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.txt': 'text/plain; charset=utf-8'
};

// Carica configurazione API (Gemini, Groq, OpenRouter o Claude)
function loadConfig() {
  const def = {
    provider: 'gemini', // 'gemini' | 'groq' | 'openrouter' | 'anthropic' | 'none'
    apiKey: process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    model: 'gemini-2.0-flash' // oppure 'llama-3.1-8b-instant', 'anthropic/claude-3-haiku'
  };
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return Object.assign(def, saved);
    } catch (e) {
      console.warn('[Server] api_key.json non valido, uso default.');
    }
  } else {
    // Crea file di esempio se non esiste
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(def, null, 2));
  }
  return def;
}

// Chiamata all'API del fornitore scelto
async function callLLM(cfg, systemPrompt, userMessage) {
  if (!cfg.apiKey || cfg.provider === 'none') {
    return null; // Fallback al motore interno
  }

  try {
    if (cfg.provider === 'gemini') {
      const model = cfg.model || 'gemini-2.0-flash';
      const isOldKey = cfg.apiKey.startsWith('AIza');
      // Chiavi AIzaSy → parametro ?key= sull'endpoint classico
      // Chiavi AQ... → Authorization: Bearer sull'endpoint classico  
      const url = isOldKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.apiKey}`
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const headers = { 'Content-Type': 'application/json' };
      if (isOldKey) {
        // niente header extra, la chiave è nell'URL
      } else {
        headers['Authorization'] = `Bearer ${cfg.apiKey}`;
      }
      const payload = {
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 500
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('[Gemini Error]', res.status, err.slice(0, 400));
        return null;
      }
      const data = await res.json();
      const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return txt ? JSON.parse(txt) : null;
    }

    if (cfg.provider === 'groq' || cfg.provider === 'openrouter') {
      const ep = cfg.provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';
      const model = cfg.model || (cfg.provider === 'groq' ? 'llama-3.1-8b-instant' : 'google/gemini-2.0-flash-exp:free');
      const payload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500
      };

      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.apiKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.error(`[${cfg.provider} Error]`, res.status, await res.text());
        return null;
      }
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content;
      return txt ? JSON.parse(txt) : null;
    }
  } catch (err) {
    console.error('[callLLM Error]', err.message);
    return null;
  }

  return null;
}

// System prompt fondante del mondo di Porto Vecchio (1986)
function buildSystemPrompt(kind) {
  return `Sei il motore mentale degli abitanti di Porto Vecchio, anno 1986, isola del Mar Tirreno.
Ambientazione: architettura ligure, caruggi, ardesia, salsedine, pastelli, neon rosa e ambra, barche da pesca e contrabbando.
Epoca: 1986. NON esistono telefoni cellulari, internet, smartphone o computer moderni.
Tono: asciutto, realistico, dialettale/popolare ma comprensibile, frasi corte e taglienti.
Regola suprema: non inventare oggetti o luoghi non menzionati nel contesto. La simulazione governa la realtà, tu dai solo voce e pensieri.
Rispondi RIGOROSAMENTE ed ESCLUSIVAMENTE in formato JSON valido.`;
}

// Router API
async function handleApiMente(req, res) {
  let bodyStr = '';
  req.on('data', chunk => { bodyStr += chunk; });
  req.on('end', async () => {
    try {
      const body = JSON.parse(bodyStr || '{}');
      const cfg = loadConfig();
      const kind = body.kind || 'dialogo'; // 'dialogo' | 'riflessione' | 'chiacchiera'

      if (kind === 'dialogo') {
        const sys = buildSystemPrompt('dialogo') + `
Compito: rispondi al giocatore per conto del personaggio.
Devi restituire un oggetto JSON con:
{
  "risposta": "Battuta diretta del personaggio (1-2 frasi asciutte)",
  "umore": "cordiale|sospettoso|stanco|ironico|spaventato|aggressivo",
  "azioni": [],
  "memoria": "Cosa ricorderà l'NPC di questo scambio (massimo 1 riga)"
}`;
        const usr = `Personaggio:\n${JSON.stringify(body.npc || {})}\n\nContesto:\n${body.context || ''}\n\nIl giocatore dice: «${body.text || ''}»`;
        console.log(`[Mente Proxy] Richiesto dialogo con: ${body.npc?.name}`);
        const aiResp = await callLLM(cfg, sys, usr);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, source: aiResp ? 'ai' : 'fallback', data: aiResp }));
        return;
      }

      if (kind === 'riflessione') {
        const sys = buildSystemPrompt('riflessione') + `
Compito: è notte fonda. Il personaggio ripensa alla sua giornata, ai bisogni e alle notizie ricevute.
Restituisci un JSON con:
{
  "pensiero": "Una breve riflessione o intenzione per domani (massimo 15 parole)",
  "rabbia_diff": 0, // da -0.1 a +0.1
  "paura_diff": 0   // da -0.1 a +0.1
}`;
        const usr = `Scheda e ricordi:\n${JSON.stringify(body.prompt || {})}`;
        console.log(`[Mente Proxy] Richiesta riflessione notturna per l'NPC ID: ${body.npcId}`);
        const aiResp = await callLLM(cfg, sys, usr);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, source: aiResp ? 'ai' : 'fallback', data: aiResp }));
        return;
      }

      if (kind === 'chiacchiera') {
        const sys = buildSystemPrompt('chiacchiera') + `
Compito: due abitanti si incrociano o sono vicini al bar/molo e scambiano due battute al volo.
Restituisci un JSON con:
{
  "battutaA": "Cosa dice il primo (max 10 parole)",
  "battutaB": "Cosa risponde il secondo (max 10 parole)",
  "argomento": "pesca|prezzi|guardia|lavoro|pettegolezzo"
}`;
        const usr = `NPC 1: ${JSON.stringify(body.npcA || {})}\nNPC 2: ${JSON.stringify(body.npcB || {})}\nContesto: ${body.context || ''}`;
        const aiResp = await callLLM(cfg, sys, usr);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, source: aiResp ? 'ai' : 'fallback', data: aiResp }));
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Kind sconosciuto' }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });
}

// Server HTTP
const server = http.createServer((req, res) => {
  // CORS per sviluppo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Endpoint API Mente
  if (pathname === '/api/mente' && req.method === 'POST') {
    handleApiMente(req, res);
    return;
  }

  // Info stato server
  if (pathname === '/api/status') {
    const cfg = loadConfig();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, provider: cfg.provider, active: !!cfg.apiKey, model: cfg.model }));
    return;
  }

  // Servizio File Statici
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT, pathname);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Accesso negato');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Non Trovato');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`Porto Vecchio Server attivo su http://localhost:${PORT}`);
  console.log(`Proxy IA Mente pronto su http://localhost:${PORT}/api/mente`);
  console.log(`Configurazione API: ${CONFIG_FILE}`);
  console.log(`=================================================\n`);
});
