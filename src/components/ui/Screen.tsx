import type { ReactNode } from 'react'

const safeAreaPadding = {
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
  const horizontalPadding = 'px-5 lg:px-8'

  if (centered) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center bg-green-50 ${horizontalPadding} ${className}`}
        style={safeAreaPadding}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-green-50 ${horizontalPadding} ${className}`} style={safeAreaPadding}>
      <div className={`mx-auto ${wide ? 'max-w-3xl' : 'max-w-md'}`}>{children}</div>
    </div>
  )
}
