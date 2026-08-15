import { useAuthenticatedImage } from '../../hooks/useAuthenticatedImage'

type VehiclePhotoSize = 'sm' | 'md' | 'lg'
type VehiclePhotoRounded = 'lg' | 'full'

const sizeClasses: Record<VehiclePhotoSize, string> = {
  sm: 'h-6 w-6 text-sm',
  md: 'h-8 w-8 text-base',
  lg: 'h-12 w-12 text-xl',
}

const roundedClasses: Record<VehiclePhotoRounded, string> = {
  lg: 'rounded-lg',
  full: 'rounded-full',
}

export function VehiclePhoto({
  path,
  size = 'md',
  rounded = 'lg',
  className = '',
}: {
  path: string | null
  size?: VehiclePhotoSize
  rounded?: VehiclePhotoRounded
  className?: string
}) {
  const photoUrl = useAuthenticatedImage(path)

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ${sizeClasses[size]} ${roundedClasses[rounded]} ${className}`}
    >
      {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full object-cover" /> : '🚗'}
    </div>
  )
}
