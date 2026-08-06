# Postos Próximos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Postos Próximos" tab (hamburger menu / sidebar) that shows a distance-sorted list of nearby fuel/electric stations, using the user's browser geolocation or a manually typed address.

**Architecture:** Backend (`flowfuel`, Spring Boot / Maven, repo root `/home/rocha/Projetos/flowfuel`) gets a new `GET /stations/geocode?query=` endpoint that resolves free-text addresses to lat/lng via Nominatim (OpenStreetMap), following the exact same client/cache/service layering already used for `GET /stations/nearby` (Overpass + Open Charge Map). Frontend (`flowfuel-frontend`, React + Vite, repo root `/home/rocha/Projetos/flowfuel-frontend`) gets a new protected route `/nearby-stations` with a nav entry, a geolocation hook, a service module, and a list UI, all following existing patterns in the codebase (`authenticatedRequest`, `Screen`/`Card`/`ErrorState`/`Button`, `NavLinks`).

**Tech Stack:** Backend: Spring Boot, Spring `RestClient`, Lombok, Redis (Lettuce) for caching, JUnit 5 + Mockito + AssertJ + `MockRestServiceServer` for tests, Maven (`./mvnw`). Frontend: React 19, TypeScript, react-router-dom v7, Tailwind CSS. **The frontend repo has no test framework configured (no vitest, no `*.test.tsx` files exist anywhere in `src/`)** — this plan follows that existing convention and verifies frontend work by running `npm run build` (type-checks via `tsc -b`) and manual exercise in the browser, not by adding a new test framework. The backend has full test infrastructure and this plan uses TDD there, matching `station/StationServiceTest.java` etc.

---

## Part A — Backend (`/home/rocha/Projetos/flowfuel`)

### Task 1: `GeocodeResponseDTO`

**Files:**
- Create: `src/main/java/com/devappmobile/flowfuel/station/dto/GeocodeResponseDTO.java`

- [ ] **Step 1: Write the DTO**

```java
package com.devappmobile.flowfuel.station.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GeocodeResponseDTO {

    private Double latitude;
    private Double longitude;
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/station/dto/GeocodeResponseDTO.java
git commit -m "feat: add GeocodeResponseDTO for address geocoding"
```

---

### Task 2: `NominatimClient` (geocoding client)

**Files:**
- Create: `src/main/java/com/devappmobile/flowfuel/station/client/NominatimResultDTO.java`
- Create: `src/main/java/com/devappmobile/flowfuel/station/client/NominatimClient.java`
- Test: `src/test/java/com/devappmobile/flowfuel/station/client/NominatimClientTest.java`

Nominatim's usage policy requires an identifiable `User-Agent` and caps unauthenticated callers at ~1 request/second. This client enforces that with a simple in-process throttle (single Spring Boot instance is fine for this app's traffic — a distributed limiter would only be needed if `NominatimClient` were called from multiple instances of the same JVM process, which isn't the case here).

- [ ] **Step 1: Write the failing test**

```java
package com.devappmobile.flowfuel.station.client;

import com.devappmobile.flowfuel.exception.ExternalServiceUnavailableException;
import com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.GET;

class NominatimClientTest {

    private static final String BASE_URL = "https://nominatim.openstreetmap.org/search";

    private MockRestServiceServer server;
    private NominatimClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new NominatimClient(builder, BASE_URL);
    }

    @Test
    void geocode_respostaComResultado_retornaLatLng() {
        String body = """
                [
                  {"lat":"-8.0500000","lon":"-34.9000000","display_name":"Recife, PE"}
                ]
                """;
        server.expect(requestTo(BASE_URL + "?q=Recife&format=json&limit=1"))
                .andExpect(method(GET))
                .andExpect(header("User-Agent", "FlowFuel/1.0 (+https://flowfuel-api.fly.dev)"))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));

        Optional<GeocodeResponseDTO> result = client.geocode("Recife");

        assertThat(result).isPresent();
        assertThat(result.get().getLatitude()).isEqualTo(-8.05);
        assertThat(result.get().getLongitude()).isEqualTo(-34.90);
    }

    @Test
    void geocode_semResultados_retornaVazio() {
        server.expect(requestTo(BASE_URL + "?q=xyzabc123&format=json&limit=1"))
                .andExpect(method(GET))
                .andRespond(withSuccess("[]", MediaType.APPLICATION_JSON));

        assertThat(client.geocode("xyzabc123")).isEmpty();
    }

    @Test
    void geocode_nominatimRetorna500_lancaExternalServiceUnavailable() {
        server.expect(requestTo(BASE_URL + "?q=Recife&format=json&limit=1"))
                .andExpect(method(GET))
                .andRespond(withServerError());

        assertThatThrownBy(() -> client.geocode("Recife"))
                .isInstanceOf(ExternalServiceUnavailableException.class);
    }
}
```

