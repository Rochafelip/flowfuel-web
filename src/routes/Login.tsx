import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
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
    } catch {
      showToast('Email ou senha inválidos')
    }
  }

  return (
    <Screen centered>
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
          Entrar
        </h1>

        <div className="mb-4 flex flex-col gap-4">
          <TextField
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
          />

          <TextField
            placeholder="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="mb-4">
          Entrar
        </Button>

        <Link to="/register" className="block text-center text-sm text-green-700">
          Não tem conta? Criar conta
        </Link>
      </form>
    </Screen>
  )
}
