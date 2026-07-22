import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { dashboardPathForRole } from '../auth/roleRouting'
import { Brand } from '../components/Brand'
import { GoogleIcon } from '../components/Icons'
import { Notice } from '../components/Feedback'

export function LoginPage() {
  const { status, user, error, signIn } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  if (status === 'authenticated' && user) {
    return <Navigate to={dashboardPathForRole(user.role)} replace />
  }

  async function handleSignIn() {
    if (submitting) return
    setSubmitting(true)
    try {
      const signedInUser = await signIn('OWNER')
      navigate(dashboardPathForRole(signedInUser.role), { replace: true })
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
            <h2>Get back on the road</h2>
            <p>Sign in securely to request roadside help and follow your service updates.</p>
          </div>

          {error && <Notice tone="error">{error}</Notice>}

          <button className="google-button" type="button" disabled={submitting || status === 'initializing'} onClick={() => void handleSignIn()}>
            {submitting ? <span className="spinner" /> : <GoogleIcon />}
            {submitting ? 'Signing you in…' : 'Continue with Google'}
          </button>
        </div>
        <p className="security-note">Secure access · Your account is protected by Google</p>
      </section>
    </main>
  )
}
