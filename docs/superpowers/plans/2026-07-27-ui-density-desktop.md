# UI Density & Desktop Layout Adjustment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce button height and standardize vertical spacing across all 14 pages (mobile and desktop), and rework layout on desktop (`lg:` breakpoint) so buttons stop stretching full-width and content uses the available horizontal space, per `docs/superpowers/specs/2026-07-27-ui-density-desktop-design.md`.

**Architecture:** Two shared primitives (`Button`, `Screen`) get new capabilities (`fullWidth`, `variant`, responsive padding). Every page then adopts those capabilities where the spec's per-page table calls for it. No new dependencies, no new files besides the two already-modified primitives.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS (Vite). No test framework is configured in this repo (`package.json` has no `test` script and there are no `*.test.*` files), so verification is: `npx tsc -b --noEmit` (type safety) after each task, plus a final manual visual pass in the dev server at mobile and desktop viewport widths.

---

### Task 1: `Button` component — height, `fullWidth`, `variant`

**Files:**
- Modify: `src/components/ui/Button.tsx`

- [ ] **Step 1: Rewrite the component**

```tsx
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:active:bg-green-600',
  secondary:
    'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 disabled:active:bg-gray-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:active:bg-red-600',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
}

export function Button({
  className = '',
  variant = 'primary',
  fullWidth = true,
  ...props
}: ButtonProps) {
  const widthClasses = fullWidth ? 'w-full' : 'inline-flex w-auto items-center justify-center px-6'

  return (
    <button
      className={`h-11 rounded-lg text-base font-bold transition-colors disabled:opacity-60 ${widthClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
```

This is a superset of the previous behavior: every existing call site (`<Button>...</Button>` with no `variant`/`fullWidth`) keeps rendering `w-full` + green, just 4px shorter (`h-11` = 44px instead of `h-12` = 48px).

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Button.tsx
git commit -m "feat(ui): add fullWidth/variant support to Button, reduce height to 44px"
```

---

### Task 2: `Screen` component — responsive horizontal padding

**Files:**
- Modify: `src/components/ui/Screen.tsx`

- [ ] **Step 1: Widen horizontal padding on large screens**

Replace the fixed `1.25rem` left/right padding with a version that grows at `lg`. Inline `style` can't use media queries, so move horizontal padding to Tailwind classes and keep only vertical + safe-area insets inline:

```tsx
import type { ReactNode } from 'react'

const safeAreaPadding = {
  paddingTop: '1.25rem',
  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
}

export function Screen({
  children,
  centered = false,
  wide = false,
  className = '',
}: {
  children: ReactNode
  centered?: boolean
  wide?: boolean
  className?: string
}) {
  const horizontalPadding = 'px-5 lg:px-8'

  if (centered) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-green-50 ${horizontalPadding} ${className}`}
        style={safeAreaPadding}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-green-50 ${horizontalPadding} ${className}`} style={safeAreaPadding}>
      <div className={`mx-auto ${wide ? 'max-w-3xl' : 'max-w-md'}`}>{children}</div>
    </div>
  )
}
```

