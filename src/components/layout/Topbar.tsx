import { VehicleSwitcherLink } from './VehicleSwitcherLink'

export function Topbar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 lg:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Abrir menu"
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 lg:hidden"
      >
        ☰
      </button>
      <div className="ml-auto">
        <VehicleSwitcherLink />
      </div>
    </header>
  )
}
