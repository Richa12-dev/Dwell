// userServices.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { authFetch } from '../../utils/authFetch';

const BASE_URL  = Config.Base_url || Config.NODE_API_BASE_URL;
const USERS_URL = `${BASE_URL}/users`;

const safeJson = async (response) => {
  try { return await response.json(); } catch { return {}; }
};

// ─── Public endpoint — no auth ────────────────────────────────────────────────
export const createUser = createAsyncThunk(
  'users/createUser',
  async ({ role, phoneNumber, email, password }, { rejectWithValue }) => {
    try {
      if (!phoneNumber) return rejectWithValue('Phone number is required.');
      if (!password)    return rejectWithValue('Password is required.');
      const response = await fetch(USERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ role: role || 'tenant', phoneNumber, email, password }),
      });
      const data = await safeJson(response);
      if (response.status === 201 || response.ok) return data;
      const msg = Array.isArray(data?.message)
        ? data.message.join(' | ')
        : data?.message || `HTTP ${response.status}`;
      return rejectWithValue(msg);
    } catch (err) {
      return rejectWithValue(
        err?.message?.includes('fetch') ? 'Network error.' : err?.message || 'Failed to create user',
      );
    }
  },
);

export const getAllUsers = createAsyncThunk(
  'users/getAllUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(USERS_URL, { method: 'GET' });
      const data     = await safeJson(response);
      if (response.ok) {
        return Array.isArray(data) ? data : data?.users || data?.data || [];
      }
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) { return rejectWithValue(err?.message || 'Failed to fetch users'); }
  },
);

