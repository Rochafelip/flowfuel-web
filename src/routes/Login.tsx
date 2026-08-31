import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { PasswordField } from '../components/ui/PasswordField'
import { Button } from '../components/ui/Button'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  async function handleLogin(e: FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      showToast('Por favor, preencha email e senha')
      return
    }

    try {
      const data = await loginRequest(email, password)
      await signIn(data.accessToken)
      navigate('/')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Email ou senha inválidos')
    }
  }

  return (
    <Screen centered>
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-800 p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900 dark:text-gray-100">
          Entrar
        </h1>

        <div className="mb-2 flex flex-col gap-4">
          <TextField
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />

          <PasswordField
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Link to="/forgot-password" className="mb-4 block text-right text-sm text-green-700 dark:text-green-400">
          Esqueci minha senha
        </Link>

        <Button type="submit" className="mb-4">
          Entrar
        </Button>

        <Link to="/register" className="block text-center text-sm text-green-700 dark:text-green-400">
          Não tem conta? Criar conta
        </Link>
      </form>
    </Screen>
  )
}
