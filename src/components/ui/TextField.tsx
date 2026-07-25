import type { InputHTMLAttributes } from 'react'

export function TextField({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-12 w-full rounded-lg border border-gray-300 px-3 text-base ${className}`}
      {...props}
    />
  )
}
