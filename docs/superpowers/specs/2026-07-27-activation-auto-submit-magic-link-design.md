# Design: Auto-ativação ao abrir o link do email (magic link)

**Data:** 2026-07-27
**Status:** aprovado

## Contexto

O backend (`flowfuel` API) passou a enviar o email de ativação como um **botão/link clicável** (`{linkBaseUrl}?token=...&email=...`) em vez de um código para copiar/colar (ver spec do backend, commit `405e2c1` — "feat(user): send activation email as a one-click magic-link button"). O contrato de `POST /auth/activate` não mudou: continua recebendo `{ token }` e devolvendo `TokenPairResponse` (`accessToken`, `refreshToken`, `expiresInSeconds`).

A tela `Activate.tsx` (`src/routes/Activate.tsx`) **já** lê `token` e `email` da query string (linhas 13-19) e pré-preenche o campo de token, mas ainda exige que o usuário clique em "Ativar conta" manualmente (`handleActivate`, linhas 53-71) — isso já não faz mais sentido: o clique no botão do email já é a única ação que o usuário deveria precisar dar.

**Objetivo:** ao abrir `/activate?token=...&email=...` vindo do email, a página deve chamar `activateRequest` automaticamente (sem esperar clique no botão), logar o usuário e redirecionar — mantendo a tela atual como fallback para quem realmente precisar colar o código manualmente (ex.: SMTP falhou ou o link não abriu).

## Por que isso é seguro (recapitulando a decisão do backend)

Clientes de email corporativos podem pré-buscar (`GET`) a URL do botão para escanear malware antes do usuário abrir o email de verdade. Como a ativação real só acontece via `POST /auth/activate` disparado por **JavaScript** desta página (não um `GET` simples), esse pré-scan não consome o token — ele só baixa o HTML da SPA, não executa o fetch. Isso significa que o auto-submit descrito aqui pode disparar assim que a página monta, sem nenhum risco adicional além do que o clique manual já tinha.

## Decisão de Design

### `Activate.tsx`: auto-disparar `handleActivate` quando `token` vem da URL

- Adicionar um `useEffect` que roda uma vez ao montar: se `searchParams.get('token')` existir (não vazio), chama a mesma lógica de `handleActivate` automaticamente.
- Extrair a lógica de ativação de `handleActivate` (hoje acoplada ao evento de submit do form) para uma função `activate(tokenValue: string)` reutilizável tanto pelo `onSubmit` do form quanto pelo `useEffect`.
- Enquanto a ativação automática está em andamento, a tela mostra um estado de carregamento substituindo o form ("Ativando sua conta...") em vez do form + botão — evita o usuário ver e clicar num botão que já vai disparar sozinho.
- Se a ativação automática falhar (token inválido/expirado/já usado — mesmo erro que hoje), a tela cai para o comportamento atual: mostra o form com o campo de token preenchido e a mensagem de erro, permitindo tentar colar um código novo ou pedir reenvio. **Não** há loop de retry automático.
- Se não houver `token` na URL (usuário chegou em `/activate` por outro caminho, ex.: da tela de registro), o comportamento é o de hoje: mostra o form vazio, sem nenhum auto-submit.

### Estados da tela

| Situação | Comportamento |
|---|---|
| `/activate` sem `token` na URL | Form manual (comportamento atual, inalterado) |
| `/activate?token=X` — ativação automática em andamento | Estado de carregamento, sem form visível |
| `/activate?token=X` — ativação automática **sucesso** | `signIn` + toast de sucesso + redirect para `/` (igual ao fluxo manual atual) |
| `/activate?token=X` — ativação automática **falhou** | Form reaparece com token preenchido, `tokenError` visível, usuário pode corrigir/reenviar (igual ao fluxo manual atual) |

### Fora de escopo

- Nenhuma mudança em `activateRequest`/`resendActivationRequest` (`src/services/api.ts:60-88`) — contrato de API inalterado.
- Nenhuma mudança visual no form de fallback além do necessário para acomodar o estado de carregamento inicial.
- Deep linking nativo do app Android é tratado em spec própria no repositório do app (fora deste repositório).

## Arquivos Modificados

```
src/routes/Activate.tsx
```

## Testes

Se este repositório tiver testes de componente para rotas (verificar convenção atual antes de implementar):
1. `Activate` com `?token=X` na URL chama `activateRequest(X)` automaticamente ao montar, sem interação do usuário.
2. `Activate` sem `token` na URL não chama `activateRequest` automaticamente.
3. Ativação automática bem-sucedida chama `signIn` e navega para `/`.
4. Ativação automática que falha exibe `tokenError` e mantém o form editável (com token preenchido) para nova tentativa.

## Critérios de Aceitação

- Abrir o link do email (`/activate?token=...&email=...`) ativa a conta e loga o usuário sem exigir nenhum clique adicional na SPA.
- Acessar `/activate` sem token continua funcionando exatamente como hoje (form manual).
- Nenhuma mudança de contrato com o backend.
