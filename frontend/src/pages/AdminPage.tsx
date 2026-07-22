import { useState } from 'react'
import { AppShell } from '../components/AppShell'

export function AdminPage() {
  const [search, setSearch] = useState('')

  return (
    <AppShell search={search} onSearch={setSearch} searchPlaceholder="Search administration…">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Admin dashboard</h1>
          <p>The administrator role is active. Administrative capabilities have not been configured yet.</p>
        </div>
      </div>
    </AppShell>
  )
}
