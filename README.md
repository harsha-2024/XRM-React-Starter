
# XRM React Pro — Attachments pipeline (advanced)

This demo includes:
- Per-part progress & retry UI (pause/resume, backoff+jitter)
- Thumbnail pipeline UX: 'processing' badge until thumb available
- BullMQ moved to separate worker service
- Bull-board dashboard service
- Auth middleware (Bearer), size/type checks, optional AV scan (ClamAV)
- Quality tuning via env: THUMB_WIDTH, THUMB_WEBP_QUALITY, MIME overrides
- Puppeteer fallback thumbnailer using pdfjs-dist in a headless Chromium page

