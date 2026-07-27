# Meus Veículos (web): compartilhar veículo com outro usuário

**Data:** 2026-07-27
**Status:** Aprovado, aguardando plano de implementação

## Contexto

O backend (`com.devappmobile.flowfuel.vehicleshare`) já expõe a API completa de
compartilhamento de veículo: criar convite por e-mail + prazo em dias
(`POST /vehicle-shares`), aceitar/rejeitar (`POST /{id}/accept|reject`),
revogar (`DELETE /{id}`), consultar o compartilhamento atual de um veículo
próprio (`GET /vehicle-shares/vehicle/{id}`), listar convites pendentes
recebidos (`GET /vehicle-shares/pending`) e listar compartilhamentos ativos
comigo (`GET /vehicle-shares/active-for-me`).

No frontend web, `src/routes/Vehicles.tsx` já consome apenas
`GET /vehicle-shares/active-for-me` (via `listSharedVehicles`), exibindo a
seção "Compartilhados comigo" com veículos emprestados — mas somente como
espectador (sem menu de ações, o que é o comportamento correto para esse
papel). Não existe hoje nenhuma forma de:

1. Um dono compartilhar um veículo próprio com outra pessoa.
2. Ver o status de um compartilhamento já criado (pendente ou ativo) e
   revogá-lo.
3. Ver e responder (aceitar/rejeitar) convites recebidos ainda pendentes.

Esta spec cobre a implementação dessas três peças na tela "Meus veículos"
(`src/routes/Vehicles.tsx`), fechando o ciclo completo de compartilhamento
no lado web.

## Requisitos

1. Cada card de veículo próprio, sem compartilhamento pendente/ativo, exibe
   um botão **"Compartilhar"**. Ao clicar, abre um modal com campo de e-mail
   do convidado e campo de dias de validade (1–365). Confirmar chama
   `POST /vehicle-shares` e fecha o modal.
2. Se o veículo já tiver um compartilhamento `PENDING` ou `ACTIVE` (regra do
   backend: só um por vez), o card **não** mostra o botão "Compartilhar".
   Em vez disso, mostra um badge de status:
   - `PENDING`: "Convite enviado para {guestName ou e-mail não disponível}"
   - `ACTIVE`: "Compartilhado com {guestName}"

   e um botão **"Revogar"**.
3. "Revogar" pede confirmação via `useConfirm` (mesmo padrão de
   `handleDelete`), com mensagem
   `Revogar o compartilhamento com "{guestName}"? Esta ação não pode ser desfeita.`
   Confirmado, chama `DELETE /vehicle-shares/{id}` e recarrega o status
   desse veículo.
4. Nova seção **"Convites pendentes"**, entre "Meus veículos" e
   "Compartilhados comigo", lista convites recebidos com status `PENDING`
   (`GET /vehicle-shares/pending`). Cada item mostra veículo + nome do dono
   e botões **"Aceitar"** / **"Rejeitar"**.
5. "Aceitar" chama `POST /vehicle-shares/{id}/accept`; "Rejeitar" chama
   `POST /vehicle-shares/{id}/reject`. Em ambos os casos, recarrega a tela
   inteira (`load()`) — aceitar faz o item sair de "Convites pendentes" e
   aparecer em "Compartilhados comigo"; rejeitar apenas o remove.
6. A seção "Convites pendentes" só aparece se a lista vier não vazia (sem
   cabeçalho órfão) — mesmo padrão já usado em "Compartilhados comigo".
7. Falha ao buscar convites pendentes ou status de compartilhamento por
   veículo degrada silenciosamente para vazio/nenhum — não derruba a tela
   inteira com erro global (mesma tolerância já usada para
   `listSharedVehicles().catch(() => [])`).

## Fora de escopo

- Notificação em tempo real de novo convite (push já existe no backend via
  `PushNotificationService`; a tela só reflete o estado ao carregar/recarregar).
- Qualquer mudança em `VehiclePickerScreen`/mobile — esta spec é só web.
- Edição de prazo de um compartilhamento já ativo (não suportado pelo
  backend; para mudar o prazo, revoga e cria de novo).
- Indicação de compartilhamento em telas fora de "Meus veículos" (ex.: no
  Dashboard).

## Arquitetura

### Serviços (`src/services/vehicle.ts`)

Novas funções, seguindo os padrões já existentes no arquivo:

- `shareVehicle(vehicleId: number, inviteeEmail: string, durationDays: number): Promise<VehicleShare>`
  → `authenticatedRequest('/vehicle-shares', { method: 'POST', body: JSON.stringify({ vehicleId, inviteeEmail, durationDays }) })`.
- `getVehicleShare(vehicleId: number): Promise<VehicleShare | null>` → fetch
  bruto (como `activateVehicle`), pois o backend responde `204 No Content`
  quando não há compartilhamento; trata 204 retornando `null`, senão
  `response.json()`.
- `revokeVehicleShare(id: number): Promise<void>` → fetch bruto (204, mesmo
  padrão de `deleteVehicle`).
- `listPendingShares(): Promise<VehicleShare[]>` →
  `authenticatedRequest('/vehicle-shares/pending')`.
- `acceptVehicleShare(id: number): Promise<VehicleShare>` →
  `authenticatedRequest('/vehicle-shares/${id}/accept', { method: 'POST' })`.
- `rejectVehicleShare(id: number): Promise<VehicleShare>` →
  `authenticatedRequest('/vehicle-shares/${id}/reject', { method: 'POST' })`.

Nenhuma mudança em `src/types/Vehicle.ts` — `VehicleShare` já cobre todos os
campos necessários (`status`, `guestName`, `ownerName`, `expiresAt`, etc.).

