import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginRequest } from '../services/api'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleLogin(e: FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      alert('Por favor, preencha email e senha')
      return
    }

    try {
      const data = await loginRequest(email, password)
      await signIn(data.token)
      navigate('/')
    } catch {
      alert('Email ou senha inválidos')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
          Entrar
        </h1>

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoCapitalize="none"
        />

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700"
        >
          Entrar
        </button>

        <Link to="/register" className="block text-center text-sm text-blue-600">
          Não tem conta? Criar conta
        </Link>
      </form>
    </div>
  )
}
