import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { useSelector, useDispatch } from 'react-redux';
import { TextInput } from 'react-native-paper';
import {
  getMaintenanceDetails,
  updateMaintenanceStatus
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

const LandlordTicketDetails = ({ route, navigation }) => {
  const { ticketId, ticket: passedTicket } = route.params;
  const dispatch = useDispatch();
  const scrollViewRef = useRef(null);
  
  const { currentRequest, loading } = useSelector(maintenanceSelectors.getMaintenanceData);
  const loginData = useSelector(s => s.loginData || {});
  const token = loginData?.idToken || loginData?.accessToken;
  
  const ticket = currentRequest || passedTicket;

  const [responseText, setResponseText] = useState('');
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [closureNote, setClosureNote] = useState('');
  const [selectedPriority, setSelectedPriority] = useState(null);

  const priorityData = [
      { label: 'Emergency', value: 'Emergency' },
    { label: 'High', value: 'High' },
    { label: 'Medium', value: 'Medium' },
    { label: 'Low', value: 'Low' },
  ];

  // ✅ Fetch ticket details on mount
  useEffect(() => {
    if (ticketId && token) {
      console.log('🔍 Fetching ticket details for:', ticketId);
      dispatch(getMaintenanceDetails({ ticket_id: ticketId }));
    }
  }, [ticketId, token, dispatch]);

  // ✅ Initialize selected values when ticket loads
  useEffect(() => {
    if (ticket) {
      setSelectedPriority(ticket.priority || 'Medium');
    }
  }, [ticket]);

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
  
  // ✅ Extract ticket data with proper fallbacks
  const ticketData = {
    id: ticket.ticket_id || ticket.id || ticketId,
    title: ticket.title || ticket.subject || 'Untitled',
    description: ticket.description || 'No description provided',
    category: ticket.category || ticket.queryType || 'General',
    priority: ticket.priority || 'Medium',
    status: ticket.status || 'Open',
    location: ticket.location || 'N/A',
  
    tenantName: ticket?.contractor_job_snapshot?.tenant?.name
        || ticket?.tenant?.name
        || ticket?.tenant_name
        || 'Unknown Tenant',

    createdAt: ticket.created_at || ticket.createdAt || new Date().toISOString(),
    preferredStart: ticket.preferred_start || ticket.preferredStart,
    preferredEnd: ticket.preferred_end || ticket.preferredEnd,
    imageUrls: ticket.image_urls || ticket.imageUrls || [],
    voiceUrl: ticket.voice_url || ticket.voiceUrl,
  };

  const handleAddResponse = () => {
    if (responseText.trim()) {
      // Show info that response feature will be added
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
    Alert.alert(
      'Escalate Ticket',
      'Are you sure you want to escalate this ticket to Level 2?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          onPress: () => Alert.alert('Success', 'Ticket escalated to Level 2')
        },
      ]
    );
  };

  const handleCloseTicket = async () => {
    try {
      await dispatch(updateMaintenanceStatus({
        ticket_id: ticketData.id,
        status: 'Closed',
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
    if (p === 'high') return '#FF4757';
    if (p === 'medium') return '#FFA726';
    if (p === 'low') return '#66BB6A';
    return '#9E9E9E';
  };
  
    const tenantAvatar = ticket.tenant_avatar || null;
    const tenantName = ticket?.contractor_job_snapshot?.tenant?.name
        || ticket?.tenant?.name
        || ticket?.tenant_name
        || 'Unknown Tenant';


  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('progress') || s === 'open') return '#10B981';
    if (s === 'pending' || s === 'new') return '#F59E0B';
    if (s === 'resolved' || s === 'closed' || s === 'completed') return '#6B7280';
    return '#9E9E9E';
  };
  
      const getInitials = (name) => {
      if (!name || name === 'Unknown Tenant') return 'UT';
      
      const words = name.trim().split(' ').filter(word => word.length > 0);
      
      if (words.length === 0) return 'UT';
      if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
      
      // Get first letter of first name and first letter of last name
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };
    
    const getAvatarColor = (name) => {
        const colors = [
          Colors.avatarRed || '#EF4444',
          Colors.avatarAmber || '#F59E0B',
          Colors.avatarEmerald || '#10B981',
          Colors.avatarBlue || '#3B82F6',
          Colors.avatarViolet || '#8B5CF6',
          Colors.avatarPink || '#EC4899',
          Colors.avatarCyan || '#06B6D4',
          Colors.avatarOrange || '#F97316',
        ];
        
        if (!name) return colors[0];
       
       if (!name) return colors[0];
       
       // Generate consistent color based on name
       const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
       return colors[charSum % colors.length];
     };


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isTicketClosed = (ticketData.status || '').toLowerCase() === 'closed';
  const isTicketResolved = (ticketData.status || '').toLowerCase() === 'resolved';

  return (
    <Container>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
  <Header
  title="Ticket Details"
  onBackPress={() => navigation.goBack()}
/>


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
                       <View style={[
                         styles.avatarPlaceholder,
                         { backgroundColor: getAvatarColor(tenantName) }
                       ]}>
                         <Text style={styles.initialsText}>
                           {getInitials(tenantName)}
                         </Text>
                       </View>
                     )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tenantName}>{ticketData.tenantName}</Text>
                <Text style={styles.ticketId}>ID:{ticketData.id}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticketData.status) }]}>
                <Text style={styles.statusText}>{ticketData.status}</Text>
              </View>
              
              
            </View>
            
        <Text style={styles.issueTitle}>{ticketData.title}</Text>
            <Text style={styles.issueDescription}>{ticketData.description}</Text>

