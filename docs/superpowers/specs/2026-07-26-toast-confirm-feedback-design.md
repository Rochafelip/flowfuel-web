# Toast e Confirmação estilizada (substituindo alert()/confirm()) — Design

## Contexto

O `flowfuel-frontend` usa `window.alert()` e `window.confirm()` nativos do
navegador para todo feedback de erro/sucesso e toda confirmação de exclusão
no app hoje:

- **`alert()`**: `Login.tsx` (2 chamadas), `Register.tsx` (4), `RefuelForm.tsx`
  (3), `VehicleEventForm.tsx` (3), `VehicleNew.tsx` (2).
- **`confirm()`**: `Refuels.tsx` (1, antes de excluir um abastecimento),
  `VehicleEvents.tsx` (1, antes de excluir um evento) — ambas seguidas de um
  `alert()` de erro se a exclusão falhar.
- **Falha silenciosa** (nem alert nem toast, só `console.log`):
  `SelectVehicle.tsx`, ao falhar o carregamento da lista de veículos — o
  usuário só vê a tela vazia, sem explicação.

`alert()`/`confirm()` nativos travam a thread da UI, não podem ser
estilizados (destoam completamente da identidade visual do app) e passam
uma sensação de "site quebrado" em vez de um produto polido — é o problema
de UX mais visível do frontend hoje.

## Objetivo

Introduzir dois sistemas pequenos e reutilizáveis — toast (feedback não
bloqueante) e confirmação estilizada (modal) — e trocar **todo** ponto do
app que hoje usa `alert()`/`confirm()` por eles, incluindo o caso de falha
silenciosa em `SelectVehicle.tsx`.

## Fora de escopo (decisões já tomadas, não revisitar)

- Validação campo a campo nos formulários (borda vermelha + texto de ajuda
  por campo) — os `alert()` de "preencha os campos obrigatórios" viram
  toast, mas continuam sendo uma mensagem única, não passam a apontar qual
  campo especificamente falhou.
- Cor do `Spinner` (hoje azul, destoa da paleta verde do app).
- Redesenho do `ErrorState` (hoje só texto cinza, sem ícone/retry).
- Padronização de tipografia entre telas.
- Dark mode, testes automatizados (mesmas razões dos specs anteriores —
  projeto não tem suíte configurada).

## Arquitetura

Dois pares Context+hook novos, seguindo exatamente o mesmo padrão já
estabelecido no projeto por `AuthContext`/`VehicleContext`. Ambos são
registrados em `src/App.tsx`, **envolvendo toda a árvore de rotas** —
inclusive `Login`/`Register`, que ficam fora do `AppLayout` (ver
`docs/superpowers/specs/2026-07-26-responsive-app-shell-design.md`) — para
que toast e confirmação funcionem em qualquer tela, autenticada ou não.

### Toast

- **`src/context/ToastContext.tsx`**: `ToastProvider` guarda um array de
  `{ id: string; message: string; variant: 'success' | 'error' }` em
  estado. Expõe `useToast()` retornando `{ showToast(message: string,
  variant?: 'success' | 'error') }` — `variant` default `'error'` (a
  maioria dos call sites de hoje são mensagens de erro). Cada toast some
  sozinho depois de 4000ms (`setTimeout` + remoção do array por `id`); o
  usuário também pode fechar manualmente antes disso.
- **`src/components/ui/ToastContainer.tsx`**: renderizado uma única vez
  dentro do `ToastProvider` (ou logo abaixo dele em `App.tsx`), consome o
  array de toasts via contexto. Posição fixa, canto inferior, centralizado
  horizontalmente, empilhando de baixo para cima se houver mais de um toast
  simultâneo. Cada toast é um card pequeno (`rounded-lg shadow-lg`,
  `bg-green-600 text-white` para `success`, `bg-red-600 text-white` para
  `error` — cores já usadas no app para os mesmos significados, ex. botões
  destrutivos em vermelho), com a mensagem e um botão `×` de fechar.
  Padding lateral respeita a mesma safe-area usada em `Screen.tsx`.

### Confirmação

- **`src/context/ConfirmContext.tsx`**: `ConfirmProvider` guarda em estado,
  no máximo, um pedido de confirmação pendente:
  `{ message: string; resolve: (value: boolean) => void } | null`. Expõe
  `useConfirm()` retornando uma função `confirm(message: string):
  Promise<boolean>` — chamar `confirm(msg)` cria uma nova `Promise`, guarda
  seu `resolve` no estado, e a promise resolve `true`/`false` conforme o
  usuário clique em confirmar ou cancelar (ou feche o modal). Isso permite
  trocar o código de cada call site de `if (!confirm(msg)) return` (síncrono,
  nativo) para `if (!(await confirm(msg))) return` (assíncrono, estilizado)
  com a menor mudança possível de código em cada tela.
- **`src/components/ui/ConfirmDialog.tsx`**: renderizado uma única vez
  dentro do `ConfirmProvider`, só aparece quando há um pedido pendente.
  Overlay escuro cobrindo a tela (mesmo padrão visual do backdrop do
  `MobileDrawer.tsx` — `bg-black/40`) + card centralizado com a mensagem e
  dois botões: "Cancelar" (neutro, `text-gray-700`) e "Excluir" (vermelho,
  destrutivo, mesma cor usada hoje nos links de exclusão em
  `Refuels.tsx`/`VehicleEvents.tsx`).

