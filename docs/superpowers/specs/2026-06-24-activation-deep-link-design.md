# Design: Ativação de conta via deep link no app mobile

**Data:** 2026-06-24
**Status:** aprovado

## Contexto

O backend (`flowfuel`) já foi alterado para que `POST /auth/activate` valide o token de ativação de conta e, no mesmo request, emita um par de tokens JWT (access + refresh) — autenticando o usuário automaticamente no momento da ativação, sem precisar de um login separado depois (ver `flowfuel/docs/superpowers/specs/2026-06-24-magic-link-auto-login-design.md`).

O que falta é o lado que consome o clique no link de ativação enviado por email. Hoje esse link (`ACCOUNT_ACTIVATION_LINK_BASE_URL`) aponta para uma URL HTTP solta (`https://flowfuel-api.fly.dev?token=...`) sem nenhuma página ou app por trás — clicar nela não faz nada útil.

O app mobile (`flowfuel-frontend`, Expo/React Native, já tem `expo-linking` e um `scheme` customizado registrado em `app.json`: `flowfuelfrontend`) é o "aplicativo" que deve abrir diretamente quando o usuário toca no link do email, processar o token e autenticar.

Durante a investigação, dois bugs pré-existentes (não relacionados à ativação, mas que bloqueiam qualquer fluxo de auth real) foram encontrados e serão corrigidos como parte deste trabalho, por estarem nos mesmos arquivos e impedirem o fluxo de funcionar de ponta a ponta:

1. `services/api.ts` aponta para `http://192.168.1.2:8080/api/auth/...` (IP local, sem prefixo `/api/v1`) — não bate com a API real (`https://flowfuel-api.fly.dev/api/v1/...`).
2. `context/AuthContext.tsx` grava o token em `AsyncStorage` na chave `'@app_token'`, mas `services/api.ts#authenticatedRequest` lê da chave `'@token'` — chaves diferentes, o token nunca é encontrado nas chamadas autenticadas.
3. `app/(auth)/login.tsx` e `register.tsx` leem `data.token` da resposta de login, mas o backend retorna `accessToken` (campo diferente).

## Decisões de Design

### 1. Link de ativação usa o esquema customizado do app

`ACCOUNT_ACTIVATION_LINK_BASE_URL` (secret do Fly, backend) muda de `https://flowfuel-api.fly.dev` para `flowfuelfrontend://activate`. Nenhuma mudança de código no backend — `SmtpAccountActivationNotifier` já monta o link como `linkBaseUrl + "?token=" + token`, então o resultado fica `flowfuelfrontend://activate?token=<token>`.

Com `expo-router` e o `scheme: "flowfuelfrontend"` já declarado em `app.json`, essa URL abre o app diretamente na rota `app/activate.tsx` (mapeamento automático por convenção de arquivo — sem precisar de `linking.config` manual).

**Limitação aceita, não resolvida agora:** alguns clientes de email (notadamente Gmail) podem não renderizar `href` com esquema customizado como link clicável (ao contrário de `http(s)://`), por filtragem de segurança do próprio cliente de email. A alternativa robusta — Universal Links (iOS) / App Links (Android), que usam `https://` de verdade com arquivos de verificação hospedados num domínio próprio — exige domínio verificado, que o usuário não tem ainda (mesma limitação já registrada na decisão de SMTP). Ficará registrado como ponto de atenção; será testado em dispositivo real com o build instalado, e revisitado quando houver domínio próprio.

### 2. Nova tela `app/activate.tsx`

Rota de nível superior (fora dos grupos `(auth)` e `(tabs)`, no mesmo nível de `select-vehicle.tsx` e `modal.tsx`).

Fluxo:
1. Lê `token` da query string via `useLocalSearchParams<{ token?: string }>()`.
2. Se não houver `token`, mostra erro imediatamente (estado `error`).
3. Em um `useEffect`, chama `activateRequest(token)` (nova função em `services/api.ts`).
4. **Sucesso:** chama `signIn(accessToken)` do `AuthContext`. Não navega manualmente — `app/_layout.tsx` já observa `token` no `AuthContext` e redireciona automaticamente (para `/select-vehicle` ou `/(tabs)`, conforme a lógica existente).
5. **Erro** (token inválido/expirado/já usado, ou ausente, ou falha de rede): mostra mensagem de erro com botão "Ir para o login" (`router.replace('/(auth)/login')`).

Estados de UI: `loading` (spinner, enquanto chama a API) → `error` (mensagem + botão) ou sucesso silencioso (o redirecionamento automático do `_layout.tsx` cobre isso, sem precisar de uma tela de "sucesso" própria).

### 3. `services/api.ts` — correções e nova função

