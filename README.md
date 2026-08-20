# PlayStoreScreenshotMaker

Free. Fast. Frame your store screenshots in seconds. A 100% client-side web tool that turns your screenshots into device-framed Play Store screenshots (2160×3840) — entirely in the browser. No backend, no uploads.

**Created by [@lowkeygud](https://github.com/lowkeygud).**

## Usage

1. **Upload** screenshots (drag & drop or browse).
2. **Pick a device** (145 frames across iPhones, iPads, Pixels, Galaxy phones & tablets) and a color variant.
3. **Choose a background** — solid, gradient, or your own image — and tune the device drop shadow (on/off, strength, blur, offset).
4. **Preview** every device × screenshot combination, click any tile to zoom.
5. **Export** individual PNGs or a single ZIP (2160×3840 each).

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (compositor math)
npm run smoke      # headless browser end-to-end test (needs Edge/Chrome)
```

## Build & deploy to GitHub Pages

```bash
npm run frames     # download + generate the 145 device frames into public/ (run once)
npm run build      # outputs static site to dist/
npm run preview    # verify the production build locally
```

The `base` path is already set to `/playstore-screenshot-maker/` (repo name) in `vite.config.ts`.

**Automated:** a GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on every push to `main`. Enable it in **Settings → Pages → Source: GitHub Actions**.

**Manual:** push `dist/` to the `gh-pages` branch, or point Pages at the `main` branch `/dist` folder.

## Credits

- **Created by [@lowkeygud](https://github.com/lowkeygud).**
- Device frame artwork from the open-source [device-frames-media pack](https://github.com/jonnyjackson26/device-frames-media) by [@jonnyjackson26](https://github.com/jonnyjackson26).
- Typeface: [Montserrat](https://fonts.google.com/specimen/Montserrat) (bundled locally).

## Tech

Vite + TypeScript, vanilla DOM/Canvas, a small compositor pipeline (cover-crop → mask clip → frame overlay), Web Worker batch export, and JSZip. No heavy framework.