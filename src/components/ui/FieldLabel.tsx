import type { LabelHTMLAttributes, ReactNode } from 'react'

interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode
  required?: boolean
}

export function FieldLabel({ children, required = false, className = '', ...props }: FieldLabelProps) {
  return (
    <label
      className={`mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-600 dark:text-red-400"> *</span>}
    </label>
  )
}
