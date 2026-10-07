#!/bin/bash
# Importa i modelli scaricati (zip, 3DS, OBJ, FBX, glTF/GLB) nel formato del gioco (glTF JSON con buffer e texture incorporati).
#   strumenti_inverno/importa/importa.sh cartella_uscita file1.zip [file2.fbx ...]
# Per ogni file: estrae (lo zip in una cartella sua), trova il modello, lo converte in GLB (FBX2glTF per FBX, assimp per 3DS/OBJ),
# ritrova le texture per nome (anche i nomi a 8 caratteri dei 3DS), semplifica sopra TRI triangoli (meshoptimizer),
# rimpicciolisce le texture a MAXPX, scrive <nome>.json. Poi dalla cartella si sceglie cosa mettere in assets/ e in Scaricati.CAT.
# Strumenti (una volta): TOOLS=cartella; cd $TOOLS && npm i fbx2gltf assimpjs meshoptimizer @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
set -u
HERE=$(cd "$(dirname "$0")" && pwd); TOOLS=${TOOLS:?serve TOOLS con i moduli npm}; OUT=$1; shift; mkdir -p "$OUT"
TRI=${TRI:-8000}; MAXPX=${MAXPX:-512}; ERR=${ERR:-0.05}
cp "$HERE"/conv3ds.js "$HERE"/semplifica.mjs "$TOOLS"/
for SRC in "$@"; do
  base=$(basename "$SRC"); W=$(mktemp -d "$OUT/.lavoro_XXXX")
  case "$SRC" in *.zip) unzip -q -o "$SRC" -d "$W/x";; *) mkdir -p "$W/x"; cp "$SRC" "$W/x/";; esac
  rm -rf "$W/x/__MACOSX"
  M=$(find "$W/x" -type f \( -iname '*.glb' -o -iname '*.gltf' \) | head -1); [ -z "$M" ] && M=$(find "$W/x" -type f -iname '*.fbx' | head -1)
  [ -z "$M" ] && M=$(find "$W/x" -type f -iname '*.obj' | head -1); [ -z "$M" ] && M=$(find "$W/x" -type f -iname '*.3ds' | head -1)
  if [ -z "$M" ]; then echo "-- $base: nessun modello (solo texture?)"; continue; fi
  N=$(basename "$M" | sed 's/\.[^.]*$//; s/[^A-Za-z0-9]/_/g'); TD=$(dirname "$M")
  case "${M,,}" in
    *.fbx) "$TOOLS"/node_modules/fbx2gltf/bin/Linux/FBX2glTF -b -i "$M" -o "$W/$N" >/dev/null 2>&1;;
    *.glb) cp "$M" "$W/$N.glb";;
    *.gltf) (cd "$TOOLS" && node -e "const{NodeIO}=require('@gltf-transform/core');new NodeIO().read('$M').then(d=>new NodeIO().write('$W/$N.glb',d))");;
    *) (cd "$TOOLS" && node conv3ds.js "$M" "$W/x" "$W/$N.glb" >/dev/null);;
  esac
  [ -f "$W/$N.glb" ] || { echo "-- $base: conversione fallita"; continue; }
  python3 -I "$HERE"/glb2json_tex.py "$W/$N.glb" "$W/x" "$W/$N.gltf" | grep -E "manca" ; mv "$W/$N.gltf" "$W/${N}_t.gltf"
  (cd "$TOOLS" && ERR=$ERR node semplifica.mjs "$W/${N}_t.gltf" "$W/${N}_s.glb" "$TRI" 2>/dev/null | grep -- '->')
  MAXPX=$MAXPX python3 -I "$HERE"/glb2json_tex.py "$W/${N}_s.glb" "$W/x" "$OUT/$N.json" | grep -v '^  texture'
  echo "   ($base)"
done
