// services.jsx (Vendors) — ✅ UPDATED with authFetch
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { authFetch } from '../../utils/authFetch';  // ✅ NEW

const BASE_URL = Config.Base_url;

const parseSafeJSON = async (res) => {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { message: text }; }
};

export const createVendor = createAsyncThunk(
  'vendors/create',
  async ({ name, serviceType, rating }, { rejectWithValue }) => {
    try {
      const res = await authFetch(`${BASE_URL}/vendors`, {
        method: 'POST', body: JSON.stringify({ name, serviceType, ...(rating !== undefined && { rating }) }),
      });
      const data = await parseSafeJSON(res);
      if (res.ok) return data;
      return rejectWithValue(data?.message || 'Failed to create vendor');
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const getAllVendors = createAsyncThunk(
  'vendors/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch(`${BASE_URL}/vendors`, { method: 'GET' });
      const data = await parseSafeJSON(res);
      if (res.ok) return Array.isArray(data) ? data : (data.items || data.vendors || []);
      return rejectWithValue(data?.message || 'Failed to fetch vendors');
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const getVendorById = createAsyncThunk(
  'vendors/getById',
  async ({ id }, { rejectWithValue }) => {
    try {
      if (!id) return rejectWithValue('Vendor ID is required.');
      const res = await authFetch(`${BASE_URL}/vendors/${id}`, { method: 'GET' });
      const data = await parseSafeJSON(res);
      if (res.ok) return data;
      return rejectWithValue(data?.message || 'Vendor not found');
    } catch (err) { return rejectWithValue(err.message); }
  }
);

export const updateVendor = createAsyncThunk(
  'vendors/update',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      if (!id) return rejectWithValue('Vendor ID is required.');
      const res = await authFetch(`${BASE_URL}/vendors/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
      const data = await parseSafeJSON(res);
      if (res.ok) return data;
      return rejectWithValue(data?.message || 'Failed to update vendor');
    } catch (err) { return rejectWithValue(err.message); }
  }
);
