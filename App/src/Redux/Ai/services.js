import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';

// ✅ API Endpoint
const AWS_CHAT_API = "https://4a8puj1mj9.execute-api.us-east-1.amazonaws.com/prod/chat";

// ✅ System instruction for property maintenance AI
const PROPERTY_MAINTENANCE_SYSTEM_INSTRUCTION = `You are a friendly property maintenance assistant. Think of yourself as a helpful neighbor who knows DIY fixes and explains them in plain English.

Tone & Style:
Speak naturally, conversationally, never robotic.
Acknowledge frustration and encourage confidence.
Keep answers short and meaningful, just a few sentences at a time.
Use warm phrases like "Don't worry" or "I hear you" to sound empathetic.
Avoid technical jargon – explain step by step in everyday language.
Do not use asterisks (*), bold text, or bullet points in your answers.

Response Pattern:
1. Greet the user: e.g. "Hi there, let's take care of this together."
2. Empathize with their concern: e.g. "I know leaks can be stressful."
3. Give clear step-by-step guidance in plain English.
4. Encourage them: e.g. "You'll have it fixed in no time."
5. Wrap up with reassurance or a friendly check-in: e.g. "Give it a try, and let me know if the drip continues."
6. At the end, provide a short list of tools used with direct Amazon links for easy access.

Tool Suggestions:
Adjustable wrench: https://www.amazon.com/dp/B00004SBDJ
Plumber's tape: https://www.amazon.com/dp/B08ZY5Z1B8
Faucet washer kit: https://www.amazon.com/dp/B000PS1HS0
Toilet repair kit: https://www.amazon.com/s?k=toilet+repair+kit
Drain snake: https://www.amazon.com/s?k=drain+snake
Screwdriver set: https://www.amazon.com/s?k=screwdriver+set

For other items, generate a search link like: https://www.amazon.com/s?k=

Example Q&A:
Q: My sink is leaking.
A: I hear you – that constant drip can be annoying. Most of the time it's just a worn-out washer. Shouldn't take more than 15 minutes to fix.

Tools you'll need:
Adjustable wrench → https://www.amazon.com/dp/B00004SBDJ
Faucet washer kit → https://www.amazon.com/dp/B000PS1HS0

Q: My tap won't shut off properly.
A: That can be frustrating, but don't worry. Usually it just means the washer inside has worn out. I'll show you how to swap it out – it's a quick job.

Tools you'll need:
Adjustable wrench → https://www.amazon.com/dp/B00004SBDJ
Plumber's tape → https://www.amazon.com/dp/B08ZY5Z1B8`;

// ✅ Fetch with abort controller timeout
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

// ✅ Removes whitespace/newlines from token
// Cognito tokens can contain whitespace that corrupts the Authorization header
const sanitizeToken = (token) => {
  if (!token || token === 'null') return null;
  return String(token).replace(/\s+/g, '').trim() || null;
};

