import React, { useRef } from "react";
import {
  View,
  StyleSheet,
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

type ContainerProps = Readonly<{
  children: React.ReactNode;
  style?: object;
  scroll?: boolean;
  noPaddingBottom?: boolean;
}>;

// CollectionNavBar real height:
// iOS:     paddingTop hp(6) + glassContainer hp(7) = hp(13)
// Android: StatusBar.currentHeight + 5 + hp(7)

const NAVBAR_HEIGHT_IOS     = hp(6) + hp(7);          // = hp(13)
const NAVBAR_HEIGHT_ANDROID = (StatusBar.currentHeight || 24) + 5 + hp(7);

// ProfileFooter tab bar real height:
// glassContainer hp(7) + bottom offset hp(2) = hp(9) on iOS
const TAB_BAR_CLEARANCE = hp(10); // hp(9) needed + hp(1) breathing room

const Container = ({
  children,
  style,
  scroll = true,
  noPaddingBottom = false,
}: ContainerProps) => {
  const scrollY = useRef(new Animated.Value(0)).current;

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const topPadding = Platform.select({
    android: NAVBAR_HEIGHT_ANDROID + hp(1),
    ios: NAVBAR_HEIGHT_IOS + hp(0.5),
    default: hp(14),
  });

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

      {/* Content */}
      {scroll ? (
        // ── ScrollView mode (use for regular content, NOT for screens with FlatList)
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.scrollWrapper}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: topPadding, paddingBottom: TAB_BAR_CLEARANCE },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, style]}>{children}</View>
        </Animated.ScrollView>
      ) : (
        // ── No-scroll mode (use when children already has FlatList/ScrollView)
        <View
          style={[
            styles.noScrollContainer,
            { paddingTop: topPadding, paddingBottom: noPaddingBottom ? 0 : TAB_BAR_CLEARANCE },
            style,
          ]}
        >
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
  },
  container: {
    flexDirection: "column",
    paddingHorizontal: 0,
  },
  noScrollContainer: {
    flex: 1,
  },
});

export default Container;
