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
    minInterval: 1200, // protezione rate-limit in ms
    working: false,
    lastError: null,
    talkCd: 0,         // pausa tra due chiacchiere IA (ms, orologio reale)
    chatBusy: 0,       // [chat] richieste di chat in volo
    chatUntil: 0       // [chat] fino a quando il giocatore conta come «sta chattando»
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
        state.working = !!data.working;
        state.lastError = data.lastError || null;
        return true;
      }
    } catch (e) {
      state.connected = false;
    }
    return false;
  }

  // Chiamata generica al backend
  // [chat] la chat col giocatore passa sempre davanti: non aspetta l'intervallo e, finché il giocatore chatta,
  // chiacchiere, riflessioni e regia del mondo non partono (decide il motore da solo). Con una chiave dedicata
  // (chatKey in api_key.json, MENTE_CHAT_KEY su Vercel) la chat ha anche una quota tutta sua.
  async function callBackend(payload) {
    const chat = !!payload && payload.kind === 'dialogo';
    if (!chat && (state.chatBusy > 0 || Date.now() < state.chatUntil)) return null;
    if (chat) { state.chatBusy = (state.chatBusy || 0) + 1; state.chatUntil = Date.now() + 25000; }
    try { return await callBackend0(payload, chat); } finally { if (chat) state.chatBusy--; }
  }
  async function callBackend0(payload, chat) {
    if (!state.connected && !(await checkStatus())) {
      return null;
    }

    if (!chat) {
      const now = Date.now();
      const wait = state.minInterval - (now - state.lastCall);
      if (wait > 0) {
        await new Promise(r => setTimeout(r, wait));
      }
      if (state.chatBusy > 0) return null;   // nel frattempo il giocatore ha cominciato a chattare
      state.lastCall = Date.now();
    }

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const body = await res.json();
        state.lastError = body.data ? null : (body.error || 'nessuna risposta');
        state.working = !!body.data;
        if (!body.data && body.error) console.warn('[Mente] ripiego:', body.error);
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
      // al massimo 3 riflessioni IA per notte: tutte insieme esaurirebbero la quota in un attimo
      const day = Math.floor(st.t / 1440);
      if (state.nightDay !== day) { state.nightDay = day; state.nightCalls = 0; }
      if (state.nightCalls >= 3) return;
      state.nightCalls++;

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

  // 4. Le chiacchiere che il giocatore sente passando diventano vere battute IA.
  //    La simulazione (Azioni.social) decide CHI parla e QUANDO e ne applica gli effetti;
  //    la Mente sostituisce solo le parole del fumetto. Solo vicino al giocatore, all'aperto,
  //    con una pausa tra una chiamata e l'altra per contenere i costi.
  function hookTalk() {
    if (typeof Azioni === 'undefined' || !Azioni.CFG || typeof Game === 'undefined' || !Game.say) return;
    Azioni.CFG.talk = function (st, a, b, kind) {
      if (!state.active || state.lastError && state.working === false && state.calls > 3) return;
      if (kind !== 'chiacchiera' && kind !== 'sfotti' && kind !== 'apprezza') return;
      if (!a.pop || !a.pop.near || a.inside || b.inside) return;
      const p = st.player;
      if (p && Math.hypot(a.x - p.x, a.y - p.y) > 14) return;
      const now = Date.now();
      if (now < state.talkCd) return;
      state.talkCd = now + 45000; // la quota gratuita è poca: una chiacchiera IA ogni 45 s basta
      state.calls = (state.calls || 0) + 1;
      const info = n => ({
        id: n.id, name: n.name, role: n.role,
        lavoro: n.pop && n.pop.job ? n.pop.job.title : undefined,
        umore: n.pop ? { rabbia: +(n.pop.need.rabbia || 0).toFixed(2), paura: +(n.pop.need.paura || 0).toFixed(2) } : undefined,
        ricordo: n.pop && n.pop.diary && n.pop.diary.length ? n.pop.diary[n.pop.diary.length - 1].text : undefined
      });
      const where = (a.pop.at && a.pop.at.label) || (Game.nearestPlace ? Game.nearestPlace(a.x, a.y).name : '');
      callBackend({
        kind: 'chiacchiera',
        npcA: info(a), npcB: info(b),
        context: `Tipo di scambio: ${kind}. Vicino a ${where}, ore ${Game.clockStr(st.t)}. Repressione: ${st.ris ? Math.round(st.ris.repr) : 0}.`
      }).then(r => {
        if (!r || !r.battutaA) return;
        Game.say(st, a, String(r.battutaA).slice(0, 90), 3.2);
        if (r.battutaB) setTimeout(() => { try { Game.say(st, b, String(r.battutaB).slice(0, 90), 3.2); } catch (e) { } }, 1600);
      }).catch(() => { });
    };
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
    hookTalk();
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
    call: callBackend,                                          // [regia] chiamata generica (kind: 'regia', …)
    chatting: () => state.chatBusy > 0 || Date.now() < state.chatUntil,
    state
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Mente;
}
