// documentsServicesNode.js — Documents Redux Thunks
// ✅ UPDATED: Uses authFetch for auto token refresh on 401
// ✅ NEW: getAllDocumentTemplates — GET /api/documents/getalldocument

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { authFetch } from '../../utils/authFetch';

// ─────────────────────────────────────────────────────────────
// BASE URLS
// ─────────────────────────────────────────────────────────────
const NODE_API_BASE_URL    = Config.NODE_API_BASE_URL || Config.Base_url;
const DOCUMENTS_API_URL    = `${NODE_API_BASE_URL}/documents`;
const S3_UPLOAD_URL        = `${NODE_API_BASE_URL}/s3/upload-url`;

// ⚠️  Adjust if your NODE_API_BASE_URL already includes /api
const GET_ALL_DOCS_URL     = `${NODE_API_BASE_URL}/documents/getalldocument`;
const S3_DOWNLOAD_URL = `${NODE_API_BASE_URL}/s3/download-url`;

// ─────────────────────────────────────────────────────────────
// DOCUMENT TYPE & STATUS ENUMS (from Swagger)
// ─────────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
  'lease_agreement',
  'lease_addendum',
  'notice',
  'inspection_report',
  'property_image',
  'maintenance_report',
  'tenant_document',
  'signed_document',
  'contract',
  'other',
];

// Template types available from GET /api/documents/getalldocument
export const TEMPLATE_TYPES = [
  'lease_agreement',
  'lease_renewal',
  'lease_addendum',
  'move_in_checklist',
  'move_out_checklist',
  'tenant_verification',
  'rent_receipt',
];

export const DOCUMENT_STATUSES = [
  'pending',
  'signed',
  'unsigned',
  'expired',
  'cancelled',
];

// ─────────────────────────────────────────────────────────────
// Helper: parse response (handles JSON + plain text)
// ─────────────────────────────────────────────────────────────
const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

// ─────────────────────────────────────────────────────────────
// Helper: handle API errors consistently
// ─────────────────────────────────────────────────────────────
const handleError = (err, fallback) => {
  if (err.name === 'TypeError' && err.message.includes('fetch')) {
    return 'Network error. Please check your internet connection.';
  }
  return err.message || fallback;
};

