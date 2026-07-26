const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export function clearSession() {
  localStorage.removeItem('@token')
  localStorage.removeItem('@app_token')
  localStorage.removeItem('@active_vehicle')
}

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
  const token = localStorage.getItem('@token')

  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
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
    throw new Error('Erro na requisição')
  }

  return response.json()
}
