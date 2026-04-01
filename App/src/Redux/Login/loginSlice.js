import { createSlice, createSelector } from '@reduxjs/toolkit';
import { HelperService } from '../../commonFunction/HelperService';

import {
  login,
  registerUser,
  confirmSignUp,
  logout,
  forgotPassword,
  confirmForgotPassword,
  submitContractorServices,
  verifyContractorAddress,
  fetchCountries,
} from './services';

// ✅ Strips all whitespace/newlines from token before storing
// Prevents "Invalid key=value pair" AWS API Gateway error
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

  forgotPasswordLoading: false,
  resetCodeSent: false,

  resetPasswordLoading: false,
  passwordResetSuccess: false,
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
      state.registrationData = null;
      state.isRegistrationComplete = false;
      state.tempUserEmail = '';
    },
    clearOtpData: (state) => {
      state.isOtpVerified = false;
      state.otpLoading = false;
    },
    clearForgotPasswordData: (state) => {
      state.forgotPasswordLoading = false;
      state.resetCodeSent = false;
      state.resetPasswordLoading = false;
      state.passwordResetSuccess = false;
    },
    setFirstLoginComplete: (state) => {
      state.isFirstLogin = false;
    },
    resetAddressVerification: (state) => {
      state.addressVerification = {
        loading: false,
        status: 'idle',
        lat: null,
        lng: null,
        fullAddress: '',
        error: null,
      };
    },
  },
  extraReducers: (builder) => {

    // ─── Login ───────────────────────────────────────────────
    builder.addCase(login.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(login.fulfilled, (state, { payload }) => {
      state.loading = false;

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

        // ✅ Cover all possible token field names your API may return
        const rawAccessToken =
          payload?.accessToken ||
          payload?.access_token ||
          payload?.AuthenticationResult?.AccessToken ||
          payload?.token ||
          null;

        const rawIdToken =
          payload?.idToken ||
          payload?.id_token ||
          payload?.AuthenticationResult?.IdToken ||
          null;

        const rawRefreshToken =
          payload?.refreshToken ||
          payload?.refresh_token ||
          payload?.AuthenticationResult?.RefreshToken ||
          null;

        // ✅ Sanitize at storage time — removes all whitespace/newlines
        // This is the root fix for "Invalid key=value pair in Authorization header"
        state.accessToken = sanitizeToken(rawAccessToken);
        state.token = sanitizeToken(rawAccessToken);
        state.idToken = sanitizeToken(rawIdToken);
        state.refreshToken = sanitizeToken(rawRefreshToken);
        state.is_logged = !!state.accessToken;

        console.log('✅ Token stored, length:', state.accessToken?.length || 0);
        console.log('✅ is_logged:', state.is_logged);
      } else {
        console.warn('⚠️ login payload is not valid:', payload);
        state.userData = null;
        state.token = null;
        state.accessToken = null;
        state.idToken = null;
        state.refreshToken = null;
        state.is_logged = false;
        state.isFirstLogin = false;
      }
    });

    builder.addCase(login.rejected, (state) => {
      state.loading = false;
      state.userData = null;
      state.token = null;
      state.accessToken = null;
      state.idToken = null;
      state.refreshToken = null;
      state.is_logged = false;
      state.isFirstLogin = false;
    });

    // ─── Register ─────────────────────────────────────────────
    builder.addCase(registerUser.pending, (state) => {
      state.registrationLoading = true;
    });
    builder.addCase(registerUser.fulfilled, (state, { payload }) => {
      state.registrationLoading = false;
      state.registrationData = payload || null;
      state.isRegistrationComplete = true;
      state.tempUserEmail = payload?.email || '';
    });
    builder.addCase(registerUser.rejected, (state) => {
      state.registrationLoading = false;
      state.registrationData = null;
      state.isRegistrationComplete = false;
    });

    // ─── Confirm SignUp (OTP) ──────────────────────────────────
    builder.addCase(confirmSignUp.pending, (state) => {
      state.otpLoading = true;
    });
    builder.addCase(confirmSignUp.fulfilled, (state) => {
      state.otpLoading = false;
      state.isOtpVerified = true;
      state.registrationData = null;
      state.isRegistrationComplete = false;
      state.tempUserEmail = '';
    });
    builder.addCase(confirmSignUp.rejected, (state) => {
      state.otpLoading = false;
      state.isOtpVerified = false;
    });

    // ─── Forgot Password ──────────────────────────────────────
    builder.addCase(forgotPassword.pending, (state) => {
      state.forgotPasswordLoading = true;
      state.resetCodeSent = false;
    });
    builder.addCase(forgotPassword.fulfilled, (state) => {
      state.forgotPasswordLoading = false;
      state.resetCodeSent = true;
    });
    builder.addCase(forgotPassword.rejected, (state) => {
      state.forgotPasswordLoading = false;
      state.resetCodeSent = false;
    });

    // ─── Confirm Forgot Password ──────────────────────────────
    builder.addCase(confirmForgotPassword.pending, (state) => {
      state.resetPasswordLoading = true;
      state.passwordResetSuccess = false;
    });
    builder.addCase(confirmForgotPassword.fulfilled, (state) => {
      state.resetPasswordLoading = false;
      state.passwordResetSuccess = true;
    });
    builder.addCase(confirmForgotPassword.rejected, (state) => {
      state.resetPasswordLoading = false;
      state.passwordResetSuccess = false;
    });

    // ─── Logout ───────────────────────────────────────────────
    builder.addCase(logout.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(logout.fulfilled, (state) => {
      Object.assign(state, initialState);
    });
    builder.addCase(logout.rejected, (state) => {
      state.loading = false;
    });

    // ─── Contractor Services ──────────────────────────────────
    builder.addCase(submitContractorServices.pending, (state) => {
      state.submittedServices.loading = true;
      state.submittedServices.error = null;
    });
    builder.addCase(submitContractorServices.fulfilled, (state, action) => {
      state.submittedServices.loading = false;
      state.submittedServices.services = action.payload.selectedServices;
      state.isFirstLogin = false;
    });
    builder.addCase(submitContractorServices.rejected, (state, action) => {
      state.submittedServices.loading = false;
      state.submittedServices.error = action.payload;
    });

    // ─── Verify Contractor Address ────────────────────────────
    builder.addCase(verifyContractorAddress.pending, (state) => {
      state.addressVerification.loading = true;
      state.addressVerification.status = 'idle';
      state.addressVerification.lat = null;
      state.addressVerification.lng = null;
      state.addressVerification.fullAddress = '';
      state.addressVerification.error = null;
    });
    builder.addCase(verifyContractorAddress.fulfilled, (state, action) => {
      state.addressVerification.loading = false;
      state.addressVerification.status = 'success';
      state.addressVerification.lat = action.payload.lat;
      state.addressVerification.lng = action.payload.lng;
      state.addressVerification.fullAddress = action.payload.fullAddress;
      state.addressVerification.error = null;
    });
    builder.addCase(verifyContractorAddress.rejected, (state, action) => {
      state.addressVerification.loading = false;
      state.addressVerification.status = 'failed';
      state.addressVerification.lat = null;
      state.addressVerification.lng = null;
      state.addressVerification.fullAddress = '';
      state.addressVerification.error = action.payload;
    });

    // ─── Fetch Countries ──────────────────────────────────────
    builder.addCase(fetchCountries.pending, (state) => {
      state.countries.loading = true;
      state.countries.error = null;
    });
    builder.addCase(fetchCountries.fulfilled, (state, action) => {
      state.countries.loading = false;
      state.countries.list = action.payload;
      state.countries.error = null;
    });
    builder.addCase(fetchCountries.rejected, (state, action) => {
      state.countries.loading = false;
      state.countries.error = action.payload;
    });
  },
});

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
} = loginSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const loginDataSelectors = {
  getData: (state) => state.loginData,

  getLoginStatus: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.loading,
      isLogged: login.is_logged,
      token: login.accessToken || login.token,
      userData: login.userData,
      isFirstLogin: login.isFirstLogin,
    })
  ),

  getRegistrationData: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.registrationLoading,
      data: login.registrationData,
      isComplete: login.isRegistrationComplete,
    })
  ),

  getOtpData: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.otpLoading,
      isVerified: login.isOtpVerified,
      tempEmail: login.tempUserEmail,
    })
  ),

  getForgotPasswordData: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.forgotPasswordLoading,
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
      loading: login.addressVerification.loading,
      status: login.addressVerification.status,
      lat: login.addressVerification.lat,
      lng: login.addressVerification.lng,
      fullAddress: login.addressVerification.fullAddress,
      error: login.addressVerification.error,
    })
  ),

  getCountries: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.countries.loading,
      list: login.countries.list,
      error: login.countries.error,
    })
  ),

  // ✅ Primary token selector — always returns the sanitized accessToken
  getAccessToken: (state) => state.loginData.accessToken || state.loginData.token || null,

  getSubmittedServices: (state) => state.loginData.submittedServices,
  getLandlordId: (state) => state.loginData.userData?.landlordId || null,
  getTenantId: (state) => state.loginData.userData?.tenantId || null,
  getUserRole: (state) => state.loginData.userData?.role || null,
  getContractorId: (state) => state.loginData.userData?.contractorId || null,
  getIsFirstLogin: (state) => state.loginData.isFirstLogin,
};
