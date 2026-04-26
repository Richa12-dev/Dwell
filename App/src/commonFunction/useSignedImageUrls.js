// commonFunction/useSignedImageUrls.js
//
// Resolves S3 image URLs/keys → signed download URLs via
// GET /api/s3/download-url?key=<key>&expiresIn=3600
//
// Exports:
//   default useSignedImageUrls(rawImages, token)   — hook for property image arrays
//   useSignedProfileImage(token, deps)              — hook for single profile image
//   resolveOneImage(raw, token)                     — utility for one-off resolution
//   fetchSignedUrl(key, token)                      — raw fetch helper
//   extractS3Key(raw)                               — key extractor utility

import { useState, useEffect, useRef } from 'react';
import { Config } from '../config';
import { fetchProfileImageKey } from '../Redux/Users/userServices';

const BASE_URL = Config.Base_url;

// ─────────────────────────────────────────────────────────────
// extractS3Key
// ─────────────────────────────────────────────────────────────
export const extractS3Key = (raw) => {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const s = raw.trim();

    // Already a signed URL — skip signing
    if (s.includes('X-Amz-Algorithm')) return null;

    // Full S3 URL — extract key after bucket host
    if (s.startsWith('https://') || s.startsWith('http://')) {
      const match = s.match(/https?:\/\/[^/]+\.amazonaws\.com\/(.+)/);
      if (match && match[1]) return match[1];
      return null;
    }

    // Plain key with slashes e.g. "uploads/2026/4/abc.jpg"
    if (s.includes('/')) return s;
  }

  if (typeof raw === 'object' && raw !== null) {
    if (raw.key) return raw.key;
    if (typeof raw.url === 'string') return extractS3Key(raw.url);
  }

  return null;
};

const isAlreadySigned = (raw) => {
  if (typeof raw === 'string') return raw.includes('X-Amz-Algorithm');
  return false;
};

// ─────────────────────────────────────────────────────────────
// In-memory cache  key → { url, expiresAt }
// TTL 50 min (signed URLs valid for 60 min)
// ─────────────────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 50 * 60 * 1000;

const getCached = (key) => {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { cache.delete(key); return null; }
  return e.url;
};
const setCache = (key, url) => cache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });

// ─────────────────────────────────────────────────────────────
// fetchSignedUrl — calls GET /api/s3/download-url?key=...
// ─────────────────────────────────────────────────────────────
export const fetchSignedUrl = async (key, token) => {
  try {
    console.log('🔗 Fetching signed URL for key:', key.substring(0, 70));

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

    if (!res.ok) {
      console.warn('⚠️ download-url HTTP error:', res.status, 'for key:', key);
      return null;
    }

    const data = await res.json();
    const url  = data?.downloadUrl || null;

    if (url) {
      console.log('✅ Signed download URL received for key:', key.substring(0, 40));
      setCache(key, url);
    } else {
      console.warn('⚠️ No downloadUrl in response for key:', key);
    }

    return url;
  } catch (err) {
    console.error('❌ fetchSignedUrl error:', err.message, 'key:', key);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// resolveOneImage — resolves a single raw image value
// ─────────────────────────────────────────────────────────────
export const resolveOneImage = async (raw, token) => {
  if (!raw) return null;

  if (isAlreadySigned(raw)) return raw;

  const key = extractS3Key(raw);

  if (!key) {
    if (typeof raw === 'string' && raw.startsWith('http')) return raw;
    return null;
  }

  const cached = getCached(key);
  if (cached) return cached;

  if (!token) {
    console.warn('⚠️ No token — cannot sign URL for key:', key);
    return null;
  }

  return fetchSignedUrl(key, token);
};

// ─────────────────────────────────────────────────────────────
// useSignedImageUrls — hook for property image arrays
//
// Usage:
//   const { signedUrls, loading } = useSignedImageUrls(property.images, token);
// ─────────────────────────────────────────────────────────────
const useSignedImageUrls = (rawImages, token) => {
  const [signedUrls, setSignedUrls] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const mountedRef  = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!rawImages || rawImages.length === 0) {
      setSignedUrls([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      setLoading(true);
      console.log(`🖼️  useSignedImageUrls — resolving ${rawImages.length} image(s)...`);

      const results = await Promise.all(
        rawImages.map(raw => resolveOneImage(raw, token))
      );

      const valid = results.filter(Boolean);
      console.log(`✅ useSignedImageUrls — ${valid.length}/${rawImages.length} resolved`);

      if (!cancelled && mountedRef.current) {
        setSignedUrls(valid);
        setLoading(false);
      }
    };

    resolve();
    return () => { cancelled = true; };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rawImages), token]);

  return { signedUrls, loading };
};

