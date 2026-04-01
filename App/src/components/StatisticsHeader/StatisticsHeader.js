// Statistics Header Component
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { icons } from '../../Assets';
import { AppIcon } from '../../components/AppIcon';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';

const StatisticsHeader = React.memo(
  ({ totalProperties, vacantCount, occupiedCount }) => {
    return (
      <View style={styles.glassCard}>
        <View style={styles.glassCardInner}>
          <View style={styles.row}>

            {/* Total Properties */}
            <View style={styles.column}>
              <View style={styles.iconRow}>
                <AppIcon name={icons.totalProperties} size={wp(6)} />
                <Text style={styles.countText}>{totalProperties}</Text>
              </View>
              <Text style={styles.labelText}>Total Properties</Text>
            </View>

            {/* Available */}
            <View style={styles.column}>
              <View style={styles.iconRow}>
                <AppIcon name={icons.closes} size={wp(6)} />
                <Text style={styles.countText}>{vacantCount}</Text>
              </View>
              <Text style={styles.labelText}>Available</Text>
            </View>

            {/* Occupied */}
            <View style={styles.column}>
              <View style={styles.iconRow}>
                <AppIcon name={icons.ok} size={wp(6)} />
                <Text style={styles.countText}>{occupiedCount}</Text>
              </View>
              <Text style={styles.labelText}>Occupied</Text>
            </View>

          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  glassCardInner: {
    padding: hp(1),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: hp(1),
  },
  column: {
    alignItems: 'center',
    flex: 1,
    minWidth: wp(25),
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  countText: {
    fontSize: hp(2.5),
    fontFamily: getFontFamily('bold'),
    color: Colors.black,
  },
  labelText: {
    fontSize: hp(1.6),
    fontFamily: getFontFamily('regular'),
    color: Colors.textGray,
    marginTop: hp(0.5),
  },
});

export default StatisticsHeader;
