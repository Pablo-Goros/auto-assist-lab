import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { problemMetadata } from '../api/metadata'
import type { ProblemType } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { AppShell } from '../components/AppShell'
import { Notice } from '../components/Feedback'
import { ArrowLeftIcon, CarIcon, ToolIcon } from '../components/Icons'

const problemOptions = (Object.entries(problemMetadata) as [ProblemType, (typeof problemMetadata)[ProblemType]][])
  .map(([value, metadata]) => ({ value, ...metadata }))

interface FormErrors {
  vehicle?: string
  description?: string
}

export function NewRequestPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [problemType, setProblemType] = useState<ProblemType>('BATTERY')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function validate(): FormErrors {
    const nextErrors: FormErrors = {}
    if (!vehicle.trim()) nextErrors.vehicle = 'Enter the vehicle make, model, and year.'
    if (!description.trim()) nextErrors.description = 'Tell us what happened so the workshop can prepare.'
    return nextErrors
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || !token) return
    const nextErrors = validate()
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    setApiError(null)
    try {
      await api.createRequest(token, { vehicle: vehicle.trim(), problem_type: problemType, description: description.trim() })
      navigate('/requests', { replace: true, state: { created: true } })
    } catch (caught) {
      setApiError(caught instanceof Error ? caught.message : 'Could not create your request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell search={search} onSearch={setSearch} searchPlaceholder="Search your requests…">
      <div className="page-heading page-heading--compact">
        <div>
          <Link className="back-link" to="/requests"><ArrowLeftIcon />Back to requests</Link>
          <span className="eyebrow">Get roadside help</span>
          <h1>New service request</h1>
          <p>Share a few details and our team will connect you with the right workshop.</p>
        </div>
      </div>

      <form className="request-form" onSubmit={(event) => void handleSubmit(event)} noValidate>
        <section className="form-card">
          <div className="form-card__title"><span><CarIcon /></span><div><h2>Vehicle details</h2><p>Which vehicle needs assistance?</p></div></div>
          <label className="field">
            <span>Vehicle <b>*</b></span>
            <input value={vehicle} onChange={(event) => setVehicle(event.target.value)} aria-invalid={Boolean(errors.vehicle)} placeholder="e.g. Honda Civic 2018" maxLength={255} />
            {errors.vehicle && <small className="field-error">{errors.vehicle}</small>}
          </label>
        </section>

        <section className="form-card">
          <div className="form-card__title"><span><ToolIcon /></span><div><h2>What happened?</h2><p>Choose the closest issue and add useful context.</p></div></div>
          <fieldset className="problem-grid">
            <legend>Problem type</legend>
            {problemOptions.map((option) => (
              <label className={problemType === option.value ? 'problem-option problem-option--selected' : 'problem-option'} key={option.value}>
                <input type="radio" name="problemType" value={option.value} checked={problemType === option.value} onChange={() => setProblemType(option.value)} />
                <span className="problem-option__check" />
                <span><strong>{option.label}</strong><small>{option.description}</small></span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>Description <b>*</b></span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} aria-invalid={Boolean(errors.description)} placeholder="Describe what you noticed, where the vehicle is, and anything else that may help…" rows={5} />
            <span className="field-meta">{description.length} characters</span>
            {errors.description && <small className="field-error">{errors.description}</small>}
          </label>
        </section>

        {apiError && <Notice tone="error">{apiError}</Notice>}
        <div className="form-actions">
          <Link className="button button--secondary" to="/requests">Cancel</Link>
          <button className="button button--primary" type="submit" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {submitting ? 'Submitting request…' : 'Submit request'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}
