import { Link } from 'react-router-dom'
import { NavLinks } from './NavLinks'

export function Sidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-gray-200 dark:lg:border-gray-700 lg:bg-white dark:lg:bg-gray-800 lg:p-4">
      <Link
        to="/"
        className="mb-6 rounded-lg px-3 py-1 text-lg font-bold text-green-700 dark:text-green-400 transition-colors hover:bg-green-50 dark:hover:bg-gray-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
      >
        ⛽ FlowFuel
      </Link>
      <NavLinks />
    </aside>
  )
}
