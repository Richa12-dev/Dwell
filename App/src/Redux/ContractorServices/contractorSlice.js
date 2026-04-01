// src/Redux/ContractorServices/contractorSlice.js

import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  getContractorJob,
  acceptContractorJob,
  declineContractorJob,
  getAllContractorJobs,
  getOfferedJobs,
  getUnassignedJobs,
  submitContractorServices,
  createContractorInvoice,
  getContractorInvoice,
  completeContractorJob,
} from './services';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DECLINED_STATES = new Set(['DENIED', 'DECLINED', 'REJECTED']);

const isDeclined = (job) => {
  const state = job?.contractor_assignment?.state?.toUpperCase();
  if (DECLINED_STATES.has(state)) return true;

  // A job is also "declined by this contractor" when it's UNASSIGNED
  // and has a contractor_rejections entry (offer expired or explicitly rejected)
  if (
    state === 'UNASSIGNED' &&
    job?.contractor_rejections &&
    Object.keys(job.contractor_rejections).length > 0
  ) {
    return true;
  }

  return false;
};

/**
 * Upsert a job into an array by ticket_id (mutates Immer draft).
 * If the job already exists it is replaced; otherwise prepended.
 */
const upsertJob = (array, job) => {
  if (!array || !job?.ticket_id) return;
  const idx = array.findIndex((j) => j.ticket_id === job.ticket_id);
  if (idx !== -1) {
    array[idx] = job;
  } else {
    array.unshift(job);
  }
};

/**
 * Apply an arbitrary patch to a job in every state array simultaneously.
 */