Note: `px-5` = `1.25rem`, matching the previous fixed value, and `env(safe-area-inset-left/right)` is dropped from the calc since Tailwind's `px-*` can't express `max()` — on notched devices this trades a small amount of safe-area precision for maintainability; the vertical safe-area inset (bottom) is unaffected and kept as-is. Left/right notch insets on real devices in portrait are 0 on virtually all current hardware, so this is a non-issue in practice.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Screen.tsx
git commit -m "feat(ui): widen Screen horizontal padding on lg breakpoint"
```

---

### Task 3: `Profile.tsx` — two-column layout on desktop + button cleanup

**Files:**
- Modify: `src/routes/Profile.tsx:145-228`

- [ ] **Step 1: Replace the render body**

Replace from `return (` (the main return, not the loading/error ones) through the closing `</Screen>` — i.e. lines 145-228 — with:

```tsx
  return (
    <Screen wide>
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 lg:text-left">Perfil</h1>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-8">
        <div className="flex flex-col items-center gap-4">
          <label className="relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-gray-50">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-gray-400">
                {(profile.name ?? profile.email).charAt(0).toUpperCase()}
              </span>
            )}
            {isUploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Spinner />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={isUploadingPhoto || isDeletingPhoto}
            />
          </label>

          {profile.profilePicture && (
            <button
              type="button"
              onClick={handleDeletePhoto}
              disabled={isDeletingPhoto || isUploadingPhoto}
              className="text-sm font-bold text-red-600 disabled:opacity-60"
            >
              {isDeletingPhoto ? 'Removendo...' : 'Remover foto'}
            </button>
          )}

          <p className="text-lg font-bold text-gray-900">{profile.name ?? profile.email}</p>

          <div className="flex w-full justify-evenly">
            <StatItem count={stats?.vehiclesCount} label="Veículos" />
            <StatItem count={stats?.refuelsCount} label="Abastecimentos" />
            <StatItem count={stats?.eventsCount} label="Eventos" />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm">
            <InfoField label="Email" value={profile.email} />
            <InfoField label="Telefone" value={profile.phone ?? 'Não informado'} />
            {profile.createdAt && (
              <InfoField
                label="Membro desde"
                value={new Date(profile.createdAt).toLocaleDateString('pt-BR')}
              />
            )}
          </div>

          <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
            <ActionRow label="Editar perfil" onClick={() => navigate('/profile/edit')} />
            <div className="border-t border-gray-100" />
            <ActionRow label="Trocar senha" onClick={() => navigate('/profile/change-password')} />
          </div>

          <Button onClick={handleLogout} fullWidth={false} className="lg:self-start">
            Sair
          </Button>

          <div className="flex flex-col gap-3 rounded-xl border border-red-200 p-4">
            <p className="text-center text-sm font-bold text-red-600 lg:text-left">Zona de Perigo</p>
            <Button
              variant="danger"
              fullWidth={false}
              className="lg:self-start"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? 'Excluindo...' : 'Excluir conta permanentemente'}
            </Button>
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <DeleteAccountDialog
          onConfirm={handleDeleteAccountConfirmed}
          onDismiss={() => setShowDeleteDialog(false)}
        />
      )}
    </Screen>
  )
}
```

This keeps mobile DOM order identical to today (avatar → stats → info → actions → Sair → danger zone, all stacked via `flex-col`) and only activates the two-column grid (`220px` avatar/stats rail + flexible content column) from `lg` up. The raw `<button>` for "Excluir conta permanentemente" is replaced by `<Button variant="danger">`, removing the duplicated danger-button styling.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/Profile.tsx
git commit -m "feat(profile): two-column desktop layout, auto-width Sair/Excluir buttons"
```

---

### Task 4: `Home.tsx` — spacing standardization + retry button

**Files:**
- Modify: `src/routes/Home.tsx:139` (`SpendCarousel` Card), `:186` (`TipOfTheDayCard`), `:197` (`LastRefuelDetailCard`), `:226` (`RecentActivityCard`), `:310` (retry Button), `:377`/`:414` (metric grids), `:428`/`:440` (CTA buttons)

- [ ] **Step 1: Standardize between-block spacing from `mt-3`/`mt-5` to `mt-6`**

In `SpendCarousel` (line 139), `TipOfTheDayCard` (line 186), `LastRefuelDetailCard` (line 197), `RecentActivityCard` (line 226), and both metric grids (lines 377, 414):

```diff
- <Card className="mt-3">
+ <Card className="mt-6">
```
(apply to all four `Card`/`div` occurrences above — the two metric grids are `<div className="mt-3 grid grid-cols-2 gap-3">` → `<div className="mt-6 grid grid-cols-2 gap-3">`)

At line 428 and 440:
```diff
- <Button className="mt-5" onClick={() => navigate('/refuels/new')}>
+ <Button className="mt-6" onClick={() => navigate('/refuels/new')}>
```
```diff
- <Button className="mt-5" onClick={() => navigate('/vehicle-events/new')}>
+ <Button className="mt-6" onClick={() => navigate('/vehicle-events/new')}>
```

