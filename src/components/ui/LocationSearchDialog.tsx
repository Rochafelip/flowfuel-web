import { useState, type FormEvent } from 'react'
import { geocodeLocation } from '../../services/stations'
import type { GeocodeResult } from '../../types/Station'
import { Button } from './Button'
import { Spinner } from './Spinner'

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; results: GeocodeResult[] }
  | { status: 'empty' }
  | { status: 'error' }

const MIN_QUERY_LENGTH = 3

export function LocationSearchDialog({
  onSelect,
  onDismiss,
}: {
  onSelect: (result: GeocodeResult) => void
  onDismiss: () => void
}) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>({ status: 'idle' })

  async function runSearch(rawQuery: string) {
    const trimmed = rawQuery.trim()
    if (trimmed.length < MIN_QUERY_LENGTH) return

    setState({ status: 'loading' })
    try {
      const results = await geocodeLocation(trimmed)
      setState(results.length === 0 ? { status: 'empty' } : { status: 'success', results })
    } catch (err) {
      console.log(err)
      setState({ status: 'error' })
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    runSearch(query)
  }

  const canSearch = query.trim().length >= MIN_QUERY_LENGTH

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onDismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar localidade"
        className="relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl bg-white p-6 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-gray-900">Buscar localidade</p>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-700 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-3 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Boa Viagem, Recife"
            className="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Button type="submit" fullWidth={false} disabled={!canSearch}>
            Buscar
          </Button>
        </form>

        {state.status === 'loading' && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-gray-600">Não foi possível buscar essa localidade.</p>
            <Button fullWidth={false} onClick={() => runSearch(query)}>
              Tentar novamente
            </Button>
          </div>
        )}

        {state.status === 'empty' && (
          <p className="py-8 text-center text-sm text-gray-600">
            Nenhum lugar encontrado. Tente um nome diferente ou mais específico.
          </p>
        )}

        {state.status === 'success' && (
          <ul className="flex flex-col gap-2 overflow-y-auto">
            {state.results.map((result, index) => (
              <li key={`${result.displayName}-${index}`}>
                <button
                  type="button"
                  onClick={() => onSelect(result)}
                  className="flex w-full items-center gap-2 rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  <span className="text-gray-500">📍</span>
                  <span className="truncate text-sm font-bold text-gray-900">
                    {result.displayName}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
