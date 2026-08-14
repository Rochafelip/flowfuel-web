export function DataField({
  label,
  value,
  mono = true,
  accent = false,
  size = 'md',
}: {
  label: string
  value: string
  mono?: boolean
  accent?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`font-bold ${mono ? 'font-mono' : ''} ${size === 'lg' ? 'text-lg' : ''} ${
          accent ? 'text-green-700' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
