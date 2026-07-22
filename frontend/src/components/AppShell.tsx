import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import { userRoleLabels } from '../api/metadata'
import type { User } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { dashboardPathForRole } from '../auth/roleRouting'
import { Brand } from './Brand'
import { HomeIcon, LogOutIcon, PlusIcon } from './Icons'

interface AppShellProps {
  children: ReactNode
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function AppShell({ children }: AppShellProps) {
  const { user, token, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const profileRef = useRef<HTMLDivElement>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profile, setProfile] = useState<User | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileOpen) return
    function dismiss(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false)
    }
    function dismissWithKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') setProfileOpen(false)
    }
    document.addEventListener('mousedown', dismiss)
    document.addEventListener('keydown', dismissWithKeyboard)
    return () => {
      document.removeEventListener('mousedown', dismiss)
      document.removeEventListener('keydown', dismissWithKeyboard)
    }
  }, [profileOpen])

  if (!user) return null

  const dashboardPath = dashboardPathForRole(user.role)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function toggleProfile() {
    const opening = !profileOpen
    setProfileOpen(opening)
    if (!opening || !token) return
    setProfileLoading(true)
    setProfileError(null)
    try {
      setProfile(await api.getMe(token))
    } catch (caught) {
      setProfileError(caught instanceof Error ? caught.message : 'Could not load your profile.')
    } finally {
      setProfileLoading(false)
    }
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
        </nav>
        <div className="sidebar__account" ref={profileRef}>
          {profileOpen && (
            <section className="profile-popover" aria-label="Your profile">
              {profileLoading ? (
                <div className="profile-popover__status"><span className="spinner spinner--profile" />Loading profile…</div>
              ) : profileError ? (
                <div className="profile-popover__status profile-popover__status--error">{profileError}</div>
              ) : (
                <>
                  <div className="profile-popover__header">
                    <span className="avatar avatar--large">{initials((profile ?? user).name)}</span>
                    <div><strong>{(profile ?? user).name}</strong><span>{userRoleLabels[(profile ?? user).role]}</span></div>
                  </div>
                  <dl className="profile-popover__details">
                    <div><dt>Email</dt><dd>{(profile ?? user).email}</dd></div>
                    <div><dt>Account ID</dt><dd>#{(profile ?? user).id}</dd></div>
                  </dl>
                </>
              )}
            </section>
          )}
          <button className="profile-chip profile-chip--button" type="button" onClick={() => void toggleProfile()} aria-expanded={profileOpen} aria-label="Open profile">
            <span className="avatar">{initials(user.name)}</span>
            <span className="profile-chip__details"><strong>{user.name}</strong><small>{userRoleLabels[user.role]}</small></span>
          </button>
          <button className="sidebar__logout" type="button" onClick={() => void handleSignOut()} aria-label="Sign out">
            <LogOutIcon /><span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="app-shell__body">
        <main className="app-content">{children}</main>
      </div>
      {user.role === 'OWNER' && location.pathname !== '/requests/new' && (
        <Link className="new-request-fab" to="/requests/new" aria-label="New request"><PlusIcon /><span>New request</span></Link>
      )}
    </div>
  )
}
