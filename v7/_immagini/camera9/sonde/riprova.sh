#!/bin/bash
# [camera9] rilancia una sonda finché non arriva in fondo (la pagina può morire per la memoria, con altri agenti sulla macchina). Ogni
# lancio passa dal cancello comune dei browser (PORTA, se c'è: due pagine alla volta su tutta la macchina).
# uso: riprova.sh <log> <segno di fine> <comando...>
LOG="$1"; FINE="$2"; shift 2
PORTA=/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/browser_slot.sh
for i in 1 2 3 4 5 6 7 8 9 10; do
  if [ -f "$PORTA" ]; then bash "$PORTA" "$@" > "$LOG" 2>&1; else "$@" > "$LOG" 2>&1; fi
  if grep -q "$FINE" "$LOG"; then exit 0; fi
  cp "$LOG" "$LOG.fallito$i"; sleep 30
done
exit 1
