# Referência de Telas do App Android — Contexto para o Web

> Documento gerado em 2026-07-27 a partir do código-fonte do app Android
> FlowFuel (`flowfuel-app`, Kotlin/Jetpack Compose). Objetivo: dar aos
> desenvolvedores da versão **web** (`flowfuel-frontend`, Vite/React/TS) o
> contexto completo de **todas** as telas do mobile — campos, regras de
> negócio, navegação e endpoints — para adaptar/completar a experiência web
> com foco em desktop/mouse/teclado, sem reproduzir cegamente padrões de
> touch mobile.
>
> Este documento é **funcional/factual** (o que cada tela faz e precisa). Para
> a Home especificamente já existe um documento de **design visual**
> detalhado em [`HOME_SCREEN_REFERENCE.md`](./HOME_SCREEN_REFERENCE.md)
> (cores, tipografia, espaçamento) — aqui a Home é tratada de forma resumida,
> com foco no formulário de abastecimento (Quick Refuel) que aquele documento
> não cobre em detalhe.
>
> Todo o app usa **Clean Architecture + MVVM**: cada tela tem um
> `ViewModel` com `StateFlow<UiState>` (estados sealed: `Loading` /
> `Success`/`Content` / `Error` / `Empty`) e um `Channel` de efeitos
> one-shot para navegação. Isso mapeia bem para hooks React + reducer/state
> machine no lado web.

---

## 1. Mapa de navegação do Android (rotas)

```
splash → onboarding (1ª vez) → login
login → vehicle/picker (pós-login)
vehicle/picker → vehicle/add (se 0 veículos, automático) | main (se selecionou veículo)
vehicle/add → main (após cadastrar)
main (bottom nav: Home | Histórico | Postos | Eventos | Perfil)
  main/home
  main/history
  main/stations
  main/events
  main/profile

Rotas empilhadas fora do bottom nav (acessíveis a partir das abas):
  auth/check-email/{email}?token=      — confirmação de e-mail / ativação
  auth/reset-password/{email}          — redefinir senha com código
  auth/change-password                 — trocar senha (autenticado)
  auth/edit-profile                    — editar perfil
  vehicle/details/{vehicleId}          — detalhes do veículo
  vehicle/edit/{vehicleId}             — editar veículo
  vehicle/odometer/{vehicleId}/{km}    — atualizar odômetro (fluxo dono)
  vehicle/manage                       — gestão de veículos (lista completa, a partir do Perfil)
  vehicle/share/{vehicleId}            — compartilhar veículo (dono)
  vehicle-share/{shareId}              — aceitar/recusar convite (convidado)
  refuel/details/{refuelId}            — detalhes do abastecimento
  refuel/edit/{refuelId}               — editar abastecimento
  vehicle/events/{vehicleId}           — lista de eventos de um veículo específico
  vehicle/events/create/{vehicleId}    — criar evento (?category=, ?guestMode=)
  vehicle/events/details/{eventId}     — detalhes do evento
  vehicle/events/edit/{eventId}        — editar evento
```

Deep link `flowfuel://<rota>` reaproveita as mesmas rotas internas (equivalente a URLs diretas no web — já é o modelo natural do React Router).

---

## 2. Paridade Android → Web (o que já existe, o que falta)

Rotas web atuais (`src/App.tsx`, 2026-07-27): `/login`, `/register`, `/activate`, `/select-vehicle`, `/vehicles/new`, `/` (Home), `/refuels`, `/refuels/new`, `/refuels/:id/edit`, `/vehicle-events`, `/vehicle-events/new`, `/vehicle-events/:id/edit`, `/export`, `/profile`, `/profile/edit`, `/profile/change-password`.

