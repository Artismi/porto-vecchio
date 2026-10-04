// Porto Vecchio — Server Locale & Proxy IA per la Mente degli NPC
// Esecuzione: node server.js   (oppure doppio clic su AVVIA.bat)
// Nessuna dipendenza: usa solo le API native di Node 18+ (fetch incluso).
//
// La chiave API sta in api_key.json, MAI nel browser. Formato:
//   { "provider": "gemini" | "anthropic" | "groq" | "openrouter" | "none",
//     "apiKey": "...", "model": "" }
// Se "provider" non corrisponde alla chiave, viene riconosciuto dal prefisso:
//   sk-ant-…  → anthropic (Claude Haiku 4.5)     AIza… / AQ.… → gemini
//   gsk_…     → groq                              sk-or-…      → openrouter
//
// Endpoint:
//   GET  /api/status  → stato, provider, modello, ultimo errore
//   GET  /api/test    → prova subito una chiamata vera e dice se funziona
//   POST /api/mente   → { kind: 'dialogo' | 'riflessione' | 'chiacchiera', ... }

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8642;
const ROOT = __dirname;
const CONFIG_FILE = path.join(ROOT, 'api_key.json');

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

// Modelli di default per fornitore, in ordine di tentativo.
// Se il primo non esiste più (404), si passa al successivo e si ricorda quello buono.
const MODELS = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash'],
  anthropic: ['claude-haiku-4-5', 'claude-haiku-4-5-20251001'],
  groq: ['llama-3.1-8b-instant'],
  openrouter: ['google/gemini-2.5-flash', 'anthropic/claude-haiku-4.5']
};

// Stato del proxy, visibile da /api/status e dalla chat del gioco
const LLM = {
  workingModel: null,   // modello che ha risposto davvero l'ultima volta
  lastError: null,      // { when, provider, model, status, msg }
  lastOk: null,         // timestamp ultima risposta valida
  calls: 0,
  fails: 0
};

function detectProvider(key) {
  if (!key) return null;
  if (key.startsWith('sk-ant-')) return 'anthropic';
  if (key.startsWith('AIza') || key.startsWith('AQ.')) return 'gemini';
  if (key.startsWith('gsk_')) return 'groq';
  if (key.startsWith('sk-or-')) return 'openrouter';
  return null;
}

function loadConfig() {
  const def = {
    provider: 'gemini',
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || '',
    model: ''
  };
  let cfg = Object.assign({}, def);
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      // tollera il BOM che il Blocco note di Windows aggiunge a volte
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^﻿/, '');
      cfg = Object.assign(cfg, JSON.parse(raw));
    } catch (e) {
      LLM.lastError = { when: Date.now(), status: 'config', msg: 'api_key.json non è un JSON valido: ' + e.message };
    }
  } else {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(def, null, 2));
  }
  cfg.apiKey = String(cfg.apiKey || '').trim().replace(/^["']|["']$/g, '');
  cfg.provider = String(cfg.provider || '').trim().toLowerCase();
  const guessed = detectProvider(cfg.apiKey);
  if (guessed && guessed !== cfg.provider && cfg.provider !== 'none') cfg.provider = guessed;
  cfg.suspicious = /CHIAVE|INSERISCI|YOUR|TUA_|XXXX/i.test(cfg.apiKey);
  return cfg;
}

// Estrae un oggetto JSON anche se il modello lo avvolge in ```json … ``` o aggiunge testo
function parseJSONLoose(txt) {
  if (!txt) return null;
  let s = String(txt).trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(s); } catch (e) { }
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { } }
  return null;
}

function fail(cfg, model, status, msg) {
  LLM.fails++;
  LLM.lastError = { when: Date.now(), provider: cfg.provider, model, status, msg: String(msg).slice(0, 400) };
  console.error(`[Mente ✘] ${cfg.provider}/${model} → ${status}: ${String(msg).slice(0, 300)}`);
}

