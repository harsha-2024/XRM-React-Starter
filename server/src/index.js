
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { S3Client, PutObjectCommand, GetObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Queue } from 'bullmq'
import NodeClam from 'clamscan'
import Canvas from 'canvas'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js'

const app = express()
app.use(cors())
app.use(express.json())

// --- Config ---
const THUMB_WIDTH = +(process.env.THUMB_WIDTH || 320)
const THUMB_WEBP_QUALITY = +(process.env.THUMB_WEBP_QUALITY || 80)
const ALLOWED_TYPES = (process.env.ALLOWED_TYPES || 'application/pdf,image/jpeg,image/png,image/webp').split(',')
const MAX_SIZE = +(process.env.MAX_SIZE || 50*1024*1024)

// --- Auth middleware (Bearer) ---
app.use((req,res,next)=>{ const h=req.headers['authorization']; if(!process.env.API_TOKEN) return next(); if(!h || !h.startsWith('Bearer ')) return res.status(401).json({error:'Unauthorized'}); const token=h.slice(7); if(token!==process.env.API_TOKEN) return res.status(403).json({error:'Forbidden'}); next() })

// --- Storage & static ---
const uploadsDir = path.join(process.cwd(), 'uploads')
const thumbsDir = path.join(uploadsDir, 'thumbs')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))
app.use('/public', express.static(path.join(process.cwd(), 'public')))

// --- Data store ---
let invoices = [ { id:1, number:'INV-1001', account:'Contoso', amount:1200, status:'Draft' } ]
let invoiceAttachments = {}

// --- Redis + BullMQ queue (separate worker recommended) ---
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const thumbQueue = new Queue('thumbs', { connection: REDIS_URL })

// --- Node Clam (optional) ---
let clam = null
if (process.env.CLAM_ENABLE==='1'){
  try{ clam = await new NodeClam().init({ clamdscan: { socket: process.env.CLAM_SOCKET || '/var/run/clamav/clamd.ctl', timeout: 60000, localFallback: true }, removeInfected:false }) }catch(e){ console.warn('ClamAV init failed', e.message) }
}

// --- PDF render ---
async function renderPdfFirstPageWebp(buffer){ const pdf = await pdfjs.getDocument({ data: buffer }).promise; const page = await pdf.getPage(1); const viewport = page.getViewport({ scale: 1.0 }); const scale = THUMB_WIDTH / viewport.width; const scaled = page.getViewport({ scale }); const canvas = Canvas.createCanvas(Math.floor(scaled.width), Math.floor(scaled.height)); const ctx = canvas.getContext('2d'); await page.render({ canvasContext: ctx, viewport: scaled }).promise; const png = canvas.toBuffer('image/png'); return await sharp(png).webp({ quality: THUMB_WEBP_QUALITY }).toBuffer() }

// --- S3 ---
const S3_BUCKET = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION
const s3Client = (S3_BUCKET && S3_REGION) ? new S3Client({ region: S3_REGION }) : null

// --- Multer with validation ---
const storage = multer.diskStorage({ destination: (req,file,cb)=>cb(null, uploadsDir), filename:(req,file,cb)=>{ const ext=path.extname(file.originalname); cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`) } })
const upload = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter: (req,file,cb)=>{ if(ALLOWED_TYPES.includes(file.mimetype)) cb(null,true); else cb(new Error('Unsupported file type')) } })

// --- Routes ---
app.get('/invoices', (_,res)=> res.json(invoices))
app.get('/invoices/:id/attachments', (req,res)=>{ const id=+req.params.id; res.json((invoiceAttachments[id]||[])) })

app.post('/invoices/:id/attachments', upload.single('file'), async (req,res)=>{
  const id=+req.params.id; const f=req.file; if(!f) return res.status(400).json({ error:'No file' })
  if (clam){ try{ const { isInfected } = await clam.scanFile(f.path); if(isInfected) return res.status(400).json({ error:'Malicious file detected' }) }catch(e){ console.warn('Clam scan failed', e.message) } }
  const list = invoiceAttachments[id]||[]
  const att = { id: list.length? Math.max(...list.map(a=>a.id))+1:1, fileName:f.filename, originalName:f.originalname, size:f.size, mimeType:f.mimetype, url:`/uploads/${f.filename}`, uploadedAt: Date.now(), storage:'local', processing:false }
  try{
    if (f.mimetype.startsWith('image/')){ const out = path.join(thumbsDir, `${f.filename}.thumb.webp`); await sharp(f.path).resize({ width: THUMB_WIDTH }).webp({ quality: THUMB_WEBP_QUALITY }).toFile(out); att.thumbUrl=`/uploads/thumbs/${path.basename(out)}`; att.thumbStorage='local' }
    else if (f.mimetype==='application/pdf'){ att.processing=true; await thumbQueue.add('pdf-local', { invoiceId:id, attId:att.id, path:f.path, out:`/uploads/thumbs/${f.filename}.thumb.webp` }) }
  }catch(e){ console.warn('thumb enqueue failed', e.message) }
  invoiceAttachments[id]=[...list, att]; res.json(att)
})

app.delete('/invoices/:id/attachments/:attId', (req,res)=>{ const id=+req.params.id; const attId=+req.params.attId; const list=invoiceAttachments[id]||[]; const found=list.find(a=>a.id===attId); if(!found) return res.status(404).json({error:'Not found'}); if(found.storage==='local'){ try{ fs.unlinkSync(path.join(uploadsDir, found.fileName)) }catch{}; if(found.thumbUrl?.startsWith('/uploads/')){ try{ fs.unlinkSync(path.join(process.cwd(), found.thumbUrl)) }catch{} } } invoiceAttachments[id]=list.filter(a=>a.id!==attId); res.status(204).end() })

app.post('/invoices/:id/attachments/presign', async (req,res)=>{ try{ if(!s3Client) return res.status(400).json({error:'S3 not configured'}); const id=+req.params.id; const { filename, contentType } = req.body||{}; const key = `invoices/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`; const cmd = new PutObjectCommand({ Bucket:S3_BUCKET, Key:key, ContentType: contentType }); const uploadUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 }); const objectUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`; res.json({ uploadUrl, objectUrl, key, headers:{'Content-Type':contentType} }) }catch(e){ res.status(500).json({error:'presign failed'}) } })

