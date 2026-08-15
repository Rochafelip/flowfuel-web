# PWA Installability (Android + iOS)

## Objective

Make the FlowFuel web app installable to the device home screen on Android (Chrome install prompt) and iOS (Safari "Add to Home Screen"), opening in standalone mode (no browser chrome). No offline caching — installability only.

## Approach

Use `vite-plugin-pwa` to generate the web app manifest and register the minimal service worker required by Chrome/Android's installability criteria. This is the standard PWA tool for Vite projects; it injects the manifest link and icon tags into `index.html` at build time and keeps the service worker registration in sync with the build.

Icons are generated once from the existing `public/favicon.svg` (green `#15803d` background with a ⛽ emoji) using `@vite-pwa/assets-generator` (official companion CLI, run via `npx`, not kept as a dependency).

## Manifest configuration

- `name`: "FlowFuel"
- `short_name`: "FlowFuel"
- `theme_color`: `#15803d`
- `background_color`: `#15803d`
- `display`: `standalone`
- `start_url`: `/`
- Icons: 192×192, 512×512, 512×512 maskable (generated PNGs)

## Service worker

- `registerType: 'autoUpdate'` — updates the service worker automatically in the background.
- No runtime caching / precache strategy configured — the SW exists only to satisfy Android's installability requirement, not to serve offline content.

## iOS support

`vite-plugin-pwa`'s manifest is only partially honored by Safari. Add the following meta tags directly to `index.html` for iOS "Add to Home Screen" support:

- `apple-mobile-web-app-capable` (standalone mode)
- `apple-mobile-web-app-status-bar-style`
- `apple-touch-icon` (180×180 PNG)

## Out of scope

- Offline caching / asset precaching
- Push notifications
- Background sync
- Custom install prompt UI (relying on native browser prompts)

## Testing

Deploy and verify via the running site (per project convention, test on the deployed instance, not local dev):
- Chrome DevTools → Application → Manifest tab shows no installability warnings
- Android Chrome shows "Add to Home Screen" / install prompt
- iOS Safari → Share → "Add to Home Screen" produces a standalone icon with the correct name/icon
