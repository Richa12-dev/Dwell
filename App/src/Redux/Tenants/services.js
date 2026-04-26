// services.js — Property-Tenants Redux Thunks
// ✅ UPDATED: Uses authFetch for auto token refresh on 401

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { authFetch } from '../../utils/authFetch';  // ✅ NEW

const BASE_URL = 'https://api.dwellproperties.ai/api';
const PROPERTY_TENANTS_URL = `${BASE_URL}/property-tenants`;

// ─────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────

// ✅ REMOVED: authHeaders — authFetch handles Authorization automatically
// ✅ REMOVED: resolveToken — authFetch reads token from Redux store

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const handleErrorResponse = (response, data, fallback) => {
  const msg =
    data?.message ||
    data?.error ||
    `HTTP ${response.status}: ${response.statusText}` ||
    fallback;
  console.error('❌ API Error:', msg);
  Toast.show(msg);
  return msg;
};

const handleNetworkError = (err, fallback) => {
  console.error('❌ Network/Parse Error:', err);
  const msg =
    err.name === 'TypeError' && err.message.includes('fetch')
      ? 'Network error. Please check your internet connection.'
      : err.message || fallback;
  Toast.show(msg);
  return msg;
};

// ─────────────────────────────────────────────────────────────
// 1. GET /api/property-tenants
//    List all property-tenant assignments
// ─────────────────────────────────────────────────────────────
export const getPropertyTenants = createAsyncThunk(
  'tenants/getPropertyTenants',
  async (params = {}, { rejectWithValue }) => {
    try {
      const landlordId = typeof params === 'string' ? params : params.landlordId;
      
      const url = landlordId
        ? `${PROPERTY_TENANTS_URL}?landlord_id=${landlordId}`
        : PROPERTY_TENANTS_URL;

      console.log('🏠 GET', url);
      const response = await authFetch(url, { method: 'GET' });

      const data = await parseResponse(response);
      if (response.ok) {
        const records = Array.isArray(data) ? data : data?.items || data?.data || [];
        
        // Extra safety: filter to this landlord's properties on the client too
        const scoped = landlordId
          ? records.filter(r => !r.landlordId || r.landlordId === landlordId)
          : records;
          
        console.log('✅ Total property-tenants:', scoped.length);
        return scoped;
      }
      return rejectWithValue(handleErrorResponse(response, data, 'Failed to fetch property tenants'));
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to fetch property tenants'));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 2. GET /api/property-tenants/my-properties
//    Get properties for the currently authenticated tenant user
// ─────────────────────────────────────────────────────────────
export const getMyProperties = createAsyncThunk(
  'tenants/getMyProperties',
  async (params = {}, { rejectWithValue }) => {
    try {
      console.log('🏡 GET /api/property-tenants/my-properties');
      const response = await authFetch(`${PROPERTY_TENANTS_URL}/my-properties`, { method: 'GET' });

      const data = await parseResponse(response);
      console.log('📦 getMyProperties:', data);

      if (response.ok) {
        const records = Array.isArray(data) ? data : data?.items || data?.data || [];
        console.log('✅ My properties count:', records.length);
        return records;
      }
      return rejectWithValue(handleErrorResponse(response, data, 'Failed to fetch my properties'));
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to fetch my properties'));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 3. GET /api/property-tenants/property/{propertyId}
//    Get all tenant assignments for a specific property
// ─────────────────────────────────────────────────────────────
export const getTenantsByProperty = createAsyncThunk(
  'tenants/getTenantsByProperty',
  async (params, { rejectWithValue }) => {
    try {
      const propertyId = typeof params === 'string' ? params : params.propertyId;
      if (!propertyId) return rejectWithValue('Property ID is required.');

      console.log('🏘️ GET /api/property-tenants/property/', propertyId);
      const response = await authFetch(`${PROPERTY_TENANTS_URL}/property/${propertyId}`, { method: 'GET' });

      const data = await parseResponse(response);
      console.log('📦 getTenantsByProperty:', data);

      if (response.ok) {
        const records = Array.isArray(data) ? data : data?.items || data?.data || [];
        console.log('✅ Tenants for property:', records.length);
        return { propertyId, records };
      }
      return rejectWithValue(handleErrorResponse(response, data, 'Failed to fetch tenants by property'));
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to fetch tenants by property'));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 4. GET /api/property-tenants/tenant/{tenantId}
//    Get all property assignments for a specific tenant
// ─────────────────────────────────────────────────────────────
export const getPropertiesByTenant = createAsyncThunk(
  'tenants/getPropertiesByTenant',
  async (params, { rejectWithValue }) => {
    try {
      const tenantId = typeof params === 'string' ? params : params.tenantId;
      if (!tenantId) return rejectWithValue('Tenant ID is required.');

      console.log('👤 GET /api/property-tenants/tenant/', tenantId);
      const response = await authFetch(`${PROPERTY_TENANTS_URL}/tenant/${tenantId}`, { method: 'GET' });

      const data = await parseResponse(response);
      console.log('📦 getPropertiesByTenant:', data);

      if (response.ok) {
        const records = Array.isArray(data) ? data : data?.items || data?.data || [];
        console.log('✅ Properties for tenant:', records.length);
        return { tenantId, records };
      }
      return rejectWithValue(handleErrorResponse(response, data, 'Failed to fetch properties by tenant'));
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to fetch properties by tenant'));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 5. GET /api/property-tenants/{id}
//    Get a single property-tenant record by assignment ID
// ─────────────────────────────────────────────────────────────
export const getPropertyTenantById = createAsyncThunk(
  'tenants/getPropertyTenantById',
  async (params, { rejectWithValue }) => {
    try {
      const id = typeof params === 'string' ? params : params.id;
      if (!id) return rejectWithValue('Assignment ID is required.');

      console.log('🔍 GET /api/property-tenants/', id);
      const response = await authFetch(`${PROPERTY_TENANTS_URL}/${id}`, { method: 'GET' });

      const data = await parseResponse(response);
      console.log('📦 getPropertyTenantById:', data);

      if (response.ok) {
        const record = data?.item || data?.data || data;
        console.log('✅ Property-tenant record:', record);
        return record;
      }
      return rejectWithValue(handleErrorResponse(response, data, 'Failed to fetch property-tenant record'));
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to fetch property-tenant record'));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 6. POST /api/property-tenants
//    Create a new property-tenant assignment
// ─────────────────────────────────────────────────────────────
export const createPropertyTenant = createAsyncThunk(
  'tenants/createPropertyTenant',
  async (params, { rejectWithValue }) => {
    try {
      const { token: _token, ...body } = params;  // strip token if passed (authFetch handles it)

      for (const field of ['propertyId', 'unitId', 'tenantId']) {
        if (!body[field]) return rejectWithValue(`${field} is required.`);
      }

      const payload = {
        propertyId: body.propertyId,
        unitId: body.unitId,
        tenantId: body.tenantId,
        leaseStatus: body.leaseStatus || 'occupied',
        status: body.status || 'active',
      };

      console.log('➕ POST /api/property-tenants', payload);
      const response = await authFetch(PROPERTY_TENANTS_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await parseResponse(response);
      console.log('📦 createPropertyTenant response:', data);

      if (response.ok || response.status === 201) {
        const record = data?.item || data?.data || data;
        console.log('✅ Property-tenant created:', record);
        Toast.show('Tenant assigned successfully.');
        return record;
      }
      return rejectWithValue(handleErrorResponse(response, data, 'Failed to create property-tenant assignment'));
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to create property-tenant assignment'));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 7. PATCH /api/property-tenants/{id}
//    Update an existing property-tenant assignment
// ─────────────────────────────────────────────────────────────
export const updatePropertyTenant = createAsyncThunk(
  'tenants/updatePropertyTenant',
  async (params, { rejectWithValue }) => {
    try {
      const { id, token: _token, ...updates } = params;  // strip token
      if (!id) return rejectWithValue('Assignment ID is required.');
      if (!Object.keys(updates).length) return rejectWithValue('No update fields provided.');

      console.log('✏️ PATCH /api/property-tenants/', id, updates);
      const response = await authFetch(`${PROPERTY_TENANTS_URL}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const data = await parseResponse(response);
      console.log('📦 updatePropertyTenant response:', data);

      if (response.ok) {
        const record = data?.item || data?.data || data;
        console.log('✅ Property-tenant updated:', record);
        Toast.show('Tenant assignment updated successfully.');
        return record;
      }
      return rejectWithValue(handleErrorResponse(response, data, 'Failed to update property-tenant assignment'));
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to update property-tenant assignment'));
    }
  }
);

// ─────────────────────────────────────────────────────────────
// 8. DELETE /api/property-tenants/{id}
//    Delete a property-tenant assignment
// ─────────────────────────────────────────────────────────────
export const deletePropertyTenant = createAsyncThunk(
  'tenants/deletePropertyTenant',
  async (params, { rejectWithValue }) => {
    try {
      const id = typeof params === 'string' ? params : params.id;
      if (!id) return rejectWithValue('Assignment ID is required.');

      console.log('🗑️ DELETE /api/property-tenants/', id);
      const response = await authFetch(`${PROPERTY_TENANTS_URL}/${id}`, { method: 'DELETE' });

      if (response.status === 204 || response.ok) {
        console.log('✅ Property-tenant deleted:', id);
        Toast.show('Tenant assignment removed successfully.');
        return id;
      }

      const data = await parseResponse(response);
      return rejectWithValue(handleErrorResponse(response, data, 'Failed to delete property-tenant assignment'));
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to delete property-tenant assignment'));
    }
  }
);


// ─────────────────────────────────────────────────────────────
// 9. GET /api/property-tenants/landlord-contact
//    Get the landlord contact info for the authenticated tenant.
//    Response: [{ id, firstName, lastName, email, phone }]
// ─────────────────────────────────────────────────────────────
export const getLandlordContact = createAsyncThunk(
  'tenants/getLandlordContact',
  async (_params, { rejectWithValue }) => {
    try {
      console.log('📞 GET /api/property-tenants/landlord-contact');
      const response = await authFetch(`${PROPERTY_TENANTS_URL}/landlord-contact`, {
        method: 'GET',
      });
 
      const data = await parseResponse(response);
      console.log('📦 getLandlordContact:', data);
 
      if (response.ok) {
        // API returns an array — pick the first entry
        const record = Array.isArray(data) ? data[0] : data?.item || data?.data || data;
        console.log('✅ Landlord contact:', record);
        return record || null;
      }
      return rejectWithValue(
        handleErrorResponse(response, data, 'Failed to fetch landlord contact')
      );
    } catch (err) {
      return rejectWithValue(handleNetworkError(err, 'Failed to fetch landlord contact'));
    }
  }
);
