import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';

const TENANTS_API_URL = 'https://70q2ntiu1f.execute-api.us-east-1.amazonaws.com/prod/tenants';

// GET all tenants
export const getTenants = createAsyncThunk(
  'tenants/getTenants',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = params.token || state.loginData?.accessToken || state.login?.accessToken;

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      console.log('👥 Fetching tenants from API...');

      const response = await fetch(TENANTS_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Tenants Response Status:', response.status);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        console.log('📄 Text Response:', textResponse);
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = { items: [], message: textResponse };
        }
      }

      console.log('📦 Tenants API Response:', data);

      if (response.ok) {
        const tenants = data.items || data.tenants || data.data || data || [];
        console.log('✅ Tenants fetched:', tenants.length);
        return Array.isArray(tenants) ? tenants : [];
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('❌ Network/Parse Error:', err);
      let errorMessage = 'Failed to fetch tenants';

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

// GET landlord's tenants
export const getLandlordTenants = createAsyncThunk(
  'tenants/getLandlordTenants',
  async (params, { getState, rejectWithValue }) => {
    try {
      let landlordId, token;

      if (typeof params === 'string') {
        landlordId = params;
        const state = getState();
        token = state.loginData?.accessToken || state.login?.accessToken;
      } else {
        landlordId = params.landlordId;
        token = params.token;
      }

      if (!landlordId) {
        console.error('❌ No landlord ID provided');
        return rejectWithValue('Landlord ID is required');
      }

      if (!token) {
        console.error('❌ No authentication token provided');
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      console.log('👥 Fetching tenants for landlord:', landlordId);

      const response = await fetch(TENANTS_API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
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
          data = { items: [], message: textResponse };
        }
      }

      console.log('📦 Landlord Tenants Response:', data);

      if (response.ok) {
        // ✅ FIXED: Handle your specific API response structure
        let tenants = [];
        
        // Your API returns: { landlord_id: "...", tenants: [...] }
        if (data?.tenants && Array.isArray(data.tenants)) {
          tenants = data.tenants;
        }
        // Fallback to other common structures
        else if (Array.isArray(data?.items)) {
          tenants = data.items;
        }
        else if (Array.isArray(data?.data)) {
          tenants = data.data;
        }
        else if (Array.isArray(data)) {
          tenants = data;
        }

        console.log('✅ Extracted Tenants:', tenants);
        console.log('✅ Tenant Count:', tenants.length);

        // No need to filter by landlord_id since API already returns filtered results
        return tenants;
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('❌ Network/Parse Error:', err);
      let errorMessage = 'Failed to fetch landlord tenants';

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

// GET single tenant by ID
export const getTenant = createAsyncThunk(
  'tenants/getTenant',
  async (params, { getState, rejectWithValue }) => {
    try {
      const { tenantId, token: paramToken } = typeof params === 'string' ? { tenantId: params, token: null } : params;
      
      const state = getState();
      const token = paramToken || state.loginData?.accessToken || state.login?.accessToken;

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      if (!tenantId) {
        return rejectWithValue('Tenant ID is required.');
      }

      console.log('👤 Fetching tenant:', tenantId);

      const response = await fetch(`${TENANTS_API_URL}/${tenantId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
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
          data = { tenant: null, message: textResponse };
        }
      }

      if (response.ok) {
        const tenant = data.item || data.tenant || data.data || data;
        console.log('✅ Tenant fetched:', tenant);
        return tenant;
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('❌ Error fetching tenant:', err);
      const errorMessage = err.message || 'Failed to fetch tenant';
      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);
