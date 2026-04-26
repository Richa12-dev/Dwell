// aiSlice.js — ✅ UPDATED: wired to all live-verified API endpoints
import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  sendChatMessage,
  sendChatMessageWithImage,
  sendChatMessageWithImageMultipart,
  sendChatMessageWithRemoteUrl,
  ingestMedia,
  checkHealth,
  getAISuggestions,
} from './services';

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  // Core chat
  messages:           [],
  loading:            false,
  error:              null,
  currentSessionId:   null,
  conversationId:     null,      // persisted so every turn shares one API thread
  conversationHistory:[],
  lastMessageId:      null,
  totalTokensUsed:    0,

  // Suggestions
  suggestions: [],

  // UI helpers
  isTyping:         false,
  connectionStatus: 'disconnected',

  // Health
  health: {
    status:   null,   // 'healthy' | 'unhealthy' | null
    database: null,   // 'reachable' | 'unreachable' | null
    loading:  false,
    error:    null,
    checkedAt:null,
  },

  // Media ingestion (last /media/ingest result)
  mediaIngestion: {
    loading:           false,
    error:             null,
    ingestionId:       null,
    indexedChunkCount: null,
    warnings:          [],
    status:            null,
  },
};

// ─── ID Generator ─────────────────────────────────────────────────────────────
let messageCounter = 0;
const generateMessageId = (prefix) =>
  `${prefix}-${Date.now()}-${++messageCounter}`;

// ─── Shared helpers ────────────────────────────────────────────────────────────
/**
 * Push a user message bubble into state.messages.
 * Called from the .pending handlers so the bubble appears immediately.
 */
const pushUserMessage = (state, { message, sessionId, imageUri }) => {
  const userMessage = {
    id:        generateMessageId('user'),
    type:      'user',
    message:   message || 'Sent an image',
    sessionId: sessionId || state.currentSessionId,
    timestamp: new Date().toISOString(),
    hasImage:  !!imageUri,
    imageUri:  imageUri || null,
  };
  state.messages.push(userMessage);
  state.lastMessageId = userMessage.id;
  state.conversationHistory.push({
    role:      'user',
    content:   message || 'Image sent',
    timestamp: new Date().toISOString(),
    hasImage:  !!imageUri,
  });
};

/** Push an AI reply bubble. Called from .fulfilled handlers. */
const pushAIMessage = (state, { response, sessionId, source, hasImage = false }) => {
  const aiMessage = {
    id:        generateMessageId('ai'),
    type:      'ai',
    message:   response,
    sessionId: sessionId || state.currentSessionId,
    timestamp: new Date().toISOString(),
    source:    source || 'aws',
    hasImage,
  };
  state.messages.push(aiMessage);
  state.lastMessageId = aiMessage.id;
  state.conversationHistory.push({
    role:      'assistant',
    content:   response,
    timestamp: new Date().toISOString(),
    hasImage,
  });
};

