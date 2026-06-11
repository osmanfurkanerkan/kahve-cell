import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  if (!user) {
    return null
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const links =
    user.role === 'shop_owner'
      ? [{ to: '/owner/orders', label: 'Siparisler' }]
      : [
          { to: '/home', label: 'Ana Sayfa' },
          { to: '/subscription', label: 'Abonelik' },
          { to: '/history', label: 'Gecmis' },
        ]

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <NavLink to={user.role === 'shop_owner' ? '/owner/orders' : '/home'} className="brand">
          KahveCell
        </NavLink>

        <nav className="topbar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="topbar__user">
          <span className="topbar__phone">{user.phone}</span>
          <button type="button" className="button button--ghost" onClick={handleLogout}>
            Cikis
          </button>
        </div>
      </div>
    </header>
  )
}
