import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ConfirmRequest {
  message: string
  resolve: (value: boolean) => void
}

interface ConfirmContextData {
  request: ConfirmRequest | null
  confirm: (message: string) => Promise<boolean>
  resolveRequest: (value: boolean) => void
}

const ConfirmContext = createContext<ConfirmContextData>({} as ConfirmContextData)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setRequest({ message, resolve })
    })
  }, [])

  const resolveRequest = useCallback(
    (value: boolean) => {
      request?.resolve(value)
      setRequest(null)
    },
    [request]
  )

  return (
    <ConfirmContext.Provider value={{ request, confirm, resolveRequest }}>
      {children}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const { confirm } = useContext(ConfirmContext)
  return confirm
}

export function useConfirmRequest() {
  const { request, resolveRequest } = useContext(ConfirmContext)
  return { request, resolveRequest }
}
