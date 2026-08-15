# Tema Claro/Escuro/Sistema

## Contexto

O app hoje só existe em light mode: `tailwind.config.js` não tem `darkMode` configurado, e cores fixas de light mode (`bg-white`, `text-gray-900`, `bg-green-50`, badges `bg-green-100`/`bg-red-100`/`bg-blue-100`, etc.) estão espalhadas por **41 dos 49 arquivos `.tsx`** do projeto. O usuário quer poder escolher entre tema Claro, Escuro, ou Seguir o Sistema (validado via perguntas diretas, sem necessidade de mockup visual — decisão de produto, não de layout).

## Escopo

- `tailwind.config.js` — ativa `darkMode: 'class'`.
- `src/context/ThemeContext.tsx` (novo) — estado do tema, persistência, aplicação da classe `dark` no `<html>`.
- `src/main.tsx` — registra o `ThemeProvider`.
- `src/routes/Profile.tsx` — novo card "Aparência" com seletor de 3 opções.
- **41 arquivos** com classes de cor fixas ganham a variante `dark:` correspondente, seguindo a tabela de conversão da seção 4 — organizados em 4 blocos (ordem de implementação, do mais reutilizado pro mais específico):
  1. Componentes compartilhados (`Card`, `Button`, `Screen`, `TextField`, `PasswordField`, `Spinner`, `ErrorState`, `EmptyState`, `DataField`, `SegmentedToggle`, `ConfirmDialog`, `ShareVehicleDialog`, `DeleteAccountDialog`, `StationPickerDialog`, `LocationSearchDialog`, `SpendingBreakdownChart`)
  2. Navegação (`AppLayout`, `Topbar`, `Sidebar`, `MobileDrawer`, `NavLinks`, `VehicleSwitcherLink`)
  3. Autenticação (`Login`, `Register`, `Activate`, `ProtectedRoute`)
  4. Telas principais e formulários (`Home`, `Refuels`, `VehicleEvents`, `Vehicles`, `Stations`, `Export`, `Profile`, `ProfileEdit`, `ChangePassword`, `SelectVehicle`, `RefuelForm`, `VehicleEventForm`, `VehicleNew`, `VehicleEdit`, `vehicle/fields.tsx`)

Fora de escopo: um "modo automático por horário" (só sistema/manual, sem agendamento); temas customizados além de claro/escuro; persistir o tema no backend (fica só em `localStorage`, por dispositivo/navegador — igual ao padrão já usado pelo token de auth).

---

## 1. `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Com `darkMode: 'class'`, toda classe `dark:*` só se aplica quando um ancestral (aqui, o `<html>`) tem a classe `dark`. Isso é o que o `ThemeContext` controla.

## 2. `ThemeContext.tsx`

Mesmo padrão dos contexts existentes (`AuthContext`, `VehicleContext`): provider + hook, persistência em `localStorage`.

```tsx
type Theme = 'light' | 'dark' | 'system'

interface ThemeContextData {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}
```

- `theme` é a escolha do usuário (`localStorage['@theme_preference']`, padrão `'system'` se nunca escolheu).
- `resolvedTheme` é o tema efetivo: se `theme === 'system'`, reflete `window.matchMedia('(prefers-color-scheme: dark)')`; senão, é igual a `theme`.
- Um `useEffect` aplica/remove a classe `dark` em `document.documentElement` sempre que `resolvedTheme` muda.
- Quando `theme === 'system'`, um listener no `matchMedia` atualiza `resolvedTheme` automaticamente se o usuário trocar o tema do SO/navegador com o app aberto (sem precisar recarregar a página).
- `setTheme` atualiza o estado e grava em `localStorage`.

## 3. Registro do provider e seletor no Perfil

- `App.tsx`: `ThemeProvider` envolve os demais providers (`ToastProvider`/`ConfirmProvider`/`AuthProvider`/`VehicleProvider`), que já ficam registrados lá — não em `main.tsx`, que hoje só monta `<App />`.
- `Profile.tsx`: novo card "Aparência" (mesmo estilo dos cards de `InfoField`/`ActionRow` já existentes), com um seletor de 3 opções (Claro/Escuro/Sistema) — mesmo padrão visual do `SegmentedToggle`, mas com 3 opções em vez de 2. Usa `useTheme().theme`/`setTheme` diretamente.

## 4. Tabela de conversão (aplicada nos 41 arquivos)

Toda ocorrência da classe à esquerda ganha a classe `dark:` à direita, adicionada ao mesmo elemento (não substitui a classe light — Tailwind aplica uma ou outra dependendo da classe `dark` no `<html>`):

