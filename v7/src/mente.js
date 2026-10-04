/* Porto Vecchio — Modulo Mente: Cervello cognitivo degli NPC
   Si integra tra il gioco (popolo.js, risacca_ui.js, main.js) e l'endpoint /api/mente.
   Gestisce:
   1. Riflessione notturna (Popolo.CFG.mind)
   2. Dialogo conversazionale in linguaggio naturale con chiunque
   3. Chiacchiere tra NPC a fumetto
   4. Fallback trasparente offline senza interruzioni
*/

var Mente = (function () {
  'use strict';

  const API_ENDPOINT = '/api/mente';
  const STATUS_ENDPOINT = '/api/status';

  const state = {
    connected: false,
    provider: 'none',
    active: false,
    model: '',
    cache: new Map(),
    lastCall: 0,
    minInterval: 1200 // protezione rate-limit in ms
  };

  // Verifica lo stato del backend
  async function checkStatus() {
    try {
      const res = await fetch(STATUS_ENDPOINT);
      if (res.ok) {
        const data = await res.json();
        state.connected = true;
        state.provider = data.provider;
        state.active = data.active;
        state.model = data.model;
        return true;
      }
    } catch (e) {
      state.connected = false;
    }
    return false;
  }

  // Chiamata generica al backend
  async function callBackend(payload) {
    if (!state.connected && !(await checkStatus())) {
      return null;
    }

    const now = Date.now();
    const wait = state.minInterval - (now - state.lastCall);
    if (wait > 0) {
      await new Promise(r => setTimeout(r, wait));
    }
    state.lastCall = Date.now();

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const body = await res.json();
        return body.data || null;
      }
    } catch (e) {
      console.warn('[Mente] Errore chiamata /api/mente:', e.message);
    }
    return null;
  }

  // 1. Riflessione notturna: aggancio a Popolo.CFG.mind
  function hookNightReflection() {
    if (typeof Popolo === 'undefined' || !Popolo.CFG) return;

    Popolo.CFG.mind = async function (st, n, prompt) {
      // Esegui la riflessione IA solo per i personaggi principali o chi ha vissuto eventi salienti oggi
      const P = n.pop;
      if (!P) return;

      const hasEvents = P.diary && P.diary.some(e => Math.abs(st.t - e.t) < 1440 && e.w > 0.4);
      const isImportant = n.pop.cast || hasEvents || n.id === 'lupo' || n.id === 'gino' || n.id === 'rosa';

      if (!isImportant) return;

      try {
        const aiResp = await callBackend({
          kind: 'riflessione',
          npcId: n.id,
          prompt
        });

        if (aiResp && aiResp.pensiero) {
          const text = String(aiResp.pensiero).trim();
          P.thoughts.push({ t: st.t, text });
          if (P.thoughts.length > 6) P.thoughts.shift();
          if (typeof Popolo.note === 'function') {
            Popolo.note(st, n, `ha pensato: ${text}`, 'pensiero', { w: 0.7 });
          }
          if (aiResp.rabbia_diff) P.need.rabbia = Math.max(0, Math.min(1, P.need.rabbia + aiResp.rabbia_diff));
          if (aiResp.paura_diff) P.need.paura = Math.max(0, Math.min(1, P.need.paura + aiResp.paura_diff));
        }
      } catch (err) {
        console.warn(`[Mente] Riflessione fallita per ${n.name}:`, err);
      }
    };
  }

  // 2. Chiamata per dialoghi
  async function dialog(st, n, playerText) {
    const P = n.pop;
    const context = `Ora: ${Game.clockStr(st.t)}, Giorno: ${Game.dayName(st.t)}. Luogo: ${n.inside ? 'al chiuso' : 'all\'aperto'}. Repressione: ${st.ris ? Math.round(st.ris.repr) : 0}.`;

    const npcData = {
      id: n.id,
      name: n.name,
      ruolo: n.role,
      personalita: (n.pop && n.pop.tr) || {},
      interessi: P && P.ints ? P.ints.map(i => Popolo.INTERESSI[i.k]) : [],
      lavoro: P && P.job ? P.job.title : 'nessuno',
      bisogni: P ? P.need : {},
      ultimi_ricordi: P && P.diary ? P.diary.slice(-5).map(d => d.text) : []
    };

    const aiResp = await callBackend({
      kind: 'dialogo',
      npc: npcData,
      context,
      text: playerText
    });

    return aiResp;
  }

  // 3. Chiacchiere spontanee tra NPC (fumetti a terra)
  async function chiacchiera(st, npcA, npcB) {
    if (!npcA || !npcB) return null;
    const cacheKey = [npcA.id, npcB.id].sort().join(':');
    const cached = state.cache.get(cacheKey);
    if (cached && (Date.now() - cached.time < 60000)) {
      return cached.data;
    }

    const aiResp = await callBackend({
      kind: 'chiacchiera',
      npcA: { id: npcA.id, name: npcA.name, role: npcA.role },
      npcB: { id: npcB.id, name: npcB.name, role: npcB.role },
      context: `Vicini a ${Game.nearestPlace(npcA.x, npcA.y).name}, ore ${Game.clockStr(st.t)}.`
    });

    if (aiResp) {
      state.cache.set(cacheKey, { time: Date.now(), data: aiResp });
    }
    return aiResp;
  }

  // Inizializzazione automatica
  function init() {
    checkStatus().then(ok => {
      if (ok) {
        console.log(`[Mente] Connesso al server locale. Provider: ${state.provider} (Attivo: ${state.active})`);
      } else {
        console.log('[Mente] In esecuzione offline. I dialoghi useranno il fallback euristico del motore.');
      }
    });

    hookNightReflection();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      setTimeout(init, 0);
    }
  }

  return {
    init,
    checkStatus,
    dialog,
    chiacchiera,
    state
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Mente;
}
