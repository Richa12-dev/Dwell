// commonFunction/useSignedMediaUrls.js
//
// Resolves maintenance-ticket media (photos + voice notes) to signed S3 URLs
// via GET /api/s3/download-url?key=<key>&expiresIn=3600
//
// The backend's download-url endpoint prepends "uploads/" to the key,
// so we strip that prefix before sending.

import { useState, useEffect } from 'react';
import { fetchSignedUrl } from './useSignedImageUrls';

// ── Helpers ──────────────────────────────────────────────────

const isVoice = (item) => {
  if (typeof item === 'string') return /\.(m4a|mp3|wav|aac|ogg|caf)(\?|$)/i.test(item);
  if (item?.type) return item.type.startsWith('audio/');
  if (item?.name) return /\.(m4a|mp3|wav|aac|ogg|caf)$/i.test(item.name);
  if (item?.url)  return /\.(m4a|mp3|wav|aac|ogg|caf)(\?|$)/i.test(item.url);
  return false;
};

/**
 * Extract the bare S3 key (WITHOUT "uploads/" prefix) from any format
 * the backend may store: full URL, plain key, or object with .url
 */
const extractBareKey = (item) => {
  const raw = typeof item === 'string' ? item : item?.url || item?.key || null;
  if (!raw || typeof raw !== 'string') return null;

  const s = raw.trim();

  // Already signed — pass through
  if (s.includes('X-Amz-Algorithm')) return { signed: s };

  let key = null;

  // Full S3 URL → extract path after bucket host
  const s3Match = s.match(/\.amazonaws\.com\/(.+)/);
  if (s3Match) key = s3Match[1].split('?')[0];

  // Plain key (not a URL)
  if (!key && !s.startsWith('http')) key = s;

  if (!key) return null;

  // Strip "uploads/" — backend adds it in download-url
  key = key.replace(/^uploads\//, '');
  return { key };
};

// ── Hook ─────────────────────────────────────────────────────

const useSignedMediaUrls = (rawMediaFiles, token) => {
  const [photoUrls, setPhotoUrls] = useState([]);
  const [voiceUrl, setVoiceUrl]   = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!rawMediaFiles?.length || !token) {
      setPhotoUrls([]);
      setVoiceUrl(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      setLoading(true);

      const photos = [];
      const voices = [];

      for (const item of rawMediaFiles) {
        const entry = extractBareKey(item);
        if (!entry) continue;
        if (isVoice(item)) voices.push(entry);
        else photos.push(entry);
      }

      // Sign all photos in parallel
      const signedPhotos = await Promise.all(
        photos.map(async (e) => {
          if (e.signed) return e.signed;
          try { return await fetchSignedUrl(e.key, token); }
          catch { return null; }
        })
      );

      // Sign first voice note
      let signedVoice = null;
      if (voices.length > 0) {
        const v = voices[0];
        if (v.signed) signedVoice = v.signed;
        else {
          try { signedVoice = await fetchSignedUrl(v.key, token); }
          catch { /* ignore */ }
        }
      }

      if (!cancelled) {
        setPhotoUrls(signedPhotos.filter(Boolean));
        setVoiceUrl(signedVoice);
        setLoading(false);
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [JSON.stringify(rawMediaFiles), token]);

  return { photoUrls, voiceUrl, loading };
};

export default useSignedMediaUrls;
