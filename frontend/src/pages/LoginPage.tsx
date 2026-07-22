import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import type { SignInIntent } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { Brand } from '../components/Brand'
import { GoogleIcon } from '../components/Icons'
import { Notice } from '../components/Feedback'

export function LoginPage() {
  const { status, user, error, signIn } = useAuth()
  const [intent, setIntent] = useState<SignInIntent>('OWNER')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  if (status === 'authenticated' && user) {
    return <Navigate to={user.role === 'OWNER' ? '/requests' : '/operator'} replace />
  }

  async function handleSignIn() {
    if (submitting) return
    setSubmitting(true)
    try {
      const signedInUser = await signIn(intent)
      navigate(signedInUser.role === 'OWNER' ? '/requests' : '/operator', { replace: true })
    } catch {
      // The auth context exposes a readable error in the page.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="About AutoAssist">
        <div className="login-brand-panel__content">
          <Brand inverted />
          <div className="login-brand-panel__copy">
            <span className="eyebrow eyebrow--light">Roadside support, simplified</span>
            <h1>Help is closer than it feels.</h1>
            <p>Request assistance, track every update, and get matched with the right workshop.</p>
          </div>
        </div>
        <div className="road-lines" aria-hidden="true"><span /><span /><span /><span /></div>
      </section>

      <section className="login-form-panel">
        <div className="login-mobile-brand"><Brand /></div>
        <div className="login-card">
          <div className="login-card__heading">
            <span className="eyebrow">Welcome to AutoAssist</span>
            <h2>Welcome back</h2>
            <p>Choose your local demo profile to continue.</p>
          </div>

          <fieldset className="role-switcher">
            <legend>Demo account</legend>
            <label className={intent === 'OWNER' ? 'role-option role-option--selected' : 'role-option'}>
              <input type="radio" name="role" value="OWNER" checked={intent === 'OWNER'} onChange={() => setIntent('OWNER')} />
              <span><strong>Vehicle owner</strong><small>Create and track requests</small></span>
            </label>
            <label className={intent === 'OPERATOR' ? 'role-option role-option--selected' : 'role-option'}>
              <input type="radio" name="role" value="OPERATOR" checked={intent === 'OPERATOR'} onChange={() => setIntent('OPERATOR')} />
              <span><strong>Operator</strong><small>Assign requests to workshops</small></span>
            </label>
          </fieldset>

          {error && <Notice tone="error">{error}</Notice>}

          <button className="google-button" type="button" disabled={submitting || status === 'initializing'} onClick={() => void handleSignIn()}>
            {submitting ? <span className="spinner" /> : <GoogleIcon />}
            {submitting ? 'Signing you in…' : 'Continue with Google'}
          </button>
          <p className="login-card__hint">Google authentication is connected in Phase 5. This screen currently uses the seeded local identities.</p>
        </div>
        <p className="security-note">Secure access · Your application role is verified by AutoAssist</p>
      </section>
    </main>
  )
}
