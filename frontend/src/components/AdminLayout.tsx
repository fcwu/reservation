import { NavLink, Outlet } from 'react-router-dom'
import { api } from '../api'

const NAV = [
  { to: '/admin', label: '預約管理', end: true },
  { to: '/admin/services', label: '服務項目' },
  { to: '/admin/slots', label: '時段設定' },
]

export default function AdminLayout() {
  const handleLogout = async () => {
    await api.logout()
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <nav className="flex gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700 transition"
        >
          登出
        </button>
      </header>
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
