import { apiFetch } from './httpClient'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export function clearSession() {
  localStorage.removeItem('@token')
  localStorage.removeItem('@app_token')
  localStorage.removeItem('@active_vehicle')
}

interface ApiErrorBody {
  message: string
  code?: string
}

async function parseApiErrorBody(response: Response, fallback: string): Promise<ApiErrorBody> {
  try {
    const body = await response.json()
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      const fieldMessages = body.errors
        .map((e: { message?: string }) => e.message)
        .filter(Boolean)
      if (fieldMessages.length > 0) return { message: fieldMessages.join(' '), code: body?.code }
    }
    return { message: body?.detail || fallback, code: body?.code }
  } catch {
    return { message: fallback }
  }
}

export async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  return (await parseApiErrorBody(response, fallback)).message
}

export class AccountNotActivatedError extends Error {}

export async function loginRequest(email: string, password: string) {
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const { message, code } = await parseApiErrorBody(response, 'Email ou senha inválidos')
    if (code === 'ACCOUNT_NOT_ACTIVATED') {
      throw new AccountNotActivatedError(message)
    }
    throw new Error(message)
  }

  return response.json()
}

export async function registerRequest(
  name: string,
  email: string,
  password: string
) {
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Erro ao criar conta'))
  }

  return response.json()
}

export async function resendActivationRequest(email: string) {
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/resend-activation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Erro ao reenviar o código de ativação'))
  }

  return response.json()
}

export async function activateRequest(email: string, token: string) {
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, token }),
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Código de ativação inválido ou expirado'))
  }

  return response.json()
}

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

export async function authenticatedRequest(
  endpoint: string,
  options?: Partial<RequestInit>
) {
  const token = localStorage.getItem('@token')

  const response = await apiFetch(`${BASE_URL}/api/v1${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...options,
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Erro na requisição'))
  }

  return response.json()
}

export async function uploadVehiclePhoto(vehicleId: number, file: File) {
  const token = localStorage.getItem('@token')
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiFetch(`${BASE_URL}/api/v1/vehicles/${vehicleId}/photo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Erro ao enviar foto do veículo'))
  }

  return response.json()
}

export async function fetchAuthenticatedBlob(path: string): Promise<Blob> {
  const token = localStorage.getItem('@token')

  const response = await apiFetch(`${BASE_URL}/api/v1${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Erro ao carregar imagem'))
  }

  return response.blob()
}