| Tela Android | Rota Android | Status no web | Observação |
|---|---|---|---|
| Onboarding | `onboarding` | ❌ não existe | provavelmente dispensável no web (onboarding de app é menos comum em web) |
| Login | `login` | ✅ `/login` | |
| Register | `register` | ✅ `/register` | |
| ForgotPassword | `forgot` | ❓ verificar | não há rota dedicada visível; pode estar dentro de `Activate.tsx` ou ausente |
| CheckEmail (confirmar e-mail / reenvio / ativar por token) | `auth/check-email/{email}` | ⚠️ parcial via `/activate` | web parece unificar ativação em `Activate.tsx`; confirmar se cobre reenvio de e-mail e ativação manual por código |
| ResetPassword | `auth/reset-password/{email}` | ❌ não encontrada rota dedicada | avaliar se está embutida em algum outro fluxo |
| VehiclePicker | `vehicle/picker` | ✅ `/select-vehicle` | |
| AddVehicle (wizard 4 etapas) | `vehicle/add` | ✅ `/vehicles/new` | conferir se replica os 4 steps (FIPE, tipo/energia, detalhes, foto) ou é formulário único |
| VehicleDetails (somente leitura) | `vehicle/details/{id}` | ❌ não existe | falta página de detalhe/leitura de 1 veículo |
| EditVehicle | `vehicle/edit/{id}` | ❌ não existe | só há criação (`/vehicles/new`), não há edição |
| VehiclesScreen (gestão/lista, paginada, delete, trocar ativo) | `vehicle/manage` | ❌ não existe | crítico — não há como listar/editar/excluir veículos existentes no web |
| GuestVehicleScreen (modo convidado) | embutido na Home | ❌ não existe | depende de Vehicle Share existir primeiro |
| ShareVehicleScreen (compartilhar, dono) | `vehicle/share/{id}` | ❌ não existe | feature de compartilhamento de veículo inteira ausente no web |
| ShareInviteScreen (aceitar convite) | `vehicle-share/{id}` | ❌ não existe | idem |
| UpdateOdometerScreen (dono, com validação de regressão) | `vehicle/odometer/{id}/{km}` | ❌ não existe | web não tem tela dedicada de atualizar odômetro isoladamente |
| HomeScreen (dashboard) | `main/home` | ✅ `/` | ver `HOME_SCREEN_REFERENCE.md` |
| QuickRefuelBottomSheet (criar abastecimento) | bottom sheet global | ✅ `/refuels/new` (como página, não modal) | web já cobre o formulário — conferir paridade de campos (ver seção 6) |
| VehicleSwitcherBottomSheet | bottom sheet na Home | ❓ verificar | trocar de veículo ativo pode estar em `/select-vehicle` reaproveitado |
| HistoryScreen (lista paginada, filtros, agrupada por mês) | `main/history` | ✅ `/refuels` | conferir se tem filtros de período e agrupamento por mês como o mobile |
| RefuelDetailsScreen (somente leitura) | `refuel/details/{id}` | ❌ não existe | web só tem `/refuels/new` e `/refuels/:id/edit`, sem página de detalhe read-only |
| EditRefuelScreen | `refuel/edit/{id}` | ✅ `/refuels/:id/edit` | |
| VehicleEventsScreen (timeline: eventos + abastecimentos) | `main/events` | ✅ `/vehicle-events` | conferir se mistura refuels na timeline como o mobile |
| CreateVehicleEventScreen | `vehicle/events/create/{id}` | ✅ `/vehicle-events/new` | |
| VehicleEventDetailsScreen (somente leitura) | `vehicle/events/details/{id}` | ❌ não existe | mesmo padrão do RefuelDetails — falta página de detalhe read-only |
| EditVehicleEventScreen | `vehicle/events/edit/{id}` | ✅ `/vehicle-events/:id/edit` | |
| StationsScreen (postos de combustível/recarga) | `main/stations` | ❌ não existe | feature inteira ausente no web (ver seção 9 sobre adaptação de geolocalização) |
| ExportBottomSheet | acessível de várias telas | ✅ `/export` | conferir formatos suportados (CSV/PDF, não XLSX — ver seção 10) |
| ProfileScreen | `main/profile` | ✅ `/profile` | conferir paridade: stats agregadas, convites pendentes, exclusão de conta |
| EditProfileScreen | `auth/edit-profile` | ✅ `/profile/edit` | |
| ChangePasswordScreen | `auth/change-password` | ✅ `/profile/change-password` | |
| UpdateAvailableDialog (update de APK) | dialog na Home | 🚫 não aplicável | ver seção 11 |
| NotificationPermissionViewModel | dialog/rationale | 🚫 não aplicável (por ora) | ver seção 11 |

**Prioridades sugeridas de lacunas (mais impactante primeiro):** (1) gestão de veículos — listar/editar/excluir/trocar ativo fora do onboarding inicial; (2) páginas de detalhe read-only de abastecimento e evento (hoje o usuário só consegue editar, não visualizar sem editar); (3) compartilhamento de veículo (share/invite/guest mode) — feature completa ausente; (4) postos próximos; (5) esqueci senha / reset / reenvio de ativação como fluxos explícitos, se `Activate.tsx` não cobrir tudo.

---

## 3. Padrões transversais (replicar 1:1 no cliente web)

### Autenticação e erros
- Header de auth: rotas de login/registro/forgot/reset/activate/resend/refresh vão **sem token** (`No-Auth: true`); as demais exigem Bearer token.
- **HTTP 401 é sobrecarregado** pelo backend (mesmo código para "sessão expirada" e "credenciais inválidas") — o app reinterpreta por contexto:
  - Em Login → "E-mail ou senha incorretos."
  - Em ChangePassword → "Senha atual incorreta." (mantém o campo "senha atual" preenchido, limpa só os novos)
  - Em ResetPassword/ActivateAccount → "Código inválido, expirado ou já usado."
  - Em qualquer outra tela autenticada → limpar sessão local e redirecionar para `/login`.
