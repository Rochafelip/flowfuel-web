# Calculadora Flex Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tela `/flex-calculator` que diz se compensa abastecer com etanol ou gasolina, pela regra dos 70% ou pelo cálculo exato com consumo.

**Architecture:** Lógica em funções puras (`src/lib/flexFuel.ts`), tela React sem backend (`src/routes/FlexCalculator.tsx`) reutilizando `Screen`, `Card`, `FieldLabel`, `TextField` e `SegmentedToggle`. Rota protegida e item de menu.

**Tech Stack:** React 19, TypeScript, Tailwind, react-router-dom. Sem runner de testes: a verificação é `npm run build` (tsc + vite) e teste manual após deploy.

Spec: `docs/superpowers/specs/2026-10-14-flex-calculator-design.md`

---

### Task 1: Funções puras de cálculo

**Files:**
- Create: `src/lib/flexFuel.ts`

- [ ] **Step 1: Criar o módulo**

```ts
export type FuelWinner = 'ethanol' | 'gasoline' | 'tie'

const RATIO_THRESHOLD = 0.7

// Aceita vírgula ou ponto como separador decimal. Retorna null para vazio,
// não numérico, zero ou negativo.
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (normalized === '') return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

export function ratioRule(ethanolPrice: number, gasolinePrice: number) {
  const ratio = ethanolPrice / gasolinePrice
  // Arredonda a 4 casas para que 70,00% exato não vire gasolina por erro de ponto flutuante.
  const rounded = Math.round(ratio * 10000) / 10000
  let winner: FuelWinner
  if (rounded < RATIO_THRESHOLD) winner = 'ethanol'
  else if (rounded > RATIO_THRESHOLD) winner = 'gasoline'
  else winner = 'tie'
  return { ratio, winner }
}

export function exactCost(input: {
  ethanolPrice: number
  gasolinePrice: number
  ethanolKmPerLiter: number
  gasolineKmPerLiter: number
}) {
  const ethanolCostPerKm = input.ethanolPrice / input.ethanolKmPerLiter
  const gasolineCostPerKm = input.gasolinePrice / input.gasolineKmPerLiter

  if (Math.abs(ethanolCostPerKm - gasolineCostPerKm) < 1e-9) {
    return { ethanolCostPerKm, gasolineCostPerKm, winner: 'tie' as FuelWinner, savingsPercent: 0 }
  }

  const winner: FuelWinner = ethanolCostPerKm < gasolineCostPerKm ? 'ethanol' : 'gasoline'
  const cheaper = Math.min(ethanolCostPerKm, gasolineCostPerKm)
  const dearer = Math.max(ethanolCostPerKm, gasolineCostPerKm)
  const savingsPercent = ((dearer - cheaper) / dearer) * 100

  return { ethanolCostPerKm, gasolineCostPerKm, winner, savingsPercent }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/flexFuel.ts
git commit -m "feat(flex): add ratio rule and exact cost calculation"
```

---

### Task 2: Tela da calculadora

**Files:**
- Create: `src/routes/FlexCalculator.tsx`

- [ ] **Step 1: Criar a tela**

