// 📁 components/Payment/PaymentLedgerButton.js
import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Colors } from '../../Theme';
import { AppIcon } from '../AppIcon';
import { icons } from '../../Assets';

export const PaymentLedgerButton = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.content}>
        <AppIcon name={icons.rentCollections} height={hp(2.5)} width={hp(2.5)} />
        <Text style={styles.buttonText}>View Payment Ledger</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.red,
    marginHorizontal: wp(5),
    marginTop: hp(2),
    borderRadius: 12,
    paddingVertical: hp(1.8),
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: hp(1.6),
    fontFamily: 'Nunito-Bold',
  },
});
