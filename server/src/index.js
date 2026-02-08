
import express from 'express'
import cors from 'cors'
const app = express()
app.use(cors())
app.use(express.json())

// Static public for placeholders (e.g., PDF thumb)
import path from 'path'
import fs from 'fs'
const publicDir = path.join(process.cwd(), 'public')
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
app.use('/public', express.static(publicDir))

// Local uploads with thumbnails
import multer from 'multer'
const uploadsDir = path.join(process.cwd(), 'uploads')
const thumbsDir = path.join(uploadsDir, 'thumbs')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => { const ext = path.extname(file.originalname); cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`) }
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

import sharp from 'sharp'

// Data stores
let invoices = [ { id:1, number:'INV-1001', account:'Contoso', amount:1200, status:'Draft' } ]
let invoiceAttachments = {} // { [invoiceId]: Attachment[] }

function nextId(arr){ return arr.length ? Math.max(...arr.map(x=>x.id))+1 : 1 }

// Invoices
app.get('/invoices', (_,res)=> res.json(invoices))

// Local attachments CRUD
app.get('/invoices/:id/attachments', (req,res)=>{
  const id = +req.params.id
  res.json(invoiceAttachments[id] || [])
})

app.post('/invoices/:id/attachments', upload.single('file'), async (req,res)=>{
  const id = +req.params.id
  const file = req.file
  if (!file) return res.status(400).json({ error:'No file uploaded' })
  const list = invoiceAttachments[id] || []
  const att = {
    id: list.length ? Math.max(...list.map(a=>a.id))+1 : 1,
    fileName: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    url: `/uploads/${file.filename}`,
    uploadedAt: Date.now(),
    storage: 'local',
    thumbUrl: undefined,
    thumbStorage: undefined
  }
  try{
    if (file.mimetype.startsWith('image/')){
      const thumbName = `${file.filename}.thumb.jpg`
      const thumbPath = path.join(thumbsDir, thumbName)
      await sharp(file.path).resize({ width: 320 }).jpeg({ quality: 82 }).toFile(thumbPath)
      att.thumbUrl = `/uploads/thumbs/${thumbName}`
      att.thumbStorage = 'local'
    } else if (file.mimetype === 'application/pdf'){
      att.thumbUrl = `/public/pdf-thumb.png`
      att.thumbStorage = 'local'
    }
  } catch (e) {
    console.warn('thumb generation failed', e)
  }
  invoiceAttachments[id] = [...list, att]
  res.json(att)
})

app.delete('/invoices/:id/attachments/:attId', (req,res)=>{
  const id = +req.params.id
  const attId = +req.params.attId
  const list = invoiceAttachments[id] || []
  const found = list.find(a=>a.id===attId)
  if (!found) return res.status(404).json({ error:'Not found' })
  if (found.storage === 'local'){
    try{ fs.unlinkSync(path.join(uploadsDir, found.fileName)) } catch{}
    if (found.thumbUrl && found.thumbUrl.startsWith('/uploads/thumbs/')){
      try{ fs.unlinkSync(path.join(process.cwd(), found.thumbUrl)) } catch{}
    }
  }
  invoiceAttachments[id] = list.filter(a=>a.id!==attId)
  res.status(204).end()
})

// S3 presign + record + presigned GET/thumbnail GET + download streaming
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
const S3_BUCKET = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION
let s3Client = null
if (S3_BUCKET && S3_REGION){ s3Client = new S3Client({ region: S3_REGION }) }

app.post('/invoices/:id/attachments/presign', async (req,res)=>{
  try{
    if (!s3Client) return res.status(400).json({ error:'S3 not configured' })
    const id = +req.params.id
    const { filename, contentType } = req.body || {}
    if (!filename || !contentType) return res.status(400).json({ error:'filename/contentType required' })
    const key = `invoices/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`
    const cmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType })
    const uploadUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 })
    const objectUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
    res.json({ uploadUrl, objectUrl, key, headers: { 'Content-Type': contentType } })
  }catch(e){ console.error('presign error', e); res.status(500).json({ error:'presign failed' }) }
})

app.post('/invoices/:id/attachments/record', async (req,res)=>{
  const id = +req.params.id
  const { key, objectUrl, originalName, size, mimeType } = req.body || {}
  if (!key || !objectUrl) return res.status(400).json({ error:'key/objectUrl required' })
  const list = invoiceAttachments[id] || []
  const att = {
    id: list.length ? Math.max(...list.map(a=>a.id))+1 : 1,
    fileName: key,
    originalName: originalName || key.split('/').pop(),
    size: size || 0,
    mimeType: mimeType || 'application/octet-stream',
    url: objectUrl,
    uploadedAt: Date.now(),
    storage: 's3',
    thumbUrl: undefined,
    thumbStorage: undefined,
    thumbKey: undefined
  }
  // server-side thumbnail for images in S3
  if (s3Client && mimeType && mimeType.startsWith('image/')){
    try{
      const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
      const data = await s3Client.send(getCmd)
      const chunks = []
      for await (const chunk of data.Body) { chunks.push(chunk) }
      const buf = Buffer.concat(chunks)
      const out = await sharp(buf).resize({ width: 320 }).jpeg({ quality: 82 }).toBuffer()
      const thumbKey = `thumbnails/${key}.thumb.jpg`
      const putThumb = new PutObjectCommand({ Bucket: S3_BUCKET, Key: thumbKey, Body: out, ContentType: 'image/jpeg' })
      await s3Client.send(putThumb)
      att.thumbKey = thumbKey
      att.thumbStorage = 's3'
    } catch (e){ console.warn('s3 thumb failed', e) }
  }
  if (mimeType === 'application/pdf'){
    att.thumbUrl = `/public/pdf-thumb.png`
    att.thumbStorage = 'local'
  }
  invoiceAttachments[id] = [...list, att]
  res.json(att)
})

// Signed GET for main file
app.get('/invoices/:id/attachments/:attId/url', async (req,res)=>{
  const id = +req.params.id
  const attId = +req.params.attId
  const list = invoiceAttachments[id] || []
  const att = list.find(a=>a.id===attId)
  if (!att) return res.status(404).json({ error:'Not found' })
  if (att.storage === 's3'){
    if (!s3Client) return res.status(400).json({ error:'S3 not configured' })
    try{
      const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: att.fileName })
      const url = await getSignedUrl(s3Client, cmd, { expiresIn: 60 })
      return res.json({ url, expiresIn: 60 })
    }catch(e){ console.error('get presign error', e); return res.status(500).json({ error:'get presign failed' }) }
  }
  return res.json({ url: att.url, expiresIn: 0 })
})

// Signed/served GET for thumbnail
app.get('/invoices/:id/attachments/:attId/thumb-url', async (req,res)=>{
  const id = +req.params.id
  const attId = +req.params.attId
  const list = invoiceAttachments[id] || []
  const att = list.find(a=>a.id===attId)
  if (!att) return res.status(404).json({ error:'Not found' })
  if (att.thumbStorage === 's3' && att.thumbKey){
    if (!s3Client) return res.status(400).json({ error:'S3 not configured' })
    try{
      const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: att.thumbKey })
      const url = await getSignedUrl(s3Client, cmd, { expiresIn: 60 })
      return res.json({ url, expiresIn: 60 })
    }catch(e){ console.error('thumb get presign error', e); return res.status(500).json({ error:'thumb get presign failed' }) }
  }
  if (att.thumbUrl) return res.json({ url: att.thumbUrl, expiresIn: 0 })
  // fallback placeholder
  return res.json({ url: '/public/pdf-thumb.png', expiresIn: 0 })
})

// Download (Content-Disposition)
app.get('/invoices/:id/attachments/:attId/download', async (req,res)=>{
  const id = +req.params.id
  const attId = +req.params.attId
  const list = invoiceAttachments[id] || []
  const att = list.find(a=>a.id===attId)
  if (!att) return res.status(404).json({ error:'Not found' })
  const filename = att.originalName || 'download'
  if (att.storage === 's3'){
    if (!s3Client) return res.status(400).json({ error:'S3 not configured' })
    try{
      const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: att.fileName })
      const data = await s3Client.send(cmd)
      res.setHeader('Content-Type', att.mimeType || 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      data.Body.pipe(res)
    }catch(e){ console.error('download error', e); res.status(500).json({ error:'download failed' }) }
  } else {
    const full = path.join(uploadsDir, att.fileName)
    if (!fs.existsSync(full)) return res.status(404).json({ error:'File missing' })
    res.download(full, filename)
  }
})

app.listen(4000, ()=>console.log('Mock API listening on http://localhost:4000'))