export const getUserById = createAsyncThunk(
  'users/getUserById',
  async (userId, { rejectWithValue }) => {
    try {
      if (!userId) return rejectWithValue('User ID is required.');
      const response = await authFetch(`${USERS_URL}/${userId}`, { method: 'GET' });
      const data     = await safeJson(response);
      if (response.ok)             return data;
      if (response.status === 404) return rejectWithValue('User not found.');
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) { return rejectWithValue(err?.message || 'Failed to fetch user'); }
  },
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async ({ userId, updates }, { rejectWithValue }) => {
    try {
      if (!userId)                                        return rejectWithValue('User ID is required.');
      if (!updates || Object.keys(updates).length === 0) return rejectWithValue('No update fields provided.');
      const response = await authFetch(`${USERS_URL}/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      const data = await safeJson(response);
      if (response.ok) {
        Toast.show('Profile updated successfully.');
        return data;
      }
      if (response.status === 404) return rejectWithValue('User not found.');
      if (response.status === 400) {
        const msg = Array.isArray(data?.message)
          ? data.message.join(' | ')
          : data?.message || 'Validation error';
        return rejectWithValue(msg);
      }
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) { return rejectWithValue(err?.message || 'Failed to update user'); }
  },
);

// ─── Full image upload flow ───────────────────────────────────────────────────
// Step 1: POST /users/profile-image/upload-url  → { uploadUrl, fileUrl, key }
// Step 2: PUT  <uploadUrl>                       → S3 directly (no auth header)
// Step 3: PATCH /users/:userId                   → { profileImage: fileUrl }
//
// WHY fileUrl, not key:
//   The backend stores whatever value is passed as profileImage directly in DB
//   and returns it (or a signed version) via GET /users/profiledetail.
//
//     DB stores:   "https://bucket.s3.../uploads/profiles/UUID.jpg"  (fileUrl)
//     GET returns: "https://signed-url-for-profile-image"             ✓
//
//   Storing the raw fileUrl keeps the DB record self-contained — the GET
//   endpoint returns the URL directly without any key-prepending logic.


const uploadToS3 = async (fileUri, uploadUrl, contentType = 'image/jpeg') => {
  try {
    console.log('📤 Fetching blob from:', fileUri.substring(0, 60));

    // Convert local URI → Blob (React Native fetch supports file:// URIs)
    const fileResponse = await fetch(fileUri);
    const blob         = await fileResponse.blob();

    console.log('📦 Blob — size:', blob.size, 'bytes | type:', blob.type);

    // PUT blob directly to S3 presigned URL
    const result = await fetch(uploadUrl, {
      method:  'PUT',
      headers: {
        'Content-Type': contentType, // MUST match the contentType sent to /s3/upload-url
      },
      body: blob,
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error('❌ S3 PUT failed:', result.status, errorText.substring(0, 300));
      throw new Error(`S3 upload failed (${result.status})`);
    }

    console.log('✅ S3 upload successful');
    return true;
  } catch (error) {
    console.error('❌ uploadToS3 error:', error.message);
    return false;
  }
};


const handleSingleUpload = async (file, token) => {
  // file = { uri: string, type: string, fileName: string }
  const signedData = await getSignedUrl(file.fileName, token);
  if (!signedData) return null;

  const { uploadUrl, fileUrl } = signedData;
  const success = await uploadToS3(file.uri, uploadUrl, file.type || 'image/jpeg');

  if (!success) return null;

  console.log('🎉 File available at:', fileUrl);
  return fileUrl;
};

export const processPropertyImages = async (images, token, onProgress) => {
  console.log('🖼️  processPropertyImages — total:', images?.length ?? 0);

  if (!Array.isArray(images) || images.length === 0) return [];
  if (!token) { console.error('❌ No token'); return []; }

  const remoteUrls = [];
  const localFiles = [];
    
   

    for (const uri of images.slice(0, 9)) {
      if (typeof uri !== 'string') continue;

      if (uri.startsWith('http://') || uri.startsWith('https://')) {
        // ✅ Strip presigned query params — keep only the clean permanent S3 URL
        // Presigned URLs look like: https://...s3.amazonaws.com/uploads/file.jpg?X-Amz-Algorithm=...
        try {
          const clean = uri.split('?')[0];
          remoteUrls.push(clean);
        } catch {
          remoteUrls.push(uri);
        }
      } else {
        const rawName  = uri.split('/').pop().split('?')[0] || `img-${Date.now()}`;
        const fileName = rawName.replace(/\.(heic|heif|jpeg|jpg|png|webp|gif)$/i, '') + '.jpg';
        localFiles.push({ uri, type: 'image/jpeg', fileName });
      }
    }

  if (localFiles.length === 0) {
    console.log('  → No local files, returning remote URLs as-is');
    return remoteUrls;
  }

  const uploadedUrls = [];

  for (let i = 0; i < localFiles.length; i++) {
    const file = localFiles[i];
    console.log(`\n📤 [${i + 1}/${localFiles.length}] Uploading: ${file.fileName}`);
    onProgress && onProgress(i, localFiles.length);

    const fileUrl = await handleSingleUpload(file, token);

    if (fileUrl) {
      uploadedUrls.push(fileUrl);
    } else {
      console.warn(`⚠️  Image ${i + 1} failed — skipping`);
      Toast.show(`Warning: Image ${i + 1} could not be uploaded`);
    }
  }

  onProgress && onProgress(localFiles.length, localFiles.length);
  console.log(`\n📊 Summary: ${uploadedUrls.length}/${localFiles.length} succeeded`);

  return [...remoteUrls, ...uploadedUrls];
};


export const uploadProfileImage = createAsyncThunk(
  'users/uploadProfileImage',
  async ({ fileUri, fileName, contentType, userId }, { dispatch, rejectWithValue }) => {
    try {
      if (!fileUri || !fileName || !contentType) {
        return rejectWithValue('File URI, name, and content type are required.');
      }
      if (!userId) {
        return rejectWithValue('User ID is required to save the image.');
      }

      // ── Step 1: get presigned upload URL ─────────────────────────────────
        const signedResponse = await authFetch(`${BASE_URL}/s3/upload-url`, {
          method: 'POST',
          body: JSON.stringify({ fileName, contentType, folder: 'uploads', expiresIn: 3600 }),
        });
      const signedData = await safeJson(signedResponse);
      if (!signedResponse.ok || !signedData?.uploadUrl) {
        return rejectWithValue(signedData?.message || 'Failed to get upload URL.');
      }
      const { uploadUrl, fileUrl } = signedData;
      // fileUrl = "https://bucket.s3.../uploads/profiles/UUID.jpg"

      // ── Step 2: upload blob directly to S3 ───────────────────────────────
      const fileResponse = await fetch(fileUri);
      const blob         = await fileResponse.blob();
      const s3Response   = await fetch(uploadUrl, {
        method:  'PUT',
        headers: { 'Content-Type': contentType },
        body:    blob,
      });
      if (!s3Response.ok) {
        return rejectWithValue(`S3 upload failed (${s3Response.status})`);
      }

      // ── Step 3: save the full S3 URL to DB ───────────────────────────────
        const imageFileName = fileUrl.split('/').pop().split('?')[0];
        console.log('Saving filename to DB:', imageFileName);

        try {
          await dispatch(
            updateUser({ userId, updates: { profileImage: imageFileName } }),
          ).unwrap();
        } catch (patchErr) {
          console.warn('PATCH /users/:userId failed:', patchErr);
        }

        Toast.show('Profile image uploaded successfully.');
        return { fileUrl, imageFileName };

    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to upload profile image');
    }
  },
);

export const getDocumentUploadUrl = createAsyncThunk(
  'users/getDocumentUploadUrl',
  async ({ fileName, contentType, folder = 'documents', expiresIn = 3600 }, { rejectWithValue }) => {
    try {
      if (!fileName)    return rejectWithValue('File name is required.');
      if (!contentType) return rejectWithValue('Content type is required.');
      const response = await authFetch(`${USERS_URL}/documents/upload-url`, {
        method: 'POST',
        body: JSON.stringify({ fileName, contentType, folder, expiresIn }),
      });
      const data = await safeJson(response);
      if (response.ok)             return data;
      if (response.status === 400) return rejectWithValue(data?.message || 'Invalid input.');
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) { return rejectWithValue(err?.message || 'Failed to generate document upload URL'); }
  },
);

export const uploadDocument = createAsyncThunk(
  'users/uploadDocument',
  async ({ fileUri, fileName, contentType }, { dispatch, rejectWithValue }) => {
    try {
      if (!fileUri || !fileName || !contentType)
        return rejectWithValue('File URI, name, and content type are required.');
      const urlResult = await dispatch(
        getDocumentUploadUrl({ fileName, contentType, folder: 'documents' }),
      ).unwrap();
      const { uploadUrl, fileUrl } = urlResult;
      if (!uploadUrl) return rejectWithValue('Failed to get document upload URL.');
      const fileResponse = await fetch(fileUri);
      const blob         = await fileResponse.blob();
      const s3Response   = await fetch(uploadUrl, {
        method: 'PUT', headers: { 'Content-Type': contentType }, body: blob,
      });
      if (!s3Response.ok) return rejectWithValue(`S3 document upload failed (${s3Response.status})`);
      Toast.show('Document uploaded successfully.');
      return { fileUrl };
    } catch (err) { return rejectWithValue(err?.message || 'Failed to upload document'); }
  },
);

// ─── Public endpoint ──────────────────────────────────────────────────────────
export const getSupportedFileTypes = createAsyncThunk(
  'users/getSupportedFileTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${USERS_URL}/supported-file-types`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      });
      const data = await safeJson(response);
      if (response.ok) return data;
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) { return rejectWithValue(err?.message || 'Failed to fetch supported file types'); }
  },
);

