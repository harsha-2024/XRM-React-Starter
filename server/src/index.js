
import express from 'express'
import cors from 'cors'
const app = express()
app.use(cors())
app.use(express.json())


import multer from 'multer'
import path from 'path'
import fs from 'fs'

const uploadsDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }) // 10 MB

let invoiceAttachments = {} // { [invoiceId: number]: Array<Attachment> }
// type Attachment = { id:number, fileName:string, originalName:string, size:number, mimeType:string, url:string, uploadedAt:number }

app.get('/invoices/:id/attachments', (req, res) => {
  const id = +req.params.id
  res.json(invoiceAttachments[id] || [])
})

app.post('/invoices/:id/attachments', upload.single('file'), (req, res) => {
  const id = +req.params.id
  const file = req.file
  if (!file) return res.status(400).json({ error: 'No file uploaded' })
  const list = invoiceAttachments[id] || []
  const att = {
    id: list.length ? Math.max(...list.map(a=>a.id))+1 : 1,
    fileName: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    url: `/uploads/${file.filename}`,
    uploadedAt: Date.now()
  }
  const next = [...list, att]
  invoiceAttachments[id] = next
  res.json(att)
})

app.delete('/invoices/:id/attachments/:attId', (req, res) => {
  const id = +req.params.id
  const attId = +req.params.attId
  const list = invoiceAttachments[id] || []
  const found = list.find(a=>a.id===attId)
  if (!found) return res.status(404).json({ error: 'Not found' })
  try {
    fs.unlinkSync(path.join(uploadsDir, found.fileName))
  } catch (e) {
    // ignore if missing
  }
  invoiceAttachments[id] = list.filter(a=>a.id!==attId)
  res.status(204).end()
})


const accounts = [ { id:1, name:'Contoso', industry:'IT', owner:'admin' } ]
app.get('/accounts', (_, res)=>res.json(accounts))

app.post('/login', (req, res)=>{
  const { username } = req.body
  res.json({ token: 'mock-token', user: { username, role: username==='admin'?'admin':'sales' } })
})

// In-memory stores
let leads = [ { id:1, firstName:'Alex', lastName:'Doe', email:'alex@example.com', status:'New' } ]
let campaigns = [ { id:1, name:'Launch 2026', channel:'Email', budget:5000 } ]
let invoices = [ { id:1, number:'INV-1001', account:'Contoso', amount:1200, status:'Draft' } ]

function nextId(arr){ return arr.length ? Math.max(...arr.map(x=>x.id))+1 : 1 }

// Leads
app.get('/leads', (_,res)=>res.json(leads))
app.post('/leads', (req,res)=>{ const item={ id: nextId(leads), ...req.body }; leads.push(item); res.json(item) })
app.put('/leads/:id', (req,res)=>{ const id=+req.params.id; leads = leads.map(x=> x.id===id? { id, ...req.body }: x); res.json(leads.find(x=>x.id===id)) })
app.delete('/leads/:id', (req,res)=>{ const id=+req.params.id; leads = leads.filter(x=>x.id!==id); res.status(204).end() })

// Campaigns
app.get('/campaigns', (_,res)=>res.json(campaigns))
app.post('/campaigns', (req,res)=>{ const item={ id: nextId(campaigns), ...req.body }; campaigns.push(item); res.json(item) })
app.put('/campaigns/:id', (req,res)=>{ const id=+req.params.id; campaigns = campaigns.map(x=> x.id===id? { id, ...req.body }: x); res.json(campaigns.find(x=>x.id===id)) })
app.delete('/campaigns/:id', (req,res)=>{ const id=+req.params.id; campaigns = campaigns.filter(x=>x.id!==id); res.status(204).end() })

// Invoices
app.get('/invoices', (_,res)=>res.json(invoices))
app.post('/invoices', (req,res)=>{ const item={ id: nextId(invoices), ...req.body }; invoices.push(item); res.json(item) })
app.put('/invoices/:id', (req,res)=>{ const id=+req.params.id; invoices = invoices.map(x=> x.id===id? { id, ...req.body }: x); res.json(invoices.find(x=>x.id===id)) })
app.delete('/invoices/:id', (req,res)=>{ const id=+req.params.id; invoices = invoices.filter(x=>x.id!==id); res.status(204).end() })

app.listen(4000, ()=>console.log('Mock API listening on http://localhost:4000'))
