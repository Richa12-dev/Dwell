// rentServices.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';

const RENT_DOCS_API_URL = 'https://ntizm5v3r0.execute-api.us-east-1.amazonaws.com/rent-docs';
const RENT_HISTORY_API_URL = 'https://ntizm5v3r0.execute-api.us-east-1.amazonaws.com/rent-history';

// GET all rent documents (NO AUTH - DEMO)
export const getRentDocuments = createAsyncThunk(
  'rent/getRentDocuments',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📄 Fetching rent documents from:', RENT_DOCS_API_URL);

      const response = await fetch(RENT_DOCS_API_URL, {
        method: 'GET',
        headers: {
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
          data = { documents: [], message: textResponse };
        }
      }

      console.log('✅ Documents Response:', data);

      if (response.ok) {
        return {
          bucket: data.bucket || '',
          prefix: data.prefix || '',
          documents: data.documents || [],
        };
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Network/Parse Error:', err);
      let errorMessage = 'Failed to fetch rent documents';

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

// GET all rent history (NO AUTH - DEMO)
export const getRentHistory = createAsyncThunk(
  'rent/getRentHistory',
  async (_, { rejectWithValue }) => {
    try {
      console.log('📊 Fetching rent history from:', RENT_HISTORY_API_URL);

      const response = await fetch(RENT_HISTORY_API_URL, {
        method: 'GET',
        headers: {
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
          data = { rent_history: [], count: 0, message: textResponse };
        }
      }

      console.log('✅ Rent History Response:', data);

      if (response.ok) {
        return {
          count: data.count || 0,
          rent_history: data.rent_history || [],
        };
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Network/Parse Error:', err);
      let errorMessage = 'Failed to fetch rent history';

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

// GET rent history by specific tenant ID (NO AUTH - DEMO)
export const getRentHistoryByTenant = createAsyncThunk(
  'rent/getRentHistoryByTenant',
  async (tenantId, { rejectWithValue }) => {
    try {
      // If no tenantId provided, fetch all rent history
      if (!tenantId) {
        console.log('⚠️ No tenant ID provided, fetching all rent history');
        const response = await fetch(RENT_HISTORY_API_URL, {
          method: 'GET',
          headers: {
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
            data = { rent_history: [], count: 0, message: textResponse };
          }
        }

        console.log('✅ All Rent History Response:', data);

        if (response.ok) {
          return {
            count: data.count || 0,
            rent_history: data.rent_history || [],
          };
        } else {
          const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
          console.error('API Error:', errorMessage);
          Toast.show(errorMessage);
          return rejectWithValue(errorMessage);
        }
      }

      // Fetch by tenant ID
      const url = `${RENT_HISTORY_API_URL}?tenant_id=${tenantId}`;
      console.log('📊 Fetching rent history for tenant:', tenantId);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
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
          data = { rent_history: [], count: 0, message: textResponse };
        }
      }

      console.log('✅ Tenant Rent History Response:', data);

      if (response.ok) {
        return {
          count: data.count || 0,
          rent_history: data.rent_history || [],
        };
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Network/Parse Error:', err);
      let errorMessage = 'Failed to fetch tenant rent history';

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
