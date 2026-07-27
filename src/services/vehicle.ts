import { authenticatedRequest, clearSession } from './api'
import type { PageResponse } from '../types/Page'
import type { Vehicle, VehicleShare } from '../types/Vehicle'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export function listVehicles(): Promise<PageResponse<Vehicle>> {
  return authenticatedRequest('/vehicles?size=50')
}

export function getVehicle(id: number): Promise<Vehicle> {
  return authenticatedRequest(`/vehicles/${id}`)
}

export function updateVehicle(id: number, payload: Record<string, unknown>): Promise<Vehicle> {
  return authenticatedRequest(`/vehicles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

// PUT /vehicles/{id}/active responds 200 with an empty body (confirmed via
// production curl) — authenticatedRequest always calls response.json(),
// which throws SyntaxError on an empty body, so this does its own fetch.
export async function activateVehicle(id: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/vehicles/${id}/active`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Não foi possível ativar o veículo')
  }
}

// DELETE /vehicles/{id} is declared `void` on the backend — same empty-body
// shape as activateVehicle above, same reason for a raw fetch here.
export async function deleteVehicle(id: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/vehicles/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Não foi possível excluir o veículo')
  }
}

export async function getVehicleShare(vehicleId: number): Promise<VehicleShare | null> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/vehicle-shares/vehicle/${vehicleId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (response.status === 204) {
    return null
  }

  if (!response.ok) {
    throw new Error('Não foi possível carregar o compartilhamento do veículo')
  }

  return response.json()
}

export async function revokeVehicleShare(id: number): Promise<void> {
  const token = localStorage.getItem('@token')
  const response = await fetch(`${BASE_URL}/api/v1/vehicle-shares/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    clearSession()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    throw new Error('Não foi possível revogar o compartilhamento')
  }
}

export function listSharedVehicles(): Promise<VehicleShare[]> {
  return authenticatedRequest('/vehicle-shares/active-for-me')
}

export function shareVehicle(
  vehicleId: number,
  inviteeEmail: string,
  durationDays: number
): Promise<VehicleShare> {
  return authenticatedRequest('/vehicle-shares', {
    method: 'POST',
    body: JSON.stringify({ vehicleId, inviteeEmail, durationDays }),
  })
}

export function listPendingShares(): Promise<VehicleShare[]> {
  return authenticatedRequest('/vehicle-shares/pending')
}

export function acceptVehicleShare(id: number): Promise<VehicleShare> {
  return authenticatedRequest(`/vehicle-shares/${id}/accept`, { method: 'POST' })
}

export function rejectVehicleShare(id: number): Promise<VehicleShare> {
  return authenticatedRequest(`/vehicle-shares/${id}/reject`, { method: 'POST' })
}
