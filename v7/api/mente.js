// POST /api/mente — la Mente degli NPC (dialoghi, riflessioni, chiacchiere). La chiave resta qui, sul server.
const M = require('./_mente.js');
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'Solo POST' }); return; }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  if (M.limited(ip)) { res.status(429).json({ ok: true, source: 'fallback', data: null, error: 'Troppe richieste: la Mente riposa un minuto.' }); return; }
  let body = req.body; if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (JSON.stringify(body || {}).length > 30000) { res.status(413).json({ ok: false, error: 'Richiesta troppo lunga' }); return; }
  const r = await M.handleBody(body || {});
  res.status(r.code).json(r.obj);
};
