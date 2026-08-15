import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  interactive?: boolean
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-sm transition-shadow ${
        interactive ? 'hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