- Erros da API vêm com um `code` (string) — mapear para mensagens fixas em pt-BR (ex.: `VALIDATION_FAILED`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATED`, `RATE_LIMITED`). `VALIDATION_FAILED` traz `fieldErrors: [{field, message}]` que deve popular o campo específico do formulário, não só um erro genérico.
- **Rate limit (429):** cooldown com contagem regressiva exibida no próprio botão de submit. Defaults observados: login/register 60s, forgot-password 3600s (1h), resend-activation 30s.
- Qualquer alteração num campo de formulário limpa o erro daquele campo **e** os erros gerais/do servidor (evita mensagem obsoleta na tela).

### Validação client-side
- E-mail: regex padrão de e-mail (equivalente a `Patterns.EMAIL_ADDRESS`).
- Senha: mínimo 8 caracteres (sem exigência de maiúscula/número/símbolo).
- Telefone (só no Register): E.164 com/sem `+`, 10–15 dígitos após remover não-dígitos. `EditProfile` **não** valida telefone (diferente do Register).
- Confirmação de senha: comparação exata de string.
- Placa de veículo: 7 caracteres; formato antigo (`ABC1234`) é reformatado visualmente para `ABC-1234`; placas Mercosul (`ABC1D23`) não são reformatadas. Input forçado para maiúsculas.

### Dirty-state / descarte de alterações
Padrão presente em `EditProfile`, `EditVehicle`, `CreateVehicleEvent`, `EditVehicleEvent`: ao carregar o formulário, guarda um snapshot inicial; qualquer edição recalcula `isDirty` comparando contra o snapshot. Tentar sair (botão voltar) com `isDirty=true` abre confirmação destrutiva "Descartar alterações?". No web, replicar com guard de rota (`beforeunload`/prompt de navegação) em vez de interceptar o botão físico de voltar.

### Paginação
Backend usa paginação clássica Spring: `GET .../recurso?page=N&size=M` → `{content: [], page, size, totalElements, totalPages}`. `hasMore = page + 1 < totalPages`. Padrão em Vehicles, History (refuels) e VehicleEvents: scroll infinito que dispara a próxima página quando faltam ~3 itens para o fim da lista atual, com deduplicação por `id` ao concatenar páginas. No web, considerar paginação tradicional (botões/números) OU infinite scroll — ambos são aceitáveis, infinite scroll é só o padrão mobile, não uma exigência de produto.

### Formatos regionais (pt-BR) — usar sempre
- Moeda: `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})` → "R$ 1.234,56".
- Números decimais (litros, consumo): vírgula como separador decimal.
- Datas em listas: `dd/MM/yyyy` ou `dd MMM yyyy`; em detalhes/formulários: por extenso, `"d 'de' MMMM 'de' yyyy"`.
- **Preço por unidade nunca é digitado pelo usuário** — é sempre derivado: `pricePerUnit = totalPrice / energyAmount`, calculado no cliente antes de enviar `POST/PUT refuels`. O formulário só pede "Litros/kWh" e "Valor total pago".

### Modelo de capacidade do veículo (atenção ao portar)
O backend representa capacidade de tanque **e** de bateria com o **mesmo campo** `capacity: number` — o client decide a UI (tanque vs. bateria) olhando `energyType`. Não são dois campos separados na API.

---

## 4. Autenticação — telas detalhadas

### LoginScreen
- **Campos:** `email` (regex e-mail), `password` (obrigatório, sem regra de força aqui).
- **Regras:** botão habilita só com os dois campos preenchidos; validação de formato roda no submit. Código `ACCOUNT_NOT_ACTIVATED` não mostra erro — navega direto para a tela de confirmação de e-mail com o e-mail preenchido.
- **Endpoint:** `POST auth/login {email, password}` → `{user, accessToken, refreshToken, expiresIn}`.

### RegisterScreen
- **Campos:** `name` (obrigatório), `email` (regex), `phone` (E.164, helper "Ex: +5511999999999"), `password` (≥8), `confirmPassword` (igual a password).
- **Regras:** trocar `password` também limpa erro de `confirmPassword`.
- **Endpoint:** `POST auth/register {name, email, password, phone}` → `UserResponseDto`; e-mail confirmado usado na navegação para CheckEmail vem da **resposta** da API, não do campo local.

### ForgotPasswordScreen
- **Campo:** `email` (regex).
- **UI:** duas variantes (formulário / sucesso) com transição de fade — tela de sucesso mostra mensagem propositalmente ambígua ("Se o e-mail existir, você receberá as instruções") por segurança (não revela se o e-mail existe na base). Cooldown de reenvio bem mais agressivo (1h) que outros fluxos.
- **Atalho:** botão "Já tenho um código" pula direto para ResetPassword levando o e-mail digitado.
- **Endpoint:** `POST auth/forgot-password {email}`.

### CheckEmailScreen
- **Parâmetros de entrada:** `email`, `initialToken` opcional (vindo de deep link `flowfuel://activate?token=...`, preenche o campo automaticamente).
- **Campo:** `activationToken` (texto, para ativação manual).
- **Ações:** "Reenviar e-mail" (cooldown 30s) e "Ativar com código" (campo de token). Ativação bem-sucedida **já loga o usuário automaticamente** (a resposta da API já traz tokens de sessão) e navega direto para a Home — não exige login manual depois.
- **Endpoints:** `POST auth/resend-activation {email}`; `POST auth/activate {token}` → `AuthResponseDto`.

