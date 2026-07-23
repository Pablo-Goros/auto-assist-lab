import type { ReactNode, SelectHTMLAttributes } from 'react'

export interface FormSelectOption {
  value: string
  label: ReactNode
  disabled?: boolean
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: FormSelectOption[]
  onValueChange?: (value: string) => void
}

export function FormSelect({
  options = [],
  onValueChange,
  className,
  onChange,
  children,
  ...props
}: FormSelectProps) {
  return (
    <select
      className={['form-select', className].filter(Boolean).join(' ')}
      onChange={(event) => {
        onChange?.(event)
        onValueChange?.(event.target.value)
      }}
      {...props}
    >
      {children}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
