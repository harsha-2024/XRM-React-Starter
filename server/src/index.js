
import express from 'express'
import cors from 'cors'
const app = express()
app.use(cors())
app.use(express.json())

// Local uploads
import multer from 'multer'
import path from 'path'
import fs from 'fs'
const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))
const storage = multer.diskStorage({ destination: (req,file,cb)=>cb(null, uploadsDir), filename: (req,file,cb)=>{ const ext=path.extname(file.originalname); cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`) } })
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

let invoices = [ { id:1, number:'INV-1001', account:'Contoso', amount:1200, status:'Draft' } ]
let invoiceAttachments = {}
function nextId(arr){ return arr.length ? Math.max(...arr.map(x=>x.id))+1 : 1 }

// Basic invoice list
app.get('/invoices', (_,res)=>res.json(invoices))

// Attachments (local)
app.get('/invoices/:id/attachments', (req,res)=>{ const id=+req.params.id; res.json(invoiceAttachments[id]||[]) })
app.post('/invoices/:id/attachments', upload.single('file'), (req,res)=>{ const id=+req.params.id; const f=req.file; if(!f) return res.status(400).json({error:'No file'}); const list=invoiceAttachments[id]||[]; const att={ id: list.length? Math.max(...list.map(a=>a.id))+1:1, fileName:f.filename, originalName:f.originalname, size:f.size, mimeType:f.mimetype, url:`/uploads/${f.filename}`, uploadedAt: Date.now(), storage:'local' }; invoiceAttachments[id]=[...list, att]; res.json(att) })
app.delete('/invoices/:id/attachments/:attId', (req,res)=>{ const id=+req.params.id; const attId=+req.params.attId; const list=invoiceAttachments[id]||[]; const found=list.find(a=>a.id===attId); if(!found) return res.status(404).json({error:'Not found'}); if(found.storage==='local'){ try{ fs.unlinkSync(path.join(uploadsDir, found.fileName)) }catch{} } invoiceAttachments[id]=list.filter(a=>a.id!==attId); res.status(204).end() })

// S3 presign support
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
const S3_BUCKET = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION
let s3Client = null
if (S3_BUCKET && S3_REGION){ s3Client = new S3Client({ region: S3_REGION }) }

app.post('/invoices/:id/attachments/presign', async (req,res)=>{
  try{
    if(!s3Client) return res.status(400).json({error:'S3 not configured'})
    const id=+req.params.id; const { filename, contentType } = req.body||{}
    if(!filename || !contentType) return res.status(400).json({error:'filename/contentType required'})
    const key = `invoices/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`
    const cmd = new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, ContentType: contentType })
    const uploadUrl = await getSignedUrl(s3Client, cmd, { expiresIn: 60 })
    const objectUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
    res.json({ uploadUrl, objectUrl, key, headers: { 'Content-Type': contentType } })
  }catch(e){ console.error('presign error', e); res.status(500).json({error:'presign failed'}) }
})

app.post('/invoices/:id/attachments/record', (req,res)=>{ const id=+req.params.id; const { key, objectUrl, originalName, size, mimeType } = req.body||{}; if(!key||!objectUrl) return res.status(400).json({error:'key/objectUrl required'}); const list=invoiceAttachments[id]||[]; const att={ id: list.length? Math.max(...list.map(a=>a.id))+1:1, fileName:key, originalName: originalName||key.split('/').pop(), size:size||0, mimeType: mimeType||'application/octet-stream', url:objectUrl, uploadedAt: Date.now(), storage:'s3' }; invoiceAttachments[id]=[...list, att]; res.json(att) })

app.get('/invoices/:id/attachments/:attId/url', async (req,res)=>{ const id=+req.params.id; const attId=+req.params.attId; const list=invoiceAttachments[id]||[]; const att=list.find(a=>a.id===attId); if(!att) return res.status(404).json({error:'Not found'}); if(att.storage==='s3'){ if(!s3Client) return res.status(400).json({error:'S3 not configured'}); try{ const cmd=new GetObjectCommand({Bucket:S3_BUCKET, Key:att.fileName}); const url=await getSignedUrl(s3Client, cmd, {expiresIn:60}); return res.json({url, expiresIn:60}) }catch(e){ console.error('get presign error', e); return res.status(500).json({error:'get presign failed'}) } } return res.json({url: att.url, expiresIn:0}) })

app.listen(4000, ()=>console.log('Mock API listening on http://localhost:4000'))