app.post('/invoices/:id/attachments/record', (req,res)=>{ const id=+req.params.id; const { key, objectUrl, originalName, size, mimeType } = req.body||{}; const list=invoiceAttachments[id]||[]; const att={ id: list.length? Math.max(...list.map(a=>a.id))+1:1, fileName:key, originalName: originalName||key.split('/').pop(), size:size||0, mimeType: mimeType||'application/octet-stream', url: objectUrl, uploadedAt: Date.now(), storage:'s3', processing:false }; if (mimeType==='application/pdf'){ att.processing=true; thumbQueue.add('pdf-s3', { invoiceId:id, attId:att.id, key }) } invoiceAttachments[id]=[...list, att]; res.json(att) })

app.get('/invoices/:id/attachments/:attId/url', async (req,res)=>{ const id=+req.params.id; const attId=+req.params.attId; const list=invoiceAttachments[id]||[]; const att=list.find(a=>a.id===attId); if(!att) return res.status(404).json({error:'Not found'}); if(att.storage==='s3'){ const url = await getSignedUrl(s3Client, new GetObjectCommand({Bucket:S3_BUCKET, Key: att.fileName}), { expiresIn:60 }); return res.json({ url, expiresIn:60 }) } res.json({ url: att.url, expiresIn:0 }) })
app.get('/invoices/:id/attachments/:attId/thumb-url', async (req,res)=>{ const id=+req.params.id; const attId=+req.params.attId; const list=invoiceAttachments[id]||[]; const att=list.find(a=>a.id===attId); if(!att) return res.status(404).json({error:'Not found'}); if(att.thumbStorage==='s3' && att.thumbKey){ const url = await getSignedUrl(s3Client, new GetObjectCommand({Bucket:S3_BUCKET, Key: att.thumbKey}), { expiresIn:60 }); return res.json({ url, expiresIn:60 }) } if (att.thumbUrl) return res.json({ url: att.thumbUrl, expiresIn:0 }); return res.json({ url:'/public/pdf-thumb.png', expiresIn:0 }) })

app.get('/invoices/:id/attachments/:attId/download', async (req,res)=>{ const id=+req.params.id; const attId=+req.params.attId; const list=invoiceAttachments[id]||[]; const att=list.find(a=>a.id===attId); if(!att) return res.status(404).json({error:'Not found'}); const filename = att.originalName || 'download'; if(att.storage==='s3'){ const obj = await s3Client.send(new GetObjectCommand({ Bucket:S3_BUCKET, Key: att.fileName })); res.setHeader('Content-Type', att.mimeType||'application/octet-stream'); res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); obj.Body.pipe(res) } else { const full = path.join(uploadsDir, att.fileName); if(!fs.existsSync(full)) return res.status(404).json({ error:'File missing' }); res.download(full, filename) } })

// Multipart
app.post('/invoices/:id/attachments/multipart/initiate', async (req,res)=>{ if(!s3Client) return res.status(400).json({error:'S3 not configured'}); const id=+req.params.id; const { filename, contentType } = req.body||{}; const key = `invoices/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`; const out = await s3Client.send(new CreateMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, ContentType: contentType })); res.json({ key, uploadId: out.UploadId }) })
app.post('/invoices/:id/attachments/multipart/presign-part', async (req,res)=>{ if(!s3Client) return res.status(400).json({error:'S3 not configured'}); const { key, uploadId, partNumber } = req.body||{}; const url = await getSignedUrl(s3Client, new UploadPartCommand({ Bucket:S3_BUCKET, Key:key, UploadId: uploadId, PartNumber: partNumber, Body: new Uint8Array() }), { expiresIn: 60 }); res.json({ url, headers:{} }) })
app.post('/invoices/:id/attachments/multipart/complete', async (req,res)=>{ if(!s3Client) return res.status(400).json({error:'S3 not configured'}); const { key, uploadId, parts } = req.body||{}; await s3Client.send(new CompleteMultipartUploadCommand({ Bucket:S3_BUCKET, Key:key, UploadId: uploadId, MultipartUpload: { Parts: parts } })); const objectUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`; res.json({ objectUrl }) })

app.listen(4000, ()=> console.log('API on http://localhost:4000'))
