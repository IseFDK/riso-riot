# ШУМ / RISO RIOT

An original Russian-first anti-design print-club concept: exuberant poster typography, acid yellow / hot magenta / electric blue, tactile risograph art, and asymmetric layouts.

Public website: https://isefdk.github.io/riso-riot/

## Pages and interaction

- Home with a CSS-perspective physical poster stack (spread / collect toggle)
- Gallery of 8 original SVG posters, category / search / sorting filters and browser-local favorites
- Eight direct-link poster detail pages with editable SVG downloads and lab presets
- DIY poster lab: two text lines, 8 ready palettes plus custom native/HEX inks, 7 shapes, 5 layouts, layer offset, rotation, grain, randomize, undo and cancelable reset
- SVG + 1400×1960 PNG export entirely in the browser
- Club manifesto, print introduction and four native FAQ disclosures
- Journal and 3 substantive article pages
- Custom 404, sitemap, favicon and an unlisted noindex viewport QA surface

This is a fictional digital club and a standalone design concept. No real events, memberships, store, testimonials or checkout are represented. Artwork is digitally generated, not a promise of physical risograph output. Exports are RGB digital drafts; a print workshop's production requirements still apply.

## Development

No build dependencies or external runtime requests. Node 20+ recommended.

```sh
npm run build
npm test
npm run serve
```

The deterministic Node build emits GitHub Pages content to `docs`. GitHub Pages uses `main` / `docs`. All public routes are real HTML files and work as direct links. CSS and the JavaScript module graph use deterministic content-hash query URLs to invalidate browser caches after updates.

Saved posters and lab draft use localStorage on this browser only; no backend or analytics. Storage errors are handled without breaking the editor. PNG export uses a local SVG Blob and canvas; downloaded files stay on the visitor's device.

## Assets and provenance

The original raster artwork was created for this project with OpenAI's built-in image-generation tool. No specific image model version was selected or asserted. The prompt and conversion details are in `public/art/riso-sheet-provenance.txt`. The WebP was converted from the original output without creative changes; original source remains in the creation workspace, not the production download.

SVG poster art is authored procedurally for this project in `src/engine.mjs`; SVG text uses a local Arial-family fallback for portable editable files. Browser preview/export typography can vary by operating system. The site self-hosts Manrope, by Mikhail Sharanda, under the SIL Open Font License 1.1 (included at `public/fonts/OFL.txt`). No third-party stock imagery or remote asset CDN is used.

Code and procedural SVG artwork are MIT-licensed. The generated raster artwork may be used and modified as part of this project, subject to applicable OpenAI terms; this is not a claim of exclusive copyright. Font files retain their own OFL license.

## Lab colors

Choose one of eight prepared palettes, or edit background, letters, and shape inks with a native color picker or HEX field. Three-digit HEX and six-digit HEX are accepted, with or without #. Invalid typing keeps the last valid preview and reverts on leaving the field. Low text/background contrast is explained without blocking artistic choices. Custom mode starts from the currently visible palette; Undo restores earlier colors. Randomize preserves a custom palette while changing the composition. Old drafts are normalized with defaults; preset links reproduce the exhibition's actual three inks.
