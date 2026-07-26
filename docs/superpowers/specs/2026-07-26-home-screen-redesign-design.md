# Home Screen Redesign — Design

## Contexto

`src/routes/Home.tsx` hoje é um grid plano de métricas (ver `docs/superpowers/specs/2026-07-25-dashboard-integration-design.md`), sem cabeçalho de veículo, sem estado de primeiro uso guiado, sem atividade recente e sem navegação persistente. `docs/HOME_SCREEN_REFERENCE.md` descreve uma versão bem mais rica da Home, extraída do app Android original, pensada como inspiração para portar ao projeto Web (Vite + React 19 + react-router-dom + Tailwind).

Este spec adapta essa referência ao que o backend (`flowfuel`) e o frontend atuais realmente suportam, cortando ou simplificando o que exigiria mudança de backend ou trabalho fora de escopo.

**Fora de escopo (decisões já tomadas, não revisitar):**
- Seção "Próximos eventos" (troca de óleo, rodízio, licenciamento com status atrasado/em dia) — removida integralmente. O backend (`VehicleEventType`, `VehicleEvent`) não tem campos de intervalo/data de vencimento; feature fica para um spec futuro dependente de mudança de backend.
- Repintura de paleta (slate/grafite como cor primária) — mantém-se a paleta verde atual (`bg-green-50`, `bg-green-600` etc.) em todo o app; só os detalhes pontuais da referência (fonte monoespaçada para números, regra de cor invertida em gasto) são incorporados.
- Selo de tendência ("+79% vs. mês anterior") no carrossel de gasto — sem dado de mês anterior confiável sem nova chamada, fica de fora.
- Bottom sheet de troca de veículo — reaproveita a rota `/select-vehicle` já existente, sem modal novo.
- Carregamento em camadas por seção (skeletons independentes) — um único loading de tela cheia é suficiente para este spec.
- Ícones "Sobre o app" e notificações no cabeçalho — cortados (YAGNI), nenhum tem função real hoje.

## Objetivo

Substituir `Home.tsx` por um dashboard estruturado (cabeçalho do veículo, carrossel de gasto, grid de indicadores, dica do dia, último abastecimento detalhado, atividade recente).

**Nota (2026-07-26):** este spec originalmente também definia a navegação persistente entre rotas protegidas (bottom nav + FAB). Essa parte foi **superada** pelo spec `docs/superpowers/specs/2026-07-26-responsive-app-shell-design.md` (sidebar fixa no desktop / drawer + hambúrguer no mobile, sem FAB) — ver seção "Navegação" abaixo. Este spec passa a cobrir **só o conteúdo da tela Home**; a navegação entre telas é responsabilidade exclusiva do spec de app shell.

## Estrutura da tela, de cima para baixo

Container: `Screen` existente (pilha vertical rolável, `gap` ~12px entre cards, padding lateral já definido por `Screen`).

### 1. Cabeçalho do veículo

- Nome do veículo (`${activeVehicle.brand} ${activeVehicle.model}`), clicável, navega para `/select-vehicle` (rota já existente).
- Subtítulo dinâmico baseado em `dashboard.lastRefuelDate`:
  - `null` → "Pronto para rodar"
  - mesma data (`toDateString`) que hoje → "Abastecido hoje"
  - 1 dia atrás → "Abastecimento foi ontem"
  - N dias atrás (N ≥ 2) → "Há N dias sem abastecer"
- Sem ícones adicionais (ver decisão de corte acima).

### 2. Ramo condicional: primeiro uso vs. uso normal

- `dashboard.totalRefuels === 0`: mostra um único `Card` central com ícone, "Pronto para começar", descrição curta, e `Button` "Registrar abastecimento" → `/refuels/new`. Itens 3 e 4 não aparecem.
- Caso contrário: segue para os itens 3 e 4 normalmente.

Card "Dica do dia" (item 5) e "Atividade recente" (item 7, se houver dados) continuam visíveis mesmo no primeiro uso; "Último abastecimento" (item 6) some no primeiro uso (não há o que mostrar).

### 3. Card "Gasto" (carrossel de 2 páginas)

