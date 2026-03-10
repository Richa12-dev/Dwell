import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image
} from 'react-native';
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import { Colors, fonts } from '../Theme';
import { getFontFamily } from '../utils';

const CustomButton = (props) => {
  // Determine button background color based on state
  const getBackgroundColor = () => {
    if (props.disabled || props.loading) {
      return '#9E9E9E'; // Disabled/placeholder color (matching your register screen)
    }
    return props.color ? props.color : '#E53935'; // Active CTA color (red from design)
  };

  // Determine text color based on state
  const getTextColor = () => {
    if (props.disabled || props.loading) {
      return '#FFFFFF'; 
    }
    return props.textColor ? props.textColor : '#FFFFFF';
  };

  return (
    <TouchableOpacity
      disabled={props.loading || props.disabled}
      onPress={props.action}
      activeOpacity={0.8}
      style={[
        styles.screen,
        {
          justifyContent: props.align ? props.align : 'center',
          backgroundColor: getBackgroundColor(),
          height: props.height ? props.height : hp(5.5),
          borderRadius: props.notBorder ? 0 : 10,
          width: props.width ? props.width : '100%',
          paddingHorizontal: props.paddingHorizontal ? props.paddingHorizontal : wp(6),
          paddingVertical: props.paddingVertical ? props.paddingVertical : hp(1.8),
          opacity: props.opacity !== undefined ? props.opacity : 1,
        },
        props.style,
      ]}>
      {props.icon1 ? (
        <View style={{marginRight: 10}}>{props.icon1}</View>
      ) : null}
      
      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: getTextColor(),
            fontSize: props.size ? props.size : hp(2.2),
            fontFamily: props.fontFamily ? props.fontFamily : getFontFamily('medium'),
          },
        ]}>
        {props.loading ? '' : props.title}
      </Text>

      {props.loading ? (
        <View style={{marginLeft: 10}}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : props.icon ? (
        <Image
          resizeMode="contain"
          tintColor={props.icon_color ? props.icon_color : '#FFFFFF'}
          style={[
            styles.icon,
            {
              marginLeft: props.iconmargin ? props.iconmargin : 10,
            },
          ]}
          source={props.icon}
        />
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  icon: {
    height: hp(2.5),
    width: hp(2.5),
  },
});

export default CustomButton;