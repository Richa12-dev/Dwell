import React from 'react';
import {Platform, StatusBar, StyleSheet, View} from 'react-native';
import {Colors} from '../Theme';
// Adjust as per your theme

const CustomStatusBar = ({backgroundColor, barStyle}) => {
  const statusBarColor = backgroundColor || Colors.primary; // Default to primary color

  return (
    <View style={[styles.statusBar, {backgroundColor: statusBarColor}]}>
      <StatusBar
        translucent
        backgroundColor={statusBarColor}
        barStyle={barStyle || 'light-content'} // Default to light-content
      />
    </View>
  );
};

const styles = StyleSheet.create({
  statusBar: {
    height: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    // Adjust height as per your design, or use constants like StatusBar.currentHeight
  },
});

export default CustomStatusBar;