```tsx
import { useState } from 'react'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { FieldLabel } from '../components/ui/FieldLabel'
import { TextField } from '../components/ui/TextField'
import { SegmentedToggle } from '../components/ui/SegmentedToggle'
import { exactCost, parseDecimal, ratioRule, type FuelWinner } from '../lib/flexFuel'

type Mode = 'RATIO' | 'EXACT'

const brl = (value: number, digits = 2) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function winnerTitle(winner: FuelWinner) {
  if (winner === 'ethanol') return 'Abasteça com etanol'
  if (winner === 'gasoline') return 'Abasteça com gasolina'
  return 'Tanto faz'
}

function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const invalid = value.trim() !== '' && parseDecimal(value) === null
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <TextField
        id={id}
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
      />
      {invalid && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">Informe um número maior que zero</p>
      )}
    </div>
  )
}

export function FlexCalculator() {
  const [mode, setMode] = useState<Mode>('RATIO')
  const [ethanolPrice, setEthanolPrice] = useState('')
  const [gasolinePrice, setGasolinePrice] = useState('')
  const [ethanolKm, setEthanolKm] = useState('')
  const [gasolineKm, setGasolineKm] = useState('')

  const ethanolPriceValue = parseDecimal(ethanolPrice)
  const gasolinePriceValue = parseDecimal(gasolinePrice)
  const ethanolKmValue = parseDecimal(ethanolKm)
  const gasolineKmValue = parseDecimal(gasolineKm)

  let result: { title: string; lines: string[] } | null = null

  if (ethanolPriceValue !== null && gasolinePriceValue !== null) {
    if (mode === 'RATIO') {
      const { ratio, winner } = ratioRule(ethanolPriceValue, gasolinePriceValue)
      result = {
        title: winnerTitle(winner),
        lines: [`O etanol custa ${brl(ratio * 100, 1)}% do preço da gasolina (limite: 70%)`],
      }
    } else if (ethanolKmValue !== null && gasolineKmValue !== null) {
      const cost = exactCost({
        ethanolPrice: ethanolPriceValue,
        gasolinePrice: gasolinePriceValue,
        ethanolKmPerLiter: ethanolKmValue,
        gasolineKmPerLiter: gasolineKmValue,
      })
      const lines = [
        `Etanol: R$ ${brl(cost.ethanolCostPerKm, 3)} por km`,
        `Gasolina: R$ ${brl(cost.gasolineCostPerKm, 3)} por km`,
      ]
      if (cost.winner !== 'tie') {
        lines.push(`Economia de ${brl(cost.savingsPercent, 1)}% por km`)
      }
      result = { title: winnerTitle(cost.winner), lines }
    }
  }

  return (
    <Screen>
      <h1 className="mb-5 text-xl font-bold text-gray-900 dark:text-gray-100">Calculadora flex</h1>

      <div className="flex flex-col gap-4">
        <SegmentedToggle
          value={mode}
          onChange={setMode}
          options={[
            { value: 'RATIO', label: 'Regra dos 70%' },
            { value: 'EXACT', label: 'Cálculo exato' },
          ]}
        />

        <NumberField id="ethanol-price" label="Preço do etanol (R$/litro)" placeholder="Ex.: 4,29" value={ethanolPrice} onChange={setEthanolPrice} />
        <NumberField id="gasoline-price" label="Preço da gasolina (R$/litro)" placeholder="Ex.: 6,19" value={gasolinePrice} onChange={setGasolinePrice} />

        {mode === 'EXACT' && (
          <>
            <NumberField id="ethanol-km" label="Consumo com etanol (km/l)" placeholder="Ex.: 8,5" value={ethanolKm} onChange={setEthanolKm} />
            <NumberField id="gasoline-km" label="Consumo com gasolina (km/l)" placeholder="Ex.: 12" value={gasolineKm} onChange={setGasolineKm} />
          </>
        )}

        {result && (
          <Card className="p-4" >
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{result.title}</p>
            {result.lines.map((line) => (
              <p key={line} className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {line}
              </p>
            ))}
          </Card>
        )}
      </div>
    </Screen>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/routes/FlexCalculator.tsx
git commit -m "feat(flex): add flex fuel calculator screen"
```

---

### Task 3: Rota e menu

**Files:**
- Modify: `src/App.tsx` (import junto dos outros e `<Route>` após `/stations`)
- Modify: `src/components/layout/NavLinks.tsx` (array `navItems`)

- [ ] **Step 1: Registrar a rota em `src/App.tsx`**

Após `import { Stations } from './routes/Stations'` adicionar:

```tsx
import { FlexCalculator } from './routes/FlexCalculator'
```

Após `<Route path="/stations" element={<Stations />} />` adicionar:

```tsx
                    <Route path="/flex-calculator" element={<FlexCalculator />} />
```

- [ ] **Step 2: Adicionar o item no menu em `src/components/layout/NavLinks.tsx`**

Após a linha de `Postos` em `navItems` adicionar:

```ts
  { to: '/flex-calculator', label: 'Calculadora', icon: '🧮', end: false },
```

- [ ] **Step 3: Build completo**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npm run build`
Expected: `tsc -b` e `vite build` concluem sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/NavLinks.tsx
git commit -m "feat(flex): add calculator route and menu item"
```

---

### Task 4: Verificação no deploy

- [ ] **Step 1: Push**

Run: `git push`

- [ ] **Step 2: Checklist manual no deploy**

- Menu (desktop e drawer mobile) mostra "🧮 Calculadora" entre Postos e Exportar e abre `/flex-calculator`.
- Regra dos 70%: etanol 4,29 / gasolina 6,19 → 69,3% → "Abasteça com etanol". Etanol 4,50 / gasolina 6,19 → 72,7% → "Abasteça com gasolina". Etanol 7 / gasolina 10 → 70,0% → "Tanto faz".
- Cálculo exato: preços 4,29 / 6,19, consumo 8,5 / 12 → etanol R$ 0,505/km, gasolina R$ 0,516/km → etanol, economia 2,2%.
- Trocar de modo mantém os preços digitados.
- Digitar `0`, `-1` ou `abc` mostra a dica e some o resultado; campo vazio não mostra dica.
- Vírgula e ponto decimais funcionam; tema escuro legível.

---

## Self-review

- **Cobertura do spec:** funções puras (Task 1), tela com toggle, campos, resultado e empate (Task 2), rota e menu (Task 3), verificação por build e deploy (Task 4). Troca de modo mantém preços porque o estado fica no mesmo componente.
- **Placeholders:** nenhum.
- **Consistência de tipos:** `FuelWinner`, `parseDecimal`, `ratioRule` e `exactCost` têm as mesmas assinaturas nas Tasks 1 e 2.
