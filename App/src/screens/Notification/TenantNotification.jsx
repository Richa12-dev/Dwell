// screens/TenantNotification/TenantNotification.jsx
import React, { useState, useEffect,  useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
    KeyboardAvoidingView,
} from "react-native";
import Modal from "react-native-modal";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-simple-toast";
import DateTimePicker from "@react-native-community/datetimepicker";

import { Colors } from "../../Theme";
import { getFontFamily } from "../../utils";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import Container from "../../components/Container/Container";
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllAsRead,
  notificationSelectors,
} from "../../Redux/NotificationServices/notificationSlice";
import { loginDataSelectors } from "../../Redux/Login/loginSlice";
import { getScreenFromNotification } from '../../utils/notificationHelper';
import { useFocusEffect } from '@react-navigation/native';

// ─── Component ────────────────────────────────────────────────────────────────
const TenantNotification = ({ navigation }) => {
  const dispatch = useDispatch();

  // ── Redux state ──────────────────────────────────────────────────────────
  const notifications = useSelector(notificationSelectors.selectAllNotifications);
  const unreadCount   = useSelector(notificationSelectors.selectUnreadCount);
  const loading       = useSelector(notificationSelectors.selectLoading);
  const error         = useSelector(notificationSelectors.selectError);
  const accessToken   = useSelector(loginDataSelectors.getAccessToken);
  const userData = useSelector((state) => state.loginData?.userData);
const role = userData?.landlordId
  ? 'landlord'
  : userData?.contractorId
  ? 'contractor'
  : 'tenant';

  // ── Local state ──────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible]   = useState(false);
  const [subject, setSubject]             = useState("");
  const [date, setDate]                   = useState("");
  const [description, setDescription]     = useState("");
  const [refreshing, setRefreshing]       = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate]   = useState(new Date());

  // ── Fetch on mount ───────────────────────────────────────────────────────
const lastFetch = useSelector(notificationSelectors.selectLastFetch);

