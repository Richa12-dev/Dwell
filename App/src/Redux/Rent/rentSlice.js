// rentSlice.js
import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  getTenantRentHistory,
  getRentHistoryByTenant,
  getRentHistoryByProperty,
  getLandlordSummary,
  getOverdueRents,
  getUpcomingRents,
  getRentById,
  createRent,
  generateMonthlyRent,
  payRent,
  updateRentStatus,
  deleteRent,
  getLandlordRentHistory,
} from './services';

const initialState = {
  // Lists
  rentHistory: [],       // tenant or landlord history
  overdueRents: [],
  upcomingRents: [],

  // Single record
  currentRent: null,

  // Landlord dashboard
  landlordSummary: null, // { totalRents, paidRents, pendingRents, overdueRents, totalCollected, totalPending }

  // Meta
  loading: false,
  error: null,
  totalCount: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const setPending = (state) => {
  state.loading = true;
  state.error = null;
};

const setRejected = (state, { payload, error }) => {
  state.loading = false;
  state.error = payload || error?.message || 'Something went wrong';
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const rentSlice = createSlice({
  name: 'rent',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearRentData: (state) => {
      state.rentHistory = [];
      state.overdueRents = [];
      state.upcomingRents = [];
      state.currentRent = null;
      state.landlordSummary = null;
      state.totalCount = 0;
    },
  },

  extraReducers: (builder) => {
    builder

      // ── GET: Current Tenant History ──────────────────────────────────────────
      .addCase(getTenantRentHistory.pending, setPending)
      .addCase(getTenantRentHistory.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.rentHistory = Array.isArray(payload) ? payload : [];
        state.totalCount = state.rentHistory.length;
      })
      .addCase(getTenantRentHistory.rejected, setRejected)

      // ── GET: Rent History by Tenant ID ───────────────────────────────────────
      .addCase(getRentHistoryByTenant.pending, setPending)
      .addCase(getRentHistoryByTenant.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.rentHistory = Array.isArray(payload) ? payload : [];
        state.totalCount = state.rentHistory.length;
      })
      .addCase(getRentHistoryByTenant.rejected, setRejected)

      // ── GET: Rent History by Property ────────────────────────────────────────
      .addCase(getRentHistoryByProperty.pending, setPending)
      .addCase(getRentHistoryByProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.rentHistory = Array.isArray(payload) ? payload : [];
        state.totalCount = state.rentHistory.length;
      })
      .addCase(getRentHistoryByProperty.rejected, setRejected)

      // ── GET: Landlord Summary ────────────────────────────────────────────────
      .addCase(getLandlordSummary.pending, setPending)
      .addCase(getLandlordSummary.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.landlordSummary = payload;
      })
      .addCase(getLandlordSummary.rejected, setRejected)

      // ── GET: Overdue Rents ───────────────────────────────────────────────────
      .addCase(getOverdueRents.pending, setPending)
      .addCase(getOverdueRents.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.overdueRents = Array.isArray(payload) ? payload : [];
      })
      .addCase(getOverdueRents.rejected, setRejected)

      // ── GET: Upcoming Rents ──────────────────────────────────────────────────
      .addCase(getUpcomingRents.pending, setPending)
      .addCase(getUpcomingRents.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.upcomingRents = Array.isArray(payload) ? payload : [];
      })
      .addCase(getUpcomingRents.rejected, setRejected)

      // ── GET: Single Rent by ID ───────────────────────────────────────────────
      .addCase(getRentById.pending, setPending)
      .addCase(getRentById.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentRent = payload;
      })
      .addCase(getRentById.rejected, setRejected)

      // ── POST: Create Rent ────────────────────────────────────────────────────
      .addCase(createRent.pending, setPending)
      .addCase(createRent.fulfilled, (state, { payload }) => {
        state.loading = false;
        // Optionally prepend to rentHistory
        if (payload?.id) {
          state.rentHistory = [payload, ...state.rentHistory];
          state.totalCount += 1;
        }
      })
      .addCase(createRent.rejected, setRejected)

      // ── POST: Generate Monthly Rent ──────────────────────────────────────────
      .addCase(generateMonthlyRent.pending, setPending)
      .addCase(generateMonthlyRent.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(generateMonthlyRent.rejected, setRejected)

      // ── POST: Pay Rent ───────────────────────────────────────────────────────
      .addCase(payRent.pending, setPending)
      .addCase(payRent.fulfilled, (state, { payload }) => {
        state.loading = false;
        // Update the matching record in rentHistory
        state.rentHistory = state.rentHistory.map((r) =>
          r.id === payload?.id ? { ...r, ...payload } : r
        );
        if (state.currentRent?.id === payload?.id) {
          state.currentRent = { ...state.currentRent, ...payload };
        }
      })
      .addCase(payRent.rejected, setRejected)

      // ── PATCH: Update Rent Status ────────────────────────────────────────────
      .addCase(updateRentStatus.pending, setPending)
      .addCase(updateRentStatus.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.rentHistory = state.rentHistory.map((r) =>
          r.id === payload?.id ? { ...r, ...payload } : r
        );
        if (state.currentRent?.id === payload?.id) {
          state.currentRent = { ...state.currentRent, ...payload };
        }
      })
      .addCase(updateRentStatus.rejected, setRejected)
      
      // --- landlord rent history
      
      .addCase(getLandlordRentHistory.pending, setPending)
      .addCase(getLandlordRentHistory.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.rentHistory = Array.isArray(payload) ? payload : [];
        state.totalCount = state.rentHistory.length;
      })
      .addCase(getLandlordRentHistory.rejected, setRejected)

      // ── DELETE: Delete Rent ──────────────────────────────────────────────────
      .addCase(deleteRent.pending, setPending)
      .addCase(deleteRent.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.rentHistory = state.rentHistory.filter((r) => r.id !== payload?.id);
        state.totalCount = Math.max(0, state.totalCount - 1);
        if (state.currentRent?.id === payload?.id) {
          state.currentRent = null;
        }
      })
      .addCase(deleteRent.rejected, setRejected);
  },
});

// ─── Exports ──────────────────────────────────────────────────────────────────
export const rentReducer = rentSlice.reducer;
export const { clearError, clearRentData } = rentSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectRent = (state) => state.rent || {};

export const rentSelectors = {
  isLoading: createSelector([selectRent], (s) => s.loading),
  getError: createSelector([selectRent], (s) => s.error),
  getTotalCount: createSelector([selectRent], (s) => s.totalCount),

  getRentHistory: createSelector([selectRent], (s) => s.rentHistory),
  getOverdueRents: createSelector([selectRent], (s) => s.overdueRents),
  getUpcomingRents: createSelector([selectRent], (s) => s.upcomingRents),
  getCurrentRent: createSelector([selectRent], (s) => s.currentRent),
  getLandlordSummary: createSelector([selectRent], (s) => s.landlordSummary),
};

export default rentSlice.reducer;
