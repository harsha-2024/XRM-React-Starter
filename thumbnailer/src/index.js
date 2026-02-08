
import express from 'express'
import { execFile } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

const app = express()
app.use(express.raw({ type: 'application/pdf', limit: '20mb' }))

function run(cmd, args){
  return new Promise((resolve, reject)=>{
    execFile(cmd, args, (err, stdout, stderr)=>{
      if (err) return reject(new Error(stderr?.toString() || err.message))
      resolve(stdout)
    })
  })
}

// POST /pdf-to-webp -> returns first-page WEBP bytes
app.post('/pdf-to-webp', async (req, res)=>{
  try{
    const pdfBuf = req.body
    if (!pdfBuf || !pdfBuf.length) return res.status(400).send('No PDF')
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfthumb-'))
    const pdfPath = path.join(tmpDir, 'input.pdf')
    fs.writeFileSync(pdfPath, pdfBuf)
    const ppmBase = path.join(tmpDir, 'page')
    // pdftoppm first page to PNG
    await run('pdftoppm', ['-f','1','-l','1','-png', pdfPath, ppmBase])
    const pngPath = path.join(tmpDir, 'page-1.png')
    const webpPath = path.join(tmpDir, 'thumb.webp')
    // Convert to WEBP (quality 80)
    await run('cwebp', [pngPath, '-q','80', '-o', webpPath])
    const out = fs.readFileSync(webpPath)
    res.setHeader('Content-Type', 'image/webp')
    res.send(out)
  }catch(e){
    console.error('thumb error', e)
    res.status(500).send('Thumbnail generation failed')
  }
})

const port = process.env.PORT || 4100
app.listen(port, ()=> console.log(`Thumbnailer listening on http://localhost:${port}`))