- `BASE_URL` muda de `http://192.168.1.2:8080` para `https://flowfuel-api.fly.dev`.
- Todos os paths ganham o prefixo `/api/v1` (`/api/v1/auth/login`, `/api/v1/auth/register`, `/api/v1/auth/activate`).
- Nova função `activateRequest(token: string)`: `POST /api/v1/auth/activate` com `{ token }`, retorna `{ accessToken, refreshToken, expiresIn }` (mesmo shape de `loginRequest`). Mesmo padrão de tratamento de erro de `registerRequest` (tenta extrair mensagem do corpo JSON do erro; cai num fallback genérico se não conseguir).
- `authenticatedRequest` passa a ler da mesma chave que `AuthContext` usa para gravar (corrige o bug de chave).

### 4. `context/AuthContext.tsx` — corrige a chave de storage

Unifica a chave do `AsyncStorage` usada por `signIn`/`loadToken`/`signOut` e por `authenticatedRequest` (em `services/api.ts`) — usar uma única constante exportada (`AUTH_TOKEN_STORAGE_KEY`) em vez de strings literais duplicadas e divergentes (`'@app_token'` vs `'@token'`). Mantém a interface pública do contexto igual (`token`, `loading`, `signIn`, `signOut`) — só access token, sem suporte a refresh token automático nesta etapa (combinado: renovação automática de sessão fica para uma tarefa futura separada).

### 5. `app/(auth)/register.tsx` — remove auto-login, mostra "verifique seu email"

Remove a chamada a `loginRequest` após `registerRequest` (não funcionaria mesmo — a conta fica `PENDING_ACTIVATION` e login é bloqueado até a ativação). Em sucesso, em vez de navegar, troca o conteúdo da tela para uma mensagem: "Conta criada! Verifique seu email (`<email digitado>`) e toque no link para ativar sua conta.", com um botão opcional para voltar à tela de login.

### 6. `app/(auth)/login.tsx` — corrige campo do token

Troca `data.token` por `data.accessToken` na chamada a `signIn(...)`, alinhando com o shape real da resposta do backend (`TokenPairResponse`).

## Arquivos Novos

```
flowfuel-frontend/app/activate.tsx
```

## Arquivos Modificados

```
flowfuel-frontend/services/api.ts
flowfuel-frontend/context/AuthContext.tsx
flowfuel-frontend/app/(auth)/register.tsx
flowfuel-frontend/app/(auth)/login.tsx
```

## Configuração (sem código)

```
Fly secret (projeto flowfuel, backend):
  ACCOUNT_ACTIVATION_LINK_BASE_URL: https://flowfuel-api.fly.dev → flowfuelfrontend://activate
```

## Testes

Este é um projeto Expo/React Native sem suíte de testes automatizados configurada no momento (não há Jest/Testing Library no `package.json`). A verificação será manual, em dispositivo real com o build instalado:

1. Cadastrar um usuário novo no app → confirmar que aparece a tela "verifique seu email" (sem login automático).
2. Abrir o email recebido → tocar no link de ativação → confirmar que o app abre diretamente na tela de ativação (loading) e, em seguida, redireciona automaticamente para `/select-vehicle` ou `/(tabs)` (conforme o estado do `VehicleContext`), sem precisar digitar senha.
3. Tentar reabrir o mesmo link de ativação uma segunda vez (token já usado) → confirmar que mostra a tela de erro com botão para login.
4. Fluxo de login normal (`email`/senha de uma conta já ativa) → confirmar que ainda funciona após a correção de `data.token` → `data.accessToken`.
5. Confirmar, no dispositivo real, se o Gmail realmente abre o app ao tocar no link (valida ou refuta a limitação de esquema customizado registrada acima).

## Critérios de Aceitação

- Tocar no link de ativação do email abre o app diretamente (quando o cliente de email permite) e autentica o usuário sem precisar de login manual.
- Cadastro não tenta mais logar automaticamente; mostra tela de "verifique seu email".
- Login com conta já ativa continua funcionando (corrigido o bug `data.token`/`data.accessToken`).
- `services/api.ts` aponta para a API real de produção com os paths corretos.
- Token salvo por `signIn` é o mesmo lido por `authenticatedRequest` (bug de chave corrigido).
- Token de ativação inválido/expirado/usado resulta em mensagem de erro clara com caminho para o login, sem crash.

## Riscos e Mitigações

- **Gmail pode não linkificar `flowfuelfrontend://...`:** mitigado parcialmente pelo fato de o usuário já ter um build standalone instalado (não depende de Expo Go); risco residual fica registrado para teste real e revisão futura com domínio próprio.
- **Quebra de compatibilidade ao corrigir `BASE_URL`/paths:** não há usuários reais em produção usando o app ainda (fase de desenvolvimento), risco baixo.
- **Mudança de chave do `AsyncStorage`:** sessões antigas salvas sob `'@app_token'` ou `'@token'` ficam inacessíveis após a correção — aceitável, pois força um novo login limpo, e não há usuários reais dependendo de sessão persistida ainda.
