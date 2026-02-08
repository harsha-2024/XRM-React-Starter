
import { Worker } from 'bullmq'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import Canvas from 'canvas'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js'
import fs from 'fs'
import path from 'path'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const THUMB_WIDTH = +(process.env.THUMB_WIDTH || 320)
const THUMB_WEBP_QUALITY = +(process.env.THUMB_WEBP_QUALITY || 80)

const S3_BUCKET = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION
const s3Client = (S3_BUCKET && S3_REGION) ? new S3Client({ region: S3_REGION }) : null

async function renderPdf(buffer){ const pdf = await pdfjs.getDocument({ data: buffer }).promise; const page = await pdf.getPage(1); const viewport = page.getViewport({ scale: 1.0 }); const scale = THUMB_WIDTH / viewport.width; const scaled = page.getViewport({ scale }); const canvas = Canvas.createCanvas(Math.floor(scaled.width), Math.floor(scaled.height)); const ctx = canvas.getContext('2d'); await page.render({ canvasContext: ctx, viewport: scaled }).promise; const png = canvas.toBuffer('image/png'); return await sharp(png).webp({ quality: THUMB_WEBP_QUALITY }).toBuffer() }

const w = new Worker('thumbs', async (job)=>{
  if (job.name==='pdf-local'){
    const { invoiceId, attId, path: pdfPath, out } = job.data
    const buf = fs.readFileSync(pdfPath)
    const webp = await renderPdf(buf)
    const full = path.join(process.cwd(), out)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, webp)
    // simple store file side effect; API should poll thumb-url
  }
  if (job.name==='pdf-s3'){
    const { invoiceId, attId, key } = job.data
    const obj = await s3Client.send(new GetObjectCommand({ Bucket:S3_BUCKET, Key:key }))
    const chunks=[]; for await(const ch of obj.Body) chunks.push(ch)
    const webp = await renderPdf(Buffer.concat(chunks))
    const outKey = `thumbnails/${key}.thumb.webp`
    await s3Client.send(new PutObjectCommand({ Bucket:S3_BUCKET, Key: outKey, Body: webp, ContentType:'image/webp' }))
    // API thumb-url will return signed GET when thumbKey is present
  }
}, { connection: REDIS_URL })

console.log('Worker listening for jobs...')
