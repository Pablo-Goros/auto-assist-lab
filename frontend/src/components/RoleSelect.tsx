import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

interface RoleSelectOption<T extends string> {
  value: T
  label: string
}

interface RoleSelectProps<T extends string> {
  value: T
  options: RoleSelectOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  disabled?: boolean
}

const MENU_GAP = 4

export function RoleSelect<T extends string>({ value, options, onChange, ariaLabel, disabled = false }: RoleSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLUListElement>(null)
  const listboxId = useId()
  const selected = options.find((option) => option.value === value)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return

    function updatePlacement() {
      const trigger = triggerRef.current
      const menu = menuRef.current
      if (!trigger) return

      const triggerRect = trigger.getBoundingClientRect()
      const menuHeight = menu?.offsetHeight ?? options.length * 34 + 8
      const spaceBelow = window.innerHeight - triggerRect.bottom - MENU_GAP
      const spaceAbove = triggerRect.top - MENU_GAP
      setDropUp(spaceBelow < menuHeight && spaceAbove > spaceBelow)
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open, options.length])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function choose(nextValue: T) {
    setOpen(false)
    if (nextValue !== value) onChange(nextValue)
  }

  return (
    <div ref={rootRef} className={['role-select', open ? 'role-select--open' : '', dropUp ? 'role-select--drop-up' : ''].filter(Boolean).join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="role-select__trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? value}</span>
        <svg className="role-select__chevron" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5.5 7.5 10 12l4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
        </svg>
      </button>
      {open && (
        <ul ref={menuRef} className="role-select__menu" id={listboxId} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={['role-select__option', option.value === value ? 'role-select__option--selected' : ''].filter(Boolean).join(' ')}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
