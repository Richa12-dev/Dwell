// Redux/NotificationServices/services.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';

const API_BASE_URL = 'https://868zw7mnl3.execute-api.us-east-1.amazonaws.com/prod/notifications';

/**
 * Get inbox notifications
 * @param {Object} params - { filter: 'all'|'pending'|'delivered', limit: number }
 */
export const getNotifications = createAsyncThunk(
  'notifications/getNotifications',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.login?.accessToken;

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      const { filter = 'all', limit = 100 } = params;
      
      // Build request body according to API format
      const requestBody = {
        action: 'inbox',
        data: {
          limit: limit
        }
      };

      // Add 'only' field based on filter
      if (filter === 'pending' || filter === 'all') {
        requestBody.data.only = filter;
      }
      // If filter is 'delivered', don't include 'only' field
      
      console.log('📡 Fetching notifications with body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📨 Response status:', response.status);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = [];
        }
      }

      console.log('📦 Notifications Response:', data);

      if (response.ok) {
        // API returns array directly or wrapped in an object
        const notifications = Array.isArray(data) ? data : (data.items || data.notifications || data.data || []);
        return notifications;
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Network/Parse Error:', err);
      let errorMessage = 'Failed to fetch notifications';

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.name === 'SyntaxError') {
        errorMessage = 'Invalid response from server';
      } else {
        errorMessage = err.message || errorMessage;
      }

      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Create a new notification
 * @param {Object} notificationData
 * @param {string} notificationData.subject - Notification subject (required)
 * @param {string} notificationData.description - Notification description (required)
 * @param {string} notificationData.scheduled_for - ISO timestamp (optional)
 * @param {Object} notificationData.recipients - { mode: 'AUTO' } or { mode: 'EXPLICIT', tenant_ids: [], contractor_ids: [] }
 * @param {Object} notificationData.context - Additional context like ticket_id, property_id (optional)
 */
export const createNotification = createAsyncThunk(
  'notifications/createNotification',
  async (notificationData, { getState, rejectWithValue }) => {
    try {
      console.log('🚀 Starting createNotification...');
      console.log('📥 Received notificationData:', notificationData);
      
      const state = getState();
      const token = state.loginData?.accessToken || state.login?.accessToken;
      console.log('🔑 Token exists:', !!token);

      if (!token) {
        console.error('❌ No token found!');
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      // ✅ Build request body according to API format
      const requestBody = {
        action: 'create',
        data: {
          subject: notificationData.subject,
          description: notificationData.description,
          recipients: notificationData.recipients || { mode: 'AUTO' },
        }
      };

      // ✅ Add optional fields only if provided
      if (notificationData.scheduled_for) {
        requestBody.data.scheduled_for = notificationData.scheduled_for;
      }

      if (notificationData.context) {
        requestBody.data.context = notificationData.context;
      }

      console.log('📡 API URL:', API_BASE_URL);
      console.log('📡 Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📨 Response status:', response.status);
      console.log('📨 Response ok:', response.ok);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        console.log('📨 Text response:', textResponse);
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = { message: textResponse };
        }
      }

      console.log('📦 Parsed response data:', JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log('✅ Notification created successfully');
        Toast.show('Notification created successfully');
        return data;
      } else if (response.status === 401) {
        console.error('❌ 401 Unauthorized');
        Toast.show('Session expired. Please login again.');
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('❌ Exception in createNotification:', err);
      
      let errorMessage = 'Failed to create notification';

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (err.name === 'SyntaxError') {
        errorMessage = 'Invalid response from server';
      } else {
        errorMessage = err.message || errorMessage;
      }

      console.error('❌ Final error message:', errorMessage);
      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Mark notification as read
 * @param {Object} params
 * @param {string} params.notificationId - Notification ID (e.g., NTF_ABC123)
 * @param {string} params.scheduledForUtc - Original scheduled_for_utc timestamp (required by API)
 */
export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async ({ notificationId, scheduledForUtc }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.login?.accessToken;

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      console.log('📡 Marking notification as read:', notificationId);
      console.log('📡 scheduled_for_utc:', scheduledForUtc);

      const requestBody = {
        action: 'mark_read',
        data: {
          notification_id: notificationId,
          scheduled_for_utc: scheduledForUtc
        }
      };

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📨 Response status:', response.status);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = { message: textResponse };
        }
      }

      console.log('📦 Mark as Read Response:', data);

      if (response.ok) {
        return { notificationId, data };
      } else if (response.status === 401) {
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API Error:', errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Network/Parse Error:', err);
      let errorMessage = 'Failed to mark notification as read';

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }

      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Cancel a scheduled notification
 * @param {string} notificationId - Notification ID (e.g., NTF_ABC123)
 * Note: Only works if notification is still SCHEDULED and caller is sender OR landlord/admin
 */
export const cancelNotification = createAsyncThunk(
  'notifications/cancelNotification',
  async (notificationId, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.login?.accessToken;

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      console.log('📡 Canceling notification:', notificationId);

      const requestBody = {
        action: 'cancel',
        data: {
          notification_id: notificationId
        }
      };

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📨 Response status:', response.status);

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = { message: textResponse };
        }
      }

      console.log('📦 Cancel Notification Response:', data);

      if (response.ok) {
        Toast.show('Notification cancelled successfully');
        return { notificationId, data };
      } else if (response.status === 401) {
        Toast.show('Session expired. Please login again.');
        return rejectWithValue('Session expired. Please login again.');
      } else {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('API Error:', errorMessage);
        Toast.show(errorMessage);
        return rejectWithValue(errorMessage);
      }
    } catch (err) {
      console.error('Network/Parse Error:', err);
      let errorMessage = 'Failed to cancel notification';

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }

      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Get unread notification count
 */
export const getUnreadCount = createAsyncThunk(
  'notifications/getUnreadCount',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.login?.accessToken;

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      const requestBody = {
        action: 'inbox',
        data: {
          only: 'all',
          limit: 100
        }
      };

      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const textResponse = await response.text();
        try {
          data = JSON.parse(textResponse);
        } catch {
          data = [];
        }
      }

      if (response.ok) {
        const notifications = Array.isArray(data) ? data : (data.items || data.notifications || data.data || []);
        const unreadCount = notifications.filter(n => n.read_at === null).length;
        return unreadCount;
      } else {
        return 0;
      }
    } catch (err) {
      console.error('Error getting unread count:', err);
      return 0;
    }
  }
);

/**
 * Mark all notifications as read
 */
export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const token = state.loginData?.accessToken || state.login?.accessToken;

      if (!token) {
        return rejectWithValue('Authentication token is required. Please login again.');
      }

      // First, get all notifications
      const notifications = state.notifications?.notifications || [];
      const unreadNotifications = notifications.filter(n => n.read_at === null);

      if (unreadNotifications.length === 0) {
        Toast.show('No unread notifications');
        return true;
      }

      console.log(`📡 Marking ${unreadNotifications.length} notifications as read`);

      // Mark each notification as read
      const promises = unreadNotifications.map(notification => {
        const requestBody = {
          action: 'mark_read',
          data: {
            notification_id: notification.notification_id,
            scheduled_for_utc: notification.scheduled_for_utc
          }
        };

        return fetch(API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });
      });

      await Promise.all(promises);

      Toast.show('All notifications marked as read');
      return true;
    } catch (err) {
      console.error('Error marking all as read:', err);
      let errorMessage = 'Failed to mark all notifications as read';

      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }

      Toast.show(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);
