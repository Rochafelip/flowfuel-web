# Esqueci minha senha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o fluxo de "esqueci minha senha" ao frontend (duas telas + link de entrada no Login), consumindo os endpoints `/auth/forgot-password` e `/auth/reset-password` que já existem no backend.

**Architecture:** Duas novas rotas públicas (`/forgot-password`, `/reset-password`) seguindo exatamente o padrão visual/estrutural de `Login.tsx` e `Activate.tsx` (mesmos componentes `Screen`, `TextField`, `PasswordField`, `Button`, mesmo padrão de reenvio com cooldown). Duas novas funções em `services/api.ts` seguindo o padrão de `activateRequest`/`resendActivationRequest`.

**Tech Stack:** React + TypeScript + react-router-dom, Tailwind classes existentes, sem framework de testes configurado no projeto (não há vitest/jest instalado) — verificação por `npm run build` (roda `tsc -b && vite build`) e por deploy, conforme preferência já estabelecida do usuário (commit+push para verificar, não testes locais/browser automation).

---

## Referência: spec

`docs/superpowers/specs/2026-08-31-forgot-password-design.md`

## File Structure

- Modify: `src/services/api.ts` — adiciona `forgotPasswordRequest` e `resetPasswordRequest`.
- Create: `src/routes/ForgotPassword.tsx` — tela de solicitação (pede email).
- Create: `src/routes/ResetPassword.tsx` — tela de redefinição (token + nova senha + confirmação, com reenvio).
- Modify: `src/App.tsx` — registra as duas novas rotas públicas.
- Modify: `src/routes/Login.tsx` — adiciona link "Esqueci minha senha".

---

### Task 1: Funções de API

**Files:**
- Modify: `src/services/api.ts:78` (logo após `activateRequest`, antes do fechamento da função — inserir como novo bloco após a função `activateRequest` terminar)

- [ ] **Step 1: Adicionar `forgotPasswordRequest` e `resetPasswordRequest`**

Abra `src/services/api.ts`, localize o fim da função `activateRequest` (que termina com `return response.json()` seguido de `}`), e adicione logo depois:

```ts
export async function forgotPasswordRequest(email: string) {
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Erro ao solicitar redefinição de senha'))
  }

  return response.json()
}

export async function resetPasswordRequest(token: string, newPassword: string) {
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Código inválido ou expirado'))
  }
}
```

Note: `resetPasswordRequest` não faz `return response.json()` porque o endpoint retorna `204 No Content` (sem corpo).

- [ ] **Step 2: Verificar tipos**

Run: `npm run build`
Expected: build passa sem erros de tipo relacionados a `api.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add forgot/reset password API requests"
```

---

### Task 2: Tela `ForgotPassword`

**Files:**
- Create: `src/routes/ForgotPassword.tsx`

- [ ] **Step 1: Criar a tela**

```tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPasswordRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await forgotPasswordRequest(email.trim())
      showToast('Se houver uma conta associada a este email, enviaremos um código de redefinição.', 'success')
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao solicitar redefinição de senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Screen centered>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg"
      >
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Esqueci minha senha
        </h1>

        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Informe seu email. Se houver uma conta associada, enviaremos um código para redefinir sua senha.
        </p>

        <div className="mb-4">
          <TextField
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />
        </div>

        <Button type="submit" className="mb-4" disabled={!email.trim() || isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar código'}
        </Button>

        <Link to="/login" className="block text-center text-sm text-green-700 dark:text-green-400">
          Lembrei minha senha, entrar
        </Link>
      </form>
    </Screen>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run build`
Expected: build passa sem erros de tipo relacionados a `ForgotPassword.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ForgotPassword.tsx
git commit -m "feat: add forgot-password screen"
```

---

### Task 3: Tela `ResetPassword`

**Files:**
- Create: `src/routes/ResetPassword.tsx`

- [ ] **Step 1: Criar a tela**

```tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { forgotPasswordRequest, resetPasswordRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { PasswordField } from '../components/ui/PasswordField'
import { Button } from '../components/ui/Button'

const RESEND_COOLDOWN_SECONDS = 30
const MIN_PASSWORD_LENGTH = 6

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS)
    const interval = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          clearInterval(interval)
          return 0
        }
        return current - 1
      })
    }, 1000)
  }

  async function handleResend() {
    if (isResending || cooldown > 0 || !email) return
    setIsResending(true)
    try {
      await forgotPasswordRequest(email)
      showToast('Código reenviado. Confira seu email.', 'success')
      startCooldown()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao reenviar o código.')
    } finally {
      setIsResending(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isSubmitting) return

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('As senhas não coincidem.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    try {
      await resetPasswordRequest(token.trim(), newPassword)
      showToast('Senha redefinida com sucesso! Faça login com sua nova senha.', 'success')
      navigate('/login')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Código inválido ou expirado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = token.trim() && newPassword && confirmPassword && !isSubmitting

  return (
    <Screen centered>
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Redefinir senha
        </h1>

        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Cole o código que enviamos
          {email ? (
            <>
              {' '}para <span className="font-bold text-gray-900 dark:text-gray-100">{email}</span>
            </>
          ) : (
            ' para o seu email'
          )}{' '}
          e escolha uma nova senha.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField
            placeholder="Código de redefinição"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              setFormError(null)
            }}
          />

          <PasswordField
            placeholder="Nova senha"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value)
              setFormError(null)
            }}
          />

          <PasswordField
            placeholder="Confirmar nova senha"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              setFormError(null)
            }}
          />

          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

          <Button type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Redefinindo...' : 'Redefinir senha'}
          </Button>
        </form>

        {email && (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
            className="mt-4 block w-full text-center text-sm font-bold text-green-700 dark:text-green-400 disabled:opacity-60"
          >
            {isResending
              ? 'Reenviando...'
              : cooldown > 0
                ? `Reenviar código (${cooldown}s)`
                : 'Reenviar código'}
          </button>
        )}

        <Link to="/login" className="mt-3 block text-center text-sm text-green-700 dark:text-green-400">
          Lembrei minha senha, entrar
        </Link>
      </div>
    </Screen>
  )
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npm run build`
Expected: build passa sem erros de tipo relacionados a `ResetPassword.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/routes/ResetPassword.tsx
git commit -m "feat: add reset-password screen"
```

---

### Task 4: Registrar rotas

**Files:**
- Modify: `src/App.tsx:14` (imports) e `src/App.tsx:41` (rotas)

- [ ] **Step 1: Adicionar imports**

Em `src/App.tsx`, logo após a linha `import { Activate } from './routes/Activate'` (linha 14), adicionar:

```tsx
import { ForgotPassword } from './routes/ForgotPassword'
import { ResetPassword } from './routes/ResetPassword'
```

- [ ] **Step 2: Adicionar rotas**

Logo após a linha `<Route path="/activate" element={<Activate />} />` (linha 41), adicionar:

```tsx
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: register forgot/reset password routes"
```

---

### Task 5: Link "Esqueci minha senha" no Login

**Files:**
- Modify: `src/routes/Login.tsx`

- [ ] **Step 1: Adicionar import de `Link`**

`Login.tsx` já importa `Link` de `react-router-dom` (linha 2: `import { useNavigate, Link } from 'react-router-dom'`) — nenhuma mudança de import necessária.

- [ ] **Step 2: Adicionar o link abaixo do `PasswordField`**

Em `src/routes/Login.tsx`, troque:

```tsx
          <PasswordField
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
```

por:

```tsx
          <PasswordField
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Link to="/forgot-password" className="text-right text-sm text-green-700 dark:text-green-400">
            Esqueci minha senha
          </Link>
        </div>
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/routes/Login.tsx
git commit -m "feat: add forgot-password link to login screen"
```

---

### Task 6: Verificação final e deploy

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build passa sem erros.

- [ ] **Step 2: Push para verificar em deploy**

```bash
git push
```

Conforme preferência já registrada, a verificação funcional (telas, navegação, mensagens) é feita no ambiente de deploy, não com servidor local/browser automation.
