// src/Redux/ContractorServices/services.js

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { navigate, resetRoot } from '../../navigation/RouterServices';

// ─── Base URLs ────────────────────────────────────────────────────────────────

const CONTRACTOR_JOBS_URL =
  'https://b3bhds2qt5.execute-api.us-east-1.amazonaws.com/prod/contractor/jobs';
const CONTRACTOR_SERVICES_URL =
  'https://3hc254p0l3.execute-api.us-east-1.amazonaws.com/prod/contractor/services';
const JOBS_BASE_URL =
  'https://b3bhds2qt5.execute-api.us-east-1.amazonaws.com/prod/jobs';
const S3_BASE_URL =
  'https://dwell-maintenance-media.s3.amazonaws.com/';

const BASE_URL = Config.Base_url;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safely parse JSON from any response, regardless of Content-Type header.
 */
const parseSafeJSON = async (response) => {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { message: text || 'Invalid server response' };
    }
  } catch {
    return { message: 'Invalid server response' };
  }
};

/**
 * Extract auth token from Redux state.
 * Checks multiple possible state shapes for compatibility.
 */
const getToken = (getState) => {
  const s = getState();
  return (
    s.loginData?.idToken     ||
    s.loginData?.accessToken ||
    s.loginData?.token       ||
    s.login?.idToken         ||
    s.login?.accessToken     ||
    s.login?.token           ||
    null
  );
};


const isBodyError = (data) => {
  if (!data) return false;
  const msg = (data.message || '').toLowerCase();
  // Only treat as error if there's an explicit error string AND no ticket/job in response
  const hasJobData = !!(data.ticket || data.job || data.ticket_id);
  if (hasJobData) return false; // has real job data → definitely success
  return msg.startsWith('failed') || msg.includes('error occurred') || msg === 'internal server error';
};

/**
 * Normalize image attachments from any API shape into a flat array of full URLs.
 */
