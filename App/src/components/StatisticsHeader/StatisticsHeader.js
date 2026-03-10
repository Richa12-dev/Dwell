// Statistics Header Component
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Box, HStack, VStack, Text } from 'native-base';
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
        <Box style={styles.glassCardInner}>
          <HStack style={styles.row}>
            {/* Total Properties */}
            <VStack style={styles.column}>
              <HStack style={styles.iconRow}>
                <AppIcon name={icons.totalProperties} size={wp(6)} />
                <Text style={styles.countText}>{totalProperties}</Text>
              </HStack>
              <Text style={styles.labelText}>Total Properties</Text>
            </VStack>

            {/* Available */}
            <VStack style={styles.column}>
              <HStack style={styles.iconRow}>
                <AppIcon name={icons.closes} size={wp(6)} />
                <Text style={styles.countText}>{vacantCount}</Text>
              </HStack>
              <Text style={styles.labelText}>Available</Text>
            </VStack>

            {/* Occupied */}
            <VStack style={styles.column}>
              <HStack style={styles.iconRow}>
                <AppIcon name={icons.ok} size={wp(6)} />
                <Text style={styles.countText}>{occupiedCount}</Text>
              </HStack>
              <Text style={styles.labelText}>Occupied</Text>
            </VStack>
          </HStack>
        </Box>
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },

  glassCardInner: {
    padding: hp(1),
  },

  row: {
    justifyContent: 'space-around',
    marginBottom: hp(1),
  },

  column: {
    alignItems: 'center',
    flex: 1,
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