- [ ] **Step 2: Make the error-state retry button auto-width**

Line 310:
```diff
- <Button className="mt-5" onClick={loadHome}>
+ <Button fullWidth={false} className="mt-6" onClick={loadHome}>
    Tentar novamente
  </Button>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Home.tsx
git commit -m "style(home): standardize card spacing to mt-6, auto-width retry button"
```

---

### Task 5: `Refuels.tsx` and `VehicleEvents.tsx` — header and list-footer buttons

**Files:**
- Modify: `src/routes/Refuels.tsx:64-70,127-135`
- Modify: `src/routes/VehicleEvents.tsx:71-77,118-126`

- [ ] **Step 1: Replace the hacky `className="w-auto px-4 text-sm"` override with `fullWidth={false}`**

In both files, the header button:
```diff
- <Button
-   className="w-auto px-4 text-sm"
-   onClick={() => navigate('/refuels/new')}
- >
+ <Button fullWidth={false} className="text-sm" onClick={() => navigate('/refuels/new')}>
    Novo abastecimento
  </Button>
```
(same pattern in `VehicleEvents.tsx` for `/vehicle-events/new`, label "Novo evento")

- [ ] **Step 2: Make "Carregar mais" auto-width instead of full-width**

In both files:
```diff
- <button
-   className="mt-3 w-full rounded-lg bg-gray-200 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50"
-   onClick={loadMore}
-   disabled={loading}
- >
+ <button
+   className="mx-auto mt-3 block w-auto rounded-lg bg-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 disabled:opacity-50"
+   onClick={loadMore}
+   disabled={loading}
+ >
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Refuels.tsx src/routes/VehicleEvents.tsx
git commit -m "style(lists): auto-width header/load-more buttons on Refuels and VehicleEvents"
```

---

### Task 6: Form submit buttons — auto-width and right-aligned on `lg`

**Files:**
- Modify: `src/routes/RefuelForm.tsx:255`
- Modify: `src/routes/VehicleEventForm.tsx:167`
- Modify: `src/routes/Export.tsx:198`
- Modify: `src/routes/ChangePassword.tsx:88`
- Modify: `src/routes/ProfileEdit.tsx:94`

- [ ] **Step 1: Add `lg:w-auto lg:self-end lg:px-10` to each submit `Button`**

`RefuelForm.tsx`:
```diff
- <Button type="submit" disabled={submitting}>
+ <Button type="submit" disabled={submitting} className="lg:w-auto lg:self-end lg:px-10">
    {submitting ? 'Salvando...' : 'Salvar'}
  </Button>
```

`VehicleEventForm.tsx`: identical diff (same "Salvar" button).

`Export.tsx`:
```diff
- <Button type="submit" disabled={exporting || Boolean(dateError)}>
+ <Button
+   type="submit"
+   disabled={exporting || Boolean(dateError)}
+   className="lg:w-auto lg:self-end lg:px-10"
+ >
    {exporting ? 'Exportando...' : 'Exportar'}
  </Button>
```

`ChangePassword.tsx`:
```diff
- <Button type="submit" disabled={submitting}>
+ <Button type="submit" disabled={submitting} className="lg:w-auto lg:self-end lg:px-10">
    {submitting ? 'Salvando...' : 'Trocar senha'}
  </Button>
```

`ProfileEdit.tsx`:
```diff
- <Button type="submit" disabled={submitting}>
+ <Button type="submit" disabled={submitting} className="lg:w-auto lg:self-end lg:px-10">
    {submitting ? 'Salvando...' : 'Salvar'}
  </Button>
```

