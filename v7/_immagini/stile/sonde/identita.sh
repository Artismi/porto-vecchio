#!/bin/bash
# [stile] A senza ?stile contro la build di partenza (1345b99): le stesse due inquadrature, una pagina alla volta
cd "$(dirname "$0")"
PV_ROOT=/tmp/claude-0/-home-user/b7133111-ab7a-5dc5-8f88-7c780cd73e51/scratchpad/base_v7/v7 node scatti.js 'leggera&tassellivecchi' '' idbase piazza,lungomare > run_idbase.log 2>&1
node scatti.js 'leggera&tassellivecchi' '' idnuovo piazza,lungomare > run_idnuovo.log 2>&1
