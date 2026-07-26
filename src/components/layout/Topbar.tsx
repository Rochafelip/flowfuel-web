import { VehicleSwitcherLink } from './VehicleSwitcherLink'

export function Topbar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Abrir menu"
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 hover:bg-green-50 lg:hidden"
      >
        ☰
      </button>
      <div className="ml-auto">
        <VehicleSwitcherLink />
      </div>
    </header>
  )
}
