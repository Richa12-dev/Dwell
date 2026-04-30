// useSignedDocumentUrl.js
//
// Resolves an S3 document fileUrl → presigned download URL → base64 HTML string
// safe for rendering inside a WebView on iOS and Android.
//
// The backend GET /api/s3/download-url?key=<key> prepends "uploads/" to the key.
// So:
//   File at s3.../uploads/UUID.pdf   → pass key "UUID.pdf"          ✅
//   File at s3.../documents/UUID.pdf → pass key "documents/UUID.pdf" → backend
//                                       makes "uploads/documents/UUID.pdf"  ❌ 403
//
// Strategy: try filename-only first (handles uploads/ folder), then try the full
// path as fallback (in case the backend behaviour changes).
//
// Usage:
//   const { embedHtml, loading, error } = useSignedDocumentUrl(fileUrl, token);
//
//   <WebView source={{ html: embedHtml }} ... />

import { useEffect, useRef, useState } from 'react';
import { Config } from '../config';

const BASE_URL = Config.Base_url;

/* ─────────────────────────────────────────────
   IN-MEMORY CACHE  key → { presignedUrl, expiresAt }
   TTL 50 min (presigned URLs valid for 60 min)
───────────────────────────────────────────── */
const presignCache = new Map();
const CACHE_TTL_MS = 50 * 60 * 1000;

const getCached = (key) => {
  const e = presignCache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { presignCache.delete(key); return null; }
  return e.url;
};

const setCache = (key, url) =>
  presignCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });

/* ─────────────────────────────────────────────
   KEY EXTRACTION
   Extracts the S3 key after the bucket hostname.
   e.g. "https://bucket.s3.amazonaws.com/uploads/UUID.pdf"
        → "uploads/UUID.pdf"
───────────────────────────────────────────── */
export const extractDocumentS3Key = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== 'string') return null;

  // Already presigned — no need to sign again
  if (fileUrl.includes('X-Amz-Algorithm')) return null;

  if (fileUrl.startsWith('http')) {
    const match = fileUrl.match(/https?:\/\/[^/]+\.amazonaws\.com\/(.+)/);
    if (match && match[1]) return match[1].split('?')[0];
    return null;
  }

  // Plain key passed directly e.g. "uploads/UUID.pdf"
  return fileUrl.split('?')[0];
};

