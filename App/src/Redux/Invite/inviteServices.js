// inviteServices.js — Invite Users Redux Thunks
// Covers all /api/invited-users endpoints from Swagger spec
// Also covers /auth/invite/:token for deep-link token resolution

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { authFetch } from '../../utils/authFetch';

// ─────────────────────────────────────────────────────────────
// BASE URL
// ─────────────────────────────────────────────────────────────
const BASE_URL = Config.Base_url || Config.NODE_API_BASE_URL;
const INVITE_URL = `${BASE_URL}/invited-users`;
const AUTH_URL   = `${BASE_URL}/auth`;

// ─────────────────────────────────────────────────────────────
// Helper: safe JSON parse
// ─────────────────────────────────────────────────────────────
const safeJson = async (response) => {
  try { return await response.json(); } catch { return {}; }
};

// ─────────────────────────────────────────────────────────────
// Helper: get token from Redux state
// ─────────────────────────────────────────────────────────────
const getToken = (getState) => {
  const s = getState();
  return s.loginData?.accessToken || s.loginData?.token || null;
};

// ─────────────────────────────────────────────────────────────
// Helper: auth headers
// ─────────────────────────────────────────────────────────────
const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: `Bearer ${token}`,
});

// ─────────────────────────────────────────────────────────────
// Helper: normalize phone to E.164 format (+91XXXXXXXXXX for India)
// SMS providers REQUIRE E.164 — without it the SMS silently fails.
//   9560986063      → +919560986063
//   09560986063     → +919560986063
//   +919560986063   → +919560986063  (already correct)
// ─────────────────────────────────────────────────────────────
const normalizePhone = (raw = '', defaultCountryCode = '91') => {
  const stripped = raw.replace(/[^\d+]/g, '');
  if (stripped.startsWith('+')) return stripped;
  if (stripped.length === 12 && stripped.startsWith('91')) return `+${stripped}`;
  if (stripped.startsWith('0') && stripped.length === 11) return `+${defaultCountryCode}${stripped.slice(1)}`;
  if (stripped.length === 10) return `+${defaultCountryCode}${stripped}`;
  return `+${stripped}`;
};

