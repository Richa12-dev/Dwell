// adminServices.js — ✅ UPDATED with authFetch
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { navigate, resetRoot } from '../../navigation/RouterServices';
import { Buffer } from 'buffer';
import { authFetch } from '../../utils/authFetch';  // ✅ NEW

const base_url = Config.API_URL;

// ⚠️ Admin Login — keeps raw fetch (no auth needed for login)
export const adminLogin = createAsyncThunk(
  'loginSlice/adminLogin',
  async (post, { rejectWithValue }) => {
    const url = `${base_url}/admin/login`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: post?.email || post?.username,
          password: post?.password,
        }),
      });
      const data = await response.json();
      if (response.ok && data?.accessToken) {
        Toast.show('Admin login successful');
        let adminId = null, role = 'admin', email = '', firstName = '', lastName = '';
        if (data.idToken) {
          try {
            const tokenParts = data.idToken.split('.');
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            email = payload.email || '';
            firstName = payload.given_name || '';
            lastName = payload.family_name || '';
            role = payload['custom:role'] || 'admin';
            adminId = payload['custom:adminId'] || payload.sub;
          } catch (decodeError) {
            console.error('❌ Error decoding admin token:', decodeError);
          }
        }
        const adminData = {
          accessToken: data.accessToken, idToken: data.idToken, refreshToken: data.refreshToken,
          adminId, role, email, firstName, lastName, isAdmin: true,
        };
        setTimeout(() => { resetRoot('AdminDashboard'); }, 300);
        return adminData;
      } else {
        const errorMessage = data?.message || data?.error || 'Invalid admin credentials';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Admin login error:', err);
      Toast.show('Oops, there seems to be an error');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// ✅ Uses authFetch
export const fetchUsersByType = createAsyncThunk(
  'loginSlice/fetchUsersByType',
  async ({ userType }, { rejectWithValue }) => {
    const url = `${base_url}/admin/users/${userType}`;
    try {
      const response = await authFetch(url, { method: 'GET' });
      const data = await response.json();
      if (response.ok) {
        return { users: data.users || data, userType };
      } else {
        const errorMessage = data?.message || `Failed to fetch ${userType}s`;
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error(`Error fetching ${userType}s:`, err);
      Toast.show('Failed to load users');
      return rejectWithValue(err.message || 'Failed to load users');
    }
  }
);

// ✅ Uses authFetch
export const setAdminViewingUser = createAsyncThunk(
  'loginSlice/setAdminViewingUser',
  async ({ user, userType }, { getState, rejectWithValue }) => {
    const url = `${base_url}/admin/view-as-user`;
    try {
      const response = await authFetch(url, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.userId || user.email,
          userType,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        const state = getState();
        const accessToken = state.loginData?.accessToken || state.loginData?.token;
        const viewingUserData = {
          landlordId: userType === 'landlord' ? (user.landlordId || user.userId) : null,
          tenantId: userType === 'tenant' ? (user.tenantId || user.userId) : null,
          contractorId: userType === 'contractor' ? (user.contractorId || user.userId) : null,
          role: userType, email: user.email, firstName: user.firstName,
          lastName: user.lastName, phoneNumber: user.phoneNumber,
          isAdminViewing: true, adminAccessToken: accessToken,
        };
        Toast.show(`Viewing as ${user.firstName} ${user.lastName}`);
        return viewingUserData;
      } else {
        const errorMessage = data?.message || 'Failed to switch user view';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Error switching user view:', err);
      Toast.show('Failed to switch user view');
      return rejectWithValue(err.message || 'Failed to switch user view');
    }
  }
);

// No fetch needed — stays as-is
export const exitAdminViewingMode = createAsyncThunk(
  'loginSlice/exitAdminViewingMode',
  async (_, { getState }) => {
    const state = getState();
    const adminAccessToken = state.loginData.adminAccessToken;
    if (adminAccessToken) {
      Toast.show('Returned to admin view');
      setTimeout(() => { resetRoot('AdminDashboard'); }, 300);
    }
    return { success: true };
  }
);
