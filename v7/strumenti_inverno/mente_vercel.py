# Rigenera v7/api/_mente.js (la Mente su Vercel) dal pezzo di server.js che parla coi modelli.
# Da lanciare dentro v7/ ogni volta che cambia server.js:  python3 strumenti_inverno/mente_vercel.py
import re
s = open('server.js', encoding='utf-8').read()
a = s.index("// Modelli di default per fornitore"); b = s.index("// --------- Server HTTP ---------")
core = s[a:b]
i = core.index("function loadConfig() {"); j = core.index("// Tre canali")
core = core[:i] + '''function loadConfig() {
  const apiKey = String(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.API_KEY || '').trim();
  const cfg = { provider: String(process.env.MENTE_PROVIDER || 'gemini').toLowerCase(), apiKey, model: process.env.MENTE_MODEL || '',
    chiavi: { chat: process.env.CHIAVE_CHAT || '', mente: process.env.CHIAVE_MENTE || '', eventi: process.env.CHIAVE_EVENTI || '' } };
  const guessed = detectProvider(apiKey); if (guessed) cfg.provider = guessed;
  return cfg;
}
''' + core[j:]
i = core.index("async function handleApiMente(req, res) {"); j = core.index("function statusObj(cfg) {")
h = core[i:j]
h = re.sub(r"async function handleApiMente\(req, res\) \{\s*let bodyStr = '';\s*req\.on\('data', chunk => \{ bodyStr \+= chunk; \}\);\s*req\.on\('end', async \(\) => \{\s*try \{\s*const body = JSON\.parse\(bodyStr \|\| '\{\}'\);",
           "async function handleBody(body) {\n  {\n    try {", h)
assert 'handleBody' in h, 'handleApiMente cambiato: aggiorna questo script'
h = re.sub(r"return aiReply\(res, ([^;]*)\);", r"return reply(\1);", h)
h = re.sub(r"sendJSON\(res, (\d+), (\{[^;]*\})\);", r"return { code: \1, obj: \2 };", h)
h = h.replace("  });\n}\n", "  }\n}\n", 1)
core = core[:i] + h + core[j:]
core = re.sub(r"function sendJSON\(res, code, obj\) \{[\s\S]*?\n\}\n", "", core)
core = re.sub(r"function aiReply\(res, aiResp\) \{[\s\S]*?\n\}\n", "function reply(aiResp) {\n  return { code: 200, obj: { ok: true, source: aiResp ? 'ai' : 'fallback', data: aiResp, error: aiResp ? null : explainError(LLM.lastError) } };\n}\n", core)
core = core.replace("msg: 'Nessuna chiave in api_key.json'", "msg: 'Nessuna chiave: su Vercel imposta la variabile GEMINI_API_KEY (Settings → Environment Variables) e rifai il deploy.'")
out = '''// Porto Vecchio — la Mente degli NPC su Vercel: la stessa logica di server.js, ma la chiave sta in una variabile d'ambiente segreta
// (GEMINI_API_KEY, oppure ANTHROPIC_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY) e non arriva mai al browser.
// NON modificare a mano: si rigenera da server.js con  python3 strumenti_inverno/mente_vercel.py
''' + core + '''
// un freno contro chi usasse l'indirizzo per consumare la chiave: poche richieste al minuto per IP (per istanza)
const HITS = new Map();
function limited(ip) { const now = Date.now(), L = (HITS.get(ip) || []).filter(t => now - t < 60000); L.push(now); HITS.set(ip, L); if (HITS.size > 5000) HITS.clear(); return L.length > Number(process.env.MENTE_PER_MINUTO || 40); }
module.exports = { LLM, loadConfig, handleBody, statusObj, selfTest, explainError, limited };
'''
open('api/_mente.js', 'w', encoding='utf-8').write(out)
print('api/_mente.js rigenerato')
