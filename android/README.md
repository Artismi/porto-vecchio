# Porto Vecchio per Android

Una WebView a schermo intero, immersiva, in orizzontale, che apre il gioco di `v7/` dagli asset dell'APK
(`https://appassets.androidplatform.net/index.html`, servito da `WebViewAssetLoader`: niente `file://`).

- Entrano `index.html`, `mondo_cotto.js`, `tag_firme.json`, `assets/` (senza i `.json.js` di `file://`) e `tasselli/`.
  La build si ferma se i tasselli mancano o sono di un'altra impronta (sul telefono la città si costruirebbe nel browser).
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
