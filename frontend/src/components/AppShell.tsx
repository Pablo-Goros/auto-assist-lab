import { NavLink, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { Brand } from './Brand'
import { HomeIcon, LogOutIcon, PlusIcon, SearchIcon } from './Icons'

interface AppShellProps {
  children: ReactNode
  search: string
  onSearch(search: string): void
  searchPlaceholder: string
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function AppShell({ children, search, onSearch, searchPlaceholder }: AppShellProps) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const dashboardPath = user.role === 'OWNER' ? '/requests' : '/operator'

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <nav className="sidebar__nav" aria-label="Main navigation">
          <NavLink to={dashboardPath} end className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
            <HomeIcon />
            <span>Dashboard</span>
          </NavLink>
          {user.role === 'OWNER' && (
            <NavLink to="/requests/new" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              <PlusIcon />
              <span>New request</span>
            </NavLink>
          )}
        </nav>
        <button className="sidebar__logout" type="button" onClick={() => void handleSignOut()}>
          <LogOutIcon />
          <span>Sign out</span>
        </button>
      </aside>

      <div className="app-shell__body">
        <header className="topbar">
          <label className="global-search">
            <SearchIcon />
            <span className="sr-only">Search requests</span>
            <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder={searchPlaceholder} />
          </label>
          <div className="profile-chip">
            <span className="avatar">{initials(user.name)}</span>
            <span className="profile-chip__details">
              <strong>{user.name}</strong>
              <small>{user.role === 'OWNER' ? 'Vehicle owner' : 'Operator'}</small>
            </span>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  )
}
