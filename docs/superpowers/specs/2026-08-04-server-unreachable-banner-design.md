# Banner de "servidor indisponível" ao falhar erro de rede — Design

## Contexto

Hoje, quando o backend está indisponível (fora do ar, DNS falhando, conexão
recusada — qualquer falha que impede o `fetch` de sequer obter uma
`Response`), o app não tem nenhum tratamento específico para isso. Cada
call site trata a exceção lançada pelo `fetch` do mesmo jeito que trataria
um erro de validação (400) ou uma sessão expirada (401): captura no
`try/catch` local e mostra `error.message` via `showToast(...)` — que nesse
caso é a mensagem genérica do `TypeError` do navegador (`"Failed to
fetch"`), sem nenhum aviso de que o problema é conectividade e não os dados
que o usuário preencheu.

Não existe hoje nenhuma camada central de `fetch`: `src/services/api.ts`
exporta `authenticatedRequest()` e algumas funções de autenticação
(`loginRequest`, `registerRequest`, etc.) que chamam `fetch` diretamente;
`vehicle.ts`, `profile.ts`, `export.ts` e `fipe.ts` também chamam `fetch`
diretamente em vários pontos (não passam por `authenticatedRequest`). Não
há interceptor, `ErrorBoundary`, nem detecção de offline/servidor fora do
ar em nenhum lugar do código (`grep` por `navigator.onLine`, `offline`,
`ErrorBoundary`, `Failed to fetch` não retorna nada).

## Objetivo

Quando qualquer chamada à API falhar por erro de rede (o `fetch` rejeita a
promise sem chegar a produzir uma `Response` — servidor fora do ar, DNS,
conexão recusada, timeout de conexão), mostrar um banner fixo no topo do
app avisando o usuário que o servidor está indisponível. O banner fica
visível até o usuário fechar manualmente ou até uma requisição subsequente
ter sucesso (reconexão). Detecção é puramente **reativa** — não há
health-check nem polling; só reage a falhas que já aconteceriam de
qualquer forma por ação do usuário.

Erros que já têm `Response` (400, 401, 404, 500 etc.) **não** acionam o
banner — continuam indo para o toast de erro existente, sem mudança de
comportamento.

## Fora de escopo

- Health-check/polling periódico de um endpoint de status.
- Retry automático de requisições que falharam por erro de rede.
- Diferenciar tipos de erro de rede (DNS vs. timeout vs. conexão recusada)
  — todos mostram a mesma mensagem genérica.
- Migrar `api.ts`/`vehicle.ts`/etc. para usar uma lib de HTTP (axios) —
  continua sendo `fetch` nativo, só embrulhado.
- Testes automatizados (projeto não tem suíte configurada, mesma situação
  dos specs anteriores).

## Arquitetura

### `src/services/serverStatus.ts` (novo)

Módulo de estado simples fora da árvore React, seguindo o mesmo espírito
de `clearSession()` em `api.ts` (que já mexe em `localStorage` fora de
qualquer componente). Sem dependência nova (sem Redux/Zustand — o projeto
não usa nenhuma lib de estado global hoje).

- Estado module-level: `let isUnreachable = false` + `Set<() => void>` de
  listeners.
- `reportNetworkError()`: se `isUnreachable` já for `true`, não faz nada
  (evita notificar listeners à toa em rajadas de chamadas falhando ao
  mesmo tempo); senão seta `true` e notifica listeners.
- `reportNetworkSuccess()`: se `isUnreachable` for `true`, seta `false` e
  notifica listeners (reconexão silenciosa fecha o banner); se já for
  `false`, não faz nada.
- `dismiss()`: fecha o banner sem alterar o estado real de conectividade —
  usa uma segunda flag `dismissed` (resetada para `false` toda vez que
  `reportNetworkError()` transiciona de `false`→`true`, ou seja, um novo
  erro de rede sempre reabre o banner mesmo que o usuário tenha fechado o
  anterior).
- `subscribe(listener: () => void): () => void`: registra/desregistra.
- `useServerStatus()`: hook usando `useSyncExternalStore` para expor
  `{ visible: boolean }` (`visible = isUnreachable && !dismissed`) e
  `dismiss()` a componentes.

