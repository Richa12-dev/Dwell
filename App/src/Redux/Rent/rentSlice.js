// rentSlice.js
import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  getRentDocuments,
  getRentHistory,
  getRentHistoryByTenant,
} from './services';

const initialState = {
  documents: [],
  rentHistory: [],
  loading: false,
  error: null,
  totalCount: 0,
};

const rentSlice = createSlice({
  name: 'rent',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearRentData: (state) => {
      state.documents = [];
      state.rentHistory = [];
      state.totalCount = 0;
    },
  },

  extraReducers: (builder) => {
    builder
      // GET RENT DOCUMENTS
      .addCase(getRentDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRentDocuments.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.documents = payload.documents || [];
      })
      .addCase(getRentDocuments.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load documents';
      })

      // GET RENT HISTORY
      .addCase(getRentHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRentHistory.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.rentHistory = payload.rent_history || [];
        state.totalCount = payload.count || 0;
      })
      .addCase(getRentHistory.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load rent history';
      })

      // GET RENT HISTORY BY TENANT
      .addCase(getRentHistoryByTenant.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getRentHistoryByTenant.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.rentHistory = payload.rent_history || [];
        state.totalCount = payload.count || 0;
      })
      .addCase(getRentHistoryByTenant.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load rent history';
      });
  },
});

// Export reducer + actions
export const rentReducer = rentSlice.reducer;

export const {
  clearError,
  clearRentData,
} = rentSlice.actions;

// Selectors
const selectRentState = (state) => state.rent || {};

export const rentSelectors = {
  getRentData: createSelector(
    [selectRentState],
    (s) => ({
      loading: s.loading || false,
      documents: s.documents || [],
      rentHistory: s.rentHistory || [],
      error: s.error,
      totalCount: s.totalCount || 0,
    })
  ),

  getDocuments: createSelector(
    [selectRentState],
    (s) => s.documents || []
  ),

  getRentHistory: createSelector(
    [selectRentState],
    (s) => s.rentHistory || []
  ),

  isLoading: createSelector(
    [selectRentState],
    (s) => s.loading || false
  ),

  getError: createSelector(
    [selectRentState],
    (s) => s.error
  ),
};

export default rentSlice.reducer;
