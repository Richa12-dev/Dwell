// propertiesSlice.js - Fixed version with correct ID matching and memoized selectors
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
} from './services';

const initialState = {
  properties: [],
  landlordProperties: [],
  tenantProperties: [],
  currentProperty: null,
  currentTenants: [],
  loading: false,
  tenantLoading: false,
  error: null,
  totalProperties: 0,
  totalUnits: 0,
  occupiedUnits: 0,
  vacantUnits: 0,
};

// ─────────────────────────────────────────────────────────────
// ✅ FIXED: Resolve property ID across all possible field names
//    Backend uses property_id; some local objects use propertyId or id
// ─────────────────────────────────────────────────────────────
const resolveId = (property) =>
  property?.property_id || property?.propertyId || property?.id || property?.ID || null;

// Recalculate stats from a properties array
const calcStats = (arr) => ({
  totalProperties: arr.length,
  totalUnits: arr.reduce((acc, p) => acc + (parseInt(p.bedrooms) || 1), 0),
  occupiedUnits: arr.reduce((acc, p) => acc + (p.is_available ? 0 : 1), 0),
  vacantUnits:
    arr.reduce((acc, p) => acc + (parseInt(p.bedrooms) || 1), 0) -
    arr.reduce((acc, p) => acc + (p.is_available ? 0 : 1), 0),
});

const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    clearCurrentProperty: (state) => { state.currentProperty = null; },
      clearCurrentTenant: (state) => { state.currentTenants = []; },

    updatePropertyLocally: (state, action) => {
      const update = (arr, payload) => {
        const id = resolveId(payload);
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
        state.error = null;
      })
      .addCase(getProperties.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.properties = payload;
        const stats = calcStats(payload);
        Object.assign(state, stats);
      })
      .addCase(getProperties.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load properties';
      })

      // ──────────────────────────────────────────────────────
      // GET LANDLORD PROPERTIES
      // ──────────────────────────────────────────────────────
      .addCase(getLandlordProperties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getLandlordProperties.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.landlordProperties = payload;
        const stats = calcStats(payload);
        Object.assign(state, stats);
      })
      .addCase(getLandlordProperties.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load landlord properties';
      })

      // ──────────────────────────────────────────────────────
      // GET SINGLE PROPERTY
      // ──────────────────────────────────────────────────────
      .addCase(getProperty.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentProperty = payload;
      })
      .addCase(getProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load property';
      })

      // ──────────────────────────────────────────────────────
      // CREATE PROPERTY
      // ──────────────────────────────────────────────────────
      .addCase(createProperty.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        const newProperty = payload.property || payload;
        state.properties.push(newProperty);
        state.landlordProperties.push(newProperty);
        const stats = calcStats(state.landlordProperties);
        Object.assign(state, stats);
      })
      .addCase(createProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to create property';
      })

      // ──────────────────────────────────────────────────────
      // ✅ FIXED: UPDATE PROPERTY
      //    Now uses resolveId() so it matches regardless of
      //    whether the backend returns property_id, propertyId, or id
      // ──────────────────────────────────────────────────────
      .addCase(updateProperty.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProperty.fulfilled, (state, { payload }) => {
        state.loading = false;
        const updatedProperty = payload.property || payload;

        // ✅ FIXED: prefer explicit payload.propertyId (always sent by service)
        //    before trying to resolve from the property object itself,
        //    because the backend sometimes doesn't echo property_id back
        const updatedId = payload.propertyId || resolveId(updatedProperty);

        // ✅ Stamp property_id onto the object so future resolveId calls work
        if (updatedId && !updatedProperty.property_id) {
          updatedProperty.property_id = updatedId;
        }

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

        // ✅ FIXED: update currentProperty if it matches
        if (state.currentProperty && resolveId(state.currentProperty) === updatedId) {
          state.currentProperty = updatedProperty;
        }

        const stats = calcStats(state.landlordProperties);
        Object.assign(state, stats);
      })
      .addCase(updateProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to update property';
      })

      // ──────────────────────────────────────────────────────
      // GET TENANT RENTED PROPERTIES
      // ──────────────────────────────────────────────────────
      .addCase(getTenantProperties.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getTenantProperties.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.tenantProperties = payload;
        state.totalProperties = payload.length;
        state.totalUnits = payload.reduce((acc, p) => acc + (parseInt(p.bedrooms) || 1), 0);
        state.occupiedUnits = payload.filter((p) => p.availability === 'occupied').length;
        state.vacantUnits = 0;
      })
      .addCase(getTenantProperties.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load tenant properties';
      })

      // ──────────────────────────────────────────────────────
      // ✅ FIXED: DELETE PROPERTY
      //    Now filters using resolveId() instead of hardcoded .propertyId
      // ──────────────────────────────────────────────────────
      .addCase(deleteProperty.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProperty.fulfilled, (state, { payload }) => {
        state.loading = false;

        // ✅ FIXED: payload from service always sends { propertyId }
        //    but also guard with property_id just in case
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

        const stats = calcStats(state.landlordProperties);
        Object.assign(state, stats);
      })
      .addCase(deleteProperty.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to delete property';
      })

      // ──────────────────────────────────────────────────────
      // GET TENANT BY ID
      // ──────────────────────────────────────────────────────
      .addCase(getTenantById.pending, (state) => {
        state.tenantLoading = true;
        state.error = null;
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
        state.tenantLoading = false;
        state.error = payload || error.message || 'Failed to load tenant';
        state.currentTenant = null;
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
  updatePropertyLocally,
  calculateTotals,
} = propertiesSlice.actions;

// ─────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────
const selectPropertiesState = (state) =>
  state.properties || state.propertiesData || {};

export const propertiesSelectors = {
  getPropertiesData: createSelector(
    [selectPropertiesState],
    (s) => ({
      loading: s.loading || false,
      tenantLoading: s.tenantLoading || false,
      properties: s.properties || [],
      landlordProperties: s.landlordProperties || [],
      tenantProperties: s.tenantProperties || [],
      currentProperty: s.currentProperty,
      currentTenant: s.currentTenants || [],
      error: s.error,
      totalProperties: s.totalProperties || 0,
      totalUnits: s.totalUnits || 0,
      occupiedUnits: s.occupiedUnits || 0,
      vacantUnits: s.vacantUnits || 0,
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
