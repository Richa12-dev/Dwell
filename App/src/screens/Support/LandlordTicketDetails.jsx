import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useSelector, useDispatch } from 'react-redux';
import { TextInput } from 'react-native-paper';
import {
  getMaintenanceDetails,
  updateMaintenanceStatus,
} from '../../Redux/Maintenance/services';
import { maintenanceSelectors } from '../../Redux/Maintenance/maintenanceSlice';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { Dropdown } from 'react-native-element-dropdown';
import Container from "../../components/Container/Container";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../components/Header';
import { icons } from '../../Assets';
import { AppIcon } from '../../components/AppIcon';
import { Player } from '@react-native-community/audio-toolkit';

// ✅ Shared signed-URL hook — same pattern as PropertiesDetails / useSignedImageUrls
import useSignedMediaUrls from '../../commonFunction/useSignedMediaUrls';

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const LandlordTicketDetails = ({ route, navigation }) => {
  const { ticketId, ticket: passedTicket } = route.params;
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);

  const { currentRequest, loading } = useSelector(maintenanceSelectors.getMaintenanceData);
  const loginData = useSelector(s => s.loginData || {});
  const token = loginData?.accessToken || loginData?.idToken;

  const ticket = currentRequest || passedTicket;

  const [responseText,       setResponseText]       = useState('');
  const [showResponseInput,  setShowResponseInput]  = useState(false);
  const [closeModalVisible,  setCloseModalVisible]  = useState(false);
  const [closureNote,        setClosureNote]        = useState('');
  const [selectedPriority,   setSelectedPriority]   = useState(null);
  const [imageErrors,        setImageErrors]        = useState({});
  const [isPlaying,          setIsPlaying]          = useState(false);
  const playerRef = useRef(null);

  const priorityData = [
    { label: 'Emergency', value: 'Emergency' },
    { label: 'High',      value: 'High' },
    { label: 'Medium',    value: 'Medium' },
    { label: 'Low',       value: 'Low' },
  ];

  // Fetch ticket on mount
  useEffect(() => {
    if (ticketId && token) {
      console.log('🔍 Fetching ticket details for:', ticketId);
      dispatch(getMaintenanceDetails({ ticket_id: ticketId }));
    }
  }, [ticketId, token, dispatch]);

  useEffect(() => {
    if (ticket) setSelectedPriority(ticket.priority || 'Medium');
  }, [ticket]);

  // ── Resolve media files (photos + voice) ──────────────────
  // ✅ Node.js backend stores uploaded files in ticket.mediaFiles
  // ✅ Flatten — backend sometimes returns [[{url}]] instead of [{url}]
  const rawMediaFiles = (ticket?.mediaFiles || []).flat(Infinity).filter(
    item => item && (typeof item === 'string' || (typeof item === 'object' && item?.url))
  );
  const { photoUrls, voiceUrl, loading: mediaLoading } = useSignedMediaUrls(rawMediaFiles, token);

  // ── Voice playback ────────────────────────────────────────
  const playVoice = () => {
    if (!voiceUrl) { Alert.alert('Info', 'Voice note not available'); return; }

    if (playerRef.current && isPlaying) {
      playerRef.current.stop();
      playerRef.current.destroy();
      playerRef.current = null;
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    playerRef.current = new Player(voiceUrl, { autoDestroy: false }).prepare((err) => {
      if (err) { Alert.alert('Error', 'Unable to load voice note'); setIsPlaying(false); return; }
      playerRef.current.play((err) => {
        if (err) Alert.alert('Error', 'Playback failed');
        setIsPlaying(false);
        playerRef.current?.destroy();
        playerRef.current = null;
      });
    });
  };

  useEffect(() => {
    return () => { playerRef.current?.destroy(); playerRef.current = null; };
  }, []);

  if (loading && !ticket) {
    return (
      <Container>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading ticket details...</Text>
        </View>
      </Container>
    );
  }

  if (!ticket) {
    return (
      <Container>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={60} color="#FF3B30" />
          <Text style={styles.errorText}>Ticket not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Container>
    );
  }

  // Extract ticket data
  const ticketData = {
    id:          ticket.ticket_id || ticket.id || ticketId,
    title:       ticket.title       || ticket.subject    || 'Untitled',
    description: ticket.description || 'No description provided',
    category:    ticket.category    || ticket.queryType  || 'General',
    priority:    ticket.urgency     || ticket.priority   || 'Medium',
    status:      ticket.status      || 'Open',
    location:    ticket.location    || 'N/A',
tenantName:
  (
    ticket?.contractor_job_snapshot?.tenant?.firstName ||
    ticket?.contractor_job_snapshot?.tenant?.lastName
  )
    ? `${ticket?.contractor_job_snapshot?.tenant?.firstName || ''} ${ticket?.contractor_job_snapshot?.tenant?.lastName || ''}`.trim()
    : (
        ticket?.tenant?.firstName || ticket?.tenant?.lastName
      )
        ? `${ticket?.tenant?.firstName || ''} ${ticket?.tenant?.lastName || ''}`.trim()
        : ticket?.tenant_name || 'Unknown Tenant',    createdAt: ticket.created_at || ticket.createdAt || new Date().toISOString(),
  };

  const handleAddResponse = () => {
    if (responseText.trim()) {
      Alert.alert('Response Added', 'Your response has been recorded.');
      setResponseText('');
      setShowResponseInput(false);
    }
  };

  const handlePriorityChange = (item) => {
    setSelectedPriority(item.value);
    Alert.alert('Info', 'Priority update feature will be implemented soon');
  };

  const handleEscalate = () => {
    Alert.alert('Escalate Ticket', 'Are you sure you want to escalate this ticket to Level 2?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Escalate', onPress: () => Alert.alert('Success', 'Ticket escalated to Level 2') },
    ]);
  };

  const handleCloseTicket = async () => {
    try {
      await dispatch(updateMaintenanceStatus({
        ticket_id: ticketData.id,
        status: 'completed',
      })).unwrap();
      setCloseModalVisible(false);
      setClosureNote('');
      Alert.alert('Success', 'Ticket has been closed successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', error || 'Failed to close ticket');
    }
  };

  const getPriorityColor = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high' || p === 'emergency') return '#FF4757';
    if (p === 'medium') return '#FFA726';
    if (p === 'low')    return '#66BB6A';
    return '#9E9E9E';
  };

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('progress') || s === 'open') return '#10B981';
    if (s === 'pending' || s === 'new')          return '#F59E0B';
    if (s === 'resolved' || s === 'closed' || s === 'completed') return '#6B7280';
    return '#9E9E9E';
  };

  const getInitials = (name) => {
    if (!name || name === 'Unknown Tenant') return 'UT';
    const words = name.trim().split(' ').filter(w => w.length > 0);
    if (words.length === 0) return 'UT';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = ['#EF4444','#F59E0B','#10B981','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#F97316'];
    if (!name) return colors[0];
    const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[sum % colors.length];
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const tenantAvatar = ticket.tenant_avatar || null;
  const tenantName   = ticketData.tenantName;
  const isTicketClosed   = (ticketData.status || '').toLowerCase() === 'closed';
  const isTicketResolved = (ticketData.status || '').toLowerCase() === 'resolved';

  return (
    <Container>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Header title="Ticket Details" onBackPress={() => navigation.goBack()} />

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Tenant Info Card */}
          <View style={styles.tenantCard}>
            <View style={styles.tenantRow}>
              <View style={styles.avatarContainer}>
                {tenantAvatar ? (
                  <Image source={{ uri: tenantAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: getAvatarColor(tenantName) }]}>
                    <Text style={styles.initialsText}>{getInitials(tenantName)}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tenantName}>{ticketData.tenantName}</Text>
                <Text style={styles.ticketId}>ID: {ticketData.id}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticketData.status) }]}>
                <Text style={styles.statusText}>{ticketData.status}</Text>
              </View>
            </View>

            <Text style={styles.issueTitle}>{ticketData.title}</Text>
            <Text style={styles.issueDescription}>{ticketData.description}</Text>

            {/* Location & Category row */}
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
              <Text style={styles.infoText}>📍 {ticketData.location}</Text>
              <Text style={styles.infoText}>🔧 {ticketData.category}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.dateContainer}>
                <AppIcon name={icons.calender} height={hp(2)} width={hp(2)} color={Colors.placeholder} />
                <Text style={styles.infoText}>{formatDate(ticketData.createdAt)}</Text>
              </View>
              <TouchableOpacity
                style={styles.addResponseLink}
                onPress={() => setShowResponseInput(!showResponseInput)}
              >
                <AppIcon name={icons.comment} height={hp(2)} width={hp(2)} color={Colors.placeholder} />
                <Text style={styles.addResponseLinkText}>Add Response</Text>
                <AppIcon name={icons.arrowDown} height={hp(2)} width={hp(2)} color={Colors.placeholder} />
              </TouchableOpacity>
            </View>

            {showResponseInput && (
              <View style={styles.responseSection}>
                <TextInput
                  placeholder="Write your response"
                  mode="outlined"
                  value={responseText}
                  onChangeText={setResponseText}
                  multiline
                  numberOfLines={4}
                  style={styles.textInput}
                  outlineColor="#E5E7EB"
                  activeOutlineColor="#DC2626"
                />
                <View style={styles.responseButtons}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowResponseInput(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={handleAddResponse}>
                    <Text style={styles.submitBtnText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ════════════════════════════════════════════════
              MEDIA SECTION — Images & Voice
              Reads ticket.mediaFiles (Node.js backend field)
              Signed via /api/s3/download-url before rendering
              ════════════════════════════════════════════════ */}
          {(rawMediaFiles.length > 0) && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Attachments</Text>

              {mediaLoading ? (
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <ActivityIndicator size="small" color="#DC2626" />
                  <Text style={styles.infoText}>Loading media...</Text>
                </View>
              ) : (
                <>
                  {/* Photos */}
                  {photoUrls.length > 0 && (
                    <>
                      <Text style={styles.mediaSubLabel}>Photos ({photoUrls.length})</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.photoRow}>
                          {photoUrls.map((uri, idx) => (
                            <View key={idx} style={styles.photoThumb}>
                              {imageErrors[idx] ? (
                                <View style={styles.imageErrorBox}>
                                  <Icon name="image-broken-variant" size={24} color="#9CA3AF" />
                                </View>
                              ) : (
                                <Image
                                  source={{ uri }}
                                  style={styles.photoImage}
                                  resizeMode="cover"
                                  onError={() => setImageErrors(p => ({ ...p, [idx]: true }))}
                                  onLoad={() => console.log('✅ Ticket image loaded idx', idx)}
                                />
                              )}
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </>
                  )}

                  {/* Voice Note */}
                  {voiceUrl && (
                    <>
                      <Text style={[styles.mediaSubLabel, { marginTop: 12 }]}>Voice Note</Text>
                      <TouchableOpacity style={styles.voiceCard} onPress={playVoice} activeOpacity={0.8}>
                        <View style={styles.voiceIconCircle}>
                          <Icon
                            name={isPlaying ? 'pause-circle' : 'play-circle'}
                            size={28}
                            color="#DC2626"
                          />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.voiceTitle}>Voice Note</Text>
                          <Text style={styles.voiceSubtitle}>
                            {isPlaying ? '🔊 Playing...' : 'Tap to play'}
                          </Text>
                        </View>
                        <AppIcon
                          name={isPlaying ? icons.pauseCircle : icons.playCircle}
                          height={hp(4)}
                          width={hp(4)}
                        />
                      </TouchableOpacity>
                    </>
                  )}

                  {photoUrls.length === 0 && !voiceUrl && (
                    <Text style={[styles.infoText, { textAlign: 'center', paddingVertical: 8 }]}>
                      No media attachments
                    </Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* Priority Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Priority Level</Text>
            <Dropdown
              style={styles.dropdown}
              selectedTextStyle={styles.dropdownSelectedText}
              placeholderStyle={styles.dropdownPlaceholder}
              itemTextStyle={styles.dropdownItemText}
              data={priorityData}
              labelField="label"
              valueField="value"
              placeholder="Select Priority"
              value={selectedPriority}
              onChange={handlePriorityChange}
              disable={isTicketClosed}
              renderRightIcon={() => (
                <AppIcon name={icons.arrowDown} height={hp(2)} width={hp(2)} color={Colors.placeholder} />
              )}
            />
          </View>

          {/* Action Buttons */}
          {!isTicketClosed && (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.escalateBtn]}
                onPress={handleEscalate}
                disabled={isTicketResolved}
              >
                <Text style={styles.escalateBtnText}>Escalate Priority</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.closeBtn]}
                onPress={() => setCloseModalVisible(true)}
              >
                <Text style={styles.closeBtnText}>Close Ticket</Text>
              </TouchableOpacity>
            </View>
          )}

          {isTicketClosed && (
            <View style={styles.closedBanner}>
              <Icon name="check-circle" size={20} color="#6B7280" />
              <Text style={styles.closedBannerText}>This ticket is closed</Text>
            </View>
          )}
        </ScrollView>

        {/* Close Ticket Modal */}
        <Modal
          visible={closeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCloseModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Close Ticket</Text>
                <Text style={styles.modalSubtitle}>Please provide a closure note</Text>
              </View>
              <TextInput
                placeholder="Closure Note"
                mode="outlined"
                value={closureNote}
                onChangeText={setClosureNote}
                multiline
                numberOfLines={4}
                style={styles.modalTextInput}
                outlineColor="#E5E7EB"
                activeOutlineColor="#DC2626"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => setCloseModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleCloseTicket}
                >
                  <Text style={styles.modalConfirmText}>Confirm Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Container>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: 10, fontSize: 14, color: '#6B7280', fontFamily: getFontFamily('regular') },
  errorContainer:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText:        { fontSize: 18, fontFamily: getFontFamily('semibold'), color: '#FF3B30', marginTop: 16, marginBottom: 24 },
  backButton:       { backgroundColor: '#DC2626', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  backButtonText:   { color: '#FFFFFF', fontFamily: getFontFamily('semibold'), fontSize: 16 },

  tenantCard: { backgroundColor: Colors.backgroundColor, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tenantRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  avatar:          { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder:{ width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  initialsText:    { fontSize: hp(2.5), fontWeight: '600', fontFamily: getFontFamily('regular'), color: '#fff' },
  tenantName:      { fontSize: 16, fontFamily: getFontFamily('semibold'), color: '#111827' },
  ticketId:        { fontSize: 12, fontFamily: getFontFamily('regular'), color: '#6B7280', marginTop: 2 },
  statusBadge:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText:      { fontSize: 11, fontFamily: getFontFamily('semibold'), color: '#fff', textTransform: 'capitalize' },
  issueTitle:      { fontSize: 14, fontFamily: getFontFamily('bold'), color: '#111827', marginBottom: 8 },
  issueDescription:{ fontSize: 12, fontFamily: getFontFamily('regular'), color: '#4B5563', lineHeight: 20, marginBottom: 12 },
  infoRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  dateContainer:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText:        { fontSize: 12, fontFamily: getFontFamily('regular'), color: '#9CA3AF' },
  addResponseLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: '#F9FAFB', borderRadius: 6 },
  addResponseLinkText: { fontSize: 13, fontFamily: getFontFamily('medium'), color: '#6B7280' },
  responseSection: { marginTop: 12 },
  textInput:       { backgroundColor: '#fff', marginTop: 12, marginBottom: 12 },
  responseButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn:       { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#F3F4F6' },
  cancelBtnText:   { fontSize: 14, fontFamily: getFontFamily('semibold'), color: '#6B7280' },
  submitBtn:       { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#DC2626' },
  submitBtnText:   { fontSize: 14, fontFamily: getFontFamily('semibold'), color: '#fff' },

  // Media card
  card:            { backgroundColor: Colors.backgroundColor, marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel:       { fontSize: 14, fontFamily: getFontFamily('medium'), color: '#374151', marginBottom: 12 },
  mediaSubLabel:   { fontSize: 12, fontFamily: getFontFamily('medium'), color: '#6B7280', marginBottom: 8 },
  photoRow:        { flexDirection: 'row', gap: 8 },
  photoThumb:      { width: wp(22), height: wp(22), borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  photoImage:      { width: '100%', height: '100%' },
  imageErrorBox:   { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  voiceCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FCA5A5' },
  voiceIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  voiceTitle:      { fontSize: 14, fontFamily: getFontFamily('semibold'), color: '#DC2626' },
  voiceSubtitle:   { fontSize: 12, fontFamily: getFontFamily('regular'), color: '#991B1B', marginTop: 2 },

  // Priority dropdown
  dropdown:            { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  dropdownSelectedText:{ fontSize: 14, fontFamily: getFontFamily('medium'), color: '#111827' },
  dropdownPlaceholder: { fontSize: 14, fontFamily: getFontFamily('regular'), color: '#9CA3AF' },
  dropdownItemText:    { fontSize: 14, fontFamily: getFontFamily('regular'), color: '#111827' },

  // Actions
  actionsContainer: { marginHorizontal: 16, marginTop: 16, gap: 12 },
  actionBtn:        { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  escalateBtn:      { backgroundColor: '#fff', borderWidth: 2, borderColor: '#F97316' },
  escalateBtnText:  { fontSize: 16, fontFamily: getFontFamily('semibold'), color: '#F97316' },
  closeBtn:         { backgroundColor: '#DC2626' },
  closeBtnText:     { fontSize: 16, fontFamily: getFontFamily('semibold'), color: '#fff' },
  closedBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, padding: 16, backgroundColor: '#F3F4F6', borderRadius: 12 },
  closedBannerText: { fontSize: 14, fontFamily: getFontFamily('semibold'), color: '#6B7280' },

  // Modal
  modalOverlay:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer:       { backgroundColor: Colors.backgroundColor, borderRadius: 20, width: wp('85%'), maxHeight: hp('60%'), shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalHeader:          { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle:           { fontSize: 20, fontFamily: getFontFamily('bold'), color: '#111827', marginBottom: 4 },
  modalSubtitle:        { fontSize: 14, fontFamily: getFontFamily('regular'), color: '#6B7280' },
  modalTextInput:       { margin: 20, backgroundColor: '#fff' },
  modalActions:         { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  modalButton:          { flex: 1, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  modalCancelButton:    { borderRightWidth: 1, borderRightColor: '#F3F4F6' },
  modalConfirmButton:   { backgroundColor: '#DC2626', borderBottomRightRadius: 20 },
  modalCancelText:      { fontSize: 16, fontFamily: getFontFamily('semibold'), color: '#6B7280' },
  modalConfirmText:     { fontSize: 16, fontFamily: getFontFamily('semibold'), color: '#fff' },
});

export default LandlordTicketDetails;
