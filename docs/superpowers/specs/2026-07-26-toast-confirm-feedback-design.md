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
silenciosa em `SelectVehicle.tsx`. Além da troca 1:1, fecha o "loop de
feedback" também no caminho feliz (hoje só erros têm algum retorno visual;
salvar/excluir/ativar/cadastrar com sucesso navegam em silêncio) e resolve
dois gaps de acessibilidade/mobile encontrados na mesma revisão: os toasts
não seriam anunciados por leitor de tela sem os atributos ARIA corretos, e
os links "Editar"/"Excluir" dos cards de lista têm área de toque menor que
o mínimo recomendado para mobile.

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
  estado, **limitado a 3 toasts visíveis simultaneamente** — ao adicionar
  um 4º, o mais antigo é removido imediatamente (evita empilhar a tela
  inteira numa falha em rajada, ex. várias chamadas paralelas falhando ao
  mesmo tempo). Expõe `useToast()` retornando `{ showToast(message: string,
  variant?: 'success' | 'error') }` — `variant` default `'error'` (a
  maioria dos call sites de hoje são mensagens de erro). Cada toast some
  sozinho depois de 4000ms (`setTimeout` + remoção do array por `id`); o
  usuário também pode fechar manualmente antes disso.
- **`src/components/ui/ToastContainer.tsx`**: renderizado uma única vez
  dentro do `ToastProvider` (ou logo abaixo dele em `App.tsx`), consome o
  array de toasts via contexto. Posição fixa (`z-40` — acima do drawer
  mobile `z-20` e do topbar `z-10` do app shell, mas abaixo do
  `ConfirmDialog`, ver seção seguinte), canto inferior,
  centralizado horizontalmente, empilhando de baixo para cima se houver
  mais de um toast simultâneo. Cada toast é um card pequeno (`rounded-lg
  shadow-lg`, `bg-green-600 text-white` para `success`, `bg-red-600
  text-white` para `error` — cores já usadas no app para os mesmos
  significados, ex. botões destrutivos em vermelho), com a mensagem e um
  botão `×` de fechar. Padding lateral respeita a mesma safe-area usada em
  `Screen.tsx`.
  - **Acessibilidade:** o container do toast de erro usa `role="alert"` +
    `aria-live="assertive"` (leitor de tela interrompe e anuncia na hora —
    apropriado pra erro); o de sucesso usa `role="status"` +
    `aria-live="polite"` (anuncia sem interromper o que o usuário estava
    fazendo).
  - **Transição:** entrada com fade + slide-up sutil (~150-200ms), saída
    com fade-out; ambas puladas (aparecer/sumir instantâneo) quando
    `prefers-reduced-motion: reduce` estiver ativo no sistema.

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
  `MobileDrawer.tsx` — `bg-black/40`, `z-50` — o diálogo é bloqueante/modal,
  por isso fica acima de qualquer toast que já esteja visível) + card
  centralizado com a mensagem e dois botões: "Cancelar" (neutro,
  `text-gray-700`) e "Excluir" (vermelho, destrutivo, mesma cor usada hoje
  nos links de exclusão em `Refuels.tsx`/`VehicleEvents.tsx`).
  - **Fechar sem confirmar:** clicar no backdrop ou apertar Esc resolve a
    promise como `false` (equivalente a clicar "Cancelar") — mesmo padrão
    já usado no `MobileDrawer.tsx`.
  - **Foco:** ao abrir, o foco inicial vai para o botão "Cancelar" (não o
    destrutivo) — evita excluir por engano com um Enter/Espaço reflexo. Ao
    fechar (por qualquer via — Cancelar, Excluir, Esc ou backdrop), o foco
    volta para o elemento que abriu o diálogo (o link/botão "Excluir" do
    card correspondente).

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

### Toasts de sucesso no caminho feliz (não existiam antes)

Hoje, ao salvar/excluir/ativar/cadastrar com sucesso, o app só navega em
silêncio — nenhuma confirmação visual de que a ação deu certo. Esses 6
pontos adicionam `showToast(..., 'success')` logo antes do `navigate(...)`
que já existe em cada um (a navegação continua acontecendo imediatamente;
o toast não bloqueia nem atrasa nada, só aparece por cima da tela seguinte):

