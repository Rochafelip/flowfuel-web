# Indicadores de campo obrigatório no formulário de veículo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar labels visíveis com asterisco vermelho nos campos obrigatórios do formulário de cadastro/edição de veículo, e tornar "Km atual" obrigatório também no cadastro (hoje só é validado na edição).

**Architecture:** Um componente `FieldLabel` novo e reutilizável em `src/components/ui/`, aplicado nos campos de `src/routes/vehicle/fields.tsx` (compartilhado por `VehicleNew.tsx` e `VehicleEdit.tsx`). Uma legenda "* campo obrigatório" no topo de cada tela. Correção pontual de validação em `VehicleNew.tsx` para alinhar com `VehicleEdit.tsx`.

**Tech Stack:** React + TypeScript + Tailwind (sem framework de formulário, sem suíte de testes automatizados no projeto — build/typecheck via `tsc -b` é a única verificação estática disponível).

**Verificação:** Este projeto não tem testes automatizados nem servidor local de convenção neste fluxo (preferência registrada: verificar via deploy, não navegador/local). Cada tarefa é verificada com `npm run build` (roda `tsc -b && vite build`) para garantir que compila sem erros de tipo. A verificação visual final é feita após deploy.

---

### Task 1: Criar o componente `FieldLabel`

**Files:**
- Create: `src/components/ui/FieldLabel.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import type { LabelHTMLAttributes, ReactNode } from 'react'

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode
  required?: boolean
}

export function FieldLabel({ children, required = false, className = '', ...props }: FieldLabelProps) {
  return (
    <label
      className={`mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-600 dark:text-red-400"> *</span>}
    </label>
  )
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build conclui sem erros (o componente ainda não é usado em lugar nenhum, então não deve haver erro de tipo).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/FieldLabel.tsx
git commit -m "feat(ui): add FieldLabel component for required-field indicators"
```

---

### Task 2: Aplicar `FieldLabel` em `Step1Identification` (Marca, Modelo, Ano de fabricação, Ano do modelo)

**Files:**
- Modify: `src/routes/vehicle/fields.tsx:1-4` (import), `:96-153` (bloco FIPE), `:165-189` (bloco manual)

- [ ] **Step 1: Importar `FieldLabel`**

Em `src/routes/vehicle/fields.tsx`, adicionar ao topo (junto dos outros imports de `components/ui`):

```tsx
import { FieldLabel } from '../../components/ui/FieldLabel'
```

- [ ] **Step 2: Adicionar labels no bloco de busca FIPE (`useFipeSearch === true`)**

Em `Step1Identification`, dentro do bloco `{useFipeSearch ? (...` (fields.tsx:86-162), adicionar um `FieldLabel` imediatamente antes de cada `SearchableSelect`/`TextField`. Trecho completo do bloco após a mudança:

```tsx
      {useFipeSearch ? (
        <>
          <FieldLabel required>Marca</FieldLabel>
          {fipe.brandsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-3 text-sm">
              <span className="text-red-600 dark:text-red-400">Não foi possível carregar as marcas.</span>
              <button type="button" onClick={fipe.retryBrands} className="font-bold text-green-700 dark:text-green-400">
                Tentar novamente
              </button>
            </div>
          ) : (
            <SearchableSelect
              options={toSearchableOptions(fipe.brands)}
              value={fipe.brandCode}
              onChange={onFipeBrandSelect}
              placeholder="Selecione a marca"
              loading={fipe.loadingBrands}
              loadingLabel="Carregando marcas..."
            />
          )}
          {brandError && <p className="text-sm text-red-600 dark:text-red-400">Selecione a marca.</p>}

          <FieldLabel required>Modelo</FieldLabel>
          {fipe.modelsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-3 text-sm">
              <span className="text-red-600 dark:text-red-400">Não foi possível carregar os modelos.</span>
              <button type="button" onClick={fipe.retryModels} className="font-bold text-green-700 dark:text-green-400">
                Tentar novamente
              </button>
            </div>
          ) : (
            <SearchableSelect
              options={toSearchableOptions(fipe.models)}
              value={fipe.modelCode}
              onChange={onFipeModelSelect}
              placeholder="Selecione o modelo"
              disabled={!fipe.brandCode}
              loading={fipe.loadingModels}
              loadingLabel="Carregando modelos..."
            />
          )}
          {modelError && <p className="text-sm text-red-600 dark:text-red-400">Selecione o modelo.</p>}

          <FieldLabel required>Ano do modelo</FieldLabel>
          {fipe.yearsError ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-3 text-sm">
              <span className="text-red-600 dark:text-red-400">Não foi possível carregar os anos.</span>
              <button type="button" onClick={fipe.retryYears} className="font-bold text-green-700 dark:text-green-400">
                Tentar novamente
              </button>
            </div>
          ) : (
            <SearchableSelect
              options={toSearchableOptions(fipe.years)}
              value={fipe.yearCode}
              onChange={onFipeYearSelect}
              placeholder="Selecione o ano"
              disabled={!fipe.modelCode}
              loading={fipe.loadingYears}
              loadingLabel="Carregando anos..."
            />
          )}
          {modelYearError && <p className="text-sm text-red-600 dark:text-red-400">Ano do modelo inválido.</p>}

          <FieldLabel required>Ano de fabricação</FieldLabel>
          <TextField
            placeholder="Ano de Fabricação"
            value={manufactureYear}
            onChange={(e) => onManufactureYearChange(e.target.value)}
            inputMode="numeric"
          />
          {manufactureYearError && <p className="text-sm text-red-600 dark:text-red-400">Ano de fabricação inválido.</p>}

          <button
            type="button"
            onClick={onToggleManualEntry}
            className="text-sm font-bold text-green-700 dark:text-green-400"
          >
            Não encontrou? Preencher manualmente
          </button>
        </>
      ) : (
```

- [ ] **Step 3: Adicionar labels no bloco manual (`useFipeSearch === false`)**

Continuando no mesmo componente, o bloco `else` (fields.tsx:163-199) passa a:

```tsx
        <>
          <FieldLabel required>Marca</FieldLabel>
          <TextField placeholder="Marca" value={brand} onChange={(e) => onBrandChange(e.target.value)} />
          {brandError && <p className="text-sm text-red-600 dark:text-red-400">Informe a marca.</p>}

          <FieldLabel required>Modelo</FieldLabel>
          <TextField placeholder="Modelo" value={model} onChange={(e) => onModelChange(e.target.value)} />
          {modelError && <p className="text-sm text-red-600 dark:text-red-400">Informe o modelo.</p>}

          <div className="flex gap-3">
            <div className="flex-1">
              <FieldLabel required>Ano de fabricação</FieldLabel>
              <TextField
                placeholder="Ano de Fabricação"
                value={manufactureYear}
                onChange={(e) => onManufactureYearChange(e.target.value)}
                inputMode="numeric"
              />
              {manufactureYearError && <p className="text-sm text-red-600 dark:text-red-400">Inválido.</p>}
            </div>
            <div className="flex-1">
              <FieldLabel required>Ano do modelo</FieldLabel>
              <TextField
                placeholder="Ano do Modelo"
                value={modelYear}
                onChange={(e) => onModelYearChange(e.target.value)}
                inputMode="numeric"
              />
              {modelYearError && <p className="text-sm text-red-600 dark:text-red-400">Inválido.</p>}
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleManualEntry}
            className="text-sm font-bold text-green-700 dark:text-green-400"
          >
            Usar busca FIPE
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/routes/vehicle/fields.tsx
git commit -m "feat(vehicle): add required-field labels to Step1Identification"
```

---

### Task 3: Aplicar `FieldLabel` em `Step3Details` (Placa, Km atual, Cor, Capacidades)

**Files:**
- Modify: `src/routes/vehicle/fields.tsx:293-336`

- [ ] **Step 1: Adicionar labels no `Step3Details`**

Substituir o corpo de `Step3Details` (fields.tsx:293-336) por:

```tsx
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <FieldLabel required>Placa</FieldLabel>
          <TextField
            placeholder="Placa (ABC1D23)"
            value={formatLicensePlateDisplay(licensePlate)}
            onChange={(e) => onLicensePlateChange(e.target.value)}
          />
          {licensePlateError && <p className="text-sm text-red-600 dark:text-red-400">Placa inválida.</p>}
        </div>
        <div className="flex-1">
          <FieldLabel>Cor</FieldLabel>
          <TextField placeholder="Cor" value={color} onChange={(e) => onColorChange(e.target.value)} />
        </div>
      </div>

      <FieldLabel required>Km atual</FieldLabel>
      <TextField
        placeholder="Km Atual"
        value={currentKm}
        onChange={(e) => onCurrentKmChange(e.target.value)}
        inputMode="numeric"
      />
      {currentKmError && <p className="text-sm text-red-600 dark:text-red-400">Informe o odômetro atual.</p>}

      {showTankCapacity && (
        <div>
          <FieldLabel>Capacidade do tanque (L)</FieldLabel>
          <TextField
            placeholder="Capacidade do tanque (L)"
            value={tankCapacity}
            onChange={(e) => onTankCapacityChange(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}

      {showBatteryCapacity && (
        <div>
          <FieldLabel>Capacidade da bateria (kWh)</FieldLabel>
          <TextField
            placeholder="Capacidade da bateria (kWh)"
            value={batteryCapacity}
            onChange={(e) => onBatteryCapacityChange(e.target.value)}
            inputMode="decimal"
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar que compila**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/routes/vehicle/fields.tsx
git commit -m "feat(vehicle): add required-field labels to Step3Details"
```

---

### Task 4: Legenda "* campo obrigatório" nas duas telas

**Files:**
- Modify: `src/routes/VehicleNew.tsx:232-235`
- Modify: `src/routes/VehicleEdit.tsx:277-280`

- [ ] **Step 1: Adicionar legenda em `VehicleNew.tsx`**

Em `src/routes/VehicleNew.tsx`, o trecho:

```tsx
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">Cadastrar Veículo</h1>

      <WizardStepper currentStep={currentStep} />
```

vira:

```tsx
    <Screen wide>
      <h1 className="mb-1 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">Cadastrar Veículo</h1>
      <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <span className="text-red-600 dark:text-red-400">*</span> campo obrigatório
      </p>

      <WizardStepper currentStep={currentStep} />
```

- [ ] **Step 2: Adicionar legenda em `VehicleEdit.tsx`**

Em `src/routes/VehicleEdit.tsx`, o trecho:

```tsx
    <Screen wide>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">Editar veículo</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
```

vira:

```tsx
    <Screen wide>
      <h1 className="mb-1 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">Editar veículo</h1>
      <p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
        <span className="text-red-600 dark:text-red-400">*</span> campo obrigatório
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
```

- [ ] **Step 3: Verificar que compila**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/routes/VehicleNew.tsx src/routes/VehicleEdit.tsx
git commit -m "feat(vehicle): add required-field legend to vehicle form screens"
```

---

### Task 5: Tornar "Km atual" obrigatório no cadastro (`VehicleNew.tsx`)

**Files:**
- Modify: `src/routes/VehicleNew.tsx:55` (novo state), `:150-157` (validação do Step 3), `:286-287` (props passadas a `Step3Details`)

- [ ] **Step 1: Adicionar o state de erro**

Em `src/routes/VehicleNew.tsx`, logo após a linha `const [licensePlateError, setLicensePlateError] = useState(false)` (linha 55):

```tsx
  const [licensePlateError, setLicensePlateError] = useState(false)
  const [currentKmError, setCurrentKmError] = useState(false)
```

- [ ] **Step 2: Criar handler que limpa o erro ao digitar**

Logo após `handleLicensePlateChange` (fields.tsx equivalente em `VehicleNew.tsx:119-122`), adicionar:

```tsx
  function handleCurrentKmChange(value: string) {
    setCurrentKm(value)
    setCurrentKmError(false)
  }
```

- [ ] **Step 3: Validar Km atual junto da placa em `goToNextStep`**

Substituir o bloco `if (currentStep === 3)` (linhas 150-156):

```tsx
    if (currentStep === 3) {
      if (licensePlate.length !== 7) {
        setLicensePlateError(true)
        return
      }
```

por:

```tsx
    if (currentStep === 3) {
      const kmInvalid = !currentKm.trim()
      const plateInvalid = licensePlate.length !== 7
      if (plateInvalid || kmInvalid) {
        setLicensePlateError(plateInvalid)
        setCurrentKmError(kmInvalid)
        return
      }
```

Nota: `skipLicensePlate()` (linha 163-166) continua permitindo pular a placa, mas ainda passa pelo Km atual — se o usuário clicar em "Preencher placa depois" com Km atual vazio, o erro de Km não é mostrado porque esse botão não passa por `goToNextStep`. Isso é aceitável: `skipLicensePlate` deve continuar validando o Km. Ajustar também `skipLicensePlate`:

```tsx
  function skipLicensePlate() {
    if (!currentKm.trim()) {
      setCurrentKmError(true)
      return
    }
    setLicensePlateError(false)
    setCurrentStep(4)
  }
```

- [ ] **Step 4: Passar `currentKmError`/`handleCurrentKmChange` para `Step3Details`**

Em `VehicleNew.tsx`, no JSX de `currentStep === 3` (linhas 279-295), trocar:

```tsx
            currentKm={currentKm}
            onCurrentKmChange={setCurrentKm}
```

por:

```tsx
            currentKm={currentKm}
            onCurrentKmChange={handleCurrentKmChange}
            currentKmError={currentKmError}
```

- [ ] **Step 5: Verificar que compila**

Run: `npm run build`
Expected: build conclui sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/routes/VehicleNew.tsx
git commit -m "fix(vehicle): require current odometer reading when registering a vehicle"
```

---

## Self-Review (already applied above)

- **Spec coverage:** todos os campos obrigatórios da tabela do spec recebem `FieldLabel required`; os opcionais recebem `FieldLabel` sem asterisco (Cor, capacidades) ou nenhum (tipo de veículo/energia/combustível/foto — fora de escopo, spec explícito). Legenda adicionada nas duas telas. Km atual corrigido no cadastro. Placa mantida pulável no cadastro, conforme "fora de escopo" do spec.
- **Placeholders:** nenhum "TBD"/"similar to" — cada task tem código completo e specific line targets.
- **Consistência de tipos:** `FieldLabelProps` usa `required?: boolean` e `children: ReactNode`, usado de forma consistente em todas as tasks. `currentKmError`/`onCurrentKmChange` já existiam na interface `Step3Props` (fields.tsx:266-268) — não precisa mudar a interface, só o uso em `VehicleNew.tsx`.
