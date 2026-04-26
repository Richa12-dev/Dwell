// propertiesSlice.js — Updated for Node.js API
// Node.js PropertyResponseDto uses camelCase fields.
// The normalizeProperty() helper in services.js stamps both
// camelCase AND snake_case aliases onto every property object,
// so existing UI code that reads `property_id`, `street`,
// `monthly_rent`, etc. continues to work without changes.

import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  getProperties,
  getLandlordProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getTenantProperties,
  getTenantById,
  getTenantReport,    // ✅ NEW: Node.js tenant report endpoint
} from './services';

const initialState = {
  properties: [],
  landlordProperties: [],
  tenantProperties: [],
  currentProperty: null,
  currentTenants: [],
  tenantReport: null,         // ✅ NEW: stores { csv, filename, rowCount }
  loading: false,
  tenantLoading: false,
  tenantReportLoading: false, // ✅ NEW
  error: null,
  totalProperties: 0,
  totalUnits: 0,
  occupiedUnits: 0,
  vacantUnits: 0,
};

// ─────────────────────────────────────────────────────────────
// Resolve property ID across all field names.
// Node.js returns `id`; aliases (property_id, propertyId) are
// stamped by normalizeProperty() in services.js.
// ─────────────────────────────────────────────────────────────
const resolveId = (property) =>
  property?.id || property?.property_id || property?.propertyId || property?.ID || null;

// ─────────────────────────────────────────────────────────────
// Calculate dashboard stats from a properties array.
// Node.js availability enum:
//   "vacant" | "currently occupied" | "under maintenance" | "available soon"
// ─────────────────────────────────────────────────────────────
const OCCUPIED_STATUS  = 'currently occupied';
const VACANT_STATUSES  = new Set(['vacant', 'available soon']);

const calcStats = (arr) => {
  const total    = arr.length;
  const occupied = arr.filter((p) =>
    (p.availabilityStatus || p.availability) === OCCUPIED_STATUS
  ).length;
  const vacant = arr.filter((p) =>
    VACANT_STATUSES.has(p.availabilityStatus || p.availability || '')
  ).length;

  return {
    totalProperties: total,
    totalUnits:      total,   // 1 unit per property (adjust if needed)
    occupiedUnits:   occupied,
    vacantUnits:     vacant,
  };
};

const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    clearError:           (state) => { state.error = null; },
    clearCurrentProperty: (state) => { state.currentProperty = null; },
    clearCurrentTenant:   (state) => { state.currentTenants = []; },
    clearTenantReport:    (state) => { state.tenantReport = null; },  // ✅ NEW

    updatePropertyLocally: (state, action) => {
      const update = (arr, payload) => {
        const id    = resolveId(payload);
        const index = arr.findIndex((p) => resolveId(p) === id);
        if (index !== -1) arr[index] = { ...arr[index], ...payload };
      };
      update(state.properties, action.payload);
      update(state.landlordProperties, action.payload);
    },

    calculateTotals: (state) => {
      const stats = calcStats(state.landlordProperties);
      Object.assign(state, stats);
    },
  },

  extraReducers: (builder) => {
    builder
      // ──────────────────────────────────────────────────────
      // GET PROPERTIES
      // ──────────────────────────────────────────────────────
      .addCase(getProperties.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getProperties.fulfilled, (state, { payload }) => {
        state.loading    = false;
        state.properties = payload;
        Object.assign(state, calcStats(payload));
      })
      .addCase(getProperties.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load properties';
      })

      // ──────────────────────────────────────────────────────
      // GET LANDLORD PROPERTIES
      // ──────────────────────────────────────────────────────
      .addCase(getLandlordProperties.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getLandlordProperties.fulfilled, (state, { payload }) => {
        state.loading             = false;
        state.landlordProperties  = payload;
        Object.assign(state, calcStats(payload));
      })
      .addCase(getLandlordProperties.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load landlord properties';
      })

      // ──────────────────────────────────────────────────────
      // GET SINGLE PROPERTY
      // ──────────────────────────────────────────────────────
      .addCase(getProperty.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getProperty.fulfilled, (state, { payload }) => {
        state.loading         = false;
        state.currentProperty = payload;
      })
      .addCase(getProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load property';
      })

      // ──────────────────────────────────────────────────────
      // CREATE PROPERTY
      // ──────────────────────────────────────────────────────
      .addCase(createProperty.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(createProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        const newProperty = payload.property || payload;
        state.properties.push(newProperty);
        state.landlordProperties.push(newProperty);
        Object.assign(state, calcStats(state.landlordProperties));
      })
      .addCase(createProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to create property';
      })

      // ──────────────────────────────────────────────────────
      // UPDATE PROPERTY
      // Matches by resolveId(); payload.propertyId is always
      // explicitly set by the thunk for reliable matching.
      // ──────────────────────────────────────────────────────
      .addCase(updateProperty.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(updateProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        const updatedProperty = payload.property || payload;

        // payload.propertyId is always sent explicitly by the service
        const updatedId = payload.propertyId || resolveId(updatedProperty);

        // Stamp id if missing
        if (updatedId && !updatedProperty.id) updatedProperty.id = updatedId;
        if (updatedId && !updatedProperty.property_id) updatedProperty.property_id = updatedId;

        const updateArray = (arr) => {
          const index = arr.findIndex((p) => resolveId(p) === updatedId);
          if (index !== -1) {
            arr[index] = updatedProperty;
          } else {
            console.warn('⚠️ updateProperty: could not find property with id:', updatedId);
          }
        };

        updateArray(state.properties);
        updateArray(state.landlordProperties);

        if (state.currentProperty && resolveId(state.currentProperty) === updatedId) {
          state.currentProperty = updatedProperty;
        }

        Object.assign(state, calcStats(state.landlordProperties));
      })
      .addCase(updateProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to update property';
      })

      // ──────────────────────────────────────────────────────
      // DELETE PROPERTY
      // Node.js soft-deletes; we remove from local state.
      // ──────────────────────────────────────────────────────
      .addCase(deleteProperty.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(deleteProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        // payload.propertyId is always set by the thunk
        const deletedId = payload.propertyId || payload.property_id;

        state.properties = state.properties.filter(
          (p) => resolveId(p) !== deletedId
        );
        state.landlordProperties = state.landlordProperties.filter(
          (p) => resolveId(p) !== deletedId
        );

        if (state.currentProperty && resolveId(state.currentProperty) === deletedId) {
          state.currentProperty = null;
        }

        Object.assign(state, calcStats(state.landlordProperties));
      })
      .addCase(deleteProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to delete property';
      })

      // ──────────────────────────────────────────────────────
      // GET TENANT RENTED PROPERTIES
      // ──────────────────────────────────────────────────────
      .addCase(getTenantProperties.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getTenantProperties.fulfilled, (state, { payload }) => {
        state.loading          = false;
        state.tenantProperties = payload;
        state.totalProperties  = payload.length;
        state.totalUnits       = payload.length;
        // Count occupied for this tenant view
        state.occupiedUnits    = payload.filter(
          (p) => (p.availabilityStatus || p.availability) === OCCUPIED_STATUS
        ).length;
        state.vacantUnits      = 0;
      })
      .addCase(getTenantProperties.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load tenant properties';
      })

      // ──────────────────────────────────────────────────────
      // GET TENANT BY ID
      // ──────────────────────────────────────────────────────
      .addCase(getTenantById.pending, (state) => {
        state.tenantLoading = true;
        state.error         = null;
      })
      .addCase(getTenantById.fulfilled, (state, { payload }) => {
        state.tenantLoading = false;
        if (!payload) return;
        const exists = state.currentTenants.find(
          (t) => t.id && payload.id && t.id === payload.id
        );
        if (!exists) state.currentTenants.push(payload);
      })
      .addCase(getTenantById.rejected, (state, { payload, error }) => {
        state.tenantLoading = false;
        state.error         = payload || error.message || 'Failed to load tenant';
      })

      // ──────────────────────────────────────────────────────
      // ✅ NEW: GET TENANT REPORT
      // GET /properties/:propertyId/tenant-report
      // ──────────────────────────────────────────────────────
      .addCase(getTenantReport.pending, (state) => {
        state.tenantReportLoading = true;
        state.error               = null;
      })
      .addCase(getTenantReport.fulfilled, (state, { payload }) => {
        state.tenantReportLoading = false;
        state.tenantReport        = payload; // { csv, filename, rowCount }
      })
      .addCase(getTenantReport.rejected, (state, { payload, error }) => {
        state.tenantReportLoading = false;
        state.error               = payload || error.message || 'Failed to load tenant report';
      });
  },
});

