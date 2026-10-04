// Costruisce i "kit" di modelli: un GLB per pacchetto, un nodo per modello (nome = chiave).
// Uso: node tools/pack.mjs   (le sorgenti sono in ../assets, vedi SRC)
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, dedup, prune, unpartition, weld, quantize, textureCompress } from '@gltf-transform/functions';
import { execFileSync } from 'child_process';
import fs from 'fs'; import path from 'path';
const A = '/root/pv/assets', TMP = '/root/pv/tmp/fbx'; fs.mkdirSync(TMP, { recursive: true });
const FBX2 = '/root/pv/node_modules/fbx2gltf/bin/Linux/FBX2glTF';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const K = (pack, n) => `${A}/${pack}/Models/GLB format/${n}.glb`;
const TOON = `${A}/Toon_Shooter_Game_Kit_-_Dec_/Toon Shooter Game Kit - Dec 2022`;
const toon = n => fs.existsSync(`${TOON}/Environment/glTF/${n}.gltf`) ? `${TOON}/Environment/glTF/${n}.gltf` : `${TOON}/Guns/glTF/${n}.gltf`;
const fbx = (p) => { const out = `${TMP}/${path.basename(p, '.fbx').replace(/\W/g, '_')}`; if (!fs.existsSync(out + '.glb')) execFileSync(FBX2, ['-b', '-i', p, '-o', out], { stdio: 'ignore' }); return out + '.glb'; };
const list = (fn, names) => Object.fromEntries(names.map(n => [n, fn(n)]));
export const KITS = {
  shooter: list(toon, ['ExplodingBarrel', 'ExplodingBarrel_Spilled', 'GasTank', 'GasCan', 'Health', 'Crate', 'CardboardBoxes_1', 'CardboardBoxes_2', 'CardboardBoxes_3', 'CardboardBoxes_4', 'Pallet', 'Pallet_Broken', 'SackTrench', 'SackTrench_Small', 'Container_Small', 'Container_Long', 'Debris_Tires', 'Debris_Papers_1', 'Debris_Papers_2', 'Debris_Papers_3', 'Debris_BrokenCar', 'Debris_Pile', 'TrashContainer', 'TrashContainer_Open', 'Barrier_Single', 'Barrier_Large', 'MetalFence', 'WaterTank_Floor', 'Pipes', 'WoodPlanks', 'Sofa_Small', 'Key']),
  water: list(n => K('kenney_watercraft-pack', n), ['boat-fishing-small', 'boat-row-large', 'boat-row-small', 'boat-sail-a', 'boat-sail-b', 'boat-speed-a', 'boat-speed-e', 'boat-speed-g', 'boat-tug-a', 'boat-house-a', 'boat-house-c', 'buoy', 'buoy-flag', 'cargo-container-a', 'cargo-container-b', 'cargo-container-c', 'cargo-pile-a', 'cargo-pile-b', 'ramp-wide']),
  train: list(n => K('kenney_train-kit', n), ['train-carriage-box', 'train-carriage-tank', 'train-carriage-lumber', 'train-carriage-flat', 'train-carriage-container-red', 'train-diesel-a', 'railroad-rail-straight', 'railroad-straight']),
  urban: list(n => K('kenney_retro-urban-kit', n), ['detail-dumpster-closed', 'detail-dumpster-open', 'detail-barrier-strong-type-a', 'detail-barrier-strong-damaged', 'detail-barrier-type-a', 'scaffolding-poles', 'scaffolding-floor', 'scaffolding-structure', 'balcony-ladder-top', 'balcony-ladder-bottom', 'detail-awning-wide', 'pallet', 'pallet-small', 'planks', 'truck-green', 'truck-grey', 'truck-green-cargo', 'detail-light-traffic', 'detail-cables-type-a']),
  food: list(n => K('kenney_food-kit', n), ['watermelon', 'tomato', 'apple', 'orange', 'lemon', 'pear', 'grapes', 'banana', 'pineapple', 'cabbage', 'carrot', 'eggplant', 'paprika', 'onion', 'pumpkin', 'fish', 'mussel', 'loaf', 'loaf-baguette', 'bread', 'cheese', 'barrel', 'wine-red', 'wine-white', 'bottle-oil', 'pizza', 'pizza-box', 'ice-cream', 'cup-coffee', 'soda-can-crushed', 'can', 'glass-wine', 'mug', 'croissant', 'whole-ham']),
  arcade: list(n => K('kenney_mini-arcade', n), ['pinball', 'arcade-machine', 'claw-machine', 'air-hockey', 'vending-machine', 'gambling-machine', 'dance-machine']),
  grave: list(n => K('kenney_graveyard-kit_5.0', n), ['gravestone-cross', 'gravestone-cross-large', 'gravestone-round', 'gravestone-roof', 'gravestone-wide', 'gravestone-bevel', 'gravestone-broken', 'gravestone-decorative', 'grave', 'grave-border', 'crypt', 'crypt-a', 'crypt-b', 'crypt-small', 'crypt-small-roof', 'iron-fence', 'iron-fence-border', 'iron-fence-border-column', 'iron-fence-border-gate', 'iron-fence-damaged', 'pillar-obelisk', 'pillar-small', 'cross-column', 'lantern-candle', 'lightpost-single', 'pine-crooked', 'pine', 'urn-round', 'candle-multiple', 'bench', 'stone-wall', 'stone-wall-column', 'coffin-old', 'altar-stone']),
  rurban: list(n => K('kenney_retro-urban-kit', n), ['wall-a','wall-a-window','wall-a-flat-window','wall-a-door','wall-a-garage','wall-a-flat-garage','wall-a-detail','wall-a-detail-painted','wall-a-painted','wall-a-flat','wall-a-flat-painted','wall-a-corner','wall-a-corner-painted','wall-a-column','wall-a-column-painted','wall-a-low','wall-a-low-painted','wall-a-open','wall-a-roof','wall-a-roof-detailed','wall-a-roof-slant','wall-a-roof-slant-detailed','wall-a-diagonal','wall-b','wall-b-window','wall-b-flat-window','wall-b-door','wall-b-garage','wall-b-flat-garage','wall-b-detail-painted','wall-b-flat','wall-b-corner','wall-b-column','wall-b-low','wall-b-open','wall-b-roof','wall-b-roof-detailed','wall-b-roof-slant','wall-b-roof-slant-detailed','wall-c-flat','wall-c-flat-low','wall-type-a','wall-type-b','wall-broken-type-a','wall-broken-type-b','wall-fence','wall-steps-type-a','window-small-type-a','window-small-type-b','window-wide-type-a','window-wide-type-b','window-wide-type-c','window-wide-type-d','door-type-a','door-type-b','balcony-type-a','balcony-ladder-top','balcony-ladder-bottom','roof-metal-type-a','roof-metal-type-b','roof-metal-poles','detail-awning-small','detail-awning-wide','detail-beam','detail-block','detail-bricks-type-a','detail-bricks-type-b','detail-light-single','detail-light-double','detail-cables-type-b','scaffolding-poles','scaffolding-floor','scaffolding-structure','tree-large','tree-park-large','tree-small','tree-shrub','tree-pine-large','detail-bench']),
  bkit: list(n => K('kenney_building-kit', n), ['wall','wall-half','wall-low','wall-corner','wall-corner-column','wall-corner-column-bottom','wall-corner-round','wall-doorway-round','wall-doorway-square','wall-doorway-wide-round','wall-doorway-wide-square','wall-window-round','wall-window-round-detailed','wall-window-square','wall-window-square-detailed','wall-window-wide-round','wall-window-wide-round-detailed','wall-window-wide-square','wall-window-wide-square-detailed','border','border-corner','border-corner-round','border-high','border-high-corner','border-high-corner-round','column','column-thin','column-wide','roof-flat-center','roof-flat-side','roof-flat-corner','roof-flat-square','roof-flat-patch','floor','stairs-open','stairs-closed','door-rotate-round-a','door-rotate-square-a','gutter-vertical','plating','barricade-window-a','detail-pipe']),
  misc: {
    'ferris': `${A}/Race_kit.undefined-zip/Ferris wheel/SM_FerrisWheel_02.obj`,
    'flower-bushes': fbx(`${A}/Race_kit.undefined-zip/Flower Bushes/FlowerBushes.fbx`),
    'firstaid': fbx(`${A}/Survival_Pack_-_Sept_2020-20/Survival Pack - Sept 2020/FBX/FirstAidKit.fbx`),
    'propane': fbx(`${A}/Survival_Pack_-_Sept_2020-20/Survival Pack - Sept 2020/FBX/PropaneTank.fbx`),
    'radio': fbx(`${A}/Survival_Pack_-_Sept_2020-20/Survival Pack - Sept 2020/FBX/Radio.fbx`),
    'nbush1': fbx(`${A}/Simple_Nature_Pack_-_Dec_201/Simple Nature Pack - Dec 2016/FBX/Bush1.fbx`),
    'nbush2': fbx(`${A}/Simple_Nature_Pack_-_Dec_201/Simple Nature Pack - Dec 2016/FBX/Bush2.fbx`),
    'nbush3': fbx(`${A}/Simple_Nature_Pack_-_Dec_201/Simple Nature Pack - Dec 2016/FBX/Bush3.fbx`),
    'nrock1': fbx(`${A}/Simple_Nature_Pack_-_Dec_201/Simple Nature Pack - Dec 2016/FBX/Rock1.fbx`),
    'nrock2': fbx(`${A}/Simple_Nature_Pack_-_Dec_201/Simple Nature Pack - Dec 2016/FBX/Rock2.fbx`),
    'nrock3': fbx(`${A}/Simple_Nature_Pack_-_Dec_201/Simple Nature Pack - Dec 2016/FBX/Rock3.fbx`),
    'ngrass1': fbx(`${A}/Simple_Nature_Pack_-_Dec_201/Simple Nature Pack - Dec 2016/FBX/Grass1.fbx`),
    'ngrass2': fbx(`${A}/Simple_Nature_Pack_-_Dec_201/Simple Nature Pack - Dec 2016/FBX/Grass2.fbx`),
  },
};
async function build(kit, items) {
  const out = new Document(); out.createBuffer(); const scene = out.createScene('kit');
  for (const [key, file] of Object.entries(items)) {
    if (!fs.existsSync(file)) { console.warn('manca', key, file); continue; }
    let src;
    if (file.endsWith('.obj')) { const g = '/root/pv/tmp/obj_' + key + '.glb'; if (!fs.existsSync(g)) execFileSync('npx', ['obj2gltf', '-b', '-i', file, '-o', g], { stdio: 'ignore' }); src = await io.read(g); }
    else src = await io.read(file);
    const before = new Set(out.getRoot().listNodes());
    const map = mergeDocuments(out, src);
    const srcScene = src.getRoot().getDefaultScene() || src.getRoot().listScenes()[0];
    const holder = out.createNode(key);
    for (const n of srcScene.listChildren()) holder.addChild(map.get(n));
    scene.addChild(holder);
    for (const s of out.getRoot().listScenes()) if (s !== scene) s.dispose();
    for (const b of out.getRoot().listBuffers().slice(1)) b.dispose();
  }
  for (const a of out.getRoot().listAccessors()) a.setBuffer(out.getRoot().listBuffers()[0]);
  await out.transform(dedup(), prune(), weld(), quantize({ quantizePosition: 14 }), unpartition());
  const OUT = process.env.OUT || 'models'; fs.mkdirSync(OUT, { recursive: true });
  await io.write(`${OUT}/kit_${kit}.glb`, out);
  console.log(kit, Object.keys(items).length, fs.statSync(`${OUT}/kit_${kit}.glb`).size);
}
for (const [k, v] of Object.entries(KITS)) if (!process.argv[2] || process.argv.includes(k)) await build(k, v);
