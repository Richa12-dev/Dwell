// 📁 components/Payment/EarningsCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { AppIcon } from '../AppIcon';
import { icons } from '../../Assets';

export const EarningsCard = ({ totalEarnings, upcomingPayouts, pendingCount }) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {/* Total Earnings */}
        <View style={styles.leftSection}>
          <View style={styles.labelRow}>
            <AppIcon name={icons.trending} height={hp(2)} width={hp(2)} />
            <Text style={styles.label}>TOTAL EARNINGS</Text>
          </View>
          <Text style={styles.amount}>${totalEarnings.toLocaleString()}</Text>
          <Text style={styles.subtext}>Month-to-date</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Upcoming Payouts */}
        <View style={styles.rightSection}>
          <View style={styles.labelRow}>
            <AppIcon name={icons.rentCollections} height={hp(2)} width={hp(2)} />
            <Text style={styles.label}>UPCOMING PAYOUTS</Text>
          </View>
          <Text style={styles.amount}>${upcomingPayouts.toLocaleString()}</Text>
          <Text style={styles.subtext}>{pendingCount} pending payments</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
      backgroundColor: "rgba(255, 255, 255, 0.7)",
    marginHorizontal: wp(5),
    borderRadius: 16,
    padding: hp(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: wp(2),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: hp(1),
  },
  label: {
    fontSize: hp(1.4),
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
  },
  amount: {
    fontSize: hp(1.6),
    fontWeight: 'bold',
    color: '#000000',
    marginTop: hp(0.5),
    fontFamily: 'Nunito-Bold',
  },
  subtext: {
    fontSize: hp(1.5),
    color: '#6B7280',
    marginTop: hp(0.5),
    fontFamily: 'Nunito-Regular',
  },
});
