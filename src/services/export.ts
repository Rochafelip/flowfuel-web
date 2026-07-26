const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://flowfuel-api.fly.dev'

export async function downloadExport(endpoint: string, fallbackFileName: string) {
  const token = localStorage.getItem('@token')

  const response = await fetch(`${BASE_URL}/api/v1${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Erro ao exportar')
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/)
  const fileName = match?.[1] ?? fallbackFileName

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
