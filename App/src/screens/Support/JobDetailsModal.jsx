import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import Modal from 'react-native-modal';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { launchImageLibrary } from 'react-native-image-picker';
import { onJobEvent, JOB_EVENTS } from '../../utils/Jobeventbus';

// ── JobImage — handles auth headers + loading + error fallback ───────────────


const JobImage = ({ uri, authToken }) => {
  const [status, setStatus] = useState('loading');

  const imageSource = {
    uri,
    ...(authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}),
    cache: 'force-cache',
  };

  return (
    <View style={imgStyles.wrapper}>
    {status === 'error' ? (
        <Image
          source={require('../../Assets/Image/dwellProperties/Maskgroup1.png')}
          style={imgStyles.image}
          resizeMode="cover"
        />
      ) : (
        <Image
          source={imageSource}
          style={imgStyles.image}
          resizeMode="cover"
          onLoadStart={() => setStatus('loading')}
          onLoad={() => setStatus('loaded')}
          onError={(e) => {
            console.warn('❌ JobImage failed:', uri, e.nativeEvent?.error);
            setStatus('error');
          }}
        />
      )}
      {status === 'loading' && (
        <View style={imgStyles.overlay}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      )}
    </View>
  );
};

const imgStyles = StyleSheet.create({
  wrapper: {
    width: wp(28),
    height: wp(28),
    borderRadius: 12,
    marginRight: wp(3),
    backgroundColor: '#F0F4F8',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
  },
  errorIcon: {
    fontSize: wp(6),
    marginBottom: 4,
  },
  errorText: {
    fontSize: wp(2.8),
    color: '#DC2626',
    fontWeight: '500',
  },
});
// ─────────────────────────────────────────────────────────────────────────────

