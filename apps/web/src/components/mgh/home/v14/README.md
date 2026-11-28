# components/mgh/home/v14

The homepage sections for the current design (v14). All are Server Components
except the hero's search, which is the existing client component in the parent
folder. The page composes them in the brief's order; each section owns its own
composition and exactly one action.

## Files

- `HeroSection.tsx` — full-viewport hero: one photograph, the centred slogan, the catalogue search and one quiet link.
- `VarietyBand.tsx` — all eight stone varieties with photographs; snap rail on a phone, marquee from the desktop breakpoint. One action after the band.
- `CollectionSection.tsx` — three loose-stone records as a staggered tray of plates. One action.
- `JewellerySection.tsx` — two atelier records plus the mounting line, with the lead piece's own photograph. One action.
- `AboutSection.tsx` — one statement, one paragraph, one framed plate, one action.
- `DesignYourOwnSection.tsx` — the three real commission stages, numbered, on navy. One action.
- `GemologistSection.tsx` — one question as the headline and one way into the concierge. One action.
- `TryOnSection.tsx` — the phone-frame device with a stone photograph. One action.
- `CertificateSection.tsx` — one record's evidence plate printed as a dossier. One action.
- `ClosingSection.tsx` — one line and the page's only filled gold button.
- `SectionAction.tsx` — the shared action link (label rule draws, arrow travels). Geometry shared; composition not.

## Notes

- The footer lives in `components/mgh/shell/StorefrontFooter.tsx` because every storefront route renders it. Its styles are in `styles/home-v14.css` with the same `mh14-` scope.
- No component here adds client JavaScript. The only client code on the page is `../HomeSearch`.
- Sections read their records from the page; nothing fetches inside a section.
