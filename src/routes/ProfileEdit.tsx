import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { decodeUserIdFromToken } from '../lib/jwt'
import { getProfileRequest, updateProfileRequest } from '../services/profile'
import { Screen } from '../components/ui/Screen'
import { TextField } from '../components/ui/TextField'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

export function ProfileEdit() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const userId = token ? decodeUserIdFromToken(token) : null

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [nameError, setNameError] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    getProfileRequest(userId)
      .then((profile) => {
        setName(profile.name ?? '')
        setPhone(profile.phone ?? '')
      })
      .catch((err) => {
        console.log(err)
        showToast('Não foi possível carregar seu perfil')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!userId || submitting) return

    if (!name.trim()) {
      setNameError(true)
      return
    }

    setSubmitting(true)
    try {
      await updateProfileRequest(userId, { name: name.trim(), phone: phone.trim() })
      showToast('Perfil atualizado com sucesso.', 'success')
      navigate('/profile')
    } catch (err) {
      console.log(err)
      showToast('Não foi possível salvar as alterações')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Screen centered>
        <Spinner />
      </Screen>
    )
  }

  return (
    <Screen>
      <h1 className="mb-5 text-center text-2xl font-bold text-gray-900">Editar Perfil</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          placeholder="Nome"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setNameError(false)
          }}
        />
        {nameError && <p className="text-sm text-red-600">Informe seu nome.</p>}

        <TextField
          placeholder="Telefone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Button type="submit" disabled={submitting} className="lg:w-auto lg:self-end lg:px-10">
          {submitting ? 'Salvando...' : 'Salvar'}
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
