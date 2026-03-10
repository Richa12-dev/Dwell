import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Image,
} from 'react-native';

import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import Swiper from 'react-native-swiper';
import FastImage from 'react-native-fast-image';
import { Colors } from '../../Theme';
import { getFontFamily } from '../../utils';
import { icons } from '../../Assets';
import {AppIcon} from '../../components/AppIcon';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const swiperRef = useRef(null);

  const handleNext = () => {
    if (slideIndex < 2 && swiperRef.current) {
      swiperRef.current.scrollBy(1);
    }
  };

  const handleBack = () => {
    if (slideIndex > 0 && swiperRef.current) {
      swiperRef.current.scrollBy(-1);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Swiper
        ref={swiperRef}
        loop={false}
        index={slideIndex}
        onIndexChanged={index => setSlideIndex(index)}
        showsButtons={false}
        paginationStyle={styles.paginationStyle}
        dot={<View style={styles.dot} />}
        activeDot={<View style={[styles.dot, styles.activeDot]} />}>
        
        {/* Slide 1 - Manage Properties */}
        <View style={styles.slide}>
          <View style={styles.contentContainer}>
            <View style={styles.imageContainer}>
              <FastImage
                source={require('../../Assets/Image/HouseSearching.gif')}
                style={styles.animatedImage}
                resizeMode={FastImage.resizeMode.contain}
              />
            </View>
            
            <View style={styles.textContent}>
              <Text style={styles.title}>Manage{'\n'}Your Properties</Text>
              <Text style={styles.description}>
                Keep track of property listings, update availability, and manage details anytime.
              </Text>
            </View>
          </View>

          <View style={styles.bottomContainer}>
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip the Tour</Text>
            </TouchableOpacity>

            <View style={styles.navigationButtons}>
              <View style={styles.buttonPlaceholder} />
              <TouchableOpacity 
                style={styles.nextButton} 
                onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Slide 2 - Smart DIY Assistance */}
        <View style={styles.slide}>
          <View style={styles.contentContainer}>
            <View style={styles.imageContainer}>
              <FastImage
                source={require('../../Assets/Image/ChatBot.gif')}
                style={styles.animatedImage}
                resizeMode={FastImage.resizeMode.contain}
              />
            </View>
            
            <View style={styles.textContents}>
              <Text style={styles.title}>Smart{'\n'}DIY Assistance</Text>
              <Text style={styles.description}>
                Get step-by-step fixes for common issues with tool suggestions and trusted Amazon links - all powered by our AI assistant.
              </Text>
            </View>
          </View>

          <View style={styles.bottomContainer}>
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip the Tour</Text>
            </TouchableOpacity>

            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={handleBack}>
<AppIcon name={icons.arrowBack} size={24} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.nextButton} 
                onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Slide 3 - Find Trusted Contractors */}
        <View style={styles.slide}>
          <View style={styles.contentContainer}>
            <View style={styles.imageContainer}>
              <FastImage
                source={require('../../Assets/Image/BusinessDeal.gif')}
                style={styles.animatedImage}
                resizeMode={FastImage.resizeMode.contain}
              />
            </View>
            
            <View style={styles.textContent}>
              <Text style={styles.title}>Find your{'\n'}Trusted Contractors</Text>
              <Text style={styles.description}>
                Connect with verified local professionals recommended for your specific maintenance needs.
              </Text>
            </View>
          </View>

          <View style={styles.bottomContainer}>
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip the Tour</Text>
            </TouchableOpacity>

            <View style={styles.navigationButtons}>
              <TouchableOpacity 
                style={styles.getStartedButton} 
                onPress={handleGetStarted}>
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swiper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    paddingTop: hp(3),
  },
  imageContainer: {
    height: hp(47),
    justifyContent: 'center',
    alignItems: 'center',
  },
  animatedImage: {
    width: wp(85),
    height: hp(47),
  },
  textContent: {
    paddingHorizontal: wp(10),
    alignItems: 'center',
    marginTop: hp(0.5),
  },
    textContents: {
    paddingHorizontal: wp(7.5),
    alignItems: 'center',
    marginTop: hp(0.5),
  },
  title: {
    fontSize: wp(6.5),
    lineHeight: wp(8),
    fontFamily: getFontFamily('Poppins-Bold'),
    fontWeight: '700',
    color: '#1F2D3D',
    textAlign: 'center',
    marginBottom: hp(1.5),
  },
  description: {
    fontSize: wp(3.8),
    lineHeight: hp(2.8),
    fontFamily: getFontFamily('Nunito-Medium'),
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: wp(5),
  },
  bottomContainer: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(4),
  },
  paginationStyle: {
    bottom: hp(16),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: '#E53935',
    width: 24,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    marginBottom: hp(1),
  },
  skipButtonText: {
    color: '#6B7280',
    fontSize: wp(3.5),
    fontFamily: getFontFamily('Nunito-Medium'),
    fontWeight: '500',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonPlaceholder: {
    width: wp(24),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
   
  },
  backArrowIcon: {
  width: wp(5),
  height: wp(5),
  resizeMode: 'contain',
  marginRight: wp(2),
},

  backButtonText: {
    color: '#1F2D3D',
    fontSize: wp(4.2),
    fontFamily: getFontFamily('Poppins-SemiBold'),
    fontWeight: '600',
  },
  nextButton: {
    width: wp(20),
    height: hp(6.5),
    backgroundColor: '#E53935',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: wp(4),
    fontFamily: getFontFamily('Poppins-Bold'),
    fontWeight: '700',
  },
  getStartedButton: {
    width: wp(90),
    height: hp(6.5),
    backgroundColor: '#E53935',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  getStartedButtonText: {
    color: '#FFFFFF',
    fontSize: wp(4),
    fontFamily: getFontFamily('Poppins-Bold'),
    fontWeight: '700',
  },
});

export default OnboardingScreen;
