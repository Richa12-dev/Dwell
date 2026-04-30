import { createSlice, createSelector } from '@reduxjs/toolkit';

import {
  login,
  registerUser,
  confirmSignUp,
  resendVerificationCode,
  logout,
  forgotPassword,
  confirmForgotPassword,
  refreshToken,
  getCurrentUser,
  submitContractorServices,
  verifyContractorAddress,
  fetchCountries,
  googleOAuthLogin,
  appleOAuthLogin,
  uploadProfilePhoto,
  fetchProfilePhoto,
  registerDeviceTokenToServer,
 
} from './loginservices';

const sanitizeToken = (token) => {
  if (!token || token === 'null') return null;
  return String(token).replace(/\s+/g, '').trim() || null;
};

function _applyAuthPayload(state, payload) {
  if (!payload) return;
  state.userData = {
    landlordId:   payload.landlordId   || null,
    tenantId:     payload.tenantId     || null,
    contractorId: payload.contractorId || null,
    role:         payload.role         || 'tenant',
    phone:        payload.phone        || payload.phoneNumber || '',
    email:        payload.email        || '',
    firstName:    payload.firstName    || '',
    lastName:     payload.lastName     || '',
  };
  state.isFirstLogin = payload.isFirstLogin || false;
  state.accessToken  = sanitizeToken(payload.accessToken);
  state.token        = state.accessToken;
  state.refreshToken = sanitizeToken(payload.refreshToken);
  state.is_logged    = !!state.accessToken;
}

const initialState = {
  loading: false,
  userData: null,
  token: null,
  accessToken: null,
  idToken: null,
  refreshToken: null,
  is_logged: false,
  isFirstLogin: false,

  profilePhoto: { key: null, url: null, loading: false, error: null },

  submittedServices: { loading: false, services: [], error: null },

  countries: {
    loading: false,
    list: [{ name: 'United States', flag: '🇺🇸', dial: '+1' }],
    error: null,
  },

  addressVerification: {
    loading: false, status: 'idle',
    lat: null, lng: null, fullAddress: '', error: null,
  },

  registrationLoading: false,
  registrationData: null,
  isRegistrationComplete: false,

  otpLoading: false,
  isOtpVerified: false,
  tempUserEmail: '',
  tempUserRole: '',
  resendCodeLoading: false,

  forgotPasswordLoading: false,
  resetCodeSent: false,
  resetPasswordLoading: false,
  passwordResetSuccess: false,

  tokenRefreshLoading: false,
  currentUserLoading: false,
  currentUserData: null,

  // ✅ NEW — 3 wrong login → 5 min freeze
  loginAttempts: 0,
  loginFrozenUntil: null,

  // ✅ NEW — 3 resend OTP → 5 min freeze
  resendAttempts: 0,
  resendFrozenUntil: null,
    deviceToken: null,
};