// ─────────────────────────────────────────────────────────────
// useSignedProfileImage — hook for a single profile photo
//
// Same pattern as useSignedImageUrls but for one image.
// Fetches the raw key from API directly (bypasses Redux stale
// state), builds S3 key, checks cache, signs if needed.
//
// Usage in ProfileHome:
//   const { signedUrl, loading } = useSignedProfileImage(token, [uploadVersion]);
//
//   <Image source={signedUrl ? { uri: signedUrl } : placeholder} />
//
// deps[] — extra values that trigger a re-fetch.
//          Pass [uploadVersion] so it re-signs after every upload.
// ─────────────────────────────────────────────────────────────
export const useSignedProfileImage = (token, deps = []) => {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const resolve = async () => {
      setLoading(true);

      try {
        // Step 1: fetch raw profileImage key directly from API
        // This bypasses Redux Persist stale state entirely
        const rawImage = await fetchProfileImageKey();
        console.log('[useSignedProfileImage] raw profileImage:', rawImage);

        if (!rawImage || cancelled) {
          setLoading(false);
          return;
        }

        // Step 2: extract just the filename
        //
        // The backend's /s3/download-url prepends "uploads/" automatically.
        // So we only need the filename — no folder prefix.
        //
        // DB value examples and what we extract:
        //   "UUID.jpg"             → "UUID.jpg"           ✅
        //   "profiles/UUID.jpg"    → "UUID.jpg"           ✅ (strip folder)
        //   "https://...s3.../profiles/UUID.jpg" → "UUID.jpg" ✅ (extract from URL)
        let s3Key;

        if (rawImage.startsWith('http') && rawImage.includes('.amazonaws.com/')) {
          // Full S3 URL — extract filename only
          s3Key = rawImage.split('/').pop().split('?')[0];
        } else {
          // "profiles/UUID.jpg" or "UUID.jpg" — always use just the filename
          s3Key = rawImage.split('/').pop();
        }

        if (!s3Key) {
          console.warn('[useSignedProfileImage] cannot build key from:', rawImage);
          setLoading(false);
          return;
        }

        console.log('[useSignedProfileImage] signing key:', s3Key);

        // Step 3: check cache first
        const cached = getCached(s3Key);
        if (cached && !cancelled) {
          console.log('[useSignedProfileImage] cache hit');
          if (mountedRef.current) {
            setSignedUrl(cached);
            setLoading(false);
          }
          return;
        }

        // Step 4: fetch presigned download URL
        const url = await fetchSignedUrl(s3Key, token);

        if (!cancelled && mountedRef.current) {
          if (url) {
            console.log('[useSignedProfileImage] resolved successfully');
          } else {
            console.warn('[useSignedProfileImage] signing failed');
          }
          setSignedUrl(url || null);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[useSignedProfileImage] error:', err.message);
        if (!cancelled && mountedRef.current) {
          setSignedUrl(null);
          setLoading(false);
        }
      }
    };

    resolve();
    return () => { cancelled = true; };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ...deps]);

  return { signedUrl, loading };
};

export default useSignedImageUrls;
