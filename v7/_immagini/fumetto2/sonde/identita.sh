#!/bin/bash
# [fumetto] A senza ?stile contro la build di partenza (85a0971, estratta a parte con git archive e ricostruita): le stesse due inquadrature,
# una pagina alla volta. Poi: python3 identita.py
cd "$(dirname "$0")"
PV_ROOT=${BASE:-/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/fumetto_base/v7} TEMPI=1 node scatti.js 'leggera&tassellivecchi' '' idbase piazza,lungomare > run_idbase.log 2>&1
TEMPI=1 node scatti.js 'leggera&tassellivecchi' '' idnuovo piazza,lungomare > run_idnuovo.log 2>&1