const loginSlice = createSlice({
  name: 'loginSlice',
  initialState,
  reducers: {
    changeislogged: (state, action) => { state.is_logged = action.payload; },
    clearLoginData: (state) => { Object.assign(state, initialState); },
    setTempUserEmail: (state, action) => { state.tempUserEmail = action.payload; },
    setTempUserRole: (state, action) => { state.tempUserRole = action.payload; },
    clearRegistrationData: (state) => {
      state.registrationData = null;
      state.isRegistrationComplete = false;
      state.tempUserEmail = '';
      state.tempUserRole = '';
    },
    clearOtpData: (state) => {
      state.isOtpVerified = false;
      state.otpLoading = false;
      state.tempUserRole = '';
      state.resendAttempts = 0;
      state.resendFrozenUntil = null;
    },
    clearForgotPasswordData: (state) => {
      state.forgotPasswordLoading = false;
      state.resetCodeSent = false;
      state.resetPasswordLoading = false;
      state.passwordResetSuccess = false;
    },
    setFirstLoginComplete: (state) => { state.isFirstLogin = false; },
    resetAddressVerification: (state) => {
      state.addressVerification = {
        loading: false, status: 'idle', lat: null, lng: null, fullAddress: '', error: null,
      };
    },
    updateTokens: (state, action) => {
      if (action.payload.accessToken) {
        const clean = sanitizeToken(action.payload.accessToken);
        state.accessToken = clean;
        state.token = clean;
      }
      if (action.payload.refreshToken) {
        state.refreshToken = sanitizeToken(action.payload.refreshToken);
      }
      state.is_logged = !!state.accessToken;
    },
    clearProfilePhoto: (state) => {
      state.profilePhoto = { key: null, url: null, loading: false, error: null };
    },

    // ✅ Login freeze
    clearLoginFreezeIfExpired: (state) => {
      if (state.loginFrozenUntil && Date.now() >= state.loginFrozenUntil) {
        state.loginAttempts = 0;
        state.loginFrozenUntil = null;
      }
    },
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0;
      state.loginFrozenUntil = null;
    },

    // ✅ Resend freeze
    clearResendFreezeIfExpired: (state) => {
      if (state.resendFrozenUntil && Date.now() >= state.resendFrozenUntil) {
        state.resendAttempts = 0;
        state.resendFrozenUntil = null;
      }
    },
    resetResendAttempts: (state) => {
      state.resendAttempts = 0;
      state.resendFrozenUntil = null;
    },
      
      setDeviceToken: (state, action) => {
        state.deviceToken = action.payload;
      },
  },

  extraReducers: (builder) => {
    // ── LOGIN ────────────────────────────────────────────────────────
    builder.addCase(login.pending, (state) => { state.loading = true; });
    builder.addCase(login.fulfilled, (state, { payload }) => {
      state.loading = false;
      state.loginAttempts = 0;
      state.loginFrozenUntil = null;
      if (payload && typeof payload === 'object') {
        state.userData = {
          landlordId: payload.landlordId || null,
          tenantId: payload.tenantId || null,
          contractorId: payload.contractorId || null,
          role: payload.role || 'tenant',
          email: payload.email || '',
          firstName: payload.firstName || '',
          lastName: payload.lastName || '',
          phoneNumber: payload.phoneNumber || '',
        };
        state.isFirstLogin = payload.isFirstLogin || false;
        state.accessToken = sanitizeToken(payload.accessToken);
        state.token = sanitizeToken(payload.accessToken);
        state.idToken = null;
        state.refreshToken = sanitizeToken(payload.refreshToken);
        state.is_logged = !!state.accessToken;
      } else {
        state.userData = null;
        state.token = null;
        state.accessToken = null;
        state.idToken = null;
        state.refreshToken = null;
        state.is_logged = false;
        state.isFirstLogin = false;
      }
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loading = false;
      state.userData = null;
      state.token = null;
      state.accessToken = null;
      state.idToken = null;
      state.refreshToken = null;
      state.is_logged = false;
      state.isFirstLogin = false;
      // ✅ Count only credential errors, not network/freeze errors
      const msg = (action.payload || '').toLowerCase();
      const isCredErr = msg.includes('invalid') || msg.includes('incorrect') || msg.includes('wrong') || msg.includes('credentials');
      const isFreezeMsg = msg.includes('too many') || msg.includes('try again in');
      if (isCredErr && !isFreezeMsg) {
        state.loginAttempts += 1;
        if (state.loginAttempts >= 3) {
          state.loginFrozenUntil = Date.now() + 5 * 60 * 1000;
        }
      }
    });

    // ── REGISTER ─────────────────────────────────────────────────────
    builder.addCase(registerUser.pending, (state) => { state.registrationLoading = true; });
    builder.addCase(registerUser.fulfilled, (state, { payload }) => {
      state.registrationLoading = false;
      state.registrationData = payload || null;
      state.isRegistrationComplete = true;
      state.tempUserEmail = payload?.email || '';
      state.tempUserRole = payload?.role || 'tenant';
      state.resendAttempts = 0;
      state.resendFrozenUntil = null;
    });
    builder.addCase(registerUser.rejected, (state) => {
      state.registrationLoading = false;
      state.registrationData = null;
      state.isRegistrationComplete = false;
    });

    // ── CONFIRM SIGN UP (OTP) ────────────────────────────────────────
    builder.addCase(confirmSignUp.pending, (state) => { state.otpLoading = true; });
    builder.addCase(confirmSignUp.fulfilled, (state) => {
      state.otpLoading = false;
      state.isOtpVerified = true;
      state.registrationData = null;
      state.isRegistrationComplete = false;
      state.tempUserEmail = '';
      state.tempUserRole = '';
      state.resendAttempts = 0;
      state.resendFrozenUntil = null;
    });
    builder.addCase(confirmSignUp.rejected, (state) => {
      state.otpLoading = false;
      state.isOtpVerified = false;
    });

    // ── RESEND VERIFICATION CODE ─────────────────────────────────────
    builder.addCase(resendVerificationCode.pending, (state) => { state.resendCodeLoading = true; });
    builder.addCase(resendVerificationCode.fulfilled, (state) => {
      state.resendCodeLoading = false;
      // ✅ Count each successful resend
      state.resendAttempts += 1;
      if (state.resendAttempts >= 3) {
        state.resendFrozenUntil = Date.now() + 5 * 60 * 1000;
      }
    });
    builder.addCase(resendVerificationCode.rejected, (state) => { state.resendCodeLoading = false; });

    // ── FORGOT PASSWORD ──────────────────────────────────────────────
    builder.addCase(forgotPassword.pending, (state) => { state.forgotPasswordLoading = true; state.resetCodeSent = false; });
    builder.addCase(forgotPassword.fulfilled, (state) => { state.forgotPasswordLoading = false; state.resetCodeSent = true; });
    builder.addCase(forgotPassword.rejected, (state) => { state.forgotPasswordLoading = false; state.resetCodeSent = false; });

    // ── CONFIRM FORGOT PASSWORD ──────────────────────────────────────
    builder.addCase(confirmForgotPassword.pending, (state) => { state.resetPasswordLoading = true; state.passwordResetSuccess = false; });
    builder.addCase(confirmForgotPassword.fulfilled, (state) => { state.resetPasswordLoading = false; state.passwordResetSuccess = true; });
    builder.addCase(confirmForgotPassword.rejected, (state) => { state.resetPasswordLoading = false; state.passwordResetSuccess = false; });

    // ── LOGOUT ───────────────────────────────────────────────────────
    builder.addCase(logout.pending, (state) => { state.loading = true; });
    builder.addCase(logout.fulfilled, (state) => { Object.assign(state, initialState); });
    builder.addCase(logout.rejected, (state) => { state.loading = false; });

    // ── REFRESH TOKEN ────────────────────────────────────────────────
    builder.addCase(refreshToken.pending, (state) => { state.tokenRefreshLoading = true; });
    builder.addCase(refreshToken.fulfilled, (state, { payload }) => {
      state.tokenRefreshLoading = false;
      if (payload?.accessToken) {
        const clean = sanitizeToken(payload.accessToken);
        state.accessToken = clean;
        state.token = clean;
        state.refreshToken = sanitizeToken(payload.refreshToken) || state.refreshToken;
        state.is_logged = !!clean;
      }
    });
    builder.addCase(refreshToken.rejected, (state) => {
      state.tokenRefreshLoading = false;
      state.accessToken = null; state.token = null; state.refreshToken = null; state.is_logged = false;
    });

    // ── GET CURRENT USER ─────────────────────────────────────────────
    builder.addCase(getCurrentUser.pending, (state) => { state.currentUserLoading = true; });
    builder.addCase(getCurrentUser.fulfilled, (state, { payload }) => {
      state.currentUserLoading = false;
      state.currentUserData = payload || null;
      if (payload && state.userData) {
        state.userData = {
          ...state.userData,
          email: payload.email || state.userData.email,
          firstName: payload.firstName || state.userData.firstName,
          lastName: payload.lastName || state.userData.lastName,
          phone: payload.phone       || state.userData.phone,
          role: (payload.role || state.userData.role || '').toLowerCase(),
        };
      }
      if (payload?.profilePhotoKey) { state.profilePhoto.key = payload.profilePhotoKey; }
    });
    builder.addCase(getCurrentUser.rejected, (state) => { state.currentUserLoading = false; });

    // ── CONTRACTOR SERVICES ──────────────────────────────────────────
    builder.addCase(submitContractorServices.pending, (state) => { state.submittedServices.loading = true; state.submittedServices.error = null; });
    builder.addCase(submitContractorServices.fulfilled, (state, action) => {
      state.submittedServices.loading = false;
      state.submittedServices.services = action.payload.selectedServices;
      state.isFirstLogin = false;
    });
    builder.addCase(submitContractorServices.rejected, (state, action) => { state.submittedServices.loading = false; state.submittedServices.error = action.payload; });

    // ── VERIFY CONTRACTOR ADDRESS ────────────────────────────────────
    builder.addCase(verifyContractorAddress.pending, (state) => {
      state.addressVerification = { loading: true, status: 'idle', lat: null, lng: null, fullAddress: '', error: null };
    });
    builder.addCase(verifyContractorAddress.fulfilled, (state, action) => {
      state.addressVerification = { loading: false, status: 'success', lat: action.payload.lat, lng: action.payload.lng, fullAddress: action.payload.fullAddress, error: null };
    });
    builder.addCase(verifyContractorAddress.rejected, (state, action) => {
      state.addressVerification = { loading: false, status: 'failed', lat: null, lng: null, fullAddress: '', error: action.payload };
    });

    // ── GOOGLE / APPLE OAUTH ─────────────────────────────────────────
    builder.addCase(googleOAuthLogin.pending, (state) => { state.loading = true; });
    builder.addCase(googleOAuthLogin.fulfilled, (state, { payload }) => { state.loading = false; _applyAuthPayload(state, payload); });
    builder.addCase(googleOAuthLogin.rejected, (state) => { state.loading = false; });
    builder.addCase(appleOAuthLogin.pending, (state) => { state.loading = true; });
    builder.addCase(appleOAuthLogin.fulfilled, (state, { payload }) => { state.loading = false; _applyAuthPayload(state, payload); });
    builder.addCase(appleOAuthLogin.rejected, (state) => { state.loading = false; });

    // ── FETCH COUNTRIES ──────────────────────────────────────────────
    builder.addCase(fetchCountries.pending, (state) => { state.countries.loading = true; state.countries.error = null; });
    builder.addCase(fetchCountries.fulfilled, (state, action) => { state.countries.loading = false; state.countries.list = action.payload; state.countries.error = null; });
    builder.addCase(fetchCountries.rejected, (state, action) => { state.countries.loading = false; state.countries.error = action.payload; });

    // ── PROFILE PHOTO (upload + fetch) ───────────────────────────────
    builder.addCase(uploadProfilePhoto.pending, (state) => { state.profilePhoto.loading = true; state.profilePhoto.error = null; });
    builder.addCase(uploadProfilePhoto.fulfilled, (state, { payload }) => { state.profilePhoto.loading = false; state.profilePhoto.key = payload.profilePhotoKey; state.profilePhoto.url = payload.profilePhotoUrl; state.profilePhoto.error = null; });
    builder.addCase(uploadProfilePhoto.rejected, (state, { payload }) => { state.profilePhoto.loading = false; state.profilePhoto.error = payload || 'Upload failed'; });
    builder.addCase(fetchProfilePhoto.pending, (state) => { state.profilePhoto.loading = true; state.profilePhoto.error = null; });
    builder.addCase(fetchProfilePhoto.fulfilled, (state, { payload }) => { state.profilePhoto.loading = false; state.profilePhoto.key = payload.profilePhotoKey; state.profilePhoto.url = payload.profilePhotoUrl; state.profilePhoto.error = null; });
    builder.addCase(fetchProfilePhoto.rejected, (state, { payload }) => { state.profilePhoto.loading = false; state.profilePhoto.error = payload || 'Failed to fetch photo'; });
      
      
      // ── REGISTER DEVICE TOKEN ────────────────────────────────────────
          builder.addCase(registerDeviceTokenToServer.fulfilled, (state, { payload }) => {
            state.deviceToken = payload.deviceToken;
            console.log('✅ deviceToken saved to Redux state');
          });
          builder.addCase(registerDeviceTokenToServer.rejected, (state, { payload }) => {
            console.warn('⚠️ Failed to save device token to state:', payload);
          });
            
      
  },
});

