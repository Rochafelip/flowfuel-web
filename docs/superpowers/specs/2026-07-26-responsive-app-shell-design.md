# App Shell Responsivo (Desktop x Mobile) — Design

## Contexto

O `flowfuel-frontend` hoje não tem nenhuma navegação entre telas — foi decisão
explícita de escopo no spec `2026-07-25-mobile-responsive-ux-design.md`
("Adding navigation (bottom nav / menu) between screens" ficou fora). O
componente `Screen` (`src/components/ui/Screen.tsx`), usado em todas as
telas, aplica `max-w-md mx-auto` incondicionalmente — ou seja, mesmo em
desktop o conteúdo fica preso numa coluna com largura de celular, centralizada
no meio de uma tela vazia.

Rotas autenticadas hoje (todas dentro de `<ProtectedRoute />` em `App.tsx`):
`/` (Home/Dashboard), `/refuels`, `/refuels/new`, `/refuels/:id/edit`,
`/vehicle-events`, `/vehicle-events/new`, `/vehicle-events/:id/edit`,
`/select-vehicle`, `/vehicles/new`. `Login`/`Register` ficam fora do
`ProtectedRoute`, sem nav.

## Objetivo

Introduzir navegação real entre as seções do app, com um layout que se
adapta de verdade entre desktop e mobile — não apenas "o mesmo layout
encolhido", como é hoje. Esta spec cobre **somente o app shell** (sidebar
desktop, drawer mobile, trocador de veículo, remoção do `max-w-md` global).
O conteúdo interno de cada tela (grids do Dashboard, formulários) **não
muda** — continua com o mesmo layout de hoje, só ganha mais espaço ao redor
por não estar mais preso a `max-w-md`. Reflow do conteúdo interno (ex.: grid
do Dashboard virar 4 colunas no desktop) fica para uma spec futura.

## Arquitetura — componentes novos

Todos em `src/components/layout/`:

- **`AppLayout`** — layout-route (usa `<Outlet />` do React Router).
  Renderiza `Sidebar` + `Topbar` + `MobileDrawer` + a área de conteúdo.
  Passa a envolver todas as rotas hoje dentro de `<ProtectedRoute />`.
- **`Sidebar`** — coluna fixa à esquerda, altura total da viewport, só
  visível em telas ≥1024px (classe `hidden lg:flex`). Conteúdo: nome do
  app no topo ("⛽ FlowFuel") e os 3 links de navegação (via `NavLinks`).
  Largura fixa ~240px (`w-60`).
- **`Topbar`** — barra no topo da área de conteúdo (à direita da sidebar
  no desktop; largura total no mobile), `sticky top-0`, presente nas duas
  larguras. Contém, da esquerda pra direita: botão hambúrguer (só
  <1024px, `lg:hidden`, abre o `MobileDrawer`) e, alinhado à direita, o
  trocador de veículo.
- **`MobileDrawer`** — painel off-canvas deslizando da esquerda (overlay
  com backdrop escurecido), só relevante <1024px. Mesmo `NavLinks` da
  Sidebar + nome do app no topo do painel + botão de fechar. Fecha ao:
  clicar no backdrop, apertar Esc, ou navegar para outra rota (via
  `useEffect` observando `location.pathname`).
- **`NavLinks`** — componente compartilhado entre `Sidebar` e
  `MobileDrawer` (evita duplicar markup/estilo). Renderiza os 3 itens:

  | Rota | Label | Ícone |
  |---|---|---|
  | `/` | Dashboard | 📊 |
  | `/refuels` | Abastecimentos | ⛽ |
  | `/vehicle-events` | Eventos | 🔧 |

  Item ativo (via `useLocation().pathname` com `startsWith` — cobre
  `/refuels/new` e `/refuels/:id/edit` sob o item "Abastecimentos", mesma
  ideia para Eventos) recebe destaque visual: fundo `bg-green-100` e texto
  `text-green-700` (reaproveita o padrão de cor já usado no `IconBadge` do
  `Home.tsx`).
- **`VehicleSwitcherLink`** — link simples dentro do `Topbar`. Se houver
  `activeVehicle` (via `useVehicle()`), mostra `"{brand} {model} ▾"` e
  navega para `/select-vehicle` ao clicar (tela já existente, sem mudança
  de comportamento). Se `activeVehicle` for `null` (usuário em onboarding,
  ainda sem veículo — só ocorre dentro de `/select-vehicle` e
  `/vehicles/new`), não renderiza nada nesse lugar; o `Topbar` mostra
  apenas o nome do app.