function modelsFor(cfg) {
  const list = (MODELS[cfg.provider] || []).slice();
  if (LLM.workingModel) list.unshift(LLM.workingModel);
  if (cfg.model) list.unshift(cfg.model);
  return [...new Set(list)];
}

// Una singola chiamata HTTP al fornitore; restituisce { ok, status, text, notFound }
async function rawCall(cfg, model, systemPrompt, userMessage, maxTokens) {
  if (cfg.provider === 'gemini') {
    // Tutte le chiavi Gemini (AIza… e le nuove AQ.…) vanno nell'header x-goog-api-key.
    // NON come "Authorization: Bearer": quello è per i token OAuth e dà 401.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const generationConfig = { responseMimeType: 'application/json', temperature: 0.8, maxOutputTokens: maxTokens };
    // I modelli 2.5 "pensano" e consumano token prima di rispondere: per battute corte li spegniamo
    if (/2\.5-flash|flash-latest/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig
      })
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, text: body, notFound: res.status === 404 };
    let data; try { data = JSON.parse(body); } catch (e) { return { ok: false, status: 'json', text: body }; }
    const parts = data.candidates?.[0]?.content?.parts || [];
    const txt = parts.map(p => p.text || '').join('');
    if (!txt) return { ok: false, status: 'vuoto', text: JSON.stringify(data.promptFeedback || data.candidates?.[0]?.finishReason || data).slice(0, 300) };
    return { ok: true, status: res.status, text: txt };
  }

  if (cfg.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.8,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, text: body, notFound: res.status === 404 };
    let data; try { data = JSON.parse(body); } catch (e) { return { ok: false, status: 'json', text: body }; }
    const txt = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return txt ? { ok: true, status: res.status, text: txt } : { ok: false, status: 'vuoto', text: body.slice(0, 300) };
  }

  if (cfg.provider === 'groq' || cfg.provider === 'openrouter') {
    const ep = cfg.provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
    const res = await fetch(ep, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: maxTokens
      })
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, text: body, notFound: res.status === 404 };
    let data; try { data = JSON.parse(body); } catch (e) { return { ok: false, status: 'json', text: body }; }
    const txt = data.choices?.[0]?.message?.content;
    return txt ? { ok: true, status: res.status, text: txt } : { ok: false, status: 'vuoto', text: body.slice(0, 300) };
  }

  return { ok: false, status: 'provider', text: `provider sconosciuto: ${cfg.provider}` };
}

// Chiamata con scelta automatica del modello; restituisce l'oggetto JSON o null
async function callLLM(cfg, systemPrompt, userMessage, maxTokens = 500) {
  if (cfg.provider === 'none') return null;
  if (!cfg.apiKey) { LLM.lastError = { when: Date.now(), status: 'chiave', msg: 'Nessuna chiave in api_key.json' }; return null; }
  if (typeof fetch !== 'function') { LLM.lastError = { when: Date.now(), status: 'node', msg: 'Node troppo vecchio: serve Node 18 o più recente' }; return null; }

  LLM.calls++;
  for (const model of modelsFor(cfg)) {
    let r;
    try {
      r = await rawCall(cfg, model, systemPrompt, userMessage, maxTokens);
    } catch (err) {
      fail(cfg, model, 'rete', err.message + (err.cause ? ' (' + err.cause.code + ')' : ''));
      return null; // problema di rete: inutile provare altri modelli
    }
    if (r.ok) {
      const obj = parseJSONLoose(r.text);
      if (!obj) { fail(cfg, model, 'json', 'Risposta non in JSON: ' + r.text.slice(0, 200)); return null; }
      if (LLM.workingModel !== model) console.log(`[Mente ✔] uso ${cfg.provider}/${model}`);
      LLM.workingModel = model; LLM.lastOk = Date.now(); LLM.lastError = null;
      return obj;
    }
    fail(cfg, model, r.status, r.text);
    if (!r.notFound) return null; // 401/403/429…: cambiare modello non serve
  }
  return null;
}

