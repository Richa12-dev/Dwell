// Redux/NotificationServices/services.js — ✅ UPDATED with authFetch
import { createAsyncThunk } from '@reduxjs/toolkit';
import Toast from 'react-native-simple-toast';
import { Config } from '../../config';
import { authFetch } from '../../utils/authFetch';  // ✅ NEW

const BASE_URL = Config.Base_url;

const parseSafeJSON = async (res) => {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { message: text }; }
};

export const getNotifications = createAsyncThunk(
  'notifications/getNotifications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { filter = 'all', limit = 100 } = params;
      const query = new URLSearchParams({ filter, limit }).toString();
      console.log('📡 GET /notifications?', query);
      const res = await authFetch(`${BASE_URL}/notifications?${query}`, { method: 'GET' });
      const data = await parseSafeJSON(res);
      if (res.ok) return Array.isArray(data) ? data : (data.items || data.notifications || data.data || []);
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch') ? 'Network error. Please check your internet connection.' : err.message || 'Failed to fetch notifications';
      Toast.show(msg); return rejectWithValue(msg);
    }
  }
);

export const createNotification = createAsyncThunk(
  'notifications/createNotification',
  async (notificationData, { rejectWithValue }) => {
    try {
      const body = {
        subject: notificationData.subject, description: notificationData.description,
        recipients: notificationData.recipients || { mode: 'AUTO' },
        ...(notificationData.scheduled_for && { scheduled_for: notificationData.scheduled_for }),
        ...(notificationData.context && { context: notificationData.context }),
      };
      const res = await authFetch(`${BASE_URL}/notifications`, { method: 'POST', body: JSON.stringify(body) });
      const data = await parseSafeJSON(res);
      if (res.ok) { Toast.show('Notification created successfully'); return data; }
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch') ? 'Network error.' : err.message || 'Failed to create notification';
      Toast.show(msg); return rejectWithValue(msg);
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async ({ notificationId, scheduledForUtc }, { rejectWithValue }) => {
    try {
      if (!notificationId) return rejectWithValue('Notification ID is required.');
      const res = await authFetch(`${BASE_URL}/notifications/${notificationId}`, {
        method: 'PATCH', body: JSON.stringify({ isRead: true, scheduled_for_utc: scheduledForUtc }),
      });
      const data = await parseSafeJSON(res);
      if (res.ok) return { notificationId, data };
      return rejectWithValue(data?.message || data?.error || `HTTP ${res.status}`);
    } catch (err) { return rejectWithValue(err.message || 'Failed to mark notification as read'); }
  }
);

export const cancelNotification = createAsyncThunk(
  'notifications/cancelNotification',
  async (notificationId, { rejectWithValue }) => {
    try {
      if (!notificationId) return rejectWithValue('Notification ID is required.');
      const res = await authFetch(`${BASE_URL}/notifications/${notificationId}`, { method: 'DELETE' });
      if (res.ok) { Toast.show('Notification cancelled successfully'); return { notificationId }; }
      const data = await parseSafeJSON(res);
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) {
      const msg = err.name === 'TypeError' && err.message.includes('fetch') ? 'Network error.' : err.message || 'Failed to cancel notification';
      Toast.show(msg); return rejectWithValue(msg);
    }
  }
);

export const getUnreadCount = createAsyncThunk(
  'notifications/getUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authFetch(`${BASE_URL}/notifications/unread-count`, { method: 'GET' });
      const data = await parseSafeJSON(res);
      if (res.ok) return typeof data === 'number' ? data : (data.count ?? data.unreadCount ?? 0);
      return 0;
    } catch (err) { console.error('getUnreadCount error:', err); return 0; }
  }
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const unread = (state.notifications?.notifications || []).filter(n => n.read_at === null);
      if (unread.length === 0) { Toast.show('No unread notifications'); return true; }
      const res = await authFetch(`${BASE_URL}/notifications/mark-all-read`, { method: 'POST' });
      const data = await parseSafeJSON(res);
      if (res.ok) { Toast.show('All notifications marked as read'); return true; }
      const msg = data?.message || data?.error || `HTTP ${res.status}`;
      Toast.show(msg); return rejectWithValue(msg);
    } catch (err) {
      const msg = err.message || 'Failed to mark all notifications as read';
      Toast.show(msg); return rejectWithValue(msg);
    }
  }
);

export const updateNotification = createAsyncThunk(
  'notifications/update',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      if (!id) return rejectWithValue('Notification ID is required.');
      const res = await authFetch(`${BASE_URL}/notifications/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
      const data = await parseSafeJSON(res);
      if (res.ok) return data;
      return rejectWithValue(data?.message || `HTTP ${res.status}`);
    } catch (err) { return rejectWithValue(err.message || 'Failed to update notification'); }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async ({ id }, { rejectWithValue }) => {
    try {
      if (!id) return rejectWithValue('Notification ID is required.');
      const res = await authFetch(`${BASE_URL}/notifications/${id}`, { method: 'DELETE' });
      if (res.ok) return { id };
      const data = await parseSafeJSON(res);
      return rejectWithValue(data?.message || `HTTP ${res.status}`);
    } catch (err) { return rejectWithValue(err.message || 'Failed to delete notification'); }
  }
);
