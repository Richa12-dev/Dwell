// src/commonFunction/buildSignedDocHtml.js
//
// Merges original document HTML with the tenant's signature image.
// Used by both SignDocumentScreen and DocumentPreviewScreen so the
// exact same output is produced in both places.
//
// Args:
//   docHtml    — raw template HTML string (from API shape C)
//   sigBase64  — raw base64 PNG string (no data: prefix)
//   signerName — full name of the signer
//   signedAt   — ISO date string or null (defaults to today)

export const buildSignedDocHtml = (
  docHtml    = '',
  sigBase64  = '',
  signerName = 'Tenant',
  signedAt   = null,
) => {
  const dateStr = signedAt
    ? new Date(signedAt).toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

  return `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0"/>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 14px;
      line-height: 1.7;
      color: #111;
      background: #fff;
      padding: 32px;
    }
    h1,h2,h3 { margin: 14px 0 6px; }
    p         { margin-bottom: 10px; }
    table     { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    td, th    { border: 1px solid #ddd; padding: 8px; font-size: 13px; }

    /* ── Signature block ── */
    .sig-block {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #e0e0e0;
      page-break-inside: avoid;
    }
    .sig-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .sig-label  { font-size: 13px; color: #555; min-width: 90px; }
    .sig-value  { font-size: 13px; color: #111; font-weight: bold; }
    .sig-img    {
      display: block;
      max-width: 280px;
      max-height: 110px;
      margin: 12px 0 8px;
      border: 1px solid #eee;
      border-radius: 6px;
      background: #fafafa;
    }
    .sig-footer { font-size: 11px; color: #888; margin-top: 4px; }
    .sig-stamp  {
      display: inline-block;
      margin-top: 10px;
      padding: 4px 12px;
      background: #E8F5E9;
      border: 1px solid #A5D6A7;
      border-radius: 20px;
      font-size: 12px;
      color: #2E7D32;
      font-weight: bold;
    }
  </style>
</head><body>

  ${docHtml || '<p>Document content not available.</p>'}

  <div class="sig-block">
    <div class="sig-row">
      <span class="sig-label">Signed by:</span>
      <span class="sig-value">${signerName}</span>
    </div>
    <div class="sig-row">
      <span class="sig-label">Date:</span>
      <span class="sig-value">${dateStr}</span>
    </div>
    <img
      class="sig-img"
      src="data:image/png;base64,${sigBase64}"
      alt="Signature of ${signerName}"
    />
    <p class="sig-footer">
      This document has been electronically signed and is legally binding.
    </p>
    <span class="sig-stamp">✓ Electronically Signed</span>
  </div>

</body></html>`;
};
