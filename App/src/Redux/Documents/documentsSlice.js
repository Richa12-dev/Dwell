// documentsSlice.js — Redux slice for Documents
// Mirrors pattern of propertiesSlice.js and rentSlice.js

import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  signDocument,
  getDocumentUploadUrl,
  uploadFileToS3,
} from './documentsServicesNode';

// ─────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────
const initialState = {
  documents: [],          // full list (filtered by role/property)
  currentDocument: null,  // single document being viewed
  uploadUrl: null,        // presigned S3 upload URL
  fileUrl: null,          // public S3 URL after upload
  loading: false,
  uploadLoading: false,   // S3 upload progress
  actionLoading: false,   // create / update / delete / sign
  error: null,
  totalCount: 0,

  // Stats derived from documents list
  signedCount: 0,
  pendingCount: 0,
  unsignedCount: 0,
};

// ─────────────────────────────────────────────────────────────
// Helper: resolve document ID across field names
// ─────────────────────────────────────────────────────────────
const resolveDocId = (doc) =>
  doc?.id || doc?.document_id || doc?.documentId || null;

// ─────────────────────────────────────────────────────────────
// Helper: calculate status stats from documents array
// ─────────────────────────────────────────────────────────────
const calcStats = (docs) => ({
  totalCount:   docs.length,
  signedCount:  docs.filter((d) => d.status === 'signed').length,
  pendingCount: docs.filter((d) => d.status === 'pending').length,
  unsignedCount: docs.filter((d) => d.status === 'unsigned').length,
});

// ─────────────────────────────────────────────────────────────
// SLICE
// ─────────────────────────────────────────────────────────────
const documentsSlice = createSlice({
  name: 'documents',
  initialState,

  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentDocument: (state) => {
      state.currentDocument = null;
    },
    clearDocuments: (state) => {
      state.documents = [];
      state.totalCount = 0;
      state.signedCount = 0;
      state.pendingCount = 0;
      state.unsignedCount = 0;
    },
    clearUploadState: (state) => {
      state.uploadUrl = null;
      state.fileUrl = null;
    },
    // Optimistic local status update (e.g. after signing)
    updateDocumentLocally: (state, action) => {
      const id = resolveDocId(action.payload);
      const index = state.documents.findIndex((d) => resolveDocId(d) === id);
      if (index !== -1) {
        state.documents[index] = { ...state.documents[index], ...action.payload };
        Object.assign(state, calcStats(state.documents));
      }
    },
  },

  extraReducers: (builder) => {
    builder

      // ──────────────────────────────────────────────────────
      // GET DOCUMENTS (list)
      // ──────────────────────────────────────────────────────
      .addCase(getDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDocuments.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.documents = payload;
        Object.assign(state, calcStats(payload));
      })
      .addCase(getDocuments.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load documents';
      })

      // ──────────────────────────────────────────────────────
      // GET DOCUMENT BY ID
      // ──────────────────────────────────────────────────────
      .addCase(getDocumentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDocumentById.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.currentDocument = payload;
      })
      .addCase(getDocumentById.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload || error.message || 'Failed to load document';
      })

      // ──────────────────────────────────────────────────────
      // CREATE DOCUMENT
      // ──────────────────────────────────────────────────────
      .addCase(createDocument.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createDocument.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const newDoc = payload.document || payload;
        state.documents.unshift(newDoc); // newest first
        Object.assign(state, calcStats(state.documents));
      })
      .addCase(createDocument.rejected, (state, { payload, error }) => {
        state.actionLoading = false;
        state.error = payload || error.message || 'Failed to create document';
      })

      // ──────────────────────────────────────────────────────
      // UPDATE DOCUMENT
      // ──────────────────────────────────────────────────────
      .addCase(updateDocument.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateDocument.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const updatedDoc = payload.document || payload;
        const updatedId  = payload.documentId || resolveDocId(updatedDoc);

        const index = state.documents.findIndex(
          (d) => resolveDocId(d) === updatedId
        );
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        } else {
          console.warn('⚠️ updateDocument: document not found in list:', updatedId);
        }

        // Sync currentDocument if open
        if (state.currentDocument && resolveDocId(state.currentDocument) === updatedId) {
          state.currentDocument = updatedDoc;
        }

        Object.assign(state, calcStats(state.documents));
      })
      .addCase(updateDocument.rejected, (state, { payload, error }) => {
        state.actionLoading = false;
        state.error = payload || error.message || 'Failed to update document';
      })

      // ──────────────────────────────────────────────────────
      // DELETE DOCUMENT
      // ──────────────────────────────────────────────────────
      .addCase(deleteDocument.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteDocument.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const deletedId = payload.documentId;

        state.documents = state.documents.filter(
          (d) => resolveDocId(d) !== deletedId
        );

        if (state.currentDocument && resolveDocId(state.currentDocument) === deletedId) {
          state.currentDocument = null;
        }

        Object.assign(state, calcStats(state.documents));
      })
      .addCase(deleteDocument.rejected, (state, { payload, error }) => {
        state.actionLoading = false;
        state.error = payload || error.message || 'Failed to delete document';
      })

      // ──────────────────────────────────────────────────────
      // SIGN DOCUMENT (tenant only)
      // ──────────────────────────────────────────────────────
      .addCase(signDocument.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(signDocument.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const signedDoc = payload.document || payload;
        const signedId  = payload.documentId || resolveDocId(signedDoc);

        const index = state.documents.findIndex(
          (d) => resolveDocId(d) === signedId
        );
        if (index !== -1) {
          state.documents[index] = { ...state.documents[index], ...signedDoc, status: 'signed' };
        }

        if (state.currentDocument && resolveDocId(state.currentDocument) === signedId) {
          state.currentDocument = { ...state.currentDocument, ...signedDoc, status: 'signed' };
        }

        Object.assign(state, calcStats(state.documents));
      })
      .addCase(signDocument.rejected, (state, { payload, error }) => {
        state.actionLoading = false;
        state.error = payload || error.message || 'Failed to sign document';
      })

      // ──────────────────────────────────────────────────────
      // GET S3 PRESIGNED UPLOAD URL
      // ──────────────────────────────────────────────────────
      .addCase(getDocumentUploadUrl.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
        state.uploadUrl = null;
        state.fileUrl = null;
      })
      .addCase(getDocumentUploadUrl.fulfilled, (state, { payload }) => {
        state.uploadLoading = false;
        state.uploadUrl = payload.uploadUrl || null;
        state.fileUrl   = payload.fileUrl   || null;
      })
      .addCase(getDocumentUploadUrl.rejected, (state, { payload, error }) => {
        state.uploadLoading = false;
        state.error = payload || error.message || 'Failed to get upload URL';
      })

      // ──────────────────────────────────────────────────────
      // UPLOAD FILE TO S3
      // ──────────────────────────────────────────────────────
      .addCase(uploadFileToS3.pending, (state) => {
        state.uploadLoading = true;
        state.error = null;
      })
      .addCase(uploadFileToS3.fulfilled, (state) => {
        state.uploadLoading = false;
        // fileUrl already set from getDocumentUploadUrl — nothing more needed
      })
      .addCase(uploadFileToS3.rejected, (state, { payload, error }) => {
        state.uploadLoading = false;
        state.error = payload || error.message || 'Failed to upload file to S3';
      });
  },
});

