import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`rounded-xl bg-white p-3 shadow-sm ${className}`}>{children}</div>
}
