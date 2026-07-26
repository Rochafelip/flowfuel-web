# Vehicle Events Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the already-built Vehicle Events screens into routing and add Dashboard entry points, mirroring the Refuel flow.

**Architecture:** `VehicleEvents.tsx` and `VehicleEventForm.tsx` already exist with full CRUD and categorization — only `App.tsx` routing, `Home.tsx` entry points, and one focus-ring consistency fix are needed.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS, react-router-dom. No test runner — verification is `npm run build` plus manual checks.

---

### Task 1: Wire Vehicle Events routes into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports and routes**

Add imports after the `RefuelForm` import:
```tsx
import { VehicleEvents } from './routes/VehicleEvents'
import { VehicleEventForm } from './routes/VehicleEventForm'
```

Add routes inside the `<Route element={<ProtectedRoute />}>` block, after the refuel routes:
```tsx
              <Route path="/refuels/:id/edit" element={<RefuelForm />} />
              <Route path="/vehicle-events" element={<VehicleEvents />} />
              <Route path="/vehicle-events/new" element={<VehicleEventForm />} />
              <Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Vehicle Events routes into the router"
```

---

### Task 2: Add Dashboard entry points for events

**Files:**
- Modify: `src/routes/Home.tsx`

- [ ] **Step 1: Add the buttons after the existing refuel controls**

Change the end of the returned JSX from:
```tsx
      <button
        type="button"
        onClick={() => navigate('/refuels')}
        className="mt-3 block w-full text-center text-sm text-green-700"
      >
        Ver histórico de abastecimentos
      </button>
    </Screen>
  )
}
```
to:
```tsx
      <button
        type="button"
        onClick={() => navigate('/refuels')}
        className="mt-3 block w-full text-center text-sm text-green-700"
      >
        Ver histórico de abastecimentos
      </button>

      <Button className="mt-5" onClick={() => navigate('/vehicle-events/new')}>
        Novo Evento
      </Button>

      <button
        type="button"
        onClick={() => navigate('/vehicle-events')}
        className="mt-3 block w-full text-center text-sm text-green-700"
      >
        Ver histórico de eventos
      </button>
    </Screen>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual check**

`npm run dev`, open `/`, confirm both new controls appear and navigate to `/vehicle-events/new` and `/vehicle-events`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "feat: add vehicle event entry points to Dashboard"
```

---

### Task 3: Focus-ring consistency fix in `VehicleEventForm`

**Files:**
- Modify: `src/routes/VehicleEventForm.tsx`

- [ ] **Step 1: Add the green focus ring to the type select**

Change:
```tsx
        <select
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          value={type}
```
to:
```tsx
        <select
          className="h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          value={type}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/routes/VehicleEventForm.tsx
git commit -m "fix: add missing focus ring to VehicleEventForm type select"
```

---

### Task 4: Final manual pass, push, and deploy

**Files:** none (verification and deployment only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: succeeds with no errors or warnings.

- [ ] **Step 2: Manual pass**

From the Dashboard: create an event of each of a few different types (e.g. Manutenção, Troca de óleo, Seguro), confirm they show up in `/vehicle-events` with the correct category label, edit one, delete one.

- [ ] **Step 3: Push to GitHub**

```bash
git push
```

- [ ] **Step 4: Verify Render deploy**

Check the Render dashboard for `flowfuel-web` — deploy should pick up automatically. Verify on `https://flowfuel-web.onrender.com`.