export const loginReducer = loginSlice.reducer;

export const {
  changeislogged, clearLoginData, setTempUserEmail, setTempUserRole,
  clearRegistrationData, clearOtpData, clearForgotPasswordData,
  setFirstLoginComplete, resetAddressVerification, updateTokens, clearProfilePhoto,
  clearLoginFreezeIfExpired, resetLoginAttempts,
  clearResendFreezeIfExpired, resetResendAttempts,
} = loginSlice.actions;


export { registerDeviceTokenToServer };

export const loginDataSelectors = {
  getData: (state) => state.loginData,
  getLoginStatus: createSelector((state) => state.loginData, (l) => ({ loading: l.loading, isLogged: l.is_logged, token: l.accessToken || l.token, userData: l.userData, isFirstLogin: l.isFirstLogin })),
  getRegistrationData: createSelector((state) => state.loginData, (l) => ({ loading: l.registrationLoading, data: l.registrationData, isComplete: l.isRegistrationComplete })),
  getOtpData: createSelector((state) => state.loginData, (l) => ({ loading: l.otpLoading, isVerified: l.isOtpVerified, tempEmail: l.tempUserEmail, tempRole: l.tempUserRole, resendLoading: l.resendCodeLoading })),
  getForgotPasswordData: createSelector((state) => state.loginData, (l) => ({ loading: l.forgotPasswordLoading, resetCodeSent: l.resetCodeSent })),
  getResetPasswordData: createSelector((state) => state.loginData, (l) => ({ loading: l.resetPasswordLoading, success: l.passwordResetSuccess })),
  getAddressVerification: createSelector((state) => state.loginData, (l) => ({ loading: l.addressVerification.loading, status: l.addressVerification.status, lat: l.addressVerification.lat, lng: l.addressVerification.lng, fullAddress: l.addressVerification.fullAddress, error: l.addressVerification.error })),
  getCountries: createSelector((state) => state.loginData, (l) => ({ loading: l.countries.loading, list: l.countries.list, error: l.countries.error })),
  getTokenRefresh: createSelector((state) => state.loginData, (l) => ({ loading: l.tokenRefreshLoading, accessToken: l.accessToken, refreshToken: l.refreshToken })),
  getCurrentUserData: createSelector((state) => state.loginData, (l) => ({ loading: l.currentUserLoading, data: l.currentUserData })),
  getProfilePhoto: createSelector((state) => state.loginData, (l) => ({ key: l.profilePhoto?.key ?? null, url: l.profilePhoto?.url ?? null, loading: l.profilePhoto?.loading ?? false, error: l.profilePhoto?.error ?? null })),

  // ✅ NEW — Login freeze selector
  getLoginAttempts: createSelector((state) => state.loginData, (l) => ({
    attempts: l.loginAttempts,
    frozenUntil: l.loginFrozenUntil,
    isFrozen: l.loginFrozenUntil ? Date.now() < l.loginFrozenUntil : false,
    remaining: Math.max(0, 3 - l.loginAttempts),
  })),

  // ✅ NEW — Resend freeze selector
  getResendAttempts: createSelector((state) => state.loginData, (l) => ({
    attempts: l.resendAttempts,
    frozenUntil: l.resendFrozenUntil,
    isFrozen: l.resendFrozenUntil ? Date.now() < l.resendFrozenUntil : false,
    remaining: Math.max(0, 3 - l.resendAttempts),
  })),

  getAccessToken: (state) => state.loginData.accessToken || state.loginData.token || null,
  getSubmittedServices: (state) => state.loginData.submittedServices,
  getLandlordId: (state) => state.loginData.userData?.landlordId || null,
  getTenantId: (state) => state.loginData.userData?.tenantId || null,
  getUserRole: (state) => state.loginData.userData?.role || null,
  getContractorId: (state) => state.loginData.userData?.contractorId || null,
  getIsFirstLogin: (state) => state.loginData.isFirstLogin,
};
