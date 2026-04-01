// Add these new admin-related thunks to your existing services.js file

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { navigate, resetRoot } from '../../navigation/RouterServices';
import { Buffer } from 'buffer';

const base_url = Config.API_URL;

// Admin Login
export const adminLogin = createAsyncThunk(
  'loginSlice/adminLogin',
  async (post, { rejectWithValue }) => {
    const url = `${base_url}/admin/login`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: post?.email || post?.username,
          password: post?.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.accessToken) {
        Toast.show('Admin login successful');

        let adminId = null;
        let role = 'admin';
        let email = '';
        let firstName = '';
        let lastName = '';

        if (data.idToken) {
          try {
            const tokenParts = data.idToken.split('.');
            const payload = JSON.parse(
              Buffer.from(tokenParts[1], 'base64').toString()
            );

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
          accessToken: data.accessToken,
          idToken: data.idToken,
          refreshToken: data.refreshToken,
          adminId: adminId,
          role: role,
          email: email,
          firstName: firstName,
          lastName: lastName,
          isAdmin: true,
        };



        // Navigate to admin dashboard
        setTimeout(() => {
          resetRoot('AdminDashboard');
        }, 300);

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

// Fetch Users by Type (for admin)
export const fetchUsersByType = createAsyncThunk(
  'loginSlice/fetchUsersByType',
  async ({ userType, accessToken }, { rejectWithValue }) => {
    const url = `${base_url}/admin/users/${userType}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          users: data.users || data,
          userType: userType,
        };
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

// Set Admin Viewing User (switch to view user's data)
export const setAdminViewingUser = createAsyncThunk(
  'loginSlice/setAdminViewingUser',
  async ({ user, userType, accessToken }, { rejectWithValue }) => {
    const url = `${base_url}/admin/view-as-user`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          userId: user.userId || user.email,
          userType: userType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Prepare user data for viewing
        const viewingUserData = {
          landlordId: userType === 'landlord' ? (user.landlordId || user.userId) : null,
          tenantId: userType === 'tenant' ? (user.tenantId || user.userId) : null,
          contractorId: userType === 'contractor' ? (user.contractorId || user.userId) : null,
          role: userType,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          isAdminViewing: true,
          adminAccessToken: accessToken, // Keep admin token for switching back
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

// Exit Admin Viewing Mode (return to admin dashboard)
export const exitAdminViewingMode = createAsyncThunk(
  'loginSlice/exitAdminViewingMode',
  async (_, { getState }) => {
    const state = getState();
    const adminAccessToken = state.loginData.adminAccessToken;

    if (adminAccessToken) {
      Toast.show('Returned to admin view');
      setTimeout(() => {
        resetRoot('AdminDashboard');
      }, 300);
    }

    return { success: true };
  }
);
