// loginSlice.js — Updated for Node.js API
// Added: resendVerificationCode, refreshToken, getCurrentUser cases
// Fixed: sanitizeToken helper, userData shape matches Node.js /auth/login response

import { createSlice, createSelector } from '@reduxjs/toolkit';

import {
  login,
  registerUser,
  confirmSignUp,
  resendVerificationCode,   // ✅ NEW — POST /auth/resend
  logout,
  forgotPassword,
  confirmForgotPassword,
  refreshToken,             // ✅ NEW — POST /auth/refresh
  getCurrentUser,           // ✅ NEW — GET /auth/me
  submitContractorServices,
  verifyContractorAddress,
  fetchCountries,
} from './services';

// ─── Sanitize token — strips all whitespace/newlines before storing ───────────
const sanitizeToken = (token) => {
  if (!token || token === 'null') return null;
  return String(token).replace(/\s+/g, '').trim() || null;
};

const initialState = {
  loading: false,
  userData: null,
  token: null,
  accessToken: null,
  idToken: null,
  refreshToken: null,
  is_logged: false,
  isFirstLogin: false,

  submittedServices: {
    loading: false,
    services: [],
    error: null,
  },

  countries: {
    loading: false,
    list: [{ name: 'United States', flag: '🇺🇸', dial: '+1' }],
    error: null,
  },

  addressVerification: {
    loading: false,
    status: 'idle',
    lat: null,
    lng: null,
    fullAddress: '',
    error: null,
  },

  registrationLoading: false,
  registrationData: null,
  isRegistrationComplete: false,

  otpLoading: false,
  isOtpVerified: false,
  tempUserEmail: '',

  // ✅ NEW: tracks resend code loading state separately
  resendCodeLoading: false,

  forgotPasswordLoading: false,
  resetCodeSent: false,

  resetPasswordLoading: false,
  passwordResetSuccess: false,

  // ✅ NEW: token refresh state
  tokenRefreshLoading: false,

  // ✅ NEW: current user state
  currentUserLoading: false,
  currentUserData: null,
};