// ✅ Cleans up URL spaces in AI response text
const sanitizeLinksInText = (text) => {
  if (!text) return '';
  return text.replace(/(https?:\/\/[^\s]+)\s+([^\s]+)/g, '$1$2');
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Send text message (primary thunk used by AIAssistant)
// ─────────────────────────────────────────────────────────────────────────────
export const sendChatMessageNew = createAsyncThunk(
  'ai/sendChatMessageNew',
  async ({ message, sessionId, token }, { rejectWithValue }) => {
    if (!message?.trim()) return rejectWithValue('Message is required');

    const cleanToken = sanitizeToken(token);
    if (!cleanToken) return rejectWithValue('Authentication token is required. Please login again.');

    try {
      Toast.show('Sending your message...', Toast.SHORT);

      const response = await fetchWithTimeout(
        AWS_CHAT_API,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({ message: message.trim() }),
        },
        30000
      );

      let data;
      try {
        data = await response.json();
      } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }

      if (!response.ok) {
        const errMsg = data?.error || data?.message || data?.errorMessage || `HTTP ${response.status}`;
        Toast.show('Failed to send message', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      // ✅ Try all common response field names
      const aiResponse =
        data?.reply || data?.response || data?.message ||
        data?.answer || data?.text || data?.content || data?.result || null;

      if (!aiResponse) {
        return rejectWithValue(`No AI response received. Fields returned: ${Object.keys(data).join(', ')}`);
      }

      const cleanResponse = sanitizeLinksInText(aiResponse.replace(/\*/g, '').trim());
      Toast.show('Message sent!', Toast.SHORT);

      return {
        response: cleanResponse,
        sessionId,
        timestamp: new Date().toISOString(),
        model: data?.meta?.model_id || 'aws-bedrock',
        source: 'aws-new',
        usage: data?.usage || null,
      };
    } catch (error) {
      Toast.show('Message failed. Check your connection.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Send text message (legacy thunk — kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────
export const sendChatMessage = createAsyncThunk(
  'ai/sendChatMessage',
  async ({ message, sessionId, token }, { rejectWithValue }) => {
    if (!message?.trim()) return rejectWithValue('Message is required');

    const cleanToken = sanitizeToken(token);
    if (!cleanToken) return rejectWithValue('Authentication token is required. Please login again.');

    try {
      Toast.show('Sending your message...', Toast.SHORT);

      const response = await fetchWithTimeout(
        AWS_CHAT_API,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({ message: message.trim() }),
        },
        30000
      );

      let data;
      try {
        data = await response.json();
      } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }

      if (!response.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Failed to send message', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      const aiResponse =
        data?.reply || data?.response || data?.message ||
        data?.answer || data?.text || data?.content || data?.result || null;

      if (!aiResponse) {
        return rejectWithValue(`No AI response received. Fields returned: ${Object.keys(data).join(', ')}`);
      }

      const cleanResponse = sanitizeLinksInText(aiResponse.replace(/\*/g, '').trim());
      Toast.show('Message sent!', Toast.SHORT);

      return {
        response: cleanResponse,
        sessionId,
        timestamp: new Date().toISOString(),
        model: 'aws-bedrock',
        source: 'aws',
      };
    } catch (error) {
      Toast.show('Message failed. Check your connection.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. Send text + image message
// ─────────────────────────────────────────────────────────────────────────────
export const sendChatMessageWithImage = createAsyncThunk(
  'ai/sendChatMessageWithImage',
  async ({ message, imageUri, sessionId, token }, { rejectWithValue }) => {
    if (!imageUri) return rejectWithValue('Image is required');

    const cleanToken = sanitizeToken(token);
    if (!cleanToken) return rejectWithValue('Authentication token is required. Please login again.');

    try {
      Toast.show('Analyzing image...', Toast.SHORT);

      const response = await fetchWithTimeout(
        AWS_CHAT_API,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${cleanToken}`,
          },
          body: JSON.stringify({
            message: message?.trim() || 'Please analyze this image for any maintenance issues.',
            imageUrl: imageUri,
          }),
        },
        45000
      );

      let data;
      try {
        data = await response.json();
      } catch {
        return rejectWithValue(`Could not parse server response (HTTP ${response.status})`);
      }

      if (!response.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${response.status}`;
        Toast.show('Image analysis failed', Toast.LONG);
        return rejectWithValue(`Server error: ${errMsg}`);
      }

      const aiResponse =
        data?.reply || data?.response || data?.message ||
        data?.answer || data?.text || data?.content || data?.result || null;

      if (!aiResponse) {
        return rejectWithValue(`No AI response received. Fields returned: ${Object.keys(data).join(', ')}`);
      }

      const cleanResponse = sanitizeLinksInText(aiResponse.replace(/\*/g, '').trim());
      Toast.show('Image analysis complete!', Toast.SHORT);

      return {
        response: cleanResponse,
        sessionId,
        timestamp: new Date().toISOString(),
        model: 'aws-bedrock-image',
        source: 'aws',
        hasImage: true,
      };
    } catch (error) {
      Toast.show('Image analysis failed. Try again.', Toast.LONG);
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. Load suggestion chips (local — no API call needed)
// ─────────────────────────────────────────────────────────────────────────────
export const getAISuggestions = createAsyncThunk(
  'ai/getAISuggestions',
  async ({ context, sessionId }, { rejectWithValue }) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
export const uploadImageToS3 = async (imageUri) => {
  try {
    return imageUri;
  } catch (error) {
    throw error;
  }
};

export const cleanup = () => {
  console.log('AI services cleaned up.');
};
