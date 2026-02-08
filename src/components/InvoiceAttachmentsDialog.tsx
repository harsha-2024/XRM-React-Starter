
import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemAvatar, Avatar, ListItemText, Typography, LinearProgress, Alert, Collapse, Stack, Chip, Tooltip } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import CancelIcon from '@mui/icons-material/Cancel'
import api from '@/services/api'
import { InvoiceAttachment, listInvoiceAttachments, uploadInvoiceAttachment, deleteInvoiceAttachment, presignInvoiceAttachment, recordInvoiceAttachment, getSignedInvoiceAttachmentUrl, getSignedInvoiceAttachmentThumbUrl, downloadInvoiceAttachment } from '@/services/attachments'

const MAX_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']

function isImage(type:string){ return type.startsWith('image/') }
function isPdf(type:string){ return type === 'application/pdf' }

function sleep(ms:number){ return new Promise(r=>setTimeout(r, ms)) }
function backoffDelay(attempt:number){ // exp backoff + jitter
  const base = 400 * Math.pow(2, attempt) // 400, 800, 1600...
  const jitter = Math.random() * 200
  return base + jitter
}

async function putWithProgress(url: string, file: File, headers: Record<string,string> = {}, onProgress?: (loaded:number,total:number)=>void, signal?: AbortSignal){
  let attempt = 0
  const maxAttempts = 3
  while(true){
    try {
      await api.put(url, file, {
        headers: { ...(headers||{}), 'Content-Type': file.type },
        onUploadProgress: (e) => { if (onProgress && e.total) onProgress(e.loaded!, e.total!) },
        baseURL: '',
        signal
      })
      return
    } catch (err:any) {
      if (signal?.aborted) throw err
      if (++attempt >= maxAttempts) throw err
      await sleep(backoffDelay(attempt))
    }
  }
}

async function runWithConcurrency(tasks: (()=>Promise<any>)[], limit=3){
  const results:any[] = []; let i=0
  const workers = new Array(Math.min(limit, tasks.length)).fill(0).map(async ()=>{ while(i<tasks.length){ const idx=i++; try{ results[idx]=await tasks[idx]() }catch(e){ results[idx]=e } } })
  await Promise.all(workers); return results
}