// ─────────────────────────────────────────────────────────────
// SEND INVITATION — Three-step flow:
//
// STEP 1: Look up tenant UUID by phone → GET /api/users
// STEP 2: If not found → create tenant account → POST /api/users
//         { role: 'tenant', phoneNumber, email: '', password: tempPassword }
//         Response gives us the UUID we need.
// STEP 3: POST /api/invited-users with { senderId, receiverId, senderRole, receiverRole, expiryDays }
// ─────────────────────────────────────────────────────────────
export const sendInvitation = createAsyncThunk(
  'invites/sendInvitation',
  async (
    { senderId, receiverPhone, receiverName, receiverId: directReceiverId, expiryDays = 7 },
    { getState, rejectWithValue }
  ) => {
    try {
      const token = getToken(getState);

      if (!token)    return rejectWithValue('Authentication required. Please login again.');
      if (!senderId) return rejectWithValue('Sender ID is required.');

      const normalizedPhone = receiverPhone?.trim() ? normalizePhone(receiverPhone.trim()) : null;
      if (!normalizedPhone && !directReceiverId) {
        return rejectWithValue('Tenant phone number is required.');
      }

      let receiverId = directReceiverId || null;

      // ── STEP 1: Look up existing user by phone ──────────────
      if (!receiverId && normalizedPhone) {
        console.log('🔍 STEP 1 — Looking up user by phone:', normalizedPhone);
        try {
          const lookupRes = await fetch(`${BASE_URL}/users`, {
            method:  'GET',
            headers: authHeaders(token),
          });
          console.log('   lookup status:', lookupRes.status);

          if (lookupRes.ok) {
            let users = [];
            try { users = await lookupRes.json(); } catch {}

            const match = Array.isArray(users)
              ? users.find(u =>
                  u.phoneNumber === normalizedPhone ||
                  u.phone       === normalizedPhone
                )
              : null;

            if (match) {
              receiverId = match.id || match._id || null;
              console.log('   ✅ Existing user found, receiverId:', receiverId);
            } else {
              console.log('   ℹ️ Phone not found — will create new tenant account');
            }
          }
        } catch (lookupErr) {
          console.warn('   Lookup error (non-fatal):', lookupErr?.message);
        }
      }

      // ── STEP 2: Create tenant account if not found ──────────
      if (!receiverId && normalizedPhone) {
        console.log('👤 STEP 2 — Creating tenant account for:', normalizedPhone);
        try {
          // Generate a temporary password — tenant can reset via SMS link
          const tempPassword = `Dwell_${Date.now()}!`;

          const createRes = await fetch(`${BASE_URL}/users`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              role:        'tenant',
              phoneNumber: normalizedPhone,
              email:       '',        // optional per your Swagger schema
              password:    tempPassword,
            }),
          });

          console.log('   createUser status:', createRes.status);
          let created = {};
          try { created = await createRes.json(); } catch {}

          if (createRes.ok || createRes.status === 201) {
            receiverId = created.id || created._id || null;
            console.log('   ✅ Tenant account created, receiverId:', receiverId);
          } else {
            // Creation failed — might be duplicate or validation error
            const errMsg = Array.isArray(created?.message)
              ? created.message.join(' | ')
              : created?.message || `HTTP ${createRes.status}`;
            console.warn('   ⚠️ createUser failed:', errMsg);
            // Don't block — try to carry on without receiverId
          }
        } catch (createErr) {
          console.warn('   createUser error (non-fatal):', createErr?.message);
        }
      }

      // ── If still no receiverId, we can't proceed ────────────
      if (!receiverId) {
        const msg = 'Could not find or create tenant account. Please try again.';
        console.error('❌ No receiverId after lookup + create');
        Toast.show(msg);
        return rejectWithValue(msg);
      }

      // ── STEP 3: POST invite ─────────────────────────────────
      const body = {
        senderId,
        receiverId,
        senderRole:   'landlord',
        receiverRole: 'tenant',
        expiryDays,
      };

      console.log('📨 STEP 3 — POST', INVITE_URL);
      console.log('   body:', JSON.stringify(body, null, 2));

      const response = await fetch(INVITE_URL, {
        method:  'POST',
        headers: authHeaders(token),
        body:    JSON.stringify(body),
      });

      const rawText = await response.text();
      console.log('📨 response status:', response.status);
      console.log('   response body:', rawText.substring(0, 600));

      let data = {};
      try { data = JSON.parse(rawText); } catch {}

      if (response.ok || response.status === 201) {
        Toast.show('Invite sent! Tenant will receive an SMS with the link. ✓');
        return { ...data, receiverId, normalizedPhone };
      }

      const errMsg = Array.isArray(data?.message)
        ? data.message.join(' | ')
        : data?.message || data?.error || rawText || `HTTP ${response.status}`;

      console.warn(`⚠️ sendInvitation [${response.status}]:`, errMsg);
      Toast.show(errMsg);
      return rejectWithValue(errMsg);

    } catch (err) {
      const msg = err?.message?.includes('fetch')
        ? 'Network error. Please check your connection.'
        : err?.message || 'Failed to send invitation';
      console.error('❌ sendInvitation exception:', err);
      Toast.show(msg);
      return rejectWithValue(msg);
    }
  }
)

// ─────────────────────────────────────────────────────────────
// GET ALL INVITATIONS (admin / debug)
// GET /api/invited-users
// ─────────────────────────────────────────────────────────────
export const getAllInvitations = createAsyncThunk(
  'invites/getAllInvitations',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');

      const response = await fetch(INVITE_URL, {
        method: 'GET',
        headers: authHeaders(token),
      });

      const data = await safeJson(response);

      if (response.ok) return Array.isArray(data) ? data : data?.invitations || [];
      const msg = data?.message || `Failed (${response.status})`;
      return rejectWithValue(msg);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch invitations');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET INVITATIONS SENT BY A USER (landlord's outbox)
