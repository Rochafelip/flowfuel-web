import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:active:bg-green-600',
  secondary:
    'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400 disabled:active:bg-gray-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:active:bg-red-600',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
}

export function Button({
  className = '',
  variant = 'primary',
  fullWidth = true,
  ...props
}: ButtonProps) {
  const widthClasses = fullWidth ? 'w-full' : 'inline-flex w-auto items-center justify-center px-6'

  return (
    <button
      className={`h-11 rounded-lg text-base font-bold transition-colors disabled:opacity-60 ${widthClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
