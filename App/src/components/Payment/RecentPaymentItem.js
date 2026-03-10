// 📁 components/Payment/RecentPaymentItem.js
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

export const RecentPaymentItem = ({ jobId, address, amount, date, status, onPress }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'Paid':
        return { backgroundColor: '#DBEAFE', color: '#1D4ED8' };
      case 'Pending':
        return { backgroundColor: '#FEF3C7', color: '#D97706' };
      case 'In Process':
        return { backgroundColor: '#D1FAE5', color: '#059669' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#6B7280' };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.leftInfo}>
            <Text style={styles.jobId}>JOB ID: {jobId}</Text>
            <Text style={styles.address}>{address}</Text>
          </View>
          <Text style={styles.amount}>${amount.toLocaleString()}</Text>
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.date}>{date}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {status}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: hp(2),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: hp(1.5),
  },
  leftInfo: {
    flex: 1,
  },
  jobId: {
    fontSize: hp(1.4),
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Nunito-Bold',
  },
  address: {
    fontSize: hp(1.2),
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Nunito-Regular',
  },
  amount: {
    fontSize: hp(1.6),
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 8,
    fontFamily: 'Nunito-Bold',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: hp(1.2),
    color: '#6B7280',
    fontFamily: 'Nunito-Regular',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: hp(1.2),
    fontWeight: 'bold',
    fontFamily: 'Nunito-Bold',
  },
});
