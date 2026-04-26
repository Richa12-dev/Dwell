/**
 * maintenanceServices.js
 *
 * Redux Toolkit async thunks for the Node.js / NestJS maintenance API.
 * Endpoint base: /maintenance-tickets
 *
 * S3 Upload flow — mirrors the WORKING properties pattern exactly:
 *   1. POST /api/s3/upload-url  → get ONE pre-signed PUT URL per file
 *   2. fetch(localUri) → blob → PUT blob to uploadUrl
 *   3. Collect returned fileUrls → pass as mediaFiles[].url in ticket payload
 *
 * ✅ No RNFS, no base64, no ArrayBuffer, no batch endpoint
 * ✅ Blob via fetch(fileUri) — React Native supports file:// fetch natively
 * ✅ Content-Type is hardcoded to 'image/jpeg' in BOTH the sign request
 *    AND the S3 PUT header so they always match (same trick as properties)
 * ✅ File names are sanitised: .heic/.heif/.webp extensions → .jpg before signing
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { authFetch } from '../../utils/authFetch';  // ✅ NEW

// ─── Base URLs ────────────────────────────────────────────────────────────────
const BASE_URL   = Config.Base_url;
const MAINT_URL  = `${BASE_URL}/maintenance-tickets`;
const S3_API_URL = `${BASE_URL}/s3`;

// ─── Valid API enum values ────────────────────────────────────────────────────
export const MAINTENANCE_CATEGORIES = [
  'Plumbing', 'Electrical', 'HVAC', 'Appliance',
  'Pest Control', 'Structural', 'Landscaping',
  'Security', 'Cleaning', 'Other',
];
export const MAINTENANCE_URGENCY = ['low', 'medium', 'high', 'emergency'];
export const MAINTENANCE_STATUS  = ['pending', 'in_progress', 'completed', 'cancelled'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safeJson = async (response, fallback = {}) => {
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) return response.json();
  try { return JSON.parse(await response.text()); } catch { return fallback; }
};

const LOGIN_KEY = 'loginData';

const getToken = (getState, provided) => {
  if (provided) return provided;
  const s = getState()[LOGIN_KEY] || {};
  return s.accessToken || s.token || null;
};

const getTenantId = (getState) => {
  const s = getState()[LOGIN_KEY] || {};
  return s.userData?.tenantId || null;
};

const authHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type':  'application/json',
  'Accept':        'application/json',
});

// ═════════════════════════════════════════════════════════════════════════════
//
//  S3 MEDIA UPLOAD  —  mirrors the WORKING properties pattern exactly
//
//  Properties works because it:
//    1. Uses /s3/upload-url  (single file, NOT batch)
//    2. Renames .heic/.heif/.webp → .jpg  BEFORE signing
//    3. Hardcodes contentType: 'image/jpeg' in BOTH sign request + PUT header
//    4. Uses raw Blob body — no URL param stripping needed
//
//  We do exactly the same for maintenance media.
//
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Sanitise a filename:
 *  - strips query strings
 *  - replaces all image extensions (.heic/.heif/.webp/.jpeg/.jpg) with .jpg
 *  - audio files keep their extension (.mp4, .m4a, .wav)
 */