### `src/services/httpClient.ts` (novo)

`export async function apiFetch(input: RequestInfo, init?: RequestInit):
Promise<Response>` — wrapper fino sobre `fetch` global:

```ts
export async function apiFetch(input: RequestInfo, init?: RequestInit) {
  try {
    const response = await fetch(input, init)
    reportNetworkSuccess()
    return response
  } catch (err) {
    reportNetworkError()
    throw err
  }
}
```

Não interpreta status HTTP (isso continua sendo responsabilidade de quem
chama, como já é hoje) — só distingue "o `fetch` rejeitou" (erro de rede)
de "o `fetch` resolveu com uma `Response`, seja ela qual status for"
(sucesso de conectividade, ainda que a aplicação trate como erro depois).

### Refatoração mecânica dos services existentes

Trocar toda chamada `fetch(...)` por `apiFetch(...)` (import de
`httpClient.ts`) nos 5 arquivos que hoje chamam `fetch` diretamente:
`api.ts`, `vehicle.ts`, `profile.ts`, `export.ts`, `fipe.ts`. Nenhuma outra
lógica muda — parsing de erro (`extractErrorMessage`), tratamento de 401
(`clearSession()` + redirect), parsing de blob/JSON, tudo continua igual,
só a função de fetch usada muda.

### `src/components/ui/ServerStatusBanner.tsx` (novo)

```tsx
export function ServerStatusBanner() {
  const { visible, dismiss } = useServerStatus()
  if (!visible) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-red-600 px-4 py-2 text-sm font-medium text-white"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <p>Não foi possível conectar ao servidor. Tente novamente mais tarde.</p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar aviso"
        className="text-lg leading-none text-white/80 hover:text-white"
      >
        ×
      </button>
    </div>
  )
}
```

`z-50` — acima do `ConfirmDialog` (hoje `z-50` também, mas o banner de
conectividade é sobre o app inteiro incluindo qualquer modal; na prática
os dois cenários — servidor cair no meio de uma confirmação — são raros o
suficiente para não precisar de uma regra de precedência mais elaborada) e
do `ToastContainer` (`z-40`). Posição fixa no topo (o toast já ocupa o
rodapé) para não competir visualmente.

### `App.tsx`

Renderizar `<ServerStatusBanner />` uma vez, dentro do `BrowserRouter` mas
fora de `ProtectedRoute` (precisa aparecer também em `/login`/`/register`,
onde uma falha de rede é ainda mais provável de ser a primeira coisa que o
usuário encontra). Posição no JSX: logo acima de `<ToastContainer />` (não
afeta ordem de renderização, só organização).

## Testes

Sem suíte automatizada configurada (mesma situação dos specs anteriores).
Verificação manual: `npm run dev`, depois:

- Com o backend rodando normalmente, abrir DevTools → Network → "Offline"
  (ou trocar `VITE_API_URL` para um host inexistente) e disparar qualquer
  chamada à API (ex.: recarregar `/select-vehicle`, tentar login) —
  confirmar que o banner vermelho aparece no topo com a mensagem correta,
  e que a chamada continua caindo no `catch` local da tela normalmente
  (nenhum comportamento existente quebra).
- Com o banner visível, clicar no `×` — banner some.
- Com o banner visível (sem clicar no `×`), voltar a rede a "Online" (ou
  restaurar `VITE_API_URL`) e disparar uma nova chamada bem-sucedida —
  banner some sozinho.
- Fechar o banner (`×`), depois disparar um **novo** erro de rede — banner
  reaparece (o dismiss não é permanente).
- Provocar um erro comum (400/401/404, ex. login com senha errada) —
  confirmar que **não** aparece o banner, só o toast de erro de sempre.
- Verificar em `/login` (fora do `ProtectedRoute`) que o banner também
  funciona, não só nas telas autenticadas.

## Critério de sucesso

- `npm run build` passa sem erros.
- Nenhuma chamada `fetch(` direta restante em `api.ts`, `vehicle.ts`,
  `profile.ts`, `export.ts`, `fipe.ts` (buscável via `grep -rn 'fetch('
  src/services/` — só deve aparecer dentro de `httpClient.ts`).
- Os 6 cenários da seção de Testes verificados manualmente.
