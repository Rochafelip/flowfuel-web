import { NavLinks } from './NavLinks'

export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:p-4">
      <p className="mb-6 px-3 text-lg font-bold text-green-700">⛽ FlowFuel</p>
      <NavLinks />
    </aside>
  )
}
