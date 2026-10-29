# Font dei graffiti

Font liberi da Google Fonts (github.com/google/fonts), ridotti alle lettere latine (U+0020-007E, U+00C0-00FF) e compressi in
woff2 con fontTools. Licenze: SIL Open Font License 1.1 o Apache 2.0, i testi completi in `licenze/`. Si usano per costruire le
lettere di tag, throw-up e pezzi (`src/writer_arte.js`, sezione «I FONT»); `strumenti_inverno/fonts_graffiti.py` li incorpora in
`src/fonts_graffiti.js` (base64), che il gioco e il disegnatore a parte caricano come FontFace.

| uso | font |
| --- | --- |
| tag | Sedgwick Ave Display, Sedgwick Ave, Permanent Marker, Rock Salt, Mansalva, Marck Script, Lacquer, Reenie Beanie, Covered By Your Grace, Knewave |
| throw-up | Modak, Sniglet ExtraBold, Chewy, Freckle Face, Kavoon, Titan One, Luckiest Guy, Londrina Solid Black |
| pezzi | Knewave, Shrikhand, Bangers, Ranchers, Shojumaru, Carter One, Rubik Wet Paint (e le mani da tag ingrassate) |
| rulli, stencil | Bungee, Erica One, Black Ops One |
