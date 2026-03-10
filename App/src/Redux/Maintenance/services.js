import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { navigate, resetRoot } from '../../navigation/RouterServices';
import RNFS from 'react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';

const maintenance_url = 'https://mo4vh9rkai.execute-api.us-east-1.amazonaws.com/prod/maintenance';

// ✅ Image processing functions
const compressImage = async (localUri) => {
  try {
    console.log('🔄 Compressing image:', localUri);
    const resizedImage = await ImageResizer.createResizedImage(
      localUri, 1200, 1200, 'JPEG', 80, 0, null, false,
      { mode: 'contain', onlyScaleDown: true }
    );
    console.log('✅ Image compressed:', resizedImage.uri);
    return resizedImage.uri;
  } catch (error) {
    console.warn('⚠️ Compression failed, using original:', error);
    return localUri;
  }
};

const convertImageToBase64 = async (localUri) => {
  try {
    console.log('🔄 Converting image:', localUri);
    const compressedUri = await compressImage(localUri);
    const base64String = await RNFS.readFile(compressedUri, 'base64');
    const extension = compressedUri.split('.').pop().toLowerCase();
    const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : `image/${extension}`;
    const dataUri = `data:${mimeType};base64,${base64String}`;
    console.log('✅ Converted to base64, size:', dataUri.length, '(~' + Math.round(dataUri.length/1024) + 'KB)');
    return dataUri;
  } catch (error) {
    console.error('❌ Error converting image:', error);
    throw error;
  }
};

const processPropertyImages = async (images) => {
  if (!Array.isArray(images) || images.length === 0) return [];
  
  const imagesToProcess = images.slice(0, 3);
  if (images.length > 3) {
    console.warn(`⚠️ Only processing first 3 of ${images.length} images`);
    Toast.show(`Processing first 3 images only (API size limit)`);
  }

  const processedImages = [];
  for (const imageUri of imagesToProcess) {
    try {
      if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        processedImages.push(imageUri);
        console.log('✅ Keeping existing URL');
      } else if (imageUri.startsWith('data:')) {
        processedImages.push(imageUri);
        console.log('✅ Keeping existing base64 image');
      } else {
        console.log('🔄 Converting local image to base64...');
        const base64Image = await convertImageToBase64(imageUri);
        processedImages.push(base64Image);
        console.log('✅ Image converted to base64');
      }
    } catch (error) {
      console.error('❌ Error processing image:', imageUri, error);
      Toast.show('Warning: Some images could not be processed');
    }
  }
  console.log(`📸 Processed ${processedImages.length} images`);
  return processedImages;
};

const parseSafeJSON = async (response) => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }
    const text = await response.text();
    return JSON.parse(text);
  } catch {
    return { message: 'Invalid server response' };
  }
};

// ✅ FIXED: Always prioritize idToken, fallback to accessToken
const getToken = (getState) => {
  const state = getState().loginData;
  return state?.idToken || state?.accessToken || state?.token || null;
};

/**
 * ✅ Create Maintenance Request
 */
