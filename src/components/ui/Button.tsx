import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-danger'
type ButtonSize = 'md' | 'sm'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:active:bg-green-600 focus-visible:outline-green-600',
  secondary:
    'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 disabled:active:bg-gray-200 focus-visible:outline-green-600',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:active:bg-red-600 focus-visible:outline-red-600',
  ghost:
    'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700 focus-visible:outline-green-600',
  'ghost-danger':
    'border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/40 focus-visible:outline-red-600',
}

const sizeClasses: Record<ButtonSize, string> = {
  md: 'h-11 text-base',
  sm: 'h-9 text-sm',
}

export const ghostButtonClasses =
  'inline-flex h-9 w-auto items-center justify-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm font-bold text-gray-700 dark:text-gray-300 transition-colors hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-60'

export const ghostDangerButtonClasses =
  'inline-flex h-9 w-auto items-center justify-center gap-1 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 px-3 text-sm font-bold text-red-600 dark:text-red-400 transition-colors hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 active:bg-red-100 dark:active:bg-red-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-60'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
  size?: ButtonSize
}

export function Button({
  className = '',
  variant = 'primary',
  fullWidth = true,
  size = 'md',
  ...props
}: ButtonProps) {
  const widthClasses = fullWidth
    ? 'w-full'
    : `inline-flex w-auto items-center justify-center ${size === 'sm' ? 'px-3' : 'px-6'}`

  return (
    <button
      className={`rounded-lg font-bold transition-colors disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${sizeClasses[size]} ${widthClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