// ─────────────────────────────────────────────────────────────
// 0. GET ALL DOCUMENT TEMPLATES — NEW
//    GET /api/documents/getalldocument?type=&propertyId=&tenantId=
//
//    Returns all generated templates (HTML + PDF) when type is
//    omitted, or a single template when type is provided.
//    Both landlord and tenant roles can call this.
// ─────────────────────────────────────────────────────────────
export const getAllDocumentTemplates = createAsyncThunk(
  'documents/getAllDocumentTemplates',
  async ({ type, propertyId, tenantId } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (type)       params.append('type', type);
      if (propertyId) params.append('propertyId', propertyId);
      if (tenantId)   params.append('tenantId', tenantId);

      const url = `${GET_ALL_DOCS_URL}${params.toString() ? `?${params}` : ''}`;
      console.log('📄 GET getAllDocumentTemplates:', url);

      const response = await authFetch(url, { method: 'GET' });
      const data     = await parseResponse(response);
      console.log('✅ getAllDocumentTemplates status:', response.status);

      if (response.ok) {
        // Shape A — already a proper array of flat objects
        if (Array.isArray(data)) return data;

        // Shape B — wrapper: { documents:[], templates:[], items:[] }
        if (data.documents || data.templates || data.items) {
          return data.documents || data.templates || data.items;
        }

        // Shape C — keyed object from GET /documents/getalldocument:
        // { "lease_agreement": { html, pdf }, "lease_renewal": { html, pdf }, ... }
        // Expand each key into a flat object so the UI can map them properly.
        if (typeof data === 'object' && data !== null && !data.message && !data.error) {
          const TEMPLATE_KEYS = [
            'lease_agreement','lease_renewal','lease_addendum',
            'move_in_checklist','move_out_checklist',
            'tenant_verification','rent_receipt',
          ];
          const keys = Object.keys(data);
          // Only treat as Shape C if at least one key matches known template types
          // (prevents accidentally expanding error or meta objects)
          const isTemplateObject = keys.some(k => TEMPLATE_KEYS.includes(k)) || keys.length > 0;

          if (isTemplateObject) {
            const list = keys.map(docType => {
              const content = data[docType] || {};
              return {
                // Flat fields the normalizer will read
                type:          docType,
                document_type: docType,
                html:          content.html        || null,
                pdf:           content.pdf         || null,
                pdf_base64:    content.pdf         || null,   // alias
                status:        content.status      || 'unsigned',
                id:            content.id          || content.documentId || null,
                documentId:    content.id          || content.documentId || null,
                name:          content.name        || content.title      || null,
                description:   content.description || null,
                createdAt:     content.createdAt   || content.created_at || null,
              };
            });
            console.log('✅ getAllDocumentTemplates: ' + list.length + ' templates (Shape C)');
            return list;
          }
        }

        return [];
      }

      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to fetch document templates');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 1. GET DOCUMENTS — list by role, optional filters
//    GET /documents?propertyId=&status=
// ─────────────────────────────────────────────────────────────
export const getDocuments = createAsyncThunk(
  'documents/getDocuments',
  async ({ propertyId, status } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (propertyId) params.append('propertyId', propertyId);
      if (status)     params.append('status', status);

      const url = `${DOCUMENTS_API_URL}${params.toString() ? `?${params}` : ''}`;
      console.log('📄 GET documents:', url);

      const response = await authFetch(url, { method: 'GET' });

      const data = await parseResponse(response);
      console.log('✅ getDocuments response status:', response.status);

      if (response.ok) {
        return Array.isArray(data) ? data : data.documents || data.items || [];
      }

      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to fetch documents');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 2. GET DOCUMENT BY ID
//    GET /documents/:id
// ─────────────────────────────────────────────────────────────
export const getDocumentById = createAsyncThunk(
  'documents/getDocumentById',
  async ({ documentId }, { rejectWithValue }) => {
    try {
      console.log('📄 GET document:', documentId);

      const response = await authFetch(`${DOCUMENTS_API_URL}/${documentId}`, { method: 'GET' });

      const data = await parseResponse(response);
      console.log('✅ getDocumentById:', data);

      if (response.ok) return data;

      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to fetch document');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 3. CREATE DOCUMENT
//    POST /documents
// ─────────────────────────────────────────────────────────────
export const createDocument = createAsyncThunk(
  'documents/createDocument',
  async ({ documentData }, { rejectWithValue }) => {
    try {
      console.log('📄 POST createDocument:', documentData);

      const response = await authFetch(DOCUMENTS_API_URL, {
        method: 'POST',
        body: JSON.stringify(documentData),
      });

      const data = await parseResponse(response);
      console.log('✅ createDocument:', data);

      if (response.ok || response.status === 201) {
        Toast.show('Document created successfully');
        return data;
      }

      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to create document');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 4. UPDATE DOCUMENT
//    PATCH /documents/:id
// ─────────────────────────────────────────────────────────────
export const updateDocument = createAsyncThunk(
  'documents/updateDocument',
  async ({ documentId, updates }, { rejectWithValue }) => {
    try {
      console.log('📄 PATCH updateDocument:', documentId, updates);

      const response = await authFetch(`${DOCUMENTS_API_URL}/${documentId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const data = await parseResponse(response);
      console.log('✅ updateDocument:', data);

      if (response.ok) {
        Toast.show('Document updated successfully');
        return { ...data, documentId };
      }

      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to update document');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 5. DELETE DOCUMENT
//    DELETE /documents/:id
// ─────────────────────────────────────────────────────────────
export const deleteDocument = createAsyncThunk(
  'documents/deleteDocument',
  async ({ documentId }, { rejectWithValue }) => {
    try {
      console.log('📄 DELETE document:', documentId);

      const response = await authFetch(`${DOCUMENTS_API_URL}/${documentId}`, { method: 'DELETE' });

      const data = await parseResponse(response);
      console.log('✅ deleteDocument:', data);

      if (response.ok) {
        Toast.show('Document deleted successfully');
        return { documentId };
      }

      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to delete document');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 6. SIGN DOCUMENT (tenant only)
//    POST /documents/:id/sign
// ─────────────────────────────────────────────────────────────
export const signDocument = createAsyncThunk(
  'documents/signDocument',
  async ({ documentId, signature, signerName, ipAddress, userAgent }, { rejectWithValue }) => {
    try {
      console.log('📄 POST signDocument:', documentId);

      const body = {
        documentId,
        signature,
        ...(signerName  && { signerName }),
        ...(ipAddress   && { ipAddress }),
        ...(userAgent   && { userAgent }),
      };

      const response = await authFetch(`${DOCUMENTS_API_URL}/${documentId}/sign`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await parseResponse(response);
      console.log('✅ signDocument:', data);

      if (response.ok) {
        Toast.show('Document signed successfully');
        return { ...data, documentId };
      }

      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to sign document');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS — same pattern as properties/servicesNode.js
// ─────────────────────────────────────────────────────────────

// Step 1 — get a presigned upload URL from the backend
// POST /s3/upload-url  →  { uploadUrl, fileUrl }
const getDocSignedUrl = async (fileName, fileType, folder = 'uploads') => {
  try {
    console.log('🔑 [Docs] Getting signed URL for:', fileName, '| folder:', folder);

    const response = await authFetch(S3_UPLOAD_URL, {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        contentType: fileType,   // MUST match the PUT header below
        folder,                  // 'documents' for PDFs, 'uploads' for signatures
      }),
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      console.error('❌ [Docs] Signed URL error:', response.status, data?.message);
      return null;
    }

    console.log('✅ [Docs] Signed URL received — fileUrl:', data.fileUrl);
    return { uploadUrl: data.uploadUrl, fileUrl: data.fileUrl };
  } catch (err) {
    console.error('❌ [Docs] getDocSignedUrl error:', err.message);
    return null;
  }
};

// Step 2 — PUT file blob directly to S3 presigned URL
// ⚠️ Raw fetch only — S3 presigned URLs must NOT have Authorization header
const uploadDocToS3 = async (fileUri, uploadUrl, contentType) => {
  try {
    console.log('📤 [Docs] Fetching blob from:', fileUri.substring(0, 60));

    // Convert local URI or base64 data URI → Blob
    const fileResponse = await fetch(fileUri);
    const blob         = await fileResponse.blob();

    console.log('📦 [Docs] Blob — size:', blob.size, 'type:', blob.type);

    const result = await fetch(uploadUrl, {
      method:  'PUT',
      headers: { 'Content-Type': contentType },  // MUST match what was sent to /s3/upload-url
      body:    blob,
    });

    if (!result.ok) {
      const errText = await result.text();
      console.error('❌ [Docs] S3 PUT failed:', result.status, errText.substring(0, 200));
      return false;
    }

    console.log('✅ [Docs] S3 upload successful');
    return true;
  } catch (err) {
    console.error('❌ [Docs] uploadDocToS3 error:', err.message);
    return false;
  }
};

// Step 3 — full single-file upload: getSignedUrl → uploadToS3
// Returns permanent S3 fileUrl, or null on failure
const handleDocUpload = async (fileUri, fileName, fileType, folder = 'uploads') => {
  const signedData = await getDocSignedUrl(fileName, fileType, folder);
  if (!signedData) return null;

  const { uploadUrl, fileUrl } = signedData;
  const success = await uploadDocToS3(fileUri, uploadUrl, fileType);

  if (!success) return null;

  console.log('🎉 [Docs] File available at:', fileUrl);
  return fileUrl;
};

// ─────────────────────────────────────────────────────────────
// 7. UPLOAD DOCUMENT FILE (PDF or signature image)
//    Returns the permanent S3 fileUrl string, or null on failure.
//
//    Usage:
//      const fileUrl = await uploadDocumentFile({
//        fileUri:  'file:///path/to/file.pdf',   // local URI or base64 data URI
//        fileName: 'lease_renewal.pdf',
//        fileType: 'application/pdf',
//        folder:   'documents',                  // 'documents' | 'uploads'
//      });
// ─────────────────────────────────────────────────────────────
export const uploadDocumentFile = async ({ fileUri, fileName, fileType, folder = 'uploads' }) => {
  if (!fileUri || !fileName || !fileType) {
    console.error('❌ [Docs] uploadDocumentFile — missing required params');
    return null;
  }
  return handleDocUpload(fileUri, fileName, fileType, folder);
};

// Redux thunk wrappers (kept for backward-compat with existing dispatches)
export const getDocumentUploadUrl = createAsyncThunk(
  'documents/getDocumentUploadUrl',
  async ({ fileName, fileType, folder = 'uploads' }, { rejectWithValue }) => {
    const result = await getDocSignedUrl(fileName, fileType, folder);
    if (result) return result;
    return rejectWithValue('Failed to get upload URL');
  }
);

export const uploadFileToS3 = createAsyncThunk(
  'documents/uploadFileToS3',
  async ({ uploadUrl, fileUri, fileType }, { rejectWithValue }) => {
    const success = await uploadDocToS3(fileUri, uploadUrl, fileType);
    if (success) return { success: true };
    return rejectWithValue('S3 upload failed');
  }
);

// ─────────────────────────────────────────────────────────────
// GET PRESIGNED DOWNLOAD URL for a stored S3 document
// GET /s3/download-url?key=documents/UUID.pdf
//
// If the URL is NOT an S3 URL (e.g. CDN, already-signed),
// it is returned directly without hitting the backend.
// ─────────────────────────────────────────────────────────────
export const getDocumentDownloadUrl = createAsyncThunk(
  'documents/getDocumentDownloadUrl',
  async ({ fileUrl }, { rejectWithValue }) => {
    try {
      if (!fileUrl) return rejectWithValue('No fileUrl provided');
      if (!fileUrl.includes('.amazonaws.com/')) {
        return fileUrl;
      }

      const key = fileUrl.split('.amazonaws.com/')[1].split('?')[0];

      const response = await authFetch(
        `${S3_DOWNLOAD_URL}?key=${encodeURIComponent(key)}`,
        { method: 'GET' }
      );
      const data = await parseResponse(response);

      if (response.ok) {
        const url = data?.signedUrl || data?.url || data?.downloadUrl || null;
        return url;
      }
      return rejectWithValue(data?.message || `HTTP ${response.status}`);
    } catch (err) {
      return rejectWithValue(handleError(err, 'Failed to get download URL'));
    }
  }
);