| Uso | Classe light | Classe dark adicionada |
|---|---|---|
| Fundo de página (`Screen`, `AppLayout`) | `bg-green-50` | `dark:bg-gray-950` |
| Fundo de card/superfície/diálogo/input | `bg-white` | `dark:bg-gray-800` |
| Fundo sutil (hover, placeholder de avatar) | `bg-gray-50` | `dark:bg-gray-700` |
| Fundo ativo/pressed, divisórias de lista | `bg-gray-100` | `dark:bg-gray-700` |
| Fundo do botão secundário | `bg-gray-200` | `dark:bg-gray-700` |
| Hover/active do botão secundário | `bg-gray-300` / `bg-gray-400` | `dark:bg-gray-600` / `dark:bg-gray-500` |
| Borda sutil (divisórias) | `border-gray-100` | `dark:border-gray-700` |
| Borda de card/input/botão ghost | `border-gray-200` | `dark:border-gray-700` |
| Borda de campo de formulário | `border-gray-300` | `dark:border-gray-600` |
| Texto principal | `text-gray-900` | `dark:text-gray-100` |
| Texto secundário/negrito | `text-gray-700` | `dark:text-gray-300` |
| Texto secundário/muted | `text-gray-600` | `dark:text-gray-400` |
| Texto de rótulo pequeno | `text-gray-500` | `dark:text-gray-500` (mantido — já tem contraste suficiente em ambos) |
| Texto placeholder/desabilitado | `text-gray-400` | `dark:text-gray-500` |
| Fundo de badge verde | `bg-green-100` | `dark:bg-green-900/40` |
| Texto verde de destaque (badge, link, preço) | `text-green-700` | `dark:text-green-400` |
| Fundo de badge vermelho | `bg-red-100` | `dark:bg-red-900/40` |
| Texto vermelho de destaque (badge, erro, ação destrutiva) | `text-red-600` / `text-red-700` | `dark:text-red-400` |
| Fundo de badge azul | `bg-blue-100` | `dark:bg-blue-900/40` |
| Texto azul de destaque (badge) | `text-blue-700` | `dark:text-blue-300` |
| Borda do botão `ghost-danger` | `border-red-200` | `dark:border-red-800` |
| Hover de borda do botão `ghost-danger` | `hover:border-red-300` | `dark:hover:border-red-700` |
| Hover de fundo do botão `ghost-danger` / link "Sair" | `hover:bg-red-50` | `dark:hover:bg-red-900/30` |
| Borda do chip de localidade ativa (Postos) | `border-blue-200` | `dark:border-blue-800` |
| Fundo do chip de localidade ativa (Postos) | `bg-blue-50` | `dark:bg-blue-900/30` |

Regra para classes com variante (`hover:`, `active:`, `lg:`): a mesma tabela acima se aplica à parte "base" da classe, e o resultado ganha o prefixo de volta — ex. `hover:bg-gray-50` → adiciona `dark:hover:bg-gray-700`; `active:bg-gray-100` → adiciona `dark:active:bg-gray-700`; `lg:bg-white` (usado só na `Sidebar`, que já é `hidden lg:flex`) → adiciona `dark:lg:bg-gray-800`. Exceção: `hover:bg-green-50` (hover sutil com tom de marca, usado em itens de navegação e links) → adiciona `dark:hover:bg-gray-950` em vez de um tom de verde escuro — testado visualmente durante o design e um verde bem escuro (`green-950`) fica com aparência "suja"/pouco definida sobre o fundo já escuro da página; cinza neutro lê como um estado "pressionado" limpo, mantendo a mesma intenção (feedback discreto de hover).

Cores que **não mudam** entre temas (já têm contraste suficiente nos dois): `bg-green-600`/`bg-green-700`/`bg-green-800` (botão primário), `bg-red-600`/`bg-red-700`/`bg-red-800` (botão de perigo), `border-green-500`/`border-green-600` (foco de campo de texto, preset de raio ativo), `text-white`, `bg-black/40` (overlay de diálogo), `focus-visible:outline-green-600`/`outline-red-600` (anéis de foco), ícones/emojis.

## 5. Card "Aparência" no Perfil

```tsx
function AppearanceCard() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Aparência</p>
      <div className="flex rounded-lg border border-gray-300 p-1 dark:border-gray-600">
        {(['light', 'dark', 'system'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
              theme === option
                ? 'bg-green-600 text-white'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {option === 'light' ? 'Claro' : option === 'dark' ? 'Escuro' : 'Sistema'}
          </button>
        ))}
      </div>
    </div>
  )
}
```

Reaproveita a mesma estrutura visual do `SegmentedToggle`, mas inline no `Profile.tsx` (o componente genérico é fixo em 2 opções tipadas por `T extends string`; usar 3 aqui funcionaria com a mesma assinatura, mas o texto tri-estado com label diferente por opção fica mais simples como um bloco dedicado do que forçando no componente genérico).

## Fora de escopo / riscos aceitos

- Sem testes automatizados (não há framework de testes no projeto); verificação por `npx tsc -b`, `npm run build`, e checagem visual manual nas duas telas de cada tema no deploy preview.
- `prefers-color-scheme` não é suportado em navegadores muito antigos — nesse caso, `system` cai silenciosamente em light (comportamento padrão do `matchMedia`, sem crash).
- Gráfico `SpendingBreakdownChart` usa cores de dados fixas (`RANK_COLORS`) que já têm bom contraste em fundo claro; em dark mode, o fundo do card ao redor escurece (`dark:bg-gray-800`) mas as cores das fatias do gráfico continuam as mesmas — ficou validado que todas têm contraste suficiente contra `gray-800` também, então não precisam de variante própria.
