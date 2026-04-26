// mainChatbotServices.js — ✅ UPDATED: admin endpoints use authFetch
// Most endpoints are public (no auth). Only admin endpoints need auth.
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { authFetch } from '../../utils/authFetch';  // ✅ NEW (for admin endpoints only)

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

// ⚠️ Raw fetch — public endpoint, no auth
export const sendMainChatMessage = createAsyncThunk(
  'mainChatbot/sendMessage',
  async ({ message, sessionId }, { rejectWithValue }) => {
    if (!message?.trim()) return rejectWithValue('Message is required');
    try {
      Toast.show('Sending your message...', Toast.SHORT);
      const response = await fetchWithTimeout(MAIN_CHATBOT_ENDPOINTS.chat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ message: message.trim(), session_id: sessionId || `session-${Date.now()}` }),
      }, 30000);
      let data; try { data = await response.json(); } catch { return rejectWithValue(`Could not parse server response (HTTP ${response.status})`); }
      if (!response.ok) {
        const errMsg = (Array.isArray(data?.errors) && data.errors[0]) || data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Failed to send message', Toast.LONG); return rejectWithValue(`Server error: ${errMsg}`);
      }
      const aiResponse = data?.answer || data?.reply || data?.response || null;
      if (!aiResponse) return rejectWithValue(`No AI response received. Fields: ${Object.keys(data).join(', ')}`);
      const cleanResponse = sanitizeLinksInText(aiResponse.replace(/\*/g, '').trim());
      Toast.show('Message sent!', Toast.SHORT);
      return { response: cleanResponse, sessionId, conversationId: data?.conversation_id || null, intent: data?.intent || null, citations: data?.citations || [], route: data?.route || null, metadata: data?.metadata || {}, timestamp: new Date().toISOString(), source: 'main-chatbot' };
    } catch (error) {
      Toast.show('Message failed. Check your connection.', Toast.LONG); return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ⚠️ Raw fetch — optional auth
export const ingestMedia = createAsyncThunk(
  'mainChatbot/ingestMedia',
  async ({ sourceRef, sourcePath, storageEvent, sessionId, message, token }, { rejectWithValue }) => {
    if (!sourceRef && !sourcePath && !storageEvent) return rejectWithValue('One of source_ref, source_path, or storage_event is required.');
    const cleanToken = sanitizeToken(token);
    try {
      Toast.show('Ingesting media...', Toast.SHORT);
      const body = { session_id: sessionId || `session-${Date.now()}`, ...(message && { message }), ...(sourceRef && { source_ref: sourceRef }), ...(sourcePath && { source_path: sourcePath }), ...(storageEvent && { storage_event: storageEvent }) };
      const response = await fetchWithTimeout(MAIN_CHATBOT_ENDPOINTS.mediaIngest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}) },
        body: JSON.stringify(body),
      }, 60000);
      let data; try { data = await response.json(); } catch { return rejectWithValue(`Could not parse server response (HTTP ${response.status})`); }
      if (!response.ok || data?.ok === false) {
        const errMsg = (Array.isArray(data?.errors) && data.errors[0]) || data?.error || `HTTP ${response.status}`;
        Toast.show('Media ingest failed', Toast.LONG); return rejectWithValue(`Server error: ${errMsg}`);
      }
      Toast.show('Media ingested! You can now ask questions about it.', Toast.LONG);
      return { mediaId: data?.data?.media_id || data?.data?.id || null, status: data?.data?.status || 'ingested', sessionId, timestamp: new Date().toISOString(), meta: data?.meta || {} };
    } catch (error) { Toast.show('Media ingest failed.', Toast.LONG); return rejectWithValue(error.message || 'Network error'); }
  }
);

// ⚠️ Raw fetch — optional auth
export const triggerChatAction = createAsyncThunk(
  'mainChatbot/triggerAction',
  async ({ action, payload, sessionId, token }, { rejectWithValue }) => {
    if (!action) return rejectWithValue('Action name is required');
    const cleanToken = sanitizeToken(token);
    try {
      const response = await fetchWithTimeout(MAIN_CHATBOT_ENDPOINTS.actions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}) },
        body: JSON.stringify({ action, payload: payload || {}, session_id: sessionId || null }),
      }, 30000);
      let data; try { data = await response.json(); } catch { return rejectWithValue(`Could not parse server response (HTTP ${response.status})`); }
      if (!response.ok) {
        const errMsg = (Array.isArray(data?.errors) && data.errors[0]) || data?.error || `HTTP ${response.status}`;
        return rejectWithValue(`Action error: ${errMsg}`);
      }
      return { action, result: data?.data || data?.result || data, sessionId, timestamp: new Date().toISOString() };
    } catch (error) { return rejectWithValue(error.message || 'Network error'); }
  }
);

// ⚠️ Raw fetch — public
export const checkChatbotHealth = createAsyncThunk(
  'mainChatbot/checkHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchWithTimeout(MAIN_CHATBOT_ENDPOINTS.health, { method: 'GET', headers: { Accept: 'application/json' } }, 10000);
      const data = await response.json().catch(() => ({}));
      const isHealthy = data?.ok === true && data?.data?.status === 'ok';
      return { status: isHealthy ? 'healthy' : 'unhealthy', subsystems: data?.data?.subsystems || {}, summary: data?.data?.summary || {}, timestamp: new Date().toISOString() };
    } catch (error) { return rejectWithValue('Health check failed: ' + error.message); }
  }
);

// No fetch needed
export const getMainChatbotSuggestions = createAsyncThunk(
  'mainChatbot/getSuggestions',
  async ({ context, sessionId } = {}, { rejectWithValue }) => {
    try {
      const suggestions = ['What can tenants ask about?', 'How do I submit a maintenance request?', 'What is the lease policy?', 'Tell me about rent payments'];
      return { suggestions, sessionId, source: 'local' };
    } catch (error) { return rejectWithValue('Failed to load suggestions'); }
  }
);

// ✅ authFetch — admin endpoint
export const adminListMedia = createAsyncThunk(
  'mainChatbot/adminListMedia',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(MAIN_CHATBOT_ENDPOINTS.adminMediaList, { method: 'GET', headers: { Accept: 'application/json' } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return rejectWithValue((Array.isArray(data?.errors) && data.errors[0]) || `HTTP ${response.status}`);
      return data?.data?.media || data?.data?.items || data?.data || [];
    } catch (error) { return rejectWithValue(error.message); }
  }
);

// ✅ authFetch — admin endpoint
export const adminReprocessMedia = createAsyncThunk(
  'mainChatbot/adminReprocessMedia',
  async ({ mediaId }, { rejectWithValue }) => {
    try {
      const response = await authFetch(MAIN_CHATBOT_ENDPOINTS.adminMediaReprocess, {
        method: 'POST', headers: { Accept: 'application/json' },
        body: JSON.stringify({ media_id: mediaId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return rejectWithValue((Array.isArray(data?.errors) && data.errors[0]) || `HTTP ${response.status}`);
      return { mediaId, status: data?.data?.status || 'reprocessing', timestamp: new Date().toISOString() };
    } catch (error) { return rejectWithValue(error.message); }
  }
);

export const cleanup = () => console.log('Main chatbot services cleaned up.');