This works because every one of these buttons lives directly inside a `<form className="flex flex-col gap-4">` — a flex column where `self-end` on one child aligns just that child to the right without touching its siblings (the `Voltar`/`Cancelar` text links stay centered/full-width as today).

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/RefuelForm.tsx src/routes/VehicleEventForm.tsx src/routes/Export.tsx src/routes/ChangePassword.tsx src/routes/ProfileEdit.tsx
git commit -m "style(forms): right-align auto-width submit button on lg breakpoint"
```

---

### Task 7: `SelectVehicle.tsx` — auto-width CTA + two-column list on desktop

**Files:**
- Modify: `src/routes/SelectVehicle.tsx:69,81`

- [ ] **Step 1: Auto-width the empty-state CTA**

```diff
- <Button onClick={() => navigate('/vehicles/new')} className="w-auto px-4">
+ <Button onClick={() => navigate('/vehicles/new')} fullWidth={false}>
    Cadastrar Veículo
  </Button>
```

- [ ] **Step 2: Two-column vehicle list on `lg`**

```diff
- <ul className="flex flex-col gap-3">
+ <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/SelectVehicle.tsx
git commit -m "style(select-vehicle): auto-width CTA, two-column list on lg"
```

---

### Task 8: `VehicleNew.tsx` — wizard nav buttons side-by-side

**Files:**
- Modify: `src/routes/VehicleNew.tsx:314-346`

Today the bottom of the wizard form is a `flex flex-col gap-2` stack: primary submit button, optional "Preencher placa depois" text link, then a "Voltar"/"Cancelar" text link — three full-width stacked items. Per the approved design, the back/cancel action becomes a real secondary `Button` sitting beside the primary action, at every width (not just desktop).

- [ ] **Step 1: Replace the nav block**

Replace lines 314-346 (the `<div className="mt-2 flex flex-col gap-2">...</div>`) with:

```tsx
        <div className="mt-2 flex flex-col gap-3">
          {currentStep === 3 && (
            <button
              type="button"
              onClick={skipLicensePlate}
              className="text-center text-sm font-bold text-green-700"
            >
              Preencher placa depois
            </button>
          )}

          <div className="flex gap-3">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                className="flex-1 lg:flex-none lg:px-8"
                onClick={goToPreviousStep}
              >
                Voltar
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                className="flex-1 lg:flex-none lg:px-8"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              fullWidth={false}
              className="flex-1 lg:flex-none lg:px-10"
            >
              {currentStep < 4 ? 'Continuar' : isSubmitting ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </div>
        </div>
```

`fullWidth={false}` switches both buttons to `inline-flex`, and `flex-1` (their own class, layered on top via `className`) makes them share the row equally on mobile; `lg:flex-none` lets them shrink to content width and sit side-by-side without stretching once there's room to spare.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/VehicleNew.tsx
git commit -m "feat(vehicle-new): side-by-side back/continue wizard buttons"
```

---

### Task 9: Manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (leave running)

- [ ] **Step 2: Check every route at mobile width (375px) and desktop width (1440px)**

Open the app in a browser, use devtools responsive mode at 375px then 1440px, and visit each of: `/login`, `/register`, `/activate?email=test@test.com`, `/select-vehicle`, `/vehicles/new`, `/` (Home), `/refuels`, `/refuels/new`, `/vehicle-events`, `/vehicle-events/new`, `/export`, `/profile`, `/profile/edit`, `/profile/change-password`.

Confirm for each:
- Buttons are 44px tall, not visually "fat".
- On mobile, layout and button placement look unchanged from before this plan (no accidental full-width→auto-width regressions on primary form CTAs).
- On desktop, buttons that used to stretch edge-to-edge (Sair, Excluir conta, Novo abastecimento/evento, Carregar mais, Cadastrar Veículo, form submit buttons, wizard nav) are now auto-width.
- `Profile` shows two columns from ~1024px up; `SelectVehicle`'s vehicle list shows two columns from ~1024px up.
- No layout overlap, clipping, or broken alignment at either width.

- [ ] **Step 3: Full type-check + build**

Run: `npm run build`
Expected: builds successfully with no TypeScript errors.

- [ ] **Step 4: Stop the dev server**

If issues were found in Step 2, fix them in the relevant task's file and re-run Steps 2-3 before proceeding. Once clean, no commit is needed for this task (verification only).