const normalizeImages = (job) => {
  const raw =
    job?.image_urls                                   ||
    job?.attachments?.photos                          ||
    job?.attachments?.image_urls                      ||
    job?.media?.photos                                ||
    job?.media?.image_urls                            ||
    job?.contractor_job_snapshot?.image_urls          ||
    job?.contractor_job_snapshot?.attachments?.photos ||
    [];

  return raw
    .map((item) => {
      const src = typeof item === 'string' ? item : item?.url || item?.uri || null;
      if (!src) return null;
      if (src.startsWith('http://') || src.startsWith('https://')) return src;
      return `${S3_BASE_URL}${src}`;
    })
    .filter(Boolean);
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

/**
 * Fetch all contractor jobs with optional query filters.
 */
export const getAllContractorJobs = createAsyncThunk(
  'contractor/getAllJobs',
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication token missing.');

      const params = new URLSearchParams();
      if (filters.limit)           params.append('limit',            filters.limit.toString());
      if (filters.offered_only)    params.append('offered_only',     '1');
      if (filters.unassigned_only) params.append('unassigned_only',  '1');
      if (filters.status)          params.append('status',           filters.status);

      const qs  = params.toString();
      const url = qs ? `${CONTRACTOR_JOBS_URL}?${qs}` : CONTRACTOR_JOBS_URL;
      console.log('📡 Fetching All Contractor Jobs:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      const data = await parseSafeJSON(response);

      if (response.ok) {
        const jobs = data.items || data.jobs || (Array.isArray(data) ? data : []);
        console.log('✅ Parsed Jobs Count:', jobs.length);
        return {
          jobs,
          count:                    data.count  || jobs.length,
          filters:                  data.filters || filters,
          services_used_for_filter: data.services_used_for_filter || [],
        };
      }

      return rejectWithValue(data?.message || 'Failed to fetch jobs');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/**
 * Fetch only jobs that have been offered (but not yet accepted) by this contractor.
 */
export const getOfferedJobs = createAsyncThunk(
  'contractor/getOfferedJobs',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication token missing.');

      const url = `${CONTRACTOR_JOBS_URL}?offered_only=1`;
      console.log('📡 Fetching Offered Jobs:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      const data = await parseSafeJSON(response);

      if (response.ok) {
        const jobs = data.items || data.jobs || [];
        return { jobs, count: data.count || jobs.length };
      }

      return rejectWithValue(data?.message || 'Failed to fetch offered jobs');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/**
 * Fetch unassigned jobs available for this contractor to pick up.
 */
export const getUnassignedJobs = createAsyncThunk(
  'contractor/getUnassignedJobs',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication token missing.');

      const url = `${CONTRACTOR_JOBS_URL}?unassigned_only=1`;
      console.log('📡 Fetching Unassigned Jobs:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      const data = await parseSafeJSON(response);

      if (response.ok) {
        const jobs = data.items || data.jobs || [];
        return { jobs, count: data.count || jobs.length };
      }

      return rejectWithValue(data?.message || 'Failed to fetch unassigned jobs');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/**
 * Submit the contractor's list of service categories.
 */


export const submitContractorServices = createAsyncThunk(
  'contractor/submitServices',
  async ({ services, token: providedToken, userId: providedUserId }, { getState, rejectWithValue }) => {
    try {
      const token  = providedToken  || getToken(getState);
      const userId = providedUserId || getUserId(getState);
 
      if (!token) return rejectWithValue('Authentication token missing.');
      if (!Array.isArray(services) || services.length === 0)
        return rejectWithValue('Please select at least one service.');
 
      if (!userId) {
        // No userId means we can't PATCH — still succeed locally so the user isn't blocked
        console.warn(' userId not found in state — skipping PATCH /users/:id');
        Toast.show('Services saved locally. Please update your profile.');
        return { selectedServices: services };
      }
 
      console.log(` PATCH /users/${userId}  serviceType:`, services[0]);
 
      const res  = await fetch(`${BASE_URL}/users/${userId}`, {
        method:  'PATCH',
        headers: authHeaders(token),
        body:    JSON.stringify({ serviceType: services[0] }),
      });
      const data = await parseSafeJSON(res);
 
      if (res.ok) {
        console.log(' PATCH /users/:id success');
        Toast.show('Services registered successfully!');
        return { selectedServices: services, user: data };
      }
 
      const msg = data?.message || 'Failed to submit services';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);
 
 
// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTOR DOCUMENTS  —  UploadDocuments screen
// ═══════════════════════════════════════════════════════════════════════════════
 
/**
 * Upload insurance + license documents for contractor certification.
 *
 * Per document:
 *   1. POST /users/documents/upload-url  → { uploadUrl, fileUrl, key }
 *   2. PUT  {uploadUrl}                  → stream blob directly to S3
 *
 * Then PATCH /users/:id to attach the resulting URLs to the user record.
 *
 * @param {object} insuranceFile  - DocumentPicker { uri, type, name }
 * @param {object} licenseFile    - DocumentPicker { uri, type, name }
 * @param {string} [token]        - override
 * @param {string} [userId]       - override
 */
export const submitContractorDocuments = createAsyncThunk(
  'contractor/submitDocuments',
  async ({ insuranceFile, licenseFile, token: providedToken, userId: providedUserId },
    { getState, rejectWithValue }) => {
    try {
      const token  = providedToken  || getToken(getState);
      const userId = providedUserId || getUserId(getState);
 
      if (!token) return rejectWithValue('Authentication token missing.');
      if (!insuranceFile || !licenseFile)
        return rejectWithValue('Both insurance and license files are required.');
 
      // ── Upload one file: presigned URL → S3 PUT ────────────────────────────
      const uploadDocument = async (file, label) => {
        console.log(`\n [${label}] Requesting presigned URL: ${file.name}`);
 
        // 1. Get presigned URL
        const urlRes  = await fetch(`${BASE_URL}/users/documents/upload-url`, {
          method:  'POST',
          headers: authHeaders(token),
          body:    JSON.stringify({ fileName: file.name, contentType: file.type, folder: 'documents' }),
        });
        const urlData = await parseSafeJSON(urlRes);
        if (!urlRes.ok) throw new Error(urlData?.message || `Presigned URL failed for ${label}`);
 
        const { uploadUrl, fileUrl } = urlData;
        console.log(` [${label}] Presigned URL received. key: ${urlData.key}`);
 
        // 2. PUT file blob to S3
        const fileBlob = await (await fetch(file.uri)).blob();
        const s3Res    = await fetch(uploadUrl, {
          method:  'PUT',
          headers: { 'Content-Type': file.type },
          body:    fileBlob,
        });
        if (!s3Res.ok) {
          const errText = await s3Res.text().catch(() => '');
          throw new Error(`S3 upload failed for ${label} (${s3Res.status}): ${errText}`);
        }
 
        console.log(` [${label}] S3 upload complete. URL: ${fileUrl}`);
        return fileUrl;
      };
 
      const insuranceUrl = await uploadDocument(insuranceFile, 'Insurance');
      const licenseUrl   = await uploadDocument(licenseFile,   'License');
 
      // ── PATCH /users/:id with document URLs ───────────────────────────────
      if (userId) {
        try {
          const patchRes = await fetch(`${BASE_URL}/users/${userId}`, {
            method:  'PATCH',
            headers: authHeaders(token),
            body:    JSON.stringify({ insuranceDocumentUrl: insuranceUrl, licenseDocumentUrl: licenseUrl }),
          });
          const patchData = await parseSafeJSON(patchRes);
          if (patchRes.ok) {
            console.log(' PATCH /users/:id with document URLs:', patchData);
          } else {
            console.warn('PATCH /users/:id failed (soft):', patchData?.message);
          }
        } catch (patchErr) {
          console.warn(' PATCH /users/:id error (soft):', patchErr.message);
        }
      }
 
      Toast.show('Documents submitted successfully!');
      return { insuranceUrl, licenseUrl, status: 'pending_review' };
    } catch (err) {
      console.error('❌ submitContractorDocuments:', err.message);
      Toast.show(err.message || 'Document upload failed');
      return rejectWithValue(err.message);
    }
  }
);

/**
 * Fetch a single contractor job by ticket_id.
 * Normalises image URLs so downstream code has a single consistent key.
 */
export const getContractorJob = createAsyncThunk(
  'contractor/getJob',
  async ({ ticket_id }, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!ticket_id) return rejectWithValue('Ticket ID is required.');
      if (!token)     return rejectWithValue('Authentication token missing.');

      const url = `${CONTRACTOR_JOBS_URL}/${ticket_id}`;
      console.log(' Fetching Contractor Job:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      const data = await parseSafeJSON(response);

      if (response.ok) {
        const job = data.job || data.ticket || data;
        return { ...job, image_urls: normalizeImages(job) };
      }

      const msg = data?.message || 'Failed to fetch job details';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  },
);

/**
 * Accept a job offer.
 * POST /contractor/jobs/:ticket_id/respond  { decision: "ACCEPT" }
 */
export const acceptContractorJob = createAsyncThunk(
  'contractor/acceptJob',
  async ({ ticket_id }, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!ticket_id) return rejectWithValue('Ticket ID is required.');
      if (!token)     return rejectWithValue('Authentication token missing.');

      const url = `${CONTRACTOR_JOBS_URL}/${ticket_id}/respond`;
      console.log('📡 Accepting Job:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        body: JSON.stringify({ decision: 'ACCEPT' }),
      });

      const data = await parseSafeJSON(response);

      if (response.ok && !isBodyError(data)) {
        Toast.show('Job accepted successfully!');
        return data.ticket || data.job || data;
      }

      const msg = data?.message || 'Failed to accept job';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  },
);

/**
 * Decline a job offer.
 * POST /contractor/jobs/:ticket_id/respond  { decision: "DENY" }
 *
 * CRITICAL FIX: Check isBodyError() even when response.ok is true.
 * The backend sometimes returns HTTP 200 with a body like:
 *   { message: "Failed to record denial", detail: "Object of type Decimal is not JSON serializable" }
 * Without this check the thunk fulfills, the job is optimistically added to
 * state.declinedJobs in the slice, but the server never actually declined it.
 * The next getAllContractorJobs call returns the job as still-active, yet the
 * reconcile logic keeps the stale local entry → the Declined count grows with
 * every attempt (producing the "5 declined" bug seen in the logs).
 */
export const declineContractorJob = createAsyncThunk(
  'contractor/declineJob',
  async ({ ticket_id, reason }, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!ticket_id) return rejectWithValue('Ticket ID is required.');
      if (!token)     return rejectWithValue('Authentication token missing.');

      const url = `${CONTRACTOR_JOBS_URL}/${ticket_id}/respond`;
      console.log('📡 Declining Job:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        body: JSON.stringify({ decision: 'DENY', reason: reason || 'Not available' }),
      });

      const data = await parseSafeJSON(response);
      console.log('📥 Decline Job Response:', data);

      // ✅ KEY FIX: treat body-level errors as failures even on HTTP 200
      if (response.ok && !isBodyError(data)) {
        // Only fulfill (and add to declinedJobs in slice) when server confirms success
        return { ticket_id, ...(data.ticket || data.job || {}) };
      }

      const msg = data?.message || 'Failed to decline job';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  },
);

/**
 * Create an invoice for a completed / in-progress job.
 */
export const createContractorInvoice = createAsyncThunk(
  'contractor/createInvoice',
  async ({ ticket_id, invoiceData }, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!ticket_id) return rejectWithValue('Ticket ID is required.');
      if (!token)     return rejectWithValue('Authentication token missing.');

      const url = `${CONTRACTOR_JOBS_URL}/${ticket_id}/invoice`;
      console.log('📡 Creating Invoice:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const data = await parseSafeJSON(response);

      if (response.ok && !isBodyError(data)) {
        Toast.show('Invoice created successfully!');
        return {
          ticket_id,
          invoice: data.invoice || data,
          message: data.message,
        };
      }

      const msg = data?.message || 'Failed to create invoice';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      Toast.show('Network error while creating invoice');
      return rejectWithValue(err.message);
    }
  },
);

/**
 * Fetch the invoice for a given job.
 * Returns null invoice (not an error) when the job has no invoice yet (404).
 */
export const getContractorInvoice = createAsyncThunk(
  'contractor/getInvoice',
  async ({ ticket_id }, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!ticket_id) return rejectWithValue('Ticket ID is required.');
      if (!token)     return rejectWithValue('Authentication token missing.');

      const url = `${JOBS_BASE_URL}/${ticket_id}/invoice`;
      console.log('📡 Fetching Invoice:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });

      const data = await parseSafeJSON(response);

      if (response.ok) {
        return { ticket_id, invoice: data.invoice || data, has_invoice: true };
      }

      // 404 = no invoice yet — not an error, just return empty
      if (response.status === 404) {
        return { ticket_id, invoice: null, has_invoice: false };
      }

      return rejectWithValue(data?.message || 'Failed to fetch invoice');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

/**
 * Mark a job as complete.
 * POST /contractor/jobs/:ticket_id/complete
 */
export const completeContractorJob = createAsyncThunk(
  'contractor/completeJob',
  async ({ ticket_id, completion_notes, token: providedToken }, { getState, rejectWithValue }) => {
    try {
      const token = providedToken || getToken(getState);
      if (!ticket_id) return rejectWithValue('Ticket ID is required.');
      if (!token)     return rejectWithValue('Authentication token missing.');

      const url = `${CONTRACTOR_JOBS_URL}/${ticket_id}/complete`;
      console.log(' Completing Job:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        body: JSON.stringify({ completion_notes: completion_notes || 'Job completed' }),
      });

      const data = await parseSafeJSON(response);

      if (response.ok && !isBodyError(data)) {
        Toast.show('Job marked as completed!');
        return data;
      }

      const msg = data?.message || 'Failed to complete job';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      Toast.show(err.message || 'Network error');
      return rejectWithValue(err.message);
    }
  },
);