## Pontos de troca (todos os `alert()`/`confirm()`/falha silenciosa do app)

| Arquivo | Hoje | Depois |
|---|---|---|
| `Login.tsx` | `alert('Por favor, preencha email e senha')` | `showToast('Por favor, preencha email e senha', 'error')` |
| `Login.tsx` | `alert('Email ou senha inválidos')` (no catch) | `showToast('Email ou senha inválidos', 'error')` |
| `Register.tsx` | `alert('Por favor, preencha todos os campos')` | `showToast(..., 'error')` |
| `Register.tsx` | `alert('As senhas não coincidem')` | `showToast(..., 'error')` |
| `Register.tsx` | `alert('A senha deve ter no mínimo 6 caracteres')` | `showToast(..., 'error')` |
| `Register.tsx` | `alert('Conta criada! ...')` + `navigate('/login')` | `showToast('Conta criada! Verifique seu email para ativar antes de entrar.', 'success')` + `navigate('/login')` (toast não bloqueia a navegação — melhora a UX em vez de só preservar o comportamento atual) |
| `Register.tsx` | `alert('Erro ao criar conta. Tente novamente.')` (no catch) | `showToast(..., 'error')` |
| `RefuelForm.tsx` | `alert('Erro ao carregar abastecimento')` (no catch de `loadRefuel`, antes de `navigate('/refuels')`) | `showToast(..., 'error')`, mantém o `navigate('/refuels')` logo em seguida |
| `RefuelForm.tsx` | `alert('Preencha todos os campos')` | `showToast(..., 'error')` |
| `RefuelForm.tsx` | `alert('Erro ao salvar abastecimento')` (no catch do submit) | `showToast(..., 'error')` |
| `VehicleEventForm.tsx` | `alert('Erro ao carregar evento')` (no catch de `loadEvent`, antes de `navigate('/vehicle-events')`) | `showToast(..., 'error')`, mantém o `navigate` |
| `VehicleEventForm.tsx` | `alert('Preencha todos os campos obrigatórios')` | `showToast(..., 'error')` |
| `VehicleEventForm.tsx` | `alert('A data do evento não pode ser futura')` | `showToast(..., 'error')` |
| `VehicleEventForm.tsx` | `alert('Erro ao salvar evento')` (no catch do submit) | `showToast(..., 'error')` |
| `VehicleNew.tsx` | `alert('Preencha todos os campos')` | `showToast(..., 'error')` |
| `VehicleNew.tsx` | `alert('Erro ao cadastrar veículo')` (no catch) | `showToast(..., 'error')` |
| `Refuels.tsx` | `if (!confirm('Excluir este abastecimento?')) return` | `if (!(await confirm('Excluir este abastecimento?'))) return` |
| `Refuels.tsx` | `alert('Erro ao excluir abastecimento')` (no catch) | `showToast(..., 'error')` |
| `VehicleEvents.tsx` | `if (!confirm('Excluir este evento?')) return` | `if (!(await confirm('Excluir este evento?'))) return` |
| `VehicleEvents.tsx` | `alert('Erro ao excluir evento')` (no catch) | `showToast(..., 'error')` |
| `SelectVehicle.tsx` | `console.log(error)` (falha silenciosa em `loadVehicles`) | adiciona `showToast('Não foi possível carregar seus veículos', 'error')` — único ponto do escopo que **adiciona** feedback onde hoje não existe nenhum, em vez de só trocar um `alert()`/`confirm()` já existente |

Todos os `console.log(err)`/`console.error(error)` que já existem junto de
cada `alert()` **permanecem** (são só depuração, não fazem parte do
feedback ao usuário).

## Testes

Sem suíte automatizada configurada no projeto (mesma situação de todos os
specs anteriores). Verificação manual: `npm run dev`, exercitar cada linha
da tabela acima (campo vazio no Login, senha errada, senhas não coincidindo
no Register, cadastro de veículo sem campo obrigatório, exclusão de
abastecimento e de evento — confirmando e cancelando — e simular falha de
rede via devtools em pelo menos um `GET` para conferir o toast de erro).
Confirmar que:

- Nenhum `window.alert`/`window.confirm` nativo aparece mais em nenhum dos
  20 pontos da tabela.
- Toasts empilham corretamente se dois aparecerem em sequência rápida e
  somem sozinhos (~4s) ou ao clicar no ×.
- O modal de confirmação aparece sobre o conteúdo, "Cancelar" fecha sem
  excluir, "Excluir" prossegue com a exclusão exatamente como o `confirm()`
  nativo fazia antes.
- Toast/confirmação funcionam tanto em telas dentro do `AppLayout` (ex.:
  `Refuels`) quanto fora dele (`Login`/`Register`).

## Critério de sucesso

- `npm run build` passa sem erros.
- Nenhuma ocorrência de `alert(` ou `confirm(` restante em `src/routes/*.tsx`
  (buscável via `grep -rn 'alert(\|confirm(' src/routes/`).
- Todos os 20 pontos da tabela acima verificados manualmente conforme a
  seção de Testes.
