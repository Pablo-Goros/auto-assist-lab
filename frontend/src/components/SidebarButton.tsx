import { NavLink } from 'react-router-dom'
import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface SidebarButtonContentProps {
  icon: ReactNode
  label: ReactNode
  subtitle?: ReactNode
}

function SidebarButtonContent({ icon, label, subtitle }: SidebarButtonContentProps) {
  return (
    <>
      <span className="sidebar-button__icon" aria-hidden="true">{icon}</span>
      <span className="sidebar-button__text">
        <span className="sidebar-button__label">{label}</span>
        {subtitle !== undefined && <small className="sidebar-button__subtitle">{subtitle}</small>}
      </span>
    </>
  )
}

function sidebarButtonClassName({
  active,
  expanded,
  variant = 'default',
}: {
  active?: boolean
  expanded?: boolean
  variant?: 'default' | 'danger'
}) {
  return [
    'sidebar-button',
    active ? 'sidebar-button--active' : '',
    expanded ? 'sidebar-button--expanded' : '',
    variant === 'danger' ? 'sidebar-button--danger' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

interface SidebarNavButtonProps extends SidebarButtonContentProps {
  to: string
  end?: boolean
}

export function SidebarNavButton({ to, end, icon, label, subtitle }: SidebarNavButtonProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => sidebarButtonClassName({ active: isActive })}
    >
      <SidebarButtonContent icon={icon} label={label} subtitle={subtitle} />
    </NavLink>
  )
}

interface SidebarActionButtonProps extends SidebarButtonContentProps, ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  expanded?: boolean
  variant?: 'default' | 'danger'
}

export function SidebarActionButton({
  icon,
  label,
  subtitle,
  active,
  expanded,
  variant = 'default',
  className,
  type = 'button',
  ...props
}: SidebarActionButtonProps) {
  return (
    <button
      type={type}
      className={[sidebarButtonClassName({ active, expanded, variant }), className].filter(Boolean).join(' ')}
      {...props}
    >
      <SidebarButtonContent icon={icon} label={label} subtitle={subtitle} />
    </button>
  )
}
