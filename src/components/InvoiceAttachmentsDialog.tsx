
import { useEffect, useState } from 'react'
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, List, ListItem, ListItemText, Typography
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { InvoiceAttachment, listInvoiceAttachments, uploadInvoiceAttachment, deleteInvoiceAttachment } from '@/services/attachments'

export default function InvoiceAttachmentsDialog({ open, onClose, invoiceId }:{ open:boolean; onClose: ()=>void; invoiceId:number }){
  const [items, setItems] = useState<InvoiceAttachment[]>([])
  const [file, setFile] = useState<File|null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh(){ setItems(await listInvoiceAttachments(invoiceId)) }
  useEffect(()=>{ if(open){ refresh() } }, [open, invoiceId])

  async function onUpload(){
    if(!file) return
    setBusy(true)
    try{ await uploadInvoiceAttachment(invoiceId, file); setFile(null); await refresh() } finally { setBusy(false) }
  }

  async function onDelete(attId:number){
    setBusy(true)
    try{ await deleteInvoiceAttachment(invoiceId, attId); await refresh() } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Invoice Attachments</DialogTitle>
      <DialogContent>
        <Box sx={{ display:'flex', gap:1, alignItems:'center', mb:2 }}>
          <Button component='label' variant='outlined' startIcon={<CloudUploadIcon />} disabled={busy}>
            Choose file
            <input type='file' hidden onChange={(e)=> setFile(e.target.files?.[0] || null)} />
          </Button>
          <Typography variant='body2' sx={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {file ? file.name : 'No file selected'}
          </Typography>
          <Button variant='contained' onClick={onUpload} disabled={!file || busy}>Upload</Button>
        </Box>
        <List dense>
          {items.map(att => (
            <ListItem key={att.id}
              secondaryAction={
                <IconButton edge='end' aria-label='delete' onClick={()=>onDelete(att.id)} disabled={busy}>
                  <DeleteIcon />
                </IconButton>
              }>
              <ListItemText
                primary={<a href={att.url} target='_blank' rel='noreferrer'>{att.originalName}</a>}
                secondary={`${(att.size/1024).toFixed(1)} KB · ${att.mimeType}`}
              />
            </ListItem>
          ))}
          {items.length===0 && <Typography variant='body2' color='text.secondary'>No attachments yet.</Typography>}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
