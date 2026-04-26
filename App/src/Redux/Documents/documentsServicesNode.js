// documentsServicesNode.js — Documents Redux Thunks
// ✅ UPDATED: Uses authFetch for auto token refresh on 401

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { authFetch } from '../../utils/authFetch';  // ✅ NEW

// ─────────────────────────────────────────────────────────────
// BASE URL
// ─────────────────────────────────────────────────────────────
const NODE_API_BASE_URL = Config.NODE_API_BASE_URL || Config.Base_url;
const DOCUMENTS_API_URL = `${NODE_API_BASE_URL}/documents`;
const S3_UPLOAD_URL     = `${NODE_API_BASE_URL}/s3/upload-url`;

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
// 7. GET S3 PRESIGNED UPLOAD URL
//    POST /s3/upload-url
//    ✅ Uses authFetch — needs Bearer token
// ─────────────────────────────────────────────────────────────
export const getDocumentUploadUrl = createAsyncThunk(
  'documents/getDocumentUploadUrl',
  async ({ fileName, fileType, folder = 'documents' }, { rejectWithValue }) => {
    try {
      console.log('📄 POST getDocumentUploadUrl:', fileName, fileType);

      const response = await authFetch(S3_UPLOAD_URL, {
        method: 'POST',
        body: JSON.stringify({ fileName, contentType: fileType, folder }),
      });

      const data = await parseResponse(response);
      console.log('✅ getDocumentUploadUrl:', data);

      if (response.ok) {
        return data;
      }

      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to get upload URL');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 8. UPLOAD FILE TO S3 USING PRESIGNED URL
//    PUT presignedUrl (direct S3)
//    ⚠️ Uses raw fetch — S3 presigned URLs don't need Bearer token
// ─────────────────────────────────────────────────────────────
export const uploadFileToS3 = createAsyncThunk(
  'documents/uploadFileToS3',
  async ({ uploadUrl, fileUri, fileType }, { rejectWithValue }) => {
    try {
      console.log('📄 PUT uploadFileToS3:', uploadUrl);

      const fileData = await fetch(fileUri);        // ⚠️ raw fetch for local file
      const blob = await fileData.blob();

      const response = await fetch(uploadUrl, {      // ⚠️ raw fetch for S3 presigned URL
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: blob,
      });

      if (response.ok) {
        console.log('✅ File uploaded to S3');
        return { success: true };
      }

      const msg = `S3 upload failed: HTTP ${response.status}`;
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = handleError(err, 'Failed to upload file');
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);
