# Visual Refresh + FIPE Vehicle Picker — Design

## Goal

Two related but separable improvements to the app:

1. **Visual refresh**: move the app's primary color from blue to green, give dashboard/list cards a white-with-shadow look (instead of flat gray), and add icon badges to metric cards — applied app-wide through the existing shared UI primitives.
2. **FIPE vehicle picker**: replace the free-text Marca/Modelo/Ano fields in "Cadastrar Veículo" with cascading dropdowns (Marca → Modelo → Ano) backed by the public FIPE API, so users pick a real vehicle instead of typing it.

Both were validated via mockup review in the browser companion (option "B — Verde energia" for the palette, applied app-wide).

## Scope

In scope:
- `src/components/ui/Button.tsx`, `TextField.tsx`, `Card.tsx`, `Screen.tsx` — color/style updates (shared primitives, so this cascades to every screen that already uses them).
- `src/routes/Home.tsx` — icon badges on dashboard/fuel-metric cards.
- `src/routes/SelectVehicle.tsx` — vehicle list items restyled to match the new card look, with a 🚗 badge.
- `src/routes/Login.tsx`, `Register.tsx` — link color updated to match the new palette (they already use `Screen`/`Button`/`TextField`, so most of the change is automatic).
- `src/routes/VehicleNew.tsx` — Marca/Modelo/Ano become cascading FIPE-backed selects.
- New: `src/services/fipe.ts`, `src/hooks/useFipeSelection.ts`.

Out of scope (unchanged):
- `Refuels.tsx`, `RefuelForm.tsx`, `VehicleEvents.tsx` — still not wired into routing.
- Any navigation/menu changes.
- `manufactureYear`, `type`, `energyType`, `fuelSubType`, `capacity`, `color`, `licensePlate`, `currentKm` fields in `VehicleNew` — stay manual, as decided.
- Motorcycles/trucks — FIPE picker only queries the `carros` category.

## 1. Visual refresh

**Color:** every `blue-600/700/800` in the shared primitives and screen-level links becomes `green-600/700/800`:
- `Button`: `bg-green-600 hover:bg-green-700 active:bg-green-800`
- Links (`Não tem conta?`, `Já tem conta?`, `Voltar`, empty-state CTA): `text-green-700`
- `TextField` and the `energyType`/FIPE `<select>` elements gain `focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500` (today they rely on the browser's default blue focus outline, which now clashes)

**Screen background:** `Screen` gets a default `bg-green-50` instead of no background (non-centered path) / the per-page `bg-gray-50` (centered path, currently hardcoded in `Login`/`Register`). The `className` prop on `Screen` stays available for overrides but Login/Register drop their `bg-gray-50` override so they inherit the shared default.

**Card:** `Card` (`src/components/ui/Card.tsx`) changes from `rounded-lg bg-gray-100 p-4` to `rounded-xl bg-white p-3 shadow-sm`. Since `Card` is shared, this automatically updates both the dashboard `MetricCard`/`FuelMetricsCard` and any other current consumer.

**Icon badges:** small 32×32 rounded-lg badges (`bg-green-100 text-green-700`, centered emoji, `mb-2`) added above the label in each dashboard card:
- Total gasto → 💰
- Custo por km → ⛽
- Total de abastecimentos → 🧾
- Último abastecimento → 📅
- Consumo médio → 📊
- `FuelMetricsCard` "Combustível" → ⛽, "Elétrico" → 🔌

No new icon library — plain emoji in a `<span>`, consistent with the mockup and zero new dependencies.

**SelectVehicle list:** each vehicle button gets the same white/shadow/rounded-xl treatment as `Card`, plus a 🚗 badge (same badge style as the dashboard icons) to the left of the brand/model text.

## 2. FIPE vehicle picker

**API:** `https://parallelum.com.br/fipe/api/v1/carros/...` — public, no auth, CORS open (`access-control-allow-origin: *`, verified). Three endpoints used:
- `GET /marcas` → `[{ codigo: string, nome: string }]`
- `GET /marcas/{brandCode}/modelos` → `{ modelos: [{ codigo: number, nome: string }] }`
- `GET /marcas/{brandCode}/modelos/{modelCode}/anos` → `[{ codigo: string, nome: string }]` (codigo like `"2011-3"`, nome like `"2011 Diesel"`)

**`src/services/fipe.ts`:** thin fetch wrapper mirroring the style of `src/services/api.ts`, exposing `fetchBrands()`, `fetchModels(brandCode)`, `fetchYears(brandCode, modelCode)`. Throws on non-OK response (caller handles it).

**`src/hooks/useFipeSelection.ts`:** owns the cascading state — `brands`, `models`, `years` lists; `selectedBrandCode`, `selectedModelCode`, `selectedYearCode`; per-level `loading`/`error` flags. Selecting a brand clears and refetches models; selecting a model clears and refetches years. Exposes the resolved `brandName`, `modelName`, and numeric `modelYear` (parsed from the year's `codigo`, e.g. `"2011-3"` → `2011`) once a year is selected, so `VehicleNew` can drop them straight into the existing POST body.

**`VehicleNew.tsx`:** the three `TextField`s for Marca/Modelo/Ano are replaced by three `<select>` elements (styled like the existing `energyType` select, with the new green focus ring):
- Marca: always enabled, populated from `brands`.
- Modelo: disabled until a brand is picked; shows "Carregando modelos..." while `loading` is true for that level.
- Ano: disabled until a model is picked; same loading treatment.

If `fetchBrands()` fails on mount, show inline text ("Não foi possível carregar as marcas.") with a "Tentar novamente" button that retries — without this the form would be unusable if the FIPE API has a hiccup. Model/year failures get the same inline retry treatment scoped to that select.

The rest of `handleCreateVehicle` is unchanged: it still submits `brand`, `model`, `modelYear` (now sourced from the hook instead of raw input state) alongside the untouched manual fields.

## Testing

- `npm run build` after each file change (TypeScript + Vite).
- Manual check: open `/vehicles/new`, confirm Marca → Modelo → Ano cascades correctly and disables appropriately; submit and confirm the created vehicle has the expected brand/model/year.
- Manual visual pass on Login, Register, Dashboard, SelectVehicle, VehicleNew at 320px and 900px (reusing the same widths from the previous responsive pass) to confirm the green palette and card/icon changes look right everywhere.
- Redeploy to Render (existing pipeline — push to `main` auto-deploys) so the user can check on a real phone.
