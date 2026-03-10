// 📁 screens/Payment/PaymentDetailsModal.js
import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ScrollView, Text } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { AppIcon } from '../../components/AppIcon';
import { icons } from '../../Assets';

export const PaymentDetailsModal = ({ visible, payment, onClose }) => {
  if (!payment) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Handle */}
          <View style={styles.modalHandle} />

          {/* Close Button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.contentContainer}>
              {/* Title */}
              <View style={styles.titleSection}>
                <Text style={styles.mainTitle}>Payment Details</Text>
                <Text style={styles.subtitle}>Transaction Information</Text>
              </View>

              {/* Payment ID and Status */}
              <View style={styles.row}>
                <View style={styles.leftColumn}>
                  <Text style={styles.label}>Payment ID</Text>
                  <Text style={styles.value}>{payment.paymentId}</Text>
                </View>

                {payment.status === 'Paid' && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Paid</Text>
                  </View>
                )}
              </View>

              {/* Job ID and Property */}
              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Job ID</Text>
                  <Text style={styles.value}>JOB-{payment.jobId}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.label}>Property</Text>
                  <Text style={styles.value}>{payment.address}</Text>
                </View>
              </View>

              {/* Payment Amount and Transaction Date */}
              <View style={styles.gridRow}>
                <View style={styles.gridItem}>
                  <Text style={styles.label}>Payment Amt.</Text>
                  <Text style={styles.value}>${payment.amount.toLocaleString()}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.label}>Transaction Date</Text>
                  <Text style={styles.value}>{payment.transactionDate}</Text>
                </View>
              </View>

              {/* Download Invoice Button */}
              <TouchableOpacity style={styles.downloadBtn} activeOpacity={0.7}>
                <View style={styles.downloadContent}>
                  <AppIcon name={icons.download} height={hp(2.5)} width={hp(2.5)} />
                  <Text style={styles.downloadBtnText}>Download Invoice (PDF)</Text>
                </View>
              </TouchableOpacity>

              {/* Payment Timeline */}
              <View style={styles.timelineSection}>
                <Text style={styles.timelineTitle}>Payment Timeline</Text>

                {payment.timeline.map((item, index) => (
                  <TimelineItem
                    key={index}
                    label={item.label}
                    date={item.date}
                    completed={item.completed}
                    isLast={index === payment.timeline.length - 1}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const TimelineItem = ({ label, date, completed, isLast }) => {
  const getIcon = () => {
    if (label.includes("Job")) {
      return (
        <AppIcon
          name={icons.activeJob}
          size={wp(6)}
          color="#2563EB"
        />
      );
    }

    if (label.includes("Payment")) {
      return (
        <AppIcon
          name={icons.rentCollections}
          size={wp(6)}
          color="#16A34A"
        />
      );
    }

    return (
      <AppIcon
        name={icons.checkCircle}
        size={wp(6)}
        color="#9CA3AF"
      />
    );
  };

  return (
    <View style={[styles.timelineItem, isLast && styles.timelineItemLast]}>
      <View style={styles.timelineLeft}>

        {/* ICON */}
        <View style={styles.timelineIcon}>
          {getIcon()}
        </View>

        {/* Vertical Line */}
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Right Text Section */}
      <View style={styles.timelineRight}>
        <Text style={styles.timelineLabel}>{label}</Text>
        <Text style={styles.timelineDate}>{date}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    maxHeight: hp(85),
  },
  modalHandle: {
    width: wp(15),
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: hp(2),
  },
  closeBtn: {
    position: 'absolute',
    right: wp(5),
    top: hp(2),
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeText: {
    fontSize: hp(2.5),
    color: '#6B7280',
    fontWeight: 'bold',
  },
  contentContainer: {
    gap: hp(2),
    paddingBottom: hp(3),
  },
  titleSection: {
    marginBottom: hp(1),
  },
  mainTitle: {
    fontSize: hp(2.8),
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Nunito-Bold',
  },
  subtitle: {
    fontSize: hp(1.8),
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Nunito-Regular',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftColumn: {
    flex: 1,
  },
  label: {
    fontSize: hp(1.6),
    color: '#6B7280',
    fontFamily: 'Nunito-Regular',
  },
  value: {
    fontSize: hp(2),
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 4,
    fontFamily: 'Nunito-Bold',
  },
  statusBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusText: {
    fontSize: hp(1.7),
    color: '#1D4ED8',
    fontWeight: 'bold',
    fontFamily: 'Nunito-Bold',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  gridItem: {
    flex: 1,
  },
  downloadBtn: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(5),
    marginTop: hp(1),
  },
  downloadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  downloadBtnText: {
    color: '#3B82F6',
    fontSize: hp(1.9),
    fontWeight: 'bold',
    fontFamily: 'Nunito-Bold',
  },
  timelineSection: {
    marginTop: hp(2),
  },
  timelineTitle: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: hp(2),
    fontFamily: 'Nunito-Bold',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: hp(3),
  },
  timelineItemLast: {
    marginBottom: 0,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  timelineRight: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineLabel: {
    fontSize: hp(1.9),
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Nunito-Bold',
  },
  timelineDate: {
    fontSize: hp(1.6),
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Nunito-Regular',
  },
});
