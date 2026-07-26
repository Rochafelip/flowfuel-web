# Exportação de Abastecimentos e Eventos (CSV/XLSX) — Frontend Web

## Contexto

O backend (`~/Projetos/flowfuel`) já implementa exportação de abastecimentos e
eventos em CSV/XLSX — ver
`docs/superpowers/specs/2026-06-25-export-refuels-events-design.md` naquele
repositório. Os endpoints estão prontos e em produção:

```
GET /api/v1/exports/refuels?vehicleId={id}&startDate={LocalDate}&endDate={LocalDate}&format=csv|xlsx
GET /api/v1/exports/events?vehicleId={id}&type={VehicleEventType}&startDate={LocalDate}&endDate={LocalDate}&format=csv|xlsx
```

Nenhum dos dois clientes (Android, web) tem hoje qualquer UI que chame esses
endpoints. Esta spec cobre apenas o **frontend web** (`flowfuel-frontend`).

**Fora de escopo:** exportação em PDF. O backend não suporta PDF em nenhum
ponto (nem implementado, nem no roadmap da Fase 5), e não foi pedido para
este trabalho — apenas CSV e XLSX, consumindo os endpoints já existentes.

## Objetivo

Permitir que o usuário autenticado, a partir de uma tela dedicada, escolha um
veículo seu, o tipo de dado (abastecimentos ou eventos), filtros opcionais
(período e, para eventos, categoria) e o formato (CSV ou XLSX), e baixe o
arquivo gerado pelo backend.

## Rota e navegação

- Nova rota `/export` → componente `src/routes/Export.tsx`, registrada em
  `App.tsx` dentro do grupo `<Route element={<ProtectedRoute />}><Route
  element={<AppLayout />}>`, junto das demais rotas autenticadas.
- Novo item em `src/components/layout/NavLinks.tsx`, no array `navItems`:
  `{ to: '/export', label: 'Exportar', icon: '📤', end: false }`.

## UI e componentes

Tela única (`Screen wide`, mesmo padrão de `Refuels`/`VehicleEvents`), com um
formulário vertical (`flex flex-col gap-4`, mesmo espaçamento de
`VehicleEventForm`):

1. **Veículo** — `<select>` estilizado como em `VehicleEventForm.tsx`
   (mesmas classes Tailwind do `TextField`), populado a partir de
   `GET /vehicles` (mesmo padrão de `SelectVehicle.tsx`: `authenticatedRequest('/vehicles')`,
   lê `response.content`). Sem veículos cadastrados → mensagem
   "Nenhum veículo cadastrado" e formulário oculto (mesmo tratamento de
   `SelectVehicle.tsx`).
2. **Tipo de dado** — `SegmentedToggle<'REFUELS' | 'EVENTS'>` com labels
   "Abastecimentos" / "Eventos". Controla qual endpoint é chamado e se o
   seletor de categoria (item 4) aparece.
3. **Período (opcional)** — dois `TextField type="date"` lado a lado
   ("De" / "Até"), sem valor por padrão. Vazios os dois = exporta todo o
   histórico do veículo (igual ao comportamento do backend quando
   `startDate`/`endDate` não são enviados).
4. **Categoria do evento** — `<select>` com as chaves de
   `VEHICLE_EVENT_TYPE_LABELS` (`src/types/VehicleEvent.ts`) mais uma opção
   "Todas as categorias" (valor vazio = não envia `type`). Só renderizado
   quando Tipo de dado = Eventos.
5. **Formato** — `SegmentedToggle<'csv' | 'xlsx'>` com labels "CSV" / "Excel".
6. Botão **"Exportar"** (`Button`, full width) — desabilitado enquanto não há
   veículo selecionado ou enquanto a exportação está em andamento (label muda
   para "Exportando...").

Sem tela de loading/spinner de página inteira — só o carregamento inicial da
lista de veículos usa `Spinner` centralizado, como nas demais telas.

## Fluxo de interação

1. Ao montar, busca veículos; se a lista vier vazia, mostra o estado vazio
   descrito acima.
