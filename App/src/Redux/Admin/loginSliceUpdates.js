import { createSlice, createSelector } from '@reduxjs/toolkit';
import { adminLogin, fetchUsersByType, setAdminViewingUser, exitAdminViewingMode } from './adminServices';

const initialState = {
  // existing state...

  isAdmin: false,
  isAdminViewing: false,
  adminAccessToken: null,
  adminUsers: [],
  adminLoading: false,
  currentViewingUserType: null,
};

const loginSlice = createSlice({
  name: 'login',

  initialState,

  reducers: {
    // existing reducers...

    clearAdminMode: (state) => {
      state.isAdminViewing = false;
      state.adminUsers = [];
      state.currentViewingUserType = null;
    },

    returnToAdminDashboard: (state) => {
      state.isAdminViewing = false;
      state.userData = null;
      state.currentViewingUserType = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // ✅ Admin Login
      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
      })
      .addCase(adminLogin.fulfilled, (state, { payload }) => {
        state.loading = false;

        if (payload && typeof payload === 'object') {
          state.userData = {
            adminId: payload.adminId,
            role: 'admin',
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
          };

          state.accessToken = payload.accessToken;
          state.token = payload.accessToken;
          state.idToken = payload.idToken;
          state.refreshToken = payload.refreshToken;
          state.is_logged = true;
          state.isAdmin = true;
          state.adminAccessToken = payload.accessToken;
        }
      })
      .addCase(adminLogin.rejected, (state) => {
        state.loading = false;
        state.isAdmin = false;
      })

      // ✅ Fetch Users
      .addCase(fetchUsersByType.pending, (state) => {
        state.adminLoading = true;
      })
      .addCase(fetchUsersByType.fulfilled, (state, { payload }) => {
        state.adminLoading = false;
        state.adminUsers = payload.users || [];
        state.currentViewingUserType = payload.userType;
      })
      .addCase(fetchUsersByType.rejected, (state) => {
        state.adminLoading = false;
        state.adminUsers = [];
      })

      // ✅ Set Admin Viewing User
      .addCase(setAdminViewingUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(setAdminViewingUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.isAdminViewing = true;

        state.userData = {
          landlordId: payload.landlordId,
          tenantId: payload.tenantId,
          contractorId: payload.contractorId,
          role: payload.role,
          email: payload.email,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phoneNumber: payload.phoneNumber,
        };

        if (payload.adminAccessToken) {
          state.adminAccessToken = payload.adminAccessToken;
        }
      })
      .addCase(setAdminViewingUser.rejected, (state) => {
        state.loading = false;
      })

      // ✅ Exit Admin Mode
      .addCase(exitAdminViewingMode.fulfilled, (state) => {
        state.isAdminViewing = false;
        state.userData = null;
        state.currentViewingUserType = null;
      });
  },
});

export const {
  clearAdminMode,
  returnToAdminDashboard,
} = loginSlice.actions;

export default loginSlice.reducer;