const patchJobEverywhere = (state, ticket_id, patch) => {
  const arrays = [
    state.jobs,
    state.pendingJobs,
    state.offeredJobs,
    state.unassignedJobs,
    state.declinedJobs,
  ];
  for (const arr of arrays) {
    if (!arr) continue;
    const idx = arr.findIndex((j) => j.ticket_id === ticket_id);
    if (idx !== -1) arr[idx] = { ...arr[idx], ...patch };
  }
  if (state.currentJob?.ticket_id === ticket_id) {
    state.currentJob = { ...state.currentJob, ...patch };
  }
};

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState = {
  jobs:                  [],   // Active jobs only (Accepted / In Progress / Completed)
  offeredJobs:           [],   // Jobs offered to this contractor, not yet responded to
  unassignedJobs:        [],   // Unassigned pool
  pendingJobs:           [],   // Push-notification jobs (shown for 10-min offer window)
  declinedJobs:          [],   // Declined jobs — populated ONLY on confirmed server decline
  currentJob:            null,
  loading:               false,
  error:                 null,
  lastUpdated:           null,
  appliedFilters:        null,
  totalCount:            0,
  servicesUsedForFilter: [],
  services: {
    submitted: [],
    loading:   false,
    error:     null,
  },
  invoice: {
    loading:     false,
    error:       null,
    lastCreated: null,
  },
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const contractorSlice = createSlice({
  name: 'contractor',
  initialState,

  reducers: {
    clearError: (state) => {
      state.error                = null;
      if (state.services) state.services.error = null;
      if (state.invoice)  state.invoice.error  = null;
    },

    clearCurrentJob: (state) => {
      state.currentJob = null;
    },

    /**
     * Called when a push notification delivers a new job offer.
     * The job is shown in the "New" bucket for 10 minutes.
     */
    addPendingJob: (state, { payload }) => {
      if (!state.pendingJobs) state.pendingJobs = [];
      const exists = state.pendingJobs.some((j) => j.ticket_id === payload.ticket_id);
      if (!exists) state.pendingJobs.unshift({ ...payload, _isPending: true });
    },

    /**
     * Remove a job from pendingJobs after accept / decline / expire.
     */
    removePendingJob: (state, { payload }) => {
      if (!state.pendingJobs) return;
      state.pendingJobs = state.pendingJobs.filter(
        (j) => j.ticket_id !== payload.ticket_id,
      );
    },

    /**
     * Optimistically patch a job in all arrays (used after accept to update UI
     * before the server round-trip completes).
     */
    updateJobLocally: (state, { payload }) => {
      patchJobEverywhere(state, payload.ticket_id, payload);
    },

    setAppliedFilters: (state, { payload }) => {
      state.appliedFilters = payload;
    },

    clearInvoiceError: (state) => {
      if (state.invoice) state.invoice.error = null;
    },

    // ── Called on logout — wipe all local-only state ──────────────────────────
    // pendingJobs survive across sessions if not explicitly cleared because
    // they are never returned by any server API.  Without this, a job that was
    // accepted by another contractor while this contractor was logged out will
    // still show a running timer on the next login until the 8-second poll fires.
    resetContractorState: () => initialState,

    // Convenience alias — clear only the pending bucket (e.g. on foreground resume)
    clearPendingJobs: (state) => {
      state.pendingJobs = [];
    },
      
      markJobAcceptedByOther: (state, { payload }) => {
        const tid = payload?.ticket_id;
        if (!tid) return;

        // Find source job data from any active bucket before removing it
        const sourceJob =
          state.pendingJobs?.find((j) => j.ticket_id === tid) ||
          state.offeredJobs?.find((j) => j.ticket_id === tid) ||
          state.jobs?.find((j) => j.ticket_id === tid) ||
          null;

        // Only move to declined if it was actually an open offer for this contractor
        if (!sourceJob) return;

        // Avoid duplicate entries
        if (!state.declinedJobs) state.declinedJobs = [];
        const alreadyTracked = state.declinedJobs.some((j) => j.ticket_id === tid);

        if (!alreadyTracked) {
          state.declinedJobs.unshift({
            ...sourceJob,
            contractor_assignment: {
              ...(sourceJob.contractor_assignment || {}),
              state: "DECLINED",
            },
            _declinedAt: new Date().toISOString(),
            _declineReason: "Accepted by another contractor",
            _acceptedByOther: true,
          });
        }

        // Remove from all actionable buckets
        state.pendingJobs = (state.pendingJobs || []).filter((j) => j.ticket_id !== tid);
        state.offeredJobs = (state.offeredJobs || []).filter((j) => j.ticket_id !== tid);
        state.unassignedJobs = (state.unassignedJobs || []).filter((j) => j.ticket_id !== tid);

        // Do NOT remove from state.jobs — that bucket is for accepted/active jobs.
        // If for some reason it appears there, leave it; the next API refresh will reconcile.

        if (state.currentJob?.ticket_id === tid) state.currentJob = null;
      },
  },

  extraReducers: (builder) => {
    builder

      // ── Submit contractor services ──────────────────────────────────────────
      .addCase(submitContractorServices.pending, (state) => {
        state.services.loading = true;
        state.services.error   = null;
      })
      .addCase(submitContractorServices.fulfilled, (state, { payload }) => {
        state.services.loading   = false;
        state.services.submitted = payload.services || [];
        state.lastUpdated        = new Date().toISOString();
      })
      .addCase(submitContractorServices.rejected, (state, { payload, error }) => {
        state.services.loading = false;
        state.services.error   = payload || error.message || 'Failed to submit services';
      })

      // ── Get single contractor job ───────────────────────────────────────────
      //
      // When the per-pendingJob poll (ContractorSupport) fetches a job and sees
      // assigned_contractor_id is set and != ownId, it dispatches
      // markJobAcceptedByOther.  This handler just updates currentJob and
      // also patches the job in all arrays (in case it's in pendingJobs).
      .addCase(getContractorJob.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getContractorJob.fulfilled, (state, { payload }) => {
        state.loading     = false;
        state.currentJob  = payload;
        state.lastUpdated = new Date().toISOString();

        // If this job is in pendingJobs, update it with fresh server data
        // so JobRequestCard's isAcceptedByOther check can fire immediately
        const tid = payload?.ticket_id;
        if (tid && state.pendingJobs) {
          const idx = state.pendingJobs.findIndex((j) => j.ticket_id === tid);
          if (idx !== -1) {
            state.pendingJobs[idx] = {
              ...state.pendingJobs[idx],
              ...payload,
            };
          }
        }
      })
      .addCase(getContractorJob.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to fetch job';
      })

      // ── Get ALL contractor jobs ─────────────────────────────────────────────
      //
      // The API returns every job ever assigned to this contractor, including
      // historically declined ones. We split them here so each tab only shows
      // what belongs to it.
      //
      // CRITICAL — declinedJobs reconciliation:
      //   After the "5 declined" bug was found the reconcile logic was tightened:
      //   • freshDeclined  = jobs the SERVER says are declined (source of truth)
      //   • localOnlyDeclines = previously-local entries whose ticket_id is NOT
      //     in the fresh API response AT ALL (truly unseen by server yet)
      //
      //   This means stale optimistic declines (from failed server calls that
      //   fulfilled the thunk anyway) are evicted here because their ticket_id
      //   WILL appear in freshJobs as still-active.
      //   Combined with the isBodyError() fix in services.js, the declined count
      //   can never grow from phantom server errors.
      .addCase(getAllContractorJobs.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getAllContractorJobs.fulfilled, (state, { payload }) => {
        state.loading = false;

        const freshJobs = payload.jobs || [];
        const allFreshIds = new Set(freshJobs.map((j) => j.ticket_id));

        const activeJobs   = freshJobs.filter((j) => !isDeclined(j));
        const apiDeclined  = freshJobs.filter((j) => isDeclined(j));

        state.jobs                  = activeJobs;
        state.totalCount            = payload.count || 0;
        state.appliedFilters        = payload.filters || null;
        state.servicesUsedForFilter = payload.services_used_for_filter || [];
        state.lastUpdated           = new Date().toISOString();

        // Reconcile declinedJobs:
        //   - freshDeclined  = server-confirmed declines from this API call
        //   - localAcceptedByOther = locally-flagged "_acceptedByOther" entries
        //     These are preserved ONLY when:
        //       1. They are NOT in freshDeclined (not server-confirmed decline yet)
        //       2. They are NOT in activeJobs — if the server says a job is active
        //          for this contractor, the local "declined by other" flag is stale
        //          and must be removed. This is the server's source of truth.
        const freshDeclined = apiDeclined.map((job) => ({
          ...job,
          contractor_assignment: { ...job.contractor_assignment, state: 'DECLINED' },
        }));
        const freshDeclinedIds  = new Set(freshDeclined.map((j) => j.ticket_id));
        const activeJobIds      = new Set(activeJobs.map((j) => j.ticket_id));

        // Keep local _acceptedByOther entries only when:
        //   - NOT confirmed active by the server (would mean we own it or it's open)
        //   - NOT confirmed declined by the server (freshDeclined covers those)
        const localAcceptedByOther = (state.declinedJobs || []).filter(
          (j) =>
            j._acceptedByOther === true &&
            !freshDeclinedIds.has(j.ticket_id) &&
            !activeJobIds.has(j.ticket_id),   // ← server says active → evict stale local flag
        );

        state.declinedJobs = [...freshDeclined, ...localAcceptedByOther];

        // ── Reconcile pendingJobs against fresh API response ──────────────────
        //
        // IMPORTANT: The /contractor/jobs endpoint only returns jobs that this
        // contractor has been assigned to (accepted/declined). A brand-new offer
        // that nobody has acted on yet will NOT appear in this response at all.
        //
        // Therefore "absent from response" does NOT mean "taken by another
        // contractor" — it just means the job is still open and unassigned.
        //
        // We ONLY mark a pendingJob as taken-by-other when:
        //   A. ticket_id found in activeJobs  → we accepted it, remove from pending
        //   B. ticket_id found in apiDeclined → we declined it, remove from pending
        //   C. ticket_id IS in freshJobs with state ACCEPTED but we didn't accept it
        //      (i.e. it's not in activeIds and assignment.state is ACCEPTED)
        //      → another contractor accepted it, move to declined
        //
        // Case "absent entirely" is intentionally NOT treated as declined.
        const activeIds         = activeJobIds; // reuse — same Set, no redeclaration
        const allFreshTicketIds = new Set(freshJobs.map((j) => j.ticket_id));
        if (!state.declinedJobs) state.declinedJobs = [];

        (state.pendingJobs || []).forEach((pJob) => {
          const tid = pJob.ticket_id;
          if (!tid) return;

          // Skip jobs currently being accepted (acceptingJobId tracked in component,
          // but we guard here by checking if they just appeared in activeJobs)
          if (activeIds.has(tid)) return; // Case A — we just accepted it

          // Case C — job IS in the fresh response AND is already ACCEPTED
          // but we didn't accept it → another contractor got it
          if (allFreshTicketIds.has(tid)) {
            const freshJob = freshJobs.find((j) => j.ticket_id === tid);
            const freshState = freshJob?.contractor_assignment?.state?.toUpperCase();
            if (freshState === 'ACCEPTED' || freshState === 'IN_PROGRESS') {
              const alreadyTracked = state.declinedJobs.some((j) => j.ticket_id === tid);
              if (!alreadyTracked) {
                state.declinedJobs.unshift({
                  ...pJob,
                  contractor_assignment: {
                    ...(pJob.contractor_assignment || {}),
                    state: 'DECLINED',
                  },
                  _declinedAt:      new Date().toISOString(),
                  _declineReason:   'Accepted by another contractor',
                  _acceptedByOther: true,
                });
              }
            }
            // Job still open/unassigned in response — keep it in pendingJobs
            return;
          }

          // Job is completely absent from the response — it could be a fresh
          // unassigned offer not yet visible to this contractor's job list.
          // Do NOT move to declined. Leave it in pendingJobs as-is.
        });

        // Remove pendingJobs that are now in activeJobs (we accepted them)
        // Keep everything else — including jobs absent from fresh response
        state.pendingJobs = (state.pendingJobs || []).filter(
          (j) => !activeIds.has(j.ticket_id),
        );
      })
      .addCase(getAllContractorJobs.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to fetch jobs';
      })

      // ── Get offered jobs ────────────────────────────────────────────────────
      // NOTE: offered_only=1 always returns [] — the backend delivers jobs via
      // push notifications, not an offered queue. Kept for forward-compatibility.
      .addCase(getOfferedJobs.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getOfferedJobs.fulfilled, (state, { payload }) => {
        state.loading     = false;
        state.offeredJobs = payload.jobs || [];
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(getOfferedJobs.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to fetch offered jobs';
      })

      // ── Get unassigned jobs ─────────────────────────────────────────────────
      .addCase(getUnassignedJobs.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getUnassignedJobs.fulfilled, (state, { payload }) => {
        state.loading        = false;
        state.unassignedJobs = payload.jobs || [];
        state.lastUpdated    = new Date().toISOString();
      })
      .addCase(getUnassignedJobs.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to fetch unassigned jobs';
      })

      // ── Accept job ──────────────────────────────────────────────────────────
      .addCase(acceptContractorJob.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(acceptContractorJob.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (!state.jobs)        state.jobs        = [];
        if (!state.pendingJobs) state.pendingJobs = [];

        const acceptedJob = {
          ...payload,
          status: payload.status || 'OPEN',
          contractor_assignment: {
            ...payload.contractor_assignment,
            state: payload.contractor_assignment?.state || 'ACCEPTED',
          },
        };

        upsertJob(state.jobs, acceptedJob);

        // Remove from all offer / pending queues
        const tid = payload.ticket_id;
        state.pendingJobs    = (state.pendingJobs    || []).filter((j) => j.ticket_id !== tid);
        state.offeredJobs    = (state.offeredJobs    || []).filter((j) => j.ticket_id !== tid);
        state.unassignedJobs = (state.unassignedJobs || []).filter((j) => j.ticket_id !== tid);

        if (state.currentJob?.ticket_id === tid) state.currentJob = acceptedJob;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(acceptContractorJob.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to accept job';
      })

      // ── Decline job ─────────────────────────────────────────────────────────
      //
      // This case only runs when the server CONFIRMED the decline (isBodyError()
      // in services.js ensures a body-level error causes rejectWithValue instead
      // of fulfillValue).  So adding to declinedJobs here is safe.
      .addCase(declineContractorJob.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(declineContractorJob.fulfilled, (state, { payload }) => {
        state.loading = false;
        if (!state.declinedJobs) state.declinedJobs = [];

        const tid = payload.ticket_id;

        // Find source job data before removing it from active arrays
        const sourceJob =
          state.pendingJobs?.find((j) => j.ticket_id === tid) ||
          state.jobs?.find((j) => j.ticket_id === tid)        ||
          state.offeredJobs?.find((j) => j.ticket_id === tid) ||
          null;

        // Only add once — avoid duplicates on retry
        const alreadyTracked = state.declinedJobs.some((j) => j.ticket_id === tid);
        if (!alreadyTracked) {
          state.declinedJobs.unshift({
            ...(sourceJob || {}),
            ...payload,
            contractor_assignment: {
              ...(sourceJob?.contractor_assignment || {}),
              ...(payload.contractor_assignment   || {}),
              state: 'DECLINED',
            },
            _declinedAt: new Date().toISOString(),
          });
        }

        // Remove from all active arrays
        state.jobs           = (state.jobs           || []).filter((j) => j.ticket_id !== tid);
        state.pendingJobs    = (state.pendingJobs    || []).filter((j) => j.ticket_id !== tid);
        state.offeredJobs    = (state.offeredJobs    || []).filter((j) => j.ticket_id !== tid);
        state.unassignedJobs = (state.unassignedJobs || []).filter((j) => j.ticket_id !== tid);

        if (state.currentJob?.ticket_id === tid) state.currentJob = null;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(declineContractorJob.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to decline job';
        // Do NOT add the job to declinedJobs here — the server did not accept the decline.
      })

      // ── Get invoice ─────────────────────────────────────────────────────────
      .addCase(getContractorInvoice.fulfilled, (state, { payload }) => {
        if (payload?.ticket_id) {
          patchJobEverywhere(state, payload.ticket_id, {
            invoice:     payload.invoice,
            has_invoice: payload.has_invoice,
          });
        }
      })
      .addCase(getContractorInvoice.rejected, (state, { payload, error }) => {
        // Only store the error if it's a real failure (not a missing invoice)
        const msg = payload || error.message || '';
        if (msg && !msg.toLowerCase().includes('not found')) {
          state.invoice.error = msg;
        }
      })

      // ── Create invoice ──────────────────────────────────────────────────────
      .addCase(createContractorInvoice.pending, (state) => {
        state.invoice.loading = true;
        state.invoice.error   = null;
      })
      .addCase(createContractorInvoice.fulfilled, (state, { payload }) => {
        state.invoice.loading     = false;
        state.invoice.lastCreated = payload;
        if (payload?.ticket_id) {
          patchJobEverywhere(state, payload.ticket_id, {
            invoice:     payload.invoice,
            has_invoice: true,
          });
        }
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(createContractorInvoice.rejected, (state, { payload, error }) => {
        state.invoice.loading = false;
        state.invoice.error   = payload || error.message || 'Failed to create invoice';
      })

      // ── Complete job ────────────────────────────────────────────────────────
      .addCase(completeContractorJob.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(completeContractorJob.fulfilled, (state, { payload }) => {
        state.loading = false;
        const completed = payload.ticket || payload;
        const tid       = completed.ticket_id;

        patchJobEverywhere(state, tid, {
          ...completed,
          status:       'COMPLETED',
          completed_at: completed.completed_at || new Date().toISOString(),
          contractor_assignment: {
            ...(completed.contractor_assignment || {}),
            state:        'COMPLETED',
            completed_at: completed.completed_at || new Date().toISOString(),
          },
          ...(payload.invoice
            ? { invoice: payload.invoice, has_invoice: true }
            : {}),
        });

        state.lastUpdated = new Date().toISOString();
      })
      .addCase(completeContractorJob.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to complete job';
      });
  },
});

// ─── Action exports ───────────────────────────────────────────────────────────
//
// ⚠️  IMPORTANT — call `resetContractorState()` in your logout handler:
//
//   import { resetContractorState } from './contractorSlice';
//   // inside your logout thunk or handler:
//   dispatch(resetContractorState());
//
// This wipes pendingJobs (push-notification jobs stored only in Redux).
// Without it, jobs accepted by another contractor while this user was logged out
// will still show a running timer card on the next login until the 8-second poll
// fires — because pendingJobs are never returned by any server API.
//

export const {
  clearError,
  clearCurrentJob,
  addPendingJob,
  removePendingJob,
  updateJobLocally,
  setAppliedFilters,
  clearInvoiceError,
  resetContractorState,
  clearPendingJobs,
  markJobAcceptedByOther,
} = contractorSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────

const selectContractorState = (state) => state.contractor || {};

export const contractorSelectors = {
  getContractorData: createSelector(
    [selectContractorState],
    (s) => ({
      loading:               s.loading               || false,
      jobs:                  s.jobs                  || [],
      pendingJobs:           s.pendingJobs            || [],
      declinedJobs:          s.declinedJobs           || [],
      offeredJobs:           s.offeredJobs            || [],
      unassignedJobs:        s.unassignedJobs         || [],
      currentJob:            s.currentJob,
      lastUpdated:           s.lastUpdated,
      error:                 s.error,
      totalCount:            s.totalCount             || 0,
      appliedFilters:        s.appliedFilters,
      servicesUsedForFilter: s.servicesUsedForFilter  || [],
    }),
  ),

  getAllJobs:          createSelector([selectContractorState], (s) => s.jobs          || []),
  getOfferedJobs:     createSelector([selectContractorState], (s) => s.offeredJobs   || []),
  getUnassignedJobs:  createSelector([selectContractorState], (s) => s.unassignedJobs|| []),
  getPendingJobs:     createSelector([selectContractorState], (s) => s.pendingJobs   || []),
  getDeclinedJobs:    createSelector([selectContractorState], (s) => s.declinedJobs  || []),
  getCurrentJob:      createSelector([selectContractorState], (s) => s.currentJob),
  isLoading:          createSelector([selectContractorState], (s) => s.loading       || false),
  getError:           createSelector([selectContractorState], (s) => s.error),
  getNewJobsCount:    createSelector([selectContractorState], (s) => (s.pendingJobs  || []).length),
  getTotalCount:      createSelector([selectContractorState], (s) => s.totalCount    || 0),
  getAppliedFilters:  createSelector([selectContractorState], (s) => s.appliedFilters),
  getServicesData:    createSelector(
    [selectContractorState],
    (s) => s.services || { submitted: [], loading: false, error: null },
  ),
  isServicesLoading:      createSelector([selectContractorState], (s) => s.services?.loading || false),
  getServicesError:       createSelector([selectContractorState], (s) => s.services?.error),
  getSubmittedServices:   createSelector([selectContractorState], (s) => s.services?.submitted || []),
  getInvoiceData:         createSelector(
    [selectContractorState],
    (s) => s.invoice || { loading: false, error: null, lastCreated: null },
  ),
  isInvoiceLoading:       createSelector([selectContractorState], (s) => s.invoice?.loading || false),
  getInvoiceError:        createSelector([selectContractorState], (s) => s.invoice?.error),
  getLastCreatedInvoice:  createSelector([selectContractorState], (s) => s.invoice?.lastCreated),
};

export default contractorSlice.reducer;
