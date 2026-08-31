import { authenticatedRequest, extractErrorMessage, parseApiError } from './api'
import { apiFetch } from './httpClient'
import type { PageResponse } from '../types/Page'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export interface UserProfile {
  id: number
  email: string
  name: string | null
  phone: string | null
  profilePicture: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface ProfileStats {
  vehiclesCount: number
  refuelsCount: number
  eventsCount: number
}

export function getProfileRequest(userId: number): Promise<UserProfile> {
  return authenticatedRequest(`/auth/${userId}/profile`)
}

export function updateProfileRequest(
  userId: number,
  data: { name: string; phone: string }
): Promise<UserProfile> {
  return authenticatedRequest(`/auth/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function getProfileStats(): Promise<ProfileStats> {
  const vehiclesPage: PageResponse<{ id: number }> = await authenticatedRequest(
    '/vehicles?size=100'
  )
  const vehicles = vehiclesPage.content

  const [refuelCounts, eventCounts] = await Promise.all([
    Promise.all(
      vehicles.map((v) =>
        authenticatedRequest(`/refuels/vehicle/${v.id}?page=0&size=1`).then(
          (page: PageResponse<unknown>) => page.totalElements
        )
      )
    ),
    Promise.all(
      vehicles.map((v) =>
        authenticatedRequest(`/vehicle-events/vehicle/${v.id}?page=0&size=1`).then(
          (page: PageResponse<unknown>) => page.totalElements
        )
      )
    ),
  ])

  return {
    vehiclesCount: vehicles.length,
    refuelsCount: refuelCounts.reduce((sum, n) => sum + n, 0),
    eventsCount: eventCounts.reduce((sum, n) => sum + n, 0),
  }
}

export async function changePasswordRequest(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/${userId}/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })

  if (!response.ok) {
    throw await parseApiError(response, 'Não foi possível trocar a senha')
  }
}

export async function uploadProfilePictureRequest(
  userId: number,
  file: File
): Promise<{ internalUrl: string }> {
  const token = localStorage.getItem('@token')
  const formData = new FormData()
  formData.append('file', file)

  const response = await apiFetch(`${BASE_URL}/api/v1/auth/${userId}/upload-profile-picture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Não foi possível enviar a foto'))
  }

  return response.json()
}

export async function deleteProfilePictureRequest(userId: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/${userId}/profile-picture`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Não foi possível remover a foto'))
  }
}

export async function deleteAccountRequest(userId: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await apiFetch(`${BASE_URL}/api/v1/auth/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, 'Não foi possível excluir a conta'))
  }
}
