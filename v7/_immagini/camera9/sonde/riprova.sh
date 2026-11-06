#!/bin/bash
# [camera9] rilancia una sonda finché non arriva in fondo (la pagina può morire per la memoria, con altri agenti sulla macchina)
# uso: riprova.sh <log> <segno di fine> <comando...>
LOG="$1"; FINE="$2"; shift 2
for i in 1 2 3 4; do
  "$@" > "$LOG" 2>&1
  if grep -q "$FINE" "$LOG"; then exit 0; fi
  cp "$LOG" "$LOG.fallito$i"
done
exit 1
