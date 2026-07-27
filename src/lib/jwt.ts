export function decodeUserIdFromToken(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(normalized))
    const value = claims.userId

    if (typeof value === 'number') return value
    if (typeof value === 'string') return Number(value) || null
    return null
  } catch {
    return null
  }
}