### ResetPasswordScreen
- **Campos:** `token`, `newPassword` (≥8), `confirmPassword` (igual).
- **Regra:** em qualquer falha, limpa `newPassword`/`confirmPassword` (força re-digitação por segurança).
- **Endpoint:** `POST auth/reset-password {token, newPassword}`.

### ChangePasswordScreen (autenticado)
- **Campos:** `currentPassword`, `newPassword` (≥8), `confirmPassword`.
- **Regra especial:** 401 aqui vira "Senha atual incorreta" — e só limpa os campos novos, mantendo `currentPassword` preenchido (diferente das outras telas, que limpam tudo em erro).
- **Endpoint:** `PUT auth/{userId}/password {currentPassword, newPassword}`.

### ProfileScreen
- Hub de conta: dados pessoais, **stats agregadas no cliente** (não existe endpoint único de estatísticas — o app soma em paralelo: quantidade de veículos, total de abastecimentos por veículo via `totalElements` da paginação, total de eventos por veículo), convites de compartilhamento pendentes (busca lista; como só pode haver 1 compartilhamento ativo por vez, normalmente 0 ou 1 item — clique vai direto pro convite, sem tela intermediária de lista), avatar com upload/crop/remoção, notificações (link para configurações do sistema — web pode omitir ou linkar para configurações de notificação do browser), logout, exclusão de conta.
- **Exclusão de conta:** dialog exige digitar literalmente `DELETE` (case-sensitive) para habilitar o botão.
- **Endpoints:** `GET auth/{userId}/profile`, `POST auth/{userId}/upload-profile-picture` (multipart), `DELETE auth/{userId}/profile-picture`, `DELETE auth/{userId}`, `POST auth/logout`.

### EditProfileScreen
- **Campos:** `name` (obrigatório), `phone` (sem validação de formato aqui — diferente do Register; enviado como `null` se vazio).
- Padrão dirty-state completo (ver seção 3). 401 aqui, diferente de outras telas de erro, navega direto para login (não só mostra erro).
- **Endpoint:** `PUT auth/{userId}/profile {name, phone}`.

---

## 5. Veículos — telas detalhadas

### AddVehicleScreen — wizard de 4 etapas
Stepper visual com 4 passos: **Identificação → Classificação → Detalhes → Foto**. Botão voltar do sistema volta um passo (não sai da tela) enquanto o veículo ainda não foi criado.

**Step 1 — Identificação:** dois modos alternáveis:
- **Modo FIPE (padrão):** 3 dropdowns em cascata — Marca → Modelo → Ano do modelo, consultando a API pública `parallelum.com.br/fipe/api/v1/{tipo}/marcas[...]` (sem autenticação, `tipo` = `carros`/`motos`). Cada nível reseta e desabilita os inferiores até carregar. Selecionar "Ano do modelo" também preenche automaticamente "Ano de fabricação" (editável depois). Botão "Não encontrei meu veículo" alterna para modo manual.
- **Modo manual:** campos de texto livre para Marca, Modelo, Ano de fabricação, Ano do modelo.
- Validação: marca/modelo não-vazios; anos com 4 dígitos válidos.

**Step 2 — Classificação:**
- Tipo: Carro | Moto (trocar reseta os campos FIPE do Step 1 e recarrega marcas do novo tipo).
- Energia: Combustão | Elétrico | Híbrido (3 cards).
- Combustível (só visível se Combustão/Híbrido): Gasolina | Etanol | Diesel | Flex (default) | GNV.
- Sem validação obrigatória — sempre pode avançar.

**Step 3 — Detalhes:**
- Placa (obrigatória, 7 caracteres, com opção "Preencher depois" que pula a validação).
- Cor (opcional).
- Odômetro atual (opcional, vai como 0 se vazio).
- Capacidade do tanque (L) — só se Combustão/Híbrido.
- Capacidade da bateria (kWh) — só se Elétrico/Híbrido.

**Step 4 — Foto:** obrigatória para concluir (regra do produto: todo veículo tem foto). Botão "Pular" gera uma foto template local (silhueta de carro/moto) em vez de deixar sem foto — não é opcional de verdade, é "foto automática vs. escolhida".

**Submissão:** `POST /vehicles` (cria o veículo primeiro), depois `POST /vehicles/{id}/photo` (multipart). Se o upload da foto falhar, o veículo já foi criado — retry só reenvia a foto, não duplica o veículo.

### EditVehicleScreen
Mesmos campos do wizard, mas em tela única (sem steps). Diferenças importantes:
- **Placa e odômetro passam a ser obrigatórios** para salvar (no wizard de criação eram opcionais/"preencher depois").
- Upload de foto é **imediato** ao trocar (não espera o botão "Salvar").
- Padrão dirty-state completo com dialog de descarte.
- **Endpoint:** `GET /vehicles/{id}`, `PUT /vehicles/{id}`, `POST /vehicles/{id}/photo`.

