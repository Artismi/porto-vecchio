# Porto Vecchio per Android

Una WebView a schermo intero, immersiva, in orizzontale, che apre il gioco di `v7/` dagli asset dell'APK
(`https://appassets.androidplatform.net/index.html`, servito da `WebViewAssetLoader`: niente `file://`).

- Entrano `index.html`, `mondo_cotto.js`, `tag_firme.json` e `assets/` senza doppioni: dei modelli solo il `.glb.gz` (niente `.glb`,
  `.json`, `.json.js`). I `.gz` stanno negli asset come `.gz.pv` (aapt toglierebbe l'estensione) e MainActivity li serve col nome vero.
- Di serie l'APK leggero (~22 MB): senza i tasselli, la città si costruisce sul telefono all'avvio (come `?tasselli=0`); le correzioni
  delle insegne vive vengono dalla cottura (`tasselli/insegne4.json`). `./gradlew assembleRelease -PconTasselli`: anche i tasselli
  (~75 MB, solo le tessiture del telefono), il telefono non costruisce la città.
- La build si ferma se i tasselli locali non sono dell'impronta della pagina (servono almeno per `insegne4.json`).
- `/api/` (la mente dei personaggi, lo stato, i ritocchi) risponde 503: il gioco usa il ripiego senza rete. Nessuna chiave nell'APK.
- Indietro manda Esc alla pagina; due volte entro 2 s esce. Audio senza il primo tocco, schermo sempre acceso.
- Sul telefono il gioco sceglie da solo il profilo leggero (puntatore a tocco).
- I caratteri di Google Fonts arrivano solo con la rete (permesso INTERNET); senza, quelli di sistema.

## Costruire

```bash
cd v7 && python3 build.py --tasselli      # i tasselli della build di adesso
cd ../android
export ANDROID_HOME=/percorso/sdk           # platforms;android-36, build-tools;36.0.0
export PV_KEYSTORE=/fuori/dal/repo/portovecchio-release.jks PV_KEYSTORE_PASS=...   # senza: APK non firmato
./gradlew assembleRelease                   # app/build/outputs/apk/release/app-release.apk
```

Il keystore non sta mai nel repo. L'icona: `app/src/main/res/drawable/ic_primo_piano.xml` (adattiva) e `python3 icona.py` (PNG per Android 7).
