# Maihan Gems — Daylight Salon

Idea: A private gemstone house shown the way a stone is examined, on a warm paper tray in daylight.

Metaphor: the jeweller's tray. Finished jewels sit in one night case. Everything else is paper, ink, and the stone's own colour.

Signature: On the homepage the stone fills a full-height tray. A paper plate of real provenance sits on the photograph. The image settles in once. Nothing else moves on load.

Emotion: quiet, exact, expensive.

Motion verb: settle. A hover moves 1px and the fill changes to the darker metal. Reduced motion shows the settled frame at once.

Palette, locked Silk & Stone tokens:

- Ground `#F6F2E9`
- Paper `#FDFBF5`
- Ink `#1D1710`
- Night `#16110C` (utility bar, jewellery band, footer, primary buttons)
- Metal `#D4A437` as a 1px line
- Muted `#5C5344`

Type: Cormorant Garamond for display, Jost for interface. Navigation is sentence case. Prices are serif, not monospace gold.

Genericness test: the previous layer was a near-black page with a gold-gradient button. That is the default luxury template, so this pass returns the ground to alabaster and reserves night for one band. Gradient text and gradient buttons are removed.

Stack: the existing Next.js App Router, React, and Three.js. No new runtime dependency. shadcn is not installed in this app. The 21st catalog search did not return in this environment, so no registry block was pasted in.