### VehicleDetailsScreen (somente leitura)
Cards: Identificação (placa/cor/anos), Tipo & Energia, Telemetria (odômetro, capacidades), Status (`isActive` do backend — **atenção:** é um campo diferente de "veículo ativo do usuário", que é uma escolha de sessão, não uma propriedade do veículo). Ações: "Atualizar odômetro", "Histórico de Eventos", "Compartilhar veículo". Pull-to-refresh. **Endpoint:** `GET /vehicles/{id}`.

### VehiclesScreen (gestão completa — lista paginada)
Lista todos os veículos do usuário (**próprios** + **compartilhados com ele**, em seções separadas), com paginação infinita (20/página), preservação de posição de scroll ao navegar e voltar.
- **Trocar veículo ativo:** atualização **otimista** (UI muda antes da resposta da API confirmar).
- **Excluir:** confirmação destrutiva → `DELETE /vehicles/{id}` → recarrega lista do zero.
- **Veículos compartilhados:** seção "Compartilhados comigo", vindos de `GET /vehicle-shares/active-for-me`; clique entra em modo convidado (`GuestVehicleScreen`).
- Menu de contexto por card: "Definir como ativo", "Eventos", "Editar", "Excluir".
- **Endpoints:** `GET /vehicles?page&size=20`, `GET /vehicle-shares/active-for-me`, `PUT /vehicles/{id}/active`, `DELETE /vehicles/{id}`.

### VehiclePickerScreen (seleção pós-login)
Estruturalmente igual à `VehiclesScreen`, mas só seleção (sem editar/excluir). **Se a lista vier vazia, redireciona automaticamente para o cadastro de veículo** — nunca mostra estado vazio nesta tela específica.

### GuestVehicleScreen (modo convidado)
Tela mínima para quem está usando um veículo emprestado: título do veículo, "Veículo emprestado até {data}", campo de atualizar odômetro (validação simples: só `> 0`, sem checagem de regressão) e atalhos para "Abastecer" / "Registrar despesa". **Regra de saída forçada:** se o dono revoga o compartilhamento enquanto o convidado está na tela, a próxima chamada retorna `FORBIDDEN_OPERATION` → a sessão limpa o veículo ativo e redireciona ao seletor com uma mensagem explicativa.

### ShareVehicleScreen (dono compartilhando)
Máquina de estados por status do compartilhamento:
- **Sem compartilhamento:** formulário com e-mail do convidado + duração (botões toggle 1/3/7/14/30 dias, default 3) → `POST /vehicle-shares`.
- **Pendente:** "Convite enviado para {nome}, aguardando resposta." + botão "Cancelar convite" → `DELETE /vehicle-shares/{id}`.
- **Ativo:** "Compartilhado com {nome} até {data}" + botão "Encerrar compartilhamento".
- Mensagens de erro mapeadas: veículo com convite pendente/ativo → `CONFLICT`; e-mail sem cadastro → `RESOURCE_NOT_FOUND`.
- **Endpoint:** `GET /vehicle-shares/vehicle/{vehicleId}`, `POST /vehicle-shares`, `DELETE /vehicle-shares/{id}`.

### ShareInviteScreen (convidado aceitando)
**Atenção:** o backend não expõe `GET /vehicle-shares/{id}` — só existe `GET /vehicle-shares/pending` (lista todos os convites pendentes do usuário atual); a tela busca a lista completa e filtra localmente pelo id da rota. Botões "Aceitar" (`POST /vehicle-shares/{id}/accept`) / "Recusar" (`POST /vehicle-shares/{id}/reject`).

### UpdateOdometerScreen (fluxo do dono, com validação de regressão)
Campo único "Nova quilometragem" com **validação em tempo real**: valor digitado não pode ser menor que o odômetro atual (erro "Novo valor deve ser ≥ ao odômetro atual", desabilita o botão). **Endpoint:** `PUT /vehicles/{id}/odometer?currentKm={novoValor}` — nome do query param é enganoso, carrega o **novo** valor, não o atual.

### Modelo de domínio `Vehicle` (para tipos TS)
```ts
interface Vehicle {
  id: number
  brand: string
  model: string
  manufactureYear: number | null
  modelYear: number | null
  licensePlate: string | null
  color: string | null
  type: "Car" | "Motorcycle"                    // API: "Carro" | "Moto"
  energyType: "Combustion" | "Electric" | "Hybrid" // API: "COMBUSTION"|"ELECTRIC"|"HYBRID"
  fuelType: "Gasoline"|"Ethanol"|"Diesel"|"Flex"|"GNV" | null
  odometerKm: number       // API: currentKm
  tankCapacityL: number | null       // API: capacity (só se combustão/híbrido)
  batteryCapacityKwh: number | null  // API: capacity (mesmo campo, só se elétrico/híbrido)
  isActive: boolean        // flag do backend — NÃO é "veículo ativo do usuário"
  photoUrl: string | null
}

interface VehicleShare {
  id: number; vehicleId: number; vehicleBrand: string; vehicleModel: string
  ownerId: number; ownerName: string; guestId: number | null; guestName: string | null
  status: "PENDING" | "ACTIVE" | "REJECTED" | "REVOKED" | "EXPIRED"
  createdAt: string; respondedAt: string | null; expiresAt: string | null
}
```

