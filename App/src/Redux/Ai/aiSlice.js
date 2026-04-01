// aiSlice.js - Redux slice for AWS AI chat functionality
import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  sendChatMessage,
  sendChatMessageNew,
  sendChatMessageWithImage,
  getAISuggestions,
} from './services';

// ─── Initial State ────────────────────────────────────────────────────────────
const initialState = {
  messages: [],
  loading: false,
  error: null,
  currentSessionId: null,
  suggestions: [],
  isTyping: false,
  connectionStatus: 'disconnected',
  lastMessageId: null,
  totalTokensUsed: 0,
  conversationHistory: [],
};

// ─── ID Generator ─────────────────────────────────────────────────────────────
let messageCounter = 0;
const generateMessageId = (prefix) => `${prefix}-${Date.now()}-${++messageCounter}`;

// ─── Slice ────────────────────────────────────────────────────────────────────
const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setCurrentSessionId: (state, action) => {
      state.currentSessionId = action.payload;
    },

    clearChatMessages: (state) => {
      state.messages = [];
      state.error = null;
      state.conversationHistory = [];
      state.totalTokensUsed = 0;
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

    addUserMessage: (state, action) => {
      const { message, sessionId, imageUri } = action.payload;
      const userMessage = {
        id: generateMessageId('user'),
        type: 'user',
        message,
        sessionId,
        timestamp: new Date().toISOString(),
        hasImage: !!imageUri,
        imageUri: imageUri || null,
      };
      state.messages.push(userMessage);
      state.lastMessageId = userMessage.id;
    },

    addAIMessage: (state, action) => {
      const { response, sessionId, source } = action.payload;
      const aiMessage = {
        id: generateMessageId('ai'),
        type: 'ai',
        message: response,
        sessionId,
        timestamp: new Date().toISOString(),
        source: source || 'aws',
      };
      state.messages.push(aiMessage);
      state.lastMessageId = aiMessage.id;
    },

    addErrorMessage: (state, action) => {
      const { error, sessionId } = action.payload;
      const errorMessage = {
        id: generateMessageId('error'),
        type: 'error',
        message: error,
        sessionId,
        timestamp: new Date().toISOString(),
        isError: true,
      };
      state.messages.push(errorMessage);
      state.lastMessageId = errorMessage.id;
    },

    updateTokenUsage: (state, action) => {
      state.totalTokensUsed += action.payload?.tokensUsed || 0;
    },

    setSuggestions: (state, action) => {
      state.suggestions = action.payload || [];
    },
  },

  extraReducers: (builder) => {
    builder

      // ─── sendChatMessageNew ──────────────────────────────────
      .addCase(sendChatMessageNew.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        const { message, sessionId } = action.meta.arg;
        const userMessage = {
          id: generateMessageId('user'),
          type: 'user',
          message,
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          hasImage: false,
        };
        state.messages.push(userMessage);
        state.lastMessageId = userMessage.id;
        state.conversationHistory.push({
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendChatMessageNew.fulfilled, (state, action) => {
        state.loading = false;
        const { response, sessionId, source } = action.payload;
        const aiMessage = {
          id: generateMessageId('ai'),
          type: 'ai',
          message: response,
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          source: source || 'aws-new',
        };
        state.messages.push(aiMessage);
        state.lastMessageId = aiMessage.id;
        state.conversationHistory.push({
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendChatMessageNew.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send message';
        const errorMessage = {
          id: generateMessageId('error'),
          type: 'error',
          message: state.error,
          sessionId: state.currentSessionId,
          timestamp: new Date().toISOString(),
          isError: true,
        };
        state.messages.push(errorMessage);
        state.lastMessageId = errorMessage.id;
      })

      // ─── sendChatMessage (legacy) ────────────────────────────
      .addCase(sendChatMessage.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        const { message, sessionId } = action.meta.arg;
        const userMessage = {
          id: generateMessageId('user'),
          type: 'user',
          message,
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          hasImage: false,
        };
        state.messages.push(userMessage);
        state.lastMessageId = userMessage.id;
        state.conversationHistory.push({
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendChatMessage.fulfilled, (state, action) => {
        state.loading = false;
        const { response, sessionId, source } = action.payload;
        const aiMessage = {
          id: generateMessageId('ai'),
          type: 'ai',
          message: response,
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          source: source || 'aws',
        };
        state.messages.push(aiMessage);
        state.lastMessageId = aiMessage.id;
        state.conversationHistory.push({
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(sendChatMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send message';
        const errorMessage = {
          id: generateMessageId('error'),
          type: 'error',
          message: state.error,
          sessionId: state.currentSessionId,
          timestamp: new Date().toISOString(),
          isError: true,
        };
        state.messages.push(errorMessage);
        state.lastMessageId = errorMessage.id;
      })

      // ─── sendChatMessageWithImage ────────────────────────────
      .addCase(sendChatMessageWithImage.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        const { message, sessionId, imageUri } = action.meta.arg;
        const userMessage = {
          id: generateMessageId('user'),
          type: 'user',
          message: message || 'Sent an image',
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          hasImage: true,
          imageUri,
        };
        state.messages.push(userMessage);
        state.lastMessageId = userMessage.id;
        state.conversationHistory.push({
          role: 'user',
          content: message || 'Image sent',
          timestamp: new Date().toISOString(),
          hasImage: true,
        });
      })
      .addCase(sendChatMessageWithImage.fulfilled, (state, action) => {
        state.loading = false;
        const { response, sessionId, source } = action.payload;
        const aiMessage = {
          id: generateMessageId('ai'),
          type: 'ai',
          message: response,
          sessionId: sessionId || state.currentSessionId,
          timestamp: new Date().toISOString(),
          source: source || 'aws',
          hasImage: true,
        };
        state.messages.push(aiMessage);
        state.lastMessageId = aiMessage.id;
        state.conversationHistory.push({
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString(),
          hasImage: true,
        });
      })
      .addCase(sendChatMessageWithImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to send image message';
        const errorMessage = {
          id: generateMessageId('error'),
          type: 'error',
          message: state.error,
          sessionId: state.currentSessionId,
          timestamp: new Date().toISOString(),
          isError: true,
        };
        state.messages.push(errorMessage);
        state.lastMessageId = errorMessage.id;
      })

      // ─── getAISuggestions ────────────────────────────────────
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
} = aiSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectAIState = (state) => state.ai || {};
const selectMessages = createSelector([selectAIState], (ai) => ai.messages || []);
const selectLoading = createSelector([selectAIState], (ai) => ai.loading);
const selectError = createSelector([selectAIState], (ai) => ai.error);
const selectSuggestions = createSelector([selectAIState], (ai) => ai.suggestions || []);
const selectIsTyping = createSelector([selectAIState], (ai) => ai.isTyping);
const selectConnectionStatus = createSelector([selectAIState], (ai) => ai.connectionStatus);
const selectConversationHistory = createSelector([selectAIState], (ai) => ai.conversationHistory || []);
const selectLastMessageId = createSelector([selectAIState], (ai) => ai.lastMessageId);

export const chatSelectors = {
  getChatData: createSelector(
    [selectMessages, selectLoading, selectError, selectSuggestions,
     selectIsTyping, selectConnectionStatus, selectConversationHistory, selectLastMessageId],
    (messages, loading, error, suggestions, isTyping, connectionStatus, conversationHistory, lastMessageId) => ({
      messages, loading, error, suggestions,
      isTyping, connectionStatus, conversationHistory, lastMessageId,
    })
  ),
  getMessages: selectMessages,
  getError: selectError,
  getSuggestions: selectSuggestions,
  getConversationHistory: selectConversationHistory,
};

export default aiSlice.reducer;
