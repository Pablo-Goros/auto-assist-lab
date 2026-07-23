import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import type { AuthAdapter } from './auth/types'
import { useAuth } from './auth/useAuth'
import { dashboardPathForRole } from './auth/roleRouting'
import { FullPageLoader } from './components/Feedback'
import { LoginPage } from './pages/LoginPage'
import { AdminPage } from './pages/AdminPage'
import { NewRequestPage } from './pages/NewRequestPage'
import { OperatorPage } from './pages/OperatorPage'
import { OwnerRequestsPage } from './pages/OwnerRequestsPage'
import { TenantSelectionPage } from './pages/TenantSelectionPage'
import './App.css'

function HomeRedirect() {
  const { status, user } = useAuth()
  if (status === 'initializing') return <FullPageLoader label="Loading AutoAssist" />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'ADMIN' && !user.tenant) return <Navigate to="/select-tenant" replace />
  return <Navigate to={dashboardPathForRole(user.role)} replace />
}

interface AppProps {
  authAdapter?: AuthAdapter
}

function App({ authAdapter }: AppProps) {
  return (
    <BrowserRouter>
      <AuthProvider adapter={authAdapter}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/select-tenant" element={<TenantSelectionPage />} />
          <Route element={<ProtectedRoute role="OWNER" />}>
            <Route path="/requests" element={<OwnerRequestsPage />} />
            <Route path="/requests/new" element={<NewRequestPage />} />
          </Route>
          <Route element={<ProtectedRoute role="OPERATOR" />}>
            <Route path="/operator" element={<OperatorPage />} />
          </Route>
          <Route element={<ProtectedRoute role="ADMIN" />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
