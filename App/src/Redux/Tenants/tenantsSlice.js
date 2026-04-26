import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  getPropertyTenants,
  getMyProperties,
  getTenantsByProperty,
  getPropertiesByTenant,
  getPropertyTenantById,
  createPropertyTenant,
  updatePropertyTenant,
  deletePropertyTenant,
  getLandlordContact,
} from './services';

// ─────────────────────────────────────────────────────────────
// PropertyTenant record shape (from /api/property-tenants):
// {
//   id, propertyId, unitId, tenantId,
//   leaseStatus, status, createdAt, updatedAt,
//   property: { id, name, streetAddress, city, state, zipCode, propertyType },
//   unit:     { id, unitNumber },
//   tenant:   { id, firstName, lastName, email, phone }
// }
//
// LandlordContact shape (from /api/property-tenants/landlord-contact):
// { id, firstName, lastName, email, phone }
// ─────────────────────────────────────────────────────────────

const initialState = {
  // 1. GET /api/property-tenants
  propertyTenants: [],

  // 2. GET /api/property-tenants/my-properties
  myProperties: [],

  // 3. GET /api/property-tenants/property/{propertyId}
  //    Map of propertyId → records[]
  tenantsByProperty: {},

  // 4. GET /api/property-tenants/tenant/{tenantId}
  //    Map of tenantId → records[]
  propertiesByTenant: {},

  // 5. GET /api/property-tenants/{id}
  currentAssignment: null,

  // 9. GET /api/property-tenants/landlord-contact
  landlordContact: null,

  // Computed stats (from propertyTenants — real tenants only)
  totalTenants: 0,
  activeTenants: 0,
  inactiveTenants: 0,

  // Granular loading flags per operation
  loading: {
    fetchAll: false,
    fetchMyProperties: false,
    fetchByProperty: false,
    fetchByTenant: false,
    fetchById: false,
    create: false,
    update: false,
    delete: false,
    fetchLandlordContact: false,
  },

  error: null,
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * A record is a "real" tenant only if:
 *   - it has a tenantId assigned (not null)
 *   - the lease isn't vacated
 *   - the assignment isn't still pending
 * This filters out placeholder rows and historical/moved-out leases.
 */
const isRealTenant = (r) =>
  !!r?.tenantId &&
  r?.leaseStatus !== 'vacated' &&
  r?.status !== 'pending';

const isActive = (r) =>
  r?.leaseStatus === 'active' ||
  r?.leaseStatus === 'occupied' ||
  r?.status === 'active' ||
  r?.payment_status === 'paid';

const computeCounts = (records) => {
  const real = (records || []).filter(isRealTenant);
  const active = real.filter(isActive).length;
  return {
    totalTenants: real.length,
    activeTenants: active,
    inactiveTenants: real.length - active,
  };
};

// ─────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────

const tenantsSlice = createSlice({
  name: 'tenants',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentAssignment: (state) => {
      state.currentAssignment = null;
    },
    clearMyProperties: (state) => {
      state.myProperties = [];
    },
    clearLandlordContact: (state) => {
      state.landlordContact = null;
    },
  },
  extraReducers: (builder) => {
    builder

      // ── 1. GET /api/property-tenants ─────────────────────────────────
      .addCase(getPropertyTenants.pending, (state) => {
        state.loading.fetchAll = true;
        state.error = null;
      })
      .addCase(getPropertyTenants.fulfilled, (state, { payload }) => {
        state.loading.fetchAll = false;
        state.propertyTenants = payload || [];
        Object.assign(state, computeCounts(state.propertyTenants));
      })
      .addCase(getPropertyTenants.rejected, (state, { payload, error }) => {
        state.loading.fetchAll = false;
        state.error = payload || error.message || 'Failed to load property tenants';
      })

      // ── 2. GET /api/property-tenants/my-properties ───────────────────
      .addCase(getMyProperties.pending, (state) => {
        state.loading.fetchMyProperties = true;
        state.error = null;
      })
      .addCase(getMyProperties.fulfilled, (state, { payload }) => {
        state.loading.fetchMyProperties = false;
        state.myProperties = payload || [];
      })
      .addCase(getMyProperties.rejected, (state, { payload, error }) => {
        state.loading.fetchMyProperties = false;
        state.error = payload || error.message || 'Failed to load my properties';
      })

      // ── 3. GET /api/property-tenants/property/{propertyId} ───────────
      .addCase(getTenantsByProperty.pending, (state) => {
        state.loading.fetchByProperty = true;
        state.error = null;
      })
      .addCase(getTenantsByProperty.fulfilled, (state, { payload }) => {
        state.loading.fetchByProperty = false;
        state.tenantsByProperty[payload.propertyId] = payload.records;
      })
      .addCase(getTenantsByProperty.rejected, (state, { payload, error }) => {
        state.loading.fetchByProperty = false;
        state.error = payload || error.message || 'Failed to load tenants by property';
      })

      // ── 4. GET /api/property-tenants/tenant/{tenantId} ───────────────
      .addCase(getPropertiesByTenant.pending, (state) => {
        state.loading.fetchByTenant = true;
        state.error = null;
      })
      .addCase(getPropertiesByTenant.fulfilled, (state, { payload }) => {
        state.loading.fetchByTenant = false;
        state.propertiesByTenant[payload.tenantId] = payload.records;
      })
      .addCase(getPropertiesByTenant.rejected, (state, { payload, error }) => {
        state.loading.fetchByTenant = false;
        state.error = payload || error.message || 'Failed to load properties by tenant';
      })

      // ── 5. GET /api/property-tenants/{id} ────────────────────────────
      .addCase(getPropertyTenantById.pending, (state) => {
        state.loading.fetchById = true;
        state.error = null;
      })
      .addCase(getPropertyTenantById.fulfilled, (state, { payload }) => {
        state.loading.fetchById = false;
        state.currentAssignment = payload;
      })
      .addCase(getPropertyTenantById.rejected, (state, { payload, error }) => {
        state.loading.fetchById = false;
        state.error = payload || error.message || 'Failed to load assignment';
      })

      // ── 6. POST /api/property-tenants ────────────────────────────────
      .addCase(createPropertyTenant.pending, (state) => {
        state.loading.create = true;
        state.error = null;
      })
      .addCase(createPropertyTenant.fulfilled, (state, { payload }) => {
        state.loading.create = false;
        state.propertyTenants.unshift(payload);
        Object.assign(state, computeCounts(state.propertyTenants));
      })
      .addCase(createPropertyTenant.rejected, (state, { payload, error }) => {
        state.loading.create = false;
        state.error = payload || error.message || 'Failed to create assignment';
      })

      // ── 7. PATCH /api/property-tenants/{id} ──────────────────────────
      .addCase(updatePropertyTenant.pending, (state) => {
        state.loading.update = true;
        state.error = null;
      })
      .addCase(updatePropertyTenant.fulfilled, (state, { payload }) => {
        state.loading.update = false;
        const idx = state.propertyTenants.findIndex((r) => r.id === payload.id);
        if (idx !== -1) state.propertyTenants[idx] = payload;
        if (state.currentAssignment?.id === payload.id) {
          state.currentAssignment = payload;
        }
        Object.assign(state, computeCounts(state.propertyTenants));
      })
      .addCase(updatePropertyTenant.rejected, (state, { payload, error }) => {
        state.loading.update = false;
        state.error = payload || error.message || 'Failed to update assignment';
      })

      // ── 8. DELETE /api/property-tenants/{id} ─────────────────────────
      .addCase(deletePropertyTenant.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
      })
      .addCase(deletePropertyTenant.fulfilled, (state, { payload: deletedId }) => {
        state.loading.delete = false;
        state.propertyTenants = state.propertyTenants.filter((r) => r.id !== deletedId);
        Object.keys(state.tenantsByProperty).forEach((key) => {
          state.tenantsByProperty[key] = state.tenantsByProperty[key].filter(
            (r) => r.id !== deletedId
          );
        });
        Object.keys(state.propertiesByTenant).forEach((key) => {
          state.propertiesByTenant[key] = state.propertiesByTenant[key].filter(
            (r) => r.id !== deletedId
          );
        });
        if (state.currentAssignment?.id === deletedId) {
          state.currentAssignment = null;
        }
        Object.assign(state, computeCounts(state.propertyTenants));
      })
      .addCase(deletePropertyTenant.rejected, (state, { payload, error }) => {
        state.loading.delete = false;
        state.error = payload || error.message || 'Failed to delete assignment';
      })

      // ── 9. GET /api/property-tenants/landlord-contact ────────────────
      .addCase(getLandlordContact.pending, (state) => {
        state.loading.fetchLandlordContact = true;
        state.error = null;
      })
      .addCase(getLandlordContact.fulfilled, (state, { payload }) => {
        state.loading.fetchLandlordContact = false;
        state.landlordContact = payload || null;
      })
      .addCase(getLandlordContact.rejected, (state, { payload, error }) => {
        state.loading.fetchLandlordContact = false;
        state.error = payload || error.message || 'Failed to load landlord contact';
      });
  },
});

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