<View style={styles.infoRow}>
              <View style={styles.dateContainer}>
    <AppIcon
      name={icons.calender}
      height={hp(2)}
      width={hp(2)}
      color={Colors.placeholder}
    />
    <Text style={styles.infoText}>{formatDate(ticketData.createdAt)}</Text>
  </View>
              
              <TouchableOpacity 
                style={styles.addResponseLink}
                onPress={() => setShowResponseInput(!showResponseInput)}
              >
                            <AppIcon
                name={icons.comment}
                height={hp(2)}
                width={hp(2)}
                color={Colors.placeholder}
              />
               
                <Text style={styles.addResponseLinkText}>Add Response</Text>
                                          <AppIcon
                name={icons.arrowDown}
                height={hp(2)}
                width={hp(2)}
                color={Colors.placeholder}
              />
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
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowResponseInput(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={handleAddResponse}
                  >
                    <Text style={styles.submitBtnText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

    
          </View>
            
            
            
         
          {/* Priority Level Card */}
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
                <AppIcon
                name={icons.arrowDown}
                height={hp(2)}
                width={hp(2)}
                color={Colors.placeholder}
              />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: getFontFamily('regular'),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: getFontFamily('semibold'),
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontFamily: getFontFamily('semibold'),
    fontSize: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: getFontFamily('semibold'),
    color: '#1F2937',
  },

  // Tenant Card
  tenantCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantName: {
    fontSize: 16,
    fontFamily: getFontFamily('semibold'),
    color: '#111827',
  },
 initialsText:{
        fontSize: hp(2.5),
        fontWeight: '600',
        fontFamily: getFontFamily('regular'),
    },
  ticketId: {
    fontSize: 12,
    fontFamily: getFontFamily('regular'),
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontFamily: getFontFamily('semibold'),
    color: '#fff',
    textTransform: 'capitalize',
  },

  // Card
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  issueTitle: {
    fontSize: 16,
    fontFamily: getFontFamily('bold'),
    color: '#111827',
    marginBottom: 8,
  },
  issueDescription: {
    fontSize: 14,
    fontFamily: getFontFamily('regular'),
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 12,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: '#F3F4F6',
},
dateContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
  infoText: {
    fontSize: 12,
    fontFamily: getFontFamily('regular'),
    color: '#9CA3AF',
  },
  addResponseLink: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingVertical: 4,
  paddingHorizontal: 8,
  backgroundColor: '#F9FAFB',
  borderRadius: 6,
},
addResponseLinkText: {
  fontSize: 13,
  fontFamily: getFontFamily('medium'),
  color: '#6B7280',
},

  // Add Response
  addResponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  addResponseText: {
    flex: 1,
    fontSize: 14,
    fontFamily: getFontFamily('semibold'),
    color: '#DC2626',
  },
  responseSection: {
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginBottom: 12,
  },
  responseButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: getFontFamily('semibold'),
    color: '#6B7280',
  },
  submitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#DC2626',
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: getFontFamily('semibold'),
    color: '#fff',
  },

  // Priority Dropdown
  cardLabel: {
    fontSize: 14,
    fontFamily: getFontFamily('medium'),
    color: '#374151',
    marginBottom: 12,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontFamily: getFontFamily('medium'),
    color: '#111827',
  },
  dropdownPlaceholder: {
    fontSize: 14,
    fontFamily: getFontFamily('regular'),
    color: '#9CA3AF',
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: getFontFamily('regular'),
    color: '#111827',
  },

  // Action Buttons
  actionsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escalateBtn: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#F97316',
  },
  escalateBtnText: {
    fontSize: 16,
    fontFamily: getFontFamily('semibold'),
    color: '#F97316',
  },
  closeBtn: {
    backgroundColor: '#DC2626',
  },
  closeBtnText: {
    fontSize: 16,
    fontFamily: getFontFamily('semibold'),
    color: '#fff',
  },

  // Closed Banner
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  closedBannerText: {
    fontSize: 14,
    fontFamily: getFontFamily('semibold'),
    color: '#6B7280',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: wp('85%'),
    maxHeight: hp('60%'),
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: getFontFamily('bold'),
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: getFontFamily('regular'),
    color: '#6B7280',
  },
  modalTextInput: {
    margin: 20,
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  modalConfirmButton: {
    backgroundColor: '#DC2626',
    borderBottomRightRadius: 20,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: getFontFamily('semibold'),
    color: '#6B7280',
  },
  modalConfirmText: {
    fontSize: 16,
    fontFamily: getFontFamily('semibold'),
    color: '#fff',
  },
});

export default LandlordTicketDetails;