---

## 6. Home / Dashboard — resumo + formulário de abastecimento

Ver design visual completo em `HOME_SCREEN_REFERENCE.md`. Pontos funcionais que aquele documento não detalha:

- **"Gasto total" do dashboard = abastecimentos (do endpoint) + soma de TODOS os eventos de manutenção do veículo** — o endpoint `GET dashboard/vehicle/{id}` só soma abastecimentos; o total de eventos é agregado à parte no cliente paginando tudo. Se o web mover essa agregação para o backend, cuidado para manter esse comportamento.
- **Resumo financeiro mensal** compara "mês atual até hoje" vs. "mês anterior completo" (não proporcional a dias corridos — é uma aproximação intencional).
- **Badge de tendência com cor invertida:** gasto subindo = vermelho (ruim), caindo = verde (bom) — o oposto do padrão usual "seta pra cima = bom".
- **Lembretes de manutenção por km** (óleo/pneus, intervalo fixo de 10.000 km): se não há histórico de eventos daquela categoria, usa uma "âncora" persistida localmente (km do veículo na primeira consulta) como ponto de partida — decidir se isso vira campo no backend web ou preferência local (localStorage).
- **Licenciamento é 100% local** — a data de vencimento não é sincronizada com o backend, fica só no dispositivo. Considerar persistir no servidor na versão web (multi-dispositivo).

### QuickRefuelBottomSheet — formulário de criar abastecimento

| Campo | Regra |
|---|---|
| Modo de odômetro (toggle Percurso/Odômetro, só na criação) | "Percurso": usuário informa km rodados desde o último abastecimento, app soma ao odômetro atual do veículo. "Odômetro": usuário informa o valor absoluto. Trocar de modo limpa os dois campos. |
| Litros / kWh carregados | obrigatório, decimal. Label muda conforme tipo de energia efetivo do veículo (ou do chip escolhido, se híbrido). |
| Valor total pago (R$) | obrigatório, > 0. **Não é preço por litro** — é o total. |
| Tipo de abastecimento (Combustível/Elétrico) | só aparece se o veículo for Híbrido; obrigatório nesse caso. |
| Tanque cheio (switch) | default `true`, sem validação. |

**Cálculo automático (server-side do ponto de vista do form, mas feito no client antes de enviar):** `pricePerUnit = totalPrice / liters`. Nunca exponha um campo de "preço por litro" editável.

**Endpoint:** `POST refuels` — body `{vehicleId, odometer, energyAmount, pricePerUnit, fullTank, refuelType?}`.

A tela de edição (`EditRefuelScreen`) reaproveita o mesmo formulário, mas **sem** o toggle Percurso/Odômetro (edição sempre usa odômetro absoluto).

### VehicleSwitcherBottomSheet
Lista de veículos do usuário com card do ativo destacado; ao trocar, fecha o seletor, atualiza o veículo ativo (`PUT /vehicles/{id}/active`) e recarrega a Home inteira.

---

## 7. Histórico / Abastecimentos

### HistoryScreen
Lista paginada (20/página) do veículo ativo, **agrupada por mês** (cabeçalho com nome do mês + contagem + subtotal em R$ daquele mês). Filtros: Tudo | 30 dias | 3 meses | Este ano | Personalizado (date range picker). Exclusão com **atualização otimista** (remove da lista antes da confirmação da API; desfaz e mostra erro se falhar). Ícone de exportar na topbar abre o export de abastecimentos.
**Endpoint:** `GET refuels/vehicle/{vehicleId}?page&size&startDate&endDate`.

### RefuelDetailsScreen (somente leitura — página que falta no web)
3 blocos: Resumo (data por extenso, tipo, tanque cheio), Abastecimento (quantidade, preço/unidade, total), Desempenho (odômetro, km percorridos, consumo — usa `item.consumption` do backend, com fallback client-side `trip / energyAmount`). Ações: editar, excluir (com confirmação).
**Endpoint:** `GET refuels/{id}`, `DELETE refuels/{id}`.

### EditRefuelScreen
Ver formulário em seção 6 (reaproveita `RefuelFormState`). Ao carregar, popula os campos a partir do item existente, **recalculando** `totalPriceRaw = pricePerUnit × energyAmount × 100` (centavos) em vez de guardar o total original diretamente.
**Endpoint:** `GET refuels/{id}`, `PUT refuels/{id}`.

### Modelo `RefuelItem`
```ts
interface RefuelItem {
  id: number
  date: string               // ISO
  energyAmount: number        // litros ou kWh
  pricePerUnit: number
  totalPrice: number
  fullTank: boolean
  refuelType: "FUEL" | "ELECTRIC" | null
  odometer: number | null
  trip: number | null         // km desde o último abastecimento
  consumption: number | null  // km/L ou km/kWh, calculado pelo backend
}
```

---

## 8. Eventos do veículo (prontuário financeiro)

