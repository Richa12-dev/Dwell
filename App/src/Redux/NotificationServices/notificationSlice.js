// Redux/NotificationServices/notificationSlice.js
import { createSlice } from '@reduxjs/toolkit';
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  cancelNotification,
  getUnreadCount,
  markAllAsRead,
  updateNotification,
  deleteNotification,
} from './services';

// ─── Initial state ────────────────────────────────────────────────────────────
const initialState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  refreshing: false,
  error: null,
  filter: 'all', // 'all' | 'pending' | 'delivered'
  lastFetch: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
    addLocalNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read_at) {
        state.unreadCount += 1;
      }
    },
    updateNotificationLocally: (state, action) => {
      const index = state.notifications.findIndex(
        (n) => n.notification_id === action.payload.notification_id
      );
      if (index !== -1) {
        state.notifications[index] = {
          ...state.notifications[index],
          ...action.payload,
        };
      }
    },
    removeNotificationLocally: (state, action) => {
      const index = state.notifications.findIndex(
        (n) => n.notification_id === action.payload
      );
      if (index !== -1) {
        if (!state.notifications[index].read_at) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },
  },

  extraReducers: (builder) => {
    builder

      // ── getNotifications ──────────────────────────────────────────────────
      .addCase(getNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n) => n.read_at === null).length;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(getNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── createNotification ────────────────────────────────────────────────
      .addCase(createNotification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNotification.fulfilled, (state, action) => {
        state.loading = false;
        // Add the newly created notification to the top of the list
        const newNotification = action.payload?.notification || action.payload;
        if (newNotification?.notification_id) {
          state.notifications.unshift(newNotification);
          if (!newNotification.read_at) {
            state.unreadCount += 1;
          }
        }
      })
      .addCase(createNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── markNotificationAsRead ────────────────────────────────────────────
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(
          (n) => n.notification_id === action.payload.notificationId
        );
        if (index !== -1 && !state.notifications[index].read_at) {
          state.notifications[index].read_at = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markNotificationAsRead.rejected, (state, action) => {
        console.error('Failed to mark as read:', action.payload);
      })

      // ── cancelNotification ────────────────────────────────────────────────
      .addCase(cancelNotification.pending, (state) => {
        state.loading = true;
      })
      .addCase(cancelNotification.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.notifications.findIndex(
          (n) => n.notification_id === action.payload.notificationId
        );
        if (index !== -1) {
          state.notifications[index].status = 'CANCELLED';
        }
      })
      .addCase(cancelNotification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── getUnreadCount ────────────────────────────────────────────────────
      .addCase(getUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })

      // ── markAllAsRead ─────────────────────────────────────────────────────
      .addCase(markAllAsRead.pending, (state) => {
        state.loading = true;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.loading = false;
        state.notifications = state.notifications.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        }));
        state.unreadCount = 0;
      })
      .addCase(markAllAsRead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── updateNotification ────────────────────────────────────────────────
      .addCase(updateNotification.fulfilled, (state, action) => {
        const updated = action.payload;
        if (!updated?.notification_id) return;
        const index = state.notifications.findIndex(
          (n) => n.notification_id === updated.notification_id
        );
        if (index !== -1) {
          state.notifications[index] = { ...state.notifications[index], ...updated };
        }
      })

      // ── deleteNotification ────────────────────────────────────────────────
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const { id } = action.payload;
        const index = state.notifications.findIndex((n) => n.notification_id === id);
        if (index !== -1) {
          if (!state.notifications[index].read_at) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.notifications.splice(index, 1);
        }
      });
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────
export const {
  setFilter,
  clearError,
  clearNotifications,
  addLocalNotification,
  updateNotificationLocally,
  removeNotificationLocally,
} = notificationSlice.actions;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const notificationSelectors = {
  selectAllNotifications: (state) => state.notifications.notifications,
  selectUnreadNotifications: (state) =>
    state.notifications.notifications.filter((n) => n.read_at === null),
  selectReadNotifications: (state) =>
    state.notifications.notifications.filter((n) => n.read_at !== null),
  selectUnreadCount: (state) => state.notifications.unreadCount,
  selectLoading: (state) => state.notifications.loading,
  selectRefreshing: (state) => state.notifications.refreshing,
  selectError: (state) => state.notifications.error,
  selectFilter: (state) => state.notifications.filter,
  selectLastFetch: (state) => state.notifications.lastFetch,
  selectNotificationById: (state, id) =>
    state.notifications.notifications.find((n) => n.notification_id === id),
};

// ─── Re-export thunks for component use ──────────────────────────────────────
export {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  cancelNotification,
  getUnreadCount,
  markAllAsRead,
  updateNotification,
  deleteNotification,
};

export default notificationSlice.reducer;
