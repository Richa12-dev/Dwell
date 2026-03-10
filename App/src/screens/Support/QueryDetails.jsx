import moment from "moment";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import { Colors } from "../../Theme";
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";
import Container from "../../components/Container/Container";
import Toast from "react-native-simple-toast";
import { Player } from '@react-native-community/audio-toolkit';
import { useDispatch, useSelector } from "react-redux";
import {
  getMaintenanceDetails,
  escalateMaintenanceRequest
} from "../../Redux/Maintenance/services";
import { maintenanceSelectors } from "../../Redux/Maintenance/maintenanceSlice";

export default function QueryDetails({ route, navigation }) {
  const dispatch = useDispatch();
  
  // ✅ Get ticket_id from route params
  const ticket_id = route?.params?.ticket_id || route?.params?.data?.ticket_id;
  
  // ✅ Get auth token from Redux
  const loginData = useSelector(state => state.loginData || state.login);
  const token = loginData?.idToken || loginData?.accessToken || loginData?.token || null;
  
  // ✅ Get data from Redux store
  const { currentRequest, detailsLoading, error } = useSelector(
    maintenanceSelectors.getMaintenanceData
  );

  const [el2ModalVisible, setEl2ModalVisible] = useState(false);
  const [el2ModalMessage, setEl2ModalMessage] = useState("");
  const [escalateButtonEnabled, setEscalateButtonEnabled] = useState(true);
  const [imageErrors, setImageErrors] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef(null);

  // ✅ S3 bucket configuration
  const S3_PROPERTIES_BUCKET = "https://dp-properties.s3.amazonaws.com";
  const S3_MAINTENANCE_BUCKET = "https://dp-maintenance-attachments.s3.amazonaws.com";

  // ✅ Fetch ticket details on mount
  useEffect(() => {
    if (ticket_id && token) {
      console.log('🔍 Fetching ticket details for:', ticket_id);
      dispatch(getMaintenanceDetails({ ticket_id, token }));
    } else {
      console.error('❌ Missing ticket_id or token:', { ticket_id, hasToken: !!token });
    }
  }, [ticket_id, token, dispatch]);

  // ✅ Helper function to construct full S3 URL
  const getS3Url = (s3Key) => {
    if (!s3Key) return null;
    
    if (s3Key.startsWith('http://') || s3Key.startsWith('https://')) {
      console.log('✅ Already full URL (pre-signed):', s3Key.substring(0, 80) + '...');
      return s3Key;
    }
    
    if (s3Key.startsWith('data:')) {
      console.log('✅ Base64 data URI');
      return s3Key;
    }
    
    if (s3Key.includes("/") && !s3Key.startsWith("http")) {
      const bucket = s3Key.includes('TKT_') ? S3_MAINTENANCE_BUCKET : S3_PROPERTIES_BUCKET;
      const fullUrl = `${bucket}/${s3Key}`;
      console.log('🔧 Converting S3 key to full URL');
      console.log('📁 Bucket:', bucket);
      console.log('🔗 Full URL:', fullUrl);
      return fullUrl;
    }
    
    console.log('⚠️ Treating as URL:', s3Key);
    return s3Key;
  };

  // ✅ Extract data with null safety
  const data = currentRequest || {};
  
  const ticketId = data?.ticket_id || ticket_id || 'N/A';
  const title = data?.title || 'Untitled Request';
  const description = data?.description || 'No description';
  const category = data?.category || 'Not specified';
  const priority = data?.priority || 'Medium';
  const location = data?.location || 'Not specified';
  const status = data?.status || 'Unknown';
  const createdAt = data?.created_at || new Date().toISOString();
  const preferredWindow = data?.preferred_window || null;
  
  const attachments = data?.attachments || { photos: [], voice_note: null };
  const media = data?.media || { photos: [], voice: [] };
  
  // ✅ Get photo URLs
  const getPhotoUrls = () => {
    if (media?.photos && Array.isArray(media.photos) && media.photos.length > 0) {
      console.log('✅ Using media.photos with pre-signed URLs');
      return media.photos.map(photo => {
        if (photo?.url) return photo.url;
        if (typeof photo === 'string') return getS3Url(photo);
        return null;
      }).filter(Boolean);
    }
    
    if (attachments?.photos && Array.isArray(attachments.photos) && attachments.photos.length > 0) {
      console.log('⚠️ Using attachments.photos - converting S3 keys');
      return attachments.photos.map(photo => getS3Url(photo)).filter(Boolean);
    }
    
    return [];
  };
  
  // ✅ Get voice URL
  const getVoiceUrl = () => {
    if (media?.voice && Array.isArray(media.voice) && media.voice.length > 0) {
      console.log('✅ Using media.voice with pre-signed URL');
      const voiceItem = media.voice[0];
      if (voiceItem?.url) return voiceItem.url;
      if (typeof voiceItem === 'string') return getS3Url(voiceItem);
    }
    
    if (attachments?.voice_note) {
      console.log('⚠️ Using attachments.voice_note - converting S3 key');
      return getS3Url(attachments.voice_note);
    }
    
    return null;
  };
  
  const photoUrls = getPhotoUrls();
  const voiceUrl = useMemo(() => getVoiceUrl(), [media, attachments]);

  const getStatusStyle = () => {
    switch (status?.toLowerCase()) {
      case "open":
      case "in progress":
        return { backgroundColor: "#D1FAE5", color: "#047857" };
      case "closed":
      case "completed":
        return { backgroundColor: "#F3F4F6", color: "#6B7280" };
      case "pending":
        return { backgroundColor: "#FEF3C7", color: "#B45309" };
      default:
        return { backgroundColor: "#F3F4F6", color: "#6B7280" };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return moment(dateString).format("DD MMM, YYYY");
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return moment(dateString).format("hh:mm A");
  };

  const statusStyle = getStatusStyle();

  // ✅ Handle escalation using Redux
  const handleEscalate = async () => {
    if (!token) {
      Toast.show('Authentication required');
      return;
    }

    try {
      setEscalateButtonEnabled(false);
      
      await dispatch(escalateMaintenanceRequest({
        ticket_id: ticketId,
        token
      })).unwrap();
      
      setEl2ModalMessage(
        `Request ${ticketId} has been escalated to Level 2 successfully.`
      );
      setEl2ModalVisible(true);
    } catch (error) {
      console.error('❌ Escalation failed:', error);
      Toast.show(error || 'Failed to escalate request');
      setEscalateButtonEnabled(true);
    }
  };

  const handleImageError = (index) => {
    console.error(`Failed to load image at index ${index}`);
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const playVoice = () => {
    if (!voiceUrl) {
      Toast.show("Voice note not available");
      return;
    }

    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      playerRef.current.destroy();
      playerRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    
    console.log('🎵 Playing voice from:', voiceUrl);

    playerRef.current = new Player(voiceUrl, {
      autoDestroy: false,
    }).prepare((err) => {
      if (err) {
        console.log('❌ Error preparing player:', err);
        Toast.show("Unable to load voice note");
        setIsPlaying(false);
        return;
      }

      playerRef.current.play((err) => {
        if (err) {
          console.log('❌ Playback error:', err);
          Toast.show("Playback failed");
        }
        setIsPlaying(false);
        playerRef.current.destroy();
        playerRef.current = null;
      });
    });
  };

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // ✅ Loading state
  if (detailsLoading) {
    return (
      <Container>
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </Container>
    );
  }

  // ✅ Error state
  if (error && !currentRequest) {
    return (
      <Container>
        <View style={styles.centeredContent}>
          <Icon name="alert-circle-outline" size={80} color="#DC2626" />
          <Text style={styles.noRecordText}>{error}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  // ✅ Not found state
  if (!ticketId || ticketId === 'N/A') {
    return (
      <Container>
        <View style={styles.centeredContent}>
          <Icon name="alert-circle-outline" size={80} color="#DC2626" />
          <Text style={styles.noRecordText}>Request not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  return (
    <Container>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <AppIcon name={icons.arrowBack} size={22} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Request Details</Text>
          </View>

          {/* Main Card */}
          <View style={styles.card}>
            <View style={styles.cardTopRow}>
              <Text style={styles.reqId}>{ticketId}</Text>
              <View
                style={[
                  styles.statusTag,
                  { backgroundColor: statusStyle.backgroundColor },
                ]}
              >
                <Text style={[styles.statusText, { color: statusStyle.color }]}>
                  {status}
                </Text>
              </View>
            </View>

            <View style={styles.levelDateRow}>
              <View style={styles.levelTag}>
                <Text style={styles.levelText}>Level 1</Text>
              </View>
              <Text style={styles.dateText}>Created: {formatDate(createdAt)}</Text>
            </View>

            {/* Details Section */}
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Title</Text>
              <Text style={styles.value}>{title}</Text>

              <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
              <Text style={styles.value}>{category}</Text>

              <Text style={[styles.label, { marginTop: 12 }]}>Priority</Text>
              <Text style={styles.value}>{priority}</Text>

              <Text style={[styles.label, { marginTop: 12 }]}>Location</Text>
              <Text style={styles.value}>{location}</Text>

              <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
              <Text style={styles.value}>{description}</Text>

              {/* Preferred Schedule */}
              {preferredWindow?.start_utc && (
                <>
                  <Text style={[styles.label, { marginTop: 12 }]}>Preferred Schedule</Text>
                  <View style={styles.scheduleRow}>
                    <AppIcon
                      name={icons.calender}
                      height={hp(2)}
                      width={hp(2)}
                      color={Colors.placeholder}
                    />
                    <Text style={styles.scheduleText}>
                      {formatDate(preferredWindow.start_utc)} • {formatTime(preferredWindow.start_utc)} - {formatTime(preferredWindow.end_utc)}
                    </Text>
                  </View>
                </>
              )}

              {/* Attachments */}
              {(photoUrls.length > 0 || voiceUrl) && (
                <>
                  <Text style={[styles.label, { marginTop: 16 }]}>Attachments</Text>
                  
                  {/* Photos */}
                  {photoUrls.length > 0 && (
                    <View style={styles.photosContainer}>
                      {photoUrls.map((photoUrl, index) => {
                    
                        return (
                          <View key={index} style={styles.photoWrapper}>
                            {imageErrors[index] ? (
                              <View style={styles.imageErrorContainer}>
                                <Icon name="image-broken-variant" size={30} color="#9CA3AF" />
                                <Text style={styles.imageErrorText}>Failed to load</Text>
                              </View>
                            ) : (
                              <Image
                                source={{ uri: photoUrl }}
                                style={styles.photoThumbnail}
                                resizeMode="cover"
                                onError={(e) => {
                                
                                  handleImageError(index);
                                }}
                                onLoad={() => {
            
                                }}
                                onLoadStart={() => {
                                 
                                }}
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Voice Note Preview */}
                  {voiceUrl && (
                    <View style={styles.voicePreviewCard}>
                      <View style={styles.voiceRow}>
                                         <AppIcon
                      name={icons.voice}
                      height={hp(4)}
                      width={hp(4)}
                      color={Colors.placeholder}
                    />
                        <View style={styles.voicePreviewInfo}>
                          <Text style={styles.voicePreviewTitle}>Voice Note</Text>
                          <Text style={styles.voicePreviewSubtitle}>
                            {isPlaying ? 'Playing...' : 'Tap to play'}
                          </Text>
                        </View>
                     
                      
                      <TouchableOpacity
                        style={styles.voicePlayButton}
                        onPress={playVoice}
                        activeOpacity={0.7}
                      >
                   <AppIcon
  name={isPlaying ? icons.pauseCircle : icons.playCircle}
  height={hp(4)}
  width={hp(4)}
/>


                      </TouchableOpacity>
                    </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
          

          {/* Escalate Button */}
          <View style={styles.bottomButtonWrapper}>
            <TouchableOpacity
              style={[
                styles.escalateButton,
                !escalateButtonEnabled && { opacity: 0.6 },
              ]}
              disabled={!escalateButtonEnabled}
              onPress={handleEscalate}
            >
              <Text style={styles.escalateText}>Escalate to Level 2</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Escalation Modal */}
        <Modal transparent visible={el2ModalVisible} animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setEl2ModalVisible(false)}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Escalated!</Text>
                <Text style={styles.modalText}>{el2ModalMessage}</Text>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => {
                    setEl2ModalVisible(false);
                    navigation.goBack();
                  }}
                >
                  <Text style={styles.modalButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(5),
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  headerTitle: {
    fontSize: wp(4.5),
    fontWeight: "700",
    color: "#111827",
    marginLeft: wp(2),
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: wp(5),
    borderRadius: 16,
    padding: wp(4.5),
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: hp(2),
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reqId: {
    fontSize: wp(2.5),
    fontWeight: "700",
    color: "#111827",
  },
  statusTag: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: wp(3.2),
    fontWeight: "600",
  },
  levelDateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: hp(1),
    justifyContent: "space-between",
  },
  levelTag: {
    backgroundColor: "#E9EBFF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: { fontSize: wp(3.2), color: "#1D4ED8", fontWeight: "600" },
  dateText: { fontSize: wp(3.2), color: "#6B7280" },
  infoBlock: { marginTop: hp(2) },
  label: { fontSize: wp(3), color: "#9CA3AF", fontWeight: "500" },
  value: { fontSize: wp(3.5), color: "#111827", marginTop: 2, lineHeight: 20 },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  scheduleText: {
    fontSize: wp(3.5),
    color: "#111827",
  },
  photosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
    marginBottom: 12,
  },
  voicePreviewCard: {
 
    borderRadius: 12,
    padding: wp(4),
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
 voiceRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "nowrap",
},
  voicePreviewInfo: {
    flex: 1,
  },
  voicePreviewTitle: {
    fontSize: wp(4),
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 2,
  },
  voicePreviewSubtitle: {
    fontSize: wp(3.2),
    color: "#991B1B",
    fontWeight: "500",
  },
 voicePlayButton: {
  padding: 4,
},
  photoWrapper: {
    width: wp(20),
    height: wp(20),
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  photoThumbnail: {
    width: "100%",
    height: "100%",
  },
  imageErrorContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  imageErrorText: {
    fontSize: wp(2.5),
    color: "#9CA3AF",
    marginTop: 4,
  },
  bottomButtonWrapper: {
    marginTop: hp(2),
    marginBottom: hp(3),
    paddingHorizontal: wp(5),
  },
  escalateButton: {
    backgroundColor: "#E53935",
    borderRadius: 10,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  escalateText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: wp(4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
    width: wp(80),
  },
  modalTitle: { fontSize: wp(5), fontWeight: "700", marginTop: 10 },
  modalText: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: wp(3.6),
    marginVertical: 10,
  },
  modalButton: {
    backgroundColor: "#E53935",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  modalButtonText: { color: "#FFF", fontWeight: "600" },
  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: wp(10),
  },
  noRecordText: {
    marginTop: 10,
    color: "#6B7280",
    fontSize: wp(4),
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#6B7280",
    fontSize: wp(3.5),
    textAlign: "center",
  },
  backButton: {
    marginTop: 20,
    backgroundColor: "#E53935",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFF",
    fontSize: wp(4),
    fontWeight: "600",
  },
});
