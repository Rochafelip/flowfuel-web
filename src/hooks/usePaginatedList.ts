import { useCallback, useEffect, useState } from 'react'
import { authenticatedRequest } from '../services/api'
import type { PageResponse } from '../types/Page'

export function usePaginatedList<T>(endpoint: string | null) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const loadPage = useCallback(
    async (pageToLoad: number) => {
      if (!endpoint) return

      try {
        setLoading(true)
        setError(false)
        const separator = endpoint.includes('?') ? '&' : '?'
        const response: PageResponse<T> = await authenticatedRequest(
          `${endpoint}${separator}page=${pageToLoad}&size=20`
        )
        setItems((prev) =>
          pageToLoad === 0 ? response.content : [...prev, ...response.content]
        )
        setPage(response.page)
        setTotalPages(response.totalPages)
      } catch (err) {
        console.log(err)
        setError(true)
      } finally {
        setLoading(false)
      }
    },
    [endpoint]
  )

  useEffect(() => {
    setItems([])
    setPage(0)
    setTotalPages(0)
    loadPage(0)
  }, [endpoint])

  function loadMore() {
    loadPage(page + 1)
  }

  function reload() {
    loadPage(0)
  }

  return {
    items,
    loading,
    error,
    hasMore: page + 1 < totalPages,
    loadMore,
    reload,
  }
}
