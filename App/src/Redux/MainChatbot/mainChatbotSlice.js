// mainChatbotSlice.js — Redux slice for Main Chatbot API
import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  sendMainChatMessage,
  ingestMedia,
  triggerChatAction,
  checkChatbotHealth,
  getMainChatbotSuggestions,
  adminListMedia,
  adminReprocessMedia,
} from './mainChatbotServices';

// ─── ID Generator ─────────────────────────────────────────────────────────────
let msgCounter = 0;
const genId = (prefix) => `${prefix}-${Date.now()}-${++msgCounter}`;

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  // Chat
  messages: [],           // each message may include citations[]
  loading: false,
  error: null,
  currentSessionId: null,
  lastMessageId: null,
  conversationId: null,   // returned by /chat as conversation_id

  // UI helpers
  isTyping: false,
  suggestions: [],
  showSuggestions: true,

  // Connection / health
  connectionStatus: 'disconnected',
  healthStatus: null,

  // Media ingestion
  mediaLoading: false,
  mediaError: null,
  lastIngestedMedia: null,

  // Actions
  actionLoading: false,
  actionError: null,
  lastActionResult: null,

  // Admin
  adminMediaList: [],
  adminLoading: false,
  adminError: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const mainChatbotSlice = createSlice({
  name: 'mainChatbot',
  initialState,

  reducers: {
    setSessionId: (state, action) => {
      state.currentSessionId = action.payload;
    },

    clearMessages: (state) => {
      state.messages = [];
      state.error = null;
      state.conversationId = null;
      state.showSuggestions = true;
    },

    clearError: (state) => {
      state.error = null;
    },

    resetState: () => ({ ...initialState }),

    setIsTyping: (state, action) => {
      state.isTyping = action.payload;
    },

    setShowSuggestions: (state, action) => {
      state.showSuggestions = action.payload;
    },

    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },

    setSuggestions: (state, action) => {
      state.suggestions = action.payload || [];
    },

    // Manual injection
    addUserMessage: (state, action) => {
      const { message, sessionId, mediaUri, mediaType } = action.payload;
      const msg = {
        id: genId('user'),
        type: 'user',
        message,
        sessionId: sessionId || state.currentSessionId,
        timestamp: new Date().toISOString(),
        hasMedia: !!mediaUri,
        mediaUri: mediaUri || null,
        mediaType: mediaType || null,
      };
      state.messages.push(msg);
      state.lastMessageId = msg.id;
    },

    addBotMessage: (state, action) => {
      const { response, sessionId, source, citations } = action.payload;
      const msg = {
        id: genId('bot'),
        type: 'bot',
        message: response,
        sessionId: sessionId || state.currentSessionId,
        timestamp: new Date().toISOString(),
        source: source || 'main-chatbot',
        citations: citations || [],
      };
      state.messages.push(msg);
      state.lastMessageId = msg.id;
    },

    addErrorMessage: (state, action) => {
      const { error, sessionId } = action.payload;
      const msg = {
        id: genId('error'),
        type: 'error',
        message: error,
        sessionId: sessionId || state.currentSessionId,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      state.messages.push(msg);
      state.lastMessageId = msg.id;
    },
  },

  extraReducers: (builder) => {
    builder

      // ── sendMainChatMessage ──────────────────────────────────────────────────
      .addCase(sendMainChatMessage.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.showSuggestions = false;

        const { message, sessionId } = action.meta.arg;
        const msg = {
          id: genId('user'),
          type: 'user',
          message,
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          hasMedia: false,
        };
        state.messages.push(msg);
        state.lastMessageId = msg.id;
      })
      .addCase(sendMainChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        const { response, sessionId, source, citations, conversationId } = action.payload;

        // Persist conversation_id for subsequent turns
        if (conversationId) state.conversationId = conversationId;

        const msg = {
          id: genId('bot'),
          type: 'bot',
          message: response,
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          source: source || 'main-chatbot',
          citations: citations || [],  // ✅ stored on the message
        };
        state.messages.push(msg);
        state.lastMessageId = msg.id;
      })
      .addCase(sendMainChatMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send message';
        const msg = {
          id: genId('error'),
          type: 'error',
          message: state.error,
          sessionId: state.currentSessionId,
          timestamp: new Date().toISOString(),
          isError: true,
        };
        state.messages.push(msg);
        state.lastMessageId = msg.id;
      })

      // ── ingestMedia ──────────────────────────────────────────────────────────
      .addCase(ingestMedia.pending, (state, action) => {
        state.mediaLoading = true;
        state.mediaError = null;
        state.showSuggestions = false;
        const { sessionId } = action.meta.arg;
        const msg = {
          id: genId('user'),
          type: 'user',
          message: 'Ingesting media…',
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          hasMedia: true,
        };
        state.messages.push(msg);
        state.lastMessageId = msg.id;
      })
      .addCase(ingestMedia.fulfilled, (state, action) => {
        state.mediaLoading = false;
        state.lastIngestedMedia = action.payload;
        const msg = {
          id: genId('bot'),
          type: 'bot',
          message: 'Media has been ingested and is being processed. You can now ask questions about it!',
          sessionId: action.payload.sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          source: 'main-chatbot',
          citations: [],
        };
        state.messages.push(msg);
        state.lastMessageId = msg.id;
      })
      .addCase(ingestMedia.rejected, (state, action) => {
        state.mediaLoading = false;
        state.mediaError = action.payload || 'Media ingest failed';
        const msg = {
          id: genId('error'),
          type: 'error',
          message: state.mediaError,
          sessionId: state.currentSessionId,
          timestamp: new Date().toISOString(),
          isError: true,
        };
        state.messages.push(msg);
        state.lastMessageId = msg.id;
      })

      // ── triggerChatAction ────────────────────────────────────────────────────
      .addCase(triggerChatAction.pending, (state) => {
        state.actionLoading = true;
        state.actionError = null;
      })
      .addCase(triggerChatAction.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.lastActionResult = action.payload;
      })
      .addCase(triggerChatAction.rejected, (state, action) => {
        state.actionLoading = false;
        state.actionError = action.payload || 'Action failed';
      })

      // ── checkChatbotHealth ───────────────────────────────────────────────────
      .addCase(checkChatbotHealth.fulfilled, (state, action) => {
        state.healthStatus = action.payload.status;
        state.connectionStatus = action.payload.status === 'healthy' ? 'connected' : 'error';
      })
      .addCase(checkChatbotHealth.rejected, (state) => {
        state.healthStatus = 'unhealthy';
        state.connectionStatus = 'error';
      })

      // ── getMainChatbotSuggestions ────────────────────────────────────────────
      .addCase(getMainChatbotSuggestions.fulfilled, (state, action) => {
        state.suggestions = action.payload?.suggestions || [];
      })
      .addCase(getMainChatbotSuggestions.rejected, (state) => {
        state.suggestions = [
          'What can tenants ask about?',
          'How do I submit a maintenance request?',
          'What is the lease policy?',
          'Tell me about rent payments',
        ];
      })

      // ── adminListMedia ───────────────────────────────────────────────────────
      .addCase(adminListMedia.pending, (state) => { state.adminLoading = true; state.adminError = null; })
      .addCase(adminListMedia.fulfilled, (state, action) => { state.adminLoading = false; state.adminMediaList = action.payload; })
      .addCase(adminListMedia.rejected, (state, action) => { state.adminLoading = false; state.adminError = action.payload || 'Failed'; })

      // ── adminReprocessMedia ──────────────────────────────────────────────────
      .addCase(adminReprocessMedia.pending, (state) => { state.adminLoading = true; state.adminError = null; })
      .addCase(adminReprocessMedia.fulfilled, (state) => { state.adminLoading = false; })
      .addCase(adminReprocessMedia.rejected, (state, action) => { state.adminLoading = false; state.adminError = action.payload || 'Reprocess failed'; });
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────
export const {
  setSessionId,
  clearMessages,
  clearError,
  resetState,
  setIsTyping,
  setShowSuggestions,
  setConnectionStatus,
  addUserMessage,
  addBotMessage,
  addErrorMessage,
  setSuggestions,
} = mainChatbotSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectRoot              = (state) => state.mainChatbot || {};
const selectMessages          = createSelector([selectRoot], (s) => s.messages || []);
const selectLoading           = createSelector([selectRoot], (s) => s.loading);
const selectMediaLoading      = createSelector([selectRoot], (s) => s.mediaLoading);
const selectError             = createSelector([selectRoot], (s) => s.error);
const selectSuggestions       = createSelector([selectRoot], (s) => s.suggestions || []);
const selectShowSuggestions   = createSelector([selectRoot], (s) => s.showSuggestions);
const selectIsTyping          = createSelector([selectRoot], (s) => s.isTyping);
const selectConnectionStatus  = createSelector([selectRoot], (s) => s.connectionStatus);
const selectHealthStatus      = createSelector([selectRoot], (s) => s.healthStatus);
const selectSessionId         = createSelector([selectRoot], (s) => s.currentSessionId);
const selectConversationId    = createSelector([selectRoot], (s) => s.conversationId);
const selectLastIngestedMedia = createSelector([selectRoot], (s) => s.lastIngestedMedia);
const selectAdminMediaList    = createSelector([selectRoot], (s) => s.adminMediaList || []);

export const mainChatbotSelectors = {
  getChatData: createSelector(
    [
      selectMessages, selectLoading, selectMediaLoading, selectError,
      selectSuggestions, selectShowSuggestions, selectIsTyping,
      selectConnectionStatus, selectHealthStatus,
      selectSessionId, selectConversationId,
    ],
    (
      messages, loading, mediaLoading, error,
      suggestions, showSuggestions, isTyping,
      connectionStatus, healthStatus,
      currentSessionId, conversationId,
    ) => ({
      messages, loading, mediaLoading, error,
      suggestions, showSuggestions, isTyping,
      connectionStatus, healthStatus,
      currentSessionId, conversationId,
    })
  ),
  getMessages:            selectMessages,
  getError:               selectError,
  getSuggestions:         selectSuggestions,
  getShowSuggestions:     selectShowSuggestions,
  getSessionId:           selectSessionId,
  getConversationId:      selectConversationId,
  getLastIngestedMedia:   selectLastIngestedMedia,
  getAdminMediaList:      selectAdminMediaList,
  getHealthStatus:        selectHealthStatus,
  getConnectionStatus:    selectConnectionStatus,
};

export default mainChatbotSlice.reducer;
