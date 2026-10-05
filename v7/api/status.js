// GET /api/status — se la Mente è accesa (il gioco lo chiede all'avvio). Non dice mai la chiave.
const M = require('./_mente.js');
module.exports = (req, res) => { res.status(200).json(M.statusObj(M.loadConfig())); };
