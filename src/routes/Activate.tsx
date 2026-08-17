import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { activateRequest, resendActivationRequest } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

const RESEND_COOLDOWN_SECONDS = 30

export function Activate() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const { showToast } = useToast()

  const [token, setToken] = useState(searchParams.get('token') ?? '')
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
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
    if (isResending || cooldown > 0) return
    setIsResending(true)
    try {
      await resendActivationRequest(email)
      showToast('Código reenviado. Confira seu email.', 'success')
      startCooldown()
    } catch (error) {
      console.log(error)
      showToast(error instanceof Error ? error.message : 'Erro ao reenviar o código.')
    } finally {
      setIsResending(false)
    }
  }

  async function handleActivate(e: FormEvent) {
    e.preventDefault()
    if (!token.trim() || isActivating) return

    setIsActivating(true)
    setTokenError(null)
    try {
      const data = await activateRequest(email, token.trim())
      await signIn(data.accessToken)
      showToast('Conta ativada com sucesso!', 'success')
      navigate('/')
    } catch (error) {
      setTokenError(
        error instanceof Error ? error.message : 'Código de ativação inválido ou expirado'
      )
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <Screen centered>
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Verifique seu email
        </h1>

        <p className="mb-1 text-center text-sm text-gray-600 dark:text-gray-400">
          Enviamos um código de ativação para{' '}
          {email ? <span className="font-bold text-gray-900 dark:text-gray-100">{email}</span> : 'o seu email'}.
        </p>

        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Cole o código abaixo para ativar sua conta. Não esqueça de checar a pasta de spam.
        </p>

        <form onSubmit={handleActivate} className="flex flex-col gap-3">
          <TextField
            placeholder="Código de ativação"
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              setTokenError(null)
            }}
          />
          {tokenError && <p className="text-sm text-red-600 dark:text-red-400">{tokenError}</p>}

          <Button type="submit" disabled={!token.trim() || isActivating}>
            {isActivating ? 'Ativando...' : 'Ativar conta'}
          </Button>
        </form>

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

        <Link to="/login" className="mt-3 block text-center text-sm text-green-700 dark:text-green-400">
          Já ativei, entrar
        </Link>
      </div>
    </Screen>
  )
}
