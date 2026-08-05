# Postos Próximos — Design

## Contexto

O menu hambúrguer (mobile) e sidebar (desktop) do FlowFuel frontend hoje têm: Dashboard, Abastecimentos, Eventos, Exportar, Perfil. Vamos adicionar uma aba "Postos Próximos" que lista postos de combustível/recarga elétrica perto do usuário.

O backend (`flowfuel`) já expõe `GET /stations/nearby?lat&lng&radius`, que consulta Overpass (OpenStreetMap) e Open Charge Map, cacheia no Redis (10min, fail-open) e retorna uma lista de `StationResponseDTO` (placeId, name, type FUEL/ELECTRIC, distanceMeters, rating, latitude, longitude, street, houseNumber), já ordenada por distância.

Não existe hoje, em nenhum dos três repositórios do produto (backend, frontend web, app mobile), nenhuma integração de geocoding (texto de endereço → lat/lng). O padrão estabelecido no projeto é que integrações com provedores externos de mapa/localização sempre passam pelo backend — nem o app mobile nem o frontend web falam diretamente com APIs externas de mapas.

## Escopo

### Backend — novo endpoint de geocoding

`GET /stations/geocode?query=<texto>`

- Consulta o Nominatim (OpenStreetMap), que não exige API key.
- Envia um header `User-Agent` identificável (exigência de uso do Nominatim) e respeita o rate limit de 1 req/s do provedor.
- Cacheia resultados no Redis usando o mesmo padrão do `StationCacheService` (TTL ~10min, fail-open se o Redis cair), para amortecer o rate limit.
- Resposta: `{ lat, lng }` para o resultado mais relevante da busca.
- Segue o padrão de configuração de integrações externas existente (Overpass/OpenChargeMap): sem key obrigatória, sem secrets a configurar em `.env`.

`GET /stations/nearby` não muda de contrato — o frontend passa a enviar o parâmetro `radius` conforme a seleção do usuário em vez de sempre usar o default.

### Frontend

**Rota:** `/nearby-stations`, dentro do `ProtectedRoute` + `AppLayout`, mesmo padrão das demais rotas autenticadas.

**Navegação:** novo item em `NavLinks.tsx` (ícone 📍, label "Postos Próximos"), posicionado entre "Eventos" e "Exportar". Aparece automaticamente no `Sidebar` (desktop) e no `MobileDrawer` (menu hambúrguer), já que ambos renderizam `NavLinks`.

**Comportamento da tela:**

1. Ao montar, chama `navigator.geolocation.getCurrentPosition` automaticamente e, se bem-sucedido, já busca os postos próximos com o raio default (5km).
2. Campo de busca por endereço/cidade **sempre visível** no topo da tela (não é um fallback de erro — funciona em paralelo à geolocalização automática). Ao submeter, chama `GET /stations/geocode`, e com o `{lat, lng}` retornado chama `GET /stations/nearby`.
3. Seletor de raio (1km / 5km / 10km / 20km, default 5km) ao lado do campo de busca. Muda o parâmetro `radius` da próxima chamada a `/stations/nearby`.
4. Se a geolocalização automática falhar ou for negada, a tela não exibe uma tela de erro bloqueante — simplesmente não popula a lista automaticamente; o campo de busca manual continua disponível e funcional.
5. Lista de cards, na ordem retornada pela API (já ordenada por distância). Cada card mostra: nome, ícone por tipo (⛽ FUEL / 🔌 ELECTRIC), distância formatada (m ou km), rating (se presente), endereço (`street` + `houseNumber`, quando presentes).
6. Clique no card abre em nova aba `https://www.google.com/maps/dir/?api=1&destination={latitude},{longitude}`.
7. Estados a cobrir: carregando (skeleton/spinner), lista vazia ("Nenhum posto encontrado nesse raio"), erro de rede/API (mensagem + opção de tentar novamente).

**Service:** novo `src/services/stations.ts`, seguindo o padrão de `src/services/fipe.ts` e `src/services/profile.ts` — usa `apiFetch` do `httpClient` existente (que já integra com o `ServerStatusBanner`).

## Fora de escopo

- Filtro por tipo de posto (combustível vs elétrico) — lista mostra todos juntos, diferenciados só pelo ícone.
- Exibição em mapa (só lista, por enquanto).
- Preço de combustível por posto — a API atual não retorna esse dado.
- Múltiplas sugestões de geocoding (desambiguação de endereço) — o endpoint retorna o resultado mais relevante; se isso se mostrar insuficiente na prática, é evolução futura.

## Decisões e por quê

- **Lista em vez de mapa:** menor esforço de implementação, sem dependência de biblioteca de mapas/chave de API no frontend.
- **Geocoding via backend, não direto do navegador:** consistente com o padrão já usado por Overpass/OpenChargeMap e com a decisão de arquitetura do app mobile (nenhum cliente fala direto com provedores externos de mapa).
- **Nominatim:** único provedor gratuito sem necessidade de key, alinhado ao restante do backend, que já é 100% baseado em dados OpenStreetMap.
- **Campo de busca sempre visível (não só como fallback de erro):** cobre tanto o caso de a geolocalização falhar quanto o caso de o usuário simplesmente querer ver postos em outro lugar (ex: próximo destino de viagem).
- **Raio ajustável:** default de 5km cobre a maioria dos casos, mas áreas rurais podem ter poucos postos nesse raio.
- **Abrir Google Maps no clique:** entrega navegação/rota sem exigir integração de mapa no próprio frontend.