export const tenantsReducer = tenantsSlice.reducer;
export const {
  clearError,
  clearCurrentAssignment,
  clearMyProperties,
  clearLandlordContact,
} = tenantsSlice.actions;

// ─────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────

const selectState = (state) => state.tenants || state.tenantsData || {};

/** Memoized selector: raw property-tenant rows from state */
const selectPropertyTenants = createSelector(
  [selectState],
  (s) => s.propertyTenants || []
);

/** Memoized selector: only "real" tenants (filters out vacated + null-tenant rows) */
const selectRealTenants = createSelector(
  [selectPropertyTenants],
  (rows) => rows.filter(isRealTenant)
);

/** Memoized selector: aggregate loading flag */
const selectIsAnyLoading = createSelector(
  [selectState],
  (s) => Object.values(s.loading || {}).some(Boolean)
);

export const tenantsSelectors = {
  /**
   * Primary selector used by dashboard/tenant-list screens.
   * Returns ONLY real current tenants (filters out vacated and null-tenant rows).
   */
  getTenantsData: createSelector(
    [selectRealTenants, selectIsAnyLoading, selectState],
    (real, loading, s) => ({
      landlordTenants: real,
      loading,
      error: s.error || null,
      totalTenants: real.length,
    })
  ),

  /** All property-tenant assignments (raw, unfiltered — includes vacated) */
  getPropertyTenants: selectPropertyTenants,

  /** Only real current tenants (filtered) */
  getRealTenants: selectRealTenants,

  /** Properties assigned to the logged-in tenant user */
  getMyProperties: createSelector(
    [selectState],
    (s) => s.myProperties || []
  ),

  /**
   * Tenants for a specific property.
   * Usage: useSelector(tenantsSelectors.getTenantsByProperty(propertyId))
   */
  getTenantsByProperty: (propertyId) =>
    createSelector([selectState], (s) => s.tenantsByProperty?.[propertyId] || []),

  /**
   * Properties for a specific tenant.
   * Usage: useSelector(tenantsSelectors.getPropertiesByTenant(tenantId))
   */
  getPropertiesByTenant: (tenantId) =>
    createSelector([selectState], (s) => s.propertiesByTenant?.[tenantId] || []),

  /** Currently viewed single assignment */
  getCurrentAssignment: createSelector(
    [selectState],
    (s) => s.currentAssignment ?? null
  ),

  /**
   * Landlord contact for the authenticated tenant.
   * Shape: { id, firstName, lastName, email, phone } | null
   */
  getLandlordContact: createSelector(
    [selectState],
    (s) => s.landlordContact ?? null
  ),

  /** Counts derived from propertyTenants list (real tenants only) */
  getTotalTenants: createSelector([selectState], (s) => s.totalTenants ?? 0),
  getActiveTenants: createSelector([selectState], (s) => s.activeTenants ?? 0),
  getInactiveTenants: createSelector([selectState], (s) => s.inactiveTenants ?? 0),

  /** Per-operation loading flags */
  isLoadingFetchAll: createSelector([selectState], (s) => s.loading?.fetchAll ?? false),
  isLoadingMyProperties: createSelector([selectState], (s) => s.loading?.fetchMyProperties ?? false),
  isLoadingByProperty: createSelector([selectState], (s) => s.loading?.fetchByProperty ?? false),
  isLoadingByTenant: createSelector([selectState], (s) => s.loading?.fetchByTenant ?? false),
  isLoadingById: createSelector([selectState], (s) => s.loading?.fetchById ?? false),
  isCreating: createSelector([selectState], (s) => s.loading?.create ?? false),
  isUpdating: createSelector([selectState], (s) => s.loading?.update ?? false),
  isDeleting: createSelector([selectState], (s) => s.loading?.delete ?? false),
  isLoadingLandlordContact: createSelector(
    [selectState],
    (s) => s.loading?.fetchLandlordContact ?? false
  ),

  /** True if ANY operation is in-flight */
  isLoading: selectIsAnyLoading,

  /** Current error message */
  getError: createSelector([selectState], (s) => s.error ?? null),
};

export default tenantsSlice.reducer;