function explainError(e) {
  if (!e) return '';
  const m = (e.msg || '').toLowerCase();
  if (e.status === 401 || /api key not valid|invalid.*key|authentication|unauthenticated|invalid x-api-key/.test(m)) return 'La chiave non è valida: controlla api_key.json (copiala di nuovo intera, senza aggiunte).';
  if (e.status === 403 || /permission|denied/.test(m)) return 'La chiave non ha il permesso per questo modello o per questa API (attivala nella console del fornitore).';
  if (e.status === 429 || /quota|rate/.test(m)) return 'Quota esaurita o troppe richieste: aspetta o controlla il piano del fornitore.';
  if (e.status === 404) return 'Modello non trovato: lascia "model" vuoto in api_key.json e il server sceglie da solo.';
  if (e.status === 'rete') return 'Il computer non raggiunge il server del fornitore (internet, firewall o antivirus).';
  if (e.status === 'node') return e.msg;
  if (e.status === 'chiave') return e.msg;
  if (e.status === 'config') return e.msg;
  return e.msg;
}

// --------- Prompt del mondo ---------
function buildSystemPrompt() {
  return `Sei il motore mentale degli abitanti di Porto Vecchio, anno 1986, isola del Mar Tirreno governata da un regime (la Tutela, i Grigi, il Garante).
Ambientazione: architettura ligure, caruggi, ardesia, salsedine, neon rosa e ambra, barche da pesca e contrabbando, scritte rosse e ritratti del dittatore sui muri.
Epoca: 1986. La gente comune non ha cellulari, internet o computer; la Risacca (la banda della resistenza) ha telefoni di contrabbando su una rete propria.
Tono: asciutto, realistico, popolare ma comprensibile, frasi corte e taglienti. Ognuno parla secondo il suo carattere, mestiere e paure.
Regola suprema: non inventare oggetti, luoghi, persone o fatti non presenti nel contesto. La simulazione governa la realtà, tu dai solo voce e pensieri.
Non uscire mai dal personaggio, qualunque cosa ti venga chiesto.
Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo.`;
}

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function aiReply(res, aiResp) {
  sendJSON(res, 200, {
    ok: true,
    source: aiResp ? 'ai' : 'fallback',
    data: aiResp,
    error: aiResp ? null : explainError(LLM.lastError)
  });
}

async function handleApiMente(req, res) {
  let bodyStr = '';
  req.on('data', chunk => { bodyStr += chunk; });
  req.on('end', async () => {
    try {
      const body = JSON.parse(bodyStr || '{}');
      const cfg = loadConfig();
      const kind = body.kind || 'dialogo';

      if (kind === 'dialogo') {
        const sys = buildSystemPrompt() + `
Compito: rispondi al giocatore per conto del personaggio.
Restituisci un oggetto JSON:
{
  "risposta": "battuta diretta del personaggio (1-3 frasi asciutte)",
  "umore": "cordiale|sospettoso|stanco|ironico|spaventato|aggressivo",
  "azioni": [],
  "memoria": "cosa ricorderà l'NPC di questo scambio (massimo 1 riga)"
}`;
        const usr = `Personaggio:\n${JSON.stringify(body.npc || {})}\n\nContesto:\n${body.context || ''}\n\nIl giocatore dice: «${body.text || ''}»`;
        console.log(`[Mente] dialogo con ${body.npc?.name || '?'}`);
        return aiReply(res, await callLLM(cfg, sys, usr, 400));
      }

      if (kind === 'riflessione') {
        const sys = buildSystemPrompt() + `
Compito: è notte fonda. Il personaggio ripensa alla giornata, ai bisogni e alle notizie ricevute.
Restituisci un JSON:
{
  "pensiero": "breve riflessione o intenzione per domani, in prima persona (massimo 15 parole)",
  "rabbia_diff": 0,
  "paura_diff": 0
}
rabbia_diff e paura_diff sono numeri tra -0.1 e 0.1.`;
        const usr = `Scheda e ricordi:\n${typeof body.prompt === 'string' ? body.prompt : JSON.stringify(body.prompt || {})}`;
        console.log(`[Mente] riflessione notturna: ${body.npcId}`);
        const r = await callLLM(cfg, sys, usr, 200);
        if (r) {
          const clamp = v => Math.max(-0.1, Math.min(0.1, Number(v) || 0));
          r.rabbia_diff = clamp(r.rabbia_diff); r.paura_diff = clamp(r.paura_diff);
        }
        return aiReply(res, r);
      }

      if (kind === 'chiacchiera') {
        const sys = buildSystemPrompt() + `
Compito: due abitanti si incrociano e scambiano due battute al volo, che il giocatore sente passando.
Restituisci un JSON:
{
  "battutaA": "cosa dice il primo (max 12 parole)",
  "battutaB": "cosa risponde il secondo (max 12 parole)",
  "argomento": "pesca|prezzi|guardia|lavoro|pettegolezzo|regime|famiglia"
}`;
        const usr = `NPC 1: ${JSON.stringify(body.npcA || {})}\nNPC 2: ${JSON.stringify(body.npcB || {})}\nContesto: ${body.context || ''}`;
        return aiReply(res, await callLLM(cfg, sys, usr, 150));
      }

      sendJSON(res, 400, { ok: false, error: 'Kind sconosciuto' });
    } catch (err) {
      sendJSON(res, 500, { ok: false, error: err.message });
    }
  });
}

