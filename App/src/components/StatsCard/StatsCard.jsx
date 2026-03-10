import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { getFontFamily } from '../../utils';

const StatsCard = ({ title, count, color, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.statsCard, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.colorIndicator, { backgroundColor: color }]} />
      <Text style={[styles.countText, { color }]}>{count}</Text>
      <Text style={styles.titleText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: wp('3%'),
    alignItems: 'center',
    borderWidth: 2,
    minWidth: wp('20%'),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  colorIndicator: {
    width: wp('8%'),
    height: wp('8%'),
    borderRadius: wp('4%'),
    marginBottom: hp('1%'),
  },
  countText: {
    fontSize: wp('5%'),
    fontFamily: getFontFamily('bold'),
    marginBottom: hp('0.5%'),
  },
  titleText: {
    fontSize: wp('3%'),
    fontFamily: getFontFamily('medium'),
    color: '#666',
    textAlign: 'center',
  },
});

export default StatsCard;