- **Página 1 — gasto do mês corrente:** calculado no cliente, não vem do `DashboardDTO` (que só tem `totalSpent` acumulado). Busca `/refuels/vehicle/{id}?size=50` e `/vehicle-events/vehicle/{id}?size=50` (ambos já retornam ordenados por data decrescente, confirmado nos repositories `findByVehicleIdOrderByRefuelDateDesc` / `findByVehicleIdOrderByEventDateDescCreatedAtDescIdDesc`). Percorre os itens somando `totalAmount` (refuels) / `amount` (vehicle events) enquanto a data do item cair no mês/ano corrente; para de somar (mas não precisa parar de iterar) assim que encontrar o primeiro item de um mês anterior — seguro porque a lista já vem ordenada desc.
  - **Limitação conhecida, documentada:** se o veículo tiver mais de 50 lançamentos (refuels + eventos) só no mês corrente, a soma fica incompleta. Não há paginação adicional para cobrir esse caso nesta versão.
- **Página 2 — total acumulado:** `dashboard.totalSpent` (mesmo valor do card "Total gasto" de hoje).
- Sem selo de tendência (decisão já tomada). Dois pontinhos indicadores da página ativa.
- Valores renderizados na fonte monoespaçada (ver seção Tipografia).

### 4. Grid 2x2 de indicadores

Mesmos quatro cartões de hoje, reorganizados no layout 2x2 da referência:
- Consumo médio (`dashboard.averageConsumption` + `consumptionUnit`, oculto se `HYBRID` — mesma regra condicional já existente, breakdown por combustível/elétrico como hoje).
- Preço médio (`dashboard.averagePrice` + `priceUnit`).
- **Odômetro:** usa `dashboard.lastOdometer` (km do último abastecimento) — mesma fonte de dado que o Home atual já usa, para não introduzir uma segunda noção de "odômetro" divergente de `activeVehicle.currentKm` na mesma tela.
- Último abastecimento (rótulo textual: data formatada + "Hoje"/"Ontem"/"Há N dias", derivado da mesma lógica do subtítulo do cabeçalho).

Números em fonte monoespaçada, unidade ao lado do valor em fonte normal.

### 5. Card "Dica do dia"

- Lista fixa de ~10 dicas de economia (texto em português, hardcoded no componente).
- Seleção determinística: `tips[dayOfYear(new Date()) % tips.length]`.
- Sempre visível, inclusive no primeiro uso. Sem chamada de rede.

### 6. Card "Último abastecimento" (detalhado)

Some no primeiro uso. Usa o primeiro item da lista de refuels já buscada para a seção "Camada de dados" (`/refuels/vehicle/{id}?size=50`, ordenada desc — o primeiro item é o abastecimento mais recente). Linhas rótulo→valor, cada uma só aparece se o dado existir:
- Data (`refuelDate` formatada `pt-BR`).
- Litros ou "Energia" (`energyAmount` + unidade conforme `refuelType`).
- Valor pago (`totalAmount`, BRL).
- Preço por litro (`pricePerUnit`, já vem pronto no DTO — não precisa recalcular) — linha em negrito/destaque.

### 7. Card "Atividade recente"

Some no primeiro uso. Mescla as 5 entradas mais recentes de `/refuels/vehicle/{id}?size=5` e `/vehicle-events/vehicle/{id}?size=5` (duas chamadas, já ordenadas desc cada uma), intercalando por data no cliente e mostrando os 5 primeiros do resultado combinado. Cada linha: ícone por tipo (⛽ refuel, 🔧 manutenção/pneus/óleo, 📄 documentos/seguro/imposto, conforme `VehicleEventType`), título, data por extenso, valor em BRL alinhado à direita. Estado vazio próprio: "Nenhuma atividade registrada ainda." (não deveria ocorrer fora do primeiro uso, mas trata-se defensivamente).

## Camada de dados

