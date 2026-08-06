# Banner de servidor indisponível — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a fixed banner at the top of the app when any API call fails due to a network-level error (server unreachable), and hide it automatically once a subsequent call succeeds or the user dismisses it.

**Architecture:** A module-level pub/sub store (`serverStatus.ts`) tracks connectivity outside React. A thin `fetch` wrapper (`httpClient.ts`) reports success/failure to that store. All 5 service files that call `fetch` directly are switched to the wrapper. A new `ServerStatusBanner` component subscribes to the store via `useSyncExternalStore` and renders in `App.tsx`.

**Tech Stack:** React 18 (`useSyncExternalStore`), TypeScript, Vite. No new dependencies.

**Design spec:** `docs/superpowers/specs/2026-08-04-server-unreachable-banner-design.md`

---

### Task 1: `serverStatus.ts` connectivity store

**Files:**
- Create: `src/services/serverStatus.ts`

- [ ] **Step 1: Write the module**

```ts
type Listener = () => void

let isUnreachable = false
let dismissed = false
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function reportNetworkError() {
  if (isUnreachable) return
  isUnreachable = true
  dismissed = false
  notify()
}

export function reportNetworkSuccess() {
  if (!isUnreachable) return
  isUnreachable = false
  notify()
}

export function dismissServerStatus() {
  if (dismissed) return
  dismissed = true
  notify()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return isUnreachable && !dismissed
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit 2>&1 | grep serverStatus`
Expected: no output (no errors referencing the new file). Note: this repo's `tsc -b` has a pre-existing unrelated error (`tsconfig.node.json may not disable emit`) when run with `--noEmit` — ignore that one, only check for `serverStatus.ts` errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/serverStatus.ts
git commit -m "feat: add connectivity status store"
```

---

### Task 2: `useServerStatus` hook

**Files:**
- Modify: `src/services/serverStatus.ts`

- [ ] **Step 1: Add the hook at the end of the file**

```ts
import { useSyncExternalStore } from 'react'

