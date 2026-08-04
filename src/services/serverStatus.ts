import { useSyncExternalStore } from 'react'

type Listener = () => void

let isUnreachable = false
let dismissed = false
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

export function reportNetworkError() {
  if (isUnreachable) return
  isUnreachable = true
  dismissed = false
  notify()
}

export function reportNetworkSuccess() {
  if (!isUnreachable) return
  isUnreachable = false
  notify()
}

export function dismissServerStatus() {
  if (dismissed) return
  dismissed = true
  notify()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return isUnreachable && !dismissed
}

export function useServerStatus() {
  const visible = useSyncExternalStore(subscribe, getSnapshot)
  return { visible, dismiss: dismissServerStatus }
}
