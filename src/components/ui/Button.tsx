import type { ButtonHTMLAttributes } from 'react'

export function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`h-12 w-full rounded-lg bg-blue-600 text-base font-bold text-white transition-colors hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:active:bg-blue-600 ${className}`}
      {...props}
    />
  )
}
