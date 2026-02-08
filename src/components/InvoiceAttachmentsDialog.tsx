
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, List, ListItem, ListItemAvatar, Avatar, ListItemText, Typography,
  LinearProgress, Alert
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import api from '@/services/api'
import {
  InvoiceAttachment,
  listInvoiceAttachments,
  uploadInvoiceAttachment,
  deleteInvoiceAttachment,
  presignInvoiceAttachment,
  recordInvoiceAttachment
} from '@/services/attachments'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']

function isImage(type:string){ return type.startsWith('image/') }
function isPdf(type:string){ return type === 'application/pdf' }

async function putWithProgress(url: string, file: File, headers: Record<string,string> = {}, onProgress?: (pct:number)=>void, retries=2){
  try {
    await api.put(url, file, {
      headers: { ...(headers||{}), 'Content-Type': file.type },
      onUploadProgress: (e) => {
        if (!onProgress || !e.total) return
        onProgress(Math.round((e.loaded / e.total) * 100))
      },
      baseURL: ''
    })
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, (3 - retries) * 1000))
      return putWithProgress(url, file, headers, onProgress, retries - 1)
    }
    throw err
  }
}

export default function InvoiceAttachmentsDialog({ open, onClose, invoiceId }:{ open:boolean; onClose: ()=>void; invoiceId:number }){
  const [items, setItems] = useState<InvoiceAttachment[]>([])
  const [file, setFile] = useState<File|null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string>('')
  const objectUrl = useRef<string|undefined>()

  const previewUrl = useMemo(()=>{
    if (!file) return undefined
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    return objectUrl.current
  }, [file])

  useEffect(()=>{ return () => { if(objectUrl.current) URL.revokeObjectURL(objectUrl.current) } },[])

  async function refresh(){ setItems(await listInvoiceAttachments(invoiceId)) }
  useEffect(()=>{ if(open){ refresh() } }, [open, invoiceId])

  function validateSelected(f: File){
    if (!ALLOWED_TYPES.includes(f.type)) throw new Error('Only PDF and image files are allowed')
    if (f.size > MAX_SIZE) throw new Error('File is too large (max 10 MB)')
  }

  async function onUpload(){
    setError('')
    if(!file) return
    try { validateSelected(file) } catch (e:any) { setError(e.message || 'Invalid file'); return }
    setBusy(true)
    setProgress(0)
    try{
      try {
        const presign = await presignInvoiceAttachment(invoiceId, file.name, file.type)
        await putWithProgress(presign.uploadUrl, file, presign.headers||{}, (p)=>setProgress(p), 2)
        await recordInvoiceAttachment(invoiceId, { key: presign.key, objectUrl: presign.objectUrl, originalName: file.name, size: file.size, mimeType: file.type })
      } catch (e) {
        await uploadInvoiceAttachment(invoiceId, file)
      }
      setFile(null)
      await refresh()
    } catch (err:any) {
      setError('Upload failed. Please try again.')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  async function onDelete(attId:number){
    setBusy(true)
    setError('')
    try{ await deleteInvoiceAttachment(invoiceId, attId); await refresh() } catch { setError('Delete failed') } finally { setBusy(false) }
  }

  function renderAvatar(att: InvoiceAttachment){
    if (isImage(att.mimeType)) return <Avatar variant='square'><ImageIcon /></Avatar>
    if (isPdf(att.mimeType)) return <Avatar variant='square'><PictureAsPdfIcon /></Avatar>
    return <Avatar variant='square'><InsertDriveFileIcon /></Avatar>
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>Invoice Attachments</DialogTitle>
      <DialogContent>
        {error && <Alert severity='error' sx={{ mb:2 }}>{error}</Alert>}
        <Box sx={{ display:'flex', gap:1, alignItems:'center', mb:2 }}>
          <Button component='label' variant='outlined' startIcon={<CloudUploadIcon />} disabled={busy}>
            Choose file
            <input type='file' accept='image/*,application/pdf' hidden onChange={(e)=> setFile(e.target.files?.[0] || null)} />
          </Button>
          <Typography variant='body2' sx={{ flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {file ? `${file.name} — ${(file.size/1024).toFixed(1)} KB` : 'No file selected'}
          </Typography>
          <Button variant='contained' onClick={onUpload} disabled={!file || busy}>Upload</Button>
        </Box>
        {busy && <LinearProgress variant='determinate' value={progress} sx={{ mb:2 }} />}

        {/* Inline preview before upload */}
        {file && (
          <Box sx={{ mb:2 }}>
            {file.type.startsWith('image/') && previewUrl && (
              <img src={previewUrl} alt='preview' style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 4 }} />
            )}
            {file.type === 'application/pdf' && previewUrl && (
              <iframe title='PDF preview' src={previewUrl} style={{ width: '100%', height: 320, border: '1px solid #eee', borderRadius: 4 }} />
            )}
          </Box>
        )}

        <List dense>
          {items.map(att => (
            <ListItem key={att.id}
              secondaryAction={
                <IconButton edge='end' aria-label='delete' onClick={()=>onDelete(att.id)} disabled={busy}>
                  <DeleteIcon />
                </IconButton>
              }>
              <ListItemAvatar>
                {renderAvatar(att)}
              </ListItemAvatar>
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
