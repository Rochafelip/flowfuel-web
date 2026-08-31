# Indicadores de campo obrigatório no formulário de veículo — Design

## Contexto

`VehicleNew.tsx` (cadastro, wizard de 4 etapas) e `VehicleEdit.tsx` (edição,
página única) compartilham os campos de `src/routes/vehicle/fields.tsx`, mas
nenhum dos dois indica visualmente quais campos são obrigatórios. Não existe
`<label>` nos campos de texto — `TextField` usa apenas `placeholder` — e o
único feedback é uma mensagem de erro vermelha que só aparece depois que o
usuário tenta avançar/salvar. Não há componente `Label`/`FormField`
reutilizável no projeto (confirmado via busca em `src/components`).

Validação atual (levantada em código):

| Campo | Obrigatório hoje? |
|---|---|
| Marca | Sim (`VehicleNew.tsx:132`, `VehicleEdit.tsx:187`) |
| Modelo | Sim (`VehicleNew.tsx:133`, `VehicleEdit.tsx:188`) |
| Ano de fabricação | Sim (`VehicleNew.tsx:134`, `VehicleEdit.tsx:189`) |
| Ano do modelo | Sim (`VehicleNew.tsx:135`, `VehicleEdit.tsx:190`) |
| Placa | Sim, mas pulável no cadastro via "Preencher placa depois" (`VehicleNew.tsx:163-166`); obrigatória e não pulável na edição (`VehicleEdit.tsx:191`) |
| Km atual | **Inconsistente**: não validado no cadastro (`VehicleNew.tsx`, vai como `0` se vazio); obrigatório na edição (`VehicleEdit.tsx:192`) |
| Cor, capacidade de tanque/bateria, tipo de veículo, tipo de energia, combustível, foto | Opcionais (têm valor padrão ou são explicitamente opcionais) |

## Objetivo

1. Tornar visualmente claro, antes de tentar submeter, quais campos são
   obrigatórios.
2. Corrigir a inconsistência do Km atual: passa a ser obrigatório também no
   cadastro.
3. Placa continua pulável no cadastro (comportamento intencional — carro novo
   pode não ter placa ainda) e obrigatória na edição; apenas ganha o
   indicador visual de obrigatoriedade nos dois lugares.

## Componente novo: `FieldLabel`

`src/components/ui/FieldLabel.tsx` — label reutilizável para os campos do
formulário, seguindo o estilo já usado nos títulos "Tipo de energia"/"Tipo de
combustível" (`fields.tsx:223`, `text-sm font-bold text-gray-700
dark:text-gray-300`):

```tsx
interface FieldLabelProps {
  children: React.ReactNode
  required?: boolean
  htmlFor?: string
}

export function FieldLabel({ children, required, htmlFor }: FieldLabelProps) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300">
      {children}
      {required && <span className="text-red-600 dark:text-red-400"> *</span>}
    </label>
  )
}
```

Esse é o primeiro `<label>`/componente de label do app — passa a ser a
convenção para novos formulários, mas este design só aplica no formulário de
veículo.

## Aplicação em `fields.tsx`

Cada `TextField`/`SearchableSelect` de `Step1Identification` e
`Step3Details` ganha um `FieldLabel` acima:

- Marca — `<FieldLabel required>Marca</FieldLabel>`
- Modelo — `<FieldLabel required>Modelo</FieldLabel>`
- Ano de fabricação — `<FieldLabel required>Ano de fabricação</FieldLabel>`
- Ano do modelo — `<FieldLabel required>Ano do modelo</FieldLabel>` (também
  no combo FIPE, acima do `SearchableSelect` de ano)
- Placa — `<FieldLabel required>Placa</FieldLabel>`
- Km atual — `<FieldLabel required>Km atual</FieldLabel>`
- Cor — `<FieldLabel>Cor</FieldLabel>` (sem asterisco)
- Capacidade do tanque / bateria — `<FieldLabel>...</FieldLabel>` (sem
  asterisco)

`placeholder` dos `TextField` correspondentes é mantido como texto de
exemplo/ajuda (ex.: placa mantém placeholder `"ABC1D23"`), não como label.

Os títulos já existentes em `Step2Classification` ("Tipo de energia", "Tipo
de combustível") e o `SegmentedToggle` de tipo de veículo em
`Step1Identification` **não** ganham asterisco (têm valor padrão, não podem
ficar vazios) — ficam como estão.

`Step4Photo` mantém o texto "Adicione uma foto do veículo (opcional)" sem
alteração.

## Legenda no topo da tela

Logo abaixo do `<h1>` de cada tela, um texto discreto:

```tsx
<p className="mb-4 text-center text-xs text-gray-500 dark:text-gray-400">
  <span className="text-red-600 dark:text-red-400">*</span> campo obrigatório
</p>
```

Em `VehicleNew.tsx` (abaixo do `<h1>Cadastrar Veículo</h1>`, antes do
`WizardStepper`) e em `VehicleEdit.tsx` (abaixo do `<h1>Editar veículo</h1>`).

## Correção: Km atual obrigatório no cadastro

Em `VehicleNew.tsx`:

- Novo estado `const [currentKmError, setCurrentKmError] = useState(false)`.
- `Step3Details` já aceita `currentKmError`/`onCurrentKmChange`; passar a
  usar um handler que limpa o erro, igual ao padrão de
  `VehicleEdit.tsx:172-175` (`handleCurrentKmChange`).
- Em `goToNextStep()`, no bloco `if (currentStep === 3)`, acrescentar a
  checagem `const kmInvalid = !currentKm.trim()` junto da checagem de placa
  já existente, definindo `currentKmError` e bloqueando o avanço se inválido
  (mesma lógica de `VehicleEdit.tsx:191-201`, adaptada ao fluxo de wizard que
  também permite pular a placa).

## Fora de escopo

- Unificar o comportamento de "pular placa" entre cadastro e edição —
  mantido como está, é intencional.
- Introduzir `FieldLabel` em outras telas do app (login, reabastecimento,
  etc.) — fica restrito ao formulário de veículo neste design.
- Migração para uma lib de formulário (react-hook-form/zod) — fora de
  escopo, o app não usa nenhuma hoje.