export const createMaintenanceRequest = createAsyncThunk(
  'maintenance/createRequest',
  async (params, { getState, rejectWithValue }) => {
    try {
      const {
        title, description, category, priority, location,
        preferred_start, preferred_end, timezone,
        image_urls, voice_url,property_lat,property_lng, token: providedToken
      } = params;

      const token = providedToken || getToken(getState);

      if (!token) {
        console.error('❌ No authentication token available');
        return rejectWithValue('Authentication token is required.');
      }

      if (!title || !description || !category || !priority || !location) {
        console.error('❌ Missing required fields');
        return rejectWithValue('All required fields must be filled.');
      }
        
      let processedImages = [];
      
      if (Array.isArray(image_urls) && image_urls.length > 0) {
        try {
          console.log(`📸 Processing ${image_urls.length} maintenance images...`);
          processedImages = await processPropertyImages(image_urls);
          console.log(`✅ Processed ${processedImages.length} images successfully`);
        } catch (error) {
          console.error('❌ Image processing failed:', error);
          Toast.show('Warning: Some images could not be processed');
        }
      }

      let processedVoiceUrl = voice_url;
      
      if (voice_url && !voice_url.startsWith('http://') && !voice_url.startsWith('https://')) {
        try {
          console.log('🎤 Processing voice note...');
          const voiceBase64 = await convertImageToBase64(voice_url);
          processedVoiceUrl = voiceBase64;
          console.log('✅ Voice note converted to base64');
        } catch (error) {
          console.error('❌ Voice note processing failed:', error);
          Toast.show('Warning: Voice note could not be processed');
          processedVoiceUrl = null;
        }
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: category,
        priority: priority,
        location: location.trim(),
        preferred_start: preferred_start || new Date().toISOString(),
        preferred_end: preferred_end || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        timezone: timezone || 'Asia/Kolkata',
        image_urls: processedImages,
        voice_url: processedVoiceUrl,
          // ✅ CORRECT — use the already-destructured variables
          property_lat: property_lat ?? null,
          property_lng: property_lng ?? null,
      };

      console.log('📤 Sending Maintenance Request:', {
        ...payload,
        image_urls: payload.image_urls.map((url, idx) =>
          url.startsWith('data:') ? `[base64 image ${idx + 1}, size: ${url.length}]` : url
        ),
        voice_url: payload.voice_url?.startsWith('data:') ? `[base64 audio, size: ${payload.voice_url.length}]` : payload.voice_url
      });

      const response = await fetch(maintenance_url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('📡 Response Status:', response.status);

      const data = await parseSafeJSON(response);
      console.log('📥 Maintenance Response:', JSON.stringify(data, null, 2));

      if (response.ok) {
        Toast.show('Maintenance request created successfully!');
        return data.ticket || data;
      } else {
        const msg = data?.message || data?.error || `Failed to create ticket (${response.status})`;
        console.error('❌ API Error:', msg);
        Toast.show(msg);
        return rejectWithValue(msg);
      }
    } catch (err) {
      console.error('❌ Create Maintenance Error:', err);
      const errorMsg = err.message || 'Network error, try again.';
      Toast.show(errorMsg);
      return rejectWithValue(errorMsg);
    }
  }
);

/**
 * ✅ Fetch All Maintenance Requests
 */
export const getMaintenanceRequests = createAsyncThunk(
  'maintenance/getRequests',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const { tenant_id, token: providedToken } = params;
      const token = providedToken || getToken(getState);

      if (!tenant_id) {
        console.error('❌ No tenant_id provided');
        return rejectWithValue('Tenant ID is required.');
      }
        
      if (!token) {
        console.error('❌ No authentication token');
        return rejectWithValue('Authentication token missing.');
      }

      const url = `${maintenance_url}?tenant_id=${tenant_id}`;
      console.log('📡 Fetching Requests:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      console.log('📡 Response Status:', response.status);

      const data = await parseSafeJSON(response);
      console.log('📥 Maintenance List Response:', JSON.stringify(data, null, 2));

      if (response.ok) {
        const items = data?.items || (Array.isArray(data) ? data : []);
        console.log(`✅ Successfully fetched ${items.length} requests`);
        return items;
      }

      const errorMsg = data?.message || 'Failed to fetch maintenance list';
      console.error('❌ API Error:', errorMsg);
      Toast.show(errorMsg);
      return rejectWithValue(errorMsg);
    } catch (err) {
      console.error('❌ Fetch Requests Error:', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

/**
 * ✅ NEW: Get Maintenance Details by Ticket ID
 */
export const getMaintenanceDetails = createAsyncThunk(
  'maintenance/getDetails',
  async ({ ticket_id, token: providedToken }, { getState, rejectWithValue }) => {
    try {
      const token = providedToken || getToken(getState);

      if (!ticket_id) {
        console.error('❌ No ticket_id provided');
        return rejectWithValue('Ticket ID is required.');
      }
      
      if (!token) {
        console.error('❌ No authentication token');
        return rejectWithValue('Authentication token missing.');
      }

      const url = `${maintenance_url}/${ticket_id}`;
      console.log('📡 Fetching Ticket Details:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      console.log('📡 Response Status:', response.status);

      const data = await parseSafeJSON(response);
      console.log('📥 Ticket Details Response:', JSON.stringify(data, null, 2));

      if (response.ok) {
        const ticket = data.ticket || data.item || data;
        console.log('✅ Successfully fetched ticket details');
        return ticket;
      }

      const errorMsg = data?.message || 'Failed to fetch ticket details';
      console.error('❌ API Error:', errorMsg);
      Toast.show(errorMsg);
      return rejectWithValue(errorMsg);
    } catch (err) {
      console.error('❌ Ticket Details Error:', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

/**
 * ✅ Update Maintenance Status
 */
export const updateMaintenanceStatus = createAsyncThunk(
  'maintenance/updateStatus',
  async ({ ticket_id, status, token: providedToken }, { getState, rejectWithValue }) => {
    try {
      const token = providedToken || getToken(getState);

      if (!ticket_id) return rejectWithValue('Ticket ID is required.');
      if (!status) return rejectWithValue('Status is required.');
      if (!token) return rejectWithValue('Authentication token missing.');

      const url = `${maintenance_url}/${ticket_id}`;
      console.log('📡 Updating Status:', url);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await parseSafeJSON(response);
      console.log('📥 Update Status Response:', data);

      if (response.ok) {
        Toast.show('Status updated successfully!');
        return data;
      }

      Toast.show(data?.message || 'Failed to update status');
      return rejectWithValue(data?.message);
    } catch (err) {
      console.error('❌ Update Status Error:', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);

/**
 * ✅ NEW: Escalate Maintenance Request to Level 2
 */
export const escalateMaintenanceRequest = createAsyncThunk(
  'maintenance/escalate',
  async ({ ticket_id, token: providedToken }, { getState, rejectWithValue }) => {
    try {
      const token = providedToken || getToken(getState);

      if (!ticket_id) return rejectWithValue('Ticket ID is required.');
      if (!token) return rejectWithValue('Authentication token missing.');

      const url = `${maintenance_url}/${ticket_id}/escalate`;
      console.log('📡 Escalating Ticket:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const data = await parseSafeJSON(response);
      console.log('📥 Escalate Response:', data);

      if (response.ok) {
        Toast.show('Request escalated to Level 2 successfully!');
        return data;
      }

      Toast.show(data?.message || 'Failed to escalate request');
      return rejectWithValue(data?.message);
    } catch (err) {
      console.error('❌ Escalate Error:', err);
      Toast.show('Network error');
      return rejectWithValue(err.message);
    }
  }
);



