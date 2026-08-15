import type { InputHTMLAttributes } from 'react'

export function TextField({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 ${className}`}
      {...props}
    />
  )
}
