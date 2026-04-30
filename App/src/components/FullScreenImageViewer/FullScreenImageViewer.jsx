import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Dimensions, StatusBar, Animated,
  PanResponder, Platform,
} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getFontFamily } from '../../utils';

import { Colors } from '../../Theme';
import { AppIcon } from "../../components/AppIcon";
import { icons } from "../../Assets";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// Single image slide with pinch-to-zoom + double tap to zoom
// ─────────────────────────────────────────────────────────────
const ImageSlide = ({ uri }) => {
  const scale       = useRef(new Animated.Value(1)).current;
  const translateX  = useRef(new Animated.Value(0)).current;
  const translateY  = useRef(new Animated.Value(0)).current;

  const lastScale   = useRef(1);
  const lastTapRef  = useRef(0);

  const resetZoom = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale,      { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    lastScale.current = 1;
  }, []);

  // ── Pinch gesture ─────────────────────────────────────────
  const pinchRef      = useRef(null);
  const initialDist   = useRef(null);
  const initialScale  = useRef(1);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder:       () => true,
      onMoveShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture:() => false,

      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          const [t1, t2] = evt.nativeEvent.touches;
          initialDist.current = Math.hypot(
            t2.pageX - t1.pageX,
            t2.pageY - t1.pageY,
          );
          initialScale.current = lastScale.current;
        }
      },

      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;

        // ── Pinch zoom ──────────────────────────────────────
        if (touches.length === 2) {
          const [t1, t2] = touches;
          const dist = Math.hypot(t2.pageX - t1.pageX, t2.pageY - t1.pageY);
          if (initialDist.current) {
            const newScale = Math.min(
              Math.max(initialScale.current * (dist / initialDist.current), 1),
              4,
            );
            lastScale.current = newScale;
            scale.setValue(newScale);
          }
        }

        // ── Pan when zoomed ─────────────────────────────────
        if (touches.length === 1 && lastScale.current > 1) {
          translateX.setValue(evt.nativeEvent.touches[0].pageX - SCREEN_W / 2);
          translateY.setValue(evt.nativeEvent.touches[0].pageY - SCREEN_H / 2);
        }
      },

      onPanResponderRelease: (evt) => {
        initialDist.current = null;
        // Auto-reset if scale close to 1
        if (lastScale.current < 1.1) resetZoom();
      },
    })
  ).current;

  // ── Double tap to toggle zoom ─────────────────────────────
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      if (lastScale.current > 1) {
        resetZoom();
      } else {
        lastScale.current = 2.5;
        Animated.spring(scale, { toValue: 2.5, useNativeDriver: true }).start();
      }
    }
    lastTapRef.current = now;
  };

  return (
    <View style={s.slide} {...panResponder.panHandlers}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleTap}
        style={s.slide}
      >
        <Animated.Image
          source={{ uri }}
          style={[
            s.fullImage,
            {
              transform: [
                { scale },
                { translateX },
                { translateY },
              ],
            },
          ]}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};


const FullScreenImageViewer = ({ route, navigation }) => {
  const {
    images       = [],
    initialIndex = 0,
    title        = '',
  } = route?.params || {};

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef(null);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = useCallback(({ item }) => (
    <ImageSlide uri={item} />
  ), []);

  if (!images.length) {
    return (
      <View style={s.container}>
        <Text style={{ color: '#fff' }}>No images</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* ── Header ────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
         
            <AppIcon
            name={icons.close}
            height={hp(2)}
            width={hp(2)}
            color={Colors.placeholder}
          />
        </TouchableOpacity>

        {!!title && (
          <Text style={s.title} numberOfLines={1}>{title}</Text>
        )}

        {/* Counter */}
        <View style={s.counter}>
          <Text style={s.counterText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      </View>

      {/* ── Images ────────────────────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={images}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* ── Dot indicators ────────────────────────────────── */}
      {images.length > 1 && (
        <View style={s.dots}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[s.dot, i === currentIndex && s.dotActive]}
            />
          ))}
        </View>
      )}

      {/* ── Hint ──────────────────────────────────────────── */}
      <Text style={s.hint}>Double tap to zoom · Pinch to zoom</Text>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingTop:      Platform.OS === 'ios' ? hp(6) : hp(2),
    paddingBottom:   hp(1.5),
    paddingHorizontal: wp(4),
    position:        'absolute',
    top:             0, left: 0, right: 0,
    zIndex:          10,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  closeBtn: {
    width:           hp(4.5),
    height:          hp(4.5),
    borderRadius:    hp(2.25),
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent:  'center',
    alignItems:      'center',
  },
  title: {
    flex:       1,
    color:      '#fff',
    fontSize:   hp(2),
    fontWeight: '600',
    textAlign:  'center',
    marginHorizontal: wp(3),
  },
  counter: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: wp(3),
    paddingVertical:   hp(0.5),
    borderRadius:      20,
  },
  counterText: {
    color:      '#fff',
    fontSize:   hp(1.6),
    fontWeight: '600',
  },
  slide: {
    width:           SCREEN_W,
    height:          SCREEN_H,
    justifyContent:  'center',
    alignItems:      'center',
  },
  fullImage: {
    width:  SCREEN_W,
    height: SCREEN_H * 0.75,
  },
  dots: {
    flexDirection:   'row',
    justifyContent:  'center',
    gap:             6,
    position:        'absolute',
    bottom:          hp(6),
    left:            0,
    right:           0,
  },
  dot: {
    width:           7,
    height:          7,
    borderRadius:    4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width:           18,
  },
  hint: {
    position:   'absolute',
    bottom:     hp(2.5),
    left:       0, right: 0,
    textAlign:  'center',
    color:      'rgba(255,255,255,0.4)',
    fontSize:   hp(1.4),
  },
});

export default FullScreenImageViewer;
