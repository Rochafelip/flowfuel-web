import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotPasswordRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const { showToast } = useToast()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await forgotPasswordRequest(email.trim())
      showToast('Se houver uma conta associada a este email, enviaremos um código de redefinição.', 'success')
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao solicitar redefinição de senha.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Screen centered>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg"
      >
        <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Esqueci minha senha
        </h1>

        <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Informe seu email. Se houver uma conta associada, enviaremos um código para redefinir sua senha.
        </p>

        <div className="mb-4">
          <TextField
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />
        </div>

        <Button type="submit" className="mb-4" disabled={!email.trim() || isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar código'}
        </Button>

        <Link to="/login" className="block text-center text-sm text-green-700 dark:text-green-400">
          Lembrei minha senha, entrar
        </Link>
      </form>
    </Screen>
  )
}