Categorias (`EventCategory`, valor exato esperado pela API entre parênteses): Combustível (`FUEL`), Manutenção (`MAINTENANCE`), Troca de Óleo (`OIL_CHANGE`), Lavagem (`CAR_WASH`), Pneus (`TIRES`), Seguro (`INSURANCE`), Imposto (`TAX`), Documentos (`DOCUMENTS`), Outros (`OTHER`). **Todas as categorias usam o mesmo formulário genérico** — não há campos condicionais por categoria; só título, descrição, valor, data, odômetro, notas mudam de rótulo/ícone/cor conforme a categoria.

> Nota: o modelo de domínio tem um campo `receiptUrl` (comprovante/nota fiscal), mas **nenhuma tela atual do mobile tem UI para anexar arquivo** — é um gap existente também no mobile, e pode ser uma oportunidade de diferencial no web (upload de recibo via `<input type=file>`).

### VehicleEventsScreen (timeline)
Mistura eventos e abastecimentos numa única lista cronológica (merge feito no cliente — abastecimentos vêm de uma chamada separada de até 200 itens, filtrados/mesclados localmente; eventos vêm paginados do servidor). Filtros: categoria (chip único, "Todas" + 9 categorias) e período (Tudo/30 dias/3 meses/Este ano/Personalizado). Filtro de categoria "Todas" ou "Combustível" é o único que inclui abastecimentos na timeline.
**Endpoint:** `GET vehicle-events/vehicle/{vehicleId}?page&size=20&type&startDate&endDate`.

### CreateVehicleEventScreen
Campos: categoria (chip, default `OTHER`; em modo convidado a lista é restrita a `[FUEL, WASH, TIRES, OTHER]`), título (2–100 caracteres, obrigatório), descrição (opcional), data (obrigatória, default hoje), valor em R$ (obrigatório, > 0), quilometragem (opcional, > 0 se preenchido), observações (opcional).
**Endpoint:** `POST vehicle-events` `{vehicleId, category, title, description?, amount?, eventDate, odometerKm?, notes?}`.

### VehicleEventDetailsScreen (somente leitura — página que falta no web)
Cards: categoria+título+descrição, Informações (data, km), Financeiro (valor, só se existir), Observações (só se existir). Trata especificamente "evento não encontrado" (404) com tela dedicada, diferente de erro genérico.
**Endpoint:** `GET vehicle-events/{id}`, `DELETE vehicle-events/{id}`.

### EditVehicleEventScreen
Mesmo formulário do Create, populado com o evento existente. Botão salvar só habilita com `isDirty`.
**Endpoint:** `GET vehicle-events/{id}`, `PUT vehicle-events/{id}`.

---

## 9. Postos (Stations) — busca de combustível/recarga próxima

Feature ausente no web. Filtros: tipo (Combustível | Elétrico, sempre 1 selecionado, default inferido do `energyType` do veículo ativo) e raio (chips fixos 1/3/5/10 km, default 3 km). Backend faz proxy gratuito para **OSM Overpass** (postos de combustível) e **Open Charge Map** (recarga elétrica) via `GET stations/nearby?lat&lng&radius` — endpoint reutilizável sem alteração no web.

**Pontos mobile-specific a adaptar:**
- Geolocalização: Android usa permissão runtime nativa (`ACCESS_FINE_LOCATION`) com fluxo de "negado permanentemente → abrir configurações do app". No web, usar `navigator.geolocation.getCurrentPosition()` — o fluxo de permissão é do browser (prompt único por origem), então a mensagem de erro deve orientar "libere localização nas configurações do site/navegador" em vez de abrir configurações do app.
- "Traçar rota": no Android abre app externo via URI `geo:`. No web, abrir em nova aba um link do Google Maps: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`.
- O mobile não tem mapa visual (é uma lista com distância/endereço) — o web pode considerar adicionar um mapa (Leaflet/Google Maps JS) como diferencial, já que a tela é naturalmente mais espaçosa em desktop.

---

## 10. Exportação

**Formatos reais suportados: CSV e PDF** (não CSV/XLSX). Alvo (`ExportTarget`): abastecimentos ou eventos, com filtro de período e, para eventos, filtro de categoria. No mobile a geração do arquivo é **inteiramente client-side** (busca todas as páginas via loop de paginação, monta CSV/PDF localmente, salva e abre via app externo) — não existe endpoint de exportação dedicado no backend hoje.

Cabeçalhos fixos:
- Abastecimentos: `Data, Tipo, Quantidade, Preço/unidade, Total (R$), Tanque cheio, Odômetro (km), Km percorridos, Consumo`.
- Eventos: `Data, Categoria, Título, Descrição, Valor (R$), Odômetro (km), Notas`.

**Recomendação para o web:** a lógica de agregação (buscar todas as páginas + montar linhas) é totalmente portável, e CSV é trivial no browser (`Blob` + `URL.createObjectURL` + `<a download>`). Para PDF, considerar mover a geração para um endpoint de backend dedicado em vez de replicar a lógica client-side só porque é assim no mobile — evita duplicar código de formatação/paginação e evita depender de uma lib pesada de PDF no bundle do browser (jsPDF/pdfmake).

---

## 11. Funcionalidades mobile-only (não portáveis diretamente)

- **UpdateAvailableDialog** (checagem de nova versão do APK via GitHub Releases, download e instalação): não aplicável — na web o navegador sempre serve a versão mais recente do deploy. Se o produto web virar PWA no futuro, o equivalente é o padrão de "Service Worker update" (`registration.waiting` → prompt de atualizar → `skipWaiting()` + reload), mas isso é infraestrutura nova, não portabilidade de tela.
- **NotificationPermissionViewModel** (rationale antes do prompt nativo de notificação): o conceito existe na web via Web Push API (`Notification.requestPermission()`), mas exige infraestrutura nova (Service Worker + endpoint de subscription no backend, similar ao `DeviceTokenRepository` do FCM mobile). Tratar como feature opcional/futura, não prioridade de portabilidade imediata.
- **Photo Picker nativo + crop** (upload de foto de perfil/veículo): equivalente web é `<input type="file" accept="image/*">` + biblioteca de crop client-side (ex.: `react-easy-crop`). Sem bloqueios de portabilidade, só troca de tecnologia.

---

## 12. Lista de endpoints REST identificados

```
Auth (sem token):
POST auth/login                      {email, password} → {user, accessToken, refreshToken, expiresIn}
POST auth/register                   {name, email, password, phone} → UserResponseDto
POST auth/forgot-password            {email}
POST auth/reset-password             {token, newPassword}
POST auth/activate                   {token} → AuthResponseDto (já loga o usuário)
POST auth/resend-activation          {email}
POST auth/refresh                    {refreshToken} → AuthResponseDto

