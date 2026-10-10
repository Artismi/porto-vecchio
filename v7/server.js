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
  // (ottobre 2026: i 2.0 e 2.5 non si aprono più ai nuovi utenti; i "lite" rispondono prima e sono meno affollati)
  gemini: ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'],
  anthropic: ['claude-haiku-4-5', 'claude-haiku-4-5-20251001'],
  groq: ['llama-3.1-8b-instant'],
  openrouter: ['google/gemini-2.5-flash', 'anthropic/claude-haiku-4.5']
};

// Stato del proxy, visibile da /api/status e dalla chat del gioco
const LLM = {
  workingModel: null,   // modello che ha risposto davvero l'ultima volta
  workingBy: {},        // lo stesso, per fornitore
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
    model: '',
    // facoltative: una chiave per canale (vedi CANALI); vuote = si usa apiKey
    chiavi: { chat: '', mente: '', eventi: '' }
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
  // [chat] una seconda chiave solo per la chat col giocatore: ha la sua quota, non aspetta mai il mondo
  cfg.chatKey = String(cfg.chatKey || process.env.MENTE_CHAT_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (/CHIAVE|INSERISCI|YOUR|TUA_|XXXX/i.test(cfg.chatKey)) cfg.chatKey = '';
  if (cfg.chatKey && !String((cfg.chiavi && cfg.chiavi.chat) || '').trim()) cfg.chiavi = Object.assign({}, cfg.chiavi, { chat: cfg.chatKey });   // stesso posto di chiavi.chat
  return cfg;
}

// Tre canali, ognuno può avere la sua chiave (e quindi la sua quota, se le chiavi vengono da progetti Google diversi):
//   chat   = il giocatore parla con un abitante · mente = la notte dei gruppi (coro.js) · eventi = incontri e chiacchiere a caso
// Un canale senza chiave propria usa quella generale.
const CANALI = { dialogo: 'chat', gruppo: 'mente', riflessione: 'mente', chiacchiera: 'eventi', regia: 'eventi', graffito: 'eventi' };   // [graffiti]   // [regia] il regista va con gli eventi
function cfgPer(cfg, canale) {
  const k = String((cfg.chiavi && cfg.chiavi[canale]) || '').trim().replace(/^["']|["']$/g, '');
  if (!k || /INCOLLA|CHIAVE|INSERISCI/i.test(k)) return Object.assign({}, cfg, { apiKey0: cfg.apiKey, canale, propria: false });
  const c = Object.assign({}, cfg, { apiKey: k, apiKey0: cfg.apiKey, canale, propria: true, bearer: false });   // [unione9] apiKey0: la generale, per pescare se questa finisce
  const g = detectProvider(k); if (g) c.provider = g;
  return c;
}
const canaliPropri = cfg => ({ chat: cfgPer(cfg, 'chat').propria, mente: cfgPer(cfg, 'mente').propria, eventi: cfgPer(cfg, 'eventi').propria });

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
  // il "reason" di Google sta in fondo al JSON: lo metto davanti così non si perde nel taglio
  const reason = (String(msg).match(/"reason":\s*"([A-Z_]+)"/) || [])[1];
  if (reason) msg = reason + ' · ' + msg;
  LLM.lastError = { when: Date.now(), provider: cfg.provider, model, status, msg: String(msg).slice(0, 400) };
  console.error(`[Mente ✘] ${cfg.provider}/${model} → ${status}: ${String(msg).slice(0, 300)}`);
}

function modelsFor(cfg) {
  const list = (MODELS[cfg.provider] || []).slice();
  // il modello buono si ricorda per fornitore: i canali possono usare fornitori diversi
  if (LLM.workingBy[cfg.provider]) list.unshift(LLM.workingBy[cfg.provider]);
  if (cfg.model) list.unshift(cfg.model);
  return [...new Set(list)];
}

// Una singola chiamata HTTP al fornitore; restituisce { ok, status, text, notFound }
async function rawCall(cfg, model, systemPrompt, userMessage, maxTokens) {
  if (cfg.provider === 'gemini') {
    // Le chiavi Gemini (AIza…) vanno nell'header x-goog-api-key; le AQ.… vengono ritentate come Bearer (vedi callLLM).
    // NON come "Authorization: Bearer": quello è per i token OAuth e dà 401.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const generationConfig = { responseMimeType: 'application/json', temperature: 0.8, maxOutputTokens: maxTokens };
    // I modelli flash "pensano" e consumano token prima di rispondere: per battute corte li spegniamo.
    // I "lite" non pensano e rifiutano l'opzione (400).
    if (/flash/.test(model) && !/lite/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const res = await fetch(url, {
      method: 'POST',
      headers: cfg.bearer
        ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.apiKey}` }
        : { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey },
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

// Dopo un 429 (troppe richieste / quota) il modello resta in pausa: niente chiamate a vuoto finché non scade
const COOLDOWN = {};
// Freno globale verso il fornitore: la versione gratuita di Gemini regge circa 10 richieste al minuto.
// Chiacchiere e riflessioni notturne cedono il passo ai dialoghi col giocatore.
// Il conto è per chiave: i canali con una chiave propria hanno tutta la loro quota.
const RPM = { max: 8, background: 4, logs: {} };
function budgetOk(cfg, urgent) {
  const now = Date.now(), id = String(cfg.apiKey).slice(-8);
  const log = (RPM.logs[id] || []).filter(t => now - t < 60000);
  RPM.logs[id] = log;
  if (log.length >= (urgent || cfg.propria ? RPM.max : RPM.background)) return false;
  log.push(now);
  return true;
}
function pauseFor(text) {
  const s = String(text);
  if (/PerDay/i.test(s)) return 3600000; // quota del giorno finita: riprovo fra un'ora
  const m = s.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) + 1000 : 60000;
}

// [chat] la configurazione per la chat: la chiave del canale chat (chiavi.chat, o chatKey / MENTE_CHAT_KEY) ha quota e pause sue
// (il conto è per chiave); senza, si usa quella comune con la precedenza. chatModel sceglie il modello solo per la chiave dedicata.
function chatCfg(cfg) {
  const c = Object.assign({}, cfg, { urgentChat: true });
  if (cfg.propria && cfg.chatModel) c.model = cfg.chatModel;
  return c;
}
// Chiamata con scelta automatica del modello; restituisce l'oggetto JSON o null.
// urgent = il giocatore aspetta una risposta (dialogo); false = chiacchiere e riflessioni, che si possono saltare.
// [unione9] se la chiave del canale è finita, in pausa o rifiutata, si pesca dalle altre: prima la generale, poi quelle degli altri canali
const QUOTA9 = s => s === undefined || s === null || s === 429 || s === 403 || s === 401 || s === 'chiave';
async function callLLM(cfg, systemPrompt, userMessage, maxTokens = 500, urgent = true) {
  LLM.lastError = null;
  const r = await callLLM1(cfg, systemPrompt, userMessage, maxTokens, urgent); if (r) return r;
  if (!QUOTA9(LLM.lastError && LLM.lastError.status)) return null;   // risposta sbagliata o rete: un'altra chiave non cambia niente
  const tried = new Set([String(cfg.apiKey || '')]);
  const keys = [cfg.apiKey0].concat(Object.values(cfg.chiavi || {})).map(k => String(k || '').trim().replace(/^["']|["']$/g, '')).filter(k => k && !/INCOLLA|CHIAVE|INSERISCI/i.test(k));
  for (const k of keys) {
    if (tried.has(k)) continue; tried.add(k);
    const c = Object.assign({}, cfg, { apiKey: k, bearer: false, propria: true }); const g = detectProvider(k); if (g) c.provider = g;
    LLM.lastError = null;
    const r2 = await callLLM1(c, systemPrompt, userMessage, maxTokens, urgent); if (r2) { console.log(`[Mente] canale ${cfg.canale || '?'}: risposto con un'altra chiave (…${k.slice(-4)})`); return r2; }
    if (!QUOTA9(LLM.lastError && LLM.lastError.status)) return null;
  }
  return null;
}
async function callLLM1(cfg, systemPrompt, userMessage, maxTokens = 500, urgent = true) {
  if (cfg.provider === 'none') return null;
  if (!cfg.apiKey) { LLM.lastError = { when: Date.now(), status: 'chiave', msg: 'Nessuna chiave in api_key.json' }; return null; }
  if (typeof fetch !== 'function') { LLM.lastError = { when: Date.now(), status: 'node', msg: 'Node troppo vecchio: serve Node 18 o più recente' }; return null; }

  const ck = m => String(cfg.apiKey).slice(-8) + ':' + m;
  const models = modelsFor(cfg).filter(m => !(COOLDOWN[ck(m)] > Date.now()));
  if (!models.length) {
    LLM.lastError = { when: Date.now(), provider: cfg.provider, status: 429, msg: 'Tutti i modelli sono in pausa per troppe richieste.' };
    return null;
  }
  if (!budgetOk(cfg, urgent)) return null; // troppe richieste nell'ultimo minuto: questa la salto
  LLM.calls++;
  for (const model of models) {
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
      LLM.workingModel = LLM.workingBy[cfg.provider] = model; LLM.lastOk = Date.now(); LLM.lastError = null;
      return obj;
    }
    fail(cfg, model, r.status, r.text);
    // Chiavi Google "AQ.…": con x-goog-api-key Google risponde solo "tipo non supportato";
    // ritento una volta come Bearer, che o funziona o dà il motivo vero (es. API bloccata).
    if (cfg.provider === 'gemini' && !cfg.bearer && /ACCESS_TOKEN_TYPE_UNSUPPORTED/.test(r.text)) {
      cfg.bearer = true;
      try { r = await rawCall(cfg, model, systemPrompt, userMessage, maxTokens); } catch (err) { return null; }
      if (r.ok) {
        const obj = parseJSONLoose(r.text);
        if (obj) { LLM.workingModel = LLM.workingBy[cfg.provider] = model; LLM.lastOk = Date.now(); LLM.lastError = null; return obj; }
      }
      fail(cfg, model, r.status, r.text);
    }
    if (r.status === 429) {
      // ogni modello ha la sua quota: metto in pausa questo e provo il successivo
      COOLDOWN[ck(model)] = Date.now() + pauseFor(r.text);
      console.warn(`[Mente] ${model} in pausa per ${Math.round(pauseFor(r.text) / 1000)} s (troppe richieste)`);
      continue;
    }
    if (r.status === 503 || r.status === 500) {
      // modello troppo affollato in questo momento: lo lascio riposare un po' e provo il successivo
      COOLDOWN[ck(model)] = Date.now() + 30000;
      continue;
    }
    // modello ritirato (anche quello scritto in "model"): non lo riprovo per un giorno
    if (r.notFound) COOLDOWN[ck(model)] = Date.now() + 86400000;
    if (!r.notFound) return null; // 401/403…: cambiare modello non serve
  }
  return null;
}

function explainError(e) {
  if (!e) return '';
  const m = (e.msg || '').toLowerCase();
  // Google: la chiave esiste ma non è abilitata per l'API Gemini (restrizioni API o API non attiva nel progetto)
  if (/api_key_service_blocked/.test(m)) return 'La chiave Google è bloccata per l\'API Gemini: in console.cloud.google.com → Credenziali togli le restrizioni API (o aggiungi "Generative Language API"), oppure crea una chiave nuova su aistudio.google.com/apikey.';
  // Google: la stringa non è una chiave API Gemini (es. token AQ.… di altri servizi)
  if (/access_token_type_unsupported/.test(m)) return 'Questa non è una chiave API Gemini valida (le chiavi giuste iniziano con "AIza"). Creane una su aistudio.google.com/apikey e incollala in api_key.json.';
  if (e.status === 401 || /api key not valid|invalid.*key|authentication|unauthenticated|invalid x-api-key/.test(m)) return 'La chiave non è valida: controlla api_key.json (copiala di nuovo intera, senza aggiunte).';
  if (e.status === 403 || /permission|denied/.test(m)) return 'La chiave non ha il permesso per questo modello o per questa API (attivala nella console del fornitore).';
  if (e.status === 429 && /perday/.test(m)) return 'Quota gratuita di oggi finita: la Mente torna domani (o attiva la fatturazione su aistudio.google.com).';
  if (e.status === 429 || /quota|rate/.test(m)) return 'Quota esaurita o troppe richieste: aspetta o controlla il piano del fornitore.';
  if (e.status === 503 || e.status === 500) return 'I modelli di Google sono sovraccarichi in questo momento: riprova fra qualche minuto.';
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

// [editor] ritocchi fatti nel gioco: si scrivono solo questi file, e solo se la richiesta viene dal gioco stesso
const RIT_FILE = path.join(ROOT, 'ritocchi.json'), RIT_DIR = path.join(ROOT, 'ritocchi');
let ritBackupDone = false;
function handleRitocchi(req, res, pathname, parsedUrl) {
  const origin = req.headers.origin;
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) { sendJSON(res, 403, { ok: false, errore: 'solo dal gioco aperto in locale' }); return; }
  if (req.method === 'GET') { sendJSON(res, 200, { ok: true, file: fs.existsSync(RIT_FILE) }); return; }
  if (req.method !== 'POST') { sendJSON(res, 405, { ok: false }); return; }
  const chunks = []; let size = 0;
  req.on('data', c => { size += c.length; if (size > 64 * 1024 * 1024) { req.destroy(); return; } chunks.push(c); });
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      if (pathname === '/api/ritocchi') {
        const data = JSON.parse(body.toString('utf8'));
        // la prima volta che si salva in questa sessione, la versione di prima resta in ritocchi.backup.json
        if (!ritBackupDone && fs.existsSync(RIT_FILE)) fs.copyFileSync(RIT_FILE, path.join(ROOT, 'ritocchi.backup.json'));
        ritBackupDone = true;
        fs.writeFileSync(RIT_FILE, JSON.stringify(data, null, 1));
        sendJSON(res, 200, { ok: true }); return;
      }
      if (pathname === '/api/ritocchi/png') {
        const nome = parsedUrl.searchParams.get('nome') || '';
        if (!/^[\w.-]+\.png$/.test(nome) || body.length < 8 || body.readUInt32BE(0) !== 0x89504e47) { sendJSON(res, 400, { ok: false, errore: 'nome o immagine non validi' }); return; }
        fs.mkdirSync(RIT_DIR, { recursive: true });
        fs.writeFileSync(path.join(RIT_DIR, nome), body);
        sendJSON(res, 200, { ok: true, file: 'ritocchi/' + nome }); return;
      }
      if (pathname === '/api/ritocchi/file') {   // [studio] modelli caricati (.glb): in ritocchi/modelli
        const nome = parsedUrl.searchParams.get('nome') || '';
        if (!/^[\w.-]+\.glb$/.test(nome) || body.length < 12 || body.toString('latin1', 0, 4) !== 'glTF') { sendJSON(res, 400, { ok: false, errore: 'serve un file .glb' }); return; }
        const dir = path.join(RIT_DIR, 'modelli'); fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, nome), body);
        sendJSON(res, 200, { ok: true, file: 'ritocchi/modelli/' + nome }); return;
      }
      sendJSON(res, 404, { ok: false });
    } catch (e) { console.error('[editor]', e.message); sendJSON(res, 500, { ok: false, errore: e.message }); }
  });
}

