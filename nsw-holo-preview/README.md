# NSW Hologram Preview (React + Vite + TS)

Zero-config preview for your holographic NSW licence prototype. Tailwind is loaded via CDN.

## Run locally

```bash
npm i
npm run dev
```

Open the shown URL.

### Build & deploy (static hosting)

```bash
npm run build
npm run preview   # local static preview
```

Upload the `dist/` folder to static hosting. `vite.config.ts` has `base: './'` so paths work on GitHub Pages.
