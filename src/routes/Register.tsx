import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerRequest } from '../services/api'

export function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleRegister(e: FormEvent) {
    e.preventDefault()

    if (!name || !email || !password || !confirmPassword) {
      alert('Por favor, preencha todos os campos')
      return
    }

    if (password !== confirmPassword) {
      alert('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      await registerRequest(name, email, password)

      alert('Conta criada! Verifique seu email para ativar antes de entrar.')
      navigate('/login')
    } catch (error) {
      alert('Erro ao criar conta. Tente novamente.')
      console.error(error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-5">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
          Criar Conta
        </h1>

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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

        <input
          className="mb-4 h-12 w-full rounded-lg border border-gray-300 px-3 text-base"
          placeholder="Confirmar Senha"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          className="mb-4 h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white hover:bg-blue-700"
        >
          Criar Conta
        </button>

        <Link to="/login" className="block text-center text-sm text-blue-600">
          Já tem conta? Entrar
        </Link>
      </form>
    </div>
  )
}
