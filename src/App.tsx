
import { useState } from 'react'
import { ThemeProvider, createTheme, CssBaseline, Container, Button } from '@mui/material'
import InvoiceAttachmentsDialog from './components/InvoiceAttachmentsDialog'

export default function App(){
  const [open, setOpen] = useState(true)
  return (
    <ThemeProvider theme={createTheme({ palette:{ mode:'light' } })}>
      <CssBaseline />
      <Container sx={{ py:4 }}>
        <Button variant='contained' onClick={()=>setOpen(true)}>Open Attachments</Button>
        <InvoiceAttachmentsDialog open={open} onClose={()=>setOpen(false)} invoiceId={1} />
      </Container>
    </ThemeProvider>
  )
}
