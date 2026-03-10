import { createSlice, createSelector } from '@reduxjs/toolkit';
import { getTenants, getLandlordTenants, getTenant } from './services';

const initialState = {
  tenants: [],
  landlordTenants: [],
  currentTenant: null,
  loading: false,
  error: null,
  totalTenants: 0,
  activeTenants: 0,
  inactiveTenants: 0,
};

const tenantsSlice = createSlice({
  name: 'tenants',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentTenant: (state) => {
      state.currentTenant = null;
    },
    calculateTenantTotals: (state) => {
      state.totalTenants = state.landlordTenants.length;
      state.activeTenants = state.landlordTenants.filter(t =>
        t.status === 'active' || t.payment_status === 'paid'
      ).length;
      state.inactiveTenants = state.totalTenants - state.activeTenants;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get all tenants
      .addCase(getTenants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTenants.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.tenants = payload;
        state.totalTenants = payload.length;
      })
      .addCase(getTenants.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load tenants';
      })

      // Get landlord's tenants
      .addCase(getLandlordTenants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLandlordTenants.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.landlordTenants = payload;
        state.totalTenants = payload.length;
        state.activeTenants = payload.filter(t =>
          t.status === 'active' || t.payment_status === 'paid'
        ).length;
        state.inactiveTenants = state.totalTenants - state.activeTenants;
      })
      .addCase(getLandlordTenants.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load landlord tenants';
      })

      // Get single tenant
      .addCase(getTenant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTenant.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentTenant = payload;
      })
      .addCase(getTenant.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load tenant';
      });
  },
});

export const tenantsReducer = tenantsSlice.reducer;
export const {
  clearError,
  clearCurrentTenant,
  calculateTenantTotals,
} = tenantsSlice.actions;

// Base selectors
const selectTenantsState = (state) => state.tenants || state.tenantsData || {};

// Memoized selectors to prevent unnecessary re-renders
export const tenantsSelectors = {
  getTenantsData: createSelector(
    [selectTenantsState],
    (tenantsState) => ({
      loading: tenantsState.loading || false,
      tenants: tenantsState.tenants || [],
      landlordTenants: tenantsState.landlordTenants || [],
      currentTenant: tenantsState.currentTenant,
      error: tenantsState.error,
      totalTenants: tenantsState.totalTenants || 0,
      activeTenants: tenantsState.activeTenants || 0,
      inactiveTenants: tenantsState.inactiveTenants || 0,
    })
  ),
  
  getTenants: createSelector(
    [selectTenantsState],
    (tenantsState) => tenantsState.tenants || []
  ),

  getLandlordTenants: createSelector(
    [selectTenantsState],
    (tenantsState) => tenantsState.landlordTenants || []
  ),

  getCurrentTenant: createSelector(
    [selectTenantsState],
    (tenantsState) => tenantsState.currentTenant
  ),
  
  isLoading: createSelector(
    [selectTenantsState],
    (tenantsState) => tenantsState.loading || false
  ),
  
  getError: createSelector(
    [selectTenantsState],
    (tenantsState) => tenantsState.error
  ),
};

export default tenantsSlice.reducer;
