import { getPasswordStrength, meetsMinLength, MIN_PASSWORD_LENGTH } from '../../utils/passwordStrength'

interface PasswordStrengthHintProps {
  password: string
  visible: boolean
}

const STRENGTH_LABEL: Record<ReturnType<typeof getPasswordStrength>, string> = {
  weak: 'Fraca',
  medium: 'Média',
  strong: 'Forte',
}

const STRENGTH_COLOR: Record<ReturnType<typeof getPasswordStrength>, string> = {
  weak: 'bg-red-500',
  medium: 'bg-yellow-500',
  strong: 'bg-green-500',
}

const STRENGTH_SEGMENTS: Record<ReturnType<typeof getPasswordStrength>, number> = {
  weak: 1,
  medium: 2,
  strong: 3,
}

export function PasswordStrengthHint({ password, visible }: PasswordStrengthHintProps) {
  if (!visible) return null

  const strength = getPasswordStrength(password)
  const activeSegments = password.length > 0 ? STRENGTH_SEGMENTS[strength] : 0

  return (
    <div className="mt-1 flex flex-col gap-1.5 text-sm">
      <div className="flex gap-1">
        {[0, 1, 2].map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              segment < activeSegments ? STRENGTH_COLOR[strength] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {password.length > 0 && (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          Força da senha: {STRENGTH_LABEL[strength]}
        </span>
      )}

      <span
        className={
          meetsMinLength(password)
            ? 'text-xs text-green-600 dark:text-green-400'
            : 'text-xs text-gray-600 dark:text-gray-400'
        }
      >
        {meetsMinLength(password) ? '✓' : '○'} Mínimo {MIN_PASSWORD_LENGTH} caracteres
      </span>
    </div>
  )
}
