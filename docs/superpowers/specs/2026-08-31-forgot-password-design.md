# Esqueci minha senha — Design

## Contexto

O backend (`flowfuel`) já expõe os endpoints de redefinição de senha, sem
nenhuma tela no frontend consumindo-os:

- `POST /auth/forgot-password` `{email}` — sempre retorna uma mensagem
  genérica de sucesso (anti-enumeração de emails), dispara a geração de um
  token de reset. Hoje o token só é registrado em log
  (`LoggingPasswordResetNotifier`) — não há envio de email real ainda, mesmo
  estágio em que está o fluxo de ativação de conta.
- `POST /auth/reset-password` `{token, newPassword}` — `204 No Content`. Não
  retorna tokens de sessão (diferente do `/auth/activate`, que já loga o
  usuário automaticamente).

O frontend já tem um padrão estabelecido para "colar um código recebido por
email" na tela `Activate.tsx` (`src/routes/Activate.tsx`), incluindo reenvio
de código com cooldown de 30s. Este design segue o mesmo padrão visual e de
interação.

## Fluxo

Duas telas novas, no mesmo estilo visual de `Login.tsx`/`Activate.tsx`
(`Screen centered`, card branco/`gray-800`, `TextField`/`PasswordField`/
`Button` de `components/ui`):

1. **`/forgot-password`** — formulário com um campo de email.
   - Ao submeter, chama `forgotPasswordRequest(email)`.
   - Sempre mostra a mesma mensagem de sucesso (o backend já garante isso;
     o frontend não precisa tratar "email não encontrado" como erro
     diferente).
   - Em caso de sucesso, navega para `/reset-password?email=<email>` — o
     email só é usado para exibir contexto na tela seguinte e para o
     reenvio de código; não é enviado ao `reset-password`.
   - Link "Lembrei minha senha, entrar" voltando para `/login`.

2. **`/reset-password`** — formulário com:
   - Campo para colar o código/token recebido por email.
   - Campo de nova senha (`PasswordField`).
   - Campo de confirmação de nova senha (`PasswordField`).
   - Validação client-side antes de enviar: nova senha com no mínimo 6
     caracteres (mesma regra de `ResetPasswordRequest` no backend) e
     confirmação idêntica à nova senha. Erros de validação aparecem inline,
     sem chamar a API.
   - Ao submeter com sucesso, chama `resetPasswordRequest(token, newPassword)`.
     Como o endpoint não retorna tokens de sessão, ao concluir mostra um
     toast de sucesso e redireciona para `/login` (o usuário loga
     manualmente com a nova senha).
   - Botão "Reenviar código", reaproveitando a mesma lógica de cooldown de
     30s de `Activate.tsx`, chamando `forgotPasswordRequest(email)`
     novamente com o email da query string.
   - Se a tela for acessada sem `email` na query string, o campo de contexto
     some (mesmo comportamento que `Activate.tsx` já tem: `email` pode ser
     vazio).

3. **`Login.tsx`** — adiciona um link "Esqueci minha senha" logo abaixo do
   `PasswordField`, apontando para `/forgot-password`.

## API (`src/services/api.ts`)

Duas novas funções, seguindo o padrão existente de `activateRequest`/
`resendActivationRequest` (erro extraído via `extractErrorMessage`):

```ts
export async function forgotPasswordRequest(email: string) {
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Erro ao solicitar redefinição de senha.'))
  }
  return response.json()
}

export async function resetPasswordRequest(token: string, newPassword: string) {
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  })
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Código inválido ou expirado.'))
  }
}
```

Nota: os demais endpoints de auth em `api.ts` usam o prefixo `/api/v1/auth/...`
no frontend (ex.: `resendActivationRequest` chama
`${BASE_URL}/api/v1/auth/resend-activation`) enquanto o `UserController` no
backend está mapeado em `/auth/...`. Presume-se que exista um prefixo
`/api/v1` configurado no backend (ex. `context-path` ou gateway) — seguir o
mesmo padrão dos endpoints existentes de auth no frontend.

## Rotas (`App.tsx`)

Adicionar, junto das rotas públicas existentes:

```tsx
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password" element={<ResetPassword />} />
```

## Fora de escopo

- Envio de email real (o backend ainda não implementa; token continua vindo
  por log, fora do controle do frontend).
- Auto-login após redefinir a senha (o backend não retorna tokens em
  `/reset-password`).
- Alterações no backend.
