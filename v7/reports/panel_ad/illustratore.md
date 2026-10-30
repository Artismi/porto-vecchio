# Illustratore: lo shader come firma, il tratto come attitudine

Foto viste: 21, 10, 07, 02, 18. La 19 (notte) non era ancora pronta quando ho chiuso. Codice letto: PELL, NIT, sguProPezzi, sguPasso.

## 1. Da proteggere
- **Il sole caldo sui volumi crema e ocra**: gli archi in 02, le facciate in 07 (`#ee9e6f`, L .69). È già illustrazione.
- **Il colore sulle cose, non nel filtro**: il bus giallo e la casa menta-rosa (10), le tende a righe, i panni stesi (18).
- **Il ciglio prugna di NIT** (`vec3(.34,.27,.36)`) e il nero caldo di `SG_STR`: sono il seme del tratto.

## 2. Difetti
- **L'ombra è un buco blu notte.** Nella Rua (21) la strada in ombra è `#27324a` (L .19, circa il 35% del quadro); in 07 è `#343e54`. A mezzogiorno si legge come notte, cioè Grande Fratello.
- **Lastre morte in primo piano**: il tetto beige in 02 (40% del quadro), la lamiera grigia `#7a7575` in 10, il kaki e il mattone in 18 (60%). Sono le cose più grandi e le più da catalogo.
- **La piazza brucia**: in 10 è a L .78, e la saturazione dell'immagine è .23.
- **Terrazzi a parquet** (`#804415`, in 21 e 02): sembrano un pavimento di casa.
- **Il letterbox curvo**: le bande si calcolano su `vUv` deformato, quindi il fish-eye le piega (21).
- **Il personaggio** si legge solo come sagoma arancio dietro i muri (21, 02); in 18 non si trova.
- **Le cartacce a pieno contrasto** (10) fanno sale e pepe.

## 3. Proposte, per impatto

**A. L'ombra colorata e chiara** (costo ~0). Bersaglio: L 0,30-0,36 di giorno.
- `proTintaK` .2 → .3 e `proTinta` → `#4a6ad0` a mattino e pomeriggio.
- In `SG_STR`, solo dove la tinta è fredda: `c += (1.-smoothstep(.12,.32,lp))*step(c.r,c.b)*vec3(.03,.035,.06)`.
- Prova: la mediana dell'ombra nelle foto 21 e 07 deve arrivare a ≥ .30.

**B. Il tratto da pennarello** (`sguPasso`, al posto della `sil` di `nA.w`, e lo stesso sul `ciglio`):
1. *Spessore che pesa*: i vicini di profondità letti a `e*mix(1.,2.4,peso)`. `peso` cresce col salto di profondità e al piede (primi 2,5 m sopra il piano del personaggio, da `nQ`).
2. *Pressione della mano*: un rumore ancorato al mondo (serve una riga di camera in più, `nY3`) dà `0.65+0.5*n`; per l'8% del tratto la penna salta.
3. *Inchiostro che si somma*: `c*c*.85+vec3(.035,.02,.05)`. La linea è il colore della cosa, più scuro e più saturo, come un Copic.
- Costo: 4 letture di profondità in più sul computer.
- Telefono: un guscio rovesciato `#1e1426` (spinta di 0,025 m) solo sul protagonista e sulle comparse vicine, 1 chiamata di disegno ciascuno.

**C. Il retino nell'ombra** (`lights_fragment_end`, sul ramo `sgOmbra`, anche sul telefono). Puntini nel colore `sgP3`, sul piano scelto dalla normale: cella di 0,14 m a 45°, densità `1.-sgOmbra`, ampiezza ±.035. Sotto i 3 px di cella si spegne (`fwidth`), così niente moiré. È ancorato ai muri, non allo schermo. Costo: circa 12 operazioni per pixel. **È la firma: le ombre sono stampate.**

**D. Il terminatore a mano.** Le soglie delle celle di `dotNL` spostate di ±.05 con `sgN3(vSgW*1.6)`: il confine delle bande di luce trema come una campitura a pennarello.

**E. La tavolozza hip hop.** Gli accenti pieni, tutti insieme, sotto il 10% del quadro.

| Colore | Hex | Dove vive |
|---|---|---|
| Rosso | `#D7262E` | saracinesche (1 su 4), tute, auto |
| Giallo | `#F6C21C` | bus, Vespa, insegne |
| Blu reale | `#1E4FB4` | giacche, cappellini |
| Verde | `#1F8A4C` | persiane, chioschi |
| Fluo: magenta, acido, arancio | `#E8338F`, `#A6E22E`, `#FF7A1A` | solo nei writing e nei neon |
| Oro | `#D9A520` | catene |
| Nero e bianco | `#141016`, `#F4F1EA` | tute, scarpe |
| Muri | `#A8503A`, `#F2E2C2` | croma ≤ .45 |

Nel fondo:
- Le lastre in primo piano diventano guaina `#3a3236` con rappezzi oppure lastrico con la pittura (`pittura` .75 sulle falde piane).
- Il parquet passa a cotto spento `#b07a5c`.
- Le cartacce scendono a croma ≤ .3 e restano a ±.08 di valore dal suolo.

**F. Le quattro leve**
- *Fish-eye*: `PELL.gonfio` .055 → .045. Il letterbox va calcolato su `vUv0`. La mira passa il cursore per la stessa formula (`q*(1-g*(1-r2))`) prima del raycast: scarto 0 px.
- *Sbieco*: nella pressione del tratto; ±1,2° per edificio nella geometria (scenografo).
- *Rigonfiamento*: un tratto più spesso al piede e uno zoccolo di 0,9 m più scuro del 10%. Personaggi: scarpe ×1,25, orlo che si accumula.
- *Conflitto*: i materiali di `zoneAt()==='regime'` scrivono `gl_FragColor.a=.5` (`SG_REGIME`, costo 0). Il passo lo legge e lì disegna una linea sottile, uniforme, `#4a4e58`, senza retino né terminatore a mano. Il regime è stampato a macchina, la strada è disegnata a mano.

## 4. Agli altri cinque
- **Luci**: `soleK` ≥ 1.2 di giorno; schiarire l'ombra col cielo, non con l'esposizione.
- **Fotografo**: la pellicola non desatura l'inchiostro; la grana resta a .018, il retino è già la trama.
- **Scenografo**: la tavolozza sulle cose, non sui muri; lo sbieco nella geometria; via le lastre nude.
- **Cineasta**: mai un tetto al 40% del quadro (02, 18); il personaggio sta sul suolo, non dietro un muro.
- **Animatore**: personaggi chunky e guscio di contorno sul telefono; il tratto resta fermo nel mondo quando la camera scuote.

## Riassunto
1. Da proteggere: sole caldo sui volumi crema, colore sulle cose, ciglio prugna, nero caldo.
2. Da curare: ombra blu notte (L .19, 35% del quadro), lastre morte in primo piano, piazza bruciata, letterbox curvo, personaggio perso.
3. La firma: tratto da pennarello (spessore che pesa, pressione ancorata al mondo, inchiostro `c*c`), retino cobalto nell'ombra, terminatore a mano.
4. Tavolozza: `#D7262E` `#F6C21C` `#1E4FB4` `#1F8A4C`, i fluo solo nei writing; accenti sotto il 10%, muri con croma ≤ .45.
5. Il regime scrive alfa .5 e prende la linea tecnica senza trama: lo stile racconta il conflitto a costo zero.
