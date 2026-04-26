// inviteSlice.js — Redux slice for the invite-tenant journey
// Manages state for all /api/invited-users operations +
// the /auth/invite/:token deep-link resolution.

import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  sendInvitation,
  getAllInvitations,
  getInvitationsBySender,
  getInvitationsByReceiver,
  getInvitationsByStatus,
  getExpiredInvitations,
  getInvitationById,
  updateInvitation,
  acceptInvitation,
  rejectInvitation,
  deleteInvitation,
  softDeleteInvitation,
  resolveInviteToken,
} from './inviteServices';

// ─────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────
const initialState = {
  // Collections
  sentInvitations:     [],  // invitations sent by this landlord
  receivedInvitations: [],  // invitations received (tenant inbox)
  allInvitations:      [],  // admin view
  expiredInvitations:  [],  // expired pending invites

  // Single invite
  currentInvitation: null,

  // Deep-link invite token resolution (for Register screen)
  resolvedInvite: null,
  // resolvedInvite shape:
  //   { phone, role, propertyId, tenantName, inviteId, expiresAt }

  // UI state
  loading:       false,
  sendLoading:   false,  // separate loader for the send button
  resolveLoading: false, // loader while resolving deep-link token

  error:        null,
  sendSuccess:  false,  // flag — reset after toast/navigation
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const upsert = (arr, invite) => {
  const id = invite?.id || invite?._id;
  if (!id) return arr;
  const idx = arr.findIndex((i) => (i.id || i._id) === id);
  if (idx !== -1) { arr[idx] = invite; } else { arr.push(invite); }
};

const removeById = (arr, id) => arr.filter((i) => (i.id || i._id) !== id);

// ─────────────────────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────────────────────
const inviteSlice = createSlice({
  name: 'invites',
  initialState,

  reducers: {
    clearError:        (state) => { state.error = null; },
    clearSendSuccess:  (state) => { state.sendSuccess = false; },
    clearResolvedInvite: (state) => { state.resolvedInvite = null; },
    clearCurrentInvitation: (state) => { state.currentInvitation = null; },

    // Called when app opens via deep-link but token is already in URL params
    // (skips the async thunk if token was already pre-resolved)
    setResolvedInvite: (state, action) => {
      state.resolvedInvite = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder

      // ── SEND INVITATION ────────────────────────────────────
      .addCase(sendInvitation.pending, (state) => {
        state.sendLoading = true;
        state.error       = null;
        state.sendSuccess = false;
      })
      .addCase(sendInvitation.fulfilled, (state, { payload }) => {
        state.sendLoading = false;
        state.sendSuccess = true;
        // Add the newly created invite to sentInvitations
        if (payload?.id || payload?._id) {
          upsert(state.sentInvitations, payload);
        }
      })
      .addCase(sendInvitation.rejected, (state, { payload, error }) => {
        state.sendLoading = false;
        state.error       = payload || error.message || 'Failed to send invitation';
      })

      // ── GET ALL INVITATIONS ────────────────────────────────
      .addCase(getAllInvitations.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getAllInvitations.fulfilled, (state, { payload }) => {
        state.loading        = false;
        state.allInvitations = payload || [];
      })
      .addCase(getAllInvitations.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── GET BY SENDER ──────────────────────────────────────
      .addCase(getInvitationsBySender.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getInvitationsBySender.fulfilled, (state, { payload }) => {
        state.loading          = false;
        state.sentInvitations  = payload || [];
      })
      .addCase(getInvitationsBySender.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── GET BY RECEIVER ────────────────────────────────────
      .addCase(getInvitationsByReceiver.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getInvitationsByReceiver.fulfilled, (state, { payload }) => {
        state.loading            = false;
        state.receivedInvitations = payload || [];
      })
      .addCase(getInvitationsByReceiver.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── GET BY STATUS ──────────────────────────────────────
      .addCase(getInvitationsByStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(getInvitationsByStatus.fulfilled, (state, { payload }) => {
        state.loading        = false;
        state.allInvitations = payload || [];
      })
      .addCase(getInvitationsByStatus.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── GET EXPIRED ────────────────────────────────────────
      .addCase(getExpiredInvitations.pending, (state) => {
        state.loading = true;
      })
      .addCase(getExpiredInvitations.fulfilled, (state, { payload }) => {
        state.loading            = false;
        state.expiredInvitations = payload || [];
      })
      .addCase(getExpiredInvitations.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── GET BY ID ──────────────────────────────────────────
      .addCase(getInvitationById.pending, (state) => {
        state.loading = true;
      })
      .addCase(getInvitationById.fulfilled, (state, { payload }) => {
        state.loading            = false;
        state.currentInvitation  = payload;
      })
      .addCase(getInvitationById.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── UPDATE INVITATION ──────────────────────────────────
      .addCase(updateInvitation.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateInvitation.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (!payload) return;
        upsert(state.sentInvitations,     payload);
        upsert(state.receivedInvitations, payload);
        upsert(state.allInvitations,      payload);
        if (state.currentInvitation?.id === payload.id) {
          state.currentInvitation = payload;
        }
      })
      .addCase(updateInvitation.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── ACCEPT INVITATION ──────────────────────────────────
      .addCase(acceptInvitation.pending, (state) => {
        state.loading = true;
      })
      .addCase(acceptInvitation.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (!payload) return;
        const accepted = { ...payload, inviteStatus: 'accepted' };
        upsert(state.receivedInvitations, accepted);
        upsert(state.allInvitations,      accepted);
        if (state.currentInvitation?.id === accepted.id) {
          state.currentInvitation = accepted;
        }
      })
      .addCase(acceptInvitation.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── REJECT INVITATION ──────────────────────────────────
      .addCase(rejectInvitation.pending, (state) => {
        state.loading = true;
      })
      .addCase(rejectInvitation.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (!payload) return;
        const rejected = { ...payload, inviteStatus: 'rejected' };
        upsert(state.receivedInvitations, rejected);
        upsert(state.allInvitations,      rejected);
      })
      .addCase(rejectInvitation.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message;
      })

      // ── DELETE INVITATION (hard) ───────────────────────────
      .addCase(deleteInvitation.fulfilled, (state, { payload }) => {
        const id = payload?.inviteId;
        if (!id) return;
        state.sentInvitations     = removeById(state.sentInvitations,     id);
        state.receivedInvitations = removeById(state.receivedInvitations, id);
        state.allInvitations      = removeById(state.allInvitations,      id);
        if ((state.currentInvitation?.id || state.currentInvitation?._id) === id) {
          state.currentInvitation = null;
        }
      })
      .addCase(deleteInvitation.rejected, (state, { payload, error }) => {
        state.error = payload || error.message;
      })

      // ── SOFT DELETE ────────────────────────────────────────
      .addCase(softDeleteInvitation.fulfilled, (state, { payload }) => {
        const id = payload?.inviteId;
        if (!id) return;
        state.sentInvitations     = removeById(state.sentInvitations,     id);
        state.receivedInvitations = removeById(state.receivedInvitations, id);
        state.allInvitations      = removeById(state.allInvitations,      id);
      })
      .addCase(softDeleteInvitation.rejected, (state, { payload, error }) => {
        state.error = payload || error.message;
      })

      // ── RESOLVE INVITE TOKEN (deep-link) ───────────────────
      .addCase(resolveInviteToken.pending, (state) => {
        state.resolveLoading  = true;
        state.error           = null;
        state.resolvedInvite  = null;
      })
      .addCase(resolveInviteToken.fulfilled, (state, { payload }) => {
        state.resolveLoading = false;
        state.resolvedInvite = payload;
      })
      .addCase(resolveInviteToken.rejected, (state, { payload, error }) => {
        state.resolveLoading = false;
        state.error          = payload || error.message;
        state.resolvedInvite = null;
      });
  },
});

// ─────────────────────────────────────────────────────────────
// EXPORTS — ACTIONS
// ─────────────────────────────────────────────────────────────
export const {
  clearError,
  clearSendSuccess,
  clearResolvedInvite,
  clearCurrentInvitation,
  setResolvedInvite,
} = inviteSlice.actions;

export const inviteReducer = inviteSlice.reducer;

// ─────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────
const selectInviteState = (state) => state.invites || {};

export const inviteSelectors = {
  // Full state snapshot (for screens that need many fields)
  getInviteData: createSelector(
    [selectInviteState],
    (s) => ({
      sentInvitations:      s.sentInvitations      || [],
      receivedInvitations:  s.receivedInvitations  || [],
      allInvitations:       s.allInvitations       || [],
      expiredInvitations:   s.expiredInvitations   || [],
      currentInvitation:    s.currentInvitation,
      resolvedInvite:       s.resolvedInvite,
      loading:              s.loading        || false,
      sendLoading:          s.sendLoading    || false,
      resolveLoading:       s.resolveLoading || false,
      error:                s.error,
      sendSuccess:          s.sendSuccess    || false,
    })
  ),

  getSentInvitations: createSelector(
    [selectInviteState],
    (s) => s.sentInvitations || []
  ),

  getReceivedInvitations: createSelector(
    [selectInviteState],
    (s) => s.receivedInvitations || []
  ),

  getPendingReceived: createSelector(
    [selectInviteState],
    (s) => (s.receivedInvitations || []).filter((i) => i.inviteStatus === 'pending')
  ),

  getResolvedInvite: createSelector(
    [selectInviteState],
    (s) => s.resolvedInvite
  ),

  isLoading: createSelector(
    [selectInviteState],
    (s) => s.loading || false
  ),

  isSendLoading: createSelector(
    [selectInviteState],
    (s) => s.sendLoading || false
  ),

  isResolveLoading: createSelector(
    [selectInviteState],
    (s) => s.resolveLoading || false
  ),

  getSendSuccess: createSelector(
    [selectInviteState],
    (s) => s.sendSuccess || false
  ),

  getError: createSelector(
    [selectInviteState],
    (s) => s.error
  ),

  // Convenient: pending invites count for badge display
  getPendingReceivedCount: createSelector(
    [selectInviteState],
    (s) => (s.receivedInvitations || []).filter((i) => i.inviteStatus === 'pending').length
  ),
};

export default inviteSlice.reducer;
