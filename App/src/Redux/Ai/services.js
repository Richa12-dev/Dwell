//import { createAsyncThunk } from '@reduxjs/toolkit';
//import Toast from 'react-native-simple-toast';
//
//// Your Vertex AI API key
//const VERTEX_API_KEY = 'AQ.Ab8RN6JDrgSGiS1YJ6GJEl08RUV2oi1VviFQPtRyp2y2jiemaQ';
//
//// Your specified Gemini models (unchanged)
//const GEMINI_MODELS = {
//  TEXT_ONLY: 'gemini-2.5-flash-lite', // Text-only use cases
//  WITH_IMAGES: 'gemini-2.5-pro',      // Multimodal (text + image support)
//  PRO: 'gemini-2.5-flash',           // Advanced multimodal support
//};
//
//const VERTEX_BASE_URL = 'https://aiplatform.googleapis.com/v1/publishers/google/models';
//
//// OPTIMIZED: Reduced timeouts and better image limits
//const REQUEST_TIMEOUTS = {
//  TEXT_ONLY: 15000,    
//  WITH_IMAGES: 25000,  // Reduced from 45s to 25s
//  SUGGESTIONS: 10000,  
//  CONNECTION: 8000     
//};
//
//// OPTIMIZED: Stricter image size limits
//const IMAGE_LIMITS = {
//  MAX_SIZE_KB: 200,    // Reduced from 500KB to 200KB
//  MAX_DIMENSION: 1024, // Max width/height in pixels
//  QUALITY: 0.7,        // JPEG compression quality
//};
//
//const MAX_RETRIES = 1;
//const RETRY_DELAY = 1000;
//
//const sanitizeLinksInText = (text) => {
//  if (!text) return '';
//
//  // Remove spaces and line breaks inside URLs
//  return text.replace(/(https?:\/\/[^\s]+)\s+([^\s]+)/g, '$1$2');
//};
//
//
//// Enhanced System Instructions for Property Maintenance Assistant
//const PROPERTY_MAINTENANCE_SYSTEM_INSTRUCTION = `You are a friendly property maintenance assistant. Think of yourself as a helpful neighbor who knows DIY fixes and explains them in plain English.
//
//Tone & Style:
//Speak naturally, conversationally, never robotic.
//Acknowledge frustration and encourage confidence.
//Keep answers short and meaningful, just a few sentences at a time.
//Use warm phrases like "Don't worry" or "I hear you" to sound empathetic.
//Avoid technical jargon — explain step by step in everyday language.
//Do not use asterisks (*), bold text, or bullet points in your answers.
//
//Response Pattern:
//1. Greet the user: e.g. "Hi there, let's take care of this together."
//2. Empathize with their concern: e.g. "I know leaks can be stressful."
//3. Give clear step-by-step guidance in plain English.
//4. Encourage them: e.g. "You'll have it fixed in no time."
//5. Wrap up with reassurance or a friendly check-in: e.g. "Give it a try, and let me know if the drip continues."
//6. At the end, provide a short list of tools used with direct Amazon links for easy access.
//
//Tool Suggestions:
//Adjustable wrench: https://www.amazon.com/dp/B00004SBDJ
//Plumber's tape: https://www.amazon.com/dp/B08ZY5Z1B8
//Faucet washer kit: https://www.amazon.com/dp/B000PS1HS0
//Toilet repair kit: https://www.amazon.com/s?k=toilet+repair+kit
//Drain snake: https://www.amazon.com/s?k=drain+snake
//Screwdriver set: https://www.amazon.com/s?k=screwdriver+set
//
//For other items, generate a search link like: https://www.amazon.com/s?k=
//
//Example Q&A:
//Q: My sink is leaking.
//A: I hear you — that constant drip can be annoying. Most of the time it's just a worn-out washer. If you've got a small wrench handy, I'll guide you to tighten it. Shouldn't take more than 15 minutes.
//
//Tools you'll need:
//Adjustable wrench → https://www.amazon.com/dp/B00004SBDJ
//Faucet washer kit → https://www.amazon.com/dp/B000PS1HS0
//
//Q: My tap won't shut off properly.
//A: That can be frustrating, but don't worry. Usually it just means the washer inside has worn out. I'll show you how to swap it out — it's a quick job.
//
//Tools you'll need:
//Adjustable wrench → https://www.amazon.com/dp/B00004SBDJ
//Plumber's tape → https://www.amazon.com/dp/B08ZY5Z1B8`;
//
//// IMAGE ANALYSIS SYSTEM INSTRUCTION (shorter for faster processing)
//const IMAGE_ANALYSIS_SYSTEM_INSTRUCTION = `You are a property management assistant. Analyze images for maintenance issues, damage, or repair needs. Provide concise, helpful advice in plain English. Include relevant tool recommendations with Amazon links when appropriate.`;
//
//// Helper to build URL
//const buildVertexUrl = (modelName, apiKey) =>
//  `${VERTEX_BASE_URL}/${modelName}:generateContent?key=${apiKey}`;
//
//// OPTIMIZED: Separate controllers for different request types
//let textController = null;
//let imageController = null;
//
//// OPTIMIZED: More robust fetch with proper timeout handling
//const optimizedFetch = async (url, options, timeout, requestType = 'text') => {
//  if (requestType === 'image' && imageController) {
//    imageController.abort();
//  } else if (requestType === 'text' && textController) {
//    textController.abort();
//  }
//  
//  const controller = new AbortController();
//  const { signal } = controller;
//  
//  if (requestType === 'image') {
//    imageController = controller;
//  } else {
//    textController = controller;
//  }
//  
//  const timeoutId = setTimeout(() => {
//    controller.abort();
//  }, timeout);
//
//  try {
//    const response = await fetch(url, {
//      method: 'POST',
//      headers: {
//        'Content-Type': 'application/json',
//        'Accept': 'application/json',
//        'Cache-Control': 'no-cache',
//      },
//      signal,
//      ...options,
//    });
//    
//    clearTimeout(timeoutId);
//    return response;
//  } catch (error) {
//    clearTimeout(timeoutId);
//    if (error.name === 'AbortError') {
//      throw new Error(`Request timeout after ${timeout/1000} seconds`);
//    }
//    throw error;
//  }
//};
//
//// OPTIMIZED: Better config for faster processing
//const getOptimizedConfig = (isTextOnly = true) => ({
//  temperature: 0.7,
//  topK: isTextOnly ? 30 : 20,     // Reduced for images for faster processing
//  topP: 0.8,                      // Slightly reduced for faster generation
//  maxOutputTokens: isTextOnly ? 800 : 1000, // Reduced for images
//  candidateCount: 1,
//  stopSequences: [],
//});
//
//// NEW: Advanced image compression function
//const compressImage = async (base64Data, mimeType, maxSizeKB = IMAGE_LIMITS.MAX_SIZE_KB) => {
//  return new Promise((resolve) => {
//    try {
//      // Create image element
//      const img = new Image();
//      
//      img.onload = () => {
//        // Create canvas for resizing
//        const canvas = document.createElement('canvas');
//        const ctx = canvas.getContext('2d');
//        
//        // Calculate new dimensions
//        let { width, height } = img;
//        const maxDim = IMAGE_LIMITS.MAX_DIMENSION;
//        
//        if (width > maxDim || height > maxDim) {
//          const ratio = Math.min(maxDim / width, maxDim / height);
//          width = Math.floor(width * ratio);
//          height = Math.floor(height * ratio);
//        }
//        
//        canvas.width = width;
//        canvas.height = height;
//        
//        // Draw and compress
//        ctx.drawImage(img, 0, 0, width, height);
//        
//        // Convert to JPEG with compression
//        let quality = IMAGE_LIMITS.QUALITY;
//        let compressedData = canvas.toDataURL('image/jpeg', quality);
//        
//        // Reduce quality until size is acceptable
//        while (compressedData.length * 0.75 / 1024 > maxSizeKB && quality > 0.1) {
//          quality -= 0.1;
//          compressedData = canvas.toDataURL('image/jpeg', quality);
//        }
//        
//        // Remove data:image/jpeg;base64, prefix
//        const base64Only = compressedData.split(',')[1];
//        
//        console.log(`Image compressed: ${(base64Only.length * 0.75 / 1024).toFixed(1)}KB, quality: ${quality.toFixed(1)}`);
//        
//        resolve({
//          data: base64Only,
//          mimeType: 'image/jpeg',
//          size: base64Only.length * 0.75 / 1024
//        });
//      };
//      
//      img.onerror = () => {
//        // Fallback: simple truncation
//        console.warn('Image compression failed, using simple method');
//        resolve({
//          data: base64Data.substring(0, maxSizeKB * 1024 * 4 / 3),
//          mimeType: mimeType,
//          size: maxSizeKB
//        });
//      };
//      
//      img.src = `data:${mimeType};base64,${base64Data}`;
//      
//    } catch (error) {
//      console.warn('Compression error, using original:', error);
//      resolve({
//        data: base64Data,
//        mimeType: mimeType,
//        size: base64Data.length * 0.75 / 1024
//      });
//    }
//  });
//};
//
//// REACT NATIVE VERSION: Image compression for React Native
//const compressImageReactNative = async (base64Data, mimeType, maxSizeKB = IMAGE_LIMITS.MAX_SIZE_KB) => {
//  // For React Native, you'll need to use react-native-image-resizer or similar
//  // This is a simplified version
//  
//  const currentSizeKB = (base64Data.length * 3) / 4 / 1024;
//  
//  if (currentSizeKB <= maxSizeKB) {
//    return {
//      data: base64Data,
//      mimeType: mimeType,
//      size: currentSizeKB
//    };
//  }
//  
//  // Simple truncation as fallback
//  const compressionRatio = maxSizeKB / currentSizeKB;
//  const targetLength = Math.floor(base64Data.length * compressionRatio);
//  
//  console.warn(`Image too large (${currentSizeKB.toFixed(1)}KB), truncating to ~${maxSizeKB}KB`);
//  
//  return {
//    data: base64Data.substring(0, targetLength),
//    mimeType: 'image/jpeg', // Force JPEG for better compression
//    size: maxSizeKB
//  };
//};
//
//// Send chat message (text only) - UPDATED with enhanced system instruction
//export const sendChatMessage = createAsyncThunk(
//  'ai/sendChatMessage',
//  async (params, { rejectWithValue }) => {
//    const { message, sessionId, token } = params;
//
//    if (!message?.trim()) return rejectWithValue('Message is required');
//    if (!token) return rejectWithValue('Authentication token is required');
//
//    const model = GEMINI_MODELS.TEXT_ONLY;
//    const url = buildVertexUrl(model, VERTEX_API_KEY);
//
//    const sanitizedMessage = sanitizeLinksInText(message);
//
//    const requestBody = {
//      systemInstruction: {
//        role: 'system',
//        parts: [{ text: PROPERTY_MAINTENANCE_SYSTEM_INSTRUCTION }]
//      },
//        contents: [{ role: 'user', parts: [{ text: sanitizedMessage }] }],
//      // contents: [{ role: 'user', parts: [{ text: message }] }],
//      generationConfig: getOptimizedConfig(true),
//      safetySettings: [
//        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
//        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
//        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
//        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
//      ],
//    };
//
//    try {
//      const response = await optimizedFetch(
//        url, 
//        { body: JSON.stringify(requestBody) }, 
//        REQUEST_TIMEOUTS.TEXT_ONLY,
//        'text'
//      );
//
//      const data = await response.json();
//
//      if (!response.ok) {
//        const errorMessage = data.error?.message || `HTTP ${response.status}`;
//        return rejectWithValue(`Bad request: ${errorMessage}`);
//      }
//
//      const aiResponseRaw = data.candidates?.[0]?.content?.parts?.[0]?.text;
//      if (!aiResponseRaw) return rejectWithValue('Invalid AI service response');
//
//      // remove markdown asterisks
//      const aiResponse = sanitizeLinksInText(aiResponseRaw.replace(/\*/g, '').trim());
//
//      return {
//        response: aiResponse,
//        sessionId,
//        timestamp: new Date().toISOString(),
//        source: 'vertex-ai',
//        model,
//        usage: data.usageMetadata,
//      };
//    } catch (error) {
//      console.error('Send message error:', error);
//      return rejectWithValue(error.message || 'Network error');
//    }
//  }
//);
//
//// OPTIMIZED: Much faster image message handling - UPDATED with enhanced system instruction
//export const sendChatMessageWithImage = createAsyncThunk(
//  'ai/sendChatMessageWithImage',
//  async (params, { rejectWithValue }) => {
//    const { message, image, imageMimeType, sessionId, token } = params;
//
//    if (!image) return rejectWithValue('Image data is required');
//    if (!imageMimeType) return rejectWithValue('Image MIME type is required');
//    if (!token) return rejectWithValue('Authentication token is required');
//
//    if (!imageMimeType.startsWith('image/')) {
//      return rejectWithValue('Invalid image format');
//    }
//
//    // Show immediate feedback to user
//    Toast.show('Compressing image...', Toast.SHORT);
//
//    try {
//      // OPTIMIZED: Compress image before sending
//      const compressed = await compressImageReactNative(image, imageMimeType);
//      
//      Toast.show(`Sending image (${compressed.size.toFixed(1)}KB)...`, Toast.SHORT);
//
//      const model = GEMINI_MODELS.WITH_IMAGES;
//      const url = buildVertexUrl(model, VERTEX_API_KEY);
//
//      const parts = [];
//    
//      if (message?.trim()) {
//        parts.push({ text: message });
//      } else {
//        parts.push({ text: "Please analyze this image for any maintenance issues or repairs needed." });
//      }
//
//      parts.push({
//        inlineData: {
//          mimeType: compressed.mimeType,
//          data: compressed.data
//        }
//      });
//
//      const requestBody = {
//        systemInstruction: {
//          role: 'system',
//          parts: [{ text: IMAGE_ANALYSIS_SYSTEM_INSTRUCTION }]
//        },
//        contents: [{ role: 'user', parts }],
//        generationConfig: getOptimizedConfig(false),
//        safetySettings: [
//          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
//          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
//          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
//          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
//        ],
//      };
//
//      console.log(`Sending compressed image (${compressed.size.toFixed(1)}KB) with timeout: ${REQUEST_TIMEOUTS.WITH_IMAGES}ms`);
//      
//      const startTime = Date.now();
//      
//      const response = await optimizedFetch(
//        url, 
//        { body: JSON.stringify(requestBody) }, 
//        REQUEST_TIMEOUTS.WITH_IMAGES,
//        'image'
//      );
//
//      const processingTime = Date.now() - startTime;
//      console.log(`Image processing completed in ${processingTime}ms`);
//
//      const data = await response.json();
//
//      if (!response.ok) {
//        const errorMessage = data.error?.message || `HTTP ${response.status}`;
//        console.error('API Error Response:', data);
//        return rejectWithValue(`Bad request: ${errorMessage}`);
//      }
//
//      const aiResponseRaw = data.candidates?.[0]?.content?.parts?.[0]?.text;
//      if (!aiResponseRaw) return rejectWithValue('Invalid AI service response');
//      
//      // remove markdown asterisks
//    const aiResponse = sanitizeLinksInText(aiResponseRaw.replace(/\*/g, '').trim());
//
//      Toast.show('Image analysis completed!', Toast.SHORT);
//
//      return {
//        response: aiResponse,
//        sessionId,
//        timestamp: new Date().toISOString(),
//        source: 'vertex-ai',
//        model,
//        hasImage: true,
//        processingTime,
//        imageSize: compressed.size,
//        usage: data.usageMetadata,
//      };
//    } catch (error) {
//      console.error('Send image message error:', error);
//      
//      if (error.message.includes('timeout')) {
//        Toast.show('Image analysis timed out', Toast.LONG);
//        return rejectWithValue('Image analysis timed out. Try a smaller image.');
//      }
//      
//      Toast.show('Image processing failed', Toast.LONG);
//      return rejectWithValue(error.message || 'Network error processing image');
//    }
//  }
//);
//
//// OPTIMIZED: Get AI suggestions with caching - unchanged but faster
//export const getAISuggestions = createAsyncThunk(
//  'ai/getAISuggestions',
//  async (params, { rejectWithValue }) => {
//    const { context, sessionId } = params;
//    
//    const cacheKey = context.substring(0, 30).toLowerCase();
//    const cached = suggestionsCache.get(cacheKey);
//    
//    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
//      return {
//        suggestions: cached.suggestions,
//        sessionId,
//        source: 'cache'
//      };
//    }
//
//    const model = GEMINI_MODELS.TEXT_ONLY;
//    const url = buildVertexUrl(model, VERTEX_API_KEY);
//
//    const suggestionPrompt = `Based on "${context}", suggest 3 brief follow-up questions about property maintenance.`;
//
//    const requestBody = {
//      contents: [{ role: 'user', parts: [{ text: suggestionPrompt }] }],
//      generationConfig: { 
//        temperature: 0.8, 
//        topK: 15,        // Reduced for faster generation
//        topP: 0.9, 
//        maxOutputTokens: 150, // Reduced
//        candidateCount: 1,
//      }
//    };
//
//    try {
//      const response = await optimizedFetch(
//        url, 
//        { body: JSON.stringify(requestBody) }, 
//        REQUEST_TIMEOUTS.SUGGESTIONS,
//        'text'
//      );
//
//      if (!response.ok) {
//        throw new Error('Suggestions request failed');
//      }
//
//      const data = await response.json();
//      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
//      const lines = responseText.split('\n').filter(Boolean).slice(0, 3);
//       const suggestions = lines.map(line => line.trim().replace(/\*/g, '').replace(/^\d+\.\s*/, '').trim());
//
//      suggestionsCache.set(cacheKey, {
//        suggestions: suggestions.length >= 3 ? suggestions : [
//          "What can you help me with?",
//          "Tell me about property maintenance",
//          "How do I manage tenant issues?"
//        ],
//        timestamp: Date.now()
//      });
//
//      return { 
//        suggestions: suggestionsCache.get(cacheKey).suggestions, 
//        sessionId, 
//        source: 'vertex-ai' 
//      };
//    } catch (error) {
//      return {
//        suggestions: [
//          "What can you help me with?",
//          "Tell me about property maintenance", 
//          "How do I manage tenant issues?"
//        ],
//        sessionId,
//        source: 'fallback'
//      };
//    }
//  }
//);
//
//// Test API connection - unchanged
//export const testGeminiConnection = createAsyncThunk(
//  'ai/testConnection',
//  async (_, { rejectWithValue }) => {
//    const model = GEMINI_MODELS.TEXT_ONLY;
//    const url = buildVertexUrl(model, VERTEX_API_KEY);
//
//    const requestBody = {
//      contents: [{ role: 'user', parts: [{ text: "Respond with 'Connection successful'" }] }],
//      generationConfig: { 
//        temperature: 0.1, 
//        maxOutputTokens: 50,
//        candidateCount: 1,
//      }
//    };
//
//    try {
//      const response = await optimizedFetch(
//        url, 
//        { body: JSON.stringify(requestBody) }, 
//        REQUEST_TIMEOUTS.CONNECTION,
//        'text'
//      );
//
//      const data = await response.json();
//
//      if (!response.ok) {
//        return rejectWithValue(`API test failed: ${data.error?.message || response.status}`);
//      }
//
//      return {
//        success: true,
//        response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Connected',
//        model,
//        timestamp: new Date().toISOString(),
//      };
//    } catch (error) {
//      return rejectWithValue(error.message || 'Connection test failed');
//    }
//  }
//);
//
//// Simple suggestions cache
//let suggestionsCache = new Map();
//const CACHE_DURATION = 300000; // 5 minutes
//
//// Enhanced cleanup function
//export const cleanup = () => {
//  suggestionsCache.clear();
//  if (textController) {
//    textController.abort();
//    textController = null;
//  }
//  if (imageController) {
//    imageController.abort();
//    imageController = null;
//  }
//};

