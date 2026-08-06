# Account Activation Deep Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** tapping the account-activation link from the email opens the Expo app directly (via the `flowfuelfrontend://` custom scheme), activates the account through the real backend, and signs the user in automatically — no manual login step after registration.

**Architecture:** the backend (`flowfuel`, separate repo) already returns a JWT pair from `POST /auth/activate`; only its `ACCOUNT_ACTIVATION_LINK_BASE_URL` secret needs to change. On the frontend (`flowfuel-frontend`), fix three pre-existing bugs that block any real auth flow (wrong API base URL/paths, mismatched `AsyncStorage` key, wrong token field name), then add a new `app/activate.tsx` route that `expo-router` resolves automatically from the custom-scheme link, calls the activation endpoint, and signs the user in via the existing `AuthContext`.

**Tech Stack:** Expo (React Native, TypeScript), `expo-router` (file-based routing + deep linking), `@react-native-async-storage/async-storage`. No test runner is configured in this project (no Jest/Testing Library in `package.json`) — verification is TypeScript type-checking (`node node_modules/typescript/bin/tsc --noEmit`, confirmed working: `npx tsc` itself fails with a permission error in this environment, but invoking via `node` works) plus manual on-device testing per the spec's test plan.

**Reference spec:** `docs/superpowers/specs/2026-06-24-activation-deep-link-design.md`

**Working directory for all steps below:** `/home/rocha/Projetos/flowfuel-frontend` (a separate git repo from the backend `flowfuel`).

---

## File Structure

```
Create: app/activate.tsx
Modify: services/api.ts
Modify: context/AuthContext.tsx
Modify: app/(auth)/register.tsx
Modify: app/(auth)/login.tsx
```

Plus one backend-only configuration change (no code): the Fly secret `ACCOUNT_ACTIVATION_LINK_BASE_URL` on the `flowfuel` app.

---

### Task 1: Fix `context/AuthContext.tsx` — single source of truth for the storage key

**Files:**
- Modify: `context/AuthContext.tsx`

**Current content (for reference — read the file yourself first to confirm it still matches before editing):**

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface AuthContextData {
  token: string | null
  loading: boolean
  signIn: (token: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: any) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadToken()
  }, [])

  async function loadToken() {
    const storedToken = await AsyncStorage.getItem('@app_token')
    setToken(storedToken)
    setLoading(false)
  }

  async function signIn(newToken: string) {
    await AsyncStorage.setItem('@app_token', newToken)
    setToken(newToken)
  }

  async function signOut() {
    await AsyncStorage.removeItem('@app_token')
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

- [ ] **Step 1: Export a shared storage key constant and use it consistently**

Replace the file's contents with:

```tsx
import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const AUTH_TOKEN_STORAGE_KEY = '@app_token'

interface AuthContextData {
  token: string | null
  loading: boolean
  signIn: (token: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: any) {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadToken()
  }, [])

  async function loadToken() {
    const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
    setToken(storedToken)
    setLoading(false)
  }

  async function signIn(newToken: string) {
    await AsyncStorage.setItem(AUTH_TOKEN_STORAGE_KEY, newToken)
    setToken(newToken)
  }

  async function signOut() {
    await AsyncStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

(This keeps the key's *value* the same as today — `'@app_token'` — so existing logged-in sessions on test devices aren't invalidated by this step. The bug is that `services/api.ts` reads from a *different* key; that's fixed in Task 2 by importing this constant instead of hardcoding `'@token'`.)

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && node node_modules/typescript/bin/tsc --noEmit`
Expected: no output (clean exit, no type errors).

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add context/AuthContext.tsx
git commit -m "fix: export shared AsyncStorage key constant from AuthContext"
```

---

### Task 2: Fix `services/api.ts` — real API base URL, `/api/v1` prefix, storage key bug, and new `activateRequest`

**Files:**
- Modify: `services/api.ts`

**Current content (for reference — read the file yourself first to confirm it still matches before editing):**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'

const BASE_URL = 'http://192.168.1.2:8080'

export async function loginRequest(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Email ou senha inválidos')
  }

  return response.json()
}

export async function registerRequest(
  name: string,
  email: string,
  password: string
) {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  })

  if (!response.ok) {
    // try to extract server error message
    try {
      const err = await response.json()
      throw new Error(err.message || 'Erro ao criar conta')
    } catch {
      throw new Error('Erro ao criar conta')
    }
  }

  return response.json()
}

export async function authenticatedRequest(
  endpoint: string,
  options?: Partial<RequestInit>
) {
  const token = await AsyncStorage.getItem('@token')

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...options,
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Erro na requisição')
  }

  return response.json()
}
```

- [ ] **Step 1: Replace the file's contents**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AUTH_TOKEN_STORAGE_KEY } from '../context/AuthContext'

const BASE_URL = 'https://flowfuel-api.fly.dev'

export async function loginRequest(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Email ou senha inválidos')
  }

  return response.json()
}

