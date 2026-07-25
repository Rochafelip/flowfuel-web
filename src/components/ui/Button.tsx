import type { ButtonHTMLAttributes } from 'react'

export function Button({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`h-12 w-full rounded-lg bg-green-600 text-base font-bold text-white transition-colors hover:bg-green-700 active:bg-green-800 disabled:opacity-60 disabled:active:bg-green-600 ${className}`}
      {...props}
    />
  )
}