/* ─────────────────────────────────────────────
   GET PRESIGNED DOWNLOAD URL FROM BACKEND
   Tries filename-only first (backend prepends uploads/).
   Falls back to full path if filename-only fails.
───────────────────────────────────────────── */
export const fetchDocumentPresignedUrl = async (fileUrl, token) => {
  if (!fileUrl || !token) return null;

  // Already signed — use as-is
  if (fileUrl.includes('X-Amz-Algorithm')) return fileUrl;

  const fullKey = extractDocumentS3Key(fileUrl);
  if (!fullKey) return null;

  // Strategy 1: filename only — backend will prepend "uploads/"
  // Correct for files stored at s3.../uploads/<filename>
  const filenameOnly = fullKey.split('/').pop();

  // Strategy 2: full key — for files NOT in uploads/ root
  // e.g. "documents/UUID.pdf" (backend makes "uploads/documents/UUID.pdf")
  // This may still 403 if backend always prepends uploads/ wrongly.
  const strategies = [filenameOnly, fullKey];

  for (const key of strategies) {
    // Check cache first
    const cached = getCached(key);
    if (cached) {
      console.log('✅ [DocUrl] Cache hit for key:', key.substring(0, 50));
      return cached;
    }

    try {
      console.log('🔗 [DocUrl] Requesting presigned URL for key:', key.substring(0, 60));

      const res = await fetch(
        `${BASE_URL}/s3/download-url?key=${encodeURIComponent(key)}&expiresIn=3600`,
        {
          method:  'GET',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await res.json().catch(() => ({}));
      const url  = data?.downloadUrl || data?.signedUrl || data?.url || null;

      if (res.ok && url) {
        console.log('✅ [DocUrl] Presigned URL received for key:', key.substring(0, 50));
        setCache(key, url);
        return url;
      }

      console.warn(`⚠️ [DocUrl] Strategy key="${key}" → HTTP ${res.status}`);
      // Try next strategy
    } catch (err) {
      console.warn('⚠️ [DocUrl] fetch error for key:', key, err.message);
    }
  }

  console.error('❌ [DocUrl] All strategies failed for:', fileUrl.substring(0, 80));
  return null;
};

/* ─────────────────────────────────────────────
   fetchDocumentAsBase64
   Presign → fetch bytes → return { base64, mimeType }
───────────────────────────────────────────── */
export const fetchDocumentAsBase64 = async (fileUrl, token) => {
  const presignedUrl = await fetchDocumentPresignedUrl(fileUrl, token);
  if (!presignedUrl) throw new Error('Could not get presigned URL');

  console.log('📥 [DocUrl] Fetching document bytes...');

  const response = await fetch(presignedUrl);
  if (!response.ok) throw new Error(`S3 fetch failed: ${response.status}`);

  const blob     = await response.blob();
  const mimeType = blob.type || 'application/pdf';

  const base64 = await new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  console.log('✅ [DocUrl] Fetched bytes — type:', mimeType, '| size:', base64.length);
  return { base64, mimeType };
};

/* ─────────────────────────────────────────────
   HTML BUILDERS
───────────────────────────────────────────── */
const buildPdfHtml = (base64) => `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#f0f0f0; }
    iframe { width:100vw; height:100vh; border:none; display:block; }
  </style>
</head><body>
  <iframe src="data:application/pdf;base64,${base64}"></iframe>
</body></html>`;

const buildImageHtml = (base64, mimeType) => `<!DOCTYPE html>
<html><head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#fff; display:flex; align-items:center;
           justify-content:center; min-height:100vh; padding:20px; }
    img { max-width:100%; height:auto; border-radius:10px;
          box-shadow:0 4px 20px rgba(0,0,0,0.12); }
  </style>
</head><body>
  <img src="data:${mimeType};base64,${base64}"/>
</body></html>`;

/* ─────────────────────────────────────────────
   HOOK — useSignedDocumentUrl
───────────────────────────────────────────── */

/**
 * Resolves a private S3 document URL to a safe WebView-embeddable HTML string.
 *
 * @param {string|null} fileUrl  - Full S3 URL e.g. "https://bucket.../uploads/UUID.pdf"
 * @param {string|null} token   - Bearer auth token
 * @param {any[]}       deps    - Extra deps that trigger re-fetch (e.g. [docId])
 *
 * @returns {{ embedHtml: string|null, loading: boolean, error: string|null }}
 *
 * Usage:
 *   const { embedHtml, loading, error } = useSignedDocumentUrl(doc.fileUrl, token);
 *
 *   {embedHtml && (
 *     <WebView source={{ html: embedHtml }} style={{ flex: 1 }} />
 *   )}
 */
const useSignedDocumentUrl = (fileUrl, token, deps = []) => {
  const [embedHtml, setEmbedHtml] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!fileUrl || !token) {
      setEmbedHtml(null);
      setLoading(false);
      setError(!token ? 'No auth token' : 'No file URL');
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      setLoading(true);
      setError(null);
      setEmbedHtml(null);

      try {
        const { base64, mimeType } = await fetchDocumentAsBase64(fileUrl, token);

        if (cancelled || !mountedRef.current) return;

          const isPdf  = mimeType.includes('pdf');
          const isHtml = mimeType.includes('html') || mimeType.includes('text');

          let html;
          if (isPdf) {
            html = buildPdfHtml(base64);
          } else if (isHtml) {
            // Decode base64 back to the original HTML string — display directly in WebView
            try {
              html = decodeURIComponent(escape(atob(base64)));
            } catch {
              html = atob(base64);
            }
          } else {
            html = buildImageHtml(base64, mimeType);
          }

          setEmbedHtml(html);
        setLoading(false);

      } catch (err) {
        if (!cancelled && mountedRef.current) {
          console.error('❌ [useSignedDocumentUrl] error:', err.message);
          setError(err.message || 'Failed to load document');
          setLoading(false);
        }
      }
    };

    resolve();
    return () => { cancelled = true; };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl, token, ...deps]);

  return { embedHtml, loading, error };
};

export default useSignedDocumentUrl;
