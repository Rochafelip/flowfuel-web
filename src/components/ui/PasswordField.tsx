import { useState, type InputHTMLAttributes } from 'react'
import { TextField } from './TextField'

export function PasswordField({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <TextField
        {...props}
        type={visible ? 'text' : 'password'}
        className={`pr-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        tabIndex={-1}
        className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-lg text-gray-500 hover:text-gray-700"
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}