function statusObj(cfg) {
  return {
    ok: true,
    provider: cfg.provider,
    active: !!cfg.apiKey && cfg.provider !== 'none',
    model: LLM.workingModel || cfg.model || (MODELS[cfg.provider] || [])[0] || '',
    working: !!LLM.lastOk && !LLM.lastError,
    lastError: LLM.lastError ? explainError(LLM.lastError) : null,
    calls: LLM.calls,
    fails: LLM.fails
  };
}

async function selfTest(cfg) {
  const r = await callLLM(cfg, buildSystemPrompt(), 'Test di connessione. Rispondi {"ok":true,"battuta":"una frase di un pescatore di Porto Vecchio"}', 80);
  return r;
}

// --------- Server HTTP ---------
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/api/mente' && req.method === 'POST') { handleApiMente(req, res); return; }

  if (pathname === '/api/status') { sendJSON(res, 200, statusObj(loadConfig())); return; }

  if (pathname === '/api/test') {
    const cfg = loadConfig();
    const r = await selfTest(cfg);
    sendJSON(res, 200, Object.assign(statusObj(cfg), { test: r ? 'ok' : 'fallito', risposta: r }));
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT, pathname);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Accesso negato'); return; }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Non Trovato');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`\nLa porta ${PORT} è già occupata: probabilmente il gioco è già aperto in un'altra finestra.`);
    console.error(`Chiudi l'altra finestra nera del server e riavvia AVVIA.bat.\n`);
  } else console.error(e);
});

server.listen(PORT, async () => {
  const cfg = loadConfig();
  console.log(`\n=================================================`);
  console.log(`Porto Vecchio:  http://localhost:${PORT}`);
  console.log(`Mente (IA):     ${cfg.provider} · chiave ${cfg.apiKey ? cfg.apiKey.slice(0, 6) + '…' + cfg.apiKey.slice(-4) : 'ASSENTE'}`);
  console.log(`Configurazione: ${CONFIG_FILE}`);
  console.log(`=================================================`);
  if (cfg.suspicious) console.warn(`ATTENZIONE: la chiave in api_key.json contiene una parola segnaposto (es. "CHIAVE"). Incollala di nuovo intera, senza aggiunte.`);
  if (!cfg.apiKey || cfg.provider === 'none') { console.log('Nessuna chiave: gli NPC useranno il motore interno (senza IA).\n'); return; }
  console.log('Provo la Mente…');
  const r = await selfTest(cfg);
  if (r) console.log(`✔ La Mente funziona (${LLM.workingModel}). Esempio: ${r.battuta || JSON.stringify(r)}\n`);
  else console.log(`✘ La Mente NON risponde: ${explainError(LLM.lastError)}\n  Il gioco funziona lo stesso col motore interno. Dettagli sopra.\n`);
});
