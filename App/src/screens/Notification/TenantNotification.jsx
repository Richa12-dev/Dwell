import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Modal from "react-native-modal";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-simple-toast";
import { Colors } from "../../Theme";
import { getFontFamily } from "../../utils";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import Container from "../../components/Container/Container";
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  notificationSelectors,
} from "../../Redux/NotificationServices/notificationSlice";
import { loginDataSelectors } from "../../Redux/Login/loginSlice";
import DateTimePicker from '@react-native-community/datetimepicker';

const TenantNotification = ({ navigation }) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const notifications = useSelector(notificationSelectors.selectAllNotifications);
  const loading = useSelector(notificationSelectors.selectLoading);
  const error = useSelector(notificationSelectors.selectError);
  const accessToken = useSelector(loginDataSelectors.getAccessToken);
  
  // Local state
  const [modalVisible, setModalVisible] = useState(false);
  const [subject, setSubject] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch notifications on mount
  useEffect(() => {
    if (accessToken) {
      dispatch(getNotifications({ filter: 'all', limit: 100 }));
    }
  }, [dispatch, accessToken]);

  // Handle pull-to-refresh
  const onRefresh = async () => {
    if (accessToken) {
      setRefreshing(true);
      try {
        await dispatch(getNotifications({ filter: 'all', limit: 100 })).unwrap();
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setRefreshing(false);
      }
    }
  };

  // Handle date selection
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      setSelectedDate(selectedDate);
      // Format date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setDate(formattedDate);
    }
  };

  // Handle adding new notification
  const handleAddNotification = async () => {
    // Trim whitespace from inputs
    const trimmedSubject = subject.trim();
    const trimmedDescription = description.trim();
    const trimmedDate = date.trim();

    if (!trimmedSubject || !trimmedDescription) {
      Toast.show('Please fill in all required fields');
      return;
    }

    console.log('📤 Attempting to create notification...');
    console.log('Subject:', trimmedSubject);
    console.log('Description:', trimmedDescription);
    console.log('Date:', trimmedDate);
    console.log('Access Token exists:', !!accessToken);

    const notificationData = {
      subject: trimmedSubject,
      description: trimmedDescription,
      recipients: { mode: 'AUTO' },
    };

    // Add scheduled_for if date is provided
    if (trimmedDate) {
      try {
        // Parse YYYY-MM-DD format and set to a specific time
        const [year, month, day] = trimmedDate.split('-');
        
        if (year && month && day) {
          // Create date at noon UTC to avoid timezone issues
          const scheduledDate = new Date(Date.UTC(
            parseInt(year),
            parseInt(month) - 1, // Month is 0-indexed
            parseInt(day),
            12, // noon
            0,
            0
          ));

          if (!isNaN(scheduledDate.getTime())) {
            notificationData.scheduled_for = scheduledDate.toISOString();
            console.log('✅ Scheduled for:', notificationData.scheduled_for);
          } else {
            console.warn('⚠️ Invalid date, using immediate delivery');
            Toast.show('Invalid date format. Notification will be sent immediately.');
          }
        } else {
          console.warn('⚠️ Invalid date format, using immediate delivery');
          Toast.show('Invalid date format. Use YYYY-MM-DD. Sending immediately.');
        }
      } catch (err) {
        console.error('❌ Date parsing error:', err);
        Toast.show('Invalid date format. Notification will be sent immediately.');
      }
    }

    try {
      console.log('🔄 Dispatching createNotification with data:', JSON.stringify(notificationData, null, 2));
      const result = await dispatch(createNotification(notificationData)).unwrap();
      console.log('✅ Notification created successfully:', result);
      
      // Clear form
      setSubject("");
      setDate("");
      setDescription("");
      setModalVisible(false);
      
      // Refresh notifications list
      console.log('🔄 Refreshing notifications list...');
      await dispatch(getNotifications({ filter: 'all', limit: 100 })).unwrap();
      console.log('✅ Notifications refreshed');
    } catch (err) {
      console.error('❌ ============ ERROR CAUGHT IN COMPONENT ============');
      console.error('❌ Full error object:', err);
      console.error('❌ Error type:', typeof err);
      console.error('❌ Error constructor:', err?.constructor?.name);
      console.error('❌ Error message:', err?.message);
      console.error('❌ Error string value:', String(err));
      console.error('❌ Error keys:', Object.keys(err || {}));
      console.error('❌ Error JSON:', JSON.stringify(err, null, 2));
      console.error('❌ ================================================');
      
      // Error is already shown by the service via Toast
      // Only show additional message if needed
      if (!err || (typeof err !== 'string' && !err.message)) {
        Toast.show('Failed to create notification. Please try again.');
      }
    }
  };

  // Handle notification press (mark as read)
  const handleNotificationPress = (notification) => {
    if (!notification.read_at) {
      dispatch(markNotificationAsRead({
        notificationId: notification.notification_id,
        scheduledForUtc: notification.scheduled_for_utc,
      }));
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Now';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        !item.read_at && styles.unreadNotification,
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <AppIcon name={icons.dLogo} size={22} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.subject}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {item.description}
        </Text>
        {item.status && (
          <Text style={styles.statusText}>Status: {item.status}</Text>
        )}
      </View>
      <View style={styles.timeContainer}>
        <Text style={styles.time}>
          {formatTime(item.scheduled_for_utc || item.created_at)}
        </Text>
        {!item.read_at && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No notifications yet</Text>
      <Text style={styles.emptySubtext}>
        Create a new notification to get started
      </Text>
    </View>
  );

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.red} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Container scroll={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AppIcon name={icons.arrowBack} size={22} />
          </TouchableOpacity>
          <Text style={styles.pageHeaderTitle}>Notifications</Text>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Notification List */}
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

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Create Notification Modal */}
      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        style={{ margin: 0, justifyContent: "flex-end" }}
      >
        <View style={styles.modalContainer}>
          {/* Unified Header */}
          <View style={styles.modalHeaderContainer}>
            <Text style={styles.modalHeaderTitle}>Create Notification</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <AppIcon name={icons.close} height={hp(2.3)} width={hp(2.3)} />
            </TouchableOpacity>
          </View>

          {/* Subject */}
          <Text style={styles.label}>Subject*</Text>
          <TextInput
            placeholder="Enter Notification Subject"
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
          />

          {/* Date */}
          <Text style={styles.label}>Date (Optional)</Text>
         <View style={styles.dateInputContainer}>
  <TextInput
    placeholder="YYYY-MM-DD (tap calendar to select)"
    style={styles.dateInput}
    value={date}
    editable={false}
  />
  <TouchableOpacity
    onPress={() => setShowDatePicker(true)}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    style={styles.calendarIconButton}
  >
    <AppIcon
      name={icons.calender}
      height={hp(2.5)}
      width={hp(2.5)}
      color={Colors.red}
    />
  </TouchableOpacity>
</View>

          {/* Date Picker */}
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
              onPress={() => {
                setSubject("");
                setDate("");
                setDescription("");
              }}
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
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: hp(2),
    marginBottom: hp(2),
    marginHorizontal: wp(5),
  },
  pageHeaderTitle: {
    fontSize: wp(5),
    fontFamily: getFontFamily("bold"),
    color: "#000",
  },
  listContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(12),
    flexGrow: 1,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  unreadNotification: {
    backgroundColor: "rgba(252, 234, 234, 0.5)",
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
  timeContainer: {
    alignItems: "flex-end",
  },
  time: {
    fontSize: wp(3),
    color: "#888"
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.red,
    marginTop: 4,
  },

  // Loading & Empty states
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
  },

  // Error
  errorContainer: {
    backgroundColor: "#fee",
    padding: wp(3),
    marginHorizontal: wp(5),
    marginBottom: hp(2),
    borderRadius: 8,
  },
  errorText: {
    color: "#c00",
    fontSize: wp(3.5),
  },

  // Floating Button
  fab: {
    position: "absolute",
    bottom: hp(5),
    right: wp(5),
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    backgroundColor: Colors.red,
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
  disabledButton: {
    opacity: 0.6,
  },
});

export default TenantNotification;
