// GET /api/test — prova una chiamata vera al modello: serve a controllare che la chiave su Vercel funzioni.
const M = require('./_mente.js');
module.exports = async (req, res) => { const cfg = M.loadConfig(); const r = await M.selfTest(cfg); res.status(200).json(Object.assign(M.statusObj(cfg), { test: r ? 'ok' : 'fallito', risposta: r })); };
