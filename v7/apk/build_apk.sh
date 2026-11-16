#!/bin/bash
# Costruisce PortoVecchio.apk: una WebView a tutto schermo sul sito di Artismi (https://www.artismidesignstudio.com/porto-vecchio,
# il gioco nel Game Boy). Online: nessuna copia del gioco nell'APK. Serve l'SDK Android (build-tools 34, platform 34) e un JDK.
# Uso: v7/apk/build_apk.sh   →   v7/PortoVecchio.apk (firmato con dbg.ks, chiave di prova, password android)
set -euo pipefail
export JAVA_TOOL_OPTIONS=
SDK=${ANDROID_HOME:-/opt/android}; BT=$SDK/build-tools/34.0.0; PJ=$SDK/platforms/android-34/android.jar
HERE=$(cd "$(dirname "$0")" && pwd); OUT=$HERE/../PortoVecchio.apk
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
cd "$HERE"
"$BT/aapt2" compile --dir res -o "$W/res.zip"
"$BT/aapt2" link -o "$W/base.apk" -I "$PJ" --manifest AndroidManifest.xml "$W/res.zip" --min-sdk-version 26 --target-sdk-version 34
mkdir "$W/obj" "$W/dex"
javac --release 8 -nowarn -classpath "$PJ" -d "$W/obj" src/it/artismi/portovecchio/*.java   # niente classi anonime: d8 ci cade
"$BT/d8" --min-api 26 --lib "$PJ" --output "$W/dex" $(find "$W/obj" -name "*.class")
cp "$W/base.apk" "$W/un.apk"; (cd "$W/dex" && zip -q ../un.apk classes.dex)
"$BT/zipalign" -f -p 4 "$W/un.apk" "$W/al.apk"
"$BT/apksigner" sign --ks dbg.ks --ks-pass pass:android --key-pass pass:android --out "$OUT" "$W/al.apk"
rm -f "$OUT.idsig"
ls -l "$OUT"
