// documentsSlice.js — Redux slice for Documents
// ✅ NEW: handles getAllDocumentTemplates (GET /api/documents/getalldocument)

import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  getAllDocumentTemplates,
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
  documents:       [],     // stored documents (GET /documents)
  templates:       [],     // generated document templates (GET /api/documents/getalldocument)
  currentDocument: null,
  uploadUrl:       null,
  fileUrl:         null,
  loading:         false,
  templatesLoading: false,  // loading state for getAllDocumentTemplates
  uploadLoading:   false,
  actionLoading:   false,
  error:           null,
  templatesError:  null,
  totalCount:      0,

  // Stats derived from documents list
  signedCount:  0,
  pendingCount: 0,
  unsignedCount: 0,
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const resolveDocId = (doc) =>
  doc?.id || doc?.document_id || doc?.documentId || null;

const calcStats = (docs) => ({
  totalCount:    docs.length,
  signedCount:   docs.filter((d) => d.status === 'signed').length,
  pendingCount:  docs.filter((d) => d.status === 'pending').length,
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
      state.templatesError = null;
    },
    clearCurrentDocument: (state) => {
      state.currentDocument = null;
    },
    clearDocuments: (state) => {
      state.documents   = [];
      state.templates   = [];
      state.totalCount  = 0;
      state.signedCount = 0;
      state.pendingCount = 0;
      state.unsignedCount = 0;
    },
    clearTemplates: (state) => {
      state.templates      = [];
      state.templatesError = null;
    },
    clearUploadState: (state) => {
      state.uploadUrl = null;
      state.fileUrl   = null;
    },
    updateDocumentLocally: (state, action) => {
      const id = resolveDocId(action.payload);
      const index = state.documents.findIndex((d) => resolveDocId(d) === id);
      if (index !== -1) {
        state.documents[index] = { ...state.documents[index], ...action.payload };
        Object.assign(state, calcStats(state.documents));
      }
      // Also update in templates if present there
      const tIndex = state.templates.findIndex((d) => resolveDocId(d) === id);
      if (tIndex !== -1) {
        state.templates[tIndex] = { ...state.templates[tIndex], ...action.payload };
      }
    },
  },

  extraReducers: (builder) => {
    builder

      // ──────────────────────────────────────────────────────
      // GET ALL DOCUMENT TEMPLATES (new API)
      // ──────────────────────────────────────────────────────
      .addCase(getAllDocumentTemplates.pending, (state) => {
        state.templatesLoading = true;
        state.templatesError   = null;
      })
      .addCase(getAllDocumentTemplates.fulfilled, (state, { payload }) => {
        state.templatesLoading = false;
        state.templates        = payload || [];
      })
      .addCase(getAllDocumentTemplates.rejected, (state, { payload, error }) => {
        state.templatesLoading = false;
        state.templatesError   = payload || error.message || 'Failed to load templates';
      })

      // ──────────────────────────────────────────────────────
      // GET DOCUMENTS (list)
      // ──────────────────────────────────────────────────────
      .addCase(getDocuments.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getDocuments.fulfilled, (state, { payload }) => {
        state.loading   = false;
        state.documents = payload;
        Object.assign(state, calcStats(payload));
      })
      .addCase(getDocuments.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load documents';
      })

      // ──────────────────────────────────────────────────────
      // GET DOCUMENT BY ID
      // ──────────────────────────────────────────────────────
      .addCase(getDocumentById.pending, (state) => {
        state.loading = true;
        state.error   = null;
      })
      .addCase(getDocumentById.fulfilled, (state, { payload }) => {
        state.loading          = false;
        state.currentDocument  = payload;
      })
      .addCase(getDocumentById.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error   = payload || error.message || 'Failed to load document';
      })

      // ──────────────────────────────────────────────────────
      // CREATE DOCUMENT
      // ──────────────────────────────────────────────────────
      .addCase(createDocument.pending, (state) => {
        state.actionLoading = true;
        state.error         = null;
      })
      .addCase(createDocument.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const newDoc = payload.document || payload;
        state.documents.unshift(newDoc);
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
        state.error         = null;
      })
      .addCase(updateDocument.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const updatedDoc = payload.document || payload;
        const updatedId  = payload.documentId || resolveDocId(updatedDoc);

        const index = state.documents.findIndex((d) => resolveDocId(d) === updatedId);
        if (index !== -1) {
          state.documents[index] = updatedDoc;
        }

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
        state.error         = null;
      })
      .addCase(deleteDocument.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const deletedId = payload.documentId;

        state.documents = state.documents.filter((d) => resolveDocId(d) !== deletedId);

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
      // SIGN DOCUMENT — also updates templates list status
      // ──────────────────────────────────────────────────────
      .addCase(signDocument.pending, (state) => {
        state.actionLoading = true;
        state.error         = null;
      })
      .addCase(signDocument.fulfilled, (state, { payload }) => {
        state.actionLoading = false;
        const signedDoc = payload.document || payload;
        const signedId  = payload.documentId || resolveDocId(signedDoc);

        // Update in documents list
        const docIndex = state.documents.findIndex((d) => resolveDocId(d) === signedId);
        if (docIndex !== -1) {
          state.documents[docIndex] = {
            ...state.documents[docIndex],
            ...signedDoc,
            status: 'signed',
          };
        }

        // Update in templates list (if the document also appears there)
        const tplIndex = state.templates.findIndex((d) => resolveDocId(d) === signedId);
        if (tplIndex !== -1) {
          state.templates[tplIndex] = {
            ...state.templates[tplIndex],
            ...signedDoc,
            status: 'signed',
          };
        }

        if (state.currentDocument && resolveDocId(state.currentDocument) === signedId) {
          state.currentDocument = {
            ...state.currentDocument,
            ...signedDoc,
            status: 'signed',
          };
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
        state.error         = null;
        state.uploadUrl     = null;
        state.fileUrl       = null;
      })
      .addCase(getDocumentUploadUrl.fulfilled, (state, { payload }) => {
        state.uploadLoading = false;
        state.uploadUrl     = payload.uploadUrl || null;
        state.fileUrl       = payload.fileUrl   || null;
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
        state.error         = null;
      })
      .addCase(uploadFileToS3.fulfilled, (state) => {
        state.uploadLoading = false;
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
  clearTemplates,
  clearUploadState,
  updateDocumentLocally,
} = documentsSlice.actions;

// ─────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────
const selectDocumentsState = (state) => state.documents || {};

export const documentsSelectors = {
  getDocumentsData: createSelector(
    [selectDocumentsState],
    (s) => ({
      loading:          s.loading          || false,
      templatesLoading: s.templatesLoading || false,
      actionLoading:    s.actionLoading    || false,
      uploadLoading:    s.uploadLoading    || false,
      documents:        s.documents        || [],
      templates:        s.templates        || [],
      currentDocument:  s.currentDocument,
      uploadUrl:        s.uploadUrl,
      fileUrl:          s.fileUrl,
      error:            s.error,
      templatesError:   s.templatesError,
      totalCount:       s.totalCount       || 0,
      signedCount:      s.signedCount      || 0,
      pendingCount:     s.pendingCount     || 0,
      unsignedCount:    s.unsignedCount    || 0,
    })
  ),

  getDocuments: createSelector(
    [selectDocumentsState],
    (s) => s.documents || []
  ),

  getTemplates: createSelector(
    [selectDocumentsState],
    (s) => s.templates || []
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

  isTemplatesLoading: createSelector(
    [selectDocumentsState],
    (s) => s.templatesLoading || false
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
