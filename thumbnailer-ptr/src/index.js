
import express from 'express'
import puppeteer from 'puppeteer'

const app = express()
app.use(express.raw({ type: 'application/pdf', limit: '50mb' }))

// Render first page using a headless Chromium + pdfjs in a minimal HTML
const html = `<!doctype html><html><head><meta charset='utf-8'>
<script src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.9.179/build/pdf.min.js'></script>
</head><body>
<canvas id='c'></canvas>
<script>
(async()=>{
  const pdfData = atob(localStorage.getItem('pdf'));
  const bytes = new Uint8Array(pdfData.length); for(let i=0;i<pdfData.length;i++) bytes[i]=pdfData.charCodeAt(i);
  const pdf = await window['pdfjsLib'].getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const scale = 320 / viewport.width;
  const scaled = page.getViewport({ scale });
  const canvas = document.getElementById('c'); canvas.width = Math.floor(scaled.width); canvas.height = Math.floor(scaled.height);
  const ctx = canvas.getContext('2d'); await page.render({ canvasContext: ctx, viewport: scaled }).promise;
  const url = canvas.toDataURL('image/webp', 0.8); document.title = url;
})();
</script>
</body></html>`

app.post('/pdf-to-webp', async (req,res)=>{
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 })
  await page.setContent(html)
  const b64 = req.body.toString('base64')
  await page.evaluate((b64)=> localStorage.setItem('pdf', b64), b64)
  await page.waitForFunction(()=> document.title.startsWith('data:image/webp'))
  const dataUrl = await page.title()
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64')
  await browser.close()
  res.setHeader('Content-Type', 'image/webp')
  res.send(buf)
})

app.listen(4200, ()=> console.log('Puppeteer thumbnailer at http://localhost:4200'))