export async function registerRequest(
  name: string,
  email: string,
  password: string
) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  })

  if (!response.ok) {
    // try to extract server error message
    try {
      const err = await response.json()
      throw new Error(err.message || 'Erro ao criar conta')
    } catch {
      throw new Error('Erro ao criar conta')
    }
  }

  return response.json()
}

export async function activateRequest(token: string) {
  const response = await fetch(`${BASE_URL}/api/v1/auth/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    try {
      const err = await response.json()
      throw new Error(err.detail || 'Link de ativação inválido ou expirado')
    } catch {
      throw new Error('Link de ativação inválido ou expirado')
    }
  }

  return response.json()
}

export async function authenticatedRequest(
  endpoint: string,
  options?: Partial<RequestInit>
) {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_STORAGE_KEY)

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...options,
  })

  if (response.status === 401) {
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Erro na requisição')
  }

  return response.json()
}
```

Notes on this change:
- `loginRequest`/`registerRequest` paths gain the `/api/v1` prefix; `authenticatedRequest` does **not** change its path handling — callers (`VehicleContext.tsx`, `select-vehicle.tsx`) still pass paths like `/api/vehicles/active` without the prefix. That's a pre-existing issue in the vehicles feature, out of scope for this plan (the design spec only covers the auth/activation paths).
- `activateRequest`'s error branch reads `err.detail` because the backend's error responses follow RFC 7807 (`application/problem+json`), where the human-readable message is in the `detail` field (confirmed against the backend's `GlobalExceptionHandler` — e.g. `{"detail":"Token de ativação inválido ou expirado", ...}`).

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && node node_modules/typescript/bin/tsc --noEmit`
Expected: no output (clean exit, no type errors).

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add services/api.ts
git commit -m "fix: point api.ts at real backend (/api/v1 paths), add activateRequest"
```

---

### Task 3: Fix `app/(auth)/login.tsx` — use `accessToken` field from the real response

**Files:**
- Modify: `app/(auth)/login.tsx`

- [ ] **Step 1: Read the current file**

Run: `cat "/home/rocha/Projetos/flowfuel-frontend/app/(auth)/login.tsx"` and confirm line 28 currently reads:

```tsx
      const data = await loginRequest(email, password);
      await signIn(data.token);
```

- [ ] **Step 2: Fix the field name**

Change:

```tsx
      const data = await loginRequest(email, password);
      await signIn(data.token);
```

to:

```tsx
      const data = await loginRequest(email, password);
      await signIn(data.accessToken);
```

(The backend's `TokenPairResponse` has fields `accessToken`, `refreshToken`, `expiresIn` — there is no `token` field. This plan only wires up `accessToken`; `refreshToken` is intentionally not persisted yet, per the design spec's scope decision to defer automatic session renewal.)

- [ ] **Step 3: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && node node_modules/typescript/bin/tsc --noEmit`
Expected: no output (clean exit, no type errors).

- [ ] **Step 4: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add "app/(auth)/login.tsx"
git commit -m "fix: login uses accessToken field from real backend response"
```

---

### Task 4: Rework `app/(auth)/register.tsx` — remove auto-login, show "check your email"

**Files:**
- Modify: `app/(auth)/register.tsx`

**Current content (for reference — read the file yourself first to confirm it still matches before editing):**

```tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { registerRequest, loginRequest } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { signIn } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Por favor, preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      await registerRequest(name, email, password);

      const data = await loginRequest(email, password);
      await signIn(data.token);
      // RootLayout detectará o token e redirecionará automaticamente

    } catch (error) {
      alert("Erro ao criar conta. Tente novamente.");
      console.error(error);
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Criar Conta</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome"
          placeholderTextColor="#6c757d"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6c757d"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#6c757d"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar Senha"
          placeholderTextColor="#6c757d"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Criar Conta</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.link}>Já tem conta? Entrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#212529',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    color: '#0d6efd',
    fontSize: 14,
  },
})
```

- [ ] **Step 1: Replace the file's contents**

```tsx
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { registerRequest } from "../../services/api";

export default function Register() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Por favor, preencha todos os campos");
      return;
    }

    if (password !== confirmPassword) {
      alert("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      alert("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    try {
      await registerRequest(name, email, password);
      setRegisteredEmail(email);
    } catch (error) {
      alert("Erro ao criar conta. Tente novamente.");
      console.error(error);
    }
  };

  if (registeredEmail) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Verifique seu email</Text>
          <Text style={styles.message}>
            Conta criada! Enviamos um link de ativação para{' '}
            <Text style={styles.messageEmail}>{registeredEmail}</Text>.
            Toque no link para ativar sua conta e entrar automaticamente.
          </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.link}>Voltar para o login</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Criar Conta</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome"
          placeholderTextColor="#6c757d"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6c757d"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#6c757d"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar Senha"
          placeholderTextColor="#6c757d"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Criar Conta</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.link}>Já tem conta? Entrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#212529',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    marginBottom: 20,
    textAlign: 'center',
  },
  messageEmail: {
    fontWeight: 'bold',
    color: '#212529',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  button: {
    height: 50,
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    color: '#0d6efd',
    fontSize: 14,
  },
})
```

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && node node_modules/typescript/bin/tsc --noEmit`
Expected: no output (clean exit, no type errors).

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add "app/(auth)/register.tsx"
git commit -m "feat: show check-your-email screen instead of auto-login after register"
```

---

### Task 5: Create `app/activate.tsx` — the deep-link activation screen

**Files:**
- Create: `app/activate.tsx`

This is a top-level route (same level as `app/select-vehicle.tsx` and `app/modal.tsx`), so `expo-router` maps it to the path `/activate` automatically, and the app's registered scheme (`flowfuelfrontend`, from `app.json`) makes `flowfuelfrontend://activate?token=XYZ` open this screen directly.

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { activateRequest } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Activate() {
  const { token } = useLocalSearchParams<{ token?: string }>()
  const router = useRouter()
  const { signIn } = useAuth()

  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setErrorMessage('Link de ativação inválido: nenhum token encontrado.')
      return
    }

    activateRequest(token)
      .then((data) => signIn(data.accessToken))
      .catch((error: Error) => setErrorMessage(error.message))
  }, [token])

  if (errorMessage) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Não foi possível ativar sua conta</Text>
          <Text style={styles.message}>{errorMessage}</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
            <Text style={styles.buttonText}>Ir para o login</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.loadingText}>Ativando sua conta...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#212529',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#444',
  },
  button: {
    height: 50,
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
```

Note on success: there is no explicit "success" UI state. Once `signIn(data.accessToken)` resolves, `AuthContext`'s `token` state changes, which `app/_layout.tsx`'s existing `useEffect` (lines 13-23) already reacts to — it redirects to `/select-vehicle` or `/(tabs)` automatically. The activation screen simply stops being shown once that redirect happens; no manual navigation call is needed here.

- [ ] **Step 2: Type-check**

Run: `cd /home/rocha/Projetos/flowfuel-frontend && node node_modules/typescript/bin/tsc --noEmit`
Expected: no output (clean exit, no type errors).

- [ ] **Step 3: Commit**

```bash
cd /home/rocha/Projetos/flowfuel-frontend
git add app/activate.tsx
git commit -m "feat: add activation screen for the account-activation deep link"
```

---

### Task 6: Point the backend's activation email at the app's deep link

**Files:** none (configuration only, on the `flowfuel` backend repo's deployed Fly app — not a file in this repo).

- [ ] **Step 1: Update the Fly secret**

Run (from anywhere, `flyctl` is already authenticated per earlier work in this project):

```bash
flyctl secrets set ACCOUNT_ACTIVATION_LINK_BASE_URL="flowfuelfrontend://activate" -a flowfuel-api
```

Expected output: a rolling deploy of the `flowfuel-api` machine, ending in `update succeeded` (same pattern as when the `MAIL_*` secrets were set earlier in this project).

- [ ] **Step 2: Verify the secret took effect**

Run: `flyctl secrets list -a flowfuel-api`
Expected: `ACCOUNT_ACTIVATION_LINK_BASE_URL` appears in the list with an updated `DIGEST` value (different from before this step).

No commit for this task — it's a deployed secret, not a file in either repo.

---

### Task 7: Manual end-to-end verification on the real device

**Files:** none — this is a manual verification pass, no code changes.

- [ ] **Step 1: Rebuild and reinstall the app**

Since `app/activate.tsx` is a new route and `services/api.ts`/`context/AuthContext.tsx` changed, rebuild the standalone/dev build that's installed on the test device (the exact EAS build command depends on the existing project setup — run whichever `eas build` profile was used to produce the currently-installed build, then reinstall it on the device). Confirm with the user which build command/profile to use if not obvious from `eas.json` (check `cat eas.json` first); do not guess a build profile name without checking.

- [ ] **Step 2: Register a brand-new test account in the app**

Use a real, checkable email address. Confirm the app shows the "Verifique seu email" screen (from Task 4) instead of logging in automatically.

- [ ] **Step 3: Open the activation email on the same device and tap the link**

Confirm:
- The app opens directly (not a browser) — this validates whether the custom-scheme link is tappable from the email client being used, per the known risk noted in the design spec.
- The app briefly shows "Ativando sua conta..." then redirects automatically to `/select-vehicle` or `/(tabs)`, without ever showing a login screen.

- [ ] **Step 4: Test the reuse case**

Tap the same activation link a second time (e.g., re-open the email and tap again, or revisit the link via the device's browser/notification history). Confirm the app shows the "Não foi possível ativar sua conta" error screen (from Task 5) with a working "Ir para o login" button, since the activation token is single-use on the backend.

- [ ] **Step 5: Confirm normal login still works**

Log out (if there's a logout action in the app; otherwise clear the app's storage/reinstall), then log in with an existing **already-active** account's email/password. Confirm login succeeds and lands on the expected screen (validates Task 3's `data.accessToken` fix).

- [ ] **Step 6: Record the outcome**

Report back (to whoever reviews this plan) whether Step 3's tap-to-open worked on the actual email client used, since this directly confirms or refutes the "Gmail may not linkify custom schemes" risk called out in the design spec. If it didn't work, that's a finding to revisit once a verified domain is available for Universal/App Links — not a blocker to merging this plan's code changes, since the code is correct regardless of whether this particular email client cooperates.

---

## Self-Review Notes (for the implementer)

- `services/api.ts`'s `activateRequest` reads `err.detail`, not `err.message`, because the backend returns RFC 7807 problem responses — this differs from `registerRequest`'s existing `err.message` pattern (which itself may be inconsistent with the backend's actual error shape, but that's a pre-existing pattern this plan doesn't change, per scope).
- `authenticatedRequest`'s endpoint paths (used by `VehicleContext.tsx`, `select-vehicle.tsx`) are deliberately **not** touched — they still lack the `/api/v1` prefix. That's a separate, pre-existing gap outside this plan's scope (vehicles feature, not activation).
- No refresh-token persistence or auto-renewal in this plan — only `accessToken` is wired up, per the design spec's explicit scope decision.
- There is no test runner in this project; "tests" in this plan are TypeScript type-checking plus the manual on-device pass in Task 7.
