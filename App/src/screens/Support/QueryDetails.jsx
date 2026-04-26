import moment from "moment";
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View, StyleSheet, Text, TouchableOpacity, Modal,
  TouchableWithoutFeedback, KeyboardAvoidingView, Platform,
  ScrollView, Image, ActivityIndicator,
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
// import { Player } from '@react-native-community/audio-toolkit';  // VOICE COMMENTED OUT
import { useDispatch, useSelector } from "react-redux";
import { getMaintenanceDetails } from "../../Redux/Maintenance/services";
import { maintenanceSelectors } from "../../Redux/Maintenance/maintenanceSlice";

// ✅ useSignedMediaUrls — designed for maintenance tickets (photos + voice)
import useSignedMediaUrls from '../../commonFunction/useSignedMediaUrls';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function QueryDetails({ route, navigation }) {
  const dispatch = useDispatch();

  const ticket_id =
    route?.params?.ticket_id ||
    route?.params?.ticketId  ||
    route?.params?.id        ||
    route?.params?.data?.ticket_id ||
    route?.params?.data?.id;

  const loginData = useSelector(state => state.loginData || state.login);
  const token = loginData?.accessToken || loginData?.token || null;

  const { currentRequest, detailsLoading, error } = useSelector(
    maintenanceSelectors.getMaintenanceData
  );

  const [el2ModalVisible,       setEl2ModalVisible]       = useState(false);
  const [el2ModalMessage,       setEl2ModalMessage]        = useState("");
  const [escalateButtonEnabled, setEscalateButtonEnabled]  = useState(true);
  const [imageErrors,           setImageErrors]            = useState({});
  // const [isPlaying,             setIsPlaying]              = useState(false);  // VOICE COMMENTED OUT
  // const playerRef = useRef(null);  // VOICE COMMENTED OUT

  // Fetch ticket on mount
  useEffect(() => {
    if (ticket_id && token) {
      console.log('🔍 Fetching ticket details for:', ticket_id);
      dispatch(getMaintenanceDetails({ ticket_id, token }));
    }
  }, [ticket_id, token, dispatch]);

  // ── Extract data ────────────────────────────────────────────────────────────
  const data = currentRequest || {};

  const ticketId       = data?.id || data?.ticket_id || ticket_id || 'N/A';
  const title          = data?.title       || 'Untitled Request';
  const description    = data?.description || 'No description';
  const category       = data?.category    || 'Not specified';
  const priority       = data?.urgency     || data?.priority || 'Medium';
  const location       = data?.location    || 'Not specified';
  const status         = data?.status      || 'Unknown';
  const createdAt      = data?.createdAt   || data?.created_at || new Date().toISOString();
  const scheduledDate  = data?.scheduledDate;

  // ✅ Flatten mediaFiles — backend sometimes returns [[{url}]] instead of [{url}]
  const rawMediaFiles = useMemo(() =>
    (data?.mediaFiles || []).flat(Infinity).filter(
      item => item && (typeof item === 'string' || (typeof item === 'object' && item?.url))
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(data?.mediaFiles)]
  );
  // ── Resolve signed URLs via /api/s3/download-url ────────────────────────────
  // useSignedMediaUrls returns { photoUrls, voiceUrl, loading }
  const { photoUrls: resolvedPhotoUrls, loading: mediaLoading } = useSignedMediaUrls(rawMediaFiles, token);

  // Persist the last known non-empty resolved photo URLs in local state.
  // This prevents images from disappearing if the hook temporarily resets
  // (e.g. when getMaintenanceDetails overwrites currentRequest without mediaFiles).
  const [photoUrls, setPhotoUrls] = useState([]);
  useEffect(() => {
    if (resolvedPhotoUrls.length > 0) {
      setPhotoUrls(resolvedPhotoUrls);
    }
  }, [resolvedPhotoUrls]);

  /* ── VOICE PLAYBACK COMMENTED OUT ──
  const playVoice = () => {
    if (!voiceUrl) { Toast.show("Voice note not available"); return; }

    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      playerRef.current.destroy();
      playerRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    console.log('🎵 Playing voice from:', voiceUrl.substring(0, 80));

    playerRef.current = new Player(voiceUrl, { autoDestroy: false }).prepare((err) => {
      if (err) {
        console.log('❌ Error preparing player:', err);
        Toast.show("Unable to load voice note");
        setIsPlaying(false);
        return;
      }
      playerRef.current.play((err) => {
        if (err) Toast.show("Playback failed");
        setIsPlaying(false);
        playerRef.current?.destroy();
        playerRef.current = null;
      });
    });
  };

  useEffect(() => {
    return () => { playerRef.current?.destroy(); playerRef.current = null; };
  }, []);
  ── END VOICE PLAYBACK ── */

  const handleImageError = (index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  // ── Status helpers ──────────────────────────────────────────────────────────
  const getStatusStyle = () => {
    switch (status?.toLowerCase()) {
      case "open":
      case "in_progress":
      case "in progress": return { backgroundColor: "#D1FAE5", color: "#047857" };
      case "closed":
      case "completed":   return { backgroundColor: "#F3F4F6", color: "#6B7280" };
      case "pending":     return { backgroundColor: "#FEF3C7", color: "#B45309" };
      default:            return { backgroundColor: "#F3F4F6", color: "#6B7280" };
    }
  };

  const formatDate = (d) => d ? moment(d).format("DD MMM, YYYY") : "N/A";
  const formatTime = (d) => d ? moment(d).format("hh:mm A") : "";

  const statusStyle = getStatusStyle();

  // ── Loading state ───────────────────────────────────────────────────────────
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

  if (error && !currentRequest) {
    return (
      <Container>
        <View style={styles.centeredContent}>
          <Icon name="alert-circle-outline" size={80} color="#DC2626" />
          <Text style={styles.noRecordText}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  if (!ticketId || ticketId === 'N/A') {
    return (
      <Container>
        <View style={styles.centeredContent}>
          <Icon name="alert-circle-outline" size={80} color="#DC2626" />
          <Text style={styles.noRecordText}>Request not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
              <View style={[styles.statusTag, { backgroundColor: statusStyle.backgroundColor }]}>
                <Text style={[styles.statusText, { color: statusStyle.color }]}>{status}</Text>
              </View>
            </View>

            <View style={styles.levelDateRow}>
              <View style={styles.levelTag}>
                <Text style={styles.levelText}>Level 1</Text>
              </View>
              <Text style={styles.dateText}>Created: {formatDate(createdAt)}</Text>
            </View>

            {/* Details */}
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
              {scheduledDate && (
                <>
                  <Text style={[styles.label, { marginTop: 12 }]}>Preferred Schedule</Text>
                  <View style={styles.scheduleRow}>
                    <AppIcon name={icons.calender} height={hp(2)} width={hp(2)} color={Colors.placeholder} />
                    <Text style={styles.scheduleText}>
                      {formatDate(scheduledDate)} • {formatTime(scheduledDate)}
                    </Text>
                  </View>
                </>
              )}

              {/* ════════════════════════════════════════════════
                  ATTACHMENTS SECTION
                  Reads from ticket.mediaFiles (Node.js backend)
                  Signed via /api/s3/download-url before rendering
                  ════════════════════════════════════════════════ */}
              {mediaLoading && rawMediaFiles.length > 0 ? (
                <View style={{ marginTop: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#DC2626" />
                  <Text style={{ fontSize: wp(3), color: '#9CA3AF', marginTop: 6 }}>
                    Loading attachments...
                  </Text>
                </View>
              ) : (photoUrls.length > 0) ? (
                <>
                  <Text style={[styles.label, { marginTop: 16 }]}>Attachments</Text>

                  {/* Photos */}
                  {photoUrls.length > 0 && (
                    <View style={styles.photosContainer}>
                      {photoUrls.map((photoUrl, index) => (
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
                              onError={() => handleImageError(index)}
                              onLoad={() => console.log('✅ Image loaded idx', index)}
                            />
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* ── VOICE NOTE UI COMMENTED OUT ──
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
                  ── END VOICE NOTE UI ── */}
                </>
              ) : null}
            </View>
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
                  onPress={() => { setEl2ModalVisible(false); navigation.goBack(); }}
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
  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: wp(5), marginTop: hp(1), marginBottom: hp(2) },
  headerTitle:  { fontSize: wp(4.5), fontWeight: "700", color: "#111827", marginLeft: wp(2) },
  card:         { backgroundColor: "#fff", marginHorizontal: wp(5), borderRadius: 16, padding: wp(4.5), shadowColor: "#E53935", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4, marginBottom: hp(2) },
  cardTopRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reqId:        { fontSize: wp(2.5), fontWeight: "700", color: "#111827" },
  statusTag:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText:   { fontSize: wp(3.2), fontWeight: "600" },
  levelDateRow: { flexDirection: "row", alignItems: "center", marginTop: hp(1), justifyContent: "space-between" },
  levelTag:     { backgroundColor: "#E9EBFF", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  levelText:    { fontSize: wp(3.2), color: "#1D4ED8", fontWeight: "600" },
  dateText:     { fontSize: wp(3.2), color: "#6B7280" },
  infoBlock:    { marginTop: hp(2) },
  label:        { fontSize: wp(3), color: "#9CA3AF", fontWeight: "500" },
  value:        { fontSize: wp(3.5), color: "#111827", marginTop: 2, lineHeight: 20 },
  scheduleRow:  { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  scheduleText: { fontSize: wp(3.5), color: "#111827" },

  // Photos
  photosContainer:    { flexDirection: "row", flexWrap: "wrap", marginTop: 8, gap: 8, marginBottom: 12 },
  photoWrapper:       { width: wp(20), height: wp(20), borderRadius: 8, overflow: "hidden", backgroundColor: "#F3F4F6" },
  photoThumbnail:     { width: "100%", height: "100%" },
  imageErrorContainer:{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" },
  imageErrorText:     { fontSize: wp(2.5), color: "#9CA3AF", marginTop: 4 },

  // Voice
  voicePreviewCard: { borderRadius: 12, padding: wp(4), marginTop: 6, borderWidth: 1, borderColor: "#FCA5A5", shadowColor: "#DC2626", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  voiceRow:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap" },
  voicePreviewInfo:  { flex: 1, marginLeft: wp(2) },
  voicePreviewTitle: { fontSize: wp(4), fontWeight: "700", color: "#DC2626", marginBottom: 2 },
  voicePreviewSubtitle: { fontSize: wp(3.2), color: "#991B1B", fontWeight: "500" },
  voicePlayButton:   { padding: 4 },

  // Modals / states
  modalOverlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" },
  modalBox:      { backgroundColor: "#FFF", borderRadius: 18, padding: 25, alignItems: "center", width: wp(80) },
  modalTitle:    { fontSize: wp(5), fontWeight: "700", marginTop: 10 },
  modalText:     { textAlign: "center", color: "#6B7280", fontSize: wp(3.6), marginVertical: 10 },
  modalButton:   { backgroundColor: "#E53935", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 30 },
  modalButtonText:{ color: "#FFF", fontWeight: "600" },
  centeredContent:{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: wp(10) },
  noRecordText:  { marginTop: 10, color: "#6B7280", fontSize: wp(4), textAlign: "center" },
  loadingText:   { marginTop: 16, color: "#6B7280", fontSize: wp(3.5), textAlign: "center" },
  backButton:    { marginTop: 20, backgroundColor: "#E53935", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  backButtonText:{ color: "#FFF", fontSize: wp(4), fontWeight: "600" },
});