Nenhuma lib de ícones nova é adicionada — os ícones seguem emoji, mesmo
padrão já usado em `Home.tsx` (💰⛽🧾📅).

## Troca de breakpoint: só CSS, sem JavaScript

A visibilidade de `Sidebar` vs. botão hambúrguer/`MobileDrawer` é resolvida
inteiramente por classes Tailwind (`hidden lg:flex` / `lg:hidden`, breakpoint
`lg` = 1024px, valor padrão do Tailwind). **Não há** `window.matchMedia`,
`resize` listener, nem qualquer detecção de largura via JavaScript — a
única lógica em JS é abrir/fechar o `MobileDrawer` (estado local
`isOpen: boolean` no `AppLayout`, irrelevante em telas onde ele nunca é
renderizado visualmente).

## Roteamento

`AppLayout` passa a ser uma layout-route aninhada dentro de
`<ProtectedRoute />`, envolvendo todas as rotas autenticadas atuais:

```tsx
<Route element={<ProtectedRoute />}>
  <Route element={<AppLayout />}>
    <Route path="/select-vehicle" element={<SelectVehicle />} />
    <Route path="/vehicles/new" element={<VehicleNew />} />
    <Route path="/" element={<Home />} />
    <Route path="/refuels" element={<Refuels />} />
    <Route path="/refuels/new" element={<RefuelForm />} />
    <Route path="/refuels/:id/edit" element={<RefuelForm />} />
    <Route path="/vehicle-events" element={<VehicleEvents />} />
    <Route path="/vehicle-events/new" element={<VehicleEventForm />} />
    <Route path="/vehicle-events/:id/edit" element={<VehicleEventForm />} />
  </Route>
</Route>
```

`ProtectedRoute` não muda de responsabilidade — continua só cuidando da
lógica de auth/redirect (sem token → `/login`; com token mas sem veículo
ativo → `/select-vehicle`) exatamente como hoje. `AppLayout` só cuida de
chrome visual, nunca de redirect.

## Ajuste no `Screen`

Novo prop opcional `wide?: boolean` (default `false`, preserva 100% do
comportamento atual). Quando `true`, o wrapper interno troca `max-w-md`
por `max-w-3xl` — mais espaço no desktop sem esticar o conteúdo borda a
borda em monitores ultra-wide.

`Login` e `Register` **não** passam o prop (continuam `max-w-md`,
centralizados, comportamento hoje intacto — ficam fora do `AppLayout`).
As 7 telas autenticadas (`Home`, `Refuels`, `RefuelForm`, `VehicleEvents`,
`VehicleEventForm`, `SelectVehicle`, `VehicleNew`) passam a usar
`<Screen wide>`.

## Fora de escopo (explícito)

- Reflow do conteúdo interno de qualquer tela (grid do Dashboard continua
  2 colunas, formulários continuam empilhados) — fica para spec futura.
- Qualquer lib de ícones (`lucide-react`, `heroicons` etc.) — emoji por
  enquanto, consistente com o resto do app.
- Dark mode (já fora de escopo desde a migração web-only).
- Testes automatizados (projeto não tem suíte hoje — Jest/Vitest não
  configurado; verificação continua manual).
- Notificações, avatar de usuário, ou qualquer outro item de UI no
  `Topbar` além do trocador de veículo e do hambúrguer.
- Mudar o breakpoint de 1024px por seção — é global, único, para todo o
  shell.

## Critério de sucesso / verificação manual

Sem suíte automatizada configurada no projeto, a verificação é manual via
devtools (modo responsivo) e, se possível, dispositivo real:

- **≥1024px:** sidebar fixa visível à esquerda, sem botão hambúrguer,
  item de nav ativo destacado corretamente ao navegar entre as 3 seções,
  trocador de veículo visível no Topbar.
- **<1024px (375px, 768px):** sidebar ausente, botão hambúrguer visível,
  `MobileDrawer` abre/fecha corretamente (clique no backdrop, Esc, e ao
  navegar), trocador de veículo continua visível no Topbar.
- **Onboarding sem veículo ativo** (`/select-vehicle`, `/vehicles/new`
  antes do primeiro veículo): Topbar mostra só o nome do app, sem o
  trocador de veículo.
- **`npm run build`** deve passar (TypeScript + Vite build) sem erros.
- Após validar localmente, deploy no Render (`render.yaml` existente) para
  conferir em dispositivo real, como já é o padrão dos specs anteriores.