### Novo componente: `ShareVehicleDialog`

`src/components/ui/ShareVehicleDialog.tsx`, seguindo o padrão visual/estrutural
de `DeleteAccountDialog.tsx` (overlay + card branco + `TextField`):

- Props: `vehicle: Vehicle`, `onConfirm: (email: string, durationDays: number) => void`, `onDismiss: () => void`, `submitting: boolean`.
- Campos: `TextField` de e-mail (`type="email"`) e `TextField` numérico de
  dias (`type="number"`, min 1, max 365, default 30).
- Botão "Compartilhar" desabilitado se e-mail vazio/inválido ou dias fora
  do intervalo, ou enquanto `submitting`.
- Erros da API (ex.: "Veículo já possui um compartilhamento pendente ou
  ativo", "Usuário {email} não encontrado") são repassados via
  `showToast(err.message)` na tela chamadora, não dentro do dialog — mesmo
  padrão de erro usado hoje em `handleActivate`/`handleDelete`.

### `Vehicles.tsx`

**Estado novo:**
- `shareByVehicleId: Record<number, VehicleShare | null>` — status de
  compartilhamento por veículo próprio.
- `pendingInvites: VehicleShare[]` — convites recebidos pendentes.
- `sharingVehicle: Vehicle | null` — controla abertura do `ShareVehicleDialog`.
- `shareBusyId: number | null` — id em processamento (compartilhar/revogar/
  aceitar/rejeitar), reaproveitando o padrão de `busyId` já existente para
  desabilitar botões durante a chamada.

**`load()` estendido:**
```ts
const [page, shared, pending] = await Promise.all([
  listVehicles(),
  listSharedVehicles().catch(() => []),
  listPendingShares().catch(() => []),
])
setVehicles(page.content)
setSharedVehicles(shared)
setPendingInvites(pending)

const shareEntries = await Promise.all(
  page.content.map(async (v) => {
    try {
      return [v.id, await getVehicleShare(v.id)] as const
    } catch {
      return [v.id, null] as const
    }
  })
)
setShareByVehicleId(Object.fromEntries(shareEntries))
```
(Busca de status por veículo é sequencial-depois-do-load-principal, não
bloqueia a renderização inicial de `vehicles`/`sharedVehicles` — mas simplesmente
roda logo em seguida dentro do mesmo `load()`, sem loading state próprio;
aceitável porque a lista de veículos próprios tende a ser pequena.)

**Novos handlers:**
- `handleShareSubmit(vehicle, email, durationDays)`: chama `shareVehicle`,
  em caso de sucesso fecha o dialog e recarrega só o status desse veículo
  (`getVehicleShare(vehicle.id)`); em erro, `showToast`.
- `handleRevoke(share: VehicleShare)`: `useConfirm` → `revokeVehicleShare(share.id)`
  → recarrega o status do veículo (`shareByVehicleId[share.vehicleId] = null`).
- `handleAcceptInvite(share)` / `handleRejectInvite(share)`: chamam
  `acceptVehicleShare`/`rejectVehicleShare` e depois `load()` completo (mais
  simples que atualizar os três estados manualmente, e a lista tende a ser
  pequena).

**Render:**
- No card de veículo próprio, ao lado do botão "Definir como ativo"/"Editar"/
  "Excluir": se `shareByVehicleId[vehicle.id]` for `null`/`undefined`, botão
  "Compartilhar" (abre `ShareVehicleDialog`); senão, badge de status +
  botão "Revogar".
- Nova seção "Convites pendentes", renderizada apenas se
  `pendingInvites.length > 0`, entre a lista de veículos próprios e a seção
  "Compartilhados comigo" — mesmo estilo de cabeçalho (`text-lg font-bold`)
  e grid (`lg:grid-cols-2`) já usado em "Compartilhados comigo".
- `ShareVehicleDialog` renderizado condicionalmente no fim do componente
  quando `sharingVehicle !== null`.

## Erros e casos de borda

- E-mail do convidado não corresponde a um usuário cadastrado → backend
  retorna 404 ("Usuário {email} não encontrado"); tratado como erro comum
  via `extractErrorMessage`, exibido em toast.
- Convidar o próprio e-mail → backend retorna erro de regra de negócio
  ("Não é possível compartilhar o veículo com você mesmo"); mesmo tratamento
  de toast.
- Veículo já tem compartilhamento pendente/ativo e o usuário tenta
  compartilhar de novo → não deve nem ser possível pela UI (botão
  "Compartilhar" já está oculto nesse caso); se ocorrer por condição de
  corrida, o erro 409 do backend aparece via toast.
- Convite expira (`expiresAt` passado) → já tratado no backend
  (`findByGuestIdAndStatusAndExpiresAtAfter`); simplesmente some da lista
  de compartilhados no próximo load, sem ação do usuário.
- Falha ao buscar status por veículo ou convites pendentes → degrada para
  `null`/lista vazia por item, sem erro global (requisito 7).

## Testes

Não há suíte de testes automatizados para rotas neste projeto hoje (sem
`Vehicles.test.tsx` ou equivalente); a verificação será manual em
`npm run dev`, cobrindo:

- Compartilhar um veículo próprio com e-mail válido → botão vira
  "Convite enviado" + "Revogar".
- Tentar compartilhar veículo que já tem convite pendente → botão
  "Compartilhar" não aparece.
- Revogar → volta a mostrar "Compartilhar".
- Convite pendente aparece na seção "Convites pendentes"; aceitar move para
  "Compartilhados comigo"; rejeitar remove da lista.
- Erros de e-mail inválido/inexistente exibidos como toast.
