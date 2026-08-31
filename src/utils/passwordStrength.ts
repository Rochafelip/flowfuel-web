export const MIN_PASSWORD_LENGTH = 6

export type PasswordStrength = 'weak' | 'medium' | 'strong'

export function meetsMinLength(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0

  if (password.length >= MIN_PASSWORD_LENGTH) score++
  if (password.length >= 10) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}
