import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { navigate, resetRoot } from '../../navigation/RouterServices';
import { clearLoginData } from './loginSlice';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// ✅ NEW: Node.js API — all auth routes are under /auth/*
// Make sure Config.API_URL points to your new Node.js server base URL
// e.g. https://your-new-api.com  (NO trailing slash)
const base_url = Config.Base_url;

// ─── Helper: safe JSON parse ───────────────────────────────────────────────────
const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
// OLD: POST /login        → { email, password }
// NEW: POST /auth/login   → { email, password, expectedRole? }
// NEW response: { accessToken, refreshToken, tokenType, expiresIn, user: { id, email, firstName, lastName, role, isEmailVerified, isActive } }
export const login = createAsyncThunk(
  'loginSlice/login',
  async (post, { rejectWithValue }) => {
    const url = `${base_url}/auth/login`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: post?.email || post?.username,
          password: post?.password,
          // Optional: pass expectedRole if you want the API to validate role on login
          // expectedRole: post?.expectedRole,
        }),
      });

      const data = await safeJson(response);

      if (response.ok && data?.accessToken) {
        Toast.show('Login successfully');

        // ✅ NEW: User info comes directly from data.user — no JWT decoding needed
        const user = data.user || {};
        const role = user.role || 'tenant';
        const userId = user.id || null;

        // Map role → role-specific ID field (mirrors your old Cognito logic)
        const landlordId   = role === 'landlord'   ? userId : null;
        const tenantId     = role === 'tenant'      ? userId : null;
        const contractorId = role === 'contractor'  ? userId : null;

        // isFirstLogin is not in the new swagger UserDto — default to false.
        // If your backend adds it later, swap to: user.isFirstLogin ?? false
        const isFirstLogin = data.isFirstLogin ?? user.isFirstLogin ?? false;

        const userData = {
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
          idToken:      null,          // Node.js JWT — no separate idToken
          landlordId,
          tenantId,
          contractorId,
          role,
          email:       user.email       || '',
          firstName:   user.firstName   || '',
          lastName:    user.lastName    || '',
          phoneNumber: user.phoneNumber || '',
          isFirstLogin,
        };

        console.log('✅ Final userData:', userData);

        // Navigate based on role
        setTimeout(() => {
          if (role === 'admin') {
            resetRoot('AdminDashboard');
          } else if (role === 'tenant') {
            resetRoot('BottomFotter');
          } else if (role === 'landlord') {
            resetRoot('ProfileFooter');
          } else if (role === 'contractor') {
            isFirstLogin ? resetRoot('Welcome') : resetRoot('ContractorHome');
          } else {
            resetRoot('BottomFotter');
          }
        }, 300);

        return userData;
      } else {
        const errorMessage = data?.message || data?.error || 'Invalid credentials';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Login error:', err);
      Toast.show('Oops, there seems to be an error');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// ─── Register ─────────────────────────────────────────────────────────────────
// OLD: POST /register          → { email, password, firstName, lastName, phoneNumber, role }
// NEW: POST /auth/register     → { email, phone, password, firstName, lastName, role }
// Note: field renamed phoneNumber → phone
export const registerUser = createAsyncThunk(
  'loginSlice/registerUser',
  async (userData, { rejectWithValue }) => {
    const url = `${base_url}/auth/register`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     userData.email,
          password:  userData.password,
          firstName: userData.firstName,
          lastName:  userData.lastName,
          phone:     userData.phoneNumber || userData.phone || '', // ✅ renamed field
          role:      userData.role || 'tenant',
        }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Registration successful! Please check your email for verification code.');
        console.log('Register response:', data);
        return { ...data, email: userData.email };
      } else {
        const errorMessage = data?.message || data?.error || 'Registration failed';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Registration error:', err);
      Toast.show('Oops, there seems to be an error during registration');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// ─── Confirm Sign Up (OTP / Email Verification) ───────────────────────────────
// OLD: POST /confirm          → { email, code }
// NEW: POST /auth/confirm     → { email, confirmationCode }
// Note: field renamed code → confirmationCode
export const confirmSignUp = createAsyncThunk(
  'loginSlice/confirmSignUp',
  async (otpData, { rejectWithValue }) => {
    const url = `${base_url}/auth/confirm`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:            otpData.email,
          confirmationCode: otpData.otpCode || otpData.confirmationCode, // ✅ renamed field
        }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Email verification successful! You can now login.');
        navigate('Terms&Conditions', { userType: otpData.role || 'tenant' });
        return data;
      } else {
        const errorMessage = data?.message || data?.error || 'OTP verification failed';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      Toast.show('Oops, there seems to be an error during verification');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// ─── Resend Verification Code ─────────────────────────────────────────────────
// OLD: (not in old services — was missing)
// NEW: POST /auth/resend   → { email }
export const resendVerificationCode = createAsyncThunk(
  'loginSlice/resendVerificationCode',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/auth/resend`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: params.email }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Verification code resent. Please check your email.');
        return data;
      } else {
        const errorMessage = data?.message || data?.error || 'Failed to resend code';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Resend code error:', err);
      Toast.show('Oops, there seems to be an error');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// ─── Forgot Password ──────────────────────────────────────────────────────────
// OLD: POST /forgot-password   → { email }
// NEW: POST /auth/forgot       → { email }
// (body is same, only URL changed)
export const forgotPassword = createAsyncThunk(
  'loginSlice/forgotPassword',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/auth/forgot`;   // ✅ URL changed

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: params.email }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show(data?.message || 'Reset code sent to your email');
        return data;
      } else {
        const errorMessage = data?.message || data?.error || 'Failed to send reset code';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      Toast.show('Oops, there seems to be an error');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// ─── Confirm Forgot Password (Reset Password) ─────────────────────────────────
// OLD: POST /confirm-forgot        → { email, code, newPassword }
// NEW: POST /auth/confirm-forgot   → { email, confirmationCode, newPassword }
// Note: field renamed code → confirmationCode
export const confirmForgotPassword = createAsyncThunk(
  'loginSlice/confirmForgotPassword',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/auth/confirm-forgot`;   // ✅ URL changed

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:            params.email,
          confirmationCode: params.code || params.confirmationCode, // ✅ renamed field
          newPassword:      params.newPassword,
        }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show(data?.message || 'Password reset successful');
        navigate('Login');
        return data;
      } else {
        const errorMessage = data?.message || data?.error || 'Failed to reset password';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Confirm forgot password error:', err);
      Toast.show('Oops, there seems to be an error');
      return rejectWithValue(err.message || 'Oops, there seems to be an error');
    }
  }
);

// ─── Refresh Token ────────────────────────────────────────────────────────────
// OLD: POST /refresh         → { refreshToken }  (+ Bearer accessToken header)
// NEW: POST /auth/refresh    → { refreshToken }  (no auth header needed)
export const refreshToken = createAsyncThunk(
  'loginSlice/refreshToken',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/auth/refresh`;   // ✅ URL changed

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: params.refreshToken }),
      });

      const data = await safeJson(response);

      if (response.ok && data?.accessToken) {
        return {
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
          idToken:      null,
        };
      } else {
        const errorMessage = data?.message || data?.error || 'Token refresh failed';
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Token refresh error:', err);
      return rejectWithValue(err.message || 'Token refresh failed');
    }
  }
);