// GET /api/invited-users/sender/:senderId
// ─────────────────────────────────────────────────────────────
export const getInvitationsBySender = createAsyncThunk(
  'invites/getInvitationsBySender',
  async (senderId, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');
      if (!senderId) return rejectWithValue('Sender ID is required.');

      const response = await fetch(`${INVITE_URL}/sender/${senderId}`, {
        method: 'GET',
        headers: authHeaders(token),
      });

      const data = await safeJson(response);

      if (response.ok) return Array.isArray(data) ? data : data?.invitations || [];
      const msg = data?.message || `Failed (${response.status})`;
      return rejectWithValue(msg);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch sent invitations');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET INVITATIONS RECEIVED BY A USER (tenant's inbox)
// GET /api/invited-users/receiver/:receiverId
// ─────────────────────────────────────────────────────────────
export const getInvitationsByReceiver = createAsyncThunk(
  'invites/getInvitationsByReceiver',
  async (receiverId, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');
      if (!receiverId) return rejectWithValue('Receiver ID is required.');

      const response = await authFetch(`${INVITE_URL}/receiver/${receiverId}`, {
        method: 'GET'
      });

      const data = await safeJson(response);

      if (response.ok) return Array.isArray(data) ? data : data?.invitations || [];
      const msg = data?.message || `Failed (${response.status})`;
      return rejectWithValue(msg);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch received invitations');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET INVITATIONS BY STATUS
// GET /api/invited-users/status/:inviteStatus
// inviteStatus: 'pending' | 'accepted' | 'rejected'
// ─────────────────────────────────────────────────────────────
export const getInvitationsByStatus = createAsyncThunk(
  'invites/getInvitationsByStatus',
  async (inviteStatus, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');

      const response = await authFetch(`${INVITE_URL}/status/${inviteStatus}`, {
        method: 'GET'
      });

      const data = await safeJson(response);

      if (response.ok) return Array.isArray(data) ? data : data?.invitations || [];
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch invitations by status');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET EXPIRED INVITATIONS
// GET /api/invited-users/expired
// ─────────────────────────────────────────────────────────────
export const getExpiredInvitations = createAsyncThunk(
  'invites/getExpiredInvitations',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');

      const response = await authFetch(`${INVITE_URL}/expired`, {
        method: 'GET',

      });

      const data = await safeJson(response);

      if (response.ok) return Array.isArray(data) ? data : data?.invitations || [];
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch expired invitations');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET SINGLE INVITATION BY ID
// GET /api/invited-users/:id
// ─────────────────────────────────────────────────────────────
export const getInvitationById = createAsyncThunk(
  'invites/getInvitationById',
  async (inviteId, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');

      const response = await authFetch(`${INVITE_URL}/${inviteId}`, {
        method: 'GET',
     
      });

      const data = await safeJson(response);

      if (response.ok) return data?.invitation || data;
      if (response.status === 404) return rejectWithValue('Invitation not found.');
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch invitation');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// UPDATE INVITATION
// PATCH /api/invited-users/:id
// Body: { inviteStatus?, status?, senderRole?, receiverRole? }
// ─────────────────────────────────────────────────────────────
export const updateInvitation = createAsyncThunk(
  'invites/updateInvitation',
  async ({ inviteId, updates }, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');
      if (!inviteId) return rejectWithValue('Invitation ID is required.');

      const response = await authFetch(`${INVITE_URL}/${inviteId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Invitation updated.');
        return data?.invitation || data;
      }
      if (response.status === 404) return rejectWithValue('Invitation not found.');
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update invitation');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// ACCEPT INVITATION
// PATCH /api/invited-users/:id/accept
// ─────────────────────────────────────────────────────────────
export const acceptInvitation = createAsyncThunk(
  'invites/acceptInvitation',
  async (inviteId, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');

      const response = await fetch(`${INVITE_URL}/${inviteId}/accept`, {
        method: 'PATCH',
        headers: authHeaders(token),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Invitation accepted!');
        return data?.invitation || data;
      }
      if (response.status === 400) return rejectWithValue('Invitation is not pending or has expired.');
      if (response.status === 404) return rejectWithValue('Invitation not found.');
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to accept invitation');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// REJECT INVITATION
// PATCH /api/invited-users/:id/reject
// ─────────────────────────────────────────────────────────────
export const rejectInvitation = createAsyncThunk(
  'invites/rejectInvitation',
  async (inviteId, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');

      const response = await fetch(`${INVITE_URL}/${inviteId}/reject`, {
        method: 'PATCH',
        headers: authHeaders(token),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Invitation rejected.');
        return data?.invitation || data;
      }
      if (response.status === 404) return rejectWithValue('Invitation not found.');
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to reject invitation');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// DELETE INVITATION (hard delete)
// DELETE /api/invited-users/:id
// ─────────────────────────────────────────────────────────────
export const deleteInvitation = createAsyncThunk(
  'invites/deleteInvitation',
  async (inviteId, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');

      const response = await fetch(`${INVITE_URL}/${inviteId}`, {
        method: 'DELETE',
        headers: authHeaders(token),
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Invitation deleted.');
        return { inviteId };
      }
      if (response.status === 404) return rejectWithValue('Invitation not found.');
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete invitation');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// SOFT DELETE INVITATION
// DELETE /api/invited-users/:id/soft
// ─────────────────────────────────────────────────────────────
export const softDeleteInvitation = createAsyncThunk(
  'invites/softDeleteInvitation',
  async (inviteId, { getState, rejectWithValue }) => {
    try {
      const token = getToken(getState);
      if (!token) return rejectWithValue('Authentication required.');

      const response = await authFetch(`${INVITE_URL}/${inviteId}/soft`, {
        method: 'DELETE',
      });

      const data = await safeJson(response);

      if (response.ok) {
        Toast.show('Invitation removed.');
        return { inviteId };
      }
      if (response.status === 404) return rejectWithValue('Invitation not found.');
      return rejectWithValue(data?.message || `Failed (${response.status})`);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to remove invitation');
    }
  }
);

// ─────────────────────────────────────────────────────────────
// RESOLVE INVITE TOKEN (deep-link handler)
// GET /auth/invite/:token
//
// Called when the app opens via the SMS deep-link.
// Returns: { phone, role, propertyId?, inviteId? }
// This is used on the Register screen to pre-populate fields.
// Does NOT require auth — it's called before registration.
// ─────────────────────────────────────────────────────────────
export const resolveInviteToken = createAsyncThunk(
  'invites/resolveInviteToken',
  async (inviteToken, { rejectWithValue }) => {
    try {
      if (!inviteToken) return rejectWithValue('Invite token is missing.');

      const response = await fetch(`${AUTH_URL}/invite/${inviteToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      const data = await safeJson(response);

      if (response.ok) {
        // Expected: { phone, role, propertyId?, tenantName?, inviteId? }
        return {
          phone:       data.phone       || data.phoneNumber || null,
          role:        data.role        || 'tenant',
          propertyId:  data.propertyId  || null,
          tenantName:  data.tenantName  || null,
          inviteId:    data.inviteId    || data.id || null,
          expiresAt:   data.expiresAt   || null,
        };
      }

      if (response.status === 404) return rejectWithValue('Invite link is invalid or has expired.');
      if (response.status === 400) return rejectWithValue('Invite token has expired.');
      return rejectWithValue(data?.message || 'Failed to resolve invite link.');
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to process invite link');
    }
  }
);
