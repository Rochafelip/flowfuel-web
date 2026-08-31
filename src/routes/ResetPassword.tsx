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

  const [token, setToken] = useState(searchParams.get('token') ?? '')
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
