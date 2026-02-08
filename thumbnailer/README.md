
# Thumbnailer Service (PDF -> WEBP)

A tiny Node service that converts the **first page of a PDF** to a **WEBP** thumbnail using `pdftoppm` and `cwebp`.

## Build & Run

```bash
# Build container
docker build -t pdf-thumb:latest .
# Run service on port 4100
docker run --rm -p 4100:4100 pdf-thumb:latest
```

## API
- `POST /pdf-to-webp` — body: raw PDF bytes (`Content-Type: application/pdf`) → returns `image/webp` bytes.

## Integrating with the server
Set `THUMBNAILER_URL` in the XRM server environment, e.g.:
```bash
export THUMBNAILER_URL=http://localhost:4100
```
Then start the server (`npm run dev`). The server will
- For **local PDF uploads**: call the thumbnailer, write WEBP thumbnail under `uploads/thumbs/`.
- For **S3 PDFs**: fetch the PDF object, call the thumbnailer, upload WEBP thumbnail under `thumbnails/` in your bucket.