2. Usuário ajusta os campos do formulário (estado local em `useState`, sem
   necessidade de contexto novo — não usa `VehicleContext`/`activeVehicle`,
   pois o veículo é escolhido dentro da própria tela, independente do veículo
   ativo do resto do app).
3. **Validação client-side antes de chamar a API** (espelha as regras já
   documentadas no backend, evitando um round-trip de 400 desnecessário):
   - Se apenas uma das datas (`De`/`Até`) estiver preenchida → erro inline
     "Informe as duas datas ou nenhuma".
   - Se `De` > `Até` → erro inline "Data inicial não pode ser depois da
     data final".
   - Erros inline aparecem abaixo dos campos de data (texto vermelho, mesmo
     padrão de mensagem de erro já usado em `ErrorState`, mas inline e não
     bloqueante — não substitui o formulário).
4. Ao clicar em "Exportar", monta a query string e chama o helper de download
   (ver seção seguinte) contra `/exports/refuels` ou `/exports/events`.
5. Sucesso → o navegador inicia o download do arquivo; **sem toast de
   sucesso** (o próprio download é o feedback). Falha → `showToast(mensagem)`
   (variante de erro, padrão default do `ToastContext`).

## Download de arquivo binário

`authenticatedRequest` (`src/services/api.ts`) sempre chama `response.json()`
— incompatível com uma resposta `Content-Type: text/csv` ou
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Em vez de
alterá-la (usada por todo o resto do app para JSON), esta spec adiciona uma
função nova e isolada em `src/services/export.ts`:

```ts
export async function downloadExport(endpoint: string, fallbackFileName: string) {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    throw new Error('Erro ao exportar')
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const fileName = match?.[1] ?? fallbackFileName

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
```

- `BASE_URL` replica a constante já existente em `api.ts`
  (`import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'`).
- `fallbackFileName` cobre o caso (improvável, mas possível) de o header
  `Content-Disposition` não vir presente — evita um download sem nome/extensão.
- Sem tratamento de 401 específico aqui (diferente de `authenticatedRequest`):
  a tela de exportação já está atrás de `ProtectedRoute`, e um 401 nesse
  ponto cai no mesmo catch genérico de erro, mostrando o toast de falha.

`Export.tsx` monta o endpoint final, por exemplo:

```
/exports/refuels?vehicleId=42&format=csv
/exports/events?vehicleId=42&type=MAINTENANCE&startDate=2026-01-01&endDate=2026-06-30&format=xlsx
```

## Erros

| Cenário | Tratamento |
|---|---|
| Datas incompletas ou invertidas | Erro inline, sem chamar a API |
| Veículo não pertence ao usuário (403) | Toast de erro genérico |
| Veículo inexistente (404) | Toast de erro genérico |
| Formato ausente/inválido (400) | Não deve ocorrer — formato sempre vem do `SegmentedToggle`, valor fixo |
| Falha de rede | Toast de erro genérico ("Não foi possível exportar. Tente novamente.") |

Não há um estado de erro de página inteira — apenas toast, o formulário
permanece preenchido para nova tentativa.

## Testes / verificação manual

Sem suíte de testes automatizados no `flowfuel-frontend` hoje (nenhum arquivo
`*.test.*` no projeto) — verificação via `npm run dev`, cobrindo:

- Exportar abastecimentos em CSV e em XLSX, sem filtros.
- Exportar eventos em CSV, filtrando por categoria e por período.
- Tentar exportar com apenas uma data preenchida e com `De` > `Até` (erro
  inline, sem request).
- Veículo sem nenhum registro (arquivo baixado só com cabeçalho).
- Usuário sem veículos cadastrados (estado vazio).

## Fora de escopo

- Exportação em PDF (backend não suporta).
- Exportação de todos os veículos de uma vez, relatório financeiro mensal ou
  snapshot de dashboard — próximas sub-specs do épico "Fase 5" no backend,
  ainda não implementadas lá.
- Botões de atalho de exportação dentro de `Refuels.tsx`/`VehicleEvents.tsx`
  (o usuário optou pela tela dedicada única).