Auth (autenticado):
POST auth/logout
PUT  auth/{userId}/password          {currentPassword, newPassword}
DELETE auth/{userId}
GET  auth/{userId}/profile
PUT  auth/{userId}/profile           {name, phone}
POST auth/{userId}/upload-profile-picture   (multipart)
DELETE auth/{userId}/profile-picture

Vehicles:
GET    /vehicles?page&size
GET    /vehicles/active
GET    /vehicles/{id}
POST   /vehicles
PUT    /vehicles/{id}
DELETE /vehicles/{id}
PUT    /vehicles/{id}/active
PUT    /vehicles/{id}/odometer?currentKm={novoValor}
POST   /vehicles/{id}/photo          (multipart)
GET    /vehicles/{id}/photo
DELETE /vehicles/{id}/photo

Vehicle Shares:
GET    /vehicle-shares/vehicle/{vehicleId}
GET    /vehicle-shares/active-for-me
GET    /vehicle-shares/pending
POST   /vehicle-shares                {guestEmail, durationDays}
DELETE /vehicle-shares/{id}
POST   /vehicle-shares/{id}/accept
POST   /vehicle-shares/{id}/reject

Refuels:
GET    refuels/vehicle/{vehicleId}?page&size&startDate&endDate
GET    refuels/{id}
POST   refuels                        {vehicleId, odometer, energyAmount, pricePerUnit, fullTank, refuelType?}
PUT    refuels/{id}
DELETE refuels/{id}

Vehicle Events:
GET    vehicle-events/vehicle/{vehicleId}?page&size&type&startDate&endDate
GET    vehicle-events/{id}
POST   vehicle-events                 {vehicleId, category, title, description?, amount?, eventDate, odometerKm?, notes?}
PUT    vehicle-events/{id}
DELETE vehicle-events/{id}

Dashboard:
GET    dashboard/vehicle/{vehicleId}   → totalRefuels, totalSpent, totalEnergy, averagePrice,
                                          averageConsumption, energyUnit, priceUnit, consumptionUnit,
                                          breakdown{fuel,electric}, lastRefuelDate
                                          (NÃO inclui litros/valor do último abastecimento nem soma eventos —
                                           o client busca isso à parte, ver seção 6)

Stations (proxy gratuito OSM Overpass + Open Charge Map):
GET    stations/nearby?lat&lng&radius
```

---

## 13. Resumo executivo — o que priorizar no web

1. **Gestão de veículos** (`vehicle/manage` equivalente): listar todos, editar, excluir, trocar ativo — hoje o web só cadastra (`/vehicles/new`), sem gerenciar depois.
2. **Páginas de detalhe read-only** de abastecimento e evento — hoje só existe criar/editar, faltando visualizar sem entrar em modo edição.
3. **Compartilhamento de veículo** (share/invite/modo convidado) — feature inteira ausente; impacta qualquer caso de uso multi-usuário (casal, família, empresa com frota pequena).
4. **Postos próximos** — feature completa ausente, mas endpoint de backend já existe pronto para reuso.
5. **Fluxos de recuperação de senha e reenvio de ativação** como rotas explícitas — confirmar se `Activate.tsx` cobre tudo ou se faltam `forgot`/`reset-password` dedicados.
6. Preencher lacunas de paridade de campos dentro das telas que já existem (ex.: conferir se `/vehicles/new` replica o wizard de 4 etapas completo, se `/refuels/new` tem o modo Percurso vs. Odômetro, se `/vehicle-events` mistura abastecimentos na timeline).
