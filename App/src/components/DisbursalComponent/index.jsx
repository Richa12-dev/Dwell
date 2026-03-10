// DisbursalComponent.js
import React from 'react';
import {View, Text} from 'react-native';
import {AppIcon} from '../AppIcon';
import {Colors} from '../../Theme';
import {getFontFamily} from '../../utils';
import {widthPercentageToDP as wp} from 'react-native-responsive-screen';

const HamburgerItem = ({
  icon,
  title,
  hideBorderBottom,
  backgroundColor,
  rightIcon,
}) => {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: hideBorderBottom ? 0 : 0.7,
        paddingHorizontal: wp(7),
        paddingVertical: wp(3),
        justifyContent: 'space-between',
        backgroundColor: backgroundColor,
        borderBottomColor: Colors.border,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <AppIcon name={icon} size={wp(6)} />
        <Text
          style={{
            marginLeft: wp(5),
            fontFamily: getFontFamily('bold'),
            color: Colors.primary,
            fontSize: wp(3.5),
          }}>
          {title}
        </Text>
      </View>
      {rightIcon && (
        <View>
          <AppIcon name={rightIcon} size={wp(5)} />
        </View>
      )}
    </View>
  );
};

export default HamburgerItem;