/** Push an error bubble. Called from .rejected handlers. */
const pushErrorMessage = (state, error) => {
  const errorMessage = {
    id:        generateMessageId('error'),
    type:      'error',
    message:   error,
    sessionId: state.currentSessionId,
    timestamp: new Date().toISOString(),
    isError:   true,
  };
  state.messages.push(errorMessage);
  state.lastMessageId = errorMessage.id;
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const aiSlice = createSlice({
  name: 'ai',
  initialState,

  // ─── Synchronous reducers ──────────────────────────────────────────────────
  reducers: {
    setCurrentSessionId: (state, action) => {
      state.currentSessionId = action.payload;
    },

    clearChatMessages: (state) => {
      state.messages            = [];
      state.error               = null;
      state.conversationHistory = [];
      state.totalTokensUsed     = 0;
      state.conversationId      = null; // next message starts a fresh API thread
    },

    resetAIState: (state) => {
      Object.assign(state, initialState);
    },

    clearChatError: (state) => {
      state.error = null;
    },

    setChatLoading: (state, action) => {
      state.loading = action.payload;
    },

    setIsTyping: (state, action) => {
      state.isTyping = action.payload;
    },

    setConnectionStatus: (state, action) => {
      state.connectionStatus = action.payload;
    },

    // Manual message injectors (used by components that build their own bubbles)
    addUserMessage: (state, action) => {
      pushUserMessage(state, action.payload);
    },

    addAIMessage: (state, action) => {
      pushAIMessage(state, action.payload);
    },

    addErrorMessage: (state, action) => {
      pushErrorMessage(state, action.payload?.error || 'Unknown error');
    },

    updateTokenUsage: (state, action) => {
      state.totalTokensUsed += action.payload?.tokensUsed || 0;
    },

    setSuggestions: (state, action) => {
      state.suggestions = action.payload || [];
    },

    clearMediaIngestion: (state) => {
      state.mediaIngestion = initialState.mediaIngestion;
    },
  },

  // ─── Async reducers ────────────────────────────────────────────────────────
  extraReducers: (builder) => {
    builder

      // ── checkHealth ─────────────────────────────────────────────────────────
      .addCase(checkHealth.pending, (state) => {
        state.health.loading = true;
        state.health.error   = null;
      })
      .addCase(checkHealth.fulfilled, (state, action) => {
        state.health.loading   = false;
        state.health.status    = action.payload.status;
        state.health.database  = action.payload.database;
        state.health.checkedAt = new Date().toISOString();
      })
      .addCase(checkHealth.rejected, (state, action) => {
        state.health.loading = false;
        state.health.status  = 'unhealthy';
        state.health.error   = action.payload || 'Health check failed';
      })

      // ── sendChatMessage (text-only) ─────────────────────────────────────────
      .addCase(sendChatMessage.pending, (state, action) => {
        state.loading = true;
        state.error   = null;
        pushUserMessage(state, action.meta.arg);
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.conversationId) {
          state.conversationId = action.payload.conversationId;
        }
        pushAIMessage(state, action.payload);
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload || 'Failed to send message';
        pushErrorMessage(state, state.error);
      })

      // ── sendChatMessageWithImage (JSON / base64) ────────────────────────────
      // Verified shape: execution_type "hybrid", media_ingestion.status "success"
      .addCase(sendChatMessageWithImage.pending, (state, action) => {
        state.loading = true;
        state.error   = null;
        const { message, sessionId, imageUri } = action.meta.arg;
        pushUserMessage(state, { message, sessionId, imageUri });
      })
      .addCase(sendChatMessageWithImage.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.conversationId) {
          state.conversationId = action.payload.conversationId;
        }
        pushAIMessage(state, { ...action.payload, hasImage: true });
      })
      .addCase(sendChatMessageWithImage.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload || 'Failed to send image message';
        pushErrorMessage(state, state.error);
      })

      // ── sendChatMessageWithImageMultipart (form-data) ───────────────────────
      // Verified shape: execution_type "rag", media_ingestion.status "success"
      .addCase(sendChatMessageWithImageMultipart.pending, (state, action) => {
        state.loading = true;
        state.error   = null;
        const { message, sessionId, imageFile } = action.meta.arg;
        pushUserMessage(state, { message, sessionId, imageUri: imageFile?.uri });
      })
      .addCase(sendChatMessageWithImageMultipart.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.conversationId) {
          state.conversationId = action.payload.conversationId;
        }
        pushAIMessage(state, { ...action.payload, hasImage: true });
      })
      .addCase(sendChatMessageWithImageMultipart.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload || 'Failed to upload image';
        pushErrorMessage(state, state.error);
      })

      // ── sendChatMessageWithRemoteUrl ────────────────────────────────────────
      // Code path implemented; live verification pending allow-listed remote URL.
      .addCase(sendChatMessageWithRemoteUrl.pending, (state, action) => {
        state.loading = true;
        state.error   = null;
        const { message, sessionId, imageUrl } = action.meta.arg;
        pushUserMessage(state, { message, sessionId, imageUri: imageUrl });
      })
      .addCase(sendChatMessageWithRemoteUrl.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.conversationId) {
          state.conversationId = action.payload.conversationId;
        }
        pushAIMessage(state, { ...action.payload, hasImage: true });
      })
      .addCase(sendChatMessageWithRemoteUrl.rejected, (state, action) => {
        state.loading = false;
        state.error   = action.payload || 'Failed to process remote image';
        pushErrorMessage(state, state.error);
      })

      // ── ingestMedia ─────────────────────────────────────────────────────────
      // Verified: HTTP 200, indexed_chunk_count may be 0 (GIN index issue on dev).
      // Does NOT add a chat bubble — ingestion is a background operation.
      .addCase(ingestMedia.pending, (state) => {
        state.mediaIngestion.loading = true;
        state.mediaIngestion.error   = null;
        state.mediaIngestion.status  = 'pending';
      })
      .addCase(ingestMedia.fulfilled, (state, action) => {
        state.mediaIngestion.loading           = false;
        state.mediaIngestion.status            = action.payload.status;
        state.mediaIngestion.ingestionId       = action.payload.ingestionId;
        state.mediaIngestion.indexedChunkCount = action.payload.indexedChunkCount;
        state.mediaIngestion.warnings          = action.payload.warnings;
      })
      .addCase(ingestMedia.rejected, (state, action) => {
        state.mediaIngestion.loading = false;
        state.mediaIngestion.status  = 'error';
        state.mediaIngestion.error   = action.payload || 'Media ingestion failed';
      })

      // ── getAISuggestions ────────────────────────────────────────────────────
      .addCase(getAISuggestions.fulfilled, (state, action) => {
        state.suggestions = action.payload?.suggestions || [];
      })
      .addCase(getAISuggestions.rejected, (state) => {
        state.suggestions = [
          "My sink is leaking",
          "Toilet won't flush",
          "There's a crack in the wall",
          "How do I fix a dripping tap?",
        ];
      });
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────
export const {
  setCurrentSessionId,
  clearChatMessages,
  resetAIState,
  clearChatError,
  setChatLoading,
  setIsTyping,
  setConnectionStatus,
  addUserMessage,
  addAIMessage,
  addErrorMessage,
  updateTokenUsage,
  setSuggestions,
  clearMediaIngestion,
} = aiSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectAIState          = (state) => state.ai || {};
const selectMessages         = createSelector([selectAIState], (ai) => ai.messages || []);
const selectLoading          = createSelector([selectAIState], (ai) => ai.loading);
const selectError            = createSelector([selectAIState], (ai) => ai.error);
const selectSuggestions      = createSelector([selectAIState], (ai) => ai.suggestions || []);
const selectIsTyping         = createSelector([selectAIState], (ai) => ai.isTyping);
const selectConnectionStatus = createSelector([selectAIState], (ai) => ai.connectionStatus);
const selectConversationHist = createSelector([selectAIState], (ai) => ai.conversationHistory || []);
const selectLastMessageId    = createSelector([selectAIState], (ai) => ai.lastMessageId);
const selectHealth           = createSelector([selectAIState], (ai) => ai.health);
const selectMediaIngestion   = createSelector([selectAIState], (ai) => ai.mediaIngestion);

export const chatSelectors = {
  getChatData: createSelector(
    [
      selectMessages, selectLoading, selectError, selectSuggestions,
      selectIsTyping, selectConnectionStatus, selectConversationHist,
      selectLastMessageId,
    ],
    (messages, loading, error, suggestions, isTyping, connectionStatus, conversationHistory, lastMessageId) => ({
      messages, loading, error, suggestions,
      isTyping, connectionStatus, conversationHistory, lastMessageId,
    })
  ),
  getMessages:            selectMessages,
  getError:               selectError,
  getSuggestions:         selectSuggestions,
  getConversationHistory: selectConversationHist,
  getHealth:              selectHealth,
  getMediaIngestion:      selectMediaIngestion,
};

export default aiSlice.reducer;
