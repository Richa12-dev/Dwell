// src/redux/slices/Maintenance/maintenanceSlice.js
import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceDetails,
  updateMaintenanceStatus,
  getMaintenanceByStatus,
  getMaintenanceStatistics,
  getMaintenanceByTenant,
  // escalateMaintenanceRequest,  // uncomment when new API adds /escalate
} from './services';   // ← new Node.js services file

const initialState = {
  maintenanceRequests:  [],
  currentRequest:       null,
  loading:              false,
  detailsLoading:       false,
  statisticsLoading:    false,
  error:                null,
  totalRequests:        0,
  openRequests:         0,
  closedRequests:       0,
  inProgressRequests:   0,
  lastUpdated:          null,
  // New API provides a dedicated statistics object
  statistics: {
    new:        0,
    inProgress: 0,
    completed:  0,
    total:      0,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive summary counts from a flat ticket array */
const deriveCounts = (requests) => ({
  totalRequests:      requests.length,
  openRequests:       requests.filter(
    (r) => r.status === 'pending'
  ).length,
  inProgressRequests: requests.filter(
    (r) => r.status === 'in_progress'
  ).length,
  closedRequests:     requests.filter(
    (r) => r.status === 'completed' || r.status === 'cancelled'
  ).length,
});

/** Replace or insert a ticket in the array by id */
const upsertInArray = (array, updated) => {
  const idx = array.findIndex(
    (r) => r.id === updated.id || r.ticket_id === updated.ticket_id
  );
  if (idx !== -1) {
    array[idx] = { ...array[idx], ...updated };
  } else {
    array.push(updated);
  }
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const maintenanceSlice = createSlice({
  name: 'maintenance',
  initialState,

  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
    },
    /** Optimistically update a ticket in local state */
    updateRequestLocally: (state, { payload }) => {
      upsertInArray(state.maintenanceRequests, payload);
      if (
        state.currentRequest &&
        (state.currentRequest.id        === payload.id ||
         state.currentRequest.ticket_id === payload.ticket_id)
      ) {
        state.currentRequest = { ...state.currentRequest, ...payload };
      }
    },
    /** Re-compute derived counts from current list */
    calculateTotals: (state) => {
      const counts = deriveCounts(state.maintenanceRequests);
      Object.assign(state, counts);
      state.lastUpdated = new Date().toISOString();
    },
  },

  extraReducers: (builder) => {
    builder

      // ── 1. Create ────────────────────────────────────────────────────────────
      .addCase(createMaintenanceRequest.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(createMaintenanceRequest.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.maintenanceRequests.push(payload);
        Object.assign(state, deriveCounts(state.maintenanceRequests));
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createMaintenanceRequest.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to create maintenance request';
      })

      // ── 2. List all ──────────────────────────────────────────────────────────
      .addCase(getMaintenanceRequests.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getMaintenanceRequests.fulfilled, (state, { payload }) => {
        state.loading             = false;
        state.maintenanceRequests = Array.isArray(payload) ? payload : [];
        Object.assign(state, deriveCounts(state.maintenanceRequests));
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(getMaintenanceRequests.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to fetch maintenance requests';
      })

      // ── 3. Details ───────────────────────────────────────────────────────────
      .addCase(getMaintenanceDetails.pending, (state) => {
        state.detailsLoading = true;
        state.error          = null;
      })
      .addCase(getMaintenanceDetails.fulfilled, (state, { payload }) => {
        state.detailsLoading = false;
        // The GET /maintenance-tickets/:id endpoint may not return mediaFiles.
        // Preserve them from the previous currentRequest (e.g. from create or list)
        // so the media section in QueryDetails never loses its images.
        state.currentRequest = {
          ...payload,
          mediaFiles: (payload?.mediaFiles?.length > 0)
            ? payload.mediaFiles
            : state.currentRequest?.mediaFiles || [],
        };
        state.lastUpdated    = new Date().toISOString();
      })
      .addCase(getMaintenanceDetails.rejected, (state, { payload, error }) => {
        state.detailsLoading = false;
        state.error = payload || error.message || 'Failed to fetch maintenance details';
      })

      // ── 4. Update ────────────────────────────────────────────────────────────
      .addCase(updateMaintenanceStatus.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateMaintenanceStatus.fulfilled, (state, { payload }) => {
        state.loading = false;
        upsertInArray(state.maintenanceRequests, payload);
        if (
          state.currentRequest &&
          (state.currentRequest.id        === payload.id ||
           state.currentRequest.ticket_id === payload.ticket_id)
        ) {
          state.currentRequest = { ...state.currentRequest, ...payload };
        }
        Object.assign(state, deriveCounts(state.maintenanceRequests));
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(updateMaintenanceStatus.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to update maintenance status';
      })

      // ── 5. By status ─────────────────────────────────────────────────────────
      .addCase(getMaintenanceByStatus.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getMaintenanceByStatus.fulfilled, (state, { payload }) => {
        state.loading = false;
        // Merge filtered results into the main list (upsert by id)
        (Array.isArray(payload) ? payload : []).forEach((ticket) => {
          upsertInArray(state.maintenanceRequests, ticket);
        });
        Object.assign(state, deriveCounts(state.maintenanceRequests));
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(getMaintenanceByStatus.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to fetch tickets by status';
      })

      // ── 6. Statistics ────────────────────────────────────────────────────────
      .addCase(getMaintenanceStatistics.pending, (state) => {
        state.statisticsLoading = true;
        state.error             = null;
      })
      .addCase(getMaintenanceStatistics.fulfilled, (state, { payload }) => {
        state.statisticsLoading = false;
        state.statistics        = payload; // { new, inProgress, completed, total }
        state.lastUpdated       = new Date().toISOString();
      })
      .addCase(getMaintenanceStatistics.rejected, (state, { payload, error }) => {
        state.statisticsLoading = false;
        state.error = payload || error.message || 'Failed to fetch statistics';
      })

      // ── 7. By tenant ─────────────────────────────────────────────────────────
      .addCase(getMaintenanceByTenant.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getMaintenanceByTenant.fulfilled, (state, { payload }) => {
        state.loading = false;
        // Merge tenant-specific results into the main list
        (Array.isArray(payload) ? payload : []).forEach((ticket) => {
          upsertInArray(state.maintenanceRequests, ticket);
        });
        Object.assign(state, deriveCounts(state.maintenanceRequests));
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(getMaintenanceByTenant.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to fetch tenant tickets';
      });
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────
export const {
  clearError,
  clearCurrentRequest,
  updateRequestLocally,
  calculateTotals,
} = maintenanceSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectMaintenanceState = (state) => state.maintenance || {};

export const maintenanceSelectors = {
  /** Full maintenance state as a single object — use sparingly */
  getMaintenanceData: createSelector(
    [selectMaintenanceState],
    (s) => ({
      loading:            s.loading            || false,
      detailsLoading:     s.detailsLoading     || false,
      statisticsLoading:  s.statisticsLoading  || false,
      requests:           s.maintenanceRequests || [],
      currentRequest:     s.currentRequest,
      totalRequests:      s.totalRequests      || 0,
      openRequests:       s.openRequests       || 0,
      closedRequests:     s.closedRequests     || 0,
      inProgressRequests: s.inProgressRequests || 0,
      statistics:         s.statistics,
      lastUpdated:        s.lastUpdated,
      error:              s.error,
    })
  ),

  getAllRequests: createSelector(
    [selectMaintenanceState],
    (s) => s.maintenanceRequests || []
  ),

  getCurrentRequest: createSelector(
    [selectMaintenanceState],
    (s) => s.currentRequest
  ),

  getStatistics: createSelector(
    [selectMaintenanceState],
    (s) => s.statistics || { new: 0, inProgress: 0, completed: 0, total: 0 }
  ),

  isLoading: createSelector(
    [selectMaintenanceState],
    (s) => s.loading || false
  ),

  isDetailsLoading: createSelector(
    [selectMaintenanceState],
    (s) => s.detailsLoading || false
  ),

  isStatisticsLoading: createSelector(
    [selectMaintenanceState],
    (s) => s.statisticsLoading || false
  ),

  getError: createSelector(
    [selectMaintenanceState],
    (s) => s.error
  ),

  /** Open tickets = status 'pending' */
  getOpenRequests: createSelector(
    [selectMaintenanceState],
    (s) => (s.maintenanceRequests || []).filter((r) => r.status === 'pending')
  ),

  /** In-progress tickets */
  getInProgressRequests: createSelector(
    [selectMaintenanceState],
    (s) => (s.maintenanceRequests || []).filter((r) => r.status === 'in_progress')
  ),

  /** Completed or cancelled */
  getClosedRequests: createSelector(
    [selectMaintenanceState],
    (s) =>
      (s.maintenanceRequests || []).filter(
        (r) => r.status === 'completed' || r.status === 'cancelled'
      )
  ),
};

export default maintenanceSlice.reducer;
