import React, { useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Animated,
  StatusBar,
  Platform,
  ImageBackground
} from "react-native";
import { Colors } from "../../Theme";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import CollectionNavBar from "../CollectionNavBar/CollectionNavBar";
import { getFontFamily } from '../../utils';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";


type ContainerProps = Readonly<{
  children: React.ReactNode;
  style?: object;
  scroll?: boolean;
}>;

const Container = ({ children, style, scroll = true, noPaddingBottom = false  }: ContainerProps) => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar backgroundColor={Colors.black} barStyle="light-content" />

      {/* Background Glow Layer */}
      <View style={styles.backgroundContainer} pointerEvents="none">
        <ImageBackground
          source={require('../../Assets/Image/dwellProperties/topGlow.png')}
          style={styles.topGlow}
          resizeMode="contain"
        />
        <ImageBackground
          source={require('../../Assets/Image/dwellProperties/bottomGlow.png')}
          style={styles.bottomGlow}
          resizeMode="contain"
        />
      </View>

      {/* Fixed Navbar */}
      <View style={styles.fixedNavbar}>
        <CollectionNavBar />
      </View>

      {/* Scrollable Content */}
      {scroll ? (
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scrollWrapper}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, style]}>{children}</View>
        </Animated.ScrollView>
      ) : (
           <View style={[styles.container, styles.noScrollContainer, { paddingBottom: noPaddingBottom ? hp(2) : hp(12) }, style]}>
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: Colors.background || "#FFFFFF",
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  topGlow: {
    position: "absolute",
    width: wp(80),
    height: hp(50),
    top: hp(-6),
    left: wp(35),
    opacity: 0.8,
  },
  bottomGlow: {
    position: "absolute",
    width: wp(70),
    height: hp(40),
    top: hp(65),
    left: wp(-10),
    opacity: 0.8,
  },
  fixedNavbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "transparent",
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: Platform.select({
      android: (StatusBar.currentHeight || 0) + hp(8) + hp(2),
      ios: hp(6) + hp(6) + hp(2),
      default: hp(9) + hp(2),
    }),
    paddingBottom: hp(12),
  },
  container: {
    flexDirection: "column",
    paddingHorizontal: 0,
  },
  noScrollContainer: {
    flex: 1,
    paddingTop: Platform.select({
      android: (StatusBar.currentHeight || 0) + hp(9) + hp(2),
      ios: hp(6) + hp(6) + hp(2),
      default: hp(9) + hp(2),
    }),
  },
});

export default Container;
