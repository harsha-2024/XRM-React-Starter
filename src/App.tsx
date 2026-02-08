
import { useMemo, useState } from 'react'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { Routes, Route, Navigate } from 'react-router-dom'
import InvoicesPage from './features/invoices/InvoicesPage'

export default function App(){
  const [mode, setMode] = useState<'light'|'dark'>('light')
  const theme = useMemo(()=> createTheme({ palette: { mode } }), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<Navigate to="/invoices" />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="*" element={<Navigate to="/invoices" />} />
      </Routes>
    </ThemeProvider>
  )
}