export default function InvoiceAttachmentsDialog({ open, onClose, invoiceId }:{ open:boolean; onClose: ()=>void; invoiceId:number }){
  const [items, setItems] = useState<InvoiceAttachment[]>([])
  const [thumbs, setThumbs] = useState<Record<number, string>>({})
  const [selected, setSelected] = useState<{ file: File; controller?: AbortController }[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [progressMap, setProgressMap] = useState<Record<string, {loaded:number; total:number}>>({})
  const [itemPreviewOpen, setItemPreviewOpen] = useState<Record<number, {open:boolean; url?:string}>>({})
  const [uploadStart, setUploadStart] = useState<number|undefined>(undefined)

  async function refresh(){
    const list = await listInvoiceAttachments(invoiceId)
    setItems(list)
    const map: Record<number,string> = {}
    for (const att of list){
      try{ const r = await getSignedInvoiceAttachmentThumbUrl(invoiceId, att.id); map[att.id] = r.url }catch{}
    }
    setThumbs(map)
  }
  useEffect(()=>{ if(open){ refresh() } }, [open, invoiceId])

  function onDragOver(e: React.DragEvent<HTMLDivElement>){ e.preventDefault(); e.stopPropagation() }
  function onDrop(e: React.DragEvent<HTMLDivElement>){ e.preventDefault(); e.stopPropagation(); const files = Array.from(e.dataTransfer.files || []); addFiles(files) }

  function validateFile(f: File){ if (!ALLOWED_TYPES.includes(f.type)) throw new Error(`${f.name}: Only PDF and images are allowed`); if (f.size > MAX_SIZE) throw new Error(`${f.name}: File too large (max 10 MB)`) }
  function addFiles(files: File[]){ const errs:string[]=[]; const ok:{file:File}[]=[]; files.forEach(f=>{ try{ validateFile(f); ok.push({file:f}) }catch(e:any){ errs.push(e.message||'Invalid file') } }); if(errs.length) setErrors(p=>[...p, ...errs]); if(ok.length) setSelected(p=>[...p, ...ok]) }
  function removePendingFile(idx: number){ setSelected(prev=> prev.filter((_,i)=> i!==idx)) }

  // Overall progress & ETA
  const overall = useMemo(()=>{
    const totalsize = selected.reduce((s,x)=> s + x.file.size, 0)
    const loaded = Object.entries(progressMap).reduce((s, [k, v])=> s + v.loaded, 0)
    const pct = totalsize ? Math.round( (loaded / totalsize) * 100 ) : 0
    const elapsed = uploadStart ? (Date.now() - uploadStart)/1000 : 0
    const rate = elapsed>0 ? loaded / elapsed : 0 // bytes/sec
    const remaining = totalsize - loaded
    const eta = rate>0 ? Math.round(remaining / rate) : undefined // sec
    return { pct, eta, rate }
  }, [selected, progressMap, uploadStart])

  async function uploadOne(entry: { file: File; controller?: AbortController }){
    const { file } = entry
    const pmKey = `${file.name}:${file.size}`
    const controller = new AbortController()
    entry.controller = controller
    const setP = (loaded:number,total:number)=> setProgressMap(prev=> ({...prev,[pmKey]:{loaded,total}}))
    setP(0,file.size)
    try{
      try {
        const presign=await presignInvoiceAttachment(invoiceId, file.name, file.type)
        await putWithProgress(presign.uploadUrl, file, presign.headers||{}, setP, controller.signal)
        await recordInvoiceAttachment(invoiceId,{key:presign.key, objectUrl:presign.objectUrl, originalName:file.name, size:file.size, mimeType:file.type})
      } catch (e) {
        await uploadInvoiceAttachment(invoiceId, file)
        setP(file.size, file.size)
      }
    } finally {
      // nothing
    }
  }

  async function onUploadAll(){
    setErrors([])
    if(!selected.length) return
    setBusy(true)
    setUploadStart(Date.now())
    setProgressMap({})
    try{
      const tasks = selected.map(entry=> ()=> uploadOne(entry))
      await runWithConcurrency(tasks, 3)
      setSelected([])
      setProgressMap({})
      await refresh()
    } catch { setErrors(p=>[...p,'Some uploads failed; please retry.']) } finally { setBusy(false); setUploadStart(undefined) }
  }

  function cancelUpload(idx:number){
    const entry = selected[idx]
    try{ entry.controller?.abort() }catch{}
    removePendingFile(idx)
  }

  async function onDelete(attId:number){ setBusy(true); try{ await deleteInvoiceAttachment(invoiceId, attId); await refresh() } catch { setErrors(p=>[...p,'Delete failed']) } finally { setBusy(false) } }

  async function togglePreview(att: InvoiceAttachment){ const rec=itemPreviewOpen[att.id]; if(rec?.open){ setItemPreviewOpen(p=>({...p,[att.id]:{open:false}})); return } let url=att.url; if(att.storage==='s3'){ try{ const r=await getSignedInvoiceAttachmentUrl(invoiceId, att.id); url=r.url }catch{ setErrors(p=>[...p,'Failed to get view URL']); return } } setItemPreviewOpen(p=>({...p,[att.id]:{open:true,url}})) }

  function renderAvatar(att: InvoiceAttachment){ const thumb = thumbs[att.id]; if (thumb && isImage(att.mimeType)) return <Avatar variant='square' src={thumb} />; if (isImage(att.mimeType)) return <Avatar variant='square'><ImageIcon/></Avatar>; if (isPdf(att.mimeType)) return <Avatar variant='square'><PictureAsPdfIcon/></Avatar>; return <Avatar variant='square'><InsertDriveFileIcon/></Avatar> }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>Invoice Attachments</DialogTitle>
      <DialogContent>
        {errors.map((e,i)=> <Alert key={i} severity='error' sx={{ mb:1 }}>{e}</Alert>)}
        <Box onDragOver={onDragOver} onDrop={onDrop} sx={{ border:'1px dashed', borderColor:'divider', borderRadius:1, p:2, mb:2, textAlign:'center', bgcolor:'action.hover' }}>
          <Typography variant='body2' sx={{ mb:1 }}>Drag & drop files here, or choose “Add files”.</Typography>
          <Button component='label' variant='outlined' startIcon={<CloudUploadIcon />} disabled={busy}>Add files<input type='file' multiple accept='image/*,application/pdf' hidden onChange={(e)=> e.target.files && addFiles(Array.from(e.target.files))} /></Button>
        </Box>

        {selected.length>0 && (
          <Box sx={{ mb:2 }}>
            <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb:1 }}>
              <Typography variant='subtitle1'>Files to upload ({selected.length})</Typography>
              <Stack direction='row' alignItems='center' spacing={2}>
                {uploadStart && <Typography variant='body2'>Overall: {overall.pct}%{overall.eta!==undefined?` · ETA ${overall.eta}s`:''}</Typography>}
                <Button onClick={()=>{ setSelected([]); setProgressMap({}); setUploadStart(undefined) }} size='small' startIcon={<CloseIcon />}>Clear</Button>
              </Stack>
            </Stack>
            <List dense>
              {selected.map((entry,idx)=>{ const pmKey=`${entry.file.name}:${entry.file.size}`; const prog=(progressMap[pmKey]?.loaded||0) / (progressMap[pmKey]?.total||entry.file.size) * 100; return (
                <ListItem key={pmKey} secondaryAction={<Tooltip title='Cancel'><IconButton edge='end' onClick={()=>cancelUpload(idx)} disabled={!busy}><CancelIcon/></IconButton></Tooltip>}>
                  <ListItemAvatar><Avatar variant='square'>{isImage(entry.file.type)?<ImageIcon/>:isPdf(entry.file.type)?<PictureAsPdfIcon/>:<InsertDriveFileIcon/>}</Avatar></ListItemAvatar>
                  <ListItemText primary={`${entry.file.name}`} secondary={`${(entry.file.size/1024).toFixed(1)} KB · ${entry.file.type||'unknown'}`} />
                  {uploadStart && <Box sx={{ minWidth:200 }}><LinearProgress variant='determinate' value={isNaN(prog)?0:prog} /></Box>}
                </ListItem>
              )})}
            </List>
            <Button variant='contained' onClick={onUploadAll} disabled={busy || selected.length===0}>Upload {selected.length} file(s)</Button>
          </Box>
        )}

        <Typography variant='subtitle1' sx={{ mb:1 }}>Existing attachments</Typography>
        <List dense>
          {items.map(att=>{ const pv=itemPreviewOpen[att.id]; return (
            <Box key={att.id}>
              <ListItem secondaryAction={<Box>
                  <Chip size='small' label={att.storage==='s3'?'S3':'Local'} sx={{ mr:1 }} />
                  <Tooltip title='Preview'>
                    <IconButton sx={{ mr:1 }} onClick={()=>togglePreview(att)} disabled={busy}>{pv?.open ? <VisibilityOffIcon/> : <VisibilityIcon/>}</IconButton>
                  </Tooltip>
                  <Tooltip title='Download'>
                    <IconButton sx={{ mr:1 }} onClick={()=>downloadInvoiceAttachment(invoiceId, att.id)} disabled={busy}><DownloadIcon/></IconButton>
                  </Tooltip>
                  <Tooltip title='Delete'>
                    <IconButton edge='end' aria-label='delete' onClick={()=>onDelete(att.id)} disabled={busy}><DeleteIcon/></IconButton>
                  </Tooltip>
                </Box>}>
                <ListItemAvatar>{renderAvatar(att)}</ListItemAvatar>
                <ListItemText primary={<span>{att.originalName}</span>} secondary={`${(att.size/1024).toFixed(1)} KB · ${att.mimeType}`} />
              </ListItem>
              <Collapse in={!!pv?.open} timeout='auto' unmountOnExit>
                <Box sx={{ p:1, borderTop:'1px solid', borderColor:'divider', mb:1 }}>
                  {pv?.url && isImage(att.mimeType) && (<img src={pv.url} alt={att.originalName} style={{ maxWidth:'100%', maxHeight:480, borderRadius:4 }} />)}
                  {pv?.url && isPdf(att.mimeType) && (<iframe title={`pdf-${att.id}`} src={pv.url} style={{ width:'100%', height:520, border:'1px solid #eee', borderRadius:4 }} />)}
                  {!isImage(att.mimeType) && !isPdf(att.mimeType) && pv?.url && (<Typography variant='body2'><a href={pv.url} target='_blank' rel='noreferrer'>Open file</a></Typography>)}
                </Box>
              </Collapse>
            </Box>
          )})}
          {items.length===0 && <Typography variant='body2' color='text.secondary'>No attachments yet.</Typography>}
        </List>
      </DialogContent>
      <DialogActions><Button onClick={onClose} disabled={busy}>Close</Button></DialogActions>
    </Dialog>
  )
}