| Arquivo | Ação | Toast novo |
|---|---|---|
| `RefuelForm.tsx` | Após `POST`/`PUT` de abastecimento bem-sucedido, antes de `navigate('/refuels')` | `showToast('Abastecimento salvo com sucesso.', 'success')` |
| `VehicleEventForm.tsx` | Após `POST`/`PUT` de evento bem-sucedido, antes de `navigate('/vehicle-events')` | `showToast('Evento salvo com sucesso.', 'success')` |
| `Refuels.tsx` | Após `DELETE` de abastecimento bem-sucedido (dentro de `handleDelete`, depois do `reload()`) | `showToast('Abastecimento excluído.', 'success')` |
| `VehicleEvents.tsx` | Após `DELETE` de evento bem-sucedido (dentro de `handleDelete`, depois do `reload()`) | `showToast('Evento excluído.', 'success')` |
| `SelectVehicle.tsx` | Após `PUT .../active` bem-sucedido, antes de `navigate('/')` | `showToast('Veículo ativado.', 'success')` |
| `VehicleNew.tsx` | Após `POST /vehicles` + ativação bem-sucedidos, antes de `navigate('/')` | `showToast('Veículo cadastrado com sucesso.', 'success')` |

## Área de toque dos links "Editar"/"Excluir" (Refuels.tsx / VehicleEvents.tsx)

Hoje, em ambas as telas, os links/botões "Editar" e "Excluir" dentro de
cada `Card` da lista são só texto (`text-sm font-bold ...`), sem padding —
a área clicável real é do tamanho do texto, bem abaixo do mínimo
recomendado (~44×44px) para alvos de toque em mobile, que é o dispositivo
principal deste app. Ajuste: envolver cada um num `padding` que amplie a
área de toque sem aumentar visualmente o texto — ex. `inline-flex
items-center px-2 py-2 -mx-2 -my-2` (o `-mx-2 -my-2` compensa o padding
adicionado, mantendo o espaçamento visual atual entre os dois links e o
resto do card). Aplica-se aos dois links de cada um dos dois arquivos (4
elementos no total). Puramente visual/de toque — não muda `onClick`,
`href`, nem o texto exibido.

## Testes

Sem suíte automatizada configurada no projeto (mesma situação de todos os
specs anteriores). Verificação manual: `npm run dev`, exercitar cada linha
das duas tabelas acima (campo vazio no Login, senha errada, senhas não
coincidindo no Register, cadastro de veículo sem campo obrigatório,
salvar/excluir abastecimento e evento com sucesso, ativar veículo, exclusão
— confirmando e cancelando — e simular falha de rede via devtools em pelo
menos um `GET` para conferir o toast de erro). Confirmar que:

- Nenhum `window.alert`/`window.confirm` nativo aparece mais em nenhum dos
  21 pontos da primeira tabela.
- Toasts de sucesso aparecem nos 6 pontos da segunda tabela, sem atrasar a
  navegação que já acontecia.
- No máximo 3 toasts visíveis ao mesmo tempo — disparar 4+ toasts em
  sequência rápida (ex. clicar em algo que falha repetidamente) remove o
  mais antigo a cada novo.
- Toasts têm transição de entrada/saída visível; com
  "reduzir movimento" ativado no SO (ou emulado via devtools →
  Rendering → Emulate CSS media feature `prefers-reduced-motion`), a
  transição some (aparecer/sumir direto).
- Via devtools (árvore de acessibilidade ou extensão de leitor de tela): o
  toast de erro expõe `role="alert"`, o de sucesso `role="status"`.
- O modal de confirmação aparece sobre o conteúdo **e sobre qualquer toast
  visível no momento**, "Cancelar" fecha sem excluir, "Excluir" prossegue
  com a exclusão exatamente como o `confirm()` nativo fazia antes.
- Ao abrir o modal de confirmação, o foco visual (anel de foco) começa no
  botão "Cancelar"; apertar Esc ou clicar no backdrop fecha sem excluir; ao
  fechar por qualquer via, o foco volta para o link "Excluir" que abriu o
  modal (navegável por Tab logo em seguida).
- Nos cards de `Refuels`/`VehicleEvents`, clicar/tocar perto do texto
  "Editar"/"Excluir" (não só exatamente em cima da palavra) já ativa o
  link — a área de toque está visivelmente maior que o texto.
- Toast/confirmação funcionam tanto em telas dentro do `AppLayout` (ex.:
  `Refuels`) quanto fora dele (`Login`/`Register`).

## Critério de sucesso

- `npm run build` passa sem erros.
- Nenhuma ocorrência de `alert(` ou `confirm(` restante em `src/routes/*.tsx`
  (buscável via `grep -rn 'alert(\|confirm(' src/routes/`).
- Todos os 21 pontos da primeira tabela e os 6 pontos da tabela de toasts de
  sucesso verificados manualmente conforme a seção de Testes.
- `ConfirmDialog` fecha com Esc/backdrop, foco inicial no "Cancelar" e foco
  de retorno funcionando.
- Links "Editar"/"Excluir" com área de toque ampliada nos 4 pontos
  (2 links × 2 arquivos).
