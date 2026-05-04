import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { navigate, resetRoot } from '../../navigation/RouterServices';
import { clearLoginData } from './loginSlice';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import { authFetch } from '../../utils/authFetch';


// ─── Base URL ─────────────────────────────────────────────────────────────────
const base_url = Config.Base_url;
// All endpoints → http://54.234.140.239/api/auth/*

// ─── Helper: safe JSON parse ──────────────────────────────────────────────────
const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

// ─── Helper: decode JWT payload without any library ──────────────────────────
const decodeJWT = (token) => {
  try {
    const base64Payload = token.split('.')[1];
    const decoded = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
};

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: '885661217394-r0u912mfeefb5ghf2m36fnmf3sjiruul.apps.googleusercontent.com',
    iosClientId: '885661217394-3ep2jb0ugbq9vb3hgf292nl1eakgg2dv.apps.googleusercontent.com', // ✅ fixed
    offlineAccess: false,
  });
};


// ─── Google OAuth Login / Register ────────────────────────────────────────────
export const googleOAuthLogin = createAsyncThunk(
  'loginSlice/googleOAuthLogin',
  async ({ persona }, { rejectWithValue }) => {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        console.log("Google User:", userInfo);

        const {idToken, user} = userInfo.data;
        
        if (!idToken) {
            return rejectWithValue('Google sign-in failed');
          }

        const response = await fetch(`${base_url}/auth/login`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 provider:  'google',
                 idToken:   idToken,
                 persona:   persona,
                 firstName: user?.givenName  || '',
                 lastName:  user?.familyName || '',
                 email:     user?.email      || '',
               }),
             });

      Toast.show('Login successful');
        


        const data = await safeJson(response);
             console.log('Login response:', data);

             if (response.ok && data?.accessToken) {
               return _handleOAuthSuccess(data, persona);
             } else {
               const msg = data?.message || 'Google login failed';
               Toast.show(msg);
               return rejectWithValue(msg);
             }
    } catch (err) {
      console.error(err);
      Toast.show('Google login failed');
      return rejectWithValue(err.message);
    }
  }
);
// ─── Apple OAuth Login / Register ─────────────────────────────────────────────
export const appleOAuthLogin = createAsyncThunk(
  'loginSlice/appleOAuthLogin',
  async ({ persona }, { rejectWithValue }) => {
    try {
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [
          appleAuth.Scope.FULL_NAME,
          appleAuth.Scope.EMAIL,
        ],
      });

      const { identityToken, fullName, email } = appleAuthResponse;

      if (!identityToken) return rejectWithValue('Apple sign-in failed: no token');

      // ✅ Decode JWT to get email on subsequent logins
      const tokenPayload = decodeJWT(identityToken);
      console.log('🍎 Decoded Apple token payload:', tokenPayload);

      // ✅ Use email from Apple response first, fall back to decoded token
      const resolvedEmail     = email              || tokenPayload.email || '';
      const resolvedFirstName = fullName?.givenName  || '';
      const resolvedLastName  = fullName?.familyName || '';

      console.log('🍎 Resolved user info:', { resolvedEmail, resolvedFirstName, resolvedLastName });

      const response = await fetch(`${base_url}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:        resolvedEmail,
          password:     '',
          expectedRole: persona,
          provider:     'apple',
          idToken:      identityToken,
          persona:      persona,
          firstName:    resolvedFirstName,
          lastName:     resolvedLastName,
          phone:        '',
        }),
      });

      console.log("📥 Backend status:", response.status);
      const data = await safeJson(response);
      console.log("📥 Backend response:", data);

      if (response.ok && data?.accessToken) {
        return _handleOAuthSuccess(data, persona);
      } else {
        const msg = data?.message || 'Apple login failed';
        Toast.show(msg);
        return rejectWithValue(msg);
      }

    } catch (err) {
      console.error('Apple OAuth error:', err);
      Toast.show('Apple sign-in was cancelled or failed');
      return rejectWithValue(err.message);
    }
  }
);

// ─── Shared post-OAuth success handler ────────────────────────────────────────
function _handleOAuthSuccess(data, persona) {
  const user         = data.user || {};
  const role         = user.role || persona;
  const userId       = user.id   || null;

  const userData = {
    accessToken:  data.accessToken,
    refreshToken: data.refreshToken || null,
    idToken:      null,
    landlordId:   role === 'landlord'   ? userId : null,
    tenantId:     role === 'tenant'     ? userId : null,
    contractorId: role === 'contractor' ? userId : null,
    role,
    email:       user.email     || '',
    firstName:   user.firstName || '',
    lastName:    user.lastName  || '',
    isFirstLogin: data.isFirstLogin ?? false,
  };

  Toast.show('Login successful');

  setTimeout(() => {
    if (role === 'tenant')      resetRoot('BottomFotter');
    else if (role === 'landlord')   resetRoot('ProfileFooter');
    else if (role === 'contractor') userData.isFirstLogin ? resetRoot('Welcome') : resetRoot('ContractorHome');
  }, 300);

  return userData;
}

// ─── Login ────────────────────────────────────────────────────────────────────
// POST /auth/login → { email, password }
// Response: { accessToken, refreshToken, user: { id, email, firstName, lastName, role } }
export const login = createAsyncThunk(
  'loginSlice/login',
  async (post, { rejectWithValue }) => {
      try {
          const loginFrozenUntil = getState()?.loginData?.loginFrozenUntil;
          if (loginFrozenUntil && Date.now() < loginFrozenUntil) {
            const secs = Math.ceil((loginFrozenUntil - Date.now()) / 1000);
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            const msg = `Too many failed attempts. Try again in ${m}m ${s}s`;
            Toast.show(msg);
            return rejectWithValue(msg);
          }
        } catch (e) {
          console.log('Freeze check skipped:', e.message);
        }
    const url = `${base_url}/auth/login`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:    post?.email || post?.username,
          password: post?.password,
        }),
      });

      const data = await safeJson(response);

      if (response.ok && data?.accessToken) {
        Toast.show('Login successfully');

        const user         = data.user || {};
        const role         = user.role || 'tenant';
        const userId       = user.id   || null;
        const landlordId   = role === 'landlord'   ? userId : null;
        const tenantId     = role === 'tenant'     ? userId : null;
        const contractorId = role === 'contractor' ? userId : null;
        const isFirstLogin = data.isFirstLogin ?? user.isFirstLogin ?? false;

        const userData = {
          accessToken:  data.accessToken,
          refreshToken: data.refreshToken,
          idToken:      null,
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

        setTimeout(() => {
          if (role === 'admin')            resetRoot('AdminDashboard');
          else if (role === 'tenant')      resetRoot('BottomFotter');
          else if (role === 'landlord')    resetRoot('ProfileFooter');
          else if (role === 'contractor')  isFirstLogin ? resetRoot('Welcome') : resetRoot('ContractorHome');
          else                             resetRoot('BottomFotter');
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
// POST /auth/register → { email, phone, password, firstName, lastName, role }
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
          phone:     userData.phoneNumber || userData.phone || '',
          role:      userData.role || 'tenant',
            ...(userData.inviteToken && { inviteToken: userData.inviteToken }),

             // ✅ Address fields — read from nested address object
             ...(userData.address && {
               latitude:    userData.address.lat      || null,
               longitude:   userData.address.lng      || null,
               address:     userData.address.street   || '',
               city:        userData.address.city     || '',
               state:       userData.address.state    || '',
             }),
        }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Registration successful! Please check your email for verification code.');
        console.log('Register response:', data);
        // ✅ Always return role so loginSlice can store it as tempUserRole
        return {
          ...data,
          email: userData.email,
          role:  userData.role || 'tenant',
        };
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
// POST /auth/confirm → { email, confirmationCode }
export const confirmSignUp = createAsyncThunk(
  'loginSlice/confirmSignUp',
  async (otpData, { rejectWithValue }) => {
    const url = `${base_url}/auth/confirm`; // ✅ uses base_url — no hardcoding

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:            otpData.email,
          confirmationCode: otpData.otpCode || otpData.confirmationCode,
        }),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Email verification successful! You can now login.');
        navigate('TermsAndConditions', { userType: otpData.role || 'tenant' });
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
// POST /auth/resend → { email }
export const resendVerificationCode = createAsyncThunk(
  'loginSlice/resendVerificationCode',
  async (params, { rejectWithValue }) => {
      try {
          const loginFrozenUntil = getState()?.loginData?.loginFrozenUntil;
          if (loginFrozenUntil && Date.now() < loginFrozenUntil) {
            const secs = Math.ceil((loginFrozenUntil - Date.now()) / 1000);
            const m = Math.floor(secs / 60);
            const s = secs % 60;
            const msg = `Too many failed attempts. Try again in ${m}m ${s}s`;
            Toast.show(msg);
            return rejectWithValue(msg);
          }
        } catch (e) {
          console.log('Freeze check skipped:', e.message);
        }
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
// POST /auth/forgot → { email }
export const forgotPassword = createAsyncThunk(
  'loginSlice/forgotPassword',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/auth/forgot`;

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
// POST /auth/confirm-forgot → { email, confirmationCode, newPassword }
export const confirmForgotPassword = createAsyncThunk(
  'loginSlice/confirmForgotPassword',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/auth/confirm-forgot`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:            params.email,
          confirmationCode: params.code || params.confirmationCode,
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
// POST /auth/refresh → { refreshToken }
export const refreshToken = createAsyncThunk(
  'loginSlice/refreshToken',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/auth/refresh`;

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
// GET /auth/me — requires Bearer token
export const getCurrentUser = createAsyncThunk(
  'loginSlice/getCurrentUser',
  async (params, { getState, rejectWithValue }) => {
    const url   = `${base_url}/auth/me`;
    const token = getState().loginData?.accessToken;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type':  'application/json',
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
// Local only — clears Redux state and navigates to Login
export const logout = createAsyncThunk(
  'loginSlice/logout',
  async (params, { dispatch }) => {
    try {
      dispatch(clearLoginData());
      resetRoot('Login');
      Toast.show('Logged out successfully');
      return true;
    } catch (err) {
      console.error('Logout error:', err);
      dispatch(clearLoginData());
      resetRoot('Login');
      return true;
    }
  }
);

// ─── Submit Contractor Services ───────────────────────────────────────────────
// POST /contractor/services → { services }
export const submitContractorServices = createAsyncThunk(
  'contractor/submitContractorServices',
  async (params, { rejectWithValue }) => {
    const url = `${base_url}/contractor/services`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.token}`,
          'Content-Type':  'application/json',
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

// ─── Verify Contractor Address (Google Geocoding) ─────────────────────────────
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
        `${Config.GOOGLE_MAPS_BASE_URL}?address=${encodeURIComponent(fullAddress)}&key=${Config.GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.results?.length > 0) {
          // inside verifyContractorAddress thunk

          const result = data.results[0];

          const { lat, lng } = result.geometry.location;
          const components = result.address_components;

          const getComponent = (type) =>
            components.find(c => c.types.includes(type))?.long_name || '';

          const streetNumber = getComponent('street_number');
          const route = getComponent('route');

          return {
            lat,
            lng,
            fullAddress: result.formatted_address,
            street: `${streetNumber} ${route}`.trim(),
            city: getComponent('locality') || getComponent('sublocality'),
            state: getComponent('administrative_area_level_1'),
            postalCode: getComponent('postal_code'),
            country: getComponent('country'),
          };
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

// ─── Fetch Countries ──────────────────────────────────────────────────────────
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


// ─── Validate Invite Token ────────────────────────────────────────────────────
// GET /auth/invite/validate?token=xxx
export const validateInviteToken = createAsyncThunk(
  'loginSlice/validateInviteToken',
  async (token, { rejectWithValue }) => {
    const url = `${base_url}/auth/invite/validate?token=${token}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await safeJson(response);

      if (response.ok) {
        // Expected response: { phone: "+19876543210", role: "tenant" }
        return data;
      } else {
        const errorMessage = data?.message || data?.error || 'Invalid or expired invite link';
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Invite token validation error:', err);
      Toast.show('Could not validate invite link');
      return rejectWithValue(err.message || 'Network error');
    }
  }
);


// ─── Get Prefilled Data (invite deep link) ────────────────────────────────
export const getPrefilledData = createAsyncThunk(
  'loginSlice/getPrefilledData',
  async (token, { rejectWithValue }) => {
    const url = `${base_url}/auth/getPrefilledData`;
    try {
      const response = await fetch(url);
      const data = await safeJson(response);
      if (response.ok && data?.success) return data.data;
      return rejectWithValue(data?.message || 'Failed to get prefilled data');
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);


export const uploadProfilePhoto = createAsyncThunk(
  'loginSlice/uploadProfilePhoto',
  async ({ uri, token, userId }, { rejectWithValue }) => {
    try {
      if (!uri)    return rejectWithValue('No image selected');
      if (!token)  return rejectWithValue('Authentication token is required');
 
      // ── Step 1: Get presigned upload URL ────────────────────────
        const fileName = `uploads/${userId || 'user'}-${Date.now()}.jpg`;
 
      console.log('📸 Uploading profile photo:', fileName);
 
      const signedResponse = await fetch(`${base_url}/s3/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName,
          contentType: 'image/jpeg',
          folder:      'uploads',
          expiresIn:   3600,
        }),
      });
 
      const signedData = await safeJson(signedResponse);
 
      if (!signedResponse.ok || !signedData.uploadUrl) {
        console.error('❌ Failed to get signed URL:', signedData);
        return rejectWithValue('Failed to get upload URL');
      }
 
      const { uploadUrl, fileUrl } = signedData;
 
      // ── Step 2: Upload blob to S3 ──────────────────────────────
      const fileResponse = await fetch(uri);
      const blob         = await fileResponse.blob();
 
      console.log('📦 Blob size:', blob.size, 'bytes');
 
      const s3Response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        body: blob,
      });
 
      if (!s3Response.ok) {
        const errorText = await s3Response.text();
        console.error('❌ S3 PUT failed:', s3Response.status, errorText.substring(0, 200));
        return rejectWithValue('Failed to upload image to S3');
      }
 
        console.log('✅ Profile photo uploaded to S3:', fileUrl);

        // ── Step 3: Save the S3 key to the backend ─────────────────
        let s3Key = fileUrl.includes('.amazonaws.com/')
          ? fileUrl.split('.amazonaws.com/')[1]?.split('?')[0]
          : fileName;

        if (s3Key && s3Key.startsWith('uploads/')) {
          s3Key = s3Key.replace('uploads/', '');
        }

        const saveResponse = await fetch(`${base_url}/auth/profile-photo`, {
          method: 'PUT',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ profilePhotoKey: s3Key }),
        });

        if (saveResponse.ok) {
          console.log('✅ Profile photo key saved to backend');
        } else {
          console.warn('⚠️ Could not save photo key to backend, but S3 upload succeeded');
        }

        // ── Step 4: Get a presigned DOWNLOAD URL to display immediately ──
        let downloadUrl = null;
        try {
          const dlResponse = await fetch(
            `${base_url}/s3/download-url?key=${encodeURIComponent(s3Key)}&expiresIn=3600`,
            {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` },
            }
          );
          const dlData = await safeJson(dlResponse);
          if (dlResponse.ok && dlData?.downloadUrl) {
            downloadUrl = dlData.downloadUrl;
            console.log('✅ Got presigned download URL for display');
          }
        } catch (e) {
          console.warn('⚠️ Could not get download URL, photo will load on next mount');
        }

        Toast.show('Profile photo updated!');
        return {
          profilePhotoKey: s3Key,
          profilePhotoUrl: downloadUrl || fileUrl,  // prefer presigned URL
        };
    } catch (err) {
      console.error('❌ uploadProfilePhoto error:', err);
      Toast.show('Failed to upload photo');
      return rejectWithValue(err.message || 'Upload failed');
    }
  }
);
 
 
// ─── Fetch Profile Photo ──────────────────────────────────────────────────────
// Uses GET /s3/download-url?key=<s3Key> to get a presigned download URL
// This should be called on app open / profile screen mount
//
// Params: { token, profilePhotoKey }
//   token            — JWT access token
//   profilePhotoKey  — S3 key stored in Redux / backend
// ─────────────────────────────────────────────────────────────────────────────
export const fetchProfilePhoto = createAsyncThunk(
  'loginSlice/fetchProfilePhoto',
  async ({ token, profilePhotoKey }, { rejectWithValue }) => {
    try {
      if (!profilePhotoKey) return rejectWithValue('No profile photo key');
      if (!token)           return rejectWithValue('Authentication token is required');
 
      console.log('🖼️ Fetching profile photo URL for key:', profilePhotoKey);
 
      const response = await fetch(
        `${base_url}/s3/download-url?key=${encodeURIComponent(profilePhotoKey)}&expiresIn=3600`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
 
      const data = await safeJson(response);
 
      if (response.ok && data?.downloadUrl) {
        console.log('✅ Profile photo download URL received');
        return {
          profilePhotoKey,
          profilePhotoUrl: data.downloadUrl,
        };
      } else {
        console.error('❌ Failed to get download URL:', data);
        return rejectWithValue(data?.message || 'Failed to get photo URL');
      }
    } catch (err) {
      console.error('❌ fetchProfilePhoto error:', err);
      return rejectWithValue(err.message || 'Failed to fetch photo');
    }
  }
);
 
export const registerDeviceTokenToServer = createAsyncThunk(
  'loginSlice/registerDeviceTokenToServer',
  async ({ deviceToken, userId, platform, deviceModel, appVersion, apnsEnv  }, { rejectWithValue }) => {
    try {
      if (!deviceToken) return rejectWithValue('Device token is missing');
      if (!userId)      return rejectWithValue('User ID is required to register device token');
 
      console.log('📲 Registering device token for userId:', userId);
        console.log('🧹 [Step 1] Cleaning duplicate token entries...');
              try {
                const deleteRes = await authFetch(
                  `${base_url}/notifications/device-token/${deviceToken}`,
                  { method: 'DELETE' }
                );
                console.log('✅ [Step 1] Old token entry cleaned:', deleteRes.status);
              } catch (e) {
                // Don't block registration if delete fails
                console.warn('⚠️ [Step 1] Pre-clean skipped:', e.message);
              }

              // ── Small wait to ensure DELETE commits ───────────────────────
              await new Promise(resolve => setTimeout(resolve, 500));

 
      // ✅ authFetch automatically attaches the Bearer token from Redux
      const response = await authFetch(`${base_url}/notifications/device-token`, {
        method: 'POST',
        body: JSON.stringify({
          deviceToken,
          platform:    platform    || 'ios',
          userId,
          deviceModel: deviceModel || 'Unknown Device',
          appVersion:  appVersion  || '1.0.0',
        }),
      });
 
      const data = await safeJson(response);
 
      if (response.ok) {
          console.log('✅ [Step 2] Token registered. userId:', userId);
          console.log('✅ [Step 2] Token preview:', deviceToken?.substring(0, 16) + '...');
        return { deviceToken };
      }
 
      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      console.warn('⚠️ Device token registration failed:', msg);
      return rejectWithValue(msg);
    } catch (err) {
      console.error('❌ registerDeviceTokenToServer error:', err);
      return rejectWithValue(err.message || 'Network error registering device token');
    }
  }
);

export const unregisterDeviceToken = createAsyncThunk(
  'login/unregisterDeviceToken',
  async (deviceToken, { rejectWithValue }) => {
    try {
      if (!deviceToken) return rejectWithValue('Device token is required.');

        const res = await authFetch(
          `${base_url}/notifications/device-token/${deviceToken}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        console.log('✅ Device token unregistered successfully');
        return { deviceToken };
      }

      const data = await parseSafeJSON(res);
      return rejectWithValue(data?.message || `HTTP ${res.status}`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to unregister device token');
    }
  }
);