// ─── Get Current User ─────────────────────────────────────────────────────────
// NEW endpoint (was not in old Python API)
// GET /auth/me  — requires Bearer token
export const getCurrentUser = createAsyncThunk(
  'loginSlice/getCurrentUser',
  async (params, { getState, rejectWithValue }) => {
    const url = `${base_url}/auth/me`;
    const token = getState().loginData?.accessToken;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await safeJson(response);

      if (response.ok) {
        return data;
      } else {
        return rejectWithValue(data?.message || 'Failed to fetch user');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);

// ─── Logout ───────────────────────────────────────────────────────────────────
// No logout endpoint in new swagger — local clear only (same as before)
export const logout = createAsyncThunk(
  'loginSlice/logout',
  async (params, { dispatch, rejectWithValue }) => {
    try {
      dispatch(clearLoginData());
      resetRoot('Login');
      Toast.show('Logged out successfully');
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      dispatch(clearLoginData());
      resetRoot('Login');
      Toast.show('Logged out successfully');
      return true;
    }
  }
);

// ─── Submit Contractor Services ───────────────────────────────────────────────
// OLD: POST /contractor/services  + Cognito UpdateUserAttributes call
// NEW: No /contractor/services in swagger yet — keeping same URL for now.
// ✅ Removed the Cognito direct call (not applicable for Node.js backend).
//    If your Node.js API has a contractor services endpoint, update the URL here.
export const submitContractorServices = createAsyncThunk(
  'contractor/submitContractorServices',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/contractor/services`;  // Update if endpoint changes

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ services: params.services }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        return {
          selectedServices: params.services,
          response: data,
        };
      } else {
        return rejectWithValue(data?.message || 'Failed to submit services');
      }
    } catch (err) {
      return rejectWithValue('Network error');
    }
  }
);

// ─── Verify Contractor Address (Google Geocoding — unchanged) ─────────────────
export const verifyContractorAddress = createAsyncThunk(
  'loginSlice/verifyContractorAddress',
  async (addressFields, { rejectWithValue }) => {
    const { street, city, state, zipcode } = addressFields;

    const fullAddress = [street, city, state, zipcode]
      .map(s => s?.trim())
      .filter(Boolean)
      .join(', ');

    if (!fullAddress) {
      return rejectWithValue('Address fields are required.');
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=AIzaSyAwJzzG3VbyVTA0vEmKVQy7Ga15UYFJqGo`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng, fullAddress: data.results[0].formatted_address };
      }

      const statusMessages = {
        ZERO_RESULTS:     'Address not found. Please check your details and try again.',
        OVER_DAILY_LIMIT: 'Geocoding limit reached. Please try again later.',
        OVER_QUERY_LIMIT: 'Too many requests. Please try again later.',
        REQUEST_DENIED:   'Geocoding access denied. Check your API key restrictions.',
        INVALID_REQUEST:  'Invalid address. Please fill in all fields.',
        UNKNOWN_ERROR:    'Unknown error. Please try again.',
      };

      const msg = statusMessages[data.status] || 'Address could not be verified.';
      Toast.show(msg);
      return rejectWithValue(msg);
    } catch (err) {
      const msg = 'Network error. Check your connection and try again.';
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
);

// ─── Fetch Countries (external API — unchanged) ───────────────────────────────
export const fetchCountries = createAsyncThunk(
  'loginSlice/fetchCountries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('https://restcountries.com/v3.1/all?fields=name,flags,idd');

      if (!response.ok) {
        return rejectWithValue('Failed to fetch countries');
      }

      const data = await response.json();

      const countries = data
        .map(c => ({
          name: c.name.common,
          flag: c.flags?.emoji ?? '',
          dial: c.idd?.root
            ? c.idd.root + (c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : '')
            : '',
        }))
        .filter(c => c.dial && c.name)
        .sort((a, b) => {
          if (a.name === 'United States') return -1;
          if (b.name === 'United States') return 1;
          return a.name.localeCompare(b.name);
        });

      return countries;
    } catch (err) {
      return rejectWithValue(err.message || 'Network error');
    }
  }
);
