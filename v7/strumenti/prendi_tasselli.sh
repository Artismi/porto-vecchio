#!/bin/sh
# [tasselli] Il build di Vercel (vercel.json, buildCommand): scarica la città a tasselli cotta per l'impronta di questa pagina
# (v7/index.html, PV_IMPRONTA_TASS) dalla release «tasselli-<impronta>» del repository (la fa .github/workflows/tasselli.yml) e la
# mette in v7/tasselli/. Se la release non c'è ancora (la cottura dura 20-30 min dopo il push) non è un errore: il sito va lo stesso
# e il gioco costruisce la città nel browser come prima; quando la cottura finisce, il workflow chiede un nuovo deploy.
#   sh strumenti/prendi_tasselli.sh            (dalla cartella v7, o da qualunque cartella: il percorso è quello dello script)
# PV_TASSELLI_REPO=proprietario/nome: un altro repository (di difetto quello del deploy, VERCEL_GIT_REPO_OWNER/SLUG, se no Artismi/porto-vecchio)
V7=$(cd "$(dirname "$0")/.." && pwd)
IMP=$(grep -o "PV_IMPRONTA_TASS = '[0-9a-f]*'" "$V7/index.html" | head -1 | grep -o "[0-9a-f]\{16\}")
if [ -z "$IMP" ]; then echo "[tasselli] impronta non trovata in index.html: niente tasselli"; exit 0; fi
if [ -f "$V7/tasselli/indice.json" ] && grep -q "\"impronta\":\"$IMP\"" "$V7/tasselli/indice.json"; then echo "[tasselli] $IMP già qui"; exit 0; fi
if [ -n "${PV_TASSELLI_REPO:-}" ]; then REPO=$PV_TASSELLI_REPO
elif [ -n "${VERCEL_GIT_REPO_OWNER:-}" ] && [ -n "${VERCEL_GIT_REPO_SLUG:-}" ]; then REPO=$VERCEL_GIT_REPO_OWNER/$VERCEL_GIT_REPO_SLUG
else REPO=Artismi/porto-vecchio; fi
URL="https://github.com/$REPO/releases/download/tasselli-$IMP/tasselli.tar.gz"
TMP=$(mktemp -d)
if curl -fsSL --retry 3 --connect-timeout 20 -o "$TMP/t.tgz" "$URL" && tar xzf "$TMP/t.tgz" -C "$TMP" && grep -q "\"impronta\":\"$IMP\"" "$TMP/tasselli/indice.json"; then
  rm -rf "$V7/tasselli" && mv "$TMP/tasselli" "$V7/tasselli" && echo "[tasselli] $IMP scaricati: $(du -sh "$V7/tasselli" | cut -f1)"
else
  echo "[tasselli] $IMP non ancora cotti ($URL): il gioco costruirà la città nel browser"
fi
rm -rf "$TMP"
exit 0