// [writer] le firme registrate nello studio delle tag: si scrive solo tag_firme.json, solo dal gioco aperto in locale
const TAG_FILE = path.join(ROOT, 'tag_firme.json');
let tagBackupDone = false;
function handleTagFirme(req, res) {
  const origin = req.headers.origin;
  if (origin && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) { sendJSON(res, 403, { ok: false, errore: 'solo dal gioco aperto in locale' }); return; }
  if (req.method !== 'POST') { sendJSON(res, 405, { ok: false }); return; }
  const chunks = []; let size = 0;
  req.on('data', c => { size += c.length; if (size > 16 * 1024 * 1024) { req.destroy(); return; } chunks.push(c); });
  req.on('end', () => {
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!data || typeof data !== 'object' || Array.isArray(data)) { sendJSON(res, 400, { ok: false, errore: 'serve un oggetto { NOME: firma }' }); return; }
      if (!tagBackupDone && fs.existsSync(TAG_FILE)) fs.copyFileSync(TAG_FILE, path.join(ROOT, 'tag_firme.backup.json'));
      tagBackupDone = true;
      fs.writeFileSync(TAG_FILE, JSON.stringify(data));
      sendJSON(res, 200, { ok: true, n: Object.keys(data).length });
    } catch (e) { console.error('[tag]', e.message); sendJSON(res, 500, { ok: false, errore: e.message }); }
  });
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
      const cfg = cfgPer(loadConfig(), CANALI[body.kind || 'dialogo'] || 'chat');
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
        return aiReply(res, await callLLM(chatCfg(cfg), sys, usr, 400));   // [chat] chiave e quota della chat
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
        const r = await callLLM(cfg, sys, usr, 200, false);
        if (r) {
          const clamp = v => Math.max(-0.1, Math.min(0.1, Number(v) || 0));
          r.rabbia_diff = clamp(r.rabbia_diff); r.paura_diff = clamp(r.paura_diff);
        }
        return aiReply(res, r);
      }

      if (kind === 'gruppo') {
        // il Coro: una sola chiamata per un gruppo di abitanti affini (vedi src/coro.js)
        const sys = buildSystemPrompt() + `
Compito: è notte. Ricevi un GRUPPO di abitanti affini e la casella sintetica di ognuno
(formato: id | nome, età, mestiere | umore | bisogni | sa: cosa sa | pensa: ultimo pensiero).
Sintetizza come il gruppo vive la giornata appena passata. Scrivi un pensiero personale SOLO per gli id in "specifici".
Restituisci un JSON:
{
  "clima": "l'umore del gruppo in una frase (max 20 parole)",
  "voce": "una notizia o diceria che gira nel gruppo, presa da quello che sanno (max 15 parole, vuota se non c'è niente)",
  "rabbia": 0,
  "paura": 0,
  "battute": ["3-4 battute brevi (max 12 parole) che qualcuno del gruppo dirà domani per strada"],
  "singoli": { "<id>": { "pensiero": "in prima persona, max 15 parole", "rabbia": 0, "paura": 0 } }
}
rabbia e paura sono numeri tra -0.1 e 0.1 (quanto cambia l'umore del gruppo, o del singolo in più).`;
        const usr = JSON.stringify({ gruppo: body.gruppo, situazione: body.situazione, membri: body.membri, specifici: body.specifici }).slice(0, 6000);
        console.log(`[Mente] gruppo: ${body.gruppo} (${(body.membri || []).length})`);
        return aiReply(res, await callLLM(cfg, sys, usr, 700, false));
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
        return aiReply(res, await callLLM(cfg, sys, usr, 150, false));
      }

      if (kind === 'regia') {   // [regia] il regista invisibile della vita di strada
        const sys = buildSystemPrompt() + `
Compito: sei il regista invisibile della vita di strada, intorno al giocatore. Ricevi una scena: alcune persone vicine,
cosa stanno facendo, i bisogni, i progetti, i rapporti tra loro e i posti vicini.
Fai succedere da 1 a 3 cose piccole e vere, coerenti col carattere, l'umore e la giornata di ognuno: qualcuno cambia strada
per un motivo suo, due si fermano a parlare, uno offre da bere, un vecchio conto diventa una lite, uno si mette a lavorare
a un suo progetto personale (riparare, dipingere, pescare, aspettare qualcuno), un gesto o una frase che dice chi è.
Niente violenza grave, niente cose impossibili, niente che contraddica la scena. Usa SOLO gli id delle persone e dei posti dati.
Restituisci un JSON:
{
  "azioni": [
    { "chi": "id persona", "verbo": "vai|fai|chiacchiera|sfotti|apprezza|offri|gioca|litiga|mangia|gesto",
      "dove": "id posto (per vai e fai)", "con": "id persona (per i verbi tra persone)",
      "cosa": "per fai: l'attività in poche parole (es. ripara la rete)", "minuti": 10,
      "battuta": "cosa dice, max 10 parole, oppure vuoto", "perche": "il motivo, max 10 parole" }
  ]
}`;
        const usr = `Scena:\n${JSON.stringify(body.scena || {})}`;
        return aiReply(res, await callLLM(cfg, sys, usr, 450, false));
      }

      if (kind === 'graffito') {   // [graffiti] cosa dipinge un abitante, a bomboletta, su un muro
        const sys = buildSystemPrompt() + `
Compito: una persona della città sta per fare un graffito su un muro, con le bombolette. Decidi TU cosa dipinge, come
lo farebbe lei: col suo carattere, il suo umore, i suoi ricordi, quello che odia o ama, il suo stile. Può scrivere una frase
breve (un nome, uno slogan, un insulto, una dedica, una data) e/o fare un disegno semplice a tratti (una faccia, una barca,
un pesce, un cuore, una caricatura, un simbolo). Libera espressione, ma niente oscenità esplicite.
Il muro: u in metri lungo il muro da -1.5 (sinistra) a 1.5 (destra), v in metri da terra da 0.3 a 2.6.
La scritta la tracciamo noi in stampatello, fra v 1.1 e 1.9: dai solo il testo (max 24 caratteri). I tratti del disegno
sono linee spezzate: se c'è una scritta disegna sopra (v 1.95-2.6) o ai lati, se no usa tutto il muro.
Colori bombolette: #c42a22 rosso, #1e1e24 nero, #e8e0d0 bianco, #2a6ac8 blu, #e8c040 giallo, #3a9a5a verde, #c84a9a rosa, #e8a020 arancio.
Restituisci un JSON:
{
  "testo": "la scritta, oppure vuoto",
  "colore_testo": "#rrggbb",
  "altezza_lettere": 0.3,
  "tratti": [ { "colore": "#rrggbb", "spessore": 0.05, "punti": [[u, v], [u, v], ...] } ],
  "descrizione": "cosa ha dipinto, in poche parole"
}
Al massimo 20 tratti, ognuno al massimo 30 punti; spessore fra 0.025 e 0.09.`;
        const usr = `Chi dipinge e perché:\n${JSON.stringify(body.scena || {})}`;
        return aiReply(res, await callLLM(cfg, sys, usr, 900, false));
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
    active: cfg.provider !== 'none' && (!!cfg.apiKey || Object.values(canaliPropri(cfg)).some(Boolean)),
    model: LLM.workingModel || cfg.model || (MODELS[cfg.provider] || [])[0] || '',
    working: !!LLM.lastOk && !LLM.lastError,
    lastError: LLM.lastError ? explainError(LLM.lastError) : null,
    canali: canaliPropri(cfg),
    calls: LLM.calls,
    fails: LLM.fails,
    chat: canaliPropri(cfg).chat ? 'chiave dedicata' : 'chiave comune, con la precedenza'
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

  // [editor] l'editor del gioco (F2) salva qui i ritocchi: ritocchi.json e le pitture in ritocchi/*.png
  if (pathname.startsWith('/api/ritocchi')) { handleRitocchi(req, res, pathname, parsedUrl); return; }
  if (pathname === '/api/tag_firme') { handleTagFirme(req, res); return; }   // [writer] le firme disegnate nello studio_tag.html

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
  console.log(`Chat:           ${(c => c.propria ? 'chiave dedicata ' + c.apiKey.slice(0, 6) + '…' + c.apiKey.slice(-4) : 'stessa chiave (con la precedenza sul resto)')(cfgPer(cfg, 'chat'))}`);
  console.log(`Configurazione: ${CONFIG_FILE}`);
  console.log(`=================================================`);
  if (cfg.suspicious) console.warn(`ATTENZIONE: la chiave in api_key.json contiene una parola segnaposto (es. "CHIAVE"). Incollala di nuovo intera, senza aggiunte.`);
  const propri = canaliPropri(cfg);
  if (cfg.provider === 'none' || (!cfg.apiKey && !Object.values(propri).some(Boolean))) { console.log('Nessuna chiave: gli NPC useranno il motore interno (senza IA).\n'); return; }
  // provo ogni chiave diversa una volta sola: chat, mente centrale, eventi (chi non ha la sua usa quella generale)
  const NOMI = { chat: 'chat col giocatore', mente: 'mente centrale (gruppi)', eventi: 'eventi e chiacchiere' };
  const provate = {};
  for (const canale of ['chat', 'mente', 'eventi']) {
    const c = cfgPer(cfg, canale);
    if (!c.apiKey) { console.log(`– ${NOMI[canale]}: nessuna chiave`); continue; }
    const id = c.apiKey.slice(-8);
    if (provate[id] !== undefined) { console.log(`${provate[id] ? '✔' : '✘'} ${NOMI[canale]}: stessa chiave di sopra`); continue; }
    console.log(`Provo ${NOMI[canale]} (chiave ${c.apiKey.slice(0, 6)}…${c.apiKey.slice(-4)})…`);
    LLM.workingModel = null;
    const r = await selfTest(c);
    provate[id] = !!r;
    if (r) console.log(`✔ ${NOMI[canale]}: funziona (${LLM.workingModel}). Esempio: ${r.battuta || JSON.stringify(r)}`);
    else console.log(`✘ ${NOMI[canale]}: NON risponde: ${explainError(LLM.lastError)}`);
  }
  console.log(Object.values(provate).some(Boolean) ? '\nLa Mente funziona.\n' : '\nLa Mente NON risponde: il gioco funziona lo stesso col motore interno. Dettagli sopra.\n');
});
