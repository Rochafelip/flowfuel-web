# Busca de bairro/cidade em Postos (web)

## Contexto

Adaptação para o web da feature já especificada e implementada no Android (`docs/superpowers/plans/...` do repo mobile, spec `2026-08-14-station-location-search-design.md`, fornecida pelo usuário como referência). Objetivo: deixar o usuário pesquisar um bairro/cidade (ex.: "estou aqui, mas vou pra Boa Viagem, quero ver postos de lá") em vez de depender só da localização atual (GPS).

O backend já está pronto e em produção — **nenhuma mudança de backend é necessária**:
- `GET /stations/geocode?query={texto}` (`StationController.java`) — retorna até uma lista de candidatos `{ displayName, latitude, longitude }`, validação de `query` (3–100 caracteres) e rate limit global já aplicados no backend (`StationService.checkGeocodeGlobalRateLimit()`).

Diferença chave em relação à spec mobile: lá a UI é um bottom sheet (`LocationSearchBottomSheet`, Jetpack Compose); aqui vira um **diálogo modal**, seguindo o padrão visual já estabelecido no site (`ConfirmDialog`, `ShareVehicleDialog`, `StationPickerDialog`). Validado com o usuário via mockup no companion visual.

## Escopo

- `src/types/Station.ts` — novo tipo `GeocodeResult`.
- `src/services/stations.ts` — nova função `geocodeLocation(query)`.
- `src/hooks/useNearbyStations.ts` — ganha suporte a uma localização "override" (busca ativa), sem quebrar o uso atual por `Stations.tsx` (GPS) nem por `StationPickerDialog`/`RefuelForm` (que não usam override, continuam iguais).
- `src/components/ui/LocationSearchDialog.tsx` (novo) — diálogo de busca de bairro/cidade.
- `src/routes/Stations.tsx` — ícone de busca, estado de localidade selecionada, chip de localidade ativa.

Fora de escopo: qualquer mudança no backend (`/stations/geocode` já pronto); busca automática por tecla digitada (explicitamente descartada, tanto na spec mobile quanto pelo rate limit do backend); persistir a localidade pesquisada entre sessões/navegações (cada visita a "Postos" volta a começar pelo GPS).

---

## 1. `Station.ts` — novo tipo

```ts
export interface GeocodeResult {
  displayName: string
  latitude: number
  longitude: number
}
```

## 2. `stations.ts` — novo serviço

```ts
export function geocodeLocation(query: string): Promise<GeocodeResult[]> {
  return authenticatedRequest(`/stations/geocode?query=${encodeURIComponent(query)}`)
}
```

## 3. `useNearbyStations.ts` — suporte a localização "override"

Hoje o hook sempre busca a localização via `navigator.geolocation`. Ganha um segundo parâmetro opcional `override: { lat, lng } | null` (default `null`/omitido = comportamento atual, inalterado):

- Quando `override` é `null`/omitido: comportamento idêntico ao de hoje (pede GPS na montagem, `retry`/`refetchAtRadius` operam sobre a localização do GPS).
- Quando `override` é preenchido: o hook busca postos nessa coordenada direto, **sem pedir permissão de geolocalização**. Um `useEffect` observando `override` (por `lat`/`lng`, não por identidade de objeto) refaz a busca sempre que a localidade pesquisada mudar. `retry`/`refetchAtRadius` também passam a operar sobre `override` quando ele existe.
- A localização de GPS já obtida continua guardada internamente (não é descartada ao ativar um override), para que voltar a `override = null` (usuário limpou a busca) reuse a localização atual sem pedir permissão de novo.

Esse design mantém o hook genérico (mesma responsabilidade de antes: "buscar postos numa coordenada, com fallback de GPS") — quem decide a fonte da coordenada (GPS vs. localidade pesquisada) é sempre quem consome o hook, igual ao padrão já usado para tipo/banda de distância.

## 4. `LocationSearchDialog.tsx` (novo)

Segue o padrão visual de `StationPickerDialog.tsx` (overlay + card centralizado `role="dialog"`), mas o conteúdo é um campo de busca + lista de candidatos em vez de uma lista pronta:

- Campo de texto + botão "Buscar" (`<form onSubmit>` para capturar também o Enter do teclado — nunca dispara a cada tecla digitada, respeitando o rate limit do backend).
- Validação client-side: exige pelo menos 3 caracteres antes de habilitar o botão "Buscar" (espelha a validação do backend, evita uma chamada que sempre falharia).
- Estados: `idle` (nada buscado ainda) → `loading` → `success` (lista de `GeocodeResult`, cada um clicável) / `empty` (buscou, backend não achou nada) / `error` (erro de rede ou rate limit).
- Ao clicar num resultado: chama `onSelect(result)` e o componente pai fecha o diálogo (mesmo padrão do `StationPickerDialog`, que já faz isso).

## 5. `Stations.tsx` — integração

- Novo estado `const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null)` e `const [searchDialogOpen, setSearchDialogOpen] = useState(false)`.
- Ícone de busca (🔍) ao lado do título "Postos", abre o diálogo.
- Hook passa a receber o override: `useNearbyStations(band.maxMeters, selectedLocation ? { lat: selectedLocation.latitude, lng: selectedLocation.longitude } : null)`.
- Ao selecionar uma localidade no diálogo: `setSelectedLocation(result)`, fecha o diálogo. O `useEffect` do hook (item 3) já reage à mudança e recarrega os postos.
- Chip abaixo dos filtros de tipo/raio, visível só quando `selectedLocation !== null`, mostrando `selectedLocation.displayName` com um botão "✕" que chama `setSelectedLocation(null)` — hook volta a usar a localização de GPS já obtida (sem novo pedido de permissão).
- Trocar tipo (`selectedType`) ou raio (`radiusMeters`) com uma localidade ativa continua funcionando sobre ela — nenhuma mudança necessária nesses filtros, já que operam sobre `state.stations` independente da fonte da coordenada.
- O estado `permission-denied` do hook só pode ocorrer quando não há `override` (localidade pesquisada nunca pede permissão de GPS) — nenhuma mudança na renderização condicional desse bloco é necessária além da que já existe.

## Fora de escopo / riscos aceitos

- Sem testes automatizados (não há framework de testes no projeto); verificação por `npx tsc -b`, `npm run build` e deploy.
- Mensagens de erro do diálogo são genéricas ("Não foi possível buscar", "Nenhum lugar encontrado") — o backend não distingue rate-limit de outros erros na resposta ao cliente hoje, então a UI também não distingue.
