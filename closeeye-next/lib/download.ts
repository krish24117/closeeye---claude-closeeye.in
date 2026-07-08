/**
 * Client-side file download. Generates the file in the browser and triggers a
 * save — no backend needed. When the real backend arrives it will stream a PDF
 * from the server; until then these produce a genuine, branded HTML document
 * the family can open and print to PDF.
 */
export function downloadFile(filename: string, content: string, mime = 'text/html') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A minimal, on-brand HTML wrapper so downloads look like Close Eye. */
export function brandedDocument(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} · Close Eye</title>
<style>
  :root{--ink:#0E2A1F;--green:#1F5137;--ivory:#F6F3EC;--line:#E7E1D6;--muted:#5B6B62}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ivory);color:var(--ink);font-family:'Manrope',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6}
  .wrap{max-width:720px;margin:0 auto;padding:48px 32px}
  .brand{display:flex;align-items:center;gap:8px;font-weight:800;color:var(--ink);letter-spacing:-.02em;font-size:20px}
  .dot{width:14px;height:14px;border-radius:50%;background:linear-gradient(135deg,#a8ff3e,#1a6b3a)}
  h1{font-size:28px;letter-spacing:-.02em;margin:24px 0 4px}
  .meta{color:var(--muted);font-size:14px;margin-bottom:24px}
  .card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:24px;margin:16px 0}
  .row{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px solid var(--line)}
  .row:last-child{border-bottom:0}
  .label{color:var(--muted);font-size:13px;text-transform:uppercase;letter-spacing:.08em}
  h2{font-size:18px;margin:0 0 8px}
  .foot{color:var(--muted);font-size:12px;margin-top:32px;border-top:1px solid var(--line);padding-top:16px}
  strong{color:var(--green)}
  @media print{body{background:#fff}.wrap{padding:24px}}
</style></head>
<body><div class="wrap">
  <div class="brand"><span class="dot"></span> close eye</div>
  ${bodyHtml}
  <p class="foot">Close Eye — a trusted human presence for the people you love. This document was generated for your family from your Family Space.</p>
</div></body></html>`
}
