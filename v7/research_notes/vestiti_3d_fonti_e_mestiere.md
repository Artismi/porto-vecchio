# Vestiti 3D: fonti utilizzabili e come si fanno nei giochi (ottobre 2026)

## 1. Cosa abbiamo già (scoperta)

I personaggi del gioco (`assets/mc`: Casual, Casual_2, Casual_Hoodie, Formal, Worker) vengono dai pacchetti **Quaternius Ultimate Modular Men / Women** (CC0). Ogni personaggio è diviso in **4 mesh: Head, Body, Legs, Feet**, tutte sullo **stesso scheletro** (`CharacterArmature`: Hips, Abdomen, Torso, Chest, Neck, Head, Shoulder/UpperArm/LowerArm/Wrist, dita, UpperLeg/LowerLeg). Circa 5-6 mila triangoli per personaggio, colori a materiali piatti (niente texture).

Quindi i busti, le gambe e i piedi di personaggi diversi **si scambiano già senza compenetrazioni**: è il sistema di San Andreas (un modello per parte del corpo).

## 2. Fonti utilizzabili (licenza verificata sulla pagina dell'autore)

| Fonte | Cosa c'è | Licenza | Formato | Utile per noi |
|---|---|---|---|---|
| [Quaternius Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) | 11 personaggi in 4 pezzi: Adventurer, **Beach**, Casual_2, Casual_Hoodie, Farmer, King, **Punk**, Spacesuit, **Suit**, **Swat**, Worker | CC0 | glTF, FBX, OBJ, Blend | **Sì, subito**: stesso scheletro dei nostri. Ci mancano Suit, Punk, Beach, Swat, Farmer |
| [Quaternius Ultimate Modular Women](https://quaternius.com/packs/ultimatemodularwomen.html) | 10 personaggi: Adventurer, Casual, Formal, Medieval, **Punk**, SciFi, Soldier, **Suit**, Witch, Worker | CC0 | glTF, FBX, OBJ, Blend | **Sì, subito** (stesso sistema) |
| [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) | 6 corpi base (proporzioni Superhero, Regular, Teen), 20 acconciature, ~13k triangoli | CC0 | glTF, FBX | Corpi più curati, ma **scheletro diverso** (humanoid "universal"): servirebbe un cambio di scheletro |
| [Quaternius Modular Character Outfits – Fantasy](https://quaternius.itch.io/modular-character-outfits-fantasy) | 12 vestiti in 62 pezzi, per i corpi Universal | CC0 | glTF, Blend | Solo per **studiare** come sono fatti i pezzi (fantasy, non il nostro stile) |
| [Kenney Blocky / Animated Characters](https://opengameart.org/content/blocky-characters) | Personaggi a blocchi con skin PNG | CC0 | glTF, FBX | No: stile a blocchi |
| [100Avatars (Polygonal Mind / ToxSam)](https://github.com/toxsam/open-source-avatars) | Centinaia di avatar interi (VRM/FBX) | CC0 (da verificare per avatar) | VRM, FBX, glTF | Poco: avatar interi, non pezzi; scheletri propri |
| [Synty POLYGON City Characters](https://assetstore.unity.com/packages/slug/106757) | 19 personaggi di città, tra cui un gangster | **A pagamento**, licenza Unity ("Restricted") | FBX (Unity) | No: licenza legata a Unity, non adatta a un gioco nel browser distribuito così |
| Mixamo (Adobe) | Personaggi riggati | Uso nei giochi sì, **vietato distribuire i file grezzi** | FBX | No: nel browser i file sono scaricabili, cioè distribuiti |
| Ready Player Me | Avatar e vestiti | CC BY-NC-SA (non commerciale) | glTF | No |
| VRoid, Booth, Gumroad | Vestiti anime per VRoid | Licenze varie, a pagamento | VRM | No |

**Download**: i file Quaternius sono sulla cartella Google Drive ufficiale linkata dalla pagina del pacchetto. Il 19 ottobre Drive rispondeva "quota superata" (troppi download): va riprovato più tardi o scaricato a mano dalla pagina.

**Siti scartati**: i mirror di terzi (itch.io non ufficiali, poly.pizza per i pacchetti Quaternius) riportano licenze diverse da quella dell'autore (CC BY invece di CC0). Si prende sempre dalla pagina dell'autore e si controlla il `License.txt` nel pacchetto.

**Mancano** pacchetti gratuiti e affidabili di streetwear moderno (tute, polo, felpe larghe, piumini). Non esistono, o non hanno licenze chiare.

## 3. Il mestiere: come si fanno i vestiti nei giochi (quello che sbagliavamo)

1. **Il vestito sostituisce la parte del corpo, non ci sta sopra.** In San Andreas ogni capo è un modello per zona (busto, gambe, scarpe, collana, orologio, occhiali, cappello) che prende il posto della parte del corpo ([Sanny Builder, Player Clothes](https://docs.sannybuilder.com/scm-documentation/sa/clothes)). Chi fa personaggi modulari toglie il corpo sotto i vestiti ([Polycount](https://polycount.com/discussion/comment/2636650), [Polycount](https://polycount.com/discussion/comment/2636663)).
2. **Il modello è il taglio, la texture è il colore.** In San Andreas pochi modelli per tanti capi: `suit1` ha 6 texture (grigio, nero, rosso, blu, giallo, gang), `tshirt` ha 5 stampe, `hoodyA` 3 colori; `trackytop1` fa da tuta, da felpa e da giacca sportiva cambiando solo la texture ([Sanny Builder](https://docs.sannybuilder.com/scm-documentation/sa/clothes)). Il nostro inventario deve funzionare così: **capo = taglio (mesh disegnata) + colore e stampa (texture generata)**.
3. **Gli strati si risolvono con una priorità, non con la geometria calcolata.** In Cyberpunk 2077 ogni pezzo ha un punteggio (interno < camicia < giacca): quello sopra schiaccia quello sotto con deformazioni **preparate a mano** (shape key), e il corpo non si deforma mai ([RED Modding wiki, Garment Support](https://wiki.redmodding.org/cyberpunk-2077-modding/for-mod-creators-theory/3d-modelling/garment-support-how-does-it-work)). Le maniche sotto una giacca si nascondono pezzo per pezzo ([RED Modding wiki](https://wiki.redmodding.org/cyberpunk-2077-modding/modding-guides/items-equipment/influencing-other-items)).
4. **La forma la decide la sagoma.** Prima la silhouette, poi gli spigoli che servono a piegare (spalle, gomiti, polsi, collo); ogni spigolo deve avere un motivo ([Polycount wiki, Topology](http://wiki.polycount.com/wiki/Topology), [Polycount](https://polycount.com/discussion/195100/updated-thread-critique-topology-designed-for-animation)). I dettagli piccoli (tasche, cuciture) stanno nella texture; nella mesh solo quello che cambia il contorno (bavero, cappuccio, falda) ([Polycount wiki](http://wiki.polycount.com/wiki/Topology)).
5. **Colletti e revers: un pezzo vero con spessore**, modellato dentro il busto della giacca e non appoggiato da un sistema a parte ([Polycount](https://polycount.com/discussion/comment/1659077), [Blender Artists](https://blenderartists.org/t/lowpoly-cloth-modeling-need-workflow-advice/653140)).
6. **Nel low poly quasi tutto il dettaglio è nella texture**, con UV compatte e una texture per personaggio (ogni texture in più è una draw call) ([Polycount](https://polycount.com/discussion/comment/564364)).

## 4. Cosa ne segue per il gioco

- **Busto, gambe e piedi** vengono da pezzi modellati (Quaternius adesso, poi pezzi nostri), uno per taglio: completo, felpa, maglietta, giubbotto, tuta… Si scambiano interi. Niente vestiti calcolati sopra il corpo.
- **L'inventario sceglie il taglio** con la priorità degli strati (il capo più esterno del busto dà il pezzo del busto). Quello che spunta da sotto (polsini, colletto, orlo) è una **variante del pezzo**, preparata, non calcolata.
- **Colori, righe, gessato, stampe e loghi** si generano sui materiali e sulle texture dei pezzi: è lì che serve il codice, e lì funziona.
- **I tagli che mancano** (tuta, polo, felpa larga, piumino) vanno modellati sullo stesso scheletro: in Blender da una persona, oppure in codice con forme semplici e sagome nette, partendo dai pezzi esistenti come base.