// ─────────────────────────────────────────────────────────────
// EXPORT REDUCER + ACTIONS
// ─────────────────────────────────────────────────────────────
export const propertiesReducer = propertiesSlice.reducer;

export const {
  clearError,
  clearCurrentProperty,
  clearCurrentTenant,
  clearTenantReport,
  updatePropertyLocally,
  calculateTotals,
} = propertiesSlice.actions;

// ─────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────
const selectPropertiesState = (state) =>
  state.properties || state.propertiesData || {};

export const propertiesSelectors = {
  // Full data bag (used by most screens)
  getPropertiesData: createSelector(
    [selectPropertiesState],
    (s) => ({
      loading:              s.loading             || false,
      tenantLoading:        s.tenantLoading       || false,
      tenantReportLoading:  s.tenantReportLoading || false,  // ✅ NEW
      properties:           s.properties          || [],
      landlordProperties:   s.landlordProperties  || [],
      tenantProperties:     s.tenantProperties    || [],
      currentProperty:      s.currentProperty,
      currentTenant:        s.currentTenants      || [],
      tenantReport:         s.tenantReport        || null,   // ✅ NEW
      error:                s.error,
      totalProperties:      s.totalProperties     || 0,
      totalUnits:           s.totalUnits          || 0,
      occupiedUnits:        s.occupiedUnits        || 0,
      vacantUnits:          s.vacantUnits          || 0,
    })
  ),

  getProperties: createSelector(
    [selectPropertiesState],
    (s) => s.properties || []
  ),

  getLandlordProperties: createSelector(
    [selectPropertiesState],
    (s) => s.landlordProperties || []
  ),

  getTenantProperties: createSelector(
    [selectPropertiesState],
    (s) => s.tenantProperties || []
  ),

  getCurrentProperty: createSelector(
    [selectPropertiesState],
    (s) => s.currentProperty
  ),

  getCurrentTenant: createSelector(
    [selectPropertiesState],
    (s) => s.currentTenants || []
  ),

  // ✅ NEW selector
  getTenantReport: createSelector(
    [selectPropertiesState],
    (s) => s.tenantReport
  ),

  isLoading: createSelector(
    [selectPropertiesState],
    (s) => s.loading || false
  ),

  isTenantLoading: createSelector(
    [selectPropertiesState],
    (s) => s.tenantLoading || false
  ),

  // ✅ NEW selector
  isTenantReportLoading: createSelector(
    [selectPropertiesState],
    (s) => s.tenantReportLoading || false
  ),

  getError: createSelector(
    [selectPropertiesState],
    (s) => s.error
  ),
};

export default propertiesSlice.reducer;
