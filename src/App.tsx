
import { useMemo, useState } from 'react'
import { ThemeProvider, createTheme, CssBaseline, Container } from '@mui/material'
import InvoiceAttachmentsDialog from './components/InvoiceAttachmentsDialog'

export default function App(){
  const [mode, setMode] = useState<'light'|'dark'>('light')
  const theme = useMemo(()=> createTheme({ palette: { mode } }), [mode])
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container sx={{ py:4 }}>
        <h2>Invoice Attachments Demo</h2>
        <p>Open the dialog to try uploads, previews and S3 presign flows.</p>
        <InvoiceAttachmentsDialog open={true} onClose={()=>{}} invoiceId={1} />
      </Container>
    </ThemeProvider>
  )
}
