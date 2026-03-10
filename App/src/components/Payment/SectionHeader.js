// 📁 components/Payment/SectionHeader.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { AppIcon } from '../AppIcon';

export const SectionHeader = ({ icon, title }) => {
  return (
    <View style={styles.container}>
      <AppIcon name={icon} height={hp(2.5)} width={hp(2.5)} />
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: hp(2),
  },
  title: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
    color: '#000000',
    fontFamily: 'Nunito-Bold',
  },
});
