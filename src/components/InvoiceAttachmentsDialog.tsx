
import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, List, ListItem, ListItemText, LinearProgress, IconButton, Typography, Chip, Stack } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import CancelIcon from '@mui/icons-material/Cancel'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ReplayIcon from '@mui/icons-material/Replay'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import {
  InvoiceAttachment,
  listInvoiceAttachments,
  deleteInvoiceAttachment,
  downloadInvoiceAttachment,
  presignInvoiceAttachment,
  recordInvoiceAttachment,
  s3MultipartInitiate,
  s3MultipartPresignPart,
  s3MultipartComplete,
} from '@/services/attachments'
import api from '@/services/api'

const MIN_PART = 5 * 1024 * 1024
const PART_SIZE = 10 * 1024 * 1024

type PartStatus = 'idle'|'uploading'|'done'|'failed'|'paused'

export default function InvoiceAttachmentsDialog({ open, onClose, invoiceId }:{ open:boolean; onClose: ()=>void; invoiceId:number }){
  const [items, setItems] = useState<InvoiceAttachment[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [perFileParts, setPerFileParts] = useState<Record<string, { total:number; statuses: PartStatus[]; etags: (string|undefined)[] }>>({})
  const controllers = useRef<Record<string, AbortController>>({})
  const [paused, setPaused] = useState<Record<string, boolean>>({})

  async function refresh(){ setItems(await listInvoiceAttachments(invoiceId)) }
  useEffect(()=>{ if(open){ refresh() } }, [open, invoiceId])

  function pickFiles(ev:any){ const f = Array.from(ev.target.files||[]); setFiles(prev=>[...prev, ...f]) }

  function splitParts(file: File){
    const size = file.size
    if (size <= MIN_PART) return { total: 1, ranges: [[0,size]] }
    const total = Math.ceil(size / PART_SIZE)
    const ranges: [number,number][] = []
    for (let p=0;p<total;p++){ const start=p*PART_SIZE; ranges.push([start, Math.min(size, start+PART_SIZE)]) }
    return { total, ranges }
  }

  function initFileState(file: File){ const { total } = splitParts(file); setPerFileParts(prev=> ({ ...prev, [file.name]: { total, statuses: Array(total).fill('idle'), etags: Array(total).fill(undefined) } })) }

  function backoff(attempt:number){ const base = 400 * Math.pow(2, attempt); const jitter = Math.random() * 200; return base + jitter }

  async function uploadSmall(file: File){ const presign = await presignInvoiceAttachment(invoiceId, file.name, file.type); const c = new AbortController(); controllers.current[file.name]=c; await api.put(presign.uploadUrl, file, { headers: presign.headers||{}, signal: c.signal, baseURL:'' }); await recordInvoiceAttachment(invoiceId, { key: presign.key, objectUrl: presign.objectUrl, originalName:file.name, size:file.size, mimeType:file.type }) }

  async function uploadMultipart(file: File){ const { ranges, total } = splitParts(file); const { key, uploadId } = await s3MultipartInitiate(invoiceId, file.name, file.type)
    const etags: { PartNumber:number; ETag:string }[] = []
    for (let idx=0; idx<total; idx++){
      let attempt = 0
      let success = false
      while(!success){
        try{
          if (paused[file.name]){ await new Promise(r=>setTimeout(r,300)); continue }
          setPerFileParts(prev=>{ const p = { ...prev[file.name] }; p.statuses[idx] = 'uploading'; return { ...prev, [file.name]: p } })
          const [start,end] = ranges[idx]; const blob = file.slice(start,end)
          const { url, headers } = await s3MultipartPresignPart(invoiceId, key, uploadId, idx+1)
          const c = new AbortController(); controllers.current[file.name]=c
          const resp = await api.put(url, blob, { headers: headers||{}, signal: c.signal, baseURL:'', onUploadProgress:(e)=>{ /* per-part progress is implicit via statuses */ } })
          const etag = (resp.headers['etag']||resp.headers['ETag']||'').replace('"','').replace('"','')
          etags.push({ PartNumber: idx+1, ETag: etag })
          setPerFileParts(prev=>{ const p = { ...prev[file.name] }; p.statuses[idx] = 'done'; p.etags[idx] = etag; return { ...prev, [file.name]: p } })
          success = true
        }catch(err){
          setPerFileParts(prev=>{ const p = { ...prev[file.name] }; p.statuses[idx] = 'failed'; return { ...prev, [file.name]: p } })
          attempt++; if(attempt>=3) throw err; await new Promise(r=>setTimeout(r, backoff(attempt)))
        }
      }
    }
    await s3MultipartComplete(invoiceId, key, uploadId, etags)
    await recordInvoiceAttachment(invoiceId, { key, objectUrl: (api.defaults.baseURL||'')+`/s3/${key}`, originalName:file.name, size:file.size, mimeType:file.type })
  }

  async function startUpload(){ for(const f of files){ initFileState(f); if (f.size <= MIN_PART){ await uploadSmall(f) } else { await uploadMultipart(f) } } setFiles([]); await refresh() }

  function togglePause(name:string){ setPaused(prev=> ({ ...prev, [name]: !prev[name] })) }
  function cancel(name:string){ try{ controllers.current[name]?.abort() }catch{} }
  function retryPart(fileName:string, idx:number){ setPerFileParts(prev=>{ const p = { ...prev[fileName] }; p.statuses[idx] = 'idle'; return { ...prev, [fileName]: p } }) }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>Invoice Attachments</DialogTitle>
      <DialogContent>
        <Button component='label' startIcon={<CloudUploadIcon />}>Add files<input type='file' hidden multiple onChange={pickFiles} /></Button>
        <List>
          {files.map(f=>{
            const ps = perFileParts[f.name]
            return (
              <ListItem key={f.name} secondaryAction={<Stack direction='row' spacing={1}><IconButton onClick={()=>togglePause(f.name)}>{paused[f.name]?<PlayArrowIcon/>:<PauseIcon/>}</IconButton><IconButton onClick={()=>cancel(f.name)}><CancelIcon/></IconButton></Stack>}>
                <ListItemText primary={`${f.name}`} secondary={`${(f.size/1024/1024).toFixed(1)} MB`} />
              </ListItem>
            )
          })}
        </List>
        {files.length>0 && <Button variant='contained' onClick={startUpload}>Upload {files.length} file(s)</Button>}

        <Typography variant='h6' sx={{ mt:3 }}>Existing</Typography>
        <List>
          {items.map(att=> (
            <ListItem key={att.id} secondaryAction={<Stack direction='row' spacing={1}><Chip label={att.processing?'processing':'ready'} color={att.processing?'warning':'success'} /><IconButton onClick={()=>downloadInvoiceAttachment(invoiceId, att.id)}><DownloadIcon/></IconButton><IconButton onClick={()=>deleteInvoiceAttachment(invoiceId, att.id)}><DeleteIcon/></IconButton></Stack>}>
              <ListItemText primary={att.originalName} secondary={`${(att.size/1024).toFixed(1)} KB · ${att.mimeType}`} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
