import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import { userRoleLabels } from '../api/metadata'
import type { User } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { dashboardPathForRole } from '../auth/roleRouting'
import { Brand } from './Brand'
import { HomeIcon, LogOutIcon, PlusIcon, UserIcon } from './Icons'
import { SidebarActionButton, SidebarNavButton } from './SidebarButton'

interface AppShellProps {
  children: ReactNode
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
          <SidebarNavButton to={dashboardPath} end icon={<HomeIcon />} label="Dashboard" />
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
                    <div><strong>{(profile ?? user).name}</strong><span>{userRoleLabels[(profile ?? user).role]}</span></div>
                  </div>
                  <dl className="profile-popover__details">
                    <div><dt>Email</dt><dd>{(profile ?? user).email}</dd></div>
                    <div><dt>Country</dt><dd>{(profile ?? user).tenant?.name ?? 'Global administrator'}</dd></div>
                    <div><dt>Account ID</dt><dd>#{(profile ?? user).id}</dd></div>
                  </dl>
                </>
              )}
            </section>
          )}
          <SidebarActionButton
            icon={<UserIcon />}
            label={user.name}
            subtitle={userRoleLabels[user.role]}
            expanded={profileOpen}
            onClick={() => void toggleProfile()}
            aria-expanded={profileOpen}
            aria-label="Open profile"
          />
          <SidebarActionButton
            icon={<LogOutIcon />}
            label="Sign out"
            variant="danger"
            onClick={() => void handleSignOut()}
            aria-label="Sign out"
          />
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
