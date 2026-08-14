import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerRequest } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { PasswordField } from '../components/ui/PasswordField'
import { Button } from '../components/ui/Button'

export function Register() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleRegister(e: FormEvent) {
    e.preventDefault()

    if (!name || !email || !password || !confirmPassword) {
      showToast('Por favor, preencha todos os campos')
      return
    }

    if (password !== confirmPassword) {
      showToast('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      await registerRequest(name, email, password)

      navigate(`/activate?email=${encodeURIComponent(email)}`)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao criar conta. Tente novamente.')
      console.error(error)
    }
  }

  return (
    <Screen centered>
      <form
        onSubmit={handleRegister}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg"
      >
        <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">
          Criar Conta
        </h1>

        <div className="mb-4 flex flex-col gap-4">
          <TextField
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

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

          <PasswordField
            placeholder="Confirmar Senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button type="submit" className="mb-4">
          Criar Conta
        </Button>

        <Link to="/login" className="block text-center text-sm text-green-700">
          Já tem conta? Entrar
        </Link>
      </form>
    </Screen>
  )
}
