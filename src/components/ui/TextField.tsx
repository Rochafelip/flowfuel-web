import type { InputHTMLAttributes } from 'react'

export function TextField({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${className}`}
      {...props}
    />
  )
}
