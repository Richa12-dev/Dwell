// propertiesSlice.js
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
} from './servicesNode'; // ✅ FIXED: was './services' (Python), now Node.js services

const initialState = {
  properties:         [],
  landlordProperties: [],
  tenantProperties:   [],
  currentProperty:    null,
  currentTenants:     [],
  loading:            false,
  tenantLoading:      false,
  error:              null,
  totalProperties:    0,
  totalUnits:         0,
  occupiedUnits:      0,
  vacantUnits:        0,
};

// ─────────────────────────────────────────────────────────────
// resolveId — handles all ID field name variants
//
// Node.js backend returns `id`
// normalizeProperty() stamps `property_id = id` as alias
// So both fields are always present after normalization
// ─────────────────────────────────────────────────────────────
const resolveId = (property) =>
  property?.property_id ||
  property?.propertyId  ||
  property?.id          ||
  property?.ID          ||
  null;

const isOccupiedProperty = (p) => {
  const av = (p?.availability || p?.availabilityStatus || '').toLowerCase();
  return av === 'currently occupied' || av === 'under maintenance';
};

const calcStats = (arr) => ({
  totalProperties: arr.length,
  totalUnits:      arr.reduce((acc, p) => acc + (parseInt(p.bedrooms) || 1), 0),
  occupiedUnits:   arr.filter(isOccupiedProperty).length,
  vacantUnits:     arr.filter(p => !isOccupiedProperty(p)).length,
});

// ─────────────────────────────────────────────────────────────
// upsertInArray — update if found, push if not found
//
// This is the critical fix for the "could not find property" warning.
// When the backend returns a property that isn't in Redux state yet
// (e.g. first update after create, or ID mismatch), we insert it
// instead of silently dropping the update.
// ─────────────────────────────────────────────────────────────
const upsertInArray = (arr, updatedProperty, updatedId) => {
  const index = arr.findIndex(p => resolveId(p) === updatedId);
  if (index !== -1) {
    arr[index] = updatedProperty;
  } else {
    // ✅ Not found — push it so images are always visible
    console.log('ℹ️ updateProperty: property not in state, inserting:', updatedId);
    arr.push(updatedProperty);
  }
};

