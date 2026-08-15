import { Button } from './Button'
import { Card } from './Card'

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <Card className="text-center">
      <p className="mb-2 text-4xl">{icon}</p>
      <p className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">{title}</p>
      <p className={actionLabel && onAction ? 'mb-4 text-sm text-gray-600 dark:text-gray-400' : 'text-sm text-gray-600 dark:text-gray-400'}>
        {description}
      </p>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </Card>
  )
}