const sanitiseFileName = (uri) => {
  const raw = uri.split('/').pop().split('?')[0] || `media_${Date.now()}`;
  // Audio — keep as-is
  if (/\.(mp4|m4a|wav|aac)$/i.test(raw)) return raw;
  // All image formats → .jpg so the signed contentType is always image/jpeg
  return raw.replace(/\.(heic|heif|jpeg|jpg|png|gif|webp|bmp|tiff?)$/i, '') + '.jpg';
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Get a pre-signed upload URL from the backend.
//
// Uses /s3/upload-url (single file endpoint) — SAME as properties.
// Always signs 'image/jpeg' for photos, 'audio/mp4' for voice notes.
// ─────────────────────────────────────────────────────────────────────────────
const getSignedUrl = async (fileName, contentType, token) => {
  try {
    console.log('🔑 [S3] Getting signed URL — file:', fileName, '| type:', contentType);

    const response = await fetch(`${S3_API_URL}/upload-url`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName,
        contentType,       // 'image/jpeg' for photos, 'audio/mp4' for voice
        folder:    'uploads',
        expiresIn: 3600,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [S3] Signed URL error:', response.status, data?.message);
      return null;
    }

    console.log('✅ [S3] Signed URL received — fileUrl:', data.fileUrl);
    return { uploadUrl: data.uploadUrl, fileUrl: data.fileUrl };
  } catch (err) {
    console.error('❌ [S3] getSignedUrl error:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Upload a single file to S3 using the pre-signed PUT URL.
//
// fetch(fileUri) → Blob → PUT to S3.
// Content-Type MUST match what was sent to /s3/upload-url.
// No URL param stripping needed — /upload-url generates clean presigned URLs.
// ─────────────────────────────────────────────────────────────────────────────
const uploadToS3 = async (fileUri, uploadUrl, contentType) => {
  try {
    const fileResponse = await fetch(fileUri);
    const blob         = await fileResponse.blob();
    console.log('📦 [S3] Blob — size:', blob.size, 'bytes');

    const result = await fetch(uploadUrl, {
      method:  'PUT',
      headers: { 'Content-Type': contentType },
      body:    blob,
    });

    if (!result.ok) {
      const errText = await result.text();
      console.error('❌ [S3] PUT failed:', result.status, errText.substring(0, 300));
      throw new Error(`S3 upload failed (${result.status})`);
    }

    console.log('✅ [S3] Upload successful');
    return { success: true, size: blob.size };   // ✅ return size
  } catch (err) {
    console.error('❌ [S3] uploadToS3 error:', err.message);
    return { success: false, size: 0 };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Full single-file flow: sign → upload → return S3 fileUrl.
// Returns the permanent CDN fileUrl string, or null on failure.
// ─────────────────────────────────────────────────────────────────────────────
const handleSingleUpload = async (file, token) => {
    const signed = await getSignedUrl(file.fileName, file.contentType, token);
     if (!signed) return null;

     const result = await uploadToS3(file.uri, signed.uploadUrl, file.contentType);
     if (!result.success) return null;

     // ✅ Extract just the filename — same pattern as profile/property images
     // signed.fileUrl = "https://...s3.amazonaws.com/uploads/UUID.jpg"
     // stored         = "UUID.jpg"
     const fileName = signed.fileUrl.split('/').pop().split('?')[0];
     console.log('🎉 [S3] File uploaded — saving filename:', fileName);
     return { fileName, size: result.size };
};

// ─────────────────────────────────────────────────────────────────────────────
// Main orchestrator: upload all local photos + optional voice note.
//
// Returns: [{ url, type, name, size }]  — ready for the ticket API payload
// Already-remote https:// URLs pass through unchanged (edit/re-submit mode).
// ─────────────────────────────────────────────────────────────────────────────
const uploadMediaFiles = async (photos = [], voiceNote = null, token) => {
  const remoteFileNames = [];
  const localFiles      = [];

  // ── Photos ─────────────────────────────────────────────────────────────────
  for (const p of photos) {
    if (!p?.uri) continue;

    if (p.uri.startsWith('http://') || p.uri.startsWith('https://')) {
      // ✅ Already-uploaded — extract filename only
      // "https://...s3.amazonaws.com/uploads/UUID.jpg?X-Amz-..." → "UUID.jpg"
      const fileName = p.uri.split('/').pop().split('?')[0];
      if (fileName) remoteFileNames.push(fileName);
    } else {
      localFiles.push({
        uri:         p.uri,
        fileName:    sanitiseFileName(p.uri),
        contentType: 'image/jpeg',
        fileSize:    p.fileSize || 0,
      });
    }
  }

  // ── Voice note ─────────────────────────────────────────────────────────────
  if (voiceNote?.uri) {
    if (voiceNote.uri.startsWith('http://') || voiceNote.uri.startsWith('https://')) {
      const fileName = voiceNote.uri.split('/').pop().split('?')[0];
      if (fileName) remoteFileNames.push(fileName);
    } else {
      localFiles.push({
        uri:         voiceNote.uri,
        fileName:    voiceNote.fileName || `voice_${Date.now()}.mp4`,
        contentType: 'audio/mp4',
        fileSize:    0,
      });
    }
  }

  if (localFiles.length === 0) {
    console.log('📎 [S3] No local files. Remote filenames:', remoteFileNames);
    return remoteFileNames;
  }

  console.log(`📎 [S3] Uploading ${localFiles.length} file(s)...`);

  const uploadedFileNames = [];

  for (let i = 0; i < localFiles.length; i++) {
    const file = localFiles[i];
    console.log(`\n  [${i + 1}/${localFiles.length}] ${file.fileName}`);

    const uploaded = await handleSingleUpload(file, token);

    if (uploaded) {
      uploadedFileNames.push(uploaded.fileName);
    } else {
      console.warn(`  ⚠️ File ${i + 1} failed — skipping`);
      Toast.show(`Warning: "${file.fileName}" could not be uploaded`);
    }
  }

  console.log(`\n📊 [S3] ${uploadedFileNames.length}/${localFiles.length} uploaded`);

  // Returns ["UUID1.jpg", "voice_123.mp4", ...] — filenames only
  return [...remoteFileNames, ...uploadedFileNames];
};

// ═════════════════════════════════════════════════════════════════════════════
// THUNKS
// ═════════════════════════════════════════════════════════════════════════════

// ─── 1. Create Maintenance Ticket ─────────────────────────────────────────────
export const createMaintenanceRequest = createAsyncThunk(
  'maintenance/createRequest',
  async (params, { getState, rejectWithValue }) => {
    try {
      const {
        tenantId,
        propertyId,
        unitId,
        title,
        description,
        category,
        urgency,
        location,
        status      = 'pending',
        scheduledDate,
        aiSummary,
        photos    = [],
        voiceNote = null,
        token: providedToken,
      } = params;

      const token = getToken(getState, providedToken);

      if (!token)               return rejectWithValue('Authentication token is required.');
      if (!tenantId)            return rejectWithValue('tenantId is required.');
      if (!title?.trim())       return rejectWithValue('title is required.');
      if (!description?.trim()) return rejectWithValue('description is required.');
      if (!MAINTENANCE_CATEGORIES.includes(category))
        return rejectWithValue(`category must be one of: ${MAINTENANCE_CATEGORIES.join(', ')}`);
      if (!MAINTENANCE_URGENCY.includes(urgency))
        return rejectWithValue(`urgency must be one of: ${MAINTENANCE_URGENCY.join(', ')}`);

      // ── Step 1: Upload photos + voice note to S3 ──────────────────────────
      let mediaFiles = [];
      if (photos.length > 0 || voiceNote) {
        console.log('📎 Uploading media before creating ticket...');
        mediaFiles = await uploadMediaFiles(photos, voiceNote, token);
        console.log('📎 Media upload complete. Files saved:', mediaFiles.length);
      }

      // ── Step 2: Build payload with filenames ──────────────────────────────
      const payload = {
        tenantId,
        ...(propertyId    && { propertyId }),
        ...(unitId        && { unitId }),
        title:       title.trim(),
        description: description.trim(),
        category,
        urgency,
        ...(location      && { location: location.trim() }),
        status,
        ...(scheduledDate && { scheduledDate }),
        ...(aiSummary     && { aiSummary }),

        // ✅ mediaFiles is now ["UUID1.jpg", "voice.mp4"] — filenames only
        // Backend stores them; display signing is handled by useSignedImageUrls
        ...(mediaFiles.length > 0 && { mediaFiles }),
      };

      console.log('📤 [createMaintenanceRequest] POST', MAINT_URL);

      const response = await authFetch(MAINT_URL, {
        method:  'POST',
        headers: authHeaders(token),
        body:    JSON.stringify(payload),
      });

      const data = await safeJson(response);
      console.log('📥 [createMaintenanceRequest] status:', response.status);

      if (response.ok || response.status === 201) {
        Toast.show('Maintenance request created successfully!');
        return data;
      }

      const msg = data?.message || `Failed to create ticket (${response.status})`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      console.error('❌ [createMaintenanceRequest]', err);
      Toast.show(err.message || 'Network error, try again.');
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

// ─── 2. List All Maintenance Tickets ──────────────────────────────────────────
// ─── 2. List All Maintenance Tickets ──────────────────────────────────────────
export const getMaintenanceRequests = createAsyncThunk(
  'maintenance/getRequests',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      // ✅ Accept both landlord_id and tenantId
      const {
        token: providedToken,
        tenantId: providedTenantId,
        landlord_id,          // ✅ ADD THIS
      } = params;
      
      const token    = getToken(getState, providedToken);
      const tenantId = providedTenantId || getTenantId(getState);

      if (!token) return rejectWithValue('Authentication token missing.');

      // ✅ Build URL based on who is calling
      let url = MAINT_URL;
      if (landlord_id) {
        url = `${MAINT_URL}?landlord_id=${landlord_id}`;  // landlord view
      } else if (tenantId) {
        url = `${MAINT_URL}?tenantId=${tenantId}`;         // tenant view
      }
      // else: no filter = returns ALL (only safe for admin role)

      console.log('📡 [getMaintenanceRequests] GET', url);

      const response = await authFetch(url, { method: 'GET', headers: authHeaders(token) });
      const data     = await safeJson(response, { items: [] });

      if (response.ok) {
        const items = Array.isArray(data) ? data : (data?.items || []);
        console.log(`✅ Fetched ${items.length} tickets`);
        return items;
      }

      const msg = data?.message || 'Failed to fetch maintenance list';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      console.error('❌ [getMaintenanceRequests]', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

// ─── 3. Get Single Ticket Details ─────────────────────────────────────────────
export const getMaintenanceDetails = createAsyncThunk(
  'maintenance/getDetails',
  async ({ id, ticket_id, token: providedToken }, { getState, rejectWithValue }) => {
    try {
      const ticketId = id || ticket_id;
      const token    = getToken(getState, providedToken);

      if (!ticketId) return rejectWithValue('Ticket ID is required.');
      if (!token)    return rejectWithValue('Authentication token missing.');

      const url = `${MAINT_URL}/${ticketId}`;
      console.log('📡 [getMaintenanceDetails] GET', url);

      const response = await authFetch(url, { method: 'GET', headers: authHeaders(token) });
      const data     = await safeJson(response);

      if (response.ok) return data;

      const msg = data?.message || 'Failed to fetch ticket details';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      console.error('❌ [getMaintenanceDetails]', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

// ─── 4. Update / Patch Maintenance Ticket ─────────────────────────────────────
export const updateMaintenanceStatus = createAsyncThunk(
  'maintenance/updateStatus',
  async (params, { getState, rejectWithValue }) => {
    try {
      const {
        id, ticket_id, status, urgency, category,
        title, description, location, scheduledDate,
        aiSummary, tenantId, unitId,
        token: providedToken,
      } = params;

      const ticketId = id || ticket_id;
      const token    = getToken(getState, providedToken);

      if (!ticketId) return rejectWithValue('Ticket ID is required.');
      if (!token)    return rejectWithValue('Authentication token missing.');

      const body = {};
      if (status        !== undefined) body.status        = status;
      if (urgency       !== undefined) body.urgency       = urgency;
      if (category      !== undefined) body.category      = category;
      if (title         !== undefined) body.title         = title;
      if (description   !== undefined) body.description   = description;
      if (location      !== undefined) body.location      = location;
      if (scheduledDate !== undefined) body.scheduledDate = scheduledDate;
      if (aiSummary     !== undefined) body.aiSummary     = aiSummary;
      if (tenantId      !== undefined) body.tenantId      = tenantId;
      if (unitId        !== undefined) body.unitId        = unitId;

      if (Object.keys(body).length === 0)
        return rejectWithValue('At least one field to update is required.');

      const url = `${MAINT_URL}/${ticketId}`;
      console.log('📡 [updateMaintenanceStatus] PATCH', url, body);

      const response = await authFetch(url, {
        method:  'PATCH',
        headers: authHeaders(token),
        body:    JSON.stringify(body),
      });
      const data = await safeJson(response);

      if (response.ok) { Toast.show('Ticket updated successfully!'); return data; }

      const msg = data?.message || 'Failed to update ticket';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      console.error('❌ [updateMaintenanceStatus]', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

// ─── 5. Get Tickets by Status ──────────────────────────────────────────────────
export const getMaintenanceByStatus = createAsyncThunk(
  'maintenance/getByStatus',
  async ({ status, token: providedToken }, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState, providedToken);
      if (!status)                              return rejectWithValue('status is required.');
      if (!MAINTENANCE_STATUS.includes(status)) return rejectWithValue(`status must be one of: ${MAINTENANCE_STATUS.join(', ')}`);
      if (!token)                               return rejectWithValue('Authentication token missing.');

      const url      = `${MAINT_URL}/by-status?status=${encodeURIComponent(status)}`;
      const response = await authFetch(url, { method: 'GET', headers: authHeaders(token) });
      const data     = await safeJson(response, []);

      if (response.ok) return Array.isArray(data) ? data : [];

      const msg = data?.message || `Failed to fetch tickets with status "${status}"`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      console.error('❌ [getMaintenanceByStatus]', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

// ─── 6. Get Maintenance Statistics ────────────────────────────────────────────
export const getMaintenanceStatistics = createAsyncThunk(
  'maintenance/getStatistics',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState, params.token);
      if (!token) return rejectWithValue('Authentication token missing.');

      const url      = `${MAINT_URL}/statistics`;
      const response = await authFetch(url, { method: 'GET', headers: authHeaders(token) });
      const data     = await safeJson(response);

      if (response.ok) return data;

      const msg = data?.message || 'Failed to fetch statistics';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      console.error('❌ [getMaintenanceStatistics]', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

// ─── 7. Get Tickets by Tenant ─────────────────────────────────────────────────
export const getMaintenanceByTenant = createAsyncThunk(
  'maintenance/getByTenant',
  async ({ tenantId, token: providedToken }, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState, providedToken);
      if (!tenantId) return rejectWithValue('tenantId is required.');
      if (!token)    return rejectWithValue('Authentication token missing.');

      const url      = `${MAINT_URL}/tenant/${tenantId}`;
      const response = await fetch(url, { method: 'GET', headers: authHeaders(token) });
      const data     = await safeJson(response, []);

      if (response.ok) return Array.isArray(data) ? data : [];

      const msg = data?.message || 'Failed to fetch tenant tickets';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      console.error('❌ [getMaintenanceByTenant]', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

// ─── 8. Get Signed Download URL (for viewing S3 images in detail screens) ─────
/**
 * POST /api/s3/signed-url
 * Use this to get a readable URL for a private S3 file.
 * Pass the S3 key (e.g. 'uploads/2026/4/file.jpg') — NOT the full URL.
 */
export const getSignedDownloadUrl = async (token, key) => {
  if (!token || !key) throw new Error('token and key are required');

  console.log('🔗 [S3] Fetching signed download URL for key:', key);

  const response = await authFetch(`${S3_API_URL}/signed-url`, {
    method:  'POST',
    headers: authHeaders(token),
    body:    JSON.stringify({ key }),
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new Error(`Signed URL request failed: ${data?.message || response.status}`);
  }

  const signedUrl = data?.url || data?.signedUrl || data?.downloadUrl;
  if (!signedUrl) throw new Error('No signed URL in response');

  console.log('✅ [S3] Signed download URL ready');
  return signedUrl;
};