const loginSlice = createSlice({
  name: 'loginSlice',
  initialState,
  reducers: {
    changeislogged: (state, action) => {
      state.is_logged = action.payload;
    },
    clearLoginData: (state) => {
      Object.assign(state, initialState);
    },
    setTempUserEmail: (state, action) => {
      state.tempUserEmail = action.payload;
    },
    clearRegistrationData: (state) => {
      state.registrationData       = null;
      state.isRegistrationComplete = false;
      state.tempUserEmail          = '';
    },
    clearOtpData: (state) => {
      state.isOtpVerified = false;
      state.otpLoading    = false;
    },
    clearForgotPasswordData: (state) => {
      state.forgotPasswordLoading = false;
      state.resetCodeSent         = false;
      state.resetPasswordLoading  = false;
      state.passwordResetSuccess  = false;
    },
    setFirstLoginComplete: (state) => {
      state.isFirstLogin = false;
    },
    resetAddressVerification: (state) => {
      state.addressVerification = {
        loading: false, status: 'idle',
        lat: null, lng: null, fullAddress: '', error: null,
      };
    },
    // ✅ NEW: lets components manually update tokens (e.g. after background refresh)
    updateTokens: (state, action) => {
      if (action.payload.accessToken) {
        const clean = sanitizeToken(action.payload.accessToken);
        state.accessToken = clean;
        state.token       = clean;
      }
      if (action.payload.refreshToken) {
        state.refreshToken = sanitizeToken(action.payload.refreshToken);
      }
      state.is_logged = !!state.accessToken;
    },
  },

  extraReducers: (builder) => {

    // ── LOGIN ──────────────────────────────────────────────────────────────────
    builder.addCase(login.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(login.fulfilled, (state, { payload }) => {
      state.loading = false;

      if (payload && typeof payload === 'object') {
        // ✅ userData shape from Node.js login response
        state.userData = {
          landlordId:   payload.landlordId   || null,
          tenantId:     payload.tenantId     || null,
          contractorId: payload.contractorId || null,
          role:         payload.role         || 'tenant',
          email:        payload.email        || '',
          firstName:    payload.firstName    || '',
          lastName:     payload.lastName     || '',
          phoneNumber:  payload.phoneNumber  || '',
        };

        state.isFirstLogin = payload.isFirstLogin || false;

        // ✅ Node.js returns accessToken directly (no AuthenticationResult wrapper)
        const rawAccess  = payload.accessToken  || null;
        const rawRefresh = payload.refreshToken || null;

        state.accessToken  = sanitizeToken(rawAccess);
        state.token        = sanitizeToken(rawAccess);   // kept for backward compat
        state.idToken      = null;                       // Node.js has no separate idToken
        state.refreshToken = sanitizeToken(rawRefresh);
        state.is_logged    = !!state.accessToken;
      } else {
        state.userData     = null;
        state.token        = null;
        state.accessToken  = null;
        state.idToken      = null;
        state.refreshToken = null;
        state.is_logged    = false;
        state.isFirstLogin = false;
      }
    });

    builder.addCase(login.rejected, (state) => {
      state.loading      = false;
      state.userData     = null;
      state.token        = null;
      state.accessToken  = null;
      state.idToken      = null;
      state.refreshToken = null;
      state.is_logged    = false;
      state.isFirstLogin = false;
    });

    // ── REGISTER ───────────────────────────────────────────────────────────────
    builder.addCase(registerUser.pending, (state) => {
      state.registrationLoading = true;
    });
    builder.addCase(registerUser.fulfilled, (state, { payload }) => {
      state.registrationLoading    = false;
      state.registrationData       = payload || null;
      state.isRegistrationComplete = true;
      state.tempUserEmail          = payload?.email || '';
    });
    builder.addCase(registerUser.rejected, (state) => {
      state.registrationLoading    = false;
      state.registrationData       = null;
      state.isRegistrationComplete = false;
    });

    // ── CONFIRM SIGN UP (OTP) ──────────────────────────────────────────────────
    builder.addCase(confirmSignUp.pending, (state) => {
      state.otpLoading = true;
    });
    builder.addCase(confirmSignUp.fulfilled, (state) => {
      state.otpLoading             = false;
      state.isOtpVerified          = true;
      state.registrationData       = null;
      state.isRegistrationComplete = false;
      state.tempUserEmail          = '';
    });
    builder.addCase(confirmSignUp.rejected, (state) => {
      state.otpLoading    = false;
      state.isOtpVerified = false;
    });

    // ── RESEND VERIFICATION CODE ✅ NEW ────────────────────────────────────────
    builder.addCase(resendVerificationCode.pending, (state) => {
      state.resendCodeLoading = true;
    });
    builder.addCase(resendVerificationCode.fulfilled, (state) => {
      state.resendCodeLoading = false;
    });
    builder.addCase(resendVerificationCode.rejected, (state) => {
      state.resendCodeLoading = false;
    });

    // ── FORGOT PASSWORD ────────────────────────────────────────────────────────
    builder.addCase(forgotPassword.pending, (state) => {
      state.forgotPasswordLoading = true;
      state.resetCodeSent         = false;
    });
    builder.addCase(forgotPassword.fulfilled, (state) => {
      state.forgotPasswordLoading = false;
      state.resetCodeSent         = true;
    });
    builder.addCase(forgotPassword.rejected, (state) => {
      state.forgotPasswordLoading = false;
      state.resetCodeSent         = false;
    });

    // ── CONFIRM FORGOT PASSWORD ────────────────────────────────────────────────
    builder.addCase(confirmForgotPassword.pending, (state) => {
      state.resetPasswordLoading  = true;
      state.passwordResetSuccess  = false;
    });
    builder.addCase(confirmForgotPassword.fulfilled, (state) => {
      state.resetPasswordLoading = false;
      state.passwordResetSuccess = true;
    });
    builder.addCase(confirmForgotPassword.rejected, (state) => {
      state.resetPasswordLoading = false;
      state.passwordResetSuccess = false;
    });

    // ── LOGOUT ────────────────────────────────────────────────────────────────
    builder.addCase(logout.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(logout.fulfilled, (state) => {
      Object.assign(state, initialState);
    });
    builder.addCase(logout.rejected, (state) => {
      state.loading = false;
    });

    // ── REFRESH TOKEN ✅ NEW ──────────────────────────────────────────────────
    builder.addCase(refreshToken.pending, (state) => {
      state.tokenRefreshLoading = true;
    });
    builder.addCase(refreshToken.fulfilled, (state, { payload }) => {
      state.tokenRefreshLoading = false;
      if (payload?.accessToken) {
        const clean        = sanitizeToken(payload.accessToken);
        state.accessToken  = clean;
        state.token        = clean;
        state.refreshToken = sanitizeToken(payload.refreshToken) || state.refreshToken;
        state.is_logged    = !!clean;
      }
    });
    builder.addCase(refreshToken.rejected, (state) => {
      state.tokenRefreshLoading = false;
      // If refresh fails → force logout
      state.accessToken  = null;
      state.token        = null;
      state.refreshToken = null;
      state.is_logged    = false;
    });

    // ── GET CURRENT USER ✅ NEW ───────────────────────────────────────────────
    builder.addCase(getCurrentUser.pending, (state) => {
      state.currentUserLoading = true;
    });
    builder.addCase(getCurrentUser.fulfilled, (state, { payload }) => {
      state.currentUserLoading = false;
      state.currentUserData    = payload || null;
      // Sync userData fields if something changed on server
      if (payload && state.userData) {
        state.userData = {
          ...state.userData,
          email:       payload.email       || state.userData.email,
          firstName:   payload.firstName   || state.userData.firstName,
          lastName:    payload.lastName    || state.userData.lastName,
          phoneNumber: payload.phoneNumber || state.userData.phoneNumber,
          role:        (payload.role       || state.userData.role || '').toLowerCase(),
        };
      }
    });
    builder.addCase(getCurrentUser.rejected, (state) => {
      state.currentUserLoading = false;
    });

    // ── CONTRACTOR SERVICES ────────────────────────────────────────────────────
    builder.addCase(submitContractorServices.pending, (state) => {
      state.submittedServices.loading = true;
      state.submittedServices.error   = null;
    });
    builder.addCase(submitContractorServices.fulfilled, (state, action) => {
      state.submittedServices.loading  = false;
      state.submittedServices.services = action.payload.selectedServices;
      state.isFirstLogin               = false;
    });
    builder.addCase(submitContractorServices.rejected, (state, action) => {
      state.submittedServices.loading = false;
      state.submittedServices.error   = action.payload;
    });

    // ── VERIFY CONTRACTOR ADDRESS ─────────────────────────────────────────────
    builder.addCase(verifyContractorAddress.pending, (state) => {
      state.addressVerification = {
        loading: true, status: 'idle',
        lat: null, lng: null, fullAddress: '', error: null,
      };
    });
    builder.addCase(verifyContractorAddress.fulfilled, (state, action) => {
      state.addressVerification = {
        loading:     false,
        status:      'success',
        lat:         action.payload.lat,
        lng:         action.payload.lng,
        fullAddress: action.payload.fullAddress,
        error:       null,
      };
    });
    builder.addCase(verifyContractorAddress.rejected, (state, action) => {
      state.addressVerification = {
        loading:     false,
        status:      'failed',
        lat:         null,
        lng:         null,
        fullAddress: '',
        error:       action.payload,
      };
    });

    // ── FETCH COUNTRIES ───────────────────────────────────────────────────────
    builder.addCase(fetchCountries.pending, (state) => {
      state.countries.loading = true;
      state.countries.error   = null;
    });
    builder.addCase(fetchCountries.fulfilled, (state, action) => {
      state.countries.loading = false;
      state.countries.list    = action.payload;
      state.countries.error   = null;
    });
    builder.addCase(fetchCountries.rejected, (state, action) => {
      state.countries.loading = false;
      state.countries.error   = action.payload;
    });
  },
});

// ─── Exports ──────────────────────────────────────────────────────────────────
export const loginReducer = loginSlice.reducer;

export const {
  changeislogged,
  clearLoginData,
  setTempUserEmail,
  clearRegistrationData,
  clearOtpData,
  clearForgotPasswordData,
  setFirstLoginComplete,
  resetAddressVerification,
  updateTokens,             // ✅ NEW
} = loginSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const loginDataSelectors = {
  // Raw state — used by legacy screens that destructure `is_logged`, `loading`, etc.
  getData: (state) => state.loginData,

  getLoginStatus: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading:      login.loading,
      isLogged:     login.is_logged,
      token:        login.accessToken || login.token,
      userData:     login.userData,
      isFirstLogin: login.isFirstLogin,
    })
  ),

  getRegistrationData: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading:    login.registrationLoading,
      data:       login.registrationData,
      isComplete: login.isRegistrationComplete,
    })
  ),

  getOtpData: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading:    login.otpLoading,
      isVerified: login.isOtpVerified,
      tempEmail:  login.tempUserEmail,
      // ✅ NEW: resend loading state available here too
      resendLoading: login.resendCodeLoading,
    })
  ),

  getForgotPasswordData: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading:       login.forgotPasswordLoading,
      resetCodeSent: login.resetCodeSent,
    })
  ),

  getResetPasswordData: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.resetPasswordLoading,
      success: login.passwordResetSuccess,
    })
  ),

  getAddressVerification: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading:     login.addressVerification.loading,
      status:      login.addressVerification.status,
      lat:         login.addressVerification.lat,
      lng:         login.addressVerification.lng,
      fullAddress: login.addressVerification.fullAddress,
      error:       login.addressVerification.error,
    })
  ),

  getCountries: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.countries.loading,
      list:    login.countries.list,
      error:   login.countries.error,
    })
  ),

  // ✅ NEW — token refresh selector
  getTokenRefresh: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading:      login.tokenRefreshLoading,
      accessToken:  login.accessToken,
      refreshToken: login.refreshToken,
    })
  ),

  // ✅ NEW — current user selector
  getCurrentUserData: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.currentUserLoading,
      data:    login.currentUserData,
    })
  ),

  // Primary token — always returns the sanitized accessToken
  getAccessToken:       (state) => state.loginData.accessToken || state.loginData.token || null,
  getSubmittedServices: (state) => state.loginData.submittedServices,
  getLandlordId:        (state) => state.loginData.userData?.landlordId   || null,
  getTenantId:          (state) => state.loginData.userData?.tenantId     || null,
  getUserRole:          (state) => state.loginData.userData?.role         || null,
  getContractorId:      (state) => state.loginData.userData?.contractorId || null,
  getIsFirstLogin:      (state) => state.loginData.isFirstLogin,
};
