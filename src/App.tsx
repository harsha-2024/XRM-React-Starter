
import { useMemo, useState, useEffect } from 'react'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar'
import SideNav from './components/SideNav'
import Dashboard from './pages/Dashboard'
import Reports from './pages/Reports'
import Settings from './pages/Settings'
import Login from './pages/Login'
import AccountsPage from './features/accounts/AccountsPage'
import ContactsPage from './features/contacts/ContactsPage'
import OpportunitiesPage from './features/opportunities/OpportunitiesPage'
import CasesPage from './features/cases/CasesPage'
import ActivitiesPage from './features/activities/ActivitiesPage'
import LeadsPage from './features/leads/LeadsPage'
import CampaignsPage from './features/campaigns/CampaignsPage'
import InvoicesPage from './features/invoices/InvoicesPage'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuth } from './hooks/useAuth'
import { loadPlugins } from './services/plugin'

export default function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode])
  const { isAuthenticated } = useAuth()
  const [plugins, setPlugins] = useState<{ id: string; name: string; Component: React.FC }[]>([])

  useEffect(() => { (async () => setPlugins(await loadPlugins()))() }, [])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isAuthenticated && <NavBar mode={mode} setMode={setMode} />}
      <div style={{ display: 'flex' }}>
        {isAuthenticated && <SideNav />}
        <main style={{ flex: 1, padding: 16 }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={['admin','sales']}><Reports /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute roles={['admin']}><Settings setMode={setMode} /></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute><AccountsPage /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
            <Route path="/opportunities" element={<ProtectedRoute><OpportunitiesPage /></ProtectedRoute>} />
            <Route path="/cases" element={<ProtectedRoute><CasesPage /></ProtectedRoute>} />
            <Route path="/activities" element={<ProtectedRoute><ActivitiesPage /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute roles={['admin','sales']}><CampaignsPage /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute roles={['admin']}><InvoicesPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} />} />
          </Routes>
          {isAuthenticated && plugins.map(p => <p.Component key={p.id} />)}
        </main>
      </div>
    </ThemeProvider>
  )
}