// ─────────────────────────────────────────────────────────────
// EXPORT REDUCER + ACTIONS
// ─────────────────────────────────────────────────────────────
export const documentsReducer = documentsSlice.reducer;

export const {
  clearError,
  clearCurrentDocument,
  clearDocuments,
  clearUploadState,
  updateDocumentLocally,
} = documentsSlice.actions;

// ─────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────
const selectDocumentsState = (state) => state.documents || {};

export const documentsSelectors = {
  // Full data bundle — use in screens that need multiple fields
  getDocumentsData: createSelector(
    [selectDocumentsState],
    (s) => ({
      loading:        s.loading       || false,
      actionLoading:  s.actionLoading || false,
      uploadLoading:  s.uploadLoading || false,
      documents:      s.documents     || [],
      currentDocument: s.currentDocument,
      uploadUrl:      s.uploadUrl,
      fileUrl:        s.fileUrl,
      error:          s.error,
      totalCount:     s.totalCount    || 0,
      signedCount:    s.signedCount   || 0,
      pendingCount:   s.pendingCount  || 0,
      unsignedCount:  s.unsignedCount || 0,
    })
  ),

  getDocuments: createSelector(
    [selectDocumentsState],
    (s) => s.documents || []
  ),

  getCurrentDocument: createSelector(
    [selectDocumentsState],
    (s) => s.currentDocument
  ),

  getUploadUrl: createSelector(
    [selectDocumentsState],
    (s) => s.uploadUrl
  ),

  getFileUrl: createSelector(
    [selectDocumentsState],
    (s) => s.fileUrl
  ),

  isLoading: createSelector(
    [selectDocumentsState],
    (s) => s.loading || false
  ),

  isActionLoading: createSelector(
    [selectDocumentsState],
    (s) => s.actionLoading || false
  ),

  isUploadLoading: createSelector(
    [selectDocumentsState],
    (s) => s.uploadLoading || false
  ),

  getError: createSelector(
    [selectDocumentsState],
    (s) => s.error
  ),

  getStats: createSelector(
    [selectDocumentsState],
    (s) => ({
      total:    s.totalCount    || 0,
      signed:   s.signedCount   || 0,
      pending:  s.pendingCount  || 0,
      unsigned: s.unsignedCount || 0,
    })
  ),

  // Filter documents by property (used in PropertyDocuments screen)
  getDocumentsByProperty: createSelector(
    [selectDocumentsState, (_, propertyId) => propertyId],
    (s, propertyId) =>
      propertyId
        ? (s.documents || []).filter(
            (d) => d.propertyId === propertyId || d.property_id === propertyId
          )
        : s.documents || []
  ),
};

export default documentsSlice.reducer;
