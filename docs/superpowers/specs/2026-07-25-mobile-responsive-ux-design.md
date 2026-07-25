# Mobile Responsive UX Polish — Design

## Goal

Make the existing web app render well across the full range of phone sizes (from ~320px like iPhone SE up to large phones), and behave reasonably if opened on a tablet or desktop, without changing the current visual identity (colors, typography) or adding new features.

## Scope

In scope (screens already wired into `App.tsx` routing):
- `src/routes/Login.tsx`
- `src/routes/Register.tsx`
- `src/routes/Home.tsx` (Dashboard)
- `src/routes/SelectVehicle.tsx`
- `src/routes/VehicleNew.tsx`
- `src/routes/ProtectedRoute.tsx` (loading state only, if any)

Out of scope (explicitly deferred by user):
- `src/routes/Refuels.tsx`, `src/routes/RefuelForm.tsx`, `src/routes/VehicleEvents.tsx` — not wired into routing today, not touched.
- Adding navigation (bottom nav / menu) between screens.
- Any visual/branding refresh (palette, typography scale) — current look (gray backgrounds, gray-100 cards, blue-600 actions) stays as-is.

## Approach

Extract a small set of shared UI primitives under `src/components/ui/` and refactor the in-scope screens to use them, instead of patching each screen's inline Tailwind classes independently. This removes existing duplication (`inputClass` is currently copy-pasted in `Login.tsx`, `Register.tsx`, `VehicleNew.tsx`) and guarantees the responsive/accessibility behavior lives in one place.

New components:

- **`Screen`** — page-level wrapper. Applies `min-h-screen`, horizontal safe-area padding (`env(safe-area-inset-left/right)`), and a `max-w-md mx-auto` cap so content doesn't stretch edge-to-edge on tablets/desktop. Takes an optional `centered` prop for the auth-screen vertical-centering layout (Login/Register) vs top-aligned layout (Home/SelectVehicle/VehicleNew).
- **`Button`** — replaces the repeated `h-12 w-full rounded-lg bg-blue-600 ... hover:bg-blue-700` button markup. Adds `active:bg-blue-800` (touch feedback — `hover:` alone does nothing on touchscreens) and `disabled:opacity-60`.
- **`TextField`** — replaces the duplicated `inputClass` string. Same visual style (`h-12 rounded-lg border border-gray-300 px-3 text-base`), single source of truth.
- **`Card`** — replaces the repeated `rounded-lg bg-gray-100 p-4` wrapper used in `Home.tsx`'s `Card`/`FuelMetricsCard`.
- **`Spinner`** and **`ErrorState`** — replace the copy-pasted loading (`animate-spin` div) and error (`Não foi possível carregar...`) blocks in `Home.tsx` and `SelectVehicle.tsx`.

## Responsive behavior

- **Dashboard grid**: stays 2 columns at all widths (confirmed via mockup review — user picked keeping 2 columns rather than collapsing to 1 column below ~360px). Padding/gap tuned so it doesn't feel cramped at 320px.
- **Max width on large screens**: every screen gets `max-w-md` (matches the existing Login/Register/VehicleNew pattern) centered with `mx-auto`, so opening the app on a tablet or desktop browser shows a centered phone-width column instead of stretched full-width content.
- **Safe area**: `Screen` adds `padding-left/right: env(safe-area-inset-left/right)` and bottom padding using `env(safe-area-inset-bottom)` so content isn't clipped by notches/home indicators on iOS. Requires `viewport-fit=cover` added to the viewport meta tag in `index.html` (currently missing).
- **Touch feedback**: `Button` and tappable list items (vehicle cards in `SelectVehicle`) get `active:` states. `-webkit-tap-highlight-color: transparent` added globally in `index.css` combined with the explicit `active:` styles (avoids the default gray flash while still giving feedback).
- **Contrast**: `text-gray-500` secondary text on `bg-gray-100` cards (Dashboard cards, `FuelMetricsCard`) is close to the low end of readable contrast — darken to `text-gray-600` where it sits on the gray-100 card background.

## Non-goals / explicitly not changing

- No new routes, no navigation menu, no data/logic changes.
- No visual redesign — same color palette and type scale.
- No changes to `Refuels`, `RefuelForm`, `VehicleEvents` (not routed today).

## Testing

- `npm run build` must pass (TypeScript + Vite build).
- Manual check via browser dev tools responsive mode at 320px, 375px, 428px (phones) and 768px+ (tablet/desktop) for each in-scope screen.
- After merge, deploy to Render (existing `render.yaml` blueprint) so the user can verify on real devices.