const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    clearError:           (state) => { state.error = null; },
    clearCurrentProperty: (state) => { state.currentProperty = null; },
    clearCurrentTenant:   (state) => { state.currentTenants = []; },

    updatePropertyLocally: (state, action) => {
      const id = resolveId(action.payload);
      const update = (arr) => {
        const index = arr.findIndex(p => resolveId(p) === id);
        if (index !== -1) arr[index] = { ...arr[index], ...action.payload };
      };
      update(state.properties);
      update(state.landlordProperties);
    },

    calculateTotals: (state) => {
      Object.assign(state, calcStats(state.landlordProperties));
    },
  },

  extraReducers: (builder) => {
    builder

      // ──────────────────────────────────────────────────────
      // GET PROPERTIES
      // ──────────────────────────────────────────────────────
      .addCase(getProperties.pending, (state) => {
        state.loading = true; state.error = null;
      })
      .addCase(getProperties.fulfilled, (state, { payload }) => {
        state.loading     = false;
        state.properties  = payload;
        Object.assign(state, calcStats(payload));
      })
      .addCase(getProperties.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load properties';
      })

      // ──────────────────────────────────────────────────────
      // GET LANDLORD PROPERTIES
      // Replaces the entire array — always fresh from server
      // ──────────────────────────────────────────────────────
      .addCase(getLandlordProperties.pending, (state) => {
        state.loading = true; state.error = null;
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
      // Also upserts into landlordProperties so the list stays
      // fresh after a direct fetch by ID
      // ──────────────────────────────────────────────────────
      .addCase(getProperty.pending, (state) => {
        state.loading = true; state.error = null;
      })
      .addCase(getProperty.fulfilled, (state, { payload }) => {
        state.loading          = false;
        state.currentProperty  = payload;

        // ✅ Also keep landlordProperties in sync
        const id = resolveId(payload);
        if (id) {
          upsertInArray(state.properties, payload, id);
          upsertInArray(state.landlordProperties, payload, id);
          Object.assign(state, calcStats(state.landlordProperties));
        }
      })
      .addCase(getProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load property';
      })

      // ──────────────────────────────────────────────────────
      // CREATE PROPERTY
      // ──────────────────────────────────────────────────────
      .addCase(createProperty.pending, (state) => {
        state.loading = true; state.error = null;
      })
      .addCase(createProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        const newProperty = payload.property || payload;
        const newId = resolveId(newProperty);

        // Avoid duplicates if somehow called twice
        if (newId && !state.landlordProperties.find(p => resolveId(p) === newId)) {
          state.properties.push(newProperty);
          state.landlordProperties.push(newProperty);
        }
        Object.assign(state, calcStats(state.landlordProperties));
      })
      .addCase(createProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to create property';
      })

      // ──────────────────────────────────────────────────────
      // UPDATE PROPERTY
      //
      // ✅ KEY FIX: uses upsertInArray instead of only updating.
      //    If the property isn't found by ID (ID mismatch between
      //    what was stored vs what backend echoes back), it inserts
      //    the updated property so images always appear correctly.
      //
      // NOTE: The definitive fix for images is that AddPropertiesScreen
      //       calls getLandlordProperties after update succeeds, which
      //       completely replaces the Redux array with fresh server data.
      //       This case handles the intermediate state.
      // ──────────────────────────────────────────────────────
      .addCase(updateProperty.pending, (state) => {
        state.loading = true; state.error = null;
      })
      .addCase(updateProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        const updatedProperty = payload.property || payload;

        // payload.propertyId is always stamped by servicesNode.js updateProperty thunk
        const updatedId = payload.propertyId || resolveId(updatedProperty);

        if (!updatedId) {
          console.warn('⚠️ updateProperty.fulfilled: no ID found in payload', payload);
          return;
        }

        // Ensure property_id is stamped so resolveId always works
        if (!updatedProperty.property_id) updatedProperty.property_id = updatedId;
        if (!updatedProperty.id)          updatedProperty.id          = updatedId;

        // ✅ Upsert — update if found, insert if not found
        upsertInArray(state.properties, updatedProperty, updatedId);
        upsertInArray(state.landlordProperties, updatedProperty, updatedId);

        // Keep currentProperty in sync
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
      // ──────────────────────────────────────────────────────
      .addCase(deleteProperty.pending, (state) => {
        state.loading = true; state.error = null;
      })
      .addCase(deleteProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        const deletedId = payload.propertyId || payload.property_id;

        state.properties        = state.properties.filter(p => resolveId(p) !== deletedId);
        state.landlordProperties = state.landlordProperties.filter(p => resolveId(p) !== deletedId);

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
      // GET TENANT PROPERTIES
      // ──────────────────────────────────────────────────────
      .addCase(getTenantProperties.pending, (state) => {
        state.loading = true; state.error = null;
      })
      .addCase(getTenantProperties.fulfilled, (state, { payload }) => {
        state.loading           = false;
        state.tenantProperties  = payload;
        state.totalProperties   = payload.length;
        state.totalUnits        = payload.reduce((acc, p) => acc + (parseInt(p.bedrooms) || 1), 0);
        state.occupiedUnits     = payload.filter(p => isOccupiedProperty(p)).length;
        state.vacantUnits       = 0;
      })
      .addCase(getTenantProperties.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load tenant properties';
      })

      // ──────────────────────────────────────────────────────
      // GET TENANT BY ID
      // ──────────────────────────────────────────────────────
      .addCase(getTenantById.pending, (state) => {
        state.tenantLoading = true; state.error = null;
      })
      .addCase(getTenantById.fulfilled, (state, { payload }) => {
        state.tenantLoading = false;
        if (!payload) return;
        const exists = state.currentTenants.find(
          t => t.id && payload.id && t.id === payload.id
        );
        if (!exists) state.currentTenants.push(payload);
      })
      .addCase(getTenantById.rejected, (state, { payload, error }) => {
        state.tenantLoading   = false;
        state.error           = payload || error.message || 'Failed to load tenant';
        state.currentTenant   = null;
      });
  },
});

// ─────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────
export const propertiesReducer = propertiesSlice.reducer;

export const {
  clearError,
  clearCurrentProperty,
  clearCurrentTenant,
  updatePropertyLocally,
  calculateTotals,
} = propertiesSlice.actions;

// ─────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────
const selectPropertiesState = (state) => state.properties || {};

export const propertiesSelectors = {
  getPropertiesData: createSelector(
    [selectPropertiesState],
    (s) => ({
      loading:            s.loading            || false,
      tenantLoading:      s.tenantLoading      || false,
      properties:         s.properties         || [],
      landlordProperties: s.landlordProperties || [],
      tenantProperties:   s.tenantProperties   || [],
      currentProperty:    s.currentProperty,
      currentTenant:      s.currentTenants     || [],
      error:              s.error,
      totalProperties:    s.totalProperties    || 0,
      totalUnits:         s.totalUnits         || 0,
      occupiedUnits:      s.occupiedUnits       || 0,
      vacantUnits:        s.vacantUnits        || 0,
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

  isLoading: createSelector(
    [selectPropertiesState],
    (s) => s.loading || false
  ),

  isTenantLoading: createSelector(
    [selectPropertiesState],
    (s) => s.tenantLoading || false
  ),

  getError: createSelector(
    [selectPropertiesState],
    (s) => s.error
  ),
};

export default propertiesSlice.reducer;
