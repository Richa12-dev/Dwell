// 📁 components/Payment/NextPayoutCard.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { AppIcon } from '../AppIcon';
import { icons } from '../../Assets';

export const NextPayoutCard = ({ amount, date }) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <AppIcon name={icons.calendar} height={hp(2.5)} width={hp(2.5)} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.label}>NEXT PAYOUT</Text>
            <Text style={styles.dateText}>Expected on {date}</Text>
          </View>
        </View>
        <Text style={styles.amount}>${amount.toLocaleString()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF5F5',
    marginHorizontal: wp(5),
    marginTop: hp(2),
    borderRadius: 12,
    padding: hp(2),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    backgroundColor: '#FEE2E2',
    padding: hp(1),
    borderRadius: 8,
  },
  textContainer: {
    justifyContent: 'center',
  },
  label: {
    fontSize: hp(1.4),
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'Nunito-SemiBold',
  },
  dateText: {
    fontSize: hp(1.4),
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Nunito-Regular',
  },
  amount: {
    fontSize: hp(1.8),
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Nunito-Bold',
  },
});