export function useServerStatus() {
  const visible = useSyncExternalStore(subscribe, getSnapshot)
  return { visible, dismiss: dismissServerStatus }
}
```

Add `import { useSyncExternalStore } from 'react'` to the top of the file (with the rest of the file's content unchanged below it).

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit 2>&1 | grep serverStatus`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/services/serverStatus.ts
git commit -m "feat: add useServerStatus hook"
```

---

### Task 3: `apiFetch` wrapper

**Files:**
- Create: `src/services/httpClient.ts`

- [ ] **Step 1: Write the wrapper**

```ts
import { reportNetworkError, reportNetworkSuccess } from './serverStatus'

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, init)
    reportNetworkSuccess()
    return response
  } catch (err) {
    reportNetworkError()
    throw err
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b --noEmit 2>&1 | grep httpClient`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/services/httpClient.ts
git commit -m "feat: add apiFetch wrapper reporting network errors"
```

---

### Task 4: Switch `api.ts` to `apiFetch`

**Files:**
- Modify: `src/services/api.ts:1` (add import), lines 25, 45, 61, 77, 98, 125, 149 (each `fetch(` call)

- [ ] **Step 1: Add the import**

At the top of `src/services/api.ts`, add:

```ts
import { apiFetch } from './httpClient'
```

- [ ] **Step 2: Replace each `fetch(` call with `apiFetch(`**

There are 7 occurrences, all of the exact form `await fetch(` — replace each with `await apiFetch(`. No other part of any call changes (same URL, same options object). Lines affected: 25, 45, 61, 77, 98, 125, 149.

- [ ] **Step 3: Verify no `fetch(` calls remain in this file**

Run: `grep -n 'fetch(' src/services/api.ts`
Expected output: 7 lines, all containing `apiFetch(`.

- [ ] **Step 4: Verify build**

Run: `npx tsc -b --noEmit 2>&1 | grep -v tsconfig.node.json`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/services/api.ts
git commit -m "refactor: route api.ts requests through apiFetch"
```

---

### Task 5: Switch `vehicle.ts` to `apiFetch`

**Files:**
- Modify: `src/services/vehicle.ts:1` (add import), lines 27, 49, 69, 94 (each `fetch(` call)

- [ ] **Step 1: Add the import**

At the top of `src/services/vehicle.ts`, add `apiFetch` to imports:

```ts
import { authenticatedRequest, clearSession } from './api'
import { apiFetch } from './httpClient'
```

- [ ] **Step 2: Replace each `fetch(` call with `apiFetch(`**

4 occurrences at lines 27, 49, 69, 94 — replace `await fetch(` with `await apiFetch(` in each. No other logic changes (the empty-body/401 handling in `activateVehicle`, `deleteVehicle`, `getVehicleShare`, `revokeVehicleShare` stays exactly as-is).

- [ ] **Step 3: Verify no `fetch(` calls remain**

Run: `grep -n 'fetch(' src/services/vehicle.ts`
Expected output: 4 lines, all containing `apiFetch(`.

- [ ] **Step 4: Verify build**

Run: `npx tsc -b --noEmit 2>&1 | grep -v tsconfig.node.json`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/services/vehicle.ts
git commit -m "refactor: route vehicle.ts requests through apiFetch"
```

---

### Task 6: Switch `profile.ts` to `apiFetch`

**Files:**
- Modify: `src/services/profile.ts:1` (add import), lines 72, 94, 111, 125 (each `fetch(` call)

- [ ] **Step 1: Add the import**

```ts
import { authenticatedRequest, extractErrorMessage } from './api'
import { apiFetch } from './httpClient'
```

- [ ] **Step 2: Replace each `fetch(` call with `apiFetch(`**

4 occurrences at lines 72, 94, 111, 125 (`changePasswordRequest`, `uploadProfilePictureRequest`, `deleteProfilePictureRequest`, `deleteAccountRequest`) — replace `await fetch(` with `await apiFetch(` in each.

- [ ] **Step 3: Verify no `fetch(` calls remain**

Run: `grep -n 'fetch(' src/services/profile.ts`
Expected output: 4 lines, all containing `apiFetch(`.

- [ ] **Step 4: Verify build**

Run: `npx tsc -b --noEmit 2>&1 | grep -v tsconfig.node.json`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/services/profile.ts
git commit -m "refactor: route profile.ts requests through apiFetch"
```

---

### Task 7: Switch `export.ts` and `fipe.ts` to `apiFetch`

**Files:**
- Modify: `src/services/export.ts:1` (add import), line 8
- Modify: `src/services/fipe.ts:1` (add import), line 11

- [ ] **Step 1: Update `export.ts`**

Add the import:

```ts
import { clearSession, extractErrorMessage } from './api'
import { apiFetch } from './httpClient'
```

Replace the one `await fetch(` at line 8 with `await apiFetch(`.

- [ ] **Step 2: Update `fipe.ts`**

Add the import at the top:

```ts
import { apiFetch } from './httpClient'
```

Replace the one `await fetch(` at line 11 with `await apiFetch(`.

- [ ] **Step 3: Verify no `fetch(` calls remain in either file**

Run: `grep -n 'fetch(' src/services/export.ts src/services/fipe.ts`
Expected output: 2 lines total, both containing `apiFetch(`.

- [ ] **Step 4: Verify no direct `fetch(` remains anywhere in `src/services` except inside `httpClient.ts`**

Run: `grep -rln 'fetch(' src/services/`
Expected output: exactly the 6 files `api.ts`, `vehicle.ts`, `profile.ts`, `export.ts`, `fipe.ts`, `httpClient.ts` (all now call `apiFetch(`, except `httpClient.ts` itself which calls the native `fetch(`).

- [ ] **Step 5: Verify build**

Run: `npx tsc -b --noEmit 2>&1 | grep -v tsconfig.node.json`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/services/export.ts src/services/fipe.ts
git commit -m "refactor: route export.ts and fipe.ts requests through apiFetch"
```

---

### Task 8: `ServerStatusBanner` component

**Files:**
- Create: `src/components/ui/ServerStatusBanner.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useServerStatus } from '../../services/serverStatus'

export function ServerStatusBanner() {
  const { visible, dismiss } = useServerStatus()

  if (!visible) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-red-600 px-4 py-2 text-sm font-medium text-white"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <p>Não foi possível conectar ao servidor. Tente novamente mais tarde.</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="text-lg leading-none text-white/80 hover:text-white"
      >
        ×
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc -b --noEmit 2>&1 | grep -v tsconfig.node.json`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ServerStatusBanner.tsx
git commit -m "feat: add ServerStatusBanner component"
```

---

### Task 9: Mount `ServerStatusBanner` in `App.tsx`

**Files:**
- Modify: `src/App.tsx:8` (add import), `src/App.tsx:59` (render banner)

- [ ] **Step 1: Add the import**

In `src/App.tsx`, add alongside the other `components/ui` imports (after the `ToastContainer` import at line 8):

```tsx
import { ServerStatusBanner } from './components/ui/ServerStatusBanner'
```

- [ ] **Step 2: Render the banner**

Inside the `<ToastProvider>` block (so it's mounted for every route, including `/login` and `/register`), immediately before `<ToastContainer />`:

```tsx
              <ServerStatusBanner />
              <ToastContainer />
```

Full context — the block at the end of `App.tsx` should read:

```tsx
              </Routes>
              <ServerStatusBanner />
              <ToastContainer />
              <ConfirmDialog />
```

- [ ] **Step 3: Verify build**

Run: `npx tsc -b --noEmit 2>&1 | grep -v tsconfig.node.json`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: mount ServerStatusBanner in App"
```

---

### Task 10: Manual verification

**Files:** none (manual QA only, per the design spec's Testing section)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite starts without errors, prints a local URL.

- [ ] **Step 2: Trigger a network error and confirm the banner appears**

Open the app in a browser, open DevTools → Network tab → set throttling to "Offline". Trigger any API call (e.g. navigate to `/select-vehicle` or submit the login form). Confirm:
- A red banner appears fixed at the top reading "Não foi possível conectar ao servidor. Tente novamente mais tarde."
- The screen's own error handling still runs too (e.g. existing toast/console behavior for that screen is unchanged) — the banner is additive, not a replacement.

- [ ] **Step 3: Dismiss the banner**

Click the `×` on the banner. Confirm it disappears immediately.

- [ ] **Step 4: Confirm reconnection auto-hides the banner**

With DevTools still set to "Offline" and the banner visible (don't dismiss it this time), trigger another API call to reconfirm it's still visible, then switch Network throttling back to "Online" (or "No throttling") and trigger a new successful API call (e.g. reload the page). Confirm the banner disappears without clicking anything.

- [ ] **Step 5: Confirm dismiss is not permanent**

Set Network to "Offline" again, trigger a call so the banner reappears, dismiss it with `×`, then trigger a *new* failing call (e.g. navigate to a different screen that fetches data). Confirm the banner reappears.

- [ ] **Step 6: Confirm normal HTTP errors do NOT show the banner**

Set Network back to "Online". On the login screen, submit an incorrect password. Confirm: the existing error toast appears as before, and the new red banner does NOT appear.

- [ ] **Step 7: Confirm the banner also works on `/login`**

While logged out, set Network to "Offline" and submit the login form. Confirm the banner appears on `/login` (a route outside `ProtectedRoute`).

- [ ] **Step 8: Run the full build**

Run: `npm run build`
Expected: exits 0, no TypeScript or Vite errors.

- [ ] **Step 9: Final grep check**

Run: `grep -rn 'fetch(' src/services/`
Expected: every match is `apiFetch(`, except inside `httpClient.ts` where the one raw `fetch(` call lives.

No commit for this task — it's verification only. If any check fails, go back to the relevant task, fix, and re-verify before proceeding.