export const findUserByPhone = createAsyncThunk(
  'users/findUserByPhone',
  async (phoneNumber, { rejectWithValue }) => {
    try {
      if (!phoneNumber) return rejectWithValue('Phone number is required.');
      const response = await authFetch(USERS_URL, { method: 'GET' });
      const data     = await safeJson(response);
      if (response.ok) {
        const users = Array.isArray(data) ? data : data?.users || data?.data || [];
        return users.find(u => u.phoneNumber === phoneNumber || u.phone === phoneNumber) || null;
      }
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) { return rejectWithValue(err?.message || 'Failed to search users'); }
  },
);

// ─── GET /users/profiledetail ─────────────────────────────────────────────────
// Returns the full profile. The backend generates a fresh presigned URL for
// profileImage on every call using the stored key. Called on ProfileHome mount
// and after every upload to get the latest valid presigned URL.
export const fetchUserProfile = createAsyncThunk(
  'users/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${USERS_URL}/profiledetail`, { method: 'GET' });
      const data     = await safeJson(response);
      if (response.ok) return data;
        console.log('fetchUserProfile RAW response:', JSON.stringify(data));
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to fetch profile');
    }
  },
);

// Add this at the bottom of userServices.js
// Plain function — not a thunk — bypasses Redux Persist stale state
export const fetchProfileImageKey = async () => {
  try {
    const response = await authFetch(`${USERS_URL}/profiledetail`, { method: 'GET' });
    const data     = await safeJson(response);
    console.log('[fetchProfileImageKey] raw profileImage:', data?.profileImage);
    return data?.profileImage || null;
  } catch (err) {
    console.warn('[fetchProfileImageKey] error:', err.message);
    return null;
  }
};
