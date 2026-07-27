import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { decodeUserIdFromToken } from '../lib/jwt'
import { changePasswordRequest } from '../services/profile'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'

export function ChangePassword() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const userId = token ? decodeUserIdFromToken(token) : null

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!userId || submitting) return

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Preencha todos os campos')
      return
    }
    if (newPassword.length < 6) {
      showToast('A nova senha deve ter no mínimo 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem')
      return
    }

    setSubmitting(true)
    setCurrentPasswordError(null)
    try {
      await changePasswordRequest(userId, currentPassword, newPassword)
      showToast('Senha alterada com sucesso.', 'success')
      navigate('/profile')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível trocar a senha'
      setCurrentPasswordError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Screen>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Trocar Senha</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <TextField
            placeholder="Senha atual"
            type="password"
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value)
              setCurrentPasswordError(null)
            }}
          />
          {currentPasswordError && (
            <p className="mt-1 text-sm text-red-600">{currentPasswordError}</p>
          )}
        </div>

        <TextField
          placeholder="Nova senha"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <TextField
          placeholder="Confirmar nova senha"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Trocar senha'}
        </Button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="block w-full text-center text-sm text-green-700"
        >
          Cancelar
        </button>
      </form>
    </Screen>
  )
}