- [ ] **Step 2: Run test to verify it fails (class doesn't exist yet)**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=NominatimClientTest`
Expected: FAIL — compilation error, `NominatimClient` does not exist.

- [ ] **Step 3: Write `NominatimResultDTO`**

```java
package com.devappmobile.flowfuel.station.client;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonIgnoreProperties(ignoreUnknown = true)
public class NominatimResultDTO {

    private String lat;
    private String lon;
}
```

- [ ] **Step 4: Write `NominatimClient`**

```java
package com.devappmobile.flowfuel.station.client;

import com.devappmobile.flowfuel.exception.ExternalServiceUnavailableException;
import com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Cliente do Nominatim (OpenStreetMap) para geocoding de endereco em texto.
 * Sem key, mas a politica de uso exige User-Agent identificavel e limita a
 * ~1 req/s por cliente; throttle() garante esse intervalo minimo entre
 * chamadas dentro desta instancia da aplicacao.
 */
@Component
public class NominatimClient {

    private static final Logger log = LoggerFactory.getLogger(NominatimClient.class);
    private static final String USER_AGENT = "FlowFuel/1.0 (+https://flowfuel-api.fly.dev)";
    private static final long MIN_INTERVAL_MS = 1000;

    private final RestClient restClient;
    private final String baseUrl;
    private final AtomicLong lastRequestAt = new AtomicLong(0);

    public NominatimClient(RestClient.Builder builder,
            @Value("${flowfuel.station.nominatim.base-url:https://nominatim.openstreetmap.org/search}") String baseUrl) {
        this.baseUrl = baseUrl;
        this.restClient = builder.build();
    }

    public Optional<GeocodeResponseDTO> geocode(String query) {
        throttle();
        try {
            NominatimResultDTO[] response = restClient.get()
                    .uri(baseUrl + "?q={query}&format=json&limit=1", query)
                    .header("User-Agent", USER_AGENT)
                    .retrieve()
                    .body(NominatimResultDTO[].class);
            if (response == null || response.length == 0) {
                return Optional.empty();
            }
            NominatimResultDTO result = response[0];
            return Optional.of(GeocodeResponseDTO.builder()
                    .latitude(Double.parseDouble(result.getLat()))
                    .longitude(Double.parseDouble(result.getLon()))
                    .build());
        } catch (RestClientException e) {
            log.warn("Falha ao chamar Nominatim: {}", e.getMessage());
            throw new ExternalServiceUnavailableException("Falha ao consultar Nominatim", e);
        }
    }

    private synchronized void throttle() {
        long elapsed = System.currentTimeMillis() - lastRequestAt.get();
        if (elapsed < MIN_INTERVAL_MS) {
            try {
                Thread.sleep(MIN_INTERVAL_MS - elapsed);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        lastRequestAt.set(System.currentTimeMillis());
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=NominatimClientTest`
Expected: PASS (3 tests, all green). Each test only calls `geocode` once, so the throttle never sleeps during the suite.

- [ ] **Step 6: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/station/client/NominatimClient.java \
        src/main/java/com/devappmobile/flowfuel/station/client/NominatimResultDTO.java \
        src/test/java/com/devappmobile/flowfuel/station/client/NominatimClientTest.java
git commit -m "feat: add NominatimClient for address geocoding"
```

---

### Task 3: `GeocodeCacheService`

**Files:**
- Create: `src/main/java/com/devappmobile/flowfuel/station/GeocodeCacheService.java`
- Test: `src/test/java/com/devappmobile/flowfuel/station/GeocodeCacheServiceTest.java`

Mirrors `StationCacheService` exactly, but caches a single `GeocodeResponseDTO` instead of a `List<StationResponseDTO>`.

- [ ] **Step 1: Write the failing test**

```java
package com.devappmobile.flowfuel.station;

import com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.lettuce.core.RedisException;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GeocodeCacheServiceTest {

    @Mock private ObjectProvider<StatefulRedisConnection<String, byte[]>> connectionProvider;
    @Mock private StatefulRedisConnection<String, byte[]> connection;
    @Mock private RedisCommands<String, byte[]> commands;

    private GeocodeCacheService cacheService;

    @BeforeEach
    void setUp() {
        cacheService = new GeocodeCacheService(connectionProvider, new ObjectMapper());
    }

    @Test
    void get_semConexaoDisponivel_retornaVazioFailOpen() {
        when(connectionProvider.getIfAvailable()).thenReturn(null);

        assertThat(cacheService.get("key")).isEmpty();
    }

    @Test
    void get_cacheHit_deserializaResultado() {
        GeocodeResponseDTO geocode = GeocodeResponseDTO.builder()
                .latitude(-8.05).longitude(-34.90).build();
        ObjectMapper mapper = new ObjectMapper();
        byte[] serialized;
        try {
            serialized = mapper.writeValueAsBytes(geocode);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(connectionProvider.getIfAvailable()).thenReturn(connection);
        when(connection.sync()).thenReturn(commands);
        when(commands.get("key")).thenReturn(serialized);

        Optional<GeocodeResponseDTO> result = cacheService.get("key");

        assertThat(result).isPresent();
        assertThat(result.get().getLatitude()).isEqualTo(-8.05);
    }

    @Test
    void get_redisLancaExcecao_failOpenRetornaVazio() {
        when(connectionProvider.getIfAvailable()).thenReturn(connection);
        when(connection.sync()).thenReturn(commands);
        when(commands.get("key")).thenThrow(new RedisException("down"));

        assertThat(cacheService.get("key")).isEmpty();
    }

    @Test
    void put_comConexao_chamaSetComTtl() {
        when(connectionProvider.getIfAvailable()).thenReturn(connection);
        when(connection.sync()).thenReturn(commands);

        cacheService.put("key", GeocodeResponseDTO.builder().latitude(-8.05).longitude(-34.90).build());

        verify(commands).set(eq("key"), any(byte[].class), any());
    }

    @Test
    void put_semConexaoDisponivel_naoLancaExcecao() {
        when(connectionProvider.getIfAvailable()).thenReturn(null);

        cacheService.put("key", GeocodeResponseDTO.builder().latitude(-8.05).longitude(-34.90).build());
        // sem excecao = sucesso (fail-open)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=GeocodeCacheServiceTest`
Expected: FAIL — compilation error, `GeocodeCacheService` does not exist.

- [ ] **Step 3: Write `GeocodeCacheService`**

```java
package com.devappmobile.flowfuel.station;

import com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.lettuce.core.SetArgs;
import io.lettuce.core.api.StatefulRedisConnection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

/**
 * Cache Redis raw (nao @Cacheable) para resultados de geocoding de endereco.
 * Mesmo padrao de StationCacheService: fail-open, qualquer falha vira cache miss.
 */
@Service
public class GeocodeCacheService {

    private static final Logger log = LoggerFactory.getLogger(GeocodeCacheService.class);
    private static final Duration TTL = Duration.ofMinutes(10);

    private final ObjectProvider<StatefulRedisConnection<String, byte[]>> connectionProvider;
    private final ObjectMapper objectMapper;

    public GeocodeCacheService(ObjectProvider<StatefulRedisConnection<String, byte[]>> connectionProvider,
            ObjectMapper objectMapper) {
        this.connectionProvider = connectionProvider;
        this.objectMapper = objectMapper;
    }

    public Optional<GeocodeResponseDTO> get(String key) {
        StatefulRedisConnection<String, byte[]> connection = connectionProvider.getIfAvailable();
        if (connection == null) {
            return Optional.empty();
        }
        try {
            byte[] value = connection.sync().get(key);
            if (value == null) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(value, GeocodeResponseDTO.class));
        } catch (Exception e) {
            log.warn("Geocode cache indisponivel (get), fail-open. key={} error={}", key, e.getMessage());
            return Optional.empty();
        }
    }

    public void put(String key, GeocodeResponseDTO geocode) {
        StatefulRedisConnection<String, byte[]> connection = connectionProvider.getIfAvailable();
        if (connection == null) {
            return;
        }
        try {
            byte[] value = objectMapper.writeValueAsBytes(geocode);
            connection.sync().set(key, value, new SetArgs().ex(TTL.toSeconds()));
        } catch (Exception e) {
            log.warn("Geocode cache indisponivel (put), fail-open. key={} error={}", key, e.getMessage());
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=GeocodeCacheServiceTest`
Expected: PASS (5 tests, all green).

- [ ] **Step 5: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/station/GeocodeCacheService.java \
        src/test/java/com/devappmobile/flowfuel/station/GeocodeCacheServiceTest.java
git commit -m "feat: add GeocodeCacheService"
```

---

### Task 4: Wire `geocode()` into `StationService`

**Files:**
- Modify: `src/main/java/com/devappmobile/flowfuel/station/StationService.java`
- Modify: `src/test/java/com/devappmobile/flowfuel/station/StationServiceTest.java`

- [ ] **Step 1: Write the failing tests**

Add these three tests to `StationServiceTest.java`, and update `setUp()` and the mock list to include the two new collaborators (`NominatimClient`, `GeocodeCacheService`):

```java
    @Mock private com.devappmobile.flowfuel.station.client.NominatimClient nominatimClient;
    @Mock private GeocodeCacheService geocodeCacheService;
```

```java
    @BeforeEach
    void setUp() {
        stationService = new StationService(overpassClient, openChargeMapClient, cacheService,
                proxyManagerProvider, nominatimClient, geocodeCacheService);
    }
```

```java
    @Test
    void geocode_cacheHit_naoChamaNominatim() {
        com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO cached =
                com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO.builder()
                        .latitude(-8.05).longitude(-34.90).build();
        when(geocodeCacheService.get("stations:geocode:recife")).thenReturn(Optional.of(cached));

        com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO result = stationService.geocode("Recife");

        assertThat(result).isEqualTo(cached);
        verifyNoInteractions(nominatimClient);
    }

    @Test
    void geocode_cacheMiss_chamaNominatimESalvaCache() {
        com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO geocoded =
                com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO.builder()
                        .latitude(-8.05).longitude(-34.90).build();
        when(geocodeCacheService.get("stations:geocode:recife")).thenReturn(Optional.empty());
        when(nominatimClient.geocode("Recife")).thenReturn(Optional.of(geocoded));

        com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO result = stationService.geocode("Recife");

        assertThat(result).isEqualTo(geocoded);
        verify(geocodeCacheService).put("stations:geocode:recife", geocoded);
    }

    @Test
    void geocode_semResultados_lancaResourceNotFound() {
        when(geocodeCacheService.get(any())).thenReturn(Optional.empty());
        when(nominatimClient.geocode("xyzabc123")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> stationService.geocode("xyzabc123"))
                .isInstanceOf(com.devappmobile.flowfuel.exception.ResourceNotFoundException.class);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=StationServiceTest`
Expected: FAIL — compilation error, `StationService` constructor doesn't accept 6 args and has no `geocode` method.

- [ ] **Step 3: Update `StationService`**

Add imports, two new constructor params/fields, and the `geocode` method:

```java
import com.devappmobile.flowfuel.exception.ResourceNotFoundException;
import com.devappmobile.flowfuel.station.client.NominatimClient;
import com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO;
```

```java
    private final NominatimClient nominatimClient;
    private final GeocodeCacheService geocodeCacheService;

    public StationService(OverpassClient overpassClient, OpenChargeMapClient openChargeMapClient,
            StationCacheService cacheService, ObjectProvider<ProxyManager<String>> proxyManagerProvider,
            NominatimClient nominatimClient, GeocodeCacheService geocodeCacheService) {
        this.overpassClient = overpassClient;
        this.openChargeMapClient = openChargeMapClient;
        this.cacheService = cacheService;
        this.proxyManagerProvider = proxyManagerProvider;
        this.nominatimClient = nominatimClient;
        this.geocodeCacheService = geocodeCacheService;
    }
```

```java
    public GeocodeResponseDTO geocode(String query) {
        String cacheKey = "stations:geocode:" + query.trim().toLowerCase(Locale.ROOT);
        Optional<GeocodeResponseDTO> cached = geocodeCacheService.get(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        GeocodeResponseDTO result = nominatimClient.geocode(query)
                .orElseThrow(() -> new ResourceNotFoundException("Endereço não encontrado: " + query));

        geocodeCacheService.put(cacheKey, result);
        return result;
    }
```

(`Locale` is already imported in this file for `round()`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=StationServiceTest`
Expected: PASS (11 tests, all green — 8 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/station/StationService.java \
        src/test/java/com/devappmobile/flowfuel/station/StationServiceTest.java
git commit -m "feat: add geocode method to StationService"
```

---

### Task 5: `GET /stations/geocode` endpoint

**Files:**
- Modify: `src/main/java/com/devappmobile/flowfuel/station/StationController.java`
- Modify: `src/test/java/com/devappmobile/flowfuel/station/StationControllerIntegrationTest.java`

- [ ] **Step 1: Write the failing tests**

Add to `StationControllerIntegrationTest.java`:

```java
    @Test
    void geocode_semToken_retorna401() throws Exception {
        mockMvc.perform(get("/api/v1/stations/geocode").param("query", "Recife"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void geocode_queryEmBranco_retorna400() throws Exception {
        String token = obterToken("station-geocode1@test.com");
        mockMvc.perform(get("/api/v1/stations/geocode")
                        .header("Authorization", "Bearer " + token)
                        .param("query", ""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void geocode_requisicaoValida_retorna200ComResultadoDoService() throws Exception {
        String token = obterToken("station-geocode2@test.com");
        when(stationService.geocode("Recife")).thenReturn(
                com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO.builder()
                        .latitude(-8.05).longitude(-34.90).build());

        mockMvc.perform(get("/api/v1/stations/geocode")
                        .header("Authorization", "Bearer " + token)
                        .param("query", "Recife"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(-8.05))
                .andExpect(jsonPath("$.longitude").value(-34.90));
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=StationControllerIntegrationTest`
Expected: FAIL — 404, endpoint doesn't exist yet.

- [ ] **Step 3: Add the endpoint**

In `StationController.java`, add imports and the new method:

```java
import com.devappmobile.flowfuel.station.dto.GeocodeResponseDTO;
import jakarta.validation.constraints.NotBlank;
```

```java
    @GetMapping("/geocode")
    public GeocodeResponseDTO geocode(@RequestParam @NotBlank String query) {
        return stationService.geocode(query);
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test -Dtest=StationControllerIntegrationTest`
Expected: PASS (7 tests, all green — 4 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/java/com/devappmobile/flowfuel/station/StationController.java \
        src/test/java/com/devappmobile/flowfuel/station/StationControllerIntegrationTest.java
git commit -m "feat: add GET /stations/geocode endpoint"
```

---

### Task 6: Configure Nominatim base URL

**Files:**
- Modify: `src/main/resources/application.properties`

- [ ] **Step 1: Add the property**

Add this line right after the existing station config block (near `flowfuel.station.open-charge-map.api-key`, around line 110):

```properties
flowfuel.station.nominatim.base-url=${NOMINATIM_BASE_URL:https://nominatim.openstreetmap.org/search}
```

Update the comment block above it (currently starting at `# Postos proximos (GET /api/v1/stations/nearby): ...`) to also mention geocoding:

```properties
# Postos proximos (GET /api/v1/stations/nearby): Overpass API (OSM, sem key)
# e Open Charge Map (sem key obrigatoria; com key aumenta o rate limit).
# Gere uma key gratuita em openchargemap.org se necessario e configure via
# env var OPEN_CHARGE_MAP_API_KEY (opcional, app sobe normalmente sem ela).
# Geocoding de endereco (GET /api/v1/stations/geocode): Nominatim (OSM),
# sem key, mas com rate limit de ~1 req/s (aplicado em NominatimClient).
```

- [ ] **Step 2: Run the full backend test suite**

Run: `cd /home/rocha/Projetos/flowfuel && ./mvnw test`
Expected: BUILD SUCCESS, all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel
git add src/main/resources/application.properties
git commit -m "feat: configure Nominatim base URL for geocoding"
```

---

## Part B — Frontend (`/home/rocha/Projetos/flowfuel-frontend`)

### Task 7: `src/services/stations.ts`

**Files:**
- Create: `src/services/stations.ts`

- [ ] **Step 1: Write the service**

```typescript
import { authenticatedRequest } from './api'

export type StationType = 'FUEL' | 'ELECTRIC'

export interface Station {
  placeId: string
  name: string
  type: StationType
  distanceMeters: number
  rating: number | null
  latitude: number
  longitude: number
  street: string | null
  houseNumber: string | null
}

export interface GeocodeResult {
  latitude: number
  longitude: number
}

export function fetchNearbyStations(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<Station[]> {
  return authenticatedRequest(
    `/stations/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}`
  )
}

export function geocodeAddress(query: string): Promise<GeocodeResult> {
  return authenticatedRequest(`/stations/geocode?query=${encodeURIComponent(query)}`)
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no errors (this file has no consumers yet, so it just needs to compile standalone).

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/services/stations.ts
git commit -m "feat: add stations service (nearby + geocode)"
```

---

### Task 8: `useGeolocation` hook

**Files:**
- Create: `src/hooks/useGeolocation.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useEffect, useState } from 'react'

interface Coordinates {
  latitude: number
  longitude: number
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(true)
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLoading(false)
      },
      () => {
        setError(true)
        setLoading(false)
      }
    )
  }, [])

  return { coords, loading, error }
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/hooks/useGeolocation.ts
git commit -m "feat: add useGeolocation hook"
```

---

### Task 9: `useNearbyStations` hook

**Files:**
- Create: `src/hooks/useNearbyStations.ts`

Orchestrates: on mount, try browser geolocation and search automatically if it succeeds; expose a `search(query)` function for the manual address field; expose `radius` state for the selector.

- [ ] **Step 1: Write the hook**

```typescript
import { useEffect, useState } from 'react'
import { useGeolocation } from './useGeolocation'
import { fetchNearbyStations, geocodeAddress, type Station } from '../services/stations'

export const RADIUS_OPTIONS = [1000, 5000, 10000, 20000] as const
export const DEFAULT_RADIUS = 5000

export function useNearbyStations() {
  const { coords, loading: loadingGeolocation } = useGeolocation()
  const [stations, setStations] = useState<Station[]>([])
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [searched, setSearched] = useState(false)

  async function searchByCoords(latitude: number, longitude: number, radiusMeters: number) {
    setLoading(true)
    setError(false)
    try {
      const result = await fetchNearbyStations(latitude, longitude, radiusMeters)
      setStations(result)
      setSearched(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function searchByAddress(query: string) {
    setLoading(true)
    setError(false)
    try {
      const geocoded = await geocodeAddress(query)
      const result = await fetchNearbyStations(geocoded.latitude, geocoded.longitude, radius)
      setStations(result)
      setSearched(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (coords && !searched) {
      searchByCoords(coords.latitude, coords.longitude, radius)
    }
    // only auto-search once, right after geolocation resolves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords])

  return {
    stations,
    radius,
    setRadius,
    loading: loading || loadingGeolocation,
    error,
    searched,
    searchByAddress,
  }
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/hooks/useNearbyStations.ts
git commit -m "feat: add useNearbyStations hook"
```

---

### Task 10: `NearbyStations` route

**Files:**
- Create: `src/routes/NearbyStations.tsx`

Uses the existing `Screen`, `Card`, `ErrorState`, `Button`, `TextField`, `Spinner` components (all read in step "Exploring approaches" above) to stay visually consistent with `VehicleEvents.tsx` and friends.

- [ ] **Step 1: Write the route**

```typescript
import { useState, type FormEvent } from 'react'
import { Screen } from '../components/ui/Screen'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/ui/ErrorState'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import {
  useNearbyStations,
  RADIUS_OPTIONS,
  DEFAULT_RADIUS,
} from '../hooks/useNearbyStations'
import type { Station } from '../services/stations'

const TYPE_ICON: Record<Station['type'], string> = {
  FUEL: '⛽',
  ELECTRIC: '🔌',
}

const TYPE_LABEL: Record<Station['type'], string> = {
  FUEL: 'Combustível',
  ELECTRIC: 'Elétrico',
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`
  return `${(meters / 1000).toFixed(1)}km`
}

function formatRadius(meters: number): string {
  return meters < 1000 ? `${meters}m` : `${meters / 1000}km`
}

function formatAddress(station: Station): string | null {
  if (!station.street) return null
  return station.houseNumber ? `${station.street}, ${station.houseNumber}` : station.street
}

function mapsUrl(station: Station): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`
}

export function NearbyStations() {
  const { stations, radius, setRadius, loading, error, searched, searchByAddress } =
    useNearbyStations()
  const [query, setQuery] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!query.trim()) return
    searchByAddress(query.trim())
  }

  return (
    <Screen wide>
      <h1 className="mb-5 text-xl font-bold">Postos Próximos</h1>

      <form onSubmit={handleSubmit} className="mb-5 flex flex-col gap-2 sm:flex-row">
        <TextField
          placeholder="📍 Perto de você"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:flex-1"
        />
        <select
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="h-12 rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          {RADIUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {formatRadius(option)}
            </option>
          ))}
        </select>
        <Button type="submit" fullWidth={false}>
          Buscar
        </Button>
      </form>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}

      {!loading && error && (
        <ErrorState message="Não foi possível buscar os postos. Verifique sua conexão e tente novamente." />
      )}

      {!loading && !error && searched && stations.length === 0 && (
        <p className="text-gray-600">
          Nenhum posto encontrado em um raio de {formatRadius(radius ?? DEFAULT_RADIUS)}.
        </p>
      )}

      {!loading && !error && stations.length > 0 && (
        <ul className="flex flex-col gap-3">
          {stations.map((station) => (
            <li key={station.placeId}>
              <a href={mapsUrl(station)} target="_blank" rel="noreferrer">
                <Card className="transition-colors hover:bg-green-50">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="font-bold">
                      {TYPE_ICON[station.type]} {station.name}
                    </p>
                    <p className="text-sm text-gray-600">{formatDistance(station.distanceMeters)}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {TYPE_LABEL[station.type]}
                    {station.rating !== null && ` · ⭐ ${station.rating.toFixed(1)}`}
                    {formatAddress(station) && ` · ${formatAddress(station)}`}
                  </p>
                </Card>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/routes/NearbyStations.tsx
git commit -m "feat: add NearbyStations route"
```

---

### Task 11: Wire route into `App.tsx` and nav into `NavLinks.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/NavLinks.tsx`

- [ ] **Step 1: Add the route**

In `src/App.tsx`, add the import next to the other route imports:

```typescript
import { NearbyStations } from './routes/NearbyStations'
```

Add the route inside the `<Route element={<AppLayout />}>` block, right after `/vehicle-events/:id/edit`:

```typescript
                    <Route path="/nearby-stations" element={<NearbyStations />} />
```

- [ ] **Step 2: Add the nav item**

In `src/components/layout/NavLinks.tsx`, add a new entry to `navItems` between "Eventos" and "Exportar":

```typescript
  { to: '/vehicle-events', label: 'Eventos', icon: '🔧', end: false },
  { to: '/nearby-stations', label: 'Postos Próximos', icon: '📍', end: false },
  { to: '/export', label: 'Exportar', icon: '📤', end: false },
```

- [ ] **Step 3: Type-check and build**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npm run build`
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Manual verification in the browser**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && npm run dev`

- Open the app, log in, select a vehicle.
- Confirm "Postos Próximos" (📍) appears in the desktop sidebar and in the mobile hamburger drawer, between "Eventos" and "Exportar".
- Click it, allow (or deny) the browser's location permission prompt, and confirm the list loads (or that denying it doesn't break the page — the address field should still be usable).
- Type an address into the search field, submit, and confirm the list updates.
- Change the radius selector and confirm a new search fires.
- Click a station card and confirm it opens Google Maps directions in a new tab.
- Stop the dev server (`Ctrl+C`) when done.

- [ ] **Step 5: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add src/App.tsx src/components/layout/NavLinks.tsx
git commit -m "feat: wire nearby-stations route into nav and router"
```

---

## Summary

| Task | Repo | What |
|---|---|---|
| 1–6 | `flowfuel` (backend) | `GeocodeResponseDTO`, `NominatimClient`, `GeocodeCacheService`, `StationService.geocode()`, `GET /stations/geocode`, config |
| 7–11 | `flowfuel-frontend` | `stations.ts` service, `useGeolocation`/`useNearbyStations` hooks, `NearbyStations` route, nav wiring |

After Task 11, the feature is fully wired end-to-end and manually verified in the browser.
