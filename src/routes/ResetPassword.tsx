import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { forgotPasswordRequest, resetPasswordRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { PasswordField } from '../components/ui/PasswordField'
import { Button } from '../components/ui/Button'

const RESEND_COOLDOWN_SECONDS = 30
const MIN_PASSWORD_LENGTH = 6

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const { showToast } = useToast()

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
      showToast('Email reenviado. Confira sua caixa de entrada.', 'success')
      startCooldown()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao reenviar o email.')
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
      await resetPasswordRequest(token, newPassword)
      showToast('Senha redefinida com sucesso! Faça login com sua nova senha.', 'success')
      navigate('/login')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Link inválido ou expirado.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = newPassword && confirmPassword && !isSubmitting

  if (!token) {
    return (
      <Screen centered>
        <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
            Verifique seu email
          </h1>

          <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Enviamos um link para{' '}
            {email ? <span className="font-bold text-gray-900 dark:text-gray-100">{email}</span> : 'o seu email'}.
            Abra-o para escolher uma nova senha.
          </p>

          {email && (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || cooldown > 0}
              className="block w-full text-center text-sm font-bold text-green-700 dark:text-green-400 disabled:opacity-60"
            >
              {isResending
                ? 'Reenviando...'
                : cooldown > 0
                  ? `Reenviar email (${cooldown}s)`
                  : 'Reenviar email'}
            </button>
          )}

          <Link to="/login" className="mt-3 block text-center text-sm text-green-700 dark:text-green-400">
            Lembrei minha senha, entrar
          </Link>
        </div>
      </Screen>
    )
  }

  return (
    <Screen centered>
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Redefinir senha
        </h1>

        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Escolha uma nova senha para sua conta.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

        <Link to="/login" className="mt-3 block text-center text-sm text-green-700 dark:text-green-400">
          Lembrei minha senha, entrar
        </Link>
      </div>
    </Screen>
  )
}
