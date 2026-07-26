import type { ReactNode } from 'react'

const safeAreaPadding = {
  paddingLeft: 'max(1.25rem, env(safe-area-inset-left))',
  paddingRight: 'max(1.25rem, env(safe-area-inset-right))',
  paddingTop: '1.25rem',
  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
}

export function Screen({
  children,
  centered = false,
  wide = false,
  className = '',
}: {
  children: ReactNode
  centered?: boolean
  wide?: boolean
  className?: string
}) {
  if (centered) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-green-50 ${className}`}
        style={safeAreaPadding}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-green-50 ${className}`} style={safeAreaPadding}>
      <div className={`mx-auto ${wide ? 'max-w-3xl' : 'max-w-md'}`}>{children}</div>
    </div>
  )
}
