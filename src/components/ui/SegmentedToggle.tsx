export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex rounded-lg border border-gray-300 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-md py-2 text-sm font-bold transition-colors ${
            value === option.value
              ? 'bg-green-600 text-white'
              : 'text-gray-600'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
