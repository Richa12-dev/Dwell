// rentServices.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { authFetch } from '../../utils/authFetch';

const BASE_URL = 'https://api.dwellproperties.ai/api/rent';

// ─── Helper ───────────────────────────────────────────────────────────────────
const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    try { data = JSON.parse(text); } catch { data = {}; }
  }
  return { ok: response.ok, status: response.status, data };
};

// ─── GET: Tenant History (current logged-in tenant) ───────────────────────────
export const getTenantRentHistory = createAsyncThunk(
  'rent/getTenantRentHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/tenant-history`, {
        method: 'GET',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return data; // returns array of rent records
      const msg = data?.message || data?.error || 'Failed to load tenant rent history';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── GET: Rent History for a Specific Tenant (admin/landlord) ─────────────────
export const getRentHistoryByTenant = createAsyncThunk(
  'rent/getRentHistoryByTenant',
  async (tenantId, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/tenant/${tenantId}/history`, {
        method: 'GET',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return Array.isArray(data) ? data : data?.rent_history || [];
      const msg = data?.message || data?.error || 'Failed to load rent history';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── GET: Rent History for a Property ─────────────────────────────────────────
export const getRentHistoryByProperty = createAsyncThunk(
  'rent/getRentHistoryByProperty',
  async (propertyId, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/property/${propertyId}/history`, {
        method: 'GET',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return Array.isArray(data) ? data : data?.rent_history || [];
      const msg = data?.message || data?.error || 'Failed to load property rent history';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── GET: Landlord Summary ─────────────────────────────────────────────────────
export const getLandlordSummary = createAsyncThunk(
  'rent/getLandlordSummary',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/landlord-summary`, {
        method: 'GET',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return data; // { totalRents, paidRents, pendingRents, overdueRents, totalCollected, totalPending }
      const msg = data?.message || data?.error || 'Failed to load landlord summary';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── GET: Overdue Rents ────────────────────────────────────────────────────────
export const getOverdueRents = createAsyncThunk(
  'rent/getOverdueRents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/overdue`, {
        method: 'GET',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return Array.isArray(data) ? data : data?.rents || [];
      const msg = data?.message || data?.error || 'Failed to load overdue rents';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── GET: Upcoming Rents (next 30 days) ───────────────────────────────────────
export const getUpcomingRents = createAsyncThunk(
  'rent/getUpcomingRents',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/upcoming`, {
        method: 'GET',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return Array.isArray(data) ? data : data?.rents || [];
      const msg = data?.message || data?.error || 'Failed to load upcoming rents';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── GET: Single Rent by ID ───────────────────────────────────────────────────
export const getRentById = createAsyncThunk(
  'rent/getRentById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/${id}`, {
        method: 'GET',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return data;
      const msg = data?.message || data?.error || 'Failed to load rent record';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── POST: Create Rent Record ─────────────────────────────────────────────────
// payload: { propertyTenantId, month, year }
export const createRent = createAsyncThunk(
  'rent/createRent',
  async ({ propertyTenantId, month, year }, { rejectWithValue }) => {
    try {
      const response = await authFetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ propertyTenantId, month, year }),
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return data;
      const msg = data?.message || data?.error || 'Failed to create rent record';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── POST: Generate Monthly Rent for All Active Tenants ───────────────────────
// payload: { month, year }
export const generateMonthlyRent = createAsyncThunk(
  'rent/generateMonthlyRent',
  async ({ month, year }, { rejectWithValue }) => {
    try {
      const response = await authFetch(
        `${BASE_URL}/generate-monthly?month=${month}&year=${year}`,
        { method: 'POST' }
      );
      const { ok, data } = await handleResponse(response);
      if (ok) return data;
      const msg = data?.message || data?.error || 'Failed to generate monthly rent';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── POST: Pay Rent ───────────────────────────────────────────────────────────
// payload: { id, paymentMethod, paymentReference, notes }
export const payRent = createAsyncThunk(
  'rent/payRent',
  async ({ id, paymentMethod, paymentReference, notes }, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/${id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paymentMethod, paymentReference, notes }),
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return data;
      const msg = data?.message || data?.error || 'Failed to pay rent';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── PATCH: Update Rent Status ────────────────────────────────────────────────
// payload: { id, status }  — status: 'paid' | 'pending' | 'overdue'
export const updateRentStatus = createAsyncThunk(
  'rent/updateRentStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return data;
      const msg = data?.message || data?.error || 'Failed to update rent status';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── DELETE: Delete Rent Record ───────────────────────────────────────────────
export const deleteRent = createAsyncThunk(
  'rent/deleteRent',
  async (id, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return { id, ...data };
      const msg = data?.message || data?.error || 'Failed to delete rent record';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── GET: Full Rent History for Logged-in Landlord ────────────────────────────
export const getLandlordRentHistory = createAsyncThunk(
  'rent/getLandlordRentHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(`${BASE_URL}/landlord-history`, {
        method: 'GET',
      });
      const { ok, data } = await handleResponse(response);
      if (ok) return Array.isArray(data) ? data : data?.rent_history || [];
      const msg = data?.message || data?.error || 'Failed to load landlord rent history';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Network error';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);
