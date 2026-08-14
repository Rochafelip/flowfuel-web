import { Link } from 'react-router-dom'
import { NavLinks } from './NavLinks'

export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white lg:p-4">
      <Link
        to="/"
        className="mb-6 rounded-lg px-3 py-1 text-lg font-bold text-green-700 transition-colors hover:bg-green-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
      >
        ⛽ FlowFuel
      </Link>
      <NavLinks />
    </aside>
  )
}
