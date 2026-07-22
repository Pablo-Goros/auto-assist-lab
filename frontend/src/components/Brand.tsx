import logoUrl from '../assets/autoassist-logo.png'

interface BrandProps {
  inverted?: boolean
  compact?: boolean
}

export function Brand({ inverted = false, compact = false }: BrandProps) {
  return (
    <div className={`brand ${inverted ? 'brand--inverted' : ''}`}>
      <img className="brand__mark" src={logoUrl} alt="" />
      {!compact && <span className="brand__name">AutoAssist</span>}
    </div>
  )
}

