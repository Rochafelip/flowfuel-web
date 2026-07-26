# Vehicle Events Flow — Design

## Goal

Make the already-built Vehicle Events screens (`VehicleEvents.tsx`, `VehicleEventForm.tsx`) reachable from the app, mirroring how the Refuel flow was wired up. Categorization (9 fixed types) and full CRUD already exist in these files — nothing to build there.

## Scope

In scope:
- `src/App.tsx` — wire `/vehicle-events`, `/vehicle-events/new`, `/vehicle-events/:id/edit`.
- `src/routes/Home.tsx` — add "Novo Evento" button and "Ver histórico de eventos" link, next to the existing Refuel entry points.
- `src/routes/VehicleEventForm.tsx` — one-line consistency fix: add the green focus ring to the type `<select>` (every other select in the app already has it; this one was missed when it was retrofitted alongside the other screens).

Out of scope: any change to the event type list, the CRUD logic, or the list screen — they already work as needed.

## Dashboard layout

Below the existing "Novo Abastecimento" button / "Ver histórico de abastecimentos" link, add the same pair for events:
- `Button` "Novo Evento" → `/vehicle-events/new`
- Secondary link "Ver histórico de eventos" → `/vehicle-events`

## Testing

- `npm run build`.
- Manual: from the Dashboard, create a new event of each type, confirm it lists correctly with its category label, edit one, delete one.
- Redeploy to Render for on-device verification.