import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';

// ✅ API Endpoints
const AWS_CHAT_API = "https://2wr8vjsqwb.execute-api.us-east-1.amazonaws.com/chat";
const AWS_CHAT_API_NEW = "https://4a8puj1mj9.execute-api.us-east-1.amazonaws.com/prod/chat";

// ✅ Enhanced System Instructions for Property Maintenance Assistant
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
A: I hear you – that constant drip can be annoying. Most of the time it's just a worn-out washer. If you've got a small wrench handy, I'll guide you to tighten it. Shouldn't take more than 15 minutes.

Tools you'll need:
Adjustable wrench → https://www.amazon.com/dp/B00004SBDJ
Faucet washer kit → https://www.amazon.com/dp/B000PS1HS0

Q: My tap won't shut off properly.
A: That can be frustrating, but don't worry. Usually it just means the washer inside has worn out. I'll show you how to swap it out – it's a quick job.

Tools you'll need:
Adjustable wrench → https://www.amazon.com/dp/B00004SBDJ
Plumber's tape → https://www.amazon.com/dp/B08ZY5Z1B8`;

// ✅ Helper function for timeout-safe fetch
const fetchWithTimeout = async (url, options, timeout = 30000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

// ✅ Helper to sanitize links in text
const sanitizeLinksInText = (text) => {
  if (!text) return '';
  return text.replace(/(https?:\/\/[^\s]+)\s+([^\s]+)/g, '$1$2');
};

// ✅ 1. NEW API - Text message with JWT authentication
export const sendChatMessageNew = createAsyncThunk(
  "ai/sendChatMessageNew",
  async ({ message, sessionId, token }, { rejectWithValue }) => {
    if (!message?.trim()) return rejectWithValue("Message is required");
    if (!token) return rejectWithValue("Authentication token is required");

    try {
      console.log('📤 Sending text message to NEW AWS API...');
      console.log('🔑 Token:', token.substring(0, 20) + '...');
      console.log('📝 Message:', message);
      Toast.show("Sending your message...", Toast.SHORT);

      const response = await fetchWithTimeout(
        AWS_CHAT_API_NEW,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${token}` // ✅ JWT Token
          },
          body: JSON.stringify({
            message: message.trim(),
          }),
        },
        30000
      );

      const data = await response.json();
      console.log('📥 NEW AWS API response:', JSON.stringify(data, null, 2));

      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP ${response.status}`;
        console.error('❌ API Error:', msg);
        Toast.show("Failed to send message", Toast.LONG);
        return rejectWithValue(`Request failed: ${msg}`);
      }

      // ✅ Extract response from the "reply" field (your API's response structure)
      const aiResponse = data?.reply || data?.response || data?.message || null;

      if (!aiResponse) {
        console.error('❌ No AI response found in data:', data);
        console.error('Available keys:', Object.keys(data));
        Toast.show("No response received from AI", Toast.LONG);
        return rejectWithValue(`No AI response found. Available fields: ${Object.keys(data).join(', ')}`);
      }

      const cleanResponse = sanitizeLinksInText(aiResponse.replace(/\*/g, '').trim());

      console.log('✅ AI Response extracted:', cleanResponse.substring(0, 100) + '...');
      Toast.show("Message sent successfully!", Toast.SHORT);

      return {
        response: cleanResponse,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        model: data?.meta?.model_id || "aws-lambda-new",
        source: "aws-new",
        usage: data?.usage, // Include usage stats if available
      };
    } catch (error) {
      console.error('❌ Text chat error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      Toast.show("Message failed. Check your connection.", Toast.LONG);
      return rejectWithValue(error.message || "Network error");
    }
  }
);

// ✅ 2. OLD API - Text message (keeping for backward compatibility)
export const sendChatMessage = createAsyncThunk(
  "ai/sendChatMessage",
  async ({ message, sessionId, token }, { rejectWithValue }) => {
    if (!message?.trim()) return rejectWithValue("Message is required");

    try {
      console.log('📤 Sending text message to OLD AWS Lambda...');
      Toast.show("Sending your message...", Toast.SHORT);

      const response = await fetchWithTimeout(
        AWS_CHAT_API,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            systemInstruction: PROPERTY_MAINTENANCE_SYSTEM_INSTRUCTION,
            message: message.trim(),
          }),
        },
        30000
      );

      const data = await response.json();
      console.log('📥 OLD AWS Lambda response:', data);

      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP ${response.status}`;
        console.error('❌ API Error:', msg);
        Toast.show("Failed to send message", Toast.LONG);
        return rejectWithValue(`Request failed: ${msg}`);
      }

      const aiResponse = data?.response || data?.message || "No response from AI.";
      const cleanResponse = sanitizeLinksInText(aiResponse.replace(/\*/g, '').trim());

      Toast.show("Message sent successfully!", Toast.SHORT);

      return {
        response: cleanResponse,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        model: "aws-lambda-text",
        source: "aws",
      };
    } catch (error) {
      console.error('❌ Text chat error:', error);
      Toast.show("Message failed. Check your connection.", Toast.LONG);
      return rejectWithValue(error.message || "Network error");
    }
  }
);

// ✅ 3. Text + Image message (for image analysis)
export const sendChatMessageWithImage = createAsyncThunk(
  "ai/sendChatMessageWithImage",
  async ({ message, imageUri, sessionId, token }, { rejectWithValue }) => {
    if (!imageUri) return rejectWithValue("Image is required");

    try {
      console.log('📤 Sending image message to AWS Lambda...');
      console.log('Image URI:', imageUri);
      Toast.show("Analyzing image...", Toast.SHORT);

      const response = await fetchWithTimeout(
        AWS_CHAT_API,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({
            systemInstruction: PROPERTY_MAINTENANCE_SYSTEM_INSTRUCTION,
            message: message?.trim() || "Please analyze this image for any maintenance issues.",
            imageUrl: imageUri,
          }),
        },
        45000
      );

      const data = await response.json();
      console.log('📥 AWS Lambda image response:', data);

      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP ${response.status}`;
        console.error('❌ Image API Error:', msg);
        Toast.show("Image analysis failed", Toast.LONG);
        return rejectWithValue(`Request failed: ${msg}`);
      }

      const aiResponse = data?.response || data?.message || "No analysis received.";
      const cleanResponse = sanitizeLinksInText(aiResponse.replace(/\*/g, '').trim());

      Toast.show("Image analysis complete!", Toast.SHORT);

      return {
        response: cleanResponse,
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        model: "aws-lambda-image",
        source: "aws",
        hasImage: true,
      };
    } catch (error) {
      console.error('❌ Image chat error:', error);
      Toast.show("Image analysis failed. Try again.", Toast.LONG);
      return rejectWithValue(error.message || "Network error");
    }
  }
);

// ✅ 4. AI suggestions
export const getAISuggestions = createAsyncThunk(
  "ai/getAISuggestions",
  async ({ context, sessionId }, { rejectWithValue }) => {
    try {
      const suggestions = [
        "My sink is leaking",
        "Toilet won't flush",
        "There's a crack in the wall",
        "How do I fix a dripping tap?",
      ];

      return { suggestions, sessionId, source: "local" };
    } catch (error) {
      console.error('❌ Suggestions error:', error);
      return rejectWithValue("Failed to load suggestions");
    }
  }
);

// ✅ Optional: Upload image to S3 before sending to Lambda
export const uploadImageToS3 = async (imageUri, imageMimeType) => {
  try {
    console.log('Uploading image to S3...');
    return imageUri;
  } catch (error) {
    console.error('Failed to upload image:', error);
    throw error;
  }
};

// ✅ Export cleanup function
export const cleanup = () => {
  console.log('Cleaning up AI services...');
};
