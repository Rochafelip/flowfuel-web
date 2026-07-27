# Design: Gestão de Veículos (listar, editar, excluir, trocar ativo) no web

**Data:** 2026-07-27
**Status:** aprovado

## Contexto

O app mobile (`flowfuel-app`) tem uma tela `VehiclesScreen` completa de gestão de veículos (lista paginada com veículos próprios + compartilhados, editar, excluir, trocar veículo ativo), acessível a partir do Perfil. O frontend web (`flowfuel-frontend`) hoje só cobre duas pontas desse fluxo:

- `/select-vehicle` (`SelectVehicle.tsx`): lista simples para **trocar** o veículo ativo (sem editar/excluir/ver compartilhados). Usada logo após o login e pelo `VehicleSwitcherLink` da topbar.
- `/vehicles/new` (`VehicleNew.tsx`): wizard de 4 etapas para **cadastrar** um veículo novo.

Não existe nenhuma tela para **listar todos os veículos com ações de gestão**, nem para **editar** um veículo depois de cadastrado. Esse gap foi identificado em `docs/ANDROID_APP_SCREENS_REFERENCE.md` (prioridade #1 da seção 13) e é o objetivo desta spec.

Investigação do código web confirmou:
- Não existe `src/types/Vehicle.ts` — o único tipo `Vehicle` hoje é uma interface local e incompleta dentro de `VehicleContext.tsx` (só os campos usados pelo dashboard).
- Não existe `src/services/vehicle.ts` — as chamadas a `/vehicles/*` estão espalhadas inline em `SelectVehicle.tsx` e `VehicleNew.tsx`.
- `authenticatedRequest` (`src/services/api.ts`) sempre chama `response.json()` no corpo da resposta. Endpoints que respondem `204 No Content` (ex.: `DELETE /auth/{userId}`, `DELETE /auth/{userId}/profile-picture`) já quebram esse wrapper hoje — por isso `deleteAccountRequest`/`deleteProfilePictureRequest` em `services/profile.ts` usam `fetch` cru em vez de `authenticatedRequest`. Presumo que `DELETE /vehicles/{id}` tem o mesmo comportamento (204), então o novo `deleteVehicle()` segue o mesmo padrão de `fetch` cru, não `authenticatedRequest`.
- `PUT /vehicles/{id}/active` já é chamado hoje via `authenticatedRequest` em `SelectVehicle.tsx` sem tratamento especial — presumo que essa rota responde com corpo JSON (não 204), então `setActiveVehicle()` pode usar `authenticatedRequest` normalmente, mantendo paridade com o código existente.

## Escopo confirmado com o usuário

- **Incluído:**
  - `/vehicles`: lista os veículos **próprios** do usuário (cards com marca/modelo, placa, km, badge "Ativo"), com ações **Definir como ativo**, **Editar**, **Excluir**.
  - Seção **"Compartilhados comigo"** na mesma página, somente leitura (cards vindos de `GET /vehicle-shares/active-for-me`, sem nenhuma ação clicável nesta iteração).
  - `/vehicles/:id/edit`: formulário de **página única** (não wizard) com todos os campos do veículo, pré-preenchido. Placa e odômetro passam a ser **obrigatórios** (diferente do cadastro, onde são opcionais/"preencher depois").
  - Entrada de navegação: novo `ActionRow` "Meus veículos" em `/profile`, entre "Editar perfil" e "Trocar senha".
- **Fora de escopo (deliberado):**
  - Fluxo de convite/aceite de compartilhamento (`ShareVehicleScreen`/`ShareInviteScreen` do Android) — só a **leitura** dos veículos já compartilhados é incluída.
  - Modo convidado (`GuestVehicleScreen`) — não há ação nos cards da seção "Compartilhados comigo".
  - Página de detalhe somente-leitura de um veículo (`VehicleDetailsScreen` do Android) — prioridade #2 do documento de referência, não desta iteração; a edição cobre a necessidade de ver os dados por ora.
  - Upload de foto imediato ao trocar (como no Android) — o upload fica pendente até "Salvar alterações", mesmo padrão já usado em `VehicleNew.tsx`.
  - Dirty-state / diálogo de "descartar alterações" ao sair do formulário de edição sem salvar — nenhuma tela web hoje implementa esse padrão (decisão já tomada nas specs anteriores deste repo, ex.: `2026-07-26-profile-screen-design.md`); não introduzo sozinho aqui.
  - Paginação infinita — busca uma página única grande (`size=50`); revisitar se algum dia isso não for suficiente.

## Contratos de backend usados (nenhuma mudança esperada)

- `GET /vehicles?size=50` → `PageResponse<Vehicle>` (já usado hoje em `SelectVehicle.tsx` e `getProfileStats`)
- `GET /vehicles/{id}` → `Vehicle`
- `PUT /vehicles/{id}` com o mesmo payload usado no `POST /vehicles` de `VehicleNew.tsx` (`type, energyType, currentKm, brand, model, manufactureYear, modelYear, color, licensePlate, fuelSubType?, capacity?`) → `Vehicle`
- `DELETE /vehicles/{id}` → presumido `204` (ver nota acima sobre `fetch` cru)
- `PUT /vehicles/{id}/active` → já usado hoje, sem body
- `POST /vehicles/{id}/photo` (multipart, campo `file`) → `{ internalUrl }` (via `uploadVehiclePhoto`, já existe em `services/api.ts`)
- `GET /vehicle-shares/active-for-me` → lista de `VehicleShare` (`{ id, vehicleId, vehicleBrand, vehicleModel, ownerName, expiresAt, ... }`) — **endpoint novo para o web**, nunca chamado hoje; se o formato de resposta divergir do presumido (baseado no `flowfuel-app`), ajustar o tipo `VehicleShare` durante a implementação.

## Feature 1 — Tipo e serviço compartilhado

`src/types/Vehicle.ts` (novo): interface `Vehicle` completa —

```ts
export interface Vehicle {
  id: number
  brand: string
  model: string
  manufactureYear: number | null
  modelYear: number | null
  licensePlate: string | null
  color: string | null
  type: 'Carro' | 'Moto'
  energyType: 'COMBUSTION' | 'ELECTRIC' | 'HYBRID'
  fuelSubType: 'Gasolina comum' | 'Etanol' | 'Diesel' | 'Flex' | 'GNV' | null
  currentKm: number
  capacity: number | null // tanque (L) OU bateria (kWh), mesmo campo no backend — decidir pela energyType
  isActive: boolean
  photoUrl: string | null
}

export interface VehicleShare {
  id: number
  vehicleId: number
  vehicleBrand: string
  vehicleModel: string
  ownerName: string
  expiresAt: string | null
}
```

`VehicleContext.tsx` passa a importar `Vehicle` deste novo arquivo em vez de declarar sua própria interface local — sem mudar nenhum comportamento (o novo tipo é um superset do que já existia lá).

`src/services/vehicle.ts` (novo):

```ts
listVehicles(): Promise<PageResponse<Vehicle>>       // GET /vehicles?size=50
getVehicle(id): Promise<Vehicle>                      // GET /vehicles/{id}
updateVehicle(id, payload): Promise<Vehicle>           // PUT /vehicles/{id}
deleteVehicle(id): Promise<void>                       // DELETE /vehicles/{id} (fetch cru, sem .json())
activateVehicle(id): Promise<void>                     // PUT /vehicles/{id}/active
listSharedVehicles(): Promise<VehicleShare[]>          // GET /vehicle-shares/active-for-me
```

`SelectVehicle.tsx` e `VehicleNew.tsx` **não são refatorados** para usar esse serviço nesta iteração (evitar mudar código que já funciona fora do escopo pedido); o serviço novo é usado só pelas duas telas novas.

## Feature 2 — `/vehicles`: lista de gestão

Estrutura da página (`Screen wide`, mesmo padrão de `SelectVehicle.tsx`):

1. Título "Meus veículos".
2. Estados: loading (`Spinner`), erro (`ErrorState` com retry), vazio ("Nenhum veículo cadastrado" + botão "Cadastrar veículo" → `/vehicles/new`).
3. Lista de cards (`Card`), um por veículo próprio: `{brand} {model}`, placa (ou "—"), km formatado (`toLocaleString('pt-BR')`), badge "Ativo" se `vehicle.id === activeVehicle?.id` (comparado via `useVehicle()`). Três ações por card:
   - **Definir como ativo** (some se já for o ativo): `activateVehicle(id)` → `loadActiveVehicle()` do `VehicleContext` → toast de sucesso.
   - **Editar**: `navigate(\`/vehicles/${id}/edit\`)`.
   - **Excluir**: `useConfirm()` com mensagem `Excluir "{brand} {model}"? Esta ação não pode ser desfeita.` → `deleteVehicle(id)` → recarrega a lista → toast. Se o veículo excluído era o ativo, chama `loadActiveVehicle()` também (o backend deve devolver outro veículo ativo ou nenhum).
4. Seção "Compartilhados comigo" (só aparece se `listSharedVehicles()` retornar itens não-vazios): cards com badge "Emprestado", `{vehicleBrand} {vehicleModel}`, dono (`ownerName`) e validade (`expiresAt` formatado, se houver) — sem nenhuma ação clicável.

## Feature 3 — `/vehicles/:id/edit`

Formulário de página única, todas as seções sempre visíveis (sem stepper):

1. **Identificação** — mesmos campos/comportamento de FIPE em cascata do `VehicleNew.tsx` (Marca → Modelo → Ano do modelo, com alternância para modo manual), reaproveitando `useFipeSelection`.
2. **Classificação** — Tipo (Carro/Moto), Energia (Combustão/Elétrico/Híbrido), Combustível (condicional).
3. **Detalhes** — Placa (**obrigatória**, mesma máscara/validação de 7 caracteres de `VehicleNew.tsx`), Cor (opcional), **Odômetro atual (obrigatório** nesta tela, diferente do cadastro), Capacidade do tanque/bateria (condicional por energia).
4. **Foto** — preview da foto atual (`vehicle.photoUrl`, via `<img>` — sem necessidade de `useAuthenticatedImage`, já que fotos de veículo não exigem auth pra visualizar, ao contrário do avatar de perfil; confirmar durante implementação se `photoUrl` é público, senão reaproveitar o hook), input para trocar. Upload só acontece no submit, via `uploadVehiclePhoto(id, file)`, depois do `PUT /vehicles/{id}` — mesma ordem do `VehicleNew.tsx` (dados primeiro, foto depois; falha no upload não bloqueia o resto, só mostra toast de aviso).

Carregamento inicial: `getVehicle(id)` popula todos os campos do formulário; estado de loading (spinner) enquanto isso, estado de erro (404 → "Veículo não encontrado" com botão voltar; outro erro → retry).

Validação ao salvar: marca/modelo não-vazios, ano de fabricação/modelo com 4 dígitos, placa com 7 caracteres, odômetro não-vazio — reaproveita as mesmas funções de validação/formatação de `VehicleNew.tsx` (extraídas para módulo compartilhado, ver Feature 4).

Submit: `updateVehicle(id, payload)` → se houver novo arquivo de foto, `uploadVehiclePhoto` → toast de sucesso → `navigate('/vehicles')`. Se o veículo editado for o ativo, chama `loadActiveVehicle()` do contexto (o header/topbar pode estar mostrando dados desatualizados, ex. marca/modelo).

## Feature 4 — Extração de código compartilhado entre `VehicleNew.tsx` e a nova tela de edição

Para não duplicar ~150 linhas de campos/formatadores entre as duas telas, extraio para `src/routes/vehicle/fields.tsx` (novo módulo, não uma rota):

- `formatLicensePlateDisplay(raw)`, `parseFipeYearLabel(option)` (movidos de `VehicleNew.tsx`)
- `VehicleTypeValue`, `EnergyTypeValue`, `FuelTypeValue`, `FUEL_OPTIONS` (tipos/constantes movidos)
- Componentes de campo reaproveitáveis: seletor de Marca/Modelo/Ano-FIPE em cascata (com alternância pro modo manual), segmentado Tipo/Energia, chips de Combustível, campos de Placa/Cor/Odômetro/Capacidades.

`VehicleNew.tsx` é ajustado para importar dessas fontes compartilhadas em vez de declarar tudo localmente — único ponto em que este trabalho toca um arquivo já existente e funcionando, então a verificação de regressão do cadastro de veículo (`/vehicles/new`) faz parte dos critérios de aceitação.

## Feature 5 — Entrada de navegação

`src/routes/Profile.tsx`: novo `<ActionRow label="Meus veículos" onClick={() => navigate('/vehicles')} />` inserido antes de "Editar perfil" (é a ação mais frequente do bloco, faz sentido vir primeiro).

`src/App.tsx`: novas rotas `/vehicles` e `/vehicles/:id/edit`, dentro do mesmo grupo protegido (`ProtectedRoute` + `AppLayout`) das demais.

## Arquivos afetados

```
Criar:     src/types/Vehicle.ts
Criar:     src/services/vehicle.ts
Criar:     src/routes/vehicle/fields.tsx
Criar:     src/routes/Vehicles.tsx
Criar:     src/routes/VehicleEdit.tsx
Modificar: src/App.tsx (rotas /vehicles, /vehicles/:id/edit)
Modificar: src/routes/Profile.tsx (ActionRow "Meus veículos")
Modificar: src/routes/VehicleNew.tsx (usa os campos/tipos extraídos de vehicle/fields.tsx)
Modificar: src/context/VehicleContext.tsx (importa Vehicle de types/Vehicle.ts em vez de declarar localmente)
```

## Fora de escopo

- Convidar/aceitar compartilhamento de veículo (só leitura do que já está compartilhado).
- Modo convidado / ações sobre veículos compartilhados.
- Página de detalhe somente-leitura separada da edição.
- Upload de foto imediato (fica pendente até salvar).
- Diálogo de descartar alterações não salvas.
- Paginação infinita (página única de até 50 itens).
- Refatorar `SelectVehicle.tsx` para usar o novo `services/vehicle.ts`.

## Critérios de aceitação

- `/vehicles` lista todos os veículos próprios do usuário logado, com badge correta no veículo ativo.
- Definir como ativo, editar e excluir funcionam a partir dos cards da lista, com confirmação antes de excluir.
- Veículos compartilhados aparecem numa seção separada, somente leitura, só quando existirem.
- `/vehicles/:id/edit` carrega os dados reais do veículo, exige placa e odômetro (diferente do cadastro), salva e volta para `/vehicles` com toast de sucesso.
- Trocar a foto na edição só é enviada ao backend quando o usuário clica em "Salvar alterações".
- `/vehicles/new` (cadastro) continua funcionando sem regressão após a extração de código compartilhado.
- Item "Meus veículos" aparece em `/profile` e navega corretamente.
- `npx tsc -b` passa sem erros novos.
