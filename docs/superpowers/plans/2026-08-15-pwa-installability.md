# PWA Installability (Android + iOS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the FlowFuel web app installable to the home screen on Android and iOS, opening in standalone mode.

**Architecture:** Add `vite-plugin-pwa` to generate a web app manifest and register a minimal service worker (no offline caching) at build time. Generate PNG icons from the existing `public/favicon.svg` using `@vite-pwa/assets-generator`. Add iOS-specific meta tags to `index.html`.

**Tech Stack:** Vite, `vite-plugin-pwa`, `@vite-pwa/assets-generator` (one-off, not a persisted dependency)

There is no test runner configured in this project (see `package.json` — only `dev`/`build`/`preview` scripts). Verification for this plan is done via `npm run build` and inspecting the build output, not via automated tests.

---

### Task 1: Install `vite-plugin-pwa`

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install the package**

Run: `npm install -D vite-plugin-pwa`
Expected: `package.json` gains `vite-plugin-pwa` under `devDependencies`; `package-lock.json` updates.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vite-plugin-pwa dependency"
```

---

### Task 2: Generate PWA icons from the existing favicon

**Files:**
- Create: `public/pwa-192x192.png`
- Create: `public/pwa-512x512.png`
- Create: `public/maskable-icon-512x512.png`
- Create: `public/apple-touch-icon-180x180.png`
- Create: `public/favicon.ico`

- [ ] **Step 1: Run the asset generator against the existing SVG favicon**

Run: `npx @vite-pwa/assets-generator --preset minimal public/favicon.svg`
Expected: the command downloads/installs itself and `sharp` on demand, then writes `favicon.ico`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, and `apple-touch-icon-180x180.png` into `public/`. It also prints the manifest `icons` array and the `<link>` tags to use — keep this output, it is needed verbatim in Task 3 and Task 4.

- [ ] **Step 2: Verify the files were created**

Run: `ls public/*.png public/favicon.ico`
Expected: all five files listed in "Files" above are present.

- [ ] **Step 3: Commit**

```bash
git add public/pwa-192x192.png public/pwa-512x512.png public/maskable-icon-512x512.png public/apple-touch-icon-180x180.png public/favicon.ico
git commit -m "feat: add generated PWA icon set"
```

---

### Task 3: Configure `vite-plugin-pwa` with the manifest

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Add the plugin and manifest config**

Replace the full contents of `vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico'],
      manifest: {
        name: 'FlowFuel',
        short_name: 'FlowFuel',
        theme_color: '#15803d',
        background_color: '#15803d',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
```

- [ ] **Step 2: Build and verify the manifest and service worker are emitted**

Run: `npm run build`
Expected: build succeeds; `dist/manifest.webmanifest` and `dist/sw.js` exist. Verify with:

```bash
ls dist/manifest.webmanifest dist/sw.js
cat dist/manifest.webmanifest
```

Expected output of `cat` includes `"name":"FlowFuel"`, `"display":"standalone"`, `"theme_color":"#15803d"`, and the three icon entries.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: configure vite-plugin-pwa manifest and service worker"
```

---

### Task 4: Add iOS meta tags and update `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add iOS-specific tags and theme-color to the `<head>`**

In `index.html`, replace:

```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="canonical" href="https://flowfuel-web.onrender.com/" />
```

with:

```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="theme-color" content="#15803d" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="FlowFuel" />
    <link rel="canonical" href="https://flowfuel-web.onrender.com/" />
```

- [ ] **Step 2: Build and verify the tags are present in the output**

Run: `npm run build && grep -E "apple-touch-icon|apple-mobile-web-app|theme-color" dist/index.html`
Expected: all five added lines appear in `dist/index.html` (the `vite-plugin-pwa` manifest `<link>` tag will also be present, injected automatically by the plugin).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add iOS home screen meta tags"
```

---

### Task 5: Deploy and verify installability

**Files:** none (verification only, per project convention of testing on the deployed instance rather than locally)

- [ ] **Step 1: Push to trigger deployment**

```bash
git push
```

Expected: deployment pipeline (Render, per `render.yaml`) picks up the new commits and deploys.

- [ ] **Step 2: Verify on the deployed site**

Once deployed, open `https://flowfuel-web.onrender.com/` and check:
- Chrome DevTools → Application → Manifest tab shows the FlowFuel manifest with no installability errors, and Application → Service Workers shows an activated worker.
- On an Android device (or Chrome's "Install app" menu entry), the install prompt is available and installing places a standalone FlowFuel icon on the home screen using the green ⛽ icon.
- On an iOS device, Safari → Share → "Add to Home Screen" shows the FlowFuel name and green ⛽ icon, and opens standalone (no Safari address bar) after adding.

No commit for this task — it is a manual verification step against the deployed app.