useFocusEffect(
  useCallback(() => {
    if (!accessToken) return;
    const isStale = !lastFetch ||
      (Date.now() - new Date(lastFetch).getTime()) > 30000;
    if (isStale) {
      dispatch(getNotifications({ filter: "all", limit: 100 }));
    }
  }, [dispatch, accessToken, lastFetch])
);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────
  const onRefresh = async () => {
    if (!accessToken) return;
    setRefreshing(true);
    try {
      await dispatch(getNotifications({ filter: "all", limit: 100 })).unwrap();
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // ── Date picker ──────────────────────────────────────────────────────────
  const onDateChange = (event, pickedDate) => {
    setShowDatePicker(false);
    if (!pickedDate) return;

    setSelectedDate(pickedDate);
    const y  = pickedDate.getFullYear();
    const m  = String(pickedDate.getMonth() + 1).padStart(2, "0");
    const d  = String(pickedDate.getDate()).padStart(2, "0");
    setDate(`${y}-${m}-${d}`);
  };

  // ── Reset modal form ─────────────────────────────────────────────────────
  const resetForm = () => {
    setSubject("");
    setDate("");
    setDescription("");
  };

  // ── Create notification ──────────────────────────────────────────────────
  const handleAddNotification = async () => {
    const trimmedSubject     = subject.trim();
    const trimmedDescription = description.trim();
    const trimmedDate        = date.trim();

    if (!trimmedSubject || !trimmedDescription) {
      Toast.show("Please fill in all required fields");
      return;
    }

    // Build payload
    const notificationData = {
      subject:     trimmedSubject,
      description: trimmedDescription,
      recipients:  { mode: "AUTO" },
    };

    // Parse & attach optional scheduled_for (ISO string)
    if (trimmedDate) {
      const [year, month, day] = trimmedDate.split("-");
      if (year && month && day) {
        const scheduledDate = new Date(
          Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0)
        );
        if (!isNaN(scheduledDate.getTime())) {
          notificationData.scheduled_for = scheduledDate.toISOString();
        } else {
          Toast.show("Invalid date — notification will be sent immediately.");
        }
      }
    }

    try {
      await dispatch(createNotification(notificationData)).unwrap();
      resetForm();
      setModalVisible(false);
      // Refresh list after creation
      await dispatch(getNotifications({ filter: "all", limit: 100 })).unwrap();
    } catch (err) {
      // Toast is already shown by the thunk; only show fallback if nothing came through
      if (!err || (typeof err !== "string" && !err.message)) {
        Toast.show("Failed to create notification. Please try again.");
      }
    }
  };

  // ── Mark single notification as read ─────────────────────────────────────
const handleNotificationPress = (notification) => {
  const notifId = notification.notification_id || notification.id;

  // Mark as read
  if (!notification.read_at && notifId) {
    dispatch(markNotificationAsRead({ notificationId: notifId }));
  }

  // Build data object — handles both local and API notification shapes
  const data = {
    ...(notification.data || {}),
    type:  notification.type  || notification.data?.type,
    title: notification.title || notification.subject || '',
    propertyId:    notification.data?.propertyId,
    maintenanceId: notification.data?.maintenanceId,
    screen:        notification.data?.screen,
  };

  // Use shared mapper — same logic as App.jsx banner tap
  const { screen, params } = getScreenFromNotification(data, role);
  if (screen && screen !== 'TenantNotification') {
    navigation.navigate(screen, params);
  }
};

  // ── Mark all as read ─────────────────────────────────────────────────────
  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    dispatch(markAllAsRead());
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (timestamp) => {
    if (!timestamp) return "Now";
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour:   "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderNotification = ({ item }) => (
  <TouchableOpacity
    style={[styles.notificationCard, !item.read_at && styles.unreadNotification]}
    onPress={() => handleNotificationPress(item)}
    activeOpacity={0.7}
  >
    <View style={styles.iconContainer}>
      <AppIcon name={icons.dLogo} size={22} />
    </View>

    <View style={styles.textContainer}>
      {/* ── use title (normalized from subject or title) ── */}
      <Text style={styles.title}>{item.title || item.subject}</Text>

      {/* ── use description (normalized from message or description) ── */}
      <Text style={styles.message} numberOfLines={2}>
        {item.description || item.message}
      </Text>

      {item.status && (
        <Text style={styles.statusText}>Status: {item.status}</Text>
      )}
    </View>

    <View style={styles.timeContainer}>
      <Text style={styles.time}>
        {formatTime(item.scheduled_for_utc || item.created_at || item.createdAt)}
      </Text>
      {!item.read_at && <View style={styles.unreadDot} />}
    </View>
  </TouchableOpacity>
);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No notifications yet</Text>
      <Text style={styles.emptySubtext}>
        Tap the + button to create your first notification
      </Text>
    </View>
  );

  // ── Full-screen loading (first load only) ─────────────────────────────────
  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.red} />
        <Text style={styles.loadingText}>Loading notifications…</Text>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
          <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
    <View style={{ flex: 1 }}>
      <Container scroll={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AppIcon name={icons.arrowBack} size={22} />
          </TouchableOpacity>
          <Text style={styles.pageHeaderTitle}>Notifications</Text>

          {/* Mark all read button — visible only when there are unread items */}
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Error banner */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Notification list */}
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.notification_id || item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.red]}
              tintColor={Colors.red}
            />
          }
        />
      </Container>

      {/* Floating add button */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create notification modal */}
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeaderContainer}>
            <Text style={styles.modalHeaderTitle}>New Notification</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <AppIcon name={icons.close} size={22} />
            </TouchableOpacity>
          </View>

          {/* Subject */}
          <Text style={styles.label}>Subject*</Text>
          <TextInput
            placeholder="Enter notification subject"
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
          />

          {/* Schedule date (optional) */}
          <Text style={styles.label}>Schedule Date (optional)</Text>
          <TouchableOpacity
            style={styles.dateInputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <TextInput
              placeholder="YYYY-MM-DD"
              style={styles.dateInput}
              value={date}
              onChangeText={setDate}
              editable={false}
              pointerEvents="none"
            />
            <AppIcon name={icons.calendar} size={18} />
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* Description */}
          <Text style={styles.label}>Description*</Text>
          <TextInput
            placeholder="Enter notification description"
            multiline
            numberOfLines={4}
            style={[styles.input, { height: hp(12), textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
          />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: "#E0E0E0" }]}
              onPress={resetForm}
            >
              <Text style={[styles.buttonText, { color: "#000" }]}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: Colors.red },
                loading && styles.disabledButton,
              ]}
              onPress={handleAddNotification}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.buttonText, { color: "#fff" }]}>
                  Add Notification
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: hp(2),
    marginBottom: hp(2),
    marginHorizontal: wp(5),
  },
  pageHeaderTitle: {
    flex: 1,
    fontSize: wp(5),
    fontFamily: getFontFamily("bold"),
    color: "#000",
  },
  markAllBtn: {
    paddingHorizontal: wp(2),
  },
  markAllText: {
    fontSize: wp(3.4),
    color: Colors.red,
    fontFamily: getFontFamily("medium"),
  },

  // List
  listContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
    flexGrow: 1,
  },

  // Notification card
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 12,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  unreadNotification: {
    backgroundColor: "rgba(252,234,234,0.5)",
    borderColor: Colors.red,
    borderWidth: 1.5,
  },
  iconContainer: {
    backgroundColor: "#FCEAEA",
    borderRadius: 8,
    padding: wp(2.2),
    marginRight: wp(3),
  },
  textContainer: { flex: 1 },
  title: {
    fontSize: wp(4),
    fontFamily: getFontFamily("semibold"),
    color: "#000",
  },
  message: {
    fontSize: wp(3.4),
    color: "#666",
    marginTop: 2,
  },
  statusText: {
    fontSize: wp(3),
    color: "#888",
    marginTop: 4,
    fontStyle: "italic",
  },
  timeContainer: { alignItems: "flex-end" },
  time: { fontSize: wp(3), color: "#888" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
    marginTop: 4,
  },

  // Loading & empty states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: wp(4),
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: hp(10),
  },
  emptyText: {
    fontSize: wp(4.5),
    fontFamily: getFontFamily("semibold"),
    color: "#000",
  },
  emptySubtext: {
    fontSize: wp(3.5),
    color: "#666",
    marginTop: hp(1),
    textAlign: "center",
  },

  // Error banner
  errorContainer: {
    backgroundColor: "#fee",
    padding: wp(3),
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    borderRadius: 8,
  },
  errorText: { color: "#c00", fontSize: wp(3.5) },

  // FAB
  fab: {
    position: "absolute",
    bottom: hp(5),
    right: wp(5),
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    backgroundColor: Colors.black,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: {
    color: "#fff",
    fontSize: 32,
    lineHeight: 32,
    fontWeight: "300",
  },

  // Modal
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: wp(6),
    paddingTop: hp(3),
    paddingBottom: hp(4),
  },
  modalHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: hp(2),
  },
  modalHeaderTitle: {
    fontSize: hp(2.2),
    fontWeight: "600",
    color: "#000",
  },
  closeButton: {
    padding: hp(0.5),
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    fontSize: wp(3.6),
    fontFamily: getFontFamily("medium"),
    color: "#444",
    marginTop: hp(1),
    marginBottom: hp(0.5),
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: wp(3),
    fontSize: wp(3.6),
    color: "#000",
    backgroundColor: "#FAFAFA",
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: wp(3),
    backgroundColor: "#FAFAFA",
  },
  dateInput: {
    flex: 1,
    fontSize: wp(3.6),
    color: "#000",
    padding: 0,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: hp(3),
    gap: wp(10),
  },
  button: {
    flex: 1,
    height: hp(5),
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: wp(1),
  },
  resetButton: {
    width: wp(25),
    height: hp(5),
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily("semibold"),
  },
  disabledButton: { opacity: 0.6 },
});

export default TenantNotification;
