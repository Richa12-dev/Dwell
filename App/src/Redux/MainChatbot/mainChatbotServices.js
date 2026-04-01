import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';

// ─── API Endpoints ────────────────────────────────────────────────────────────
const BASE_URL = 'https://jc80c1t1oh.execute-api.us-east-1.amazonaws.com/prod';

export const MAIN_CHATBOT_ENDPOINTS = {
  chat:                `${BASE_URL}/chat`,
  actions:             `${BASE_URL}/actions`,
  health:              `${BASE_URL}/health`,
  mediaIngest:         `${BASE_URL}/media/ingest`,
  adminMediaList:      `${BASE_URL}/admin/media`,
  adminMediaReprocess: `${BASE_URL}/admin/media/reprocess`,
  internalRetrieval:   `${BASE_URL}/internal/retrieval`,
  internalIngestion:   `${BASE_URL}/internal/ingestion`,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const sanitizeToken = (token) => {
  if (!token || token === 'null') return null;
  return String(token).replace(/\s+/g, '').trim() || null;
};

const sanitizeLinksInText = (text) => {
  if (!text) return '';
  return text.replace(/(https?:\/\/[^\s]+)\s+([^\s]+)/g, '$1$2');
};

const fetchWithTimeout = async (url, options, timeout = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Text Chat  →  POST /chat
//
//  ✅ Request body  : { message, session_id }   ← snake_case, no auth header
//  ✅ Response field: answer                    ← NOT reply/response/message
//  ✅ Also returns  : citations, intent, conversation_id, route, metadata
// ─────────────────────────────────────────────────────────────────────────────
export const sendMainChatMessage = createAsyncThunk(
  'mainChatbot/sendMessage',
  async ({ message, sessionId }, { rejectWithValue }) => {
    if (!message?.trim()) return rejectWithValue('Message is required');

    try {
      Toast.show('Sending your message...', Toast.SHORT);

      const response = await fetchWithTimeout(
        MAIN_CHATBOT_ENDPOINTS.chat,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            // ✅ No Authorization header — API is open
          },
          body: JSON.stringify({
            message:    message.trim(),
            session_id: sessionId || `session-${Date.now()}`, // ✅ snake_case
          }),
        },
        30000
      );

      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }

      if (!response.ok) {
        const errMsg =
          (Array.isArray(data?.errors) && data.errors[0]) ||
          data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Failed to send message', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      // ✅ API returns "answer" — also fall back for safety
      const aiResponse = data?.answer || data?.reply || data?.response || null;

      if (!aiResponse) {
        return rejectWithValue(
          `No AI response received. Fields: ${Object.keys(data).join(', ')}`
        );
      }

      const cleanResponse = sanitizeLinksInText(aiResponse.replace(/\*/g, '').trim());
      Toast.show('Message sent!', Toast.SHORT);

      return {
        response:       cleanResponse,
        sessionId,
        conversationId: data?.conversation_id || null,
        intent:         data?.intent          || null,
        citations:      data?.citations       || [],  // ✅ forwarded to slice/UI
        route:          data?.route           || null,
        metadata:       data?.metadata        || {},
        timestamp:      new Date().toISOString(),
        source:         'main-chatbot',
      };
    } catch (error) {
      Toast.show('Message failed. Check your connection.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Media Ingest  →  POST /media/ingest
//
//  ✅ API requires ONE of: source_ref | source_path | storage_event
//     Sending a raw file binary does NOT work — pass a URL (source_ref)
//     or a server-side path (source_path) instead.
//
//  Typical flow:
//    a. Upload file to S3 yourself → get back a URL
//    b. Call ingestMedia({ sourceRef: s3Url, sessionId })
//    c. Then ask follow-up questions via /chat
// ─────────────────────────────────────────────────────────────────────────────
export const ingestMedia = createAsyncThunk(
  'mainChatbot/ingestMedia',
  async ({ sourceRef, sourcePath, storageEvent, sessionId, message, token }, { rejectWithValue }) => {
    if (!sourceRef && !sourcePath && !storageEvent) {
      return rejectWithValue(
        'One of source_ref, source_path, or storage_event is required by the API.'
      );
    }

    const cleanToken = sanitizeToken(token);

    try {
      Toast.show('Ingesting media...', Toast.SHORT);

      const body = {
        session_id: sessionId || `session-${Date.now()}`,
        ...(message      && { message }),
        ...(sourceRef    && { source_ref:    sourceRef }),
        ...(sourcePath   && { source_path:   sourcePath }),
        ...(storageEvent && { storage_event: storageEvent }),
      };

      const response = await fetchWithTimeout(
        MAIN_CHATBOT_ENDPOINTS.mediaIngest,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
          },
          body: JSON.stringify(body),
        },
        60000
      );

      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }

      if (!response.ok || data?.ok === false) {
        const errMsg =
          (Array.isArray(data?.errors) && data.errors[0]) ||
          data?.error || `HTTP ${response.status}`;
        Toast.show('Media ingest failed', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      Toast.show('Media ingested! You can now ask questions about it.', Toast.LONG);

      return {
        mediaId:   data?.data?.media_id || data?.data?.id || null,
        status:    data?.data?.status   || 'ingested',
        sessionId,
        timestamp: new Date().toISOString(),
        meta:      data?.meta || {},
      };
    } catch (error) {
      Toast.show('Media ingest failed. Try again.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Chat Actions  →  POST /actions
// ─────────────────────────────────────────────────────────────────────────────
export const triggerChatAction = createAsyncThunk(
  'mainChatbot/triggerAction',
  async ({ action, payload, sessionId, token }, { rejectWithValue }) => {
    if (!action) return rejectWithValue('Action name is required');
    const cleanToken = sanitizeToken(token);

    try {
      const response = await fetchWithTimeout(
        MAIN_CHATBOT_ENDPOINTS.actions,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
          },
          body: JSON.stringify({
            action,
            payload:    payload   || {},
            session_id: sessionId || null,
          }),
        },
        30000
      );

      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }

      if (!response.ok) {
        const errMsg =
          (Array.isArray(data?.errors) && data.errors[0]) ||
          data?.error || `HTTP ${response.status}`;
        return rejectWithValue(`Action error: ${errMsg}`);
      }

      return {
        action,
        result:    data?.data || data?.result || data,
        sessionId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Health Check  →  GET /health
//    ✅ Real shape: { ok: true, data: { status: "ok", subsystems, summary } }
// ─────────────────────────────────────────────────────────────────────────────
export const checkChatbotHealth = createAsyncThunk(
  'mainChatbot/checkHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchWithTimeout(
        MAIN_CHATBOT_ENDPOINTS.health,
        { method: 'GET', headers: { Accept: 'application/json' } },
        10000
      );
      const data = await response.json().catch(() => ({}));
      const isHealthy = data?.ok === true && data?.data?.status === 'ok';

      return {
        status:     isHealthy ? 'healthy' : 'unhealthy',
        subsystems: data?.data?.subsystems || {},
        summary:    data?.data?.summary    || {},
        timestamp:  new Date().toISOString(),
      };
    } catch (error) {
      return rejectWithValue('Health check failed: ' + error.message);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. Suggestions  (local)
// ─────────────────────────────────────────────────────────────────────────────
export const getMainChatbotSuggestions = createAsyncThunk(
  'mainChatbot/getSuggestions',
  async ({ context, sessionId } = {}, { rejectWithValue }) => {
    try {
      const suggestions = [
        'What can tenants ask about?',
        'How do I submit a maintenance request?',
        'What is the lease policy?',
        'Tell me about rent payments',
      ];
      return { suggestions, sessionId, source: 'local' };
    } catch (error) {
      return rejectWithValue('Failed to load suggestions');
    }
  }
);

// ─── Admin helpers ────────────────────────────────────────────────────────────
export const adminListMedia = createAsyncThunk(
  'mainChatbot/adminListMedia',
  async ({ token }, { rejectWithValue }) => {
    const cleanToken = sanitizeToken(token);
    if (!cleanToken) return rejectWithValue('Authentication required');
    try {
      const response = await fetchWithTimeout(
        MAIN_CHATBOT_ENDPOINTS.adminMediaList,
        { method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${cleanToken}` } },
        15000
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return rejectWithValue(
          (Array.isArray(data?.errors) && data.errors[0]) || `HTTP ${response.status}`
        );
      }
      return data?.data?.media || data?.data?.items || data?.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const adminReprocessMedia = createAsyncThunk(
  'mainChatbot/adminReprocessMedia',
  async ({ mediaId, token }, { rejectWithValue }) => {
    const cleanToken = sanitizeToken(token);
    if (!cleanToken) return rejectWithValue('Authentication required');
    try {
      const response = await fetchWithTimeout(
        MAIN_CHATBOT_ENDPOINTS.adminMediaReprocess,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({ media_id: mediaId }),
        },
        15000
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return rejectWithValue(
          (Array.isArray(data?.errors) && data.errors[0]) || `HTTP ${response.status}`
        );
      }
      return { mediaId, status: data?.data?.status || 'reprocessing', timestamp: new Date().toISOString() };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const cleanup = () => console.log('Main chatbot services cleaned up.');
