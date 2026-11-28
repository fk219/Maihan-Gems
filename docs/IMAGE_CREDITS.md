# IMAGE CREDITS — illustrative stone photography

Applies to every photograph under `apps/web/public/media/stock/`. These images
stand in for inventory while the live catalogue has no evidenced rows. They are
**illustrative photography, not stock records**: the site-wide demo badge and
per-section captions say so wherever an image appears. They are committed to the
repository and served locally; nothing is hotlinked at runtime.

## Provenance

All nine photographs were sourced from Wikimedia Commons by
`apps/web/scripts/fetch-stock-stones.mjs`, which records the source file, author
and licence per download and re-verifies each asset (JPEG magic bytes, long edge
≥ 1200 px parsed from the SOF marker). Re-run that script to re-download and
re-verify.

## Licence policy

Public domain, CC0 and CC BY only. CC BY-SA files were excluded by decision.
**Attribution is mandatory for the CC BY files below and is given in the table.**
The CC0 and public-domain files carry no attribution duty; authors are credited
regardless.

## The assets

| Committed file | What it shows | Author | Licence | Source page | Downloaded |
|---|---|---|---|---|---|
| `tanzanite.jpg` | Faceted oval violet-blue tanzanite on black | Didier Descouens | CC BY 3.0 | [File:Tanzanite taillée.jpg](https://commons.wikimedia.org/wiki/File:Tanzanite_taill%C3%A9e.jpg) | original, 1444 × 1141 |
| `tanzanite-rough.jpg` | Rough violet-blue tanzanite crystal on dark ground | Géry Parent | Public domain | [File:Tanzanite (Tanzanie).jpg](https://commons.wikimedia.org/wiki/File:Tanzanite_(Tanzanie).jpg) | 1920 px Commons render |
| `sapphire.jpg` | Oval blue sapphire with violet-pink zoning on a warm ground | Delphine Montagne | CC BY 4.0 | [File:Saphir bicolore des joyaux de la Couronne de France.jpg](https://commons.wikimedia.org/wiki/File:Saphir_bicolore_des_joyaux_de_la_Couronne_de_France.jpg) | original, 3000 × 4000 |
| `ruby.jpg` | Deep red ruby crystals in white calcite matrix on black | Géry Parent | Public domain | [File:Rubis et pyrite sur gangue (Pakistan).jpg](https://commons.wikimedia.org/wiki/File:Rubis_et_pyrite_sur_gangue_(Pakistan).jpg) | 1920 px Commons render |
| `emerald.jpg` | Vivid green emerald crystal in calcite matrix on black | Géry Parent | CC0 | [File:Béryl var. émeraude sur gangue (Muzo Mine Boyaca - Colombie) 2.jpg](https://commons.wikimedia.org/wiki/File:B%C3%A9ryl_var._%C3%A9meraude_sur_gangue_(Muzo_Mine_Boyaca_-_Colombie)_2.jpg) | 1920 px Commons render |
| `opal.jpg` | Rough opal, green and red play-of-colour, on charcoal | Masha Milshina | CC BY 4.0 | [File:Opalescence of the opal.jpg](https://commons.wikimedia.org/wiki/File:Opalescence_of_the_opal.jpg) | 1920 px Commons render |
| `amethyst.jpg` | Four large cut amethysts under raking light on a grey mount | Eden, Janine and Jim | CC BY 2.0 | [File:Amethyst Gems.jpg](https://commons.wikimedia.org/wiki/File:Amethyst_Gems.jpg) | original, 3234 × 2426 |
| `spinel.jpg` | Red spinel octahedra in white marble on black | Nessa Eull | CC0 | [File:Spinel (GeoDIL number - 563).jpg](https://commons.wikimedia.org/wiki/File:Spinel_(GeoDIL_number_-_563).jpg) | original, 2240 × 1632 |
| `diamond.jpg` | Large cushion-cut deep blue diamond in a white-diamond halo | Unknown photographer, Smithsonian Institution Archives | Public domain | [File:The Hope Diamond - SIA.jpg](https://commons.wikimedia.org/wiki/File:The_Hope_Diamond_-_SIA.jpg) | original, 2367 × 2193 |

## Where each file is used (homepage v14)

| File | Section | Caption honesty |
|---|---|---|
| `tanzanite.jpg` | The collection, tanzanite plate | The tray's note reads "Illustrative photographs of the variety. Carat and price are the record's." |
| `sapphire.jpg` | The collection, sapphire plate | As above. |
| `emerald.jpg` | The collection, emerald plate | As above. |
| `ruby.jpg` | The variety band, ruby card | The band's own line reads "Illustrative photographs." |
| `tanzanite-rough.jpg` | The house, the gold-framed plate | The plate's caption reads "Before the bench. Illustrative photograph." |

The variety band's other seven cards use the catalogue's representative stone
photographs in `apps/web/public/media/stone-*.jpg` (recorded in
`apps/web/src/lib/storefront-images.ts`); the band labels all of them
"Illustrative photographs." The hero uses `media/stone-tanzanite.jpg` as its
background and carries a descriptive alt that says it is illustrative; the
hero is deliberately free of any other label (the brief allows nothing else in
it) and the site-wide demo badge remains the visible notice. The try-on phone
frame uses `media/jew-sapphire-ring.jpg`, captioned "Illustrative photograph".

The atelier plate does not come from this directory: it is the lead jewellery
record's own committed image (`/mgh/images/verdant-drop.jpg`). The jewellery
ledger uses that record's name, carat and price; its caption reads "Record
photograph". The remaining stock photographs are not used by the homepage as
built.

## Note on the renders

The Géry Parent originals are 5.4–9.5 MB. To keep the repository weight sane,
files whose original exceeds 5 MB are downloaded as Commons' 1920 px render
(well above the 1200 px quality gate). The substitution is recorded per file
above. Every committed asset passed the verification gates on the download that
was committed.
