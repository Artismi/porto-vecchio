#!/bin/bash
# [camera9] le ultime sonde, una pagina alla volta dal cancello comune: le foto dei posti stretti, la prova di fumo, i percorsi della
# versione finale (il vicolo stretto con la striscia, Vico Lungo). uso: catena2.sh <cartella dei log> <cartella del gioco>
L="$1"; V="$2"; cd "$(dirname "$0")"
bash riprova.sh "$L/stretti.log" "fine stretti" node tavola9.js stretti 10
bash riprova.sh "$L/fumo.log" "errori" node /tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/fumo/fumo6.js "$V" "$L/fumo.png"
bash riprova.sh "$L/misura.log" "c9 vico_lungo" node misura9.js oggi,c9 "vicolo_pescatori,vico_lungo" "leggera&tassellivecchi"
echo fatto > "$L/catena.fine"
