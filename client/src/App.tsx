import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Urls from './pages/Urls'
import Analytics from './pages/Analytics'
import { LayoutDashboard, Link2, BarChart3, LogOut } from 'lucide-react'

function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <AppLayout />
}

function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/urls', icon: Link2, label: 'Links' },
  ]

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon"><Link2 size={18} /></div>
          <h1>LinkForge</h1>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${location.pathname.startsWith(item.to) ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-email">{user?.email}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={logout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/urls" element={<Urls />} />
            <Route path="/analytics/:id" element={<Analytics />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
