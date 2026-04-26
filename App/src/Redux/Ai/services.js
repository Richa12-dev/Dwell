// Redux/Ai/services.js — ✅ UPDATED: all endpoints wired to live-verified API shapes
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import RNFS from 'react-native-fs';           // for local-file → base64 conversion
import { authFetch } from '../../utils/authFetch';

// ─── Base URLs ────────────────────────────────────────────────────────────────
const BASE_URL   = 'https://yannx11442.execute-api.us-east-1.amazonaws.com/dev/api/v1';
const CHAT_URL   = `${BASE_URL}/chat`;
const INGEST_URL = `${BASE_URL}/media/ingest`;
const HEALTH_URL = `${BASE_URL}/health`;

// ─── Conversation-ID registry ─────────────────────────────────────────────────
// One stable conversation_id per sessionId keeps the full thread coherent on the API side.
const conversationIdMap = {};
const getOrCreateConversationId = (sessionId) => {
  if (!conversationIdMap[sessionId]) {
    conversationIdMap[sessionId] = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  return conversationIdMap[sessionId];
};
export const clearConversationId = (sessionId) => {
  if (sessionId) delete conversationIdMap[sessionId];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sanitizeLinksInText = (text) => {
  if (!text) return '';
  return text.replace(/(https?:\/\/[^\s]+)\s+([^\s]+)/g, '$1$2');
};

const cleanAIText = (text) =>
  sanitizeLinksInText((text || '').replace(/\*/g, '').trim());

/** Pull the AI reply from any of the field names the backend may return. */
const extractAIResponse = (data) =>
  data?.reply   ||
  data?.response ||
  data?.message  ||
  data?.answer   ||
  data?.text     ||
  data?.content  ||
  data?.result   ||
  null;

/**
 * Convert a local file:// URI to a plain base64 string using react-native-fs.
 * Returns the string unchanged if it is already a data-URI or a remote URL.
 */
const toBase64 = async (uri) => {
  if (!uri) return null;
  if (uri.startsWith('data:')) {
    // Strip "data:<mime>;base64," prefix
    return uri.split(',')[1];
  }
  if (uri.startsWith('http')) {
    // Remote URL — caller should use sendChatMessageWithRemoteUrl instead
    return null;
  }
  // Local file path (file:// or bare path)
  const path = uri.replace('file://', '');
  return await RNFS.readFile(path, 'base64');
};

/** Derive file name from URI or fall back to a timestamped default. */
const fileNameFromUri = (uri) => {
  if (!uri) return `image-${Date.now()}.jpg`;
  const parts = uri.split('/');
  return parts[parts.length - 1] || `image-${Date.now()}.jpg`;
};

/** Derive MIME type from file extension (basic). */
const mimeFromUri = (uri = '') => {
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) return 'image/jpeg';
  if (uri.endsWith('.gif')) return 'image/gif';
  if (uri.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
};

// ─── 1. Health Check ──────────────────────────────────────────────────────────
/**
 * GET /api/v1/health
 * Verified: HTTP 200, { status: "healthy", components: { db_access: { database: "reachable" } } }
 */
export const checkHealth = createAsyncThunk(
  'ai/checkHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authFetch(HEALTH_URL, { method: 'GET' });
      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse health response (HTTP ${response.status})`);
      }
      if (!response.ok) return rejectWithValue(`Health check failed: HTTP ${response.status}`);
      return {
        status:   data?.status || 'unknown',
        database: data?.components?.db_access?.database || 'unknown',
        raw:      data,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Health check network error');
    }
  }
);

// ─── 2. Text-only chat ────────────────────────────────────────────────────────
/**
 * POST /api/v1/chat  —  { message, conversation_id }
 * Verified: HTTP 200, { status:"success", response:"…", metadata:{ execution_type:"conversation" } }
 */
export const sendChatMessage = createAsyncThunk(
  'ai/sendChatMessage',
  async ({ message, sessionId }, { rejectWithValue }) => {
    if (!message?.trim()) return rejectWithValue('Message is required');
    const conversationId = getOrCreateConversationId(sessionId);
    try {
      Toast.show('Sending your message...', Toast.SHORT);
      const response = await authFetch(CHAT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          message:         message.trim(),
          conversation_id: conversationId,
        }),
      });
      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }
      if (!response.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Failed to send message', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }
      const aiResponse = extractAIResponse(data);
      if (!aiResponse) {
        return rejectWithValue(`No AI response received. Fields: ${Object.keys(data).join(', ')}`);
      }
      Toast.show('Message sent!', Toast.SHORT);
      return {
        response:      cleanAIText(aiResponse),
        sessionId,
        conversationId,
        executionType: data?.metadata?.execution_type || 'conversation',
        source:        'aws',
        timestamp:     new Date().toISOString(),
      };
    } catch (error) {
      Toast.show('Message failed. Check your connection.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// Alias kept for components still importing sendChatMessageNew
export const sendChatMessageNew = createAsyncThunk(
  'ai/sendChatMessageNew',
  async (args, { dispatch, rejectWithValue }) => {
    // Delegate to the canonical thunk so logic is not duplicated
    const result = await dispatch(sendChatMessage(args));
    if (sendChatMessage.rejected.match(result)) {
      return rejectWithValue(result.payload);
    }
    return { ...result.payload, source: 'aws-new' };
  }
);

// ─── 3. Chat with JSON / base64 image ────────────────────────────────────────
/**
 * POST /api/v1/chat  —  { conversation_id, files:[{ file_name, mime_type, content_base64, metadata }] }
 * Verified: HTTP 200, execution_type:"hybrid", media_ingestion.status:"success"
 *
 * @param imageUri   Local file:// URI  OR  a bare base64 string.
 * @param ocrHint    Optional text hint fed to the OCR path (helps when OCR is unconfigured).
 * @param captionHint Optional caption hint.
 */
export const sendChatMessageWithImage = createAsyncThunk(
  'ai/sendChatMessageWithImage',
  async ({ message, imageUri, imageBase64, sessionId, ocrHint, captionHint }, { rejectWithValue }) => {
    if (!imageUri && !imageBase64) return rejectWithValue('Image is required');
    const conversationId = getOrCreateConversationId(sessionId);
    try {
      Toast.show('Analyzing image...', Toast.SHORT);

      // Use pre-fetched base64 from the image picker when available (skips RNFS disk read)
      const base64 = imageBase64 || await toBase64(imageUri);
      if (!base64) {
        return rejectWithValue('Could not convert image to base64. Use sendChatMessageWithRemoteUrl for remote images.');
      }

      const fileName = fileNameFromUri(imageUri);
      const mimeType = mimeFromUri(imageUri);

      const payload = {
        conversation_id: conversationId,
        // message is optional; backend injects default inspection prompt when omitted
        ...(message?.trim() && { message: message.trim() }),
        files: [
          {
            file_name:      fileName,
            mime_type:      mimeType,
            content_base64: base64,
            metadata: {
              ...(ocrHint     && { ocr_text_hint: ocrHint }),
              ...(captionHint && { caption_hint:  captionHint }),
            },
          },
        ],
      };

      const response = await authFetch(CHAT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(payload),
      });

      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }
      if (!response.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Image analysis failed', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      const aiResponse = extractAIResponse(data);
      if (!aiResponse) {
        return rejectWithValue(`No AI response received. Fields: ${Object.keys(data).join(', ')}`);
      }

      Toast.show('Image analysis complete!', Toast.SHORT);
      return {
        response:       cleanAIText(aiResponse),
        sessionId,
        conversationId,
        executionType:  data?.metadata?.execution_type  || 'hybrid',
        ingestionStatus:data?.metadata?.media_ingestion?.status || null,
        workflowType:   data?.metadata?.classifier?.workflow_type || null,
        workflowStatus: data?.metadata?.workflow?.status || null,
        source:         'aws',
        hasImage:       true,
        timestamp:      new Date().toISOString(),
      };
    } catch (error) {
      Toast.show('Image analysis failed. Try again.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─── 4. Chat with multipart image upload ─────────────────────────────────────
/**
 * POST /api/v1/chat  —  multipart/form-data
 * Verified: HTTP 200, execution_type:"rag", media_ingestion.status:"success"
 *
 * Use this when you already have a Blob/File object (e.g. from a document picker)
 * rather than a local file URI you can read with RNFS.
 *
 * @param imageFile  A { uri, name, type } object (React Native FormData format).
 */
export const sendChatMessageWithImageMultipart = createAsyncThunk(
  'ai/sendChatMessageWithImageMultipart',
  async ({ message, imageFile, sessionId }, { rejectWithValue }) => {
    if (!imageFile?.uri) return rejectWithValue('Image file is required');
    const conversationId = getOrCreateConversationId(sessionId);
    try {
      Toast.show('Uploading image...', Toast.SHORT);

      const form = new FormData();
      form.append('conversation_id', conversationId);
      if (message?.trim()) {
        form.append('message', message.trim());
      }
      // React Native FormData accepts { uri, name, type }
      form.append('files', {
        uri:  imageFile.uri,
        name: imageFile.name || fileNameFromUri(imageFile.uri),
        type: imageFile.type || mimeFromUri(imageFile.uri),
      });

      const response = await authFetch(CHAT_URL, {
        method:  'POST',
        // Do NOT set Content-Type — let the runtime set multipart + boundary
        headers: { Accept: 'application/json' },
        body:    form,
      });

      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }
      if (!response.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Image upload failed', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      const aiResponse = extractAIResponse(data);
      if (!aiResponse) {
        return rejectWithValue(`No AI response received. Fields: ${Object.keys(data).join(', ')}`);
      }

      Toast.show('Image uploaded and analysed!', Toast.SHORT);
      return {
        response:        cleanAIText(aiResponse),
        sessionId,
        conversationId,
        executionType:   data?.metadata?.execution_type   || 'rag',
        ingestionStatus: data?.metadata?.media_ingestion?.status || null,
        source:          'aws-multipart',
        hasImage:        true,
        timestamp:       new Date().toISOString(),
      };
    } catch (error) {
      Toast.show('Image upload failed. Try again.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─── 5. Chat with remote image URL ───────────────────────────────────────────
/**
 * POST /api/v1/chat  —  { conversation_id, image_url }
 * Code path implemented; live verification pending an allow-listed remote URL.
 * Allowed hosts (from REMOTE_MEDIA_ALLOWED_HOSTS):
 *   api.twilio.com, mcs.us1.twilio.com, media.twiliocdn.com
 */
export const sendChatMessageWithRemoteUrl = createAsyncThunk(
  'ai/sendChatMessageWithRemoteUrl',
  async ({ message, imageUrl, sessionId }, { rejectWithValue }) => {
    if (!imageUrl) return rejectWithValue('imageUrl is required');
    const conversationId = getOrCreateConversationId(sessionId);
    try {
      Toast.show('Analyzing remote image...', Toast.SHORT);

      const response = await authFetch(CHAT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          image_url: imageUrl,
          // message is optional — backend injects inspection prompt when omitted
          ...(message?.trim() && { message: message.trim() }),
        }),
      });

      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }
      if (!response.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Remote image analysis failed', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      const aiResponse = extractAIResponse(data);
      if (!aiResponse) {
        return rejectWithValue(`No AI response received. Fields: ${Object.keys(data).join(', ')}`);
      }

      Toast.show('Remote image analysed!', Toast.SHORT);
      return {
        response:        cleanAIText(aiResponse),
        sessionId,
        conversationId,
        executionType:   data?.metadata?.execution_type   || 'hybrid',
        ingestionStatus: data?.metadata?.media_ingestion?.status || null,
        workflowType:    data?.metadata?.classifier?.workflow_type || null,
        workflowStatus:  data?.metadata?.workflow?.status || null,
        source:          'aws-remote-url',
        hasImage:        true,
        timestamp:       new Date().toISOString(),
      };
    } catch (error) {
      Toast.show('Remote image analysis failed. Try again.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─── 6. Direct media ingestion ────────────────────────────────────────────────
/**
 * POST /api/v1/media/ingest  —  { conversation_id, files:[…] }
 * Verified: HTTP 200, { status:"success", indexed_chunk_count:0, warnings:[…] }
 * Note: indexed_chunk_count may be 0 on the current dev stack due to the
 *       Postgres json + GIN operator-class issue; that is expected.
 */
export const ingestMedia = createAsyncThunk(
  'ai/ingestMedia',
  async ({ imageUri, sessionId, ocrHint, captionHint }, { rejectWithValue }) => {
    if (!imageUri) return rejectWithValue('Image URI is required');
    const conversationId = getOrCreateConversationId(sessionId);
    try {
      Toast.show('Ingesting media...', Toast.SHORT);

      const base64 = await toBase64(imageUri);
      if (!base64) {
        return rejectWithValue('Could not convert image to base64 for ingestion.');
      }

      const fileName = fileNameFromUri(imageUri);
      const mimeType = mimeFromUri(imageUri);

      const payload = {
        conversation_id: conversationId,
        files: [
          {
            file_name:      fileName,
            mime_type:      mimeType,
            content_base64: base64,
            metadata: {
              ...(ocrHint     && { ocr_text_hint: ocrHint }),
              ...(captionHint && { caption_hint:  captionHint }),
            },
          },
        ],
      };

      const response = await authFetch(INGEST_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(payload),
      });

      let data;
      try { data = await response.json(); } catch {
        return rejectWithValue(`Could not parse ingest response (HTTP ${response.status})`);
      }
      if (!response.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Media ingestion failed', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      Toast.show('Media ingested!', Toast.SHORT);
      return {
        status:            data?.status || 'success',
        ingestionId:       data?.ingestion_id || null,
        indexedChunkCount: data?.indexed_chunk_count ?? 0,
        // Warnings are expected on dev (GIN index issue) — surface them for debugging
        warnings:          data?.warnings || [],
        conversationId,
        sessionId,
        timestamp:         new Date().toISOString(),
      };
    } catch (error) {
      Toast.show('Media ingestion failed. Try again.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─── 7. AI Suggestions (local, no fetch) ─────────────────────────────────────
export const getAISuggestions = createAsyncThunk(
  'ai/getAISuggestions',
  async ({ context, sessionId } = {}, { rejectWithValue }) => {
    try {
      const suggestions = [
        "My sink is leaking",
        "Toilet won't flush",
        "There's a crack in the wall",
        "How do I fix a dripping tap?",
      ];
      return { suggestions, sessionId, source: 'local' };
    } catch (error) {
      return rejectWithValue('Failed to load suggestions');
    }
  }
);

// ─── Misc exports ─────────────────────────────────────────────────────────────
export const uploadImageToS3 = async (imageUri) => {
  // Placeholder — raw S3 storage is handled server-side by the /chat and /media/ingest endpoints.
  return imageUri;
};

export const cleanup = () => {
  console.log('AI services cleaned up.');
};