const JobDetailsModal = ({
  visible,
  job,
  onClose,
  onAccept,
  onDecline,
  onMarkComplete,
  onJobExpired,
  isAccepting = false,
  authToken = null,
  contractorLat = null,
  contractorLng = null,
}) => {
  const [showDeclineInput, setShowDeclineInput] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [beforeImage, setBeforeImage] = useState(null);
  const [afterImage, setAfterImage] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const timerRef = useRef(null);
  
 const handleCallTenant = () => {
  const phone =
    job?.tenant_phone ??
    job?.tenant?.phone_number ??
    job?.tenant?.phone ??
    job?.contact_phone ??
    job?.phone_number ??
    job?.phone ??
    null;

  if (!phone) {
    console.warn('⚠️ No tenant phone number found');
    return;
  }

  const cleaned = phone.replace(/[^\d+]/g, '');

  // Use telprompt on iOS — shows a confirmation dialog before calling
 const url = `tel:${cleaned}`;

  Linking.openURL(url).catch((err) =>
    console.error('❌ Could not open dialer:', err)
  );
};

  // ── Countdown Timer for "New" jobs ──────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // ✅ FIX: Do NOT require offered_at (API always returns it null).
    // ✅ FIX: Use primitive deps so this doesn't re-run on every render.
    const statusLower = job?.status?.toLowerCase();
    const isNew = statusLower === 'new';
    const isDeclinedByStatus = statusLower === 'declined' || statusLower === 'denied';

    // If status is already declined/denied, show Declined state immediately
    if (isDeclinedByStatus) {
      setIsExpired(true);
      setTimeRemaining(null);
      return;
    }

    if (!visible || !job || !isNew) {
      setIsExpired(false);
      setTimeRemaining(null);
      return;
    }

    // Reset expired state when a new job opens
    setIsExpired(false);

    // offered_at → created_at → now
    const startStr = job.offered_at || job.created_at || new Date().toISOString();
    const expiryTime = new Date(new Date(startStr).getTime() + 10 * 60 * 1000);

    console.log('⏱ [Modal Timer] Starting for job:', job.ticket_id, {
      offered_at: job.offered_at,
      created_at: job.created_at,
      using: startStr,
      expires: expiryTime.toISOString(),
      ms_left: Math.max(0, expiryTime.getTime() - Date.now()),
    });

    const calcRemaining = () => Math.max(0, expiryTime.getTime() - Date.now());
    setTimeRemaining(calcRemaining());

    timerRef.current = setInterval(() => {
      const remaining = calcRemaining();
      setTimeRemaining(remaining);

      if (remaining === 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setIsExpired(true);       // ← switch to Declined state in the modal
        setTimeRemaining(null);
        if (onJobExpired) {
          onJobExpired(job.ticket_id || job.id);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // ✅ Primitive deps only — no object references that change every render
  }, [visible, job?.ticket_id, job?.status, job?.offered_at, job?.created_at]);
  // ────────────────────────────────────────────────────────────────────────

  // ── Listen for "accepted by other contractor" event ──────────────────────
  //
  // When another contractor accepts the job currently shown in this modal:
  //   1. Kill the countdown timer immediately.
  //   2. Flip isExpired → true so the "Offer Expired" banner appears.
  //   3. The Accept / Decline buttons disappear (isNew && !isDeclined guard).
  //
  // ContractorSupport will also close the modal and show a Toast, but we
  // handle the visual state here so there is no flash of the old UI.
  useEffect(() => {
    const subscription = onJobEvent(JOB_EVENTS.JOB_ACCEPTED_BY_OTHER, ({ ticket_id }) => {
      if (ticket_id !== job?.ticket_id) return; // not this job — ignore

      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Switch to expired/declined visual state
      setIsExpired(true);
      setTimeRemaining(null);
    });

    return () => subscription.remove();
  }, [job?.ticket_id]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleDecline = () => {
    setShowDeclineInput(true);
  };

  const submitDecline = () => {
    if (declineReason.trim()) {
      onDecline(declineReason);
      setShowDeclineInput(false);
      setDeclineReason('');
    }
  };

  const pickImage = async (type) => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    };

    try {
      const result = await launchImageLibrary(options);
      
      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        if (type === 'before') {
          setBeforeImage(imageUri);
        } else {
          setAfterImage(imageUri);
        }
      }
    } catch (error) {
      console.error('Image picker error:', error);
    }
  };

  const formatTime = (ms) => {
    if (ms === null || ms === undefined) return '10:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
const getPriorityStyle = (priority) => {
  const p = (priority || '').trim().toLowerCase();

  if (p.includes('urgent') || p.includes('high') || p.includes('emergency')) {
    return {
      backgroundColor: '#FFEBEE',
      color: '#D32F2F',
      label: 'High Priority'
    };
  }

  if (p.includes('medium')) {
    return {
      backgroundColor: '#FFF3E0',
      color: '#F57C00',
      label: 'Medium Priority'
    };
  }

  if (p.includes('low')) {
    return {
      backgroundColor: '#E8F5E9',
      color: '#388E3C',
      label: 'Low Priority'
    };
  }

  return {
    backgroundColor: '#F5F5F5',
    color: '#757575',
    label: priority || 'Normal'
  };
};



  if (!job) return null;

  
const calcDistanceMiles = (lat1, lng1, lat2, lng2) => {
  const vals = [lat1, lng1, lat2, lng2].map(Number);
  if (vals.some(v => isNaN(v) || v === 0)) return null;
  const R = 3958.8;
  const dLat = ((vals[2] - vals[0]) * Math.PI) / 180;
  const dLng = ((vals[3] - vals[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((vals[0] * Math.PI) / 180) *
    Math.cos((vals[2] * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

const distanceMiles = calcDistanceMiles(
  contractorLat,
  contractorLng,
  job?.property_lat ?? job?.lat,
  job?.property_lng ?? job?.lng
);

  const isInProgress = job.status?.toLowerCase() === 'in progress';
  const isNew = job.status?.toLowerCase() === 'new';
  const hasInvoice = job.has_invoice || job.invoice;
  const invoiceTotal = job.invoice?.total;
  const isTimerUrgent = timeRemaining !== null && timeRemaining < 120000; // < 2 min
  const isDeclined = isExpired || job?.status?.toLowerCase() === 'declined' || job?.status?.toLowerCase() === 'denied';
  
  // ✅ S3 bucket — same as QueryDetails page where images already work
  const S3_MAINTENANCE_BUCKET = 'https://dp-maintenance-attachments.s3.amazonaws.com';

  // Convert a raw S3 key → full URL
  const getS3Url = (raw) => {
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('data:')) return raw;
    return `${S3_MAINTENANCE_BUCKET}/${raw}`;
  };

  // Collect raw keys from every possible field, then build full URLs
  const rawImages =
    job?.image_urls ||
    job?.attachments?.photos ||
    job?.attachments?.image_urls ||
    job?.media?.photos ||
    job?.contractor_job_snapshot?.image_urls ||
    [];

  const jobImages = rawImages
    .map(photo => getS3Url(typeof photo === 'string' ? photo : photo?.url || photo?.uri || null))
    .filter(Boolean);

  console.log('📸 Job images in modal:', jobImages.length, jobImages);
  
   // ✅ Get priority styling
  const priorityStyle = getPriorityStyle(job.priority);

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={styles.modalContent}>
        {/* Handle Bar */}
        <View style={styles.modalHandle} />

        {/* ── Declined Banner (expired or status declined/denied) ── */}
        {isDeclined && (
          <View style={styles.declinedBanner}>
            <Text style={styles.declinedBannerIcon}>✕</Text>
            <Text style={styles.declinedBannerLabel}>Offer Expired</Text>
          </View>
        )}

        {/* ── Countdown Timer Banner (New jobs only, while running) ── */}
        {!isDeclined && isNew && timeRemaining !== null && (
          <View style={[
            styles.timerBanner,
            isTimerUrgent && styles.timerBannerUrgent,
          ]}>
            <Text style={styles.timerBannerIcon}>⏱</Text>
            <View style={styles.timerBannerContent}>
              <Text style={styles.timerBannerLabel}>
                {isTimerUrgent ? 'Expiring soon!' : 'Offer expires in'}
              </Text>
              <Text style={styles.timerBannerTime}>{formatTime(timeRemaining)}</Text>
            </View>
            <View style={[
              styles.timerPill,
              isTimerUrgent && styles.timerPillUrgent,
            ]}>
              <Text style={styles.timerPillText}>{formatTime(timeRemaining)}</Text>
            </View>
          </View>
        )}
        
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          disabled={isAccepting}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
         <View style={styles.statusPriorityRow}>
            {/* Status Badge */}
            {isNew && !isDeclined && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>New</Text>
              </View>
            )}
            {isInProgress && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>In Progress</Text>
              </View>
            )}
            
            {/* Priority Badge */}
            {job.priority && (
              <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.backgroundColor }]}>
                <Text style={[styles.priorityBadgeText, { color: priorityStyle.color }]}>
                  {priorityStyle.label}
                </Text>
              </View>
            )}
          </View>
          

          {/* Job Details */}
          <View style={styles.detailsSection}>
            <View style={styles.locationRow}>
              <AppIcon name={icons.location} size={wp(5)} color={Colors.red} />
              <Text style={styles.detailAddress}>{job.address}</Text>
            </View>
            
            <Text style={styles.detailDescription}>{job.description}</Text>
            
            {/* ✅ SHOW JOB IMAGES IF AVAILABLE */}
            {jobImages.length > 0 && (
              <View style={styles.imagesSection}>
                <Text style={styles.imagesSectionTitle}>
                  Attached Images ({jobImages.length})
                </Text>
                <View style={styles.imagesScrollWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.imagesScrollView}
                  >
                    {jobImages.map((imageUrl, index) => (
                      <JobImage
                        key={index}
                        uri={imageUrl}
                        authToken={authToken}
                      />
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}


            <View style={styles.detailRow}>
              <AppIcon name={icons.dollar} size={wp(4.5)} color="#666" />
            <Text style={styles.invoiceTotalLabel}>Total Amount:</Text>
          <Text style={styles.invoiceTotalValue}>${invoiceTotal}</Text>
          
  <View style={styles.distancePill}>
    <Text style={styles.distancePillText}>
      Distance {distanceMiles !== null ? `${distanceMiles} mi away` : '__'}
    </Text>
  </View>
            </View>

            <View style={styles.detailRow}>
              <AppIcon name={icons.calendar} size={wp(4.5)} color="#666" />
              <Text style={styles.detailText}>{job.date}</Text>
            </View>
           
          </View>

         
          {/* Contact Actions */}
          <View style={styles.contactActions}>
            <TouchableOpacity
              style={styles.callButton}
               onPress={handleCallTenant}
              disabled={isAccepting}
            >
              <AppIcon name={icons.phone} size={wp(4.5)} color="#000" />
              <Text style={styles.callButtonText}>Call Tenant</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.chatButton}
              disabled={isAccepting}
            >
              <AppIcon name={icons.messages} size={wp(4.5)} color="#fff" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Upload Photos Section (for In Progress jobs) */}
          {isInProgress && (
            <View style={styles.uploadSection}>
              <Text style={styles.uploadTitle}>Upload Photos</Text>
              <View style={styles.uploadRow}>
                <View style={styles.uploadBox}>
                  <Text style={styles.uploadLabel}>Before</Text>
                  {beforeImage ? (
                    <Image source={{ uri: beforeImage }} style={styles.uploadedImage} />
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadPlaceholder}
                      onPress={() => pickImage('before')}
                    >
                      <AppIcon name={icons.camera} size={wp(4)} color="#999" />
                      <Text style={styles.uploadPlaceholderText}>Upload Image</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.uploadBox}>
                  <Text style={styles.uploadLabel}>After</Text>
                  {afterImage ? (
                    <Image source={{ uri: afterImage }} style={styles.uploadedImage} />
                  ) : (
                    <TouchableOpacity
                      style={styles.uploadPlaceholder}
                      onPress={() => pickImage('after')}
                    >
                      <AppIcon name={icons.camera} size={wp(4)} color="#999" />
                      <Text style={styles.uploadPlaceholderText}>Upload Image</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              
              {/* Info about invoice */}
              {!hasInvoice && (
                <View style={styles.invoiceInfoBox}>
                  <AppIcon name={icons.document} size={wp(4.5)} color="#F57C00" />
                  <Text style={styles.invoiceInfoText}>
                    Add an invoice from the job card to mark this job as complete
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          {isNew && !isDeclined && !showDeclineInput && (
            <>
              <TouchableOpacity
                style={[
                  styles.acceptButton,
                  isAccepting && styles.buttonDisabled
                ]}
                onPress={onAccept}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.acceptButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.acceptButtonText}>✓ Accept Job</Text>
                    <Text style={styles.acceptButtonSubtext}>
                      Accept and start working
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.declineButton,
                  isAccepting && styles.buttonDisabled
                ]}
                onPress={handleDecline}
                disabled={isAccepting}
              >
                <Text style={styles.declineButtonText}>✕ Decline Job</Text>
              </TouchableOpacity>
            </>
          )}



          {/* Decline Reason Input */}
          {showDeclineInput && (
            <View style={styles.declineSection}>
              <TextInput
                style={styles.declineInput}
                placeholder="Reason to Decline Job"
                value={declineReason}
                onChangeText={setDeclineReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <View style={styles.declineActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowDeclineInput(false);
                    setDeclineReason('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={submitDecline}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mark as Complete Button */}
          {isInProgress && (
            <TouchableOpacity
              style={[
                styles.completeButton,
                !hasInvoice && styles.completeButtonDisabled
              ]}
              onPress={onMarkComplete}
              disabled={!hasInvoice}
            >
              <Text style={styles.completeButtonText}>✓ Mark as Completed</Text>
              {!hasInvoice && (
                <Text style={styles.completeButtonSubtext}>
                  Invoice required to complete
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: wp(6),
    paddingHorizontal: wp(6),
    paddingBottom: 0,
    maxHeight: '90%',
  },
  scrollContent: {
    paddingBottom: hp(3),
  },
  modalHandle: {
    width: wp(10),
    height: hp(0.5),
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: hp(2),
  },
  closeButton: {
    position: 'absolute',
    right: wp(4),
    top: hp(2),
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: wp(6),
    color: '#666',
    marginTop: -hp(0.5),
  },
  statusPriorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(2),
    flexWrap: 'wrap',
  },
  newBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(4),
    borderRadius: 20,
  },
  newBadgeText: {
    color: '#1976D2',
    fontSize: wp(3.5),
    fontFamily: getFontFamily('bold'),
  },
  progressBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 12,
    marginBottom: hp(2),
  },
  progressBadgeText: {
    color: '#F57C00',
    fontSize: wp(3),
    fontFamily: getFontFamily('semibold'),
  },
  // ✅ Priority Badge Styles (now next to status)
  priorityBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 20,
  },
  priorityBadgeText: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('bold'),
  },
  detailsSection: {
    gap: hp(2),
    marginBottom: hp(3),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  detailAddress: {
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    flex: 1,
  },
  detailDescription: {
    fontSize: wp(3.5),
    color: '#666',
    lineHeight: hp(2.5),
    fontFamily: getFontFamily('regular'),
  },
  imagesSection: {
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  imagesSectionTitle: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('semibold'),
    color: Colors.black,
    marginBottom: hp(1),
  },
  // Wrapper View gives the horizontal ScrollView an explicit height on iOS/Android
  imagesScrollWrapper: {
    height: wp(30),
  },
  imagesScrollView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: wp(2),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  detailText: {
    fontSize: wp(3.5),
    color: Colors.black,
    fontFamily: getFontFamily('medium'),
  },
  invoiceTotalCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#81C784',
  },
  invoiceTotalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1.5),
  },
  invoiceTotalTitle: {
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
    color: '#388E3C',
  },
  invoiceTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  invoiceTotalLabel: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily('semibold'),
    color: 'Color.black',
  },
  invoiceTotalValue: {
    fontSize: wp(4.5),
    fontFamily: getFontFamily('bold'),
    color: 'Color.black',
  },
  invoiceBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#81C784',
    paddingTop: hp(1),
    gap: hp(0.5),
  },
  invoiceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceBreakdownLabel: {
    fontSize: wp(3.2),
    fontFamily: getFontFamily('medium'),
    color: '#388E3C',
  },
  invoiceBreakdownValue: {
    fontSize: wp(3.2),
    fontFamily: getFontFamily('semibold'),
    color: '#2E7D32',
  },
  contactActions: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(3),
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    backgroundColor: '#F5F5F5',
    padding: hp(1.8),
    borderRadius: 12,
  },
  callButtonText: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('semibold'),
    color: Colors.black,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    backgroundColor: '#22C55E',
    padding: hp(1.8),
    borderRadius: 12,
  },
  chatButtonText: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('semibold'),
    color: '#fff',
  },
  uploadSection: {
    marginBottom: hp(1),
  },
  uploadTitle: {
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
    marginBottom: hp(1.5),
  },
  uploadRow: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(1),
  },
  uploadBox: {
    flex: 1,
  },
  uploadLabel: {
    fontSize: wp(3.5),
    color: '#666',
    fontFamily: getFontFamily('medium'),
    marginBottom: hp(1),
  },
  uploadPlaceholder: {
 height: wp(18),
  borderWidth: 1,
  borderColor: "#D1D5DB",
  borderRadius: 10,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#F9FAFB",
    },
  uploadPlaceholderText: {
    fontSize: wp(3),
    color: '#999',
    fontFamily: getFontFamily('regular'),
  },
  uploadedImage: {
     height: wp(18),
  width: "100%",
  borderRadius: 10,
  },
  invoiceInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    backgroundColor: '#FFF8E1',
    padding: wp(3.5),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  invoiceInfoText: {
    flex: 1,
    fontSize: wp(3.2),
    color: '#F57C00',
    fontFamily: getFontFamily('medium'),
    lineHeight: hp(2.2),
  },
  distancePill: {
  marginLeft: 'auto',
  backgroundColor: '#EFF6FF',
  borderRadius: 20,
  paddingHorizontal: wp(3),
  paddingVertical: hp(0.5),
  borderWidth: 1,
  borderColor: '#BFDBFE',
},
distancePillText: {
  fontSize: wp(3),
  fontFamily: getFontFamily('semibold'),
  color: '#1D4ED8',
},
  acceptButton: {
    backgroundColor: '#3B82F6',
    padding: hp(2),
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
  },
  acceptButtonSubtext: {
    color: '#fff',
    fontSize: wp(3),
    fontFamily: getFontFamily('regular'),
    marginTop: hp(0.3),
    opacity: 0.9,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  declineButton: {
    backgroundColor: '#fff',
    padding: hp(2),
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.red,
  },
  declineButtonText: {
    color: Colors.red,
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
  },
  declineSection: {
    gap: hp(1.5),
  },
  declineInput: {
    backgroundColor: '#F5F5F5',
    padding: wp(4),
    borderRadius: 12,
    minHeight: hp(12),
    fontSize: wp(3.5),
    fontFamily: getFontFamily('regular'),
  },
  declineActions: {
    flexDirection: 'row',
    gap: wp(3),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: hp(1.8),
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('semibold'),
    color: '#666',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.red,
    padding: hp(1.8),
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: wp(3.5),
    fontFamily: getFontFamily('semibold'),
    color: '#fff',
  },
  completeButton: {
    backgroundColor: '#3B82F6',
    padding: hp(2),
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonDisabled: {
    backgroundColor: '#BDBDBD',
    opacity: 0.6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: wp(4),
    fontFamily: getFontFamily('bold'),
  },
  completeButtonSubtext: {
    color: '#fff',
    fontSize: wp(2.8),
    fontFamily: getFontFamily('regular'),
    marginTop: hp(0.3),
    opacity: 0.9,
  },

  // ── Declined / Expired Banner ────────────────────────────────────────────
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: '#EF9A9A',
    gap: wp(2.5),
  },
  declinedBannerIcon: {
    fontSize: wp(4.5),
    color: '#B71C1C',
  },
  declinedBannerLabel: {
    fontSize: wp(3.8),
    fontFamily: getFontFamily('bold'),
    color: '#B71C1C',
    flex: 1,
  },

  // ── Countdown Timer Banner ────────────────────────────────────────────
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: '#90CAF9',
    gap: wp(3),
  },
  timerBannerUrgent: {
    backgroundColor: '#FFEBEE',
    borderColor: '#EF9A9A',
  },
  timerBannerContent: {
    flex: 1,
  },
  timerBannerLabel: {
    fontSize: wp(2.8),
    fontFamily: getFontFamily('medium'),
    color: '#1565C0',
  },
  timerBannerTime: {
    fontSize: wp(5),
    fontFamily: getFontFamily('bold'),
    color: '#1976D2',
    letterSpacing: 0.5,
  },
  timerBannerIcon: {
    fontSize: wp(6),
  },
  timerPill: {
    backgroundColor: '#1976D2',
    borderRadius: 20,
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(3.5),
  },
  timerPillUrgent: {
    backgroundColor: '#D32F2F',
  },
  timerPillText: {
    color: '#fff',
    fontSize: wp(3.5),
    fontFamily: getFontFamily('bold'),
    letterSpacing: 0.5,
  },
});

export default JobDetailsModal;
