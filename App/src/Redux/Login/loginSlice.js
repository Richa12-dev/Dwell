import { createSlice } from '@reduxjs/toolkit';
import { HelperService } from '../../commonFunction/HelperService';
import { createSelector } from '@reduxjs/toolkit';

import {
  login,
  registerUser,
  confirmSignUp,
  logout,
  forgotPassword,
  confirmForgotPassword,
  submitContractorServices,
  verifyContractorAddress,
} from './services';

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

  // Contractor address verification states
  addressVerification: {
    loading: false,
    status: 'idle', // 'idle' | 'success' | 'failed'
    lat: null,
    lng: null,
    fullAddress: '',
    error: null,
  },


  
  // Registration related states
  registrationLoading: false,
  registrationData: null,
  isRegistrationComplete: false,

  // OTP verification states
  otpLoading: false,
  isOtpVerified: false,
  tempUserEmail: '',
  
  // Forgot Password states
  forgotPasswordLoading: false,
  resetCodeSent: false,
  
  // Reset Password states
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
        // Login flow
        builder.addCase(login.pending, (state) => {
            state.loading = true;
        });
        
        builder.addCase(login.fulfilled, (state, { payload }) => {
            console.log('💡 login.fulfilled payload:', payload);
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
                
                const accessToken =
                payload?.accessToken ||
                payload?.AuthenticationResult?.AccessToken ||
                payload?.token ||
                null;
                
                const idToken =
                payload?.idToken ||
                payload?.AuthenticationResult?.IdToken ||
                null;
                
                const refreshToken =
                payload?.refreshToken ||
                payload?.AuthenticationResult?.RefreshToken ||
                null;
                
                state.accessToken = accessToken === 'null' ? null : accessToken;
                state.token = accessToken === 'null' ? null : accessToken;
                state.idToken = idToken === 'null' ? null : idToken;
                state.refreshToken = refreshToken === 'null' ? null : refreshToken;
                
                state.is_logged = !!state.accessToken;
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
            state.accessToken = null;
            state.idToken = null;
            state.refreshToken = null;
            state.is_logged = false;
            state.isFirstLogin = false;
        });
        
        // Register user flow
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
        
        // Confirm SignUp (OTP) flow
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
        
        // Forgot Password flow
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
        
        // Confirm Forgot Password (Reset Password) flow
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
        
        // Logout flow
        builder.addCase(logout.pending, (state) => {
            state.loading = true;
        });
        
        builder.addCase(logout.fulfilled, (state) => {
            Object.assign(state, initialState);
        });
        
        builder.addCase(logout.rejected, (state) => {
            state.loading = false;
        });
        
        // ✅ Contractor Services flow
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

        // Verify Contractor Address flow
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
        
    }
})

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

export const loginDataSelectors = {
  getData: (state) => state.loginData,

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

  getLoginStatus: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.loading,
      isLogged: login.is_logged,
      token: login.token,
      userData: login.userData,
    isFirstLogin: login.isFirstLogin,
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

  getSubmittedServices: (state) => state.loginData.submittedServices,

  getAddressVerification: createSelector(
    (state) => state.loginData,
    (login) => ({
      loading: login.addressVerification.loading,
      status: login.addressVerification.status,   // 'idle' | 'success' | 'failed'
      lat: login.addressVerification.lat,
      lng: login.addressVerification.lng,
      fullAddress: login.addressVerification.fullAddress,
      error: login.addressVerification.error,
    })
  ),

  getAccessToken: (state) =>
    state.loginData.accessToken || state.loginData.token,

  getLandlordId: (state) => state.loginData.userData?.landlordId || null,

  getTenantId: (state) => state.loginData.userData?.tenantId || null,

  getUserRole: (state) => state.loginData.userData?.role || null,

  getContractorId: (state) => state.loginData.userData?.contractorId || null,

    getIsFirstLogin: (state) => state.loginData.isFirstLogin,
};
