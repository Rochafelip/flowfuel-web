# Ajuste de botões e espaçamento — todas as páginas (mobile + desktop)

## Contexto

O app é mobile-first: componentes compartilhados (`Button`, `Screen`, `Card`, `TextField`) foram desenhados para toque em tela pequena e são reutilizados como-estão na versão web/desktop, apenas centralizados num container mais largo (`Screen wide` → `max-w-3xl`). Isso produz:

- Botões `h-12` (48px) sempre `w-full`, mesmo em telas largas onde não há necessidade de alvo de toque grande nem de esticar 100% da largura.
- Escala de espaçamento vertical inconsistente entre páginas (`mt-3`, `mt-5`, `mt-6`, `mt-8` usados sem critério claro).
- Nenhum aproveitamento da largura extra em desktop: tudo permanece empilhado numa única coluna.

Confirmado com o usuário via mockups no companion visual (opção B — "otimizado pra desktop", ver abaixo as opções descartadas A/C) que o objetivo é:
1. Reduzir altura/espaçamento dos botões **em todas as larguras** (mobile incluso), não só desktop.
2. A partir do breakpoint `lg`, reorganizar layout (grids, botões auto-width) sem quebrar a experiência mobile atual.

## Escopo

Todas as 14 rotas: `Login`, `Register`, `Activate`, `SelectVehicle`, `VehicleNew`, `Home`, `Refuels`, `RefuelForm`, `VehicleEvents`, `VehicleEventForm`, `Export`, `Profile`, `ProfileEdit`, `ChangePassword`.

Fora de escopo: mudança de paleta de cores, tipografia, ou navegação (Sidebar/Topbar/MobileDrawer já são responsivos e não são tocados).

## 1. Componente `Button` (`src/components/ui/Button.tsx`)

- Altura padrão `h-12` (48px) → `h-11` (44px), em todas as larguras. 44px continua acima do mínimo de acessibilidade para alvo de toque (WCAG 2.5.5 / Apple HIG).
- Nova prop `fullWidth?: boolean` (padrão `true` — não quebra os usos atuais). Quando `false`: `inline-flex w-auto px-6` em vez de `w-full`.
- Nova prop `variant?: 'primary' | 'danger'` (padrão `'primary'`). `danger` aplica `bg-red-600 hover:bg-red-700 active:bg-red-800` — substitui o `<button>` cru duplicado hoje em `Profile.tsx` (botão "Excluir conta permanentemente").
- Mantém `className` como override final (comportamento atual preservado).

## 2. `Screen` (`src/components/ui/Screen.tsx`)

- `safeAreaPadding`: `paddingLeft`/`paddingRight` passam a usar `max(1.25rem, env(...))` no mobile e `max(2rem, env(...))` a partir de `lg` (via classe Tailwind `lg:px-8` combinada com o padding inline atual, removendo o valor fixo do lado esquerdo/direito do `style` e movendo para classes responsivas).
- Nova prop `grid?: boolean` (padrão `false`), usável apenas com `wide`. Quando `true`, o container interno aplica `lg:grid lg:grid-cols-2 lg:gap-6` a partir do `lg`; abaixo disso continua `flex flex-col` (comportamento mobile inalterado). Usada por `Profile`.

## 3. Escala de espaçamento

Padronizar em todas as páginas:
- Dentro de um mesmo bloco lógico (ex.: campos de um card, itens de uma lista): `gap-3`.
- Entre blocos distintos da mesma página (ex.: card de stats → card de info → card de ações): `mt-6` (hoje varia entre `mt-5`, `mt-6`, `mt-8` sem critério).
- Não há mudança na tipografia ou em `p-4`/`p-3` internos dos cards — só na distância *entre* seções.

## 4. Aplicação por página

| Página | Mudança específica |
|---|---|
| `Login`, `Register`, `Activate` | Botão de submit continua `fullWidth` (padrão de formulário auth). Só herda a nova altura 44px e o gap padronizado entre campos. |
| `Home` | Gaps de `Card` padronizados para `mt-6` entre cards; botão de retry (estado de erro) vira `fullWidth={false}`. |
| `Refuels`, `VehicleEvents` | Botão "novo" no header vira `fullWidth={false}` (auto-width, alinhado à direita do título). Botão "carregar mais" (hoje `w-full` cinza) vira auto-width centralizado. |
| `RefuelForm`, `Export`, `ChangePassword`, `ProfileEdit`, `VehicleEventForm` | Botão de submit: `fullWidth` no mobile (padrão), mas com `lg:w-auto lg:self-end lg:px-8` via className override — em telas largas ele encolhe e alinha à direita do formulário. Campos que já usam `flex gap-3` (agrupamentos lado a lado) são mantidos como estão. |
| `SelectVehicle` | Botão "adicionar veículo" vira `fullWidth={false}`. Lista de veículos ganha `lg:grid lg:grid-cols-2 lg:gap-3` (hoje é `flex flex-col gap-3` sempre). |
| `VehicleNew` | Botões de navegação do wizard (voltar/avançar), hoje empilhados, passam a ficar lado a lado (`flex gap-3`) com `fullWidth={false}` em ambos a partir do mobile mesmo — já que são dois botões pequenos lado a lado, não um único CTA. |
| `Profile` | Usa `Screen wide grid`: coluna esquerda (avatar + nome + stats + botão "Sair" auto-width), coluna direita (card de info + card de ações + zona de perigo) a partir de `lg`. No mobile, ordem e empilhamento atuais são preservados. Botão "Excluir conta permanentemente" migra para `<Button variant="danger" fullWidth={false}>`. |

## Fora de escopo / riscos aceitos

- Não há criação de testes visuais automatizados (Percy/Chromatic) — validação será manual, rodando o app em viewport mobile e desktop.
- A reordenação de DOM na página `Profile` (grid `lg:grid-cols-2`) precisa manter a ordem de leitura lógica no mobile (`grid` só ativa em `lg`, então a ordem do DOM atual — que já é a ordem mobile correta — é preservada; no desktop o CSS Grid pode reordenar visualmente via `grid-column`/`order` se necessário, mas o objetivo é evitar isso e já nascer na ordem certa).