Três chamadas independentes no mount do `Home`, todas aguardadas com `Promise.all` (loading único, ver Estados):
1. `authenticatedRequest('/dashboard/vehicle/{id}')` — igual a hoje.
2. `authenticatedRequest('/refuels/vehicle/{id}?page=0&size=50')` — usado para: gasto do mês (item 3), último abastecimento (item 6, primeiro item da lista) e metade da atividade recente (item 7, os 5 primeiros desses 50).
3. `authenticatedRequest('/vehicle-events/vehicle/{id}?page=0&size=50')` — usado para: gasto do mês (item 3) e metade da atividade recente (item 7, os 5 primeiros desses 50).

Não é necessário criar um novo hook: `usePaginatedList` já existente serve para os outros dois (`size=50` passado via query string no endpoint), mas para a Home os dados são consumidos "estáticos" (sem scroll infinito), então as chamadas são feitas diretamente com `authenticatedRequest` dentro de um `useEffect`, sem usar `usePaginatedList` (que é voltado para listas paginadas com "carregar mais").

## Estados

- **Loading:** um único `Spinner` de tela cheia (`Screen centered`) até as 3 chamadas resolverem — sem carregamento em camadas por seção.
- **Erro:** um único `ErrorState` de tela cheia com botão "Tentar novamente" (reexecuta as 3 chamadas) se qualquer uma das 3 falhar — mesmo padrão já usado em `Home.tsx` hoje.
- Sem pull-to-refresh (não há padrão equivalente no app hoje; fora de escopo).

## Navegação

A navegação persistente entre `Home`, `Refuels` e `VehicleEvents` é definida em `docs/superpowers/specs/2026-07-26-responsive-app-shell-design.md`: `AppLayout` envolve todas as rotas protegidas com uma sidebar fixa (≥1024px) ou drawer + botão hambúrguer (<1024px), 3 itens (Dashboard, Abastecimentos, Eventos) — **sem bottom nav, sem FAB, sem rotas placeholder de Postos/Perfil** (essas duas foram cortadas junto com o FAB; não fazem parte do escopo atual do app).

Sem FAB, os botões de ação primária no fim do conteúdo da Home (`Novo Abastecimento`, `Ver histórico de abastecimentos`, `Novo Evento`, `Ver histórico de eventos` — os mesmos que já existem no `Home.tsx` de hoje) **não são removidos**; continuam no fim do conteúdo da Home tal como estão hoje, logo após o card "Atividade recente" (item 7).

## Tipografia

- Números de destaque (gasto do carrossel, valores do grid 2x2, valores em R$ da atividade recente) usam uma fonte monoespaçada via classe Tailwind (`font-mono`, já disponível por padrão no Tailwind — não requer importar fonte nova). Restante do texto mantém a fonte padrão do app.
- Regra de cor invertida: no carrossel de gasto, se o gasto do mês corrente for maior que o gasto do mês anterior, o texto/selo usa `text-red-600`; se menor, `text-green-600`. Como não há dado de mês anterior nesta versão (página de tendência cortada), essa regra fica documentada aqui mas só se aplica se/quando a página de tendência for reintroduzida em spec futuro — **não implementar cor condicional nesta versão**, já que não há o que comparar.

## Testes

Sem suíte automatizada configurada (mesma situação do spec de dashboard-integration). Verificação manual: `npm run dev`, logar, garantir veículo ativo, conferir:
- Primeiro uso (veículo sem abastecimentos) vs. uso normal.
- Carrossel de gasto (as 2 páginas, navegação por swipe/toque nos pontinhos).
- Atividade recente mesclando refuels + eventos na ordem certa.
- Estados de loading/erro de tela cheia (simular falha de rede via devtools).
- Botões de ação (Novo Abastecimento/Novo Evento e links de histórico) no fim da tela, navegando corretamente.

Verificação da navegação em si (sidebar/drawer/item ativo) pertence ao spec `2026-07-26-responsive-app-shell-design.md`, não a este.

## Fora de escopo (não fazer agora)

- Próximos eventos com lógica de atraso (exige backend novo).
- Repintura de paleta fora da Home.
- Selo de tendência de gasto.
- Bottom sheet de troca de veículo.
- Carregamento em camadas por seção.
- Ícones "Sobre o app" e notificações.
- Pull-to-refresh.
- Navegação persistente (sidebar/drawer/hambúrguer) — ver `2026-07-26-responsive-app-shell-design.md`.
