import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage'

type UserAvatarSize = 'sm' | 'md'

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: 'h-5 w-5 text-xs',
  md: 'h-6 w-6 text-sm',
}

export function UserAvatar({
  path,
  name,
  size = 'md',
  className = '',
}: {
  path: string | null
  name: string
  size?: UserAvatarSize
  className?: string
}) {
  const photoUrl = useAuthenticatedImage(path)

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700 font-bold text-gray-500 dark:text-gray-400 ${sizeClasses[size]} ${className}`}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  )
}
