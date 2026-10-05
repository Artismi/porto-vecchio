/* Porto Vecchio — Modulo Mente: Cervello cognitivo degli NPC
   Si integra tra il gioco (popolo.js, risacca_ui.js, main.js) e l'endpoint /api/mente.
   Gestisce:
   1. La notte per gruppi di affinità (coro.js: caselle, voci, una chiamata per gruppo)
   2. Dialogo conversazionale in linguaggio naturale con chiunque
   3. Chiacchiere tra NPC a fumetto, con le battute scritte di notte per il gruppo
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
    talkCd: 0,         // pausa tra due chiacchiere (ms, orologio reale)
    canali: {},
    nightQueued: false,
    nightBusy: false
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
        state.canali = data.canali || {};   // quali canali hanno una chiave propria (chat, mente, eventi)
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

  // 1. La notte, per gruppi (coro.js): Popolo chiama CFG.mind per ogni abitante a mezzanotte;
  //    qui si raccolgono e si fa UNA passata: il codice aggiorna le caselle e passa le voci,
  //    poi l'IA si chiama una volta per gruppo (pochi gruppi per notte) e la risposta ricade sui membri.
  const GAP_GRUPPI = 16000; // ms tra due gruppi: le chiamate di sfondo sono al massimo 4 al minuto
  function hookNightReflection() {
    if (typeof Popolo === 'undefined' || !Popolo.CFG) return;
    Popolo.CFG.mind = function (st) {
      if (state.nightQueued) return;
      state.nightQueued = true;
      setTimeout(() => { state.nightQueued = false; nightFlush(st); }, 0);
    };
  }
  async function nightFlush(st) {
    if (typeof Coro === 'undefined' || state.nightBusy) return;
    state.nightBusy = true;
    try {
      const R = Coro.notte(st);
      if (!state.active) return;
      for (let i = 0; i < R.gruppi.length; i++) {
        const g = R.gruppi[i];
        if (i) await new Promise(r => setTimeout(r, GAP_GRUPPI));
        const resp = await callBackend(Object.assign({ kind: 'gruppo' }, Coro.richiesta(st, g)));
        if (resp) Coro.applica(st, g, resp);
      }
    } catch (err) {
      console.warn('[Mente] notte dei gruppi fallita:', err);
    } finally {
      state.nightBusy = false;
    }
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
      scheda: typeof Coro !== 'undefined' && P && P.ints ? (Coro.aggiorna(st, n), Coro.riga(st, n)) : undefined,
      clima_del_gruppo: P && P.box && P.box.clima ? P.box.clima : undefined,
      bisogni: P && !P.box ? P.need : undefined,
      ultimi_ricordi: P && P.diary && !P.box ? P.diary.slice(-5).map(d => d.text) : undefined
    };

    const aiResp = await callBackend({
      kind: 'dialogo',
      npc: npcData,
      context,
      text: playerText
    });
    // finisce in memoria: il diario lo rilegge la casella, e di notte il gruppo se lo racconta
    if (aiResp && P && P.diary && typeof Popolo !== 'undefined') {
      const ric = String(aiResp.memoria || '').trim() || `mi ha chiesto: «${String(playerText).slice(0, 60)}»`;
      Popolo.note(st, n, `ha parlato con lo straniero: ${ric.slice(0, 120)}`, 'info', { w: .5, tag: 'giocatore', who: 'player' });
    }
    return aiResp;
  }

  // 3. Le chiacchiere che il giocatore sente passando: la simulazione (Azioni.social) decide CHI parla e QUANDO.
  //    Le parole: prima le battute che l'IA ha scritto di notte per il gruppo (nessuna chiamata);
  //    se non ce ne sono e il canale «eventi» ha una chiave sua, una chiamata al volo.
  //    Quello che si dicono finisce nel diario di tutti e due.
  function ricorda(st, a, b, la, lb) {
    if (typeof Popolo === 'undefined') return;
    Popolo.note(st, a, `ha detto a ${b.first || b.name}: «${la}»`, 'info', { w: .2, tag: 'chiacchiera', who: b.id });
    Popolo.note(st, b, `${a.first || a.name} gli ha detto: «${la}»${lb ? ` e lui ha risposto «${lb}»` : ''}`, 'info', { w: .2, tag: 'chiacchiera', who: a.id });
  }
  function parla(st, a, b, la, lb) {
    Game.say(st, a, la, 3.2);
    if (lb) setTimeout(() => { try { Game.say(st, b, lb, 3.2); } catch (e) { } }, 1600);
    ricorda(st, a, b, la, lb);
  }
  function hookTalk() {
    if (typeof Azioni === 'undefined' || !Azioni.CFG || typeof Game === 'undefined' || !Game.say || typeof Coro === 'undefined') return;
    Azioni.CFG.talk = function (st, a, b, kind) {
      if (kind !== 'chiacchiera' && kind !== 'sfotti' && kind !== 'apprezza') return;
      if (!a.pop || !a.pop.near || a.inside || b.inside) return;
      const p = st.player;
      if (p && Math.hypot(a.x - p.x, a.y - p.y) > 14) return;
      const now = Date.now();
      if (now < state.talkCd) return;
      const la = Coro.battuta(st, a);
      if (la) { state.talkCd = now + 20000; parla(st, a, b, la, Coro.battuta(st, b)); return; }
      if (!state.active || !state.canali.eventi) return;
      state.talkCd = now + 30000;
      const info = n => ({ id: n.id, name: n.name, role: n.role, scheda: n.pop && n.pop.ints ? (Coro.aggiorna(st, n), Coro.riga(st, n)) : undefined });
      const where = (a.pop.at && a.pop.at.label) || (Game.nearestPlace ? Game.nearestPlace(a.x, a.y).name : '');
      callBackend({
        kind: 'chiacchiera',
        npcA: info(a), npcB: info(b),
        context: `Tipo di scambio: ${kind}. Vicino a ${where}, ore ${Game.clockStr(st.t)}. Repressione: ${st.ris ? Math.round(st.ris.repr) : 0}.`
      }).then(r => {
        if (!r || !r.battutaA) return;
        parla(st, a, b, String(r.battutaA).slice(0, 90), r.battutaB ? String(r.battutaB).slice(0, 90) : '');
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
    nightFlush,
    state
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Mente;
}
