import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { Buffer } from 'buffer';
import { navigate, resetRoot } from '../../navigation/RouterServices';
import { clearLoginData } from './loginSlice';



const maintenance_url = Config.MAINTENANCE_API_URL;

/**
 * Create a maintenance authorization request
 */
export const createMaintenanceRequest = createAsyncThunk(
  'maintenance/createRequest',
  async (params, { rejectWithValue }) => {
    try {
      const {
        title,
        description,
        category,
        priority,
        location,
        landlord_id,
        property_id,
        preferred_start,
        preferred_end,
        timezone,
        token
      } = params;

      // Validate required fields
      if (!title?.trim()) {
        return rejectWithValue('Title is required');
      }

      if (!description?.trim()) {
        return rejectWithValue('Description is required');
      }

      if (!category) {
        return rejectWithValue('Category is required');
      }

      if (!priority) {
        return rejectWithValue('Priority is required');
      }

      if (!location?.trim()) {
        return rejectWithValue('Location is required');
      }

      if (!landlord_id) {
        return rejectWithValue('Landlord ID is required');
      }

      if (!property_id) {
        return rejectWithValue('Property ID is required');
      }

      if (!preferred_start) {
        return rejectWithValue('Preferred start time is required');
      }

      if (!preferred_end) {
        return rejectWithValue('Preferred end time is required');
      }

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      console.log('📝 Creating maintenance request:', {
        title,
        category,
        priority,
        property_id
      });

      // Prepare request payload
      const requestPayload = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        location: location.trim(),
        landlord_id,
        property_id,
        preferred_start,
        preferred_end,
        timezone: timezone || 'Asia/Kolkata'
      };

      console.log('🌐 Sending to:', maintenance_url);

      const response = await fetch(maintenance_url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('📡 Response status:', response.status);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        console.log('📄 Text response:', textResponse);
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = {
            success: true,
            message: textResponse,
            request: requestPayload
          };
        }
      }

      console.log('📦 Response data:', data);

      if (response.ok) {
        Toast.show('Maintenance request submitted successfully!');
        
        return {
          success: true,
          ...data,
          request: data.request || data.maintenanceRequest || requestPayload,
          timestamp: new Date().toISOString(),
        };
      } else if (response.status === 401) {
        console.error('❌ Unauthorized');
        return rejectWithValue('Session expired. Please login again.');
      } else if (response.status === 403) {
        console.error('❌ Forbidden');
        return rejectWithValue('Access denied. Please check your permissions.');
      } else if (response.status === 400) {
        const errorMessage = data?.message || data?.error || 'Invalid request data';
        console.error('❌ Bad Request:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      } else {
        const errorMessage = data?.message || data?.error || data?.details ||
                            `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('❌ Network/Parse Error:', err);

      let errorMessage = 'Failed to create maintenance request';

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.name === 'SyntaxError') {
        errorMessage = 'Invalid response from server';
      } else {
        errorMessage = err.message || errorMessage;
      }

      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Get all maintenance requests for a landlord
 */
export const getMaintenanceRequests = createAsyncThunk(
  'maintenance/getRequests',
  async (params, { rejectWithValue }) => {
    try {
      const { landlord_id, token } = params;

      if (!landlord_id) {
        return rejectWithValue('Landlord ID is required');
      }

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      console.log('🔍 Fetching maintenance requests for landlord:', landlord_id);

      const url = `${maintenance_url}?landlord_id=${landlord_id}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = { items: [], requests: [] };
        }
      }

      if (response.ok) {
        const requests = data.items || data.requests || data.data || [];
        console.log('✅ Retrieved', requests.length, 'maintenance requests');
        return Array.isArray(requests) ? requests : [];
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else if (response.status === 403) {
        return rejectWithValue('Access denied. Please check your permissions.');
      } else {
        const errorMessage = data?.message || data?.error ||
                            `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('❌ Network/Parse Error:', err);

      let errorMessage = 'Failed to fetch maintenance requests';

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }

      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Get maintenance requests for a specific property
 */
export const getPropertyMaintenanceRequests = createAsyncThunk(
  'maintenance/getPropertyRequests',
  async (params, { rejectWithValue }) => {
    try {
      const { property_id, token } = params;

      if (!property_id) {
        return rejectWithValue('Property ID is required');
      }

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      console.log('🔍 Fetching maintenance requests for property:', property_id);

      const url = `${maintenance_url}?property_id=${property_id}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = { items: [], requests: [] };
        }
      }

      if (response.ok) {
        const requests = data.items || data.requests || data.data || [];
        console.log('✅ Retrieved', requests.length, 'maintenance requests');
        return Array.isArray(requests) ? requests : [];
      } else {
        const errorMessage = data?.message || data?.error ||
                            `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ API Error:', errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('❌ Network/Parse Error:', err);
      let errorMessage = 'Failed to fetch maintenance requests';
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Update maintenance request status
 */
export const updateMaintenanceStatus = createAsyncThunk(
  'maintenance/updateStatus',
  async (params, { rejectWithValue }) => {
    try {
      const { request_id, status, token } = params;

      if (!request_id) {
        return rejectWithValue('Request ID is required');
      }

      if (!status) {
        return rejectWithValue('Status is required');
      }

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      const response = await fetch(`${maintenance_url}/${request_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = { success: true, message: 'Status updated' };
        }
      }

      if (response.ok) {
        Toast.show('Maintenance status updated successfully!');
        return data;
      } else {
        const errorMessage = data?.message || data?.error ||
                            `HTTP ${response.status}: ${response.statusText}`;
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('❌ Update Error:', err);
      const errorMessage = err.message || 'Failed to update maintenance status';
      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